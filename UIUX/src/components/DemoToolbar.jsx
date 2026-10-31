import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, demoService } from '../api/services';
import { useLanguage } from '../contexts/LanguageContext';
import './DemoToolbar.css';

export default function DemoToolbar() {
  const { language } = useLanguage();
  const en = language === 'en';
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const role = user?.role || 'guest';

  const switchRole = async (event) => {
    const nextRole = event.target.value;
    try {
      setError('');
      await demoService.switchRole(nextRole);
      navigate(nextRole === 'guest' ? '/rooms' : '/dashboard', { replace: true });
      window.dispatchEvent(new Event('demo-session-changed'));
    } catch (err) { setError(err.message); }
  };

  const reset = () => {
    demoService.reset();
    navigate('/rooms', { replace: true });
    window.dispatchEvent(new Event('demo-session-changed'));
  };

  return (
    <>
      <aside className="demo-toolbar" aria-label={en ? 'Demo controls' : 'Điều khiển bản mô phỏng'}>
        <div className="demo-toolbar-inner">
          <span className="demo-label"><i aria-hidden="true" /> UI/UX DEMO</span>
          <span className="demo-description">{en ? 'Sample data · Illustrative map · No real transactions' : 'Dữ liệu mẫu · Bản đồ minh họa · Không giao dịch thật'}</span>
          <label className="demo-role-label">
            <span>{en ? 'Try as' : 'Trải nghiệm'}</span>
            <select aria-label={en ? 'Demo role' : 'Vai trò mô phỏng'} value={role} onChange={switchRole}>
              <option value="guest">{en ? 'Guest' : 'Khách'}</option>
              <option value="user">{en ? 'Tenant' : 'Người thuê'}</option>
              <option value="saler">{en ? 'Landlord' : 'Chủ trọ'}</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="button" className="demo-reset-button" onClick={() => setOpen(true)}>{en ? 'Reset demo' : 'Đặt lại mẫu'}</button>
        </div>
        {error && <p role="alert" className="demo-error">{error}</p>}
      </aside>
      {open && (
        <div className="booking-modal-overlay" onClick={() => setOpen(false)}>
          <section className="booking-modal demo-reset-modal" role="dialog" aria-modal="true" aria-labelledby="demo-reset-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="demo-reset-title">{en ? 'Reset sample data?' : 'Đặt lại dữ liệu mẫu?'}</h2>
            <p>{en ? 'This restores the sample rooms, bookings and accounts in this demo. Changes made here will be cleared.' : 'Khôi phục phòng, đơn đặt và tài khoản mẫu của bản mô phỏng. Các thay đổi bạn đã thử tại đây sẽ được xóa.'}</p>
            <div className="dialog-actions">
              <button autoFocus className="btn btn-neutral" onClick={() => setOpen(false)}>{en ? 'Keep changes' : 'Giữ thay đổi'}</button>
              <button className="btn btn-danger" onClick={reset}>{en ? 'Reset data' : 'Đặt lại dữ liệu'}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
