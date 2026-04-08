import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../api/services';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../contexts/LanguageContext';

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

const normalizeCity = (city) => String(city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const previewUrlsRef = useRef([]);
  const fileInputRef = useRef(null);
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
        setError(firstMsg || t('createRoom.invalidData'));
      } else if (status === 401) {
        setError(t('createRoom.sessionExpired'));
      } else if (status === 403) {
        setError(t('createRoom.noPermission'));
      } else if (status === 413) {
        setError(t('createRoom.imageTooLarge'));
      } else if (message) {
        setError(message);
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
              center={clampToVietnamBounds(coordinates || cityCoordinates[normalizeCity(formData.city)] || defaultCenter)}
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
