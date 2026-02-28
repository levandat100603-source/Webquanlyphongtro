import React, { useState, useEffect } from 'react';
import { bookingService, authService } from '../api/services';

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = authService.getCurrentUser();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await bookingService.getBookings();
      setBookings(response.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Danh sách đặt phòng</h1>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7f8c8d' }}>
          Chưa có đặt phòng nào
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
                    {booking.status === 'pending' && (user.isAdmin || user.isSaler) && (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(booking.id, 'approved')}
                          className="btn btn-success"
                          style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}
                        >
                          Duyệt
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                          className="btn btn-danger"
                          style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    {booking.status === 'approved' && (user.isAdmin || user.isSaler) && (
                      <button 
                        onClick={() => handleStatusUpdate(booking.id, 'completed')}
                        className="btn btn-primary"
                        style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}
                      >
                        Hoàn thành
                      </button>
                    )}
                    {booking.status === 'pending' && booking.user_id === user.id && (
                      <button 
                        onClick={() => handleDelete(booking.id)}
                        className="btn btn-danger"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Hủy
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BookingList;
