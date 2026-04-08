import React, { useState } from 'react';
import { authService, ownerRegistrationRequestService, userService } from '../api/services';
import { translateApiMessage, useLanguage } from '../contexts/LanguageContext';

const Profile = () => {
  const { t } = useLanguage();
  const currentUser = authService.getCurrentUser();
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone || '',
    address: currentUser.address || '',
    password: '',
    password_confirmation: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ownerRequest, setOwnerRequest] = useState(null);
  const [ownerRequestFormOpen, setOwnerRequestFormOpen] = useState(false);
  const [ownerRequestLoading, setOwnerRequestLoading] = useState(false);
  const [ownerRequestForm, setOwnerRequestForm] = useState({
    business_name: '',
    id_number: '',
    experience_years: '',
    current_properties: '',
    message: '',
  });

  React.useEffect(() => {
    const loadMyRequest = async () => {
      if (!authService.isAuthenticated()) {
        return;
      }

      try {
        const latest = await ownerRegistrationRequestService.getMyLatest();
        setOwnerRequest(latest || null);
      } catch (requestError) {
        console.error('Cannot fetch owner registration request:', requestError);
      }
    };

    loadMyRequest();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (formData.password && formData.password !== formData.password_confirmation) {
      setError(t('auth.mismatchPassword'));
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      };

      if (formData.password) {
        updateData.password = formData.password;
        updateData.password_confirmation = formData.password_confirmation;
      }

      const updatedUser = await userService.updateUser(currentUser.id, updateData);
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setMessage(t('profile.updateSuccess'));
      setFormData({
        ...formData,
        password: '',
        password_confirmation: '',
      });
    } catch (err) {
      setError(t('profile.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerRequestFormChange = (e) => {
    setOwnerRequestForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleOwnerRequestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setOwnerRequestLoading(true);

    try {
      const payload = {
        business_name: ownerRequestForm.business_name || null,
        id_number: ownerRequestForm.id_number,
        experience_years: ownerRequestForm.experience_years ? Number(ownerRequestForm.experience_years) : null,
        current_properties: ownerRequestForm.current_properties ? Number(ownerRequestForm.current_properties) : null,
        message: ownerRequestForm.message || null,
      };

      const response = await ownerRegistrationRequestService.create(payload);
      setMessage(translateApiMessage(t, response.message, 'profile.requestSent'));
      setOwnerRequest(response.request || null);
      setOwnerRequestFormOpen(false);
      setOwnerRequestForm({
        business_name: '',
        id_number: '',
        experience_years: '',
        current_properties: '',
        message: '',
      });
    } catch (submitError) {
      setError(translateApiMessage(t, submitError?.response?.data?.message, 'profile.requestFailed'));
    } finally {
      setOwnerRequestLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">{t('profile.title')}</h2>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} autoComplete="off">
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
          <label className="form-label">{t('profile.role')}</label>
          <input
            type="text"
            className="form-input"
            value={currentUser.role === 'admin' ? t('roles.admin') : currentUser.role === 'saler' ? t('roles.saler') : t('roles.user')}
            disabled
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
          <label className="form-label">{t('profile.address')}</label>
          <input
            type="text"
            name="address"
            className="form-input"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        {currentUser.role === 'user' && (
          <>
            <hr className="profile-divider" />
            <h3 className="section-title section-title-compact">{t('profile.ownerRegisterTitle')}</h3>

            {ownerRequest?.status === 'pending' ? (
              <div className="profile-note">{t('profile.ownerPending')}</div>
            ) : (
              <>
                <button
                  type="button"
                  className="form-button secondary"
                  onClick={() => setOwnerRequestFormOpen((prev) => !prev)}
                  style={{ marginBottom: '1rem' }}
                >
                  {ownerRequestFormOpen ? t('profile.ownerRegisterClose') : t('profile.ownerRegisterButton')}
                </button>

                {ownerRequestFormOpen && (
                  <div className="panel" style={{ marginBottom: '1rem', padding: '1rem' }}>
                    <div className="profile-note" style={{ marginBottom: '1rem' }}>
                      {t('profile.ownerHint')}
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t('profile.companyName')}</label>
                      <input
                        type="text"
                        name="business_name"
                        className="form-input"
                        value={ownerRequestForm.business_name}
                        onChange={handleOwnerRequestFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t('profile.idNumber')}</label>
                      <input
                        type="text"
                        name="id_number"
                        className="form-input"
                        value={ownerRequestForm.id_number}
                        onChange={handleOwnerRequestFormChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t('profile.expYears')}</label>
                      <input
                        type="number"
                        name="experience_years"
                        className="form-input"
                        min="0"
                        value={ownerRequestForm.experience_years}
                        onChange={handleOwnerRequestFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t('profile.propertyCount')}</label>
                      <input
                        type="number"
                        name="current_properties"
                        className="form-input"
                        min="0"
                        value={ownerRequestForm.current_properties}
                        onChange={handleOwnerRequestFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t('profile.extraInfo')}</label>
                      <textarea
                        name="message"
                        className="form-textarea"
                        value={ownerRequestForm.message}
                        onChange={handleOwnerRequestFormChange}
                        placeholder={t('profile.extraInfoPlaceholder')}
                      />
                    </div>

                    <button
                      type="button"
                      className="form-button"
                      onClick={handleOwnerRequestSubmit}
                      disabled={ownerRequestLoading || !ownerRequestForm.id_number.trim()}
                    >
                      {ownerRequestLoading ? t('profile.submittingRequest') : t('profile.submitRequest')}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <hr className="profile-divider" />

        <h3 className="section-title section-title-compact">{t('profile.changePassword')}</h3>
        <p className="profile-note">
          {t('profile.leaveEmpty')}
        </p>

        <div className="form-group">
          <label className="form-label">{t('profile.newPassword')}</label>
          <input
            type="password"
            name="password"
            className="form-input"
            value={formData.password}
            onChange={handleChange}
            minLength="8"
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('profile.confirmNewPassword')}</label>
          <input
            type="password"
            name="password_confirmation"
            className="form-input"
            value={formData.password_confirmation}
            onChange={handleChange}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="form-button" disabled={loading}>
          {loading ? t('profile.updating') : t('profile.updateProfile')}
        </button>
      </form>
    </div>
  );
};

export default Profile;
