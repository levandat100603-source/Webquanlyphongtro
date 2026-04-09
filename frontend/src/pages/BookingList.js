import React, { useState, useEffect, useCallback } from 'react';
import { bookingService, authService } from '../api/services';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../contexts/LanguageContext';

const BookingList = () => {
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingToDelete, setBookingToDelete] = useState(null);
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
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await bookingService.updateBooking(id, status);
      fetchBookings();
    } catch (error) {
      alert(t('bookingList.updateFailed'));
    }
  };

  const handleDelete = async (id) => {
    const targetId = bookingToDelete ?? id;
    if (!targetId) {
      return;
    }

    try {
      await bookingService.deleteBooking(targetId);
      setBookings((prev) => prev.filter((booking) => booking.id !== targetId));
      setBookingToDelete(null);
    } catch (error) {
      alert(t('bookingList.deleteFailed'));
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
      case 'pending': return t('bookingList.statusPending');
      case 'approved': return t('bookingList.statusApproved');
      case 'rejected': return t('bookingList.statusRejected');
      case 'cancelled': return t('bookingList.statusCancelled');
      case 'completed': return t('bookingList.statusCompleted');
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
          return { label: t('bookingList.infoLabel'), value: line };
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
          <h1 className="page-title">{t('bookingList.title')}</h1>
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
        <h1 className="page-title">{t('bookingList.title')}</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">{t('bookingList.emptyTitle')}</h3>
          <p className="empty-state-description">
            {canManageBookings 
              ? t('bookingList.emptyManager')
              : t('bookingList.emptyUser')}
          </p>
        </div>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('bookingList.colRoom')}</th>
                <th>{t('bookingList.colBooker')}</th>
                <th>{t('bookingList.colStartDate')}</th>
                <th>{t('bookingList.colPrice')}</th>
                <th>{t('bookingList.colStatus')}</th>
                <th>{t('bookingList.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>{booking.room?.title}</td>
                  <td>{booking.user?.name}</td>
                  <td>{new Date(booking.start_date).toLocaleDateString(locale)}</td>
                  <td>{Number(booking.total_price).toLocaleString(locale)} {t('bookingList.currencyShort')}</td>
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
                          aria-label={t('bookingList.approveAria', { id: booking.id })}
                        >
                          {t('bookingList.approve')}
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(booking.id, 'rejected')}
                          className="btn btn-danger btn-sm"
                          aria-label={t('bookingList.rejectAria', { id: booking.id })}
                        >
                          {t('bookingList.reject')}
                        </button>
                      </>
                    )}
                    {booking.status === 'approved' && canManageBookings && (
                      <button 
                        onClick={() => handleStatusUpdate(booking.id, 'completed')}
                        className="btn btn-primary btn-sm"
                        aria-label={t('bookingList.completeAria', { id: booking.id })}
                      >
                        {t('bookingList.complete')}
                      </button>
                    )}
                    {booking.status === 'pending' && booking.user_id === user.id && (
                      <button 
                        onClick={() => setBookingToDelete(booking.id)}
                        className="btn btn-danger btn-sm"
                        aria-label={t('bookingList.cancelAria', { id: booking.id })}
                      >
                        {t('bookingList.cancel')}
                      </button>
                    )}
                    {canManageBookings && booking.notes && (
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="btn btn-neutral btn-sm"
                        aria-label={t('bookingList.viewFormAria', { id: booking.id })}
                      >
                        {t('bookingList.viewForm')}
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
              <h4>{t('bookingList.modalTitle')}</h4>
              <button
                type="button"
                className="booking-modal-close"
                onClick={() => setSelectedBooking(null)}
                aria-label={t('bookingList.closeModal')}
              >
                ×
              </button>
            </div>

            <div className="booking-modal-meta">
              <p><strong>{t('bookingList.orderLabel')}:</strong> #{selectedBooking.id}</p>
              <p><strong>{t('bookingList.roomLabel')}:</strong> {selectedBooking.room?.title || 'N/A'}</p>
              <p><strong>{t('bookingList.bookerLabel')}:</strong> {selectedBooking.user?.name || 'N/A'}</p>
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

      <ConfirmDialog
        open={Boolean(bookingToDelete)}
        title={t('bookingList.cancelTitle') || 'Xác nhận hủy'}
        message={t('bookingList.confirmCancel')}
        confirmText={t('bookingList.cancel')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setBookingToDelete(null)}
      />
    </div>
  );
};

export default BookingList;
