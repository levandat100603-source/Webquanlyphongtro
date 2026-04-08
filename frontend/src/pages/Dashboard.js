import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authService, roomService, bookingService, infoService } from '../api/services';

const Dashboard = () => {
  const user = authService.getCurrentUser();
  const [stats, setStats] = useState({
    rooms: 0,
    bookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [databaseInfo, setDatabaseInfo] = useState(null);

  const extractItems = (payload) => {
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

  const fetchDashboardData = useCallback(async () => {
    try {
      const bookingsResponse = await bookingService.getBookings();
      const bookings = extractItems(bookingsResponse);
      setRecentBookings(bookings.slice(0, 5));
      setStats(prev => ({ ...prev, bookings: bookings.length }));

      if (user.role === 'saler' || user.role === 'admin') {
        const roomsResponse = await roomService.getMyRooms();
        const rooms = extractItems(roomsResponse);
        setStats(prev => ({ ...prev, rooms: rooms.length }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch database info (for admin only)
  useEffect(() => {
    if (user?.role === 'admin') {
      infoService.getDatabaseInfo()
        .then(data => setDatabaseInfo(data))
        .catch(error => console.error('Error fetching database info:', error));
    }
  }, [user?.role]);

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
    return (
      <div className="container">
        <div className="dashboard">
          <div className="skeleton-shimmer skeleton-line lg" style={{ width: '260px', marginBottom: '0.8rem' }} />
          <div className="skeleton-shimmer skeleton-line md" style={{ width: '340px' }} />

          <div className="skeleton-stat-grid" style={{ marginTop: '1.2rem' }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`dashboard-skeleton-${index}`} className="skeleton-stat">
                <div className="skeleton-shimmer skeleton-line lg" />
                <div className="skeleton-shimmer skeleton-line md" />
                <div className="skeleton-shimmer skeleton-line sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard">
        {databaseInfo && user?.role === 'admin' && (
          <div
            className="alert alert-info"
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              borderRadius: '4px',
              backgroundColor: '#e7f3ff',
              border: '1px solid #b3d9ff',
              color: '#004085',
            }}
          >
            <strong>⚠️ Database thông tin:</strong> Đang sử dụng database <strong>{databaseInfo.database}</strong> trên host <strong>{databaseInfo.host}</strong> (Environment: <strong>{databaseInfo.environment}</strong>)
          </div>
        )}
        <h1 className="dashboard-title">
          Xin chào, {user.name}!
        </h1>
        <p className="dashboard-subtitle">
          Vai trò: {user.role === 'admin' ? 'Quản trị viên' : user.role === 'saler' ? 'Chủ nhà / Môi giới' : 'Người thuê'}
        </p>

        <div className="stats-grid">
          {(user.role === 'saler' || user.role === 'admin') && (
            <div className="panel stat-card stat-primary">
              <h3>{stats.rooms}</h3>
              <p className="muted-text">Phòng trọ của tôi</p>
              <Link to="/my-rooms" className="btn btn-primary">
                Xem tất cả
              </Link>
            </div>
          )}

          <div className="panel stat-card stat-danger">
            <h3>{stats.bookings}</h3>
            <p className="muted-text">Đặt phòng</p>
            <Link to="/bookings" className="btn btn-primary">
              Xem tất cả
            </Link>
          </div>

          {user.role === 'admin' && (
            <div className="panel stat-card stat-success">
              <h3>Admin</h3>
              <p className="muted-text">Quản lý người dùng</p>
              <Link to="/users" className="btn btn-primary">
                Quản lý
              </Link>
            </div>
          )}
        </div>

        <div className="section-block">
          <h2>Đặt phòng gần đây</h2>
          {recentBookings.length === 0 ? (
            <div className="empty-state">
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

        <div className="section-block">
          <h2>Liên kết nhanh</h2>
          <div className="action-group">
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
