import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomService } from '../api/services';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const pickerIcon = L.divIcon({
  className: 'location-picker-marker-wrap',
  html: '<span class="location-picker-marker"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const normalizeCity = (city) => String(city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const MapClickHandler = ({ onPick }) => {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
};

const MAX_IMAGES = 12;
const MAX_IMAGE_SIZE_MB = 1;
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

const EditRoom = () => {
  const { id } = useParams();
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
    status: 'available',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingImages, setExistingImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [coordinates, setCoordinates] = useState(null);

  const fetchRoom = useCallback(async () => {
    try {
      const room = await roomService.getRoom(id);
      setFormData({
        title: room.title,
        description: room.description,
        address: room.address,
        city: room.city,
        district: room.district,
        price: room.price,
        area: room.area,
        capacity: room.capacity,
        utilities: room.utilities ? room.utilities.join(', ') : '',
        status: room.status,
      });
      setExistingImages(Array.isArray(room.images) ? room.images : []);
      if (Number.isFinite(Number(room.latitude)) && Number.isFinite(Number(room.longitude))) {
        setCoordinates([Number(room.latitude), Number(room.longitude)]);
      }
    } catch (error) {
      setError('Không thể tải thông tin phòng');
    } finally {
      setFetching(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImagePreviews]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (existingImages.length + files.length > MAX_IMAGES) {
      setError(`Tổng số ảnh tối đa là ${MAX_IMAGES}. Vui lòng xóa bớt ảnh cũ hoặc chọn ít ảnh hơn.`);
      e.target.value = '';
      return;
    }

    const oversize = files.find((file) => file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
    if (oversize) {
      setError(`Mỗi ảnh tối đa ${MAX_IMAGE_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }

    setError('');
    newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles(files);
    setNewImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    setExistingImages((prev) => prev.filter((_, index) => index !== indexToRemove));
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
      submitData.append('status', formData.status);

      if (Array.isArray(coordinates) && coordinates.length === 2) {
        submitData.append('latitude', String(coordinates[0]));
        submitData.append('longitude', String(coordinates[1]));
      }

      const utilities = formData.utilities
        ? formData.utilities.split(',').map((u) => u.trim()).filter(Boolean)
        : [];
      utilities.forEach((utility) => {
        submitData.append('utilities[]', utility);
      });

      existingImages.forEach((imagePath) => {
        submitData.append('images[]', imagePath);
      });

      selectedFiles.forEach((file) => {
        submitData.append('image_files[]', file);
      });

      await roomService.updateRoom(id, submitData);
      navigate('/my-rooms');
    } catch (err) {
      setError('Cập nhật phòng thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="form-container form-container-wide">
      <h2 className="form-title">Chỉnh sửa thông tin phòng</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Tiêu đề</label>
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
          <label className="form-label">Mô tả</label>
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
            <label className="form-label">Địa chỉ</label>
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
            <label className="form-label">Quận/Huyện</label>
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
          <label className="form-label">Thành phố</label>
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
          <label className="form-label">Chọn vị trí phòng trên bản đồ</label>
          <div className="location-picker-shell">
            <MapContainer
              center={coordinates || cityCoordinates[normalizeCity(formData.city)] || defaultCenter}
              zoom={13}
              scrollWheelZoom
              className="location-picker-map"
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
                      setCoordinates([position.lat, position.lng]);
                    },
                  }}
                />
              )}
            </MapContainer>
            <p className="location-picker-note">
              Bấm lên bản đồ để đặt pin. Kéo pin để chỉnh chính xác hơn.
            </p>
            <div className="location-picker-coordinates">
              <span>Latitude: {coordinates ? coordinates[0].toFixed(6) : 'Chưa chọn'}</span>
              <span>Longitude: {coordinates ? coordinates[1].toFixed(6) : 'Chưa chọn'}</span>
            </div>
          </div>
        </div>

        <div className="form-grid-3">
          <div className="form-group">
            <label className="form-label">Giá (VNĐ/tháng)</label>
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
            <label className="form-label">Diện tích (m²)</label>
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
            <label className="form-label">Sức chứa (người)</label>
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
          <label className="form-label">Trạng thái</label>
          <select
            name="status"
            className="form-select"
            value={formData.status}
            onChange={handleChange}
            required
          >
            <option value="available">Còn trống</option>
            <option value="rented">Đã cho thuê</option>
            <option value="maintenance">Bảo trì</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Tiện ích (phân cách bằng dấu phẩy)</label>
          <input
            type="text"
            name="utilities"
            className="form-input"
            value={formData.utilities}
            onChange={handleChange}
            placeholder="Ví dụ: Wifi, Máy lạnh, Tủ lạnh, Máy giặt"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Ảnh hiện có</label>
          {existingImages.length > 0 ? (
            <div className="image-preview-grid">
              {existingImages.map((image, index) => (
                <div key={`existing-${index}`} className="image-preview-item" style={{ position: 'relative' }}>
                  <img src={resolveImageUrl(image)} alt={`Ảnh phòng ${index + 1}`} />
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ position: 'absolute', top: 8, right: 8, padding: '0.2rem 0.45rem' }}
                    onClick={() => handleRemoveExistingImage(index)}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-text">Phòng này chưa có ảnh.</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Thêm ảnh mới ({`tối đa ${MAX_IMAGES} ảnh tổng, mỗi ảnh <= ${MAX_IMAGE_SIZE_MB}MB`})</label>
          <input
            type="file"
            className="form-input"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />

          {newImagePreviews.length > 0 && (
            <div className="image-preview-grid">
              {newImagePreviews.map((image, index) => (
                <div key={`new-preview-${index}`} className="image-preview-item">
                  <img src={image} alt={`Ảnh mới ${index + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
      </form>
    </div>
  );
};

export default EditRoom;
