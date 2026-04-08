import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiMapPin, FiMaximize2, FiSearch, FiUsers, FiX, FiHeart, FiGrid, FiList, FiClock, FiChevronsDown, FiMap } from 'react-icons/fi';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { roomService, authService } from '../api/services';

const sortOptions = [
  { value: 'latest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'price-asc', label: 'Giá: Thấp → Cao' },
  { value: 'price-desc', label: 'Giá: Cao → Thấp' },
  { value: 'capacity-asc', label: 'Sức chứa: Ít → Nhiều' },
  { value: 'capacity-desc', label: 'Sức chứa: Nhiều → Ít' },
];

const amenitiesOptions = [
  { id: 'wifi', label: 'WiFi', icon: '📶' },
  { id: 'ac', label: 'Điều hòa', icon: '❄️' },
  { id: 'kitchen', label: 'Bếp', icon: '🍳' },
  { id: 'parking', label: 'Chỗ đỗ xe', icon: '🚗' },
  { id: 'water', label: 'Nước nóng', icon: '🚿' },
  { id: 'security', label: 'An ninh 24/7', icon: '🔒' },
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
      setRooms(extractRooms(response));
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setFetchError('Không tải được danh sách phòng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

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
        return [cachedLat, cachedLng];
      }
    }

    const lat = Number(room.latitude ?? room.lat);
    const lng = Number(room.longitude ?? room.lng ?? room.lon);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lat, lng];
    }

    const cityKey = normalizeCity(room.city);
    const base = cityCoordinates[cityKey] || [16.0471, 108.2062];
    const jitter = ((Number(room.id) || index + 1) % 9) * 0.0021;

    return [base[0] + jitter, base[1] - jitter];
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
          <h1 className="listing-title">Khám phá phòng trọ theo nhu cầu thực tế</h1>
          <p className="listing-subtitle">Đang tải dữ liệu phòng trọ...</p>
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
      <section className="listing-hero">
        <h1 className="listing-title">Khám phá phòng trọ theo nhu cầu thực tế</h1>
        <p className="listing-subtitle">
          Tập trung vào vị trí, mức giá và khả năng ở để bạn chọn phòng nhanh, đúng nhu cầu.
        </p>
        <div className="listing-stats">
          <div className="listing-stat">
            <h4>{rooms.length}</h4>
            <p>Phòng đang hiển thị</p>
          </div>
          <div className="listing-stat">
            <h4>{averagePrice.toLocaleString('vi-VN')} đ</h4>
            <p>Giá trung bình / tháng</p>
          </div>
          <div className="listing-stat">
            <h4>{rooms.filter((room) => room.status === 'available').length}</h4>
            <p>Phòng còn trống</p>
          </div>
        </div>
      </section>

      <div className={`sticky-filters ${isFilterSticky ? 'is-scrolled' : ''}`}>
        <div className="filters-toolbar">
          <div className="view-mode-group" role="group" aria-label="Chế độ hiển thị phòng">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Hiển thị dạng lưới"
            >
              <FiGrid size={16} />
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="Hiển thị dạng danh sách"
            >
              <FiList size={16} />
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              aria-label="Hiển thị dạng bản đồ"
            >
              <FiMap size={16} />
            </button>
          </div>

          <span className="active-filters-badge">
            Bộ lọc đang bật: {activeFilterCount}
          </span>

          <button
            type="button"
            className={`active-filters-badge ${infiniteScroll ? 'active' : ''}`}
            onClick={() => setInfiniteScroll((prev) => !prev)}
            aria-label={infiniteScroll ? 'Tắt cuộn vô hạn' : 'Bật cuộn vô hạn'}
          >
            {infiniteScroll ? 'Infinite On' : 'Infinite Off'}
          </button>
        </div>

        <div className="sort-control">
          <label htmlFor="sort-select" className="sort-label">
            Sắp xếp:
          </label>
          <select
            id="sort-select"
            className="sort-select"
            value={sortBy}
            onChange={handleSortChange}
            aria-label="Sắp xếp phòng"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
          aria-label={showFavoritesOnly ? 'Xem tất cả phòng' : 'Xem phòng yêu thích'}
        >
          <FiHeart size={16} />
          <span>Yêu thích ({favorites.length})</span>
        </button>

        <div className="filter-drawer">
          <form onSubmit={handleSearch}>
            <div className="search-filters-grid">
              <div className="form-group">
                <input
                  type="text"
                  name="search"
                  className="form-input"
                  placeholder="Tìm kiếm..."
                  aria-label="Tìm theo tên phòng"
                  value={filters.search}
                  onChange={handleFilterChange}
                />

                {searchHistory.length > 0 && filters.search.trim().length === 0 && (
                  <div className="search-history">
                    <div className="search-history-title"><FiClock size={13} /> Tìm kiếm gần đây</div>
                    <div className="search-history-list">
                      {searchHistory.slice(0, 4).map((keyword) => (
                        <button
                          key={keyword}
                          type="button"
                          className="search-history-item"
                          onClick={() => handleSelectSearchHistory(keyword)}
                          aria-label={`Tìm lại: ${keyword}`}
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
                  placeholder="Thành phố"
                  aria-label="Lọc theo thành phố"
                  value={filters.city}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="form-group">
                <input
                  type="number"
                  name="min_price"
                  className="form-input"
                  placeholder="Giá tối thiểu"
                  aria-label="Giá tối thiểu"
                  value={filters.min_price}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="form-group">
                <input
                  type="number"
                  name="max_price"
                  className="form-input"
                  placeholder="Giá tối đa"
                  aria-label="Giá tối đa"
                  value={filters.max_price}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="amenities-section">
              <label className="amenities-label">Tiện ích:</label>
              <div className="amenities-grid">
                {amenitiesOptions.map((amenity) => (
                  <label key={amenity.id} className="amenity-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity.id)}
                      onChange={() => handleAmenityToggle(amenity.id)}
                      aria-label={amenity.label}
                    />
                    <span className="amenity-icon">{amenity.icon}</span>
                    <span className="amenity-text">{amenity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filters-actions">
              <button type="submit" className="btn btn-primary" aria-label="Áp dụng bộ lọc tìm kiếm">
                <FiSearch size={16} /> Tìm kiếm
              </button>
              <button type="button" className="btn btn-neutral" onClick={handleResetFilters} aria-label="Xóa bộ lọc hiện tại">
                <FiX size={16} /> Xóa bộ lọc
              </button>
            </div>
          </form>
        </div>
      </div>

      {(filters.search || filters.city || filters.min_price || filters.max_price || selectedAmenities.length > 0 || showFavoritesOnly) && (
        <div className="results-info">
          <div className="results-count">
            {displayedRooms.length === 0 ? 'Không có kết quả' : `${sortedRooms.length} kết quả`}
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
                aria-label={`Xóa bộ lọc tìm kiếm: ${filters.search}`}
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
                aria-label={`Xóa bộ lọc thành phố: ${filters.city}`}
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
                aria-label={`Xóa bộ lọc giá tối thiểu: ${filters.min_price}`}
              >
                💰 Tối thiểu: {Number(filters.min_price).toLocaleString('vi-VN')} đ
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
                aria-label={`Xóa bộ lọc giá tối đa: ${filters.max_price}`}
              >
                💰 Tối đa: {Number(filters.max_price).toLocaleString('vi-VN')} đ
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
                  aria-label={`Xóa tiện ích: ${amenity.label}`}
                >
                  {amenity.icon} {amenity.label}
                  <FiX size={14} />
                </button>
              );
            })}
            {showFavoritesOnly && (
              <button
                type="button"
                className="filter-chip"
                onClick={() => setShowFavoritesOnly(false)}
                aria-label="Tắt lọc phòng yêu thích"
              >
                <FiHeart size={14} /> Yêu thích
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {recentViews.length > 0 && (
        <div className="recent-views panel">
          <div className="recent-views-title"><FiClock size={14} /> Đã xem gần đây</div>
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
            {showFavoritesOnly ? 'Chưa có phòng yêu thích' : 'Không tìm thấy phòng trọ nào'}
          </h3>
          <p className="empty-state-description">
            {showFavoritesOnly 
              ? 'Bắt đầu thêm phòng yêu thích bằng cách nhấn nút trái tim trên các phòng.'
              : 'Hãy thử thay đổi bộ lọc hoặc tìm kiếm lại với các tiêu chí khác.'}
          </p>
          <div className="empty-state-actions">
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={showFavoritesOnly ? () => setShowFavoritesOnly(false) : handleResetFilters}
              aria-label={showFavoritesOnly ? 'Xem tất cả phòng' : 'Xóa bộ lọc và tìm lại'}
            >
              <FiX size={16} /> {showFavoritesOnly ? 'Xem tất cả phòng' : 'Xóa bộ lọc'}
            </button>
            {!user && (
              <Link to="/login" className="btn btn-neutral" aria-label="Đăng nhập để xem thêm tùy chọn">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <div className="map-view panel">
              <div className="map-legend">
                <span><span className="map-marker map-marker-available" /> Còn trống</span>
                <span><span className="map-marker map-marker-rented" /> Đã thuê</span>
                <span><span className="map-marker map-marker-maintenance" /> Bảo trì</span>
              </div>
              <div className="map-canvas">
                <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="map-leaflet">
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
                          <p>{Number(room.price || 0).toLocaleString('vi-VN')} đ/tháng</p>
                          <div className="action-group">
                            <a href={`/rooms/${room.id}`} className="btn btn-primary btn-sm">Chi tiết</a>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-neutral btn-sm"
                            >
                              Chỉ đường
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
                      aria-label={favorites.includes(room.id) ? `Xóa ${room.title} khỏi yêu thích` : `Thêm ${room.title} vào yêu thích`}
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
                            aria-label="Xem ảnh trước"
                            onClick={() => handleImageChange(room, -1)}
                          >
                            <FiChevronLeft size={15} />
                          </button>
                          <button
                            type="button"
                            className="room-card-image-btn"
                            aria-label="Xem ảnh tiếp theo"
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
                        {room.status === 'available' ? 'Còn trống' : room.status === 'rented' ? 'Đã thuê' : 'Bảo trì'}
                      </span>
                    </div>
                    <p className="card-text"><FiMapPin size={14} /> {room.address}, {room.district}, {room.city}</p>

                    <div className="room-meta-grid">
                      <div className="room-meta-item"><FiMaximize2 size={14} /> Diện tích: {room.area} m²</div>
                      <div className="room-meta-item"><FiUsers size={14} /> Sức chứa: {room.capacity} người</div>
                    </div>

                    {getRoomAmenities(room).length > 0 && (
                      <div className="room-amenities">
                        {getRoomAmenities(room).map((amenity) => (
                          <span key={amenity.id} className="amenity-tag">
                            {amenity.icon} {amenity.label}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="card-price">{Number(room.price).toLocaleString('vi-VN')} đ/tháng</div>
                    <Link to={`/rooms/${room.id}`} className="card-button" aria-label={`Xem chi tiết phòng ${room.title}`} onClick={saveListScrollPosition}>
                      Xem chi tiết
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
                aria-label="Trang trước"
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
                    aria-label={`Trang ${pageNum}`}
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
                aria-label="Trang sau"
              >
                <FiChevronRight size={16} />
              </button>

              <span className="pagination-label">
                Trang {currentPage} / {totalPages}
              </span>
            </div>
          )}

          {infiniteScroll && displayedRooms.length < sortedRooms.length && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => setVisibleCount((prev) => Math.min(prev + itemsPerPage, sortedRooms.length))}
                aria-label="Tải thêm phòng"
              >
                <FiChevronsDown size={16} /> Tải thêm ({displayedRooms.length}/{sortedRooms.length})
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
