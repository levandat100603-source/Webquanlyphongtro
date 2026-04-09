import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../api/services';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { translateApiMessage, useLanguage } from '../contexts/LanguageContext';

const defaultCenter = [10.8231, 106.6297];
const cityCoordinates = {
  'ha noi': [21.0278, 105.8342],
  hanoi: [21.0278, 105.8342],
  'ho chi minh': [10.8231, 106.6297],
  hcm: [10.8231, 106.6297],
  'da nang': [16.0544, 108.2022],
  'hai phong': [20.8449, 106.6881],
  'can tho': [10.0452, 105.7469],
  'nha trang': [12.2388, 109.1967],
};

const hcmDistrictCoordinates = {
  1: [10.7757, 106.7004],
  2: [10.7872, 106.7498],
  3: [10.7842, 106.6847],
  4: [10.7599, 106.7032],
  5: [10.7540, 106.6665],
  6: [10.7467, 106.6355],
  7: [10.7342, 106.7218],
  8: [10.7248, 106.6286],
  9: [10.8428, 106.8287],
  10: [10.7723, 106.6677],
  11: [10.7649, 106.6464],
  12: [10.8672, 106.6419],
};

const hcmAreaNameCoordinates = {
  'thu duc': [10.8494, 106.7537],
  'go vap': [10.8388, 106.6655],
  'binh thanh': [10.8105, 106.7091],
  'tan binh': [10.8036, 106.6520],
  'tan phu': [10.7919, 106.6286],
  'phu nhuan': [10.7991, 106.6801],
  'binh tan': [10.7656, 106.6023],
  'binh chanh': [10.6907, 106.5993],
  'hoc mon': [10.8833, 106.5833],
  'nha be': [10.6645, 106.7323],
  'cu chi': [11.0323, 106.5018],
  'can gio': [10.4114, 106.9547],
};

const hanoiAreaNameCoordinates = {
  'ba dinh': [21.0368, 105.8342],
  'hoan kiem': [21.0288, 105.8524],
  'tay ho': [21.0703, 105.8156],
  'long bien': [21.0469, 105.8896],
  'cau giay': [21.0305, 105.7902],
  'dong da': [21.0181, 105.8292],
  'hai ba trung': [21.0058, 105.8578],
  'hoang mai': [20.9746, 105.8639],
  'thanh xuan': [20.9930, 105.8040],
  'nam tu liem': [21.0036, 105.7662],
  'bac tu liem': [21.0710, 105.7718],
  'ha dong': [20.9710, 105.7797],
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

const pickerIcon = L.divIcon({
  className: 'location-picker-marker-wrap',
  html: '<span class="location-picker-marker"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const normalizeCity = (city) => String(city || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .trim();

const normalizeDistrict = (district) => String(district || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .trim();

const normalizeText = (value) => normalizeDistrict(value);

const getCityMatchKeys = (cityRaw) => {
  const city = normalizeText(cityRaw);
  if (!city) {
    return [];
  }

  const keys = [city];
  if (city === 'hcm' || city.includes('ho chi minh')) {
    keys.push('ho chi minh');
    keys.push('thanh pho ho chi minh');
    keys.push('tp ho chi minh');
    keys.push('sai gon');
  }
  if (city === 'ha noi' || city === 'hanoi') {
    keys.push('ha noi');
    keys.push('hanoi');
    keys.push('thanh pho ha noi');
    keys.push('tp ha noi');
  }

  return [...new Set(keys)];
};

const getResultAdminHaystack = (result) => normalizeText([
  result?.address?.city,
  result?.address?.county,
  result?.address?.state,
  result?.address?.state_district,
  result?.address?.city_district,
  result?.address?.suburb,
  result?.address?.town,
  result?.address?.village,
].filter(Boolean).join(' '));

const buildResultHaystack = (result) => normalizeText([
  result?.display_name,
  result?.name,
  result?.address?.road,
  result?.address?.suburb,
  result?.address?.city,
  result?.address?.county,
  result?.address?.state,
  result?.address?.state_district,
  result?.address?.town,
  result?.address?.village,
].filter(Boolean).join(' '));

const matchesDistrict = (haystack, districtRaw) => {
  const districtKey = normalizeText(districtRaw);
  if (!districtKey) {
    return true;
  }

  const keys = getDistrictMatchKeys(districtRaw);
  return keys.some((key) => haystack.includes(key));
};

const matchesCity = (haystack, cityRaw) => {
  const cityKeys = getCityMatchKeys(cityRaw);
  if (cityKeys.length === 0) {
    return true;
  }
  return cityKeys.some((key) => haystack.includes(key));
};

const filterResultsByAdmin = (results, districtRaw, cityRaw, strictCity = false) => {
  if (!Array.isArray(results) || results.length === 0) {
    return [];
  }

  const districtText = normalizeText(districtRaw);
  const cityText = normalizeText(cityRaw);

  return results.filter((result) => {
    const adminHaystack = getResultAdminHaystack(result);

    if (districtText && !matchesDistrict(adminHaystack, districtRaw)) {
      return false;
    }

    if ((strictCity || cityText) && !matchesCity(adminHaystack, cityRaw)) {
      return false;
    }

    return true;
  });
};

const getCityQueryText = (cityRaw) => {
  const city = normalizeText(cityRaw);
  if (!city) {
    return '';
  }

  if (city === 'hcm' || city.includes('ho chi minh')) {
    return 'Ho Chi Minh';
  }

  if (city === 'ha noi' || city === 'hanoi') {
    return 'Ha Noi';
  }

  return String(cityRaw || '').trim();
};

const getDistrictMatchKeys = (districtRaw) => {
  const text = normalizeText(districtRaw);
  if (!text) {
    return [];
  }

  const keys = [text];
  const number = parseDistrictNumber(districtRaw);
  if (number) {
    keys.push(`quan ${number}`);
    keys.push(`q ${number}`);
    keys.push(`q${number}`);
    keys.push(`district ${number}`);
    keys.push(`district${number}`);
  }

  return [...new Set(keys)];
};

const pickBestGeocodeResult = (results, addressRaw, districtRaw, cityRaw) => {
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const addressTokens = normalizeText(addressRaw)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  const districtKey = normalizeText(districtRaw);
  const districtMatchKeys = getDistrictMatchKeys(districtRaw);
  const cityMatchKeys = getCityMatchKeys(cityRaw);

  const hasDistrictMatch = (haystack) => {
    if (!districtKey) {
      return true;
    }
    return districtMatchKeys.some((key) => haystack.includes(key));
  };

  const hasCityMatch = (haystack) => {
    if (cityMatchKeys.length === 0) {
      return true;
    }
    return cityMatchKeys.some((key) => haystack.includes(key));
  };

  const scoreResult = (result) => {
    const haystack = buildResultHaystack(result);
    const adminHaystack = getResultAdminHaystack(result);
    let score = Number(result?.importance || 0);

    if (hasCityMatch(adminHaystack)) {
      score += 9;
    }

    addressTokens.forEach((token) => {
      if (haystack.includes(token)) {
        score += 4;
      }
    });

    if (hasDistrictMatch(adminHaystack)) {
      score += 1.5;
    }

    const type = String(result?.type || '').toLowerCase();
    if (['road', 'residential', 'secondary', 'primary', 'tertiary', 'trunk', 'pedestrian'].includes(type)) {
      score += 1.5;
    }

    return score;
  };

  const strictCityOnly = results.filter((item) => {
    const adminHaystack = getResultAdminHaystack(item);
    return hasCityMatch(adminHaystack);
  });

  const strictDistrictOnly = results.filter((item) => {
    const adminHaystack = getResultAdminHaystack(item);
    return hasDistrictMatch(adminHaystack);
  });

  const pool = strictCityOnly.length > 0
    ? strictCityOnly
    : strictDistrictOnly.length > 0
      ? strictDistrictOnly
      : results;

  return [...pool].sort((a, b) => scoreResult(b) - scoreResult(a))[0] || pool[0] || results[0];
};

const parseDistrictNumber = (district) => {
  const text = normalizeDistrict(district);
  const direct = text.match(/^\d{1,2}$/);
  if (direct) {
    return Number(direct[0]);
  }

  const formatted = text.match(/^(?:q|quan|district)\s*(\d{1,2})$/);
  if (formatted) {
    return Number(formatted[1]);
  }

  return null;
};

const normalizeAdministrativeName = (district) => normalizeDistrict(district)
  .replace(/^(?:quan|q|huyen|h|thi xa|tx|thanh pho|tp)\s+/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const resolveDistrictFallbackCenter = (district, city) => {
  const cityText = normalizeCity(city);
  const districtNumber = parseDistrictNumber(district);
  const normalizedName = normalizeAdministrativeName(district);

  const isHcmContext = !cityText || cityText.includes('ho chi minh') || cityText === 'hcm';
  const isHanoiContext = !cityText || cityText.includes('ha noi') || cityText === 'hanoi';

  if (isHcmContext && districtNumber) {
    const byNumber = hcmDistrictCoordinates[districtNumber];
    if (byNumber) {
      return byNumber;
    }
  }

  if (!normalizedName) {
    return null;
  }

  if (isHcmContext && hcmAreaNameCoordinates[normalizedName]) {
    return hcmAreaNameCoordinates[normalizedName];
  }

  if (isHanoiContext && hanoiAreaNameCoordinates[normalizedName]) {
    return hanoiAreaNameCoordinates[normalizedName];
  }

  return null;
};

const normalizeLongitude = (lng) => {
  const value = Number(lng);
  if (!Number.isFinite(value)) {
    return null;
  }
  return ((((value + 180) % 360) + 360) % 360) - 180;
};

const normalizeLatitude = (lat) => {
  const value = Number(lat);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(-90, Math.min(90, value));
};

const normalizeCoordinates = (lat, lng) => {
  const normalizedLat = normalizeLatitude(lat);
  const normalizedLng = normalizeLongitude(lng);
  if (normalizedLat === null || normalizedLng === null) {
    return null;
  }
  return clampToVietnamBounds([normalizedLat, normalizedLng]);
};

const resolveGeocodeCenter = (result) => {
  const bbox = Array.isArray(result?.boundingbox) ? result.boundingbox : null;
  if (bbox && bbox.length === 4) {
    const south = Number(bbox[0]);
    const north = Number(bbox[1]);
    const west = Number(bbox[2]);
    const east = Number(bbox[3]);

    if ([south, north, west, east].every(Number.isFinite)) {
      return clampToVietnamBounds([(south + north) / 2, (west + east) / 2]);
    }
  }

  const lat = Number(result?.lat);
  const lng = Number(result?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return clampToVietnamBounds([lat, lng]);
  }

  return null;
};

const MapClickHandler = ({ onPick }) => {
  useMapEvents({
    click(event) {
      const next = normalizeCoordinates(event.latlng.lat, event.latlng.lng);
      if (next) {
        onPick(next);
      }
    },
  });

  return null;
};

const MapViewportController = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(center) || center.length !== 2) {
      return;
    }

    map.flyTo(center, zoom, { duration: 0.45 });
  }, [map, center, zoom]);

  return null;
};

const CreateRoom = () => {
  const { t, language } = useLanguage();
  const MAX_IMAGES = 12;
  const MAX_IMAGE_SIZE_MB = 1;
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    district: '',
    price: '',
    area: '',
    capacity: 1,
    utilities: '',
  });
  const [coordinates, setCoordinates] = useState(null);
  const [mapTargetCenter, setMapTargetCenter] = useState(defaultCenter);
  const [mapTargetZoom, setMapTargetZoom] = useState(13);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const previewUrlsRef = useRef([]);
  const fileInputRef = useRef(null);
  const districtLookupSeqRef = useRef(0);
  const districtToCitiesRef = useRef(new Map());
  const geocodeCacheRef = useRef({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const syncNativeFileInput = (files) => {
    if (!fileInputRef.current) {
      return;
    }

    try {
      const dataTransfer = new DataTransfer();
      (files || []).forEach((file) => dataTransfer.items.add(file));
      fileInputRef.current.files = dataTransfer.files;
    } catch (error) {
      fileInputRef.current.value = '';
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('districtGeocodeCacheV4');
      geocodeCacheRef.current = saved ? JSON.parse(saved) : {};
    } catch (cacheError) {
      geocodeCacheRef.current = {};
    }

    let cancelled = false;

    const loadAdministrativeIndex = async () => {
      try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=2');
        if (!response.ok || cancelled) {
          return;
        }

        const data = await response.json();
        if (!Array.isArray(data) || cancelled) {
          return;
        }

        const nextIndex = new Map();
        data.forEach((province) => {
          const provinceName = String(province?.name || '').trim();
          const districts = Array.isArray(province?.districts) ? province.districts : [];

          districts.forEach((district) => {
            const normalized = normalizeAdministrativeName(district?.name || '');
            if (!normalized || !provinceName) {
              return;
            }

            const existing = nextIndex.get(normalized) || [];
            if (!existing.includes(provinceName)) {
              nextIndex.set(normalized, [...existing, provinceName]);
            }
          });
        });

        districtToCitiesRef.current = nextIndex;
      } catch (indexError) {
        // Keep working with geocode-only mode if the index API is unavailable.
      }
    };

    loadAdministrativeIndex();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      setMapTargetCenter(clampToVietnamBounds(coordinates));
      setMapTargetZoom(17);
      return;
    }

    const cityCenter = cityCoordinates[normalizeCity(formData.city)] || defaultCenter;
    setMapTargetCenter(clampToVietnamBounds(cityCenter));
    setMapTargetZoom(13);
  }, [coordinates, formData.city]);

  useEffect(() => {
    const districtRaw = String(formData.district || '').trim();
    const cityRaw = String(formData.city || '').trim();
    const cityQueryText = getCityQueryText(cityRaw);
    const districtText = normalizeDistrict(districtRaw);
    const cityText = normalizeCity(cityRaw);
    const districtKey = normalizeAdministrativeName(districtRaw);

    if (!districtText) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      districtLookupSeqRef.current += 1;
      const lookupId = districtLookupSeqRef.current;

      const fallbackCenter = resolveDistrictFallbackCenter(districtRaw, cityRaw);
      if (fallbackCenter) {
        setMapTargetCenter(clampToVietnamBounds(fallbackCenter));
        setMapTargetZoom(15);
        return;
      }

      const inferredCities = cityRaw
        ? []
        : (districtToCitiesRef.current.get(districtKey) || []);

      let districtQuery = districtRaw;
      if (/^\d{1,2}$/.test(districtText)) {
        districtQuery = `quan ${districtText}`;
      }

      const districtQueryCandidates = [];

      if (districtQuery) {
        districtQueryCandidates.push(`${districtQuery}, Vietnam`);
      }

      inferredCities.slice(0, 4).forEach((cityName) => {
        districtQueryCandidates.push(`${districtQuery}, ${cityName}, Vietnam`);
      });

      if (districtQuery && cityQueryText) {
        districtQueryCandidates.push(`${districtQuery}, ${cityQueryText}, Vietnam`);
      }

      if (districtText) {
        districtQueryCandidates.push(`${districtText}, ${cityText || ''}, Vietnam`.replace(/,\s*,/g, ',').replace(/,\s*$/, ''));
      }

      const uniqueDistrictQueries = [...new Set(districtQueryCandidates.map((item) => item.trim()).filter(Boolean))];

      try {
        let districtCenter = null;

        for (const query of uniqueDistrictQueries) {
          const cacheKey = normalizeDistrict(`district:${query}`);
          const cached = geocodeCacheRef.current[cacheKey];
          if (Array.isArray(cached) && cached.length === 2) {
            const cachedLat = Number(cached[0]);
            const cachedLng = Number(cached[1]);
            if (Number.isFinite(cachedLat) && Number.isFinite(cachedLng)) {
              districtCenter = clampToVietnamBounds([cachedLat, cachedLng]);
              break;
            }
          }

          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&polygon_geojson=1&accept-language=vi&countrycodes=vn&q=${encodeURIComponent(query)}`,
            {
              headers: {
                Accept: 'application/json',
              },
            }
          );

          if (!response.ok || lookupId !== districtLookupSeqRef.current) {
            continue;
          }

          const data = await response.json();
          const districtScopedData = filterResultsByAdmin(
            data,
            districtRaw,
            cityRaw,
            Boolean(cityRaw)
          );
          if (districtScopedData.length === 0) {
            continue;
          }

          const selected = pickBestGeocodeResult(districtScopedData, '', districtRaw, cityRaw);
          const resolvedCenter = resolveGeocodeCenter(selected);

          if (!resolvedCenter) {
            continue;
          }

          geocodeCacheRef.current[cacheKey] = [resolvedCenter[0], resolvedCenter[1]];
          try {
            localStorage.setItem('districtGeocodeCacheV4', JSON.stringify(geocodeCacheRef.current));
          } catch (persistError) {
            // Ignore storage quota issues.
          }

          districtCenter = resolvedCenter;
          break;
        }

        if (districtCenter) {
          setMapTargetCenter(districtCenter);
          setMapTargetZoom(15);
          return;
        }

        if (districtCenter) {
          setMapTargetCenter(districtCenter);
          setMapTargetZoom(15);
        }
      } catch (lookupError) {
        // Silently ignore geocoding errors and keep the current map view.
      }
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formData.district, formData.city]);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
      setSelectedFiles([]);
      setImagePreviews([]);
      syncNativeFileInput([]);
      return;
    }

    if (files.length > MAX_IMAGES) {
      setError(t('createRoom.maxImagesError', { max: MAX_IMAGES }));
      e.target.value = '';
      return;
    }

    const oversize = files.find((file) => file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
    if (oversize) {
      setError(t('createRoom.maxImageSizeError', { size: MAX_IMAGE_SIZE_MB }));
      e.target.value = '';
      return;
    }

    try {
      setError('');
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      const nextPreviews = files.map((file) => URL.createObjectURL(file));
      previewUrlsRef.current = nextPreviews;
      setSelectedFiles(files);
      setImagePreviews(nextPreviews);
      syncNativeFileInput(files);
    } catch (err) {
      setError(t('createRoom.readImageFailed'));
    }
  };

  const handleRemoveSelectedImage = (indexToRemove) => {
    setSelectedFiles((prev) => {
      const nextFiles = prev.filter((_, index) => index !== indexToRemove);
      syncNativeFileInput(nextFiles);
      return nextFiles;
    });
    setImagePreviews((prev) => {
      const toRemove = prev[indexToRemove];
      if (toRemove) {
        URL.revokeObjectURL(toRemove);
      }
      const nextPreviews = prev.filter((_, index) => index !== indexToRemove);
      previewUrlsRef.current = nextPreviews;
      return nextPreviews;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('address', formData.address);
      submitData.append('city', formData.city);
      submitData.append('district', formData.district);
      submitData.append('price', formData.price);
      submitData.append('area', formData.area);
      submitData.append('capacity', String(formData.capacity));
      submitData.append('status', 'available');

      if (Array.isArray(coordinates) && coordinates.length === 2) {
        const next = normalizeCoordinates(coordinates[0], coordinates[1]);
        if (next) {
          submitData.append('latitude', String(next[0]));
          submitData.append('longitude', String(next[1]));
        }
      }

      const utilities = formData.utilities ? formData.utilities.split(',').map((u) => u.trim()).filter(Boolean) : [];
      utilities.forEach((utility, index) => {
        submitData.append('utilities[]', utility);
      });

      selectedFiles.forEach((file) => {
        submitData.append('image_files[]', file);
      });
      
      const createdRoom = await roomService.createRoom(submitData);
      if (createdRoom?.id) {
        localStorage.setItem('myRoomsNotice', t('createRoom.createSuccessWithId', { title: createdRoom.title, id: createdRoom.id }));
      } else {
        localStorage.setItem('myRoomsNotice', t('createRoom.createSuccess'));
      }
      navigate('/my-rooms');
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      const errors = err?.response?.data?.errors;

      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstMsg = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : '';
        setError(translateApiMessage(t, firstMsg, 'createRoom.invalidData'));
      } else if (status === 401) {
        setError(t('createRoom.sessionExpired'));
      } else if (status === 403) {
        setError(t('createRoom.noPermission'));
      } else if (status === 413) {
        setError(t('createRoom.imageTooLarge'));
      } else if (message) {
        setError(translateApiMessage(t, message, 'createRoom.createFailed'));
      } else {
        setError(t('createRoom.createFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container form-container-wide">
      <h2 className="form-title">{t('createRoom.title')}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">{t('createRoom.fieldTitle')}</label>
          <input
            type="text"
            name="title"
            className="form-input"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('createRoom.fieldDescription')}</label>
          <textarea
            name="description"
            className="form-textarea"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">{t('createRoom.fieldAddress')}</label>
            <input
              type="text"
              name="address"
              className="form-input"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('createRoom.fieldDistrict')}</label>
            <input
              type="text"
              name="district"
              className="form-input"
              value={formData.district}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('createRoom.fieldCity')}</label>
          <input
            type="text"
            name="city"
            className="form-input"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('createRoom.mapTitle')}</label>
          <div className="location-picker-shell">
            <MapContainer
              center={mapTargetCenter}
              zoom={13}
              scrollWheelZoom
              className="location-picker-map"
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
              <MapViewportController center={mapTargetCenter} zoom={mapTargetZoom} />
              <MapClickHandler onPick={setCoordinates} />
              {coordinates && (
                <Marker
                  position={coordinates}
                  icon={pickerIcon}
                  draggable
                  eventHandlers={{
                    dragend: (event) => {
                      const marker = event.target;
                      const position = marker.getLatLng();
                      const next = normalizeCoordinates(position.lat, position.lng);
                      if (next) {
                        setCoordinates(next);
                      }
                    },
                  }}
                />
              )}
            </MapContainer>
            <p className="location-picker-note">
              {t('createRoom.mapHint')}
            </p>
            <div className="location-picker-coordinates">
              <span>{t('createRoom.latitude')}: {coordinates ? coordinates[0].toFixed(6) : t('createRoom.notSelected')}</span>
              <span>{t('createRoom.longitude')}: {coordinates ? coordinates[1].toFixed(6) : t('createRoom.notSelected')}</span>
            </div>
          </div>
        </div>

        <div className="form-grid-3">
          <div className="form-group">
            <label className="form-label">{t('createRoom.fieldPrice', { currency: language === 'en' ? 'VND' : 'VNĐ', period: t('createRoom.perMonth') })}</label>
            <input
              type="number"
              name="price"
              className="form-input"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('createRoom.fieldArea')}</label>
            <input
              type="number"
              name="area"
              className="form-input"
              value={formData.area}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('createRoom.fieldCapacity')}</label>
            <input
              type="number"
              name="capacity"
              className="form-input"
              value={formData.capacity}
              onChange={handleChange}
              required
              min="1"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('createRoom.fieldUtilities')}</label>
          <input
            type="text"
            name="utilities"
            className="form-input"
            value={formData.utilities}
            onChange={handleChange}
            placeholder={t('createRoom.utilitiesPlaceholder')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('createRoom.fieldImages', { max: MAX_IMAGES, size: MAX_IMAGE_SIZE_MB })}</label>
          <input
            ref={fileInputRef}
            type="file"
            className="form-input"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <small className="helper-link">{t('createRoom.selectedCount', { count: selectedFiles.length })}</small>

          {imagePreviews.length > 0 && (
            <div className="image-preview-grid">
              {imagePreviews.map((image, index) => (
                <div key={`preview-${index}`} className="image-preview-item" style={{ position: 'relative' }}>
                  <img src={image} alt={`Preview ${index + 1}`} />
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ position: 'absolute', top: 8, right: 8, padding: '0.2rem 0.45rem' }}
                    onClick={() => handleRemoveSelectedImage(index)}
                    aria-label={t('createRoom.removeSelectedImageAria', { index: index + 1 })}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="form-button" disabled={loading}>
          {loading ? t('createRoom.creating') : t('createRoom.submit')}
        </button>
      </form>
    </div>
  );
};

export default CreateRoom;
