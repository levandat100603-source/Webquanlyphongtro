import React, { useState, useEffect, useCallback } from 'react';
import { bookingService, authService } from '../api/services';

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const user = authService.getCurrentUser();

  const extractBookings = (payload) => {
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

  const fetchBookings = useCallback(async () => {
    try {
      const response = await bookingService.getBookings();
      setBookings(extractBookings(response));
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await bookingService.updateBooking(id, status);
      fetchBookings();
    } catch (error) {
      alert('Cập nhật trạng thái thất bại');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đặt phòng này?')) {
      return;
    }

    try {
      await bookingService.deleteBooking(id);
      setBookings(bookings.filter(booking => booking.id !== id));
    } catch (error) {
      alert('Xóa đặt phòng thất bại');
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

  const canManageBookings = user?.role === 'admin' || user?.role === 'saler';

  const parseBookingRequestDetails = (notes) => {
    const raw = String(notes || '').trim();
    if (!raw) {
      return [];
    }

    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex < 0) {
          return { label: 'Thong tin', value: line };
        }

        return {
          label: line.slice(0, separatorIndex).trim(),
          value: line.slice(separatorIndex + 1).trim(),
        };
      });
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Danh sách đặt phòng</h1>
        </div>
        <div className="skeleton-table">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`booking-skeleton-${index}`} className="skeleton-table-row">
              <div className="skeleton-shimmer skeleton-line" />
              <div className="skeleton-shimmer skeleton-line" />
              <div className="skeleton-shimmer skeleton-line" />
              <div className="skeleton-shimmer skeleton-line sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Danh sách đặt phòng</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">Không có đặt phòng nào</h3>
          <p className="empty-state-description">
            {canManageBookings 
              ? 'Hiện chưa có yêu cầu đặt phòng. Các yêu cầu sẽ xuất hiện tại đây.'
              : 'Bạn chưa đặt phòng nào. Hãy khám phá các phòng trọ có sẵn.'}
          </p>
        </div>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Phòng</th>
                <th>Người đặt</th>
                <th>Ngày bắt đầu</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>{booking.room?.title}</td>
                  <td>{booking.user?.name}</td>
                  <td>{new Date(booking.start_date).toLocaleDateString('vi-VN')}</td>
                  <td>{Number(booking.total_price).toLocaleString('vi-VN')} đ</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                    {booking.status === 'pending' && canManageBookings && (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(booking.id, 'approved')}
                          className="btn btn-success btn-sm"
                          aria-label={`Duyệt đặt phòng ${booking.id}`}
                        >
                          Duyệt
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                          className="btn btn-danger btn-sm"
                          aria-label={`Từ chối đặt phòng ${booking.id}`}
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    {booking.status === 'approved' && canManageBookings && (
                      <button 
                        onClick={() => handleStatusUpdate(booking.id, 'completed')}
                        className="btn btn-primary btn-sm"
                        aria-label={`Hoàn thành đặt phòng ${booking.id}`}
                      >
                        Hoàn thành
                      </button>
                    )}
                    {booking.status === 'pending' && booking.user_id === user.id && (
                      <button 
                        onClick={() => handleDelete(booking.id)}
                        className="btn btn-danger btn-sm"
                        aria-label={`Hủy đặt phòng ${booking.id}`}
                      >
                        Hủy
                      </button>
                    )}
                    {canManageBookings && booking.notes && (
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="btn btn-neutral btn-sm"
                        aria-label={`Xem form khách gửi cho đơn ${booking.id}`}
                      >
                        Xem form
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedBooking && (
        <div className="booking-modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-header">
              <h4>Thong tin khach gui</h4>
              <button
                type="button"
                className="booking-modal-close"
                onClick={() => setSelectedBooking(null)}
                aria-label="Dong thong tin dat phong"
              >
                ×
              </button>
            </div>

            <div className="booking-modal-meta">
              <p><strong>Don:</strong> #{selectedBooking.id}</p>
              <p><strong>Phong:</strong> {selectedBooking.room?.title || 'N/A'}</p>
              <p><strong>Nguoi dat:</strong> {selectedBooking.user?.name || 'N/A'}</p>
            </div>

            <div className="booking-request-details">
              {parseBookingRequestDetails(selectedBooking.notes).map((item, index) => (
                <div key={`booking-detail-${index}`} className="booking-request-row">
                  <span className="booking-request-label">{item.label}</span>
                  <span className="booking-request-value">{item.value || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingList;
