import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService, roomService, bookingService } from '../api/services';

const Dashboard = () => {
  const user = authService.getCurrentUser();
  const [stats, setStats] = useState({
    rooms: 0,
    bookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch bookings
      const bookingsResponse = await bookingService.getBookings();
      const bookings = bookingsResponse.data || [];
      setRecentBookings(bookings.slice(0, 5));
      setStats(prev => ({ ...prev, bookings: bookings.length }));

      // Fetch rooms if saler or admin
      if (user.role === 'saler' || user.role === 'admin') {
        const roomsResponse = await roomService.getMyRooms();
        const rooms = roomsResponse.data || [];
        setStats(prev => ({ ...prev, rooms: rooms.length }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'rejected': return 'badge-danger';
      case 'cancelled': return 'badge-danger';
      case 'completed': return 'badge-info';
      default: return 'badge-warning';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      case 'cancelled': return 'Đã hủy';
      case 'completed': return 'Hoàn thành';
      default: return status;
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="container">
      <div style={{ marginTop: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem', color: '#2c3e50' }}>
          Xin chào, {user.name}!
        </h1>
        <p style={{ color: '#7f8c8d', marginBottom: '2rem' }}>
          Vai trò: {user.role === 'admin' ? 'Quản trị viên' : user.role === 'saler' ? 'Chủ nhà / Môi giới' : 'Người thuê'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          {(user.role === 'saler' || user.role === 'admin') && (
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#3498db', fontSize: '2rem', marginBottom: '0.5rem' }}>{stats.rooms}</h3>
              <p style={{ color: '#7f8c8d' }}>Phòng trọ của tôi</p>
              <Link to="/my-rooms" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Xem tất cả
              </Link>
            </div>
          )}

          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#e74c3c', fontSize: '2rem', marginBottom: '0.5rem' }}>{stats.bookings}</h3>
            <p style={{ color: '#7f8c8d' }}>Đặt phòng</p>
            <Link to="/bookings" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Xem tất cả
            </Link>
          </div>

          {user.role === 'admin' && (
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#27ae60', fontSize: '2rem', marginBottom: '0.5rem' }}>Admin</h3>
              <p style={{ color: '#7f8c8d' }}>Quản lý người dùng</p>
              <Link to="/users" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Quản lý
              </Link>
            </div>
          )}
        </div>

        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Đặt phòng gần đây</h2>
          {recentBookings.length === 0 ? (
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: '#7f8c8d' }}>
              Chưa có đặt phòng nào
            </div>
          ) : (
            <div className="table">
              <table>
                <thead>
                  <tr>
                    <th>Phòng</th>
                    <th>Người đặt</th>
                    <th>Ngày bắt đầu</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.room?.title}</td>
                      <td>{booking.user?.name}</td>
                      <td>{new Date(booking.start_date).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Liên kết nhanh</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/rooms" className="btn btn-primary">Tìm phòng trọ</Link>
            {(user.role === 'saler' || user.role === 'admin') && (
              <Link to="/create-room" className="btn btn-success">Đăng phòng mới</Link>
            )}
            <Link to="/profile" className="btn btn-warning">Hồ sơ cá nhân</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
