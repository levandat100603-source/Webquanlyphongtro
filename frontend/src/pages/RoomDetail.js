import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomService, bookingService, authService } from '../api/services';

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    start_date: '',
    notes: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRoom();
  }, [id]);

  const fetchRoom = async () => {
    try {
      const data = await roomService.getRoom(id);
      setRoom(data);
    } catch (error) {
      console.error('Error fetching room:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    
    try {
      await bookingService.createBooking({
        room_id: id,
        ...bookingData,
      });
      setMessage('Đặt phòng thành công! Vui lòng chờ phê duyệt.');
      setBookingData({ start_date: '', notes: '' });
    } catch (error) {
      setMessage('Đặt phòng thất bại. Vui lòng thử lại.');
    }
  };

  const isLogged = authService.isAuthenticated();
  const isOwner = isLogged && room && room.owner_id === authService.getCurrentUser()?.id;
  const isAdmin = isLogged && authService.isAdmin();

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  if (!room) {
    return <div className="loading">Không tìm thấy phòng trọ</div>;
  }

  return (
    <div className="container">
      <div style={{ marginTop: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-primary">
          ← Quay lại
        </button>
      </div>

      <div style={{ marginTop: '2rem', background: 'white', padding: '2rem', borderRadius: '8px' }}>
        <h1 style={{ marginBottom: '1rem', color: '#2c3e50' }}>{room.title}</h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <div className="card-image" style={{ height: '400px', marginBottom: '1rem' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Thông tin chi tiết</h3>
            <p style={{ marginBottom: '0.5rem' }}><strong>Địa chỉ:</strong> {room.address}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Quận/Huyện:</strong> {room.district}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Thành phố:</strong> {room.city}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Diện tích:</strong> {room.area} m²</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Sức chứa:</strong> {room.capacity} người</p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Trạng thái:</strong>{' '}
              <span className={`badge ${room.status === 'available' ? 'badge-success' : 'badge-warning'}`}>
                {room.status === 'available' ? 'Còn trống' : room.status === 'rented' ? 'Đã cho thuê' : 'Bảo trì'}
              </span>
            </p>
            <div className="card-price" style={{ marginTop: '1rem' }}>
              {Number(room.price).toLocaleString('vi-VN')} đ/tháng
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#2c3e50' }}>Mô tả</h3>
            <p style={{ color: '#7f8c8d', lineHeight: '1.6' }}>{room.description}</p>

            {room.utilities && room.utilities.length > 0 && (
              <>
                <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#2c3e50' }}>Tiện ích</h3>
                <ul>
                  {room.utilities.map((utility, index) => (
                    <li key={index}>{utility}</li>
                  ))}
                </ul>
              </>
            )}

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#2c3e50' }}>Thông tin chủ nhà</h3>
            <p><strong>Tên:</strong> {room.owner?.name}</p>
            <p><strong>Số điện thoại:</strong> {room.owner?.phone || 'Chưa cập nhật'}</p>
          </div>

          <div>
            {room.status === 'available' && (
              <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Đặt phòng</h3>
                
                {message && (
                  <div className={message.includes('thành công') ? 'success-message' : 'error-message'}>
                    {message}
                  </div>
                )}

                {!isLogged ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ marginBottom: '1.5rem', color: '#7f8c8d', fontSize: '1rem' }}>
                      Vui lòng đăng nhập để đặt phòng
                    </p>
                    <button
                      onClick={() => navigate('/login')}
                      className="form-button"
                      style={{ width: '100%' }}
                    >
                      Đăng nhập
                    </button>
                    <p style={{ marginTop: '1rem', color: '#7f8c8d' }}>
                      Chưa có tài khoản?{' '}
                      <a href="/register" style={{ color: '#3498db', textDecoration: 'none' }}>
                        Đăng ký ngay
                      </a>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleBooking}>
                    <div className="form-group">
                      <label className="form-label">Ngày bắt đầu thuê</label>
                      <input
                        type="date"
                        className="form-input"
                        value={bookingData.start_date}
                        onChange={(e) => setBookingData({ ...bookingData, start_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Ghi chú</label>
                      <textarea
                        className="form-textarea"
                        value={bookingData.notes}
                        onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                        placeholder="Thêm ghi chú cho chủ nhà..."
                      />
                    </div>

                    <button type="submit" className="form-button">
                      Đặt phòng ngay
                    </button>
                  </form>
                )}
              </div>
            )}
            
            {(isOwner || isAdmin) && (
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => navigate(`/edit-room/${room.id}`)}
                  className="btn btn-primary"
                >
                  ✏️ Chỉnh sửa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetail;
