import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService, ownerRegistrationRequestService } from '../api/services';
import { useLanguage } from '../contexts/LanguageContext';

const EyeIcon = ({ hidden }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M2 12C3.8 7.8 7.5 5 12 5C16.5 5 20.2 7.8 22 12C20.2 16.2 16.5 19 12 19C7.5 19 3.8 16.2 2 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    {hidden ? <path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> : null}
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(formData.email, formData.password);

      const currentUser = authService.getCurrentUser();
      if (currentUser?.role === 'user' || currentUser?.role === 'saler') {
        try {
          const latestRequest = await ownerRegistrationRequestService.getMyLatest();
          if (latestRequest?.status === 'rejected' && !latestRequest?.rejected_notice_seen_at) {
            localStorage.setItem('ownerRejectedNoticeToShow', JSON.stringify({
              type: 'rejected',
              requestId: latestRequest.id,
              adminNote: latestRequest.admin_note || '',
            }));
          } else if (latestRequest?.status === 'approved' && !latestRequest?.approved_notice_seen_at) {
            localStorage.setItem('ownerRejectedNoticeToShow', JSON.stringify({
              type: 'approved',
              requestId: latestRequest.id,
              adminNote: latestRequest.admin_note || '',
            }));
          }
        } catch (requestError) {
          console.error('Cannot fetch latest owner registration request:', requestError);
        }
      }

      navigate('/rooms', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">{t('auth.loginTitle')}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">{t('auth.email')}</label>
          <input
            type="email"
            name="email"
            className="form-input"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('auth.password')}</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              aria-label={showPassword ? t('common.close') : t('common.confirm')}
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                padding: 0,
                margin: 0,
                color: '#5a6f8f',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <EyeIcon hidden={!showPassword} />
            </button>
          </div>
        </div>

        <button type="submit" className="form-button" disabled={loading}>
          {loading ? t('auth.loggingIn') : t('auth.loginButton')}
        </button>
      </form>

      <div className="form-link">
        {t('auth.noAccount')} <Link to="/register">{t('auth.registerNow')}</Link>
      </div>
    </div>
  );
};

export default Login;
