import { useState } from 'react';

const statusLabels = (t) => ({
  online: t('statusOnline'),
  offline: t('statusOffline')
});

export default function CollaborationPanel({ collaborators, permissions, onChange, t }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('online');

  const handlePermissionChange = (patch) => {
    onChange({ permissions: { ...permissions, ...patch } });
  };

  const handleAddMember = () => {
    const trimmedName = name.trim();
    const trimmedRole = role.trim();
    if (!trimmedName) return;
    const nextMember = {
      id: crypto.randomUUID(),
      name: trimmedName,
      role: trimmedRole || t('memberRole'),
      status
    };
    onChange({ collaborators: [...collaborators, nextMember] });
    setName('');
    setRole('');
    setStatus('online');
  };

  const handleRemove = (id) => {
    onChange({ collaborators: collaborators.filter((member) => member.id !== id) });
  };

  const labels = statusLabels(t);

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('collaboratorsTitle')}</h2>
        <p>{t('collaboratorsDesc')}</p>
      </header>
      <div className="panel-body">
        <div className="permissions-grid">
          <label className="field">
            <span>{t('visibility')}</span>
            <select
              value={permissions.visibility}
              onChange={(event) => handlePermissionChange({ visibility: event.target.value })}
            >
              <option value="private">{t('visibilityPrivate')}</option>
              <option value="team">{t('visibilityTeam')}</option>
              <option value="public">{t('visibilityPublic')}</option>
            </select>
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={permissions.allowEdit}
              onChange={(event) => handlePermissionChange({ allowEdit: event.target.checked })}
            />
            <span>{t('allowEdit')}</span>
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={permissions.allowShareLink}
              onChange={(event) => handlePermissionChange({ allowShareLink: event.target.checked })}
            />
            <span>{t('allowShare')}</span>
          </label>
        </div>

        <div className="collab-list">
          {collaborators.map((member) => (
            <div key={member.id} className="collab-card">
              <div>
                <div className="collab-name">{member.name}</div>
                <div className="collab-role">{member.role}</div>
              </div>
              <div className={`collab-status ${member.status}`}>
                {labels[member.status] || member.status}
              </div>
              <button
                className="btn ghost"
                type="button"
                onClick={() => handleRemove(member.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="collab-add">
          <label className="field">
            <span>{t('memberName')}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>{t('memberRole')}</span>
            <input value={role} onChange={(event) => setRole(event.target.value)} />
          </label>
          <label className="field">
            <span>{t('memberStatus')}</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="online">{t('statusOnline')}</option>
              <option value="offline">{t('statusOffline')}</option>
            </select>
          </label>
          <button className="btn primary" type="button" onClick={handleAddMember}>
            {t('addMember')}
          </button>
        </div>
      </div>
    </section>
  );
}
