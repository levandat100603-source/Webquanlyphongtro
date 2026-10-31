import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authService, roomService, bookingService, ownerRegistrationRequestService } from '../api/services';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const { t } = useLanguage();
  const user = authService.getCurrentUser();
  const [stats, setStats] = useState({
    rooms: 0,
    bookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingOwnerRequestCount, setPendingOwnerRequestCount] = useState(0);

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
      const bookingsResponse = await bookingService.getBookings({ per_page: 5 });
      const bookings = extractItems(bookingsResponse);
      setRecentBookings(bookings);

      const bookingTotal = Number(bookingsResponse?.total ?? bookings.length);
      setStats((prev) => ({ ...prev, bookings: bookingTotal }));

      let roomsResponse;
      if (user.role === 'saler' || user.role === 'admin') {
        roomsResponse = await roomService.getMyRooms({ per_page: 1 });
        const roomsTotal = Number(roomsResponse?.total ?? extractItems(roomsResponse).length);
        setStats((prev) => ({ ...prev, rooms: roomsTotal }));
      }

      if (user.role === 'admin') {
        const ownerRequestResponse = await ownerRegistrationRequestService.getAll({ status: 'pending', per_page: 1 });
        const pendingCount = Number(ownerRequestResponse?.total ?? 0);
        setPendingOwnerRequestCount(pendingCount);
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
      case 'pending': return t('dashboard.statusPending');
      case 'approved': return t('dashboard.statusApproved');
      case 'rejected': return t('dashboard.statusRejected');
      case 'cancelled': return t('dashboard.statusCancelled');
      case 'completed': return t('dashboard.statusCompleted');
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
        <h1 className="dashboard-title">
          {t('dashboard.greeting')}, {user.name}!
        </h1>
        <p className="dashboard-subtitle">
          {t('dashboard.role')}: {user.role === 'admin' ? t('roles.admin') : user.role === 'saler' ? t('roles.saler') : t('roles.user')}
        </p>

        {user.role === 'admin' && pendingOwnerRequestCount > 0 && (
          <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
            <strong>{pendingOwnerRequestCount}</strong> {t('dashboard.pendingRequests')}{' '}
            <Link to="/users" style={{ fontWeight: 700 }}>{t('dashboard.handleNow')}</Link>
          </div>
        )}

        <div className="stats-grid">
          {(user.role === 'saler' || user.role === 'admin') && (
            <div className="panel stat-card stat-primary">
              <h3>{stats.rooms}</h3>
              <p className="muted-text">{t('dashboard.myRooms')}</p>
              <Link to="/my-rooms" className="btn btn-primary">
                {t('dashboard.viewAll')}
              </Link>
            </div>
          )}

          <div className="panel stat-card stat-danger">
            <h3>{stats.bookings}</h3>
            <p className="muted-text">{t('dashboard.bookings')}</p>
            <Link to="/bookings" className="btn btn-primary">
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {user.role === 'admin' && (
            <div className="panel stat-card stat-success">
              <h3>Admin</h3>
              <p className="muted-text">{t('dashboard.manageUsers')}</p>
              <Link to="/users" className="btn btn-primary">
                {t('dashboard.manage')}
              </Link>
            </div>
          )}
        </div>

        <div className="section-block">
          <h2>{t('dashboard.recentBookings')}</h2>
          {recentBookings.length === 0 ? (
            <div className="empty-state">
              {t('dashboard.noBookings')}
            </div>
          ) : (
            <div className="table">
              <table>
                <thead>
                  <tr>
                    <th>{t('dashboard.room')}</th>
                    <th>{t('dashboard.booker')}</th>
                    <th>{t('dashboard.startDate')}</th>
                    <th>{t('dashboard.status')}</th>
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
          <h2>{t('dashboard.quickLinks')}</h2>
          <div className="action-group">
            <Link to="/rooms" className="btn btn-primary">{t('dashboard.findRooms')}</Link>
            {(user.role === 'saler' || user.role === 'admin') && (
              <Link to="/create-room" className="btn btn-success">{t('dashboard.createRoom')}</Link>
            )}
            <Link to="/profile" className="btn btn-warning">{t('dashboard.profile')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
