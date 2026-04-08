import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const CreateRoom = () => {
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setImagePreviews([]);
      return;
    }

    if (files.length > MAX_IMAGES) {
      setError(`Chỉ được chọn tối đa ${MAX_IMAGES} ảnh.`);
      e.target.value = '';
      return;
    }

    const oversize = files.find((file) => file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
    if (oversize) {
      setError(`Mỗi ảnh tối đa ${MAX_IMAGE_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }

    try {
      setError('');
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles(files);
      setImagePreviews(files.map((file) => URL.createObjectURL(file)));
    } catch (err) {
      setError('Đọc ảnh thất bại. Vui lòng chọn lại ảnh.');
    }
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
        submitData.append('latitude', String(coordinates[0]));
        submitData.append('longitude', String(coordinates[1]));
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
        localStorage.setItem('myRoomsNotice', `Đăng phòng thành công: ${createdRoom.title} (ID: ${createdRoom.id})`);
      } else {
        localStorage.setItem('myRoomsNotice', 'Đăng phòng thành công.');
      }
      navigate('/my-rooms');
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      const errors = err?.response?.data?.errors;

      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstMsg = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : '';
        setError(firstMsg || 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.');
      } else if (status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else if (status === 403) {
        setError('Bạn không có quyền đăng phòng.');
      } else if (status === 413) {
        setError('Dung lượng ảnh quá lớn. Vui lòng giảm kích thước ảnh.');
      } else if (message) {
        setError(message);
      } else {
        setError('Tạo phòng thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container form-container-wide">
      <h2 className="form-title">Đăng phòng trọ mới</h2>
      
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
              Bấm trực tiếp lên bản đồ để đặt pin. Kéo pin để chỉnh lại vị trí chính xác hơn.
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
          <label className="form-label">Hình ảnh phòng ({`tối đa ${MAX_IMAGES} ảnh, mỗi ảnh <= ${MAX_IMAGE_SIZE_MB}MB`})</label>
          <input
            type="file"
            className="form-input"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />

          {imagePreviews.length > 0 && (
            <div className="image-preview-grid">
              {imagePreviews.map((image, index) => (
                <div key={`preview-${index}`} className="image-preview-item">
                  <img src={image} alt={`Preview ${index + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Đang tạo...' : 'Đăng phòng'}
        </button>
      </form>
    </div>
  );
};

export default CreateRoom;
