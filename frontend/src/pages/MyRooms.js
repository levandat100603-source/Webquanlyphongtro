import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { roomService } from '../api/services';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../contexts/LanguageContext';

const MyRooms = () => {
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [roomToDelete, setRoomToDelete] = useState(null);

  useEffect(() => {
    fetchMyRooms();

    const savedNotice = localStorage.getItem('myRoomsNotice');
    if (savedNotice) {
      setNotice(savedNotice);
      localStorage.removeItem('myRoomsNotice');
    }
  }, []);

  const fetchMyRooms = async () => {
    const extractRooms = (payload) => {
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

    try {
      const response = await roomService.getMyRooms();
      setRooms(extractRooms(response));
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const id = roomToDelete;
    if (!id) {
      return;
    }

    try {
      await roomService.deleteRoom(id);
      setRooms((prev) => prev.filter((room) => room.id !== id));
      setRoomToDelete(null);
    } catch (error) {
      alert(t('myRooms.deleteFailed'));
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{t('myRooms.title')}</h1>
        </div>
        <div className="skeleton-table">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`my-room-skeleton-${index}`} className="skeleton-table-row">
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
        <h1 className="page-title">{t('myRooms.title')}</h1>
        <Link to="/create-room" className="btn btn-primary">
          + {t('myRooms.createNew')}
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <h3 className="empty-state-title">{t('myRooms.emptyTitle')}</h3>
          <p className="empty-state-description">
            {t('myRooms.emptyDescription')}
          </p>
          <div className="empty-state-actions">
            <Link to="/create-room" className="btn btn-primary" aria-label={t('myRooms.createNew')}>
              <FiPlus size={16} /> {t('myRooms.createFirst')}
            </Link>
          </div>
        </div>
      ) : (
        <>
        {notice && <div className="success-message">{notice}</div>}
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>{t('myRooms.colTitle')}</th>
                <th>{t('myRooms.colAddress')}</th>
                <th>{t('myRooms.colPrice')}</th>
                <th>{t('myRooms.colStatus')}</th>
                <th>{t('myRooms.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.title}</td>
                  <td>{room.address}, {room.city}</td>
                  <td>{Number(room.price).toLocaleString(locale)} {t('myRooms.currencyShort')}</td>
                  <td>
                    <span className={`badge ${
                      room.status === 'available' ? 'badge-success' : 
                      room.status === 'rented' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {room.status === 'available'
                        ? t('myRooms.statusAvailable')
                        : room.status === 'rented'
                          ? t('myRooms.statusRented')
                          : t('myRooms.statusMaintenance')}
                    </span>
                  </td>
                  <td>
                    <div className="action-group">
                      <Link to={`/rooms/${room.id}`} className="btn btn-primary" aria-label={t('myRooms.viewAria', { title: room.title })}>
                        {t('myRooms.view')}
                      </Link>
                      <Link to={`/edit-room/${room.id}`} className="btn btn-warning" aria-label={t('myRooms.editAria', { title: room.title })}>
                        {t('myRooms.edit')}
                      </Link>
                      <button 
                        onClick={() => setRoomToDelete(room.id)}
                        className="btn btn-danger"
                        aria-label={t('myRooms.deleteAria', { title: room.title })}
                      >
                        {t('myRooms.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(roomToDelete)}
        title={t('myRooms.confirmDeleteTitle') || 'Xác nhận xóa'}
        message={t('myRooms.confirmDelete')}
        confirmText={t('myRooms.delete')}
        cancelText={t('common.cancel') || 'Hủy'}
        onConfirm={handleDelete}
        onCancel={() => setRoomToDelete(null)}
      />
    </div>
  );
};

export default MyRooms;
