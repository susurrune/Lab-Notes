import { useEffect, useState } from 'react';

const emptyState = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: ''
};

export default function AuthModal({ isOpen, mode, notice, onClose, onSubmit, onModeChange, t }) {
  const [fields, setFields] = useState(emptyState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setFields(emptyState);
    setErrors({});
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = onSubmit({ ...fields, mode });
    if (result?.ok) {
      onClose();
      return;
    }
    setErrors(result?.errors || {});
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog">
        <header className="modal-header">
          <h2>{mode === 'signup' ? t('signupTitle') : t('loginTitle')}</h2>
          <p>{mode === 'signup' ? t('signupDesc') : t('loginDesc')}</p>
        </header>
        <form className="modal-body" onSubmit={handleSubmit}>
          {notice ? <div className="form-notice">{notice}</div> : null}
          {mode === 'signup' ? (
            <label className="field">
              <span>{t('displayName')}</span>
              <input
                type="text"
                value={fields.displayName}
                onChange={(event) => handleChange('displayName', event.target.value)}
                placeholder={t('displayName')}
                required
              />
              {errors.displayName ? <div className="form-error">{errors.displayName}</div> : null}
            </label>
          ) : null}
          <label className="field">
            <span>{t('email')}</span>
            <input
              type="email"
              value={fields.email}
              onChange={(event) => handleChange('email', event.target.value)}
              placeholder={t('email')}
              required
            />
            {errors.email ? <div className="form-error">{errors.email}</div> : null}
          </label>
          <label className="field">
            <span>{t('password')}</span>
            <input
              type="password"
              value={fields.password}
              onChange={(event) => handleChange('password', event.target.value)}
              placeholder={t('password')}
              required
            />
            {errors.password ? <div className="form-error">{errors.password}</div> : null}
          </label>
          {mode === 'signup' ? (
            <label className="field">
              <span>{t('confirmPassword')}</span>
              <input
                type="password"
                value={fields.confirmPassword}
                onChange={(event) => handleChange('confirmPassword', event.target.value)}
                placeholder={t('confirmPassword')}
                required
              />
              {errors.confirmPassword ? (
                <div className="form-error">{errors.confirmPassword}</div>
              ) : null}
            </label>
          ) : null}
          {errors.form ? <div className="form-error">{errors.form}</div> : null}
          <div className="modal-actions">
            <button className="btn ghost" type="button" onClick={onClose}>
              {t('cancel')}
            </button>
            <button className="btn primary" type="submit">
              {mode === 'signup' ? t('signup') : t('login')}
            </button>
          </div>
          <div className="auth-switch">
            {mode === 'signup' ? (
              <>
                <span>{t('authHaveAccount')}</span>
                <button
                  className="text-btn"
                  type="button"
                  onClick={() => onModeChange('login')}
                >
                  {t('login')}
                </button>
              </>
            ) : (
              <>
                <span>{t('authNoAccount')}</span>
                <button
                  className="text-btn"
                  type="button"
                  onClick={() => onModeChange('signup')}
                >
                  {t('signup')}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
