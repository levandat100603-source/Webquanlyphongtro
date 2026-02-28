import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, userService } from '../api/services';

const Profile = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone || '',
    address: currentUser.address || '',
    password: '',
    password_confirmation: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (formData.password && formData.password !== formData.password_confirmation) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      };

      if (formData.password) {
        updateData.password = formData.password;
        updateData.password_confirmation = formData.password_confirmation;
      }

      const updatedUser = await userService.updateUser(currentUser.id, updateData);
      
      // Update local storage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setMessage('Cập nhật hồ sơ thành công!');
      setFormData({
        ...formData,
        password: '',
        password_confirmation: '',
      });
    } catch (err) {
      setError('Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Hồ sơ cá nhân</h2>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Họ và tên</label>
          <input
            type="text"
            name="name"
            className="form-input"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            name="email"
            className="form-input"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Vai trò</label>
          <input
            type="text"
            className="form-input"
            value={currentUser.role === 'admin' ? 'Quản trị viên' : currentUser.role === 'saler' ? 'Chủ nhà / Môi giới' : 'Người thuê'}
            disabled
          />
        </div>

        <div className="form-group">
          <label className="form-label">Số điện thoại</label>
          <input
            type="tel"
            name="phone"
            className="form-input"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Địa chỉ</label>
          <input
            type="text"
            name="address"
            className="form-input"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Đổi mật khẩu</h3>
        <p style={{ color: '#7f8c8d', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Để lại trống nếu không muốn đổi mật khẩu
        </p>

        <div className="form-group">
          <label className="form-label">Mật khẩu mới</label>
          <input
            type="password"
            name="password"
            className="form-input"
            value={formData.password}
            onChange={handleChange}
            minLength="8"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Xác nhận mật khẩu mới</label>
          <input
            type="password"
            name="password_confirmation"
            className="form-input"
            value={formData.password_confirmation}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
