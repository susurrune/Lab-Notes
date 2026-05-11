import { useRef } from 'react';

const getInitial = (name) => {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1).toUpperCase();
};

export default function Header({
  t,
  user,
  onLogin,
  onSignup,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  onOpenExtensions
}) {
  const menuRef = useRef(null);

  const closeMenu = () => {
    if (menuRef.current) {
      menuRef.current.removeAttribute('open');
    }
  };

  return (
    <header className="top-bar">
      <a className="brand-link" href="#top">
        <img className="brand-logo" src="/logo.svg" alt="Lab Notes logo" />
        <span className="brand-title">{t('headerTitle')}</span>
      </a>
      <div className="top-actions">
        <button className="btn ghost" type="button" onClick={onOpenExtensions}>
          {t('extensions')}
        </button>
        {user ? (
          <details className="action-menu user-menu" ref={menuRef}>
            <summary className="user-entry">
              <div className="user-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.displayName} className="avatar-img" />
                ) : (
                  <span className="avatar-fallback">{getInitial(user.displayName)}</span>
                )}
              </div>
              <span className="user-name">{user.displayName}</span>
            </summary>
            <div className="action-popover">
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  closeMenu();
                  onOpenProfile?.();
                }}
              >
                {t('profile')}
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  closeMenu();
                  onOpenSettings?.();
                }}
              >
                {t('settings')}
              </button>
              <button
                className="menu-item danger"
                type="button"
                onClick={() => {
                  closeMenu();
                  onLogout?.();
                }}
              >
                {t('logout')}
              </button>
            </div>
          </details>
        ) : (
          <div className="auth-actions">
            <button className="btn ghost" type="button" onClick={() => onLogin?.()}>
              {t('login')}
            </button>
            <button className="btn primary" type="button" onClick={() => onSignup?.()}>
              {t('signup')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
