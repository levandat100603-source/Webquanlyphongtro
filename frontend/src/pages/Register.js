import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../api/services';
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

const getApiErrorMessage = (error, fallbackMessage) => {
  const response = error?.response?.data;

  if (response?.message && response.message !== 'The given data was invalid.') {
    return response.message;
  }

  const validationErrors = response?.errors ? Object.values(response.errors).flat() : [];
  if (validationErrors.length > 0) {
    return validationErrors[0];
  }

  return fallbackMessage;
};

const Register = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
  });
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState('register');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.password !== formData.password_confirmation) {
      setError(t('auth.mismatchPassword'));
      return;
    }

    setLoading(true);

    try {
      const response = await authService.register(formData);
      setVerificationEmail(response.email || formData.email);
      setStep('verify');
      setVerificationCode('');
      setSuccessMessage(response.message || t('auth.sendingCode'));
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.registerFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await authService.verifyRegistration({
        email: verificationEmail,
        code: verificationCode,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.verifyFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccessMessage('');
    setResendLoading(true);

    try {
      const response = await authService.resendRegistrationCode({ email: verificationEmail });
      setSuccessMessage(response.message || t('auth.resendCode'));
      setVerificationCode('');
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.resendFailed')));
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep('register');
    setError('');
    setSuccessMessage('');
    setVerificationCode('');
  };

  return (
    <div className="form-container">
      <h2 className="form-title">{t('auth.registerTitle')}</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {step === 'register' ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.fullName')}</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

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
            <label className="form-label">{t('auth.phone')}</label>
            <input
              type="tel"
              name="phone"
              className="form-input"
              value={formData.phone}
              onChange={handleChange}
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
                minLength="8"
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

          <div className="form-group">
            <label className="form-label">{t('auth.confirmPassword')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswordConfirmation ? 'text' : 'password'}
                name="password_confirmation"
                className="form-input"
                value={formData.password_confirmation}
                onChange={handleChange}
                required
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                aria-label={showPasswordConfirmation ? t('common.close') : t('common.confirm')}
                onClick={() => setShowPasswordConfirmation((prev) => !prev)}
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
                <EyeIcon hidden={!showPasswordConfirmation} />
              </button>
            </div>
          </div>

          <button type="submit" className="form-button" disabled={loading}>
            {loading ? t('auth.sendingCode') : t('auth.registerButton')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label">{t('auth.verifyEmail')}</label>
            <input
              type="email"
              className="form-input"
              value={verificationEmail}
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.verifyCodeLabel')}</label>
            <input
              type="text"
              className="form-input"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength="6"
              placeholder={t('auth.verifyCodePlaceholder')}
              required
            />
          </div>

          <button type="submit" className="form-button" disabled={loading || verificationCode.length !== 6}>
            {loading ? t('auth.verifying') : t('auth.verifyAndCreate')}
          </button>

          <button
            type="button"
            className="form-button secondary"
            onClick={handleResendCode}
            disabled={resendLoading}
            style={{ marginTop: '12px' }}
          >
            {resendLoading ? t('auth.resendingCode') : t('auth.resendCode')}
          </button>

          <button
            type="button"
            className="form-button secondary"
            onClick={handleBackToForm}
            style={{ marginTop: '12px' }}
          >
            {t('auth.backToEdit')}
          </button>
        </form>
      )}

      <div className="form-link">
        {t('auth.haveAccount')} <Link to="/login">{t('auth.loginNow')}</Link>
      </div>
    </div>
  );
};

export default Register;
