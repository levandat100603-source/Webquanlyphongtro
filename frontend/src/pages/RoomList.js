import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiMapPin, FiMaximize2, FiSearch, FiUsers, FiX, FiHeart, FiGrid, FiList, FiClock, FiChevronsDown, FiMap } from 'react-icons/fi';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { roomService, authService, ownerRegistrationRequestService } from '../api/services';
import { useLanguage } from '../contexts/LanguageContext';

const sortOptions = [
  { value: 'latest', labelKey: 'roomList.sortLatest' },
  { value: 'oldest', labelKey: 'roomList.sortOldest' },
  { value: 'price-asc', labelKey: 'roomList.sortPriceAsc' },
  { value: 'price-desc', labelKey: 'roomList.sortPriceDesc' },
  { value: 'capacity-asc', labelKey: 'roomList.sortCapacityAsc' },
  { value: 'capacity-desc', labelKey: 'roomList.sortCapacityDesc' },
];

const amenitiesOptions = [
  { id: 'wifi', labelKey: 'roomList.amenityWifi', icon: '📶' },
  { id: 'ac', labelKey: 'roomList.amenityAc', icon: '❄️' },
  { id: 'kitchen', labelKey: 'roomList.amenityKitchen', icon: '🍳' },
  { id: 'parking', labelKey: 'roomList.amenityParking', icon: '🚗' },
  { id: 'water', labelKey: 'roomList.amenityWater', icon: '🚿' },
  { id: 'security', labelKey: 'roomList.amenitySecurity', icon: '🔒' },
];

const initialFilters = {
  search: '',
  city: '',
  min_price: '',
  max_price: '',
  amenities: [],
};

const cityCoordinates = {
  'ha noi': [21.0278, 105.8342],
  'hanoi': [21.0278, 105.8342],
  'ho chi minh': [10.8231, 106.6297],
  'hcm': [10.8231, 106.6297],
  'da nang': [16.0544, 108.2022],
  'hai phong': [20.8449, 106.6881],
  'can tho': [10.0452, 105.7469],
  'nha trang': [12.2388, 109.1967],
};

const vietnamBounds = [
  [8.3, 102.0],
  [23.6, 110.5],
];

const clampToVietnamBounds = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return [10.8231, 106.6297];
  }

  const latitude = Number(coordinates[0]);
  const longitude = Number(coordinates[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return [10.8231, 106.6297];
  }

  return [
    Math.max(vietnamBounds[0][0], Math.min(vietnamBounds[1][0], latitude)),
    Math.max(vietnamBounds[0][1], Math.min(vietnamBounds[1][1], longitude)),
  ];
};

const normalizeCity = (city) => String(city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const normalizeLocationKey = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();
const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

const resolveImageUrl = (value) => {
  const src = String(value || '').trim();
  if (!src) {
    return '';
  }
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  return src.startsWith('/') ? `${backendBaseUrl}${src}` : `${backendBaseUrl}/${src}`;
};

const getStatusColorClass = (status) => {
  switch (status) {
    case 'available':
      return 'available';
    case 'rented':
      return 'rented';
    default:
      return 'maintenance';
  }
};

const createMarkerIcon = (status) => L.divIcon({
  className: 'map-marker-wrap',
  html: `<span class="map-marker map-marker-${getStatusColorClass(status)}"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const RoomList = () => {
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const user = authService.getCurrentUser();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('roomListFilters');
    return saved ? JSON.parse(saved) : initialFilters;
  });
  const [imageIndexes, setImageIndexes] = useState({});
  const [isFilterSticky, setIsFilterSticky] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('roomListSort') || 'latest';
  });
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('roomFavorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('roomListViewMode') || 'grid');
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('roomListSearchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [geocodedCoordinates, setGeocodedCoordinates] = useState(() => {
    try {
      const saved = localStorage.getItem('roomMapGeocodeCache');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      return {};
    }
  });
  const [recentViews, setRecentViews] = useState(() => {
    const saved = localStorage.getItem('roomRecentViews');
    return saved ? JSON.parse(saved) : [];
  });
  const [infiniteScroll, setInfiniteScroll] = useState(() => localStorage.getItem('roomListInfinite') === 'true');
  const [visibleCount, setVisibleCount] = useState(12);
  const [pendingRestoreState, setPendingRestoreState] = useState(null);
  const [rejectedNotice, setRejectedNotice] = useState(null);
  const itemsPerPage = 12;
  const infiniteSentinelRef = useRef(null);
  const skipVisibleResetOnceRef = useRef(false);

  const saveListScrollPosition = () => {
    const payload = {
      scrollY: window.scrollY,
      currentPage,
      visibleCount,
      infiniteScroll,
      timestamp: Date.now(),
    };
    sessionStorage.setItem('roomListReturnState', JSON.stringify(payload));
  };

  const applySorting = (roomsList) => {
    const sorted = [...roomsList];
    switch (sortBy) {
      case 'oldest':
        return sorted.reverse();
      case 'price-asc':
        return sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      case 'price-desc':
        return sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      case 'capacity-asc':
        return sorted.sort((a, b) => Number(a.capacity || 0) - Number(b.capacity || 0));
      case 'capacity-desc':
        return sorted.sort((a, b) => Number(b.capacity || 0) - Number(a.capacity || 0));
      case 'latest':
      default:
        // Backend already returns newest first by id desc.
        return sorted;
    }
  };

  const extractRooms = (payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.data?.data)) {
      return payload.data.data;
    }

    return [];
  };

  const fetchRooms = useCallback(async (activeFilters) => {
    try {
      setLoading(true);
      setFetchError('');
      const response = await roomService.getRooms({ ...activeFilters, per_page: 50 });
      setRooms(extractRooms(response).filter((room) => room.status === 'available'));
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setFetchError(t('roomList.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRooms(filters);
  }, [fetchRooms]);

  useEffect(() => {
    const saved = sessionStorage.getItem('roomListReturnState');
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (Number.isFinite(parsed?.currentPage) && parsed.currentPage > 0) {
        setCurrentPage(parsed.currentPage);
      }
      if (Number.isFinite(parsed?.visibleCount) && parsed.visibleCount > itemsPerPage) {
        skipVisibleResetOnceRef.current = true;
        setVisibleCount(parsed.visibleCount);
      }
      setPendingRestoreState(parsed);
    } catch (error) {
      sessionStorage.removeItem('roomListReturnState');
    }
  }, [itemsPerPage]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!pendingRestoreState) {
      return;
    }

    const scrollY = Number(pendingRestoreState.scrollY);
    if (Number.isFinite(scrollY)) {
      window.setTimeout(() => {
        window.scrollTo({ top: scrollY, behavior: 'auto' });
      }, 0);
    }

    sessionStorage.removeItem('roomListReturnState');
    setPendingRestoreState(null);
  }, [loading, currentPage, pendingRestoreState]);

  useEffect(() => {
    const handleScroll = () => {
      setIsFilterSticky(window.scrollY > 220);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('roomListFilters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('roomListSort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('roomFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('roomListViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('roomListSearchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    localStorage.setItem('roomListInfinite', String(infiniteScroll));
  }, [infiniteScroll]);

  useEffect(() => {
    const savedRecentViews = localStorage.getItem('roomRecentViews');
    setRecentViews(savedRecentViews ? JSON.parse(savedRecentViews) : []);
  }, [rooms]);

  useEffect(() => {
    const pendingNoticeRaw = localStorage.getItem('ownerRejectedNoticeToShow');
    if (!pendingNoticeRaw) {
      return;
    }

    try {
      const pendingNotice = JSON.parse(pendingNoticeRaw);
      if (pendingNotice?.requestId) {
        setRejectedNotice({
          type: pendingNotice.type || 'rejected',
          requestId: pendingNotice.requestId,
          adminNote: pendingNotice.adminNote || '',
        });
      } else {
        localStorage.removeItem('ownerRejectedNoticeToShow');
      }
    } catch (error) {
      localStorage.removeItem('ownerRejectedNoticeToShow');
    }
  }, []);

  const handleCloseRejectedNotice = async () => {
    const requestId = rejectedNotice?.requestId;

    try {
      if (requestId) {
        if (rejectedNotice?.type === 'approved') {
          await ownerRegistrationRequestService.markApprovedNoticeSeen(requestId);
        } else {
          await ownerRegistrationRequestService.markRejectedNoticeSeen(requestId);
        }
      }
    } catch (markSeenError) {
      console.error('Cannot mark rejected notice as seen:', markSeenError);
    } finally {
      localStorage.removeItem('ownerRejectedNoticeToShow');
      setRejectedNotice(null);
    }
  };

  const toggleFavorite = (roomId) => {
    setFavorites((prev) => {
      if (prev.includes(roomId)) {
        return prev.filter((id) => id !== roomId);
      } else {
        return [...prev, roomId];
      }
    });
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);

    const normalizedSearch = String(filters.search || '').trim();
    if (normalizedSearch) {
      setSearchHistory((prev) => {
        const next = [normalizedSearch, ...prev.filter((item) => item !== normalizedSearch)];
        return next.slice(0, 8);
      });
    }

    fetchRooms(filters);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
    setSortBy('latest');
    fetchRooms(initialFilters);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handleSelectSearchHistory = (keyword) => {
    const nextFilters = { ...filters, search: keyword };
    setFilters(nextFilters);
    setCurrentPage(1);
    fetchRooms(nextFilters);
  };

  const activeFilterCount = [
    !!filters.search,
    !!filters.city,
    !!filters.min_price,
    !!filters.max_price,
    Array.isArray(filters.amenities) && filters.amenities.length > 0,
    showFavoritesOnly,
  ].filter(Boolean).length;
  const selectedAmenities = Array.isArray(filters.amenities) ? filters.amenities : [];

  const handleAmenityToggle = (amenityId) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter((id) => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  const roomHasAmenities = (room, selectedAmenities) => {
    if (!selectedAmenities || selectedAmenities.length === 0) {
      return true;
    }

    const rawAmenities = Array.isArray(room.amenities)
      ? room.amenities
      : Array.isArray(room.utilities)
        ? room.utilities
        : [];

    const amenityText = rawAmenities
      .map((item) => String(item || '').toLowerCase())
      .join(' ');

    const matchesAmenity = (amenityId) => {
      switch (amenityId) {
        case 'wifi':
          return amenityText.includes('wifi') || amenityText.includes('wi-fi');
        case 'ac':
          return amenityText.includes('điều hòa') || amenityText.includes('dieu hoa') || amenityText.includes('máy lạnh') || amenityText.includes('may lanh');
        case 'kitchen':
          return amenityText.includes('bếp') || amenityText.includes('bep') || amenityText.includes('kitchen');
        case 'parking':
          return amenityText.includes('đỗ xe') || amenityText.includes('do xe') || amenityText.includes('đậu xe') || amenityText.includes('dau xe') || amenityText.includes('parking');
        case 'water':
          return amenityText.includes('nước nóng') || amenityText.includes('nuoc nong') || amenityText.includes('water heater');
        case 'security':
          return amenityText.includes('an ninh') || amenityText.includes('security') || amenityText.includes('24/7');
        default:
          return false;
      }
    };

    return selectedAmenities.every((amenityId) => matchesAmenity(amenityId));
  };

  const getRoomAmenities = (room) => {
    const rawAmenities = Array.isArray(room.amenities)
      ? room.amenities
      : Array.isArray(room.utilities)
        ? room.utilities
        : [];

    const amenityText = rawAmenities
      .map((item) => String(item || '').toLowerCase())
      .join(' ');

    return amenitiesOptions.filter((opt) => {
      switch (opt.id) {
        case 'wifi':
          return amenityText.includes('wifi') || amenityText.includes('wi-fi');
        case 'ac':
          return amenityText.includes('điều hòa') || amenityText.includes('dieu hoa') || amenityText.includes('máy lạnh') || amenityText.includes('may lanh');
        case 'kitchen':
          return amenityText.includes('bếp') || amenityText.includes('bep') || amenityText.includes('kitchen');
        case 'parking':
          return amenityText.includes('đỗ xe') || amenityText.includes('do xe') || amenityText.includes('đậu xe') || amenityText.includes('dau xe') || amenityText.includes('parking');
        case 'water':
          return amenityText.includes('nước nóng') || amenityText.includes('nuoc nong') || amenityText.includes('water heater');
        case 'security':
          return amenityText.includes('an ninh') || amenityText.includes('security') || amenityText.includes('24/7');
        default:
          return false;
      }
    });
  };

  const getRoomMapQuery = (room) => [room.address, room.district, room.city, 'Vietnam']
    .filter(Boolean)
    .join(', ');

  const getRoomMapCacheKey = (room) => normalizeLocationKey([room.address, room.district, room.city].filter(Boolean).join(', '));

  const getRoomCoordinates = (room, index) => {
    const cacheKey = getRoomMapCacheKey(room);
    const cachedCoordinates = geocodedCoordinates[cacheKey];
    if (Array.isArray(cachedCoordinates) && cachedCoordinates.length === 2) {
      const cachedLat = Number(cachedCoordinates[0]);
      const cachedLng = Number(cachedCoordinates[1]);
      if (Number.isFinite(cachedLat) && Number.isFinite(cachedLng)) {
        return clampToVietnamBounds([cachedLat, cachedLng]);
      }
    }

    const lat = Number(room.latitude ?? room.lat);
    const lng = Number(room.longitude ?? room.lng ?? room.lon);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return clampToVietnamBounds([lat, lng]);
    }

    const cityKey = normalizeCity(room.city);
    const base = cityCoordinates[cityKey] || [16.0471, 108.2062];
    const jitter = ((Number(room.id) || index + 1) % 9) * 0.0021;

    return clampToVietnamBounds([base[0] + jitter, base[1] - jitter]);
  };

  const geocodeRoomAddress = async (room) => {
    const query = getRoomMapQuery(room);
    const cacheKey = getRoomMapCacheKey(room);

    if (!query || !cacheKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const result = Array.isArray(data) ? data[0] : null;
      if (!result) {
        return null;
      }

      const lat = Number(result.lat);
      const lng = Number(result.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return [lat, lng];
    } catch (error) {
      return null;
    }
  };

  const averagePrice = rooms.length
    ? Math.round(rooms.reduce((sum, room) => sum + Number(room.price || 0), 0) / rooms.length)
    : 0;

  const getRoomImages = (room) => (
    Array.isArray(room.images)
      ? room.images.map(resolveImageUrl).filter(Boolean)
      : []
  );

  const getActiveImageForRoom = (room) => {
    const images = getRoomImages(room);
    if (images.length === 0) {
      return null;
    }

    const activeIndex = imageIndexes[room.id] ?? 0;
    return images[activeIndex] || images[0];
  };

  const handleImageChange = (room, direction) => {
    const images = getRoomImages(room);
    if (images.length <= 1) {
      return;
    }

    const currentIndex = imageIndexes[room.id] ?? 0;
    const nextIndex = (currentIndex + direction + images.length) % images.length;
    setImageIndexes((prev) => ({ ...prev, [room.id]: nextIndex }));
  };

  // Apply filtering (favorites + amenities), sorting, then pagination
  let filteredRooms = showFavoritesOnly ? rooms.filter((room) => favorites.includes(room.id)) : rooms;
  filteredRooms = filteredRooms.filter((room) => roomHasAmenities(room, selectedAmenities));
  const sortedRooms = applySorting(filteredRooms);
  const totalPages = Math.ceil(sortedRooms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRooms = sortedRooms.slice(startIndex, endIndex);
  const displayedRooms = infiniteScroll ? sortedRooms.slice(0, visibleCount) : paginatedRooms;
  const mapPoints = displayedRooms.map((room, index) => ({
    room,
    coordinates: getRoomCoordinates(room, index),
    query: getRoomMapQuery(room),
  }));
  const mapCenter = mapPoints.length > 0
    ? [
      mapPoints.reduce((sum, item) => sum + item.coordinates[0], 0) / mapPoints.length,
      mapPoints.reduce((sum, item) => sum + item.coordinates[1], 0) / mapPoints.length,
    ]
    : [16.0471, 108.2062];
  const boundedMapCenter = clampToVietnamBounds(mapCenter);

  useEffect(() => {
    if (skipVisibleResetOnceRef.current) {
      skipVisibleResetOnceRef.current = false;
      return;
    }

    setVisibleCount(itemsPerPage);
  }, [filters, sortBy, showFavoritesOnly, rooms.length, infiniteScroll, itemsPerPage]);

  useEffect(() => {
    if (viewMode !== 'map' || displayedRooms.length === 0) {
      return undefined;
    }

    let cancelled = false;
    const pending = displayedRooms.filter((room) => {
      const cacheKey = getRoomMapCacheKey(room);
      if (!cacheKey) {
        return false;
      }

      const hasExplicitCoordinates = Number.isFinite(Number(room.latitude ?? room.lat)) && Number.isFinite(Number(room.longitude ?? room.lng ?? room.lon));
      if (hasExplicitCoordinates) {
        return false;
      }

      const cachedCoordinates = geocodedCoordinates[cacheKey];
      return !Array.isArray(cachedCoordinates) || cachedCoordinates.length !== 2;
    });

    if (pending.length === 0) {
      return undefined;
    }

    const runGeocoding = async () => {
      const nextCacheEntries = {};

      for (const room of pending) {
        const coords = await geocodeRoomAddress(room);
        if (!coords || cancelled) {
          continue;
        }

        const cacheKey = getRoomMapCacheKey(room);
        if (!cacheKey) {
          continue;
        }

        nextCacheEntries[cacheKey] = coords;
        setGeocodedCoordinates((prev) => ({
          ...prev,
          [cacheKey]: coords,
        }));
      }

      if (!cancelled && Object.keys(nextCacheEntries).length > 0) {
        setGeocodedCoordinates((prev) => {
          const next = { ...prev, ...nextCacheEntries };
          localStorage.setItem('roomMapGeocodeCache', JSON.stringify(next));
          return next;
        });
      }
    };

    runGeocoding();

    return () => {
      cancelled = true;
    };
  }, [viewMode, displayedRooms, geocodedCoordinates]);

  useEffect(() => {
    if (!infiniteScroll || !infiniteSentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleCount < sortedRooms.length) {
          setVisibleCount((prev) => Math.min(prev + itemsPerPage, sortedRooms.length));
        }
      },
      {
        root: null,
        rootMargin: '220px',
        threshold: 0,
      }
    );

    observer.observe(infiniteSentinelRef.current);
    return () => observer.disconnect();
  }, [infiniteScroll, visibleCount, sortedRooms.length, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="container">
        <section className="listing-hero">
          <h1 className="listing-title">{t('roomList.heroTitle')}</h1>
          <p className="listing-subtitle">{t('roomList.loadingRooms')}</p>
        </section>

        <div className="cards-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`room-skeleton-${index}`} className="skeleton-card">
              <div className="skeleton-shimmer skeleton-media" />
              <div className="skeleton-shimmer skeleton-line lg" />
              <div className="skeleton-shimmer skeleton-line md" />
              <div className="skeleton-shimmer skeleton-line" />
              <div className="skeleton-shimmer skeleton-line sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {rejectedNotice && (
        <div className="booking-modal-overlay" onClick={handleCloseRejectedNotice}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-header">
              <h4>{rejectedNotice.type === 'approved' ? t('auth.roleApprovedTitle') : t('auth.roleRejectedTitle')}</h4>
              <button
                type="button"
                className="booking-modal-close"
                onClick={handleCloseRejectedNotice}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>

            <div className={rejectedNotice.type === 'approved' ? 'success-message' : 'error-message'} style={{ marginBottom: 0 }}>
              {rejectedNotice.type === 'approved'
                ? t('auth.roleApprovedBody')
                : t('auth.roleRejectedBody')}
              {rejectedNotice.adminNote
                ? `${rejectedNotice.type === 'approved' ? ` ${t('auth.adminNote')}` : ` ${t('auth.adminReason')}`}: ${rejectedNotice.adminNote}`
                : ''}
            </div>

            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCloseRejectedNotice}
              >
                {t('common.understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="listing-hero">
        <h1 className="listing-title">{t('roomList.heroTitle')}</h1>
        <p className="listing-subtitle">
          {t('roomList.heroSubtitle')}
        </p>
        <div className="listing-stats">
          <div className="listing-stat">
            <h4>{rooms.length}</h4>
            <p>{t('roomList.statShowing')}</p>
          </div>
          <div className="listing-stat">
            <h4>{averagePrice.toLocaleString(locale)} {t('roomList.currencyShort')}</h4>
            <p>{t('roomList.statAvgPrice')}</p>
          </div>
          <div className="listing-stat">
            <h4>{rooms.filter((room) => room.status === 'available').length}</h4>
            <p>{t('roomList.statAvailable')}</p>
          </div>
        </div>
      </section>

      <div className={`sticky-filters ${isFilterSticky ? 'is-scrolled' : ''}`}>
        <div className="filters-toolbar">
          <div className="view-mode-group" role="group" aria-label={t('roomList.viewMode')}>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label={t('roomList.viewGrid')}
            >
              <FiGrid size={16} />
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label={t('roomList.viewList')}
            >
              <FiList size={16} />
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              aria-label={t('roomList.viewMap')}
            >
              <FiMap size={16} />
            </button>
          </div>

          <span className="active-filters-badge">
            {t('roomList.activeFilters')}: {activeFilterCount}
          </span>

          <button
            type="button"
            className={`active-filters-badge ${infiniteScroll ? 'active' : ''}`}
            onClick={() => setInfiniteScroll((prev) => !prev)}
            aria-label={infiniteScroll ? t('roomList.disableInfiniteScroll') : t('roomList.enableInfiniteScroll')}
          >
            {infiniteScroll ? t('roomList.infiniteOn') : t('roomList.infiniteOff')}
          </button>
        </div>

        <div className="sort-control">
          <label htmlFor="sort-select" className="sort-label">
            {t('roomList.sortBy')}
          </label>
          <select
            id="sort-select"
            className="sort-select"
            value={sortBy}
            onChange={handleSortChange}
            aria-label={t('roomList.sortAria')}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={`favorites-toggle ${showFavoritesOnly ? 'active' : ''}`}
          onClick={() => {
            setShowFavoritesOnly(!showFavoritesOnly);
            setCurrentPage(1);
          }}
          aria-label={showFavoritesOnly ? t('roomList.viewAllRooms') : t('roomList.viewFavoriteRooms')}
        >
          <FiHeart size={16} />
          <span>{t('roomList.favorites')} ({favorites.length})</span>
        </button>

        <div className="filter-drawer">
          <form onSubmit={handleSearch}>
            <div className="search-filters-grid">
              <div className="form-group">
                <input
                  type="text"
                  name="search"
                  className="form-input"
                  placeholder={t('roomList.searchPlaceholder')}
                  aria-label={t('roomList.searchByTitle')}
                  value={filters.search}
                  onChange={handleFilterChange}
                />

                {searchHistory.length > 0 && filters.search.trim().length === 0 && (
                  <div className="search-history">
                    <div className="search-history-title"><FiClock size={13} /> {t('roomList.recentSearches')}</div>
                    <div className="search-history-list">
                      {searchHistory.slice(0, 4).map((keyword) => (
                        <button
                          key={keyword}
                          type="button"
                          className="search-history-item"
                          onClick={() => handleSelectSearchHistory(keyword)}
                          aria-label={`${t('roomList.searchAgain')}: ${keyword}`}
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <input
                  type="text"
                  name="city"
                  className="form-input"
                  placeholder={t('roomList.city')}
                  aria-label={t('roomList.filterByCity')}
                  value={filters.city}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="form-group">
                <input
                  type="number"
                  name="min_price"
                  className="form-input"
                  placeholder={t('roomList.minPrice')}
                  aria-label={t('roomList.minPrice')}
                  value={filters.min_price}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="form-group">
                <input
                  type="number"
                  name="max_price"
                  className="form-input"
                  placeholder={t('roomList.maxPrice')}
                  aria-label={t('roomList.maxPrice')}
                  value={filters.max_price}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="amenities-section">
              <label className="amenities-label">{t('roomList.amenities')}</label>
              <div className="amenities-grid">
                {amenitiesOptions.map((amenity) => (
                  <label key={amenity.id} className="amenity-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity.id)}
                      onChange={() => handleAmenityToggle(amenity.id)}
                      aria-label={t(amenity.labelKey)}
                    />
                    <span className="amenity-icon">{amenity.icon}</span>
                    <span className="amenity-text">{t(amenity.labelKey)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filters-actions">
              <button type="submit" className="btn btn-primary" aria-label={t('roomList.applyFilters')}>
                <FiSearch size={16} /> {t('roomList.search')}
              </button>
              <button type="button" className="btn btn-neutral" onClick={handleResetFilters} aria-label={t('roomList.clearFilters')}>
                <FiX size={16} /> {t('roomList.clearFilters')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {(filters.search || filters.city || filters.min_price || filters.max_price || selectedAmenities.length > 0 || showFavoritesOnly) && (
        <div className="results-info">
          <div className="results-count">
            {displayedRooms.length === 0 ? t('roomList.noResults') : `${sortedRooms.length} ${t('roomList.results')}`}
          </div>
          <div className="filter-chips">
            {filters.search && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => {
                  const newFilters = { ...filters, search: '' };
                  setFilters(newFilters);
                  fetchRooms(newFilters);
                }}
                aria-label={`${t('roomList.clearSearchFilter')}: ${filters.search}`}
              >
                🔍 {filters.search}
                <FiX size={14} />
              </button>
            )}
            {filters.city && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => {
                  const newFilters = { ...filters, city: '' };
                  setFilters(newFilters);
                  fetchRooms(newFilters);
                }}
                aria-label={`${t('roomList.clearCityFilter')}: ${filters.city}`}
              >
                📍 {filters.city}
                <FiX size={14} />
              </button>
            )}
            {filters.min_price && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => {
                  const newFilters = { ...filters, min_price: '' };
                  setFilters(newFilters);
                  fetchRooms(newFilters);
                }}
                aria-label={`${t('roomList.clearMinPriceFilter')}: ${filters.min_price}`}
              >
                💰 {t('roomList.minPricePrefix')}: {Number(filters.min_price).toLocaleString(locale)} {t('roomList.currencyShort')}
                <FiX size={14} />
              </button>
            )}
            {filters.max_price && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => {
                  const newFilters = { ...filters, max_price: '' };
                  setFilters(newFilters);
                  fetchRooms(newFilters);
                }}
                aria-label={`${t('roomList.clearMaxPriceFilter')}: ${filters.max_price}`}
              >
                💰 {t('roomList.maxPricePrefix')}: {Number(filters.max_price).toLocaleString(locale)} {t('roomList.currencyShort')}
                <FiX size={14} />
              </button>
            )}
            {selectedAmenities.map((amenityId) => {
              const amenity = amenitiesOptions.find((item) => item.id === amenityId);
              if (!amenity) {
                return null;
              }

              return (
                <button
                  key={amenity.id}
                  type="button"
                  className="filter-chip"
                  onClick={() => handleAmenityToggle(amenity.id)}
                  aria-label={`${t('roomList.clearAmenity')}: ${t(amenity.labelKey)}`}
                >
                  {amenity.icon} {t(amenity.labelKey)}
                  <FiX size={14} />
                </button>
              );
            })}
            {showFavoritesOnly && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => setShowFavoritesOnly(false)}
                aria-label={t('roomList.disableFavoriteFilter')}
              >
                <FiHeart size={14} /> {t('roomList.favorites')}
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {recentViews.length > 0 && (
        <div className="recent-views panel">
          <div className="recent-views-title"><FiClock size={14} /> {t('roomList.recentViews')}</div>
          <div className="recent-views-list">
            {recentViews.slice(0, 6).map((item) => (
              <Link key={item.id} to={`/rooms/${item.id}`} className="recent-view-item" onClick={saveListScrollPosition}>
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {fetchError && (
        <div className="error-message" role="alert">
          {fetchError}
        </div>
      )}

      {(rooms.length === 0 || (showFavoritesOnly && sortedRooms.length === 0)) ? (
        <div className="empty-state">
          <div className="empty-state-icon">{showFavoritesOnly ? '💔' : '🔍'}</div>
          <h3 className="empty-state-title">
            {showFavoritesOnly ? t('roomList.noFavoriteRooms') : t('roomList.noRoomsFound')}
          </h3>
          <p className="empty-state-description">
            {showFavoritesOnly 
              ? t('roomList.noFavoriteRoomsHint')
              : t('roomList.noRoomsFoundHint')}
          </p>
          <div className="empty-state-actions">
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={showFavoritesOnly ? () => setShowFavoritesOnly(false) : handleResetFilters}
              aria-label={showFavoritesOnly ? t('roomList.viewAllRooms') : t('roomList.clearFiltersAndRetry')}
            >
              <FiX size={16} /> {showFavoritesOnly ? t('roomList.viewAllRooms') : t('roomList.clearFilters')}
            </button>
            {!user && (
              <Link to="/login" className="btn btn-neutral" aria-label={t('roomList.loginForMore')}>
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <div className="map-view panel">
              <div className="map-legend">
                <span><span className="map-marker map-marker-available" /> {t('roomList.statusAvailable')}</span>
                <span><span className="map-marker map-marker-rented" /> {t('roomList.statusRented')}</span>
                <span><span className="map-marker map-marker-maintenance" /> {t('roomList.statusMaintenance')}</span>
              </div>
              <div className="map-canvas">
                <MapContainer
                  center={boundedMapCenter}
                  zoom={12}
                  scrollWheelZoom
                  className="map-leaflet"
                  maxBounds={vietnamBounds}
                  maxBoundsViscosity={1.0}
                  minZoom={5}
                  maxZoom={18}
                  worldCopyJump={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {mapPoints.map(({ room, coordinates, query }) => (
                    <Marker key={room.id} position={coordinates} icon={createMarkerIcon(room.status)}>
                      <Popup>
                        <div className="map-popup">
                          <strong>{room.title}</strong>
                          <p><FiMapPin size={12} /> {query}</p>
                          <p>{Number(room.price || 0).toLocaleString(locale)} {t('roomList.currencyShort')}/{t('roomList.perMonth')}</p>
                          <div className="action-group">
                            <a href={`/rooms/${room.id}`} className="btn btn-primary btn-sm">{t('roomList.detail')}</a>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${coordinates[0]},${coordinates[1]}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-neutral btn-sm"
                            >
                              {t('roomList.directions')}
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          ) : (
          <div className={`cards-grid ${viewMode === 'list' ? 'cards-list' : ''}`}>
            {displayedRooms.map((room) => {
              const roomImages = getRoomImages(room);
              const activeImage = getActiveImageForRoom(room);

              return (
                <div key={room.id} className="card">
                  <div className="card-image">
                    {activeImage ? <img src={activeImage} alt={room.title} /> : null}

                    <button
                      type="button"
                      className={`card-favorite-btn ${favorites.includes(room.id) ? 'active' : ''}`}
                      onClick={() => toggleFavorite(room.id)}
                      aria-label={favorites.includes(room.id)
                        ? t('roomList.removeFavoriteAria', { title: room.title })
                        : t('roomList.addFavoriteAria', { title: room.title })}
                      aria-pressed={favorites.includes(room.id)}
                    >
                      <FiHeart size={18} />
                    </button>

                    {roomImages.length > 1 && (
                      <>
                        <div className="room-card-image-controls">
                          <button
                            type="button"
                            className="room-card-image-btn"
                            aria-label={t('roomList.prevImage')}
                            onClick={() => handleImageChange(room, -1)}
                          >
                            <FiChevronLeft size={15} />
                          </button>
                          <button
                            type="button"
                            className="room-card-image-btn"
                            aria-label={t('roomList.nextImage')}
                            onClick={() => handleImageChange(room, 1)}
                          >
                            <FiChevronRight size={15} />
                          </button>
                        </div>
                        <span className="room-card-image-index">
                          {(imageIndexes[room.id] ?? 0) + 1}/{roomImages.length}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="card-content">
                    <div className="room-card-head">
                      <h3 className="card-title">{room.title}</h3>
                      <span className={`badge ${room.status === 'available' ? 'badge-success' : room.status === 'rented' ? 'badge-warning' : 'badge-danger'}`}>
                        {room.status === 'available' ? t('roomList.statusAvailable') : room.status === 'rented' ? t('roomList.statusRented') : t('roomList.statusMaintenance')}
                      </span>
                    </div>
                    <p className="card-text"><FiMapPin size={14} /> {room.address}, {room.district}, {room.city}</p>

                    <div className="room-meta-grid">
                      <div className="room-meta-item"><FiMaximize2 size={14} /> {t('roomList.area')}: {room.area} m²</div>
                      <div className="room-meta-item"><FiUsers size={14} /> {t('roomList.capacity')}: {room.capacity} {t('roomList.person')}</div>
                    </div>

                    {getRoomAmenities(room).length > 0 && (
                      <div className="room-amenities">
                        {getRoomAmenities(room).map((amenity) => (
                          <span key={amenity.id} className="amenity-tag">
                            {amenity.icon} {t(amenity.labelKey)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="card-price">{Number(room.price).toLocaleString(locale)} {t('roomList.currencyShort')}/{t('roomList.perMonth')}</div>
                    <Link to={`/rooms/${room.id}`} className="card-button" aria-label={`${t('roomList.viewRoomDetail')}: ${room.title}`} onClick={saveListScrollPosition}>
                      {t('roomList.viewDetail')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {!infiniteScroll && totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-item"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label={t('roomList.prevPage')}
              >
                <FiChevronLeft size={16} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = idx + 1;
                } else if (currentPage <= 3) {
                  pageNum = idx + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + idx;
                } else {
                  pageNum = currentPage - 2 + idx;
                }

                return (
                  <button
                    key={pageNum}
                    className={`pagination-item ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                    aria-label={`${t('roomList.page')} ${pageNum}`}
                    aria-current={currentPage === pageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                className="pagination-item"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label={t('roomList.nextPage')}
              >
                <FiChevronRight size={16} />
              </button>

              <span className="pagination-label">
                {t('roomList.page')} {currentPage} / {totalPages}
              </span>
            </div>
          )}

          {infiniteScroll && displayedRooms.length < sortedRooms.length && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => setVisibleCount((prev) => Math.min(prev + itemsPerPage, sortedRooms.length))}
                aria-label={t('roomList.loadMoreRooms')}
              >
                <FiChevronsDown size={16} /> {t('roomList.loadMore')} ({displayedRooms.length}/{sortedRooms.length})
              </button>
            </div>
          )}

          {infiniteScroll && displayedRooms.length < sortedRooms.length && <div ref={infiniteSentinelRef} className="infinite-sentinel" />}
        </>
      )}
    </div>
  );
};

export default RoomList;
