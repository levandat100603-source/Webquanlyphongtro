import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomService } from '../api/services';

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

  useEffect(() => {
    fetchRoom();
  }, [id]);

  const fetchRoom = async () => {
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
    } catch (error) {
      setError('Không thể tải thông tin phòng');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        utilities: formData.utilities ? formData.utilities.split(',').map(u => u.trim()) : [],
      };
      
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
    <div className="form-container" style={{ maxWidth: '800px' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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

        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
      </form>
    </div>
  );
};

export default EditRoom;
