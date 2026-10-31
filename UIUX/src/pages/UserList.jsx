import React, { useState, useEffect, useCallback } from 'react';
import { ownerRegistrationRequestService, userService } from '../api/services';
import { translateApiMessage, useLanguage } from '../contexts/LanguageContext';

const UserList = () => {
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const [users, setUsers] = useState([]);
  const [ownerRequests, setOwnerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    type: null,
    user: null,
    nextRole: null,
  });
  const [reviewDialog, setReviewDialog] = useState({
    open: false,
    requestId: null,
    status: 'approved',
    note: '',
  });

  const extractUsers = (payload) => {
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

  const fetchUsers = useCallback(async () => {
    try {
      const usersResponse = await userService.getUsers();
      const requestsResponse = await ownerRegistrationRequestService.getAll();

      const requestsData = Array.isArray(requestsResponse?.data)
        ? requestsResponse.data
        : Array.isArray(requestsResponse?.data?.data)
          ? requestsResponse.data.data
          : Array.isArray(requestsResponse)
            ? requestsResponse
            : [];

      setUsers(extractUsers(usersResponse));
      setOwnerRequests(requestsData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setOwnerRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    const target = users.find((item) => item.id === id);
    if (!target) return;

    setConfirmDialog({
      open: true,
      title: t('userList.confirmDeleteTitle'),
      message: t('userList.confirmDeleteMessage', { name: target.name }),
      type: 'delete',
      user: target,
      nextRole: null,
    });
  };

  const handleUpdateRole = async (targetUser, nextRole) => {
    setConfirmDialog({
      open: true,
      title: t('userList.confirmRoleTitle'),
      message: nextRole === 'saler'
        ? t('userList.confirmGrantRole', { name: targetUser.name })
        : t('userList.confirmRevokeRole', { name: targetUser.name }),
      type: 'role',
      user: targetUser,
      nextRole,
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'badge-danger';
      case 'saler': return 'badge-warning';
      case 'user': return 'badge-info';
      default: return 'badge-info';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return t('roles.admin');
      case 'saler': return t('roles.saler');
      case 'user': return t('roles.user');
      default: return role;
    }
  };

  const getRequestStatusText = (status) => {
    switch (status) {
      case 'pending':
        return t('userList.pending');
      case 'approved':
        return t('userList.approved');
      case 'rejected':
        return t('userList.rejected');
      default:
        return status;
    }
  };

  const handleReviewRequest = async (requestId, status) => {
    setReviewDialog({
      open: true,
      requestId,
      status,
      note: '',
    });
  };

  const executeConfirmAction = async () => {
    setError('');
    setNotice('');

    try {
      if (confirmDialog.type === 'delete' && confirmDialog.user) {
        await userService.deleteUser(confirmDialog.user.id);
        setUsers((prev) => prev.filter((user) => user.id !== confirmDialog.user.id));
        setNotice(t('userList.deleteSuccess'));
      }

      if (confirmDialog.type === 'role' && confirmDialog.user && confirmDialog.nextRole) {
        await userService.updateUser(confirmDialog.user.id, { role: confirmDialog.nextRole });
        setUsers((prev) => prev.map((item) => (
          item.id === confirmDialog.user.id ? { ...item, role: confirmDialog.nextRole } : item
        )));
        setNotice(t('userList.updateRoleSuccess'));
      }
    } catch (actionError) {
      setError(translateApiMessage(t, actionError?.response?.data?.message, 'userList.actionFailed'));
    } finally {
      setConfirmDialog({
        open: false,
        title: '',
        message: '',
        type: null,
        user: null,
        nextRole: null,
      });
    }
  };

  const submitReviewDialog = async () => {
    setError('');
    setNotice('');

    try {
      await ownerRegistrationRequestService.review(reviewDialog.requestId, {
        status: reviewDialog.status,
        admin_note: reviewDialog.note,
      });

      await fetchUsers();
      setNotice(reviewDialog.status === 'approved' ? t('userList.approvedSuccess') : t('userList.rejectedSuccess'));
      setReviewDialog({
        open: false,
        requestId: null,
        status: 'approved',
        note: '',
      });
    } catch (reviewError) {
      setError(translateApiMessage(t, reviewError?.response?.data?.message, 'userList.reviewFailed'));
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{t('userList.title')}</h1>
        </div>
        <div className="skeleton-table">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`user-skeleton-${index}`} className="skeleton-table-row">
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
        <h1 className="page-title">{t('userList.title')}</h1>
      </div>

      {notice && <div className="success-message">{notice}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="section-block" style={{ marginBottom: '1rem' }}>
        <h2>{t('userList.requestsTitle')}</h2>
        {ownerRequests.length === 0 ? (
          <div className="empty-state">{t('userList.noRequests')}</div>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>{t('userList.id')}</th>
                  <th>{t('userList.name')}</th>
                  <th>{t('userList.identifier')}</th>
                  <th>{t('userList.userNote')}</th>
                  <th>{t('userList.status')}</th>
                  <th>{t('userList.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {ownerRequests.map((requestItem) => (
                  <tr key={requestItem.id}>
                    <td>{requestItem.id}</td>
                    <td>
                      <div>{requestItem.user?.name || t('userList.notAvailable')}</div>
                      <small>{requestItem.user?.email || ''}</small>
                    </td>
                    <td>{requestItem.id_number}</td>
                    <td>{requestItem.message || t('userList.processed')}</td>
                    <td>
                      <span className={`badge ${requestItem.status === 'approved' ? 'badge-success' : requestItem.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {getRequestStatusText(requestItem.status)}
                      </span>
                    </td>
                    <td>
                      {requestItem.status === 'pending' ? (
                        <div className="action-group">
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => handleReviewRequest(requestItem.id, 'approved')}
                          >
                            {t('userList.approve')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReviewRequest(requestItem.id, 'rejected')}
                          >
                            {t('userList.reject')}
                          </button>
                        </div>
                      ) : (
                        <span>{requestItem.admin_note || t('userList.processed')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3 className="empty-state-title">{t('userList.noUsers')}</h3>
          <p className="empty-state-description">
            {t('userList.onlyAdmin')}
          </p>
        </div>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>{t('userList.id')}</th>
                <th>{t('userList.name')}</th>
                <th>{t('userList.email')}</th>
                <th>{t('userList.role')}</th>
                <th>{t('userList.phone')}</th>
                <th>{t('userList.createdAt')}</th>
                <th>{t('userList.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                      {getRoleText(user.role)}
                    </span>
                  </td>
                  <td>{user.phone || t('userList.notUpdated')}</td>
                  <td>{new Date(user.created_at).toLocaleDateString(locale)}</td>
                  <td>
                    <div className="action-group">
                      {user.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateRole(user, user.role === 'saler' ? 'user' : 'saler')}
                          className={`btn ${user.role === 'saler' ? 'btn-warning' : 'btn-success'} btn-sm`}
                        >
                          {user.role === 'saler' ? t('userList.revokeSaler') : t('userList.grantSaler')}
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn-danger btn-sm"
                        disabled={user.role === 'admin'}
                        aria-label={t('userList.deleteUserAria', { name: user.name })}
                      >
                        {t('userList.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDialog.open && (
        <div className="booking-modal-overlay" onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-header">
              <h4>{confirmDialog.title}</h4>
              <button
                type="button"
                className="booking-modal-close"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>

            <p className="dialog-subtitle">{confirmDialog.message}</p>

            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={`btn ${confirmDialog.type === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                onClick={executeConfirmAction}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewDialog.open && (
        <div className="booking-modal-overlay" onClick={() => setReviewDialog((prev) => ({ ...prev, open: false }))}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-header">
              <h4>{reviewDialog.status === 'approved' ? t('userList.approveRequest') : t('userList.rejectRequest')}</h4>
              <button
                type="button"
                className="booking-modal-close"
                onClick={() => setReviewDialog((prev) => ({ ...prev, open: false }))}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>

            <label className="form-label">
              {reviewDialog.status === 'approved' ? t('userList.approveNote') : t('userList.rejectNote')}
            </label>
            <textarea
              className="form-textarea dialog-note-input"
              value={reviewDialog.note}
              onChange={(e) => setReviewDialog((prev) => ({ ...prev, note: e.target.value }))}
              placeholder={t('userList.inputNote')}
            />

            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => setReviewDialog((prev) => ({ ...prev, open: false }))}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={`btn ${reviewDialog.status === 'approved' ? 'btn-success' : 'btn-danger'}`}
                onClick={submitReviewDialog}
              >
                {reviewDialog.status === 'approved' ? t('userList.approveRequest') : t('userList.rejectRequest')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
