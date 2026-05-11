import { useEffect, useRef, useState } from 'react';
import { MAX_AVATAR_SIZE, ALLOWED_AVATAR_TYPES } from '../utils/avatar';

const getInitial = (name) => {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1).toUpperCase();
};

export default function UserPanel({ user, onProfileUpdate, sectionId, t }) {
  const [status, setStatus] = useState('');
  const readerRef = useRef(null);

  useEffect(() => {
    return () => {
      readerRef.current?.abort();
    };
  }, []);

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
        onProfileUpdate({ avatar: reader.result });
        setStatus(t('avatarUpdated'));
      }
    };
    reader.onerror = () => {
      if (cancelled) return;
      setStatus(t('avatarFailed'));
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="panel" id={sectionId}>
      <header className="panel-header">
        <h2>{t('profileTitle')}</h2>
        <p>{t('profileDesc')}</p>
      </header>
      <div className="panel-body">
        {!user ? (
          <div className="empty-hint">{t('profileLoginHint')}</div>
        ) : (
          <>
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
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} />
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
                  onChange={(event) => onProfileUpdate({ displayName: event.target.value })}
                />
              </label>
              <label className="field">
                <span>{t('email')}</span>
                <input value={user.email} disabled />
              </label>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
