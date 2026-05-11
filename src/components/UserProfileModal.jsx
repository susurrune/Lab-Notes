import { useEffect, useRef, useState } from 'react';
import { MAX_AVATAR_SIZE, ALLOWED_AVATAR_TYPES } from '../utils/avatar';

const getInitial = (name) => {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1).toUpperCase();
};

export default function UserProfileModal({
  isOpen,
  user,
  onClose,
  onUpdate,
  onOpenSettings,
  onLogout,
  t
}) {
  const [status, setStatus] = useState('');
  const readerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatus('');
    return () => {
      readerRef.current?.abort();
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setStatus(t('avatarTypeError'));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setStatus(t('avatarTooLarge'));
      return;
    }

    let cancelled = false;
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onabort = () => { cancelled = true; };
    reader.onload = () => {
      if (cancelled) return;
      if (typeof reader.result === 'string') {
        onUpdate({ avatar: reader.result });
        setStatus(t('avatarUpdated'));
      }
    };
    reader.onerror = () => {
      if (cancelled) return;
      setStatus(t('avatarFailed'));
    };
    reader.readAsDataURL(file);
  };

  const handleSettings = () => {
    onOpenSettings?.();
    onClose();
  };

  const handleLogout = () => {
    onLogout?.();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card profile-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{t('profileTitle')}</h2>
          <p>{t('profileDesc')}</p>
        </header>
        <div className="modal-body">
          <div className="profile-card">
            <div className="profile-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.displayName} className="avatar-img" />
              ) : (
                <span className="avatar-fallback">{getInitial(user.displayName)}</span>
              )}
            </div>
            <div className="profile-meta">
              <div className="profile-name">{user.displayName}</div>
              <div className="profile-email">{user.email}</div>
              <label className="field">
                <span>{t('avatarLabel')}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                />
              </label>
              <div className="status">{t('avatarHint')}</div>
              {status ? <div className="form-note">{status}</div> : null}
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>{t('displayName')}</span>
              <input
                value={user.displayName}
                onChange={(event) => onUpdate({ displayName: event.target.value })}
              />
            </label>
            <label className="field">
              <span>{t('email')}</span>
              <input value={user.email} disabled />
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" type="button" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn ghost" type="button" onClick={handleSettings}>
            {t('settings')}
          </button>
          <button className="btn danger" type="button" onClick={handleLogout}>
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
