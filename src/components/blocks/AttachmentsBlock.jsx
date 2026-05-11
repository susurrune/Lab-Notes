import { useState } from 'react';

const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024;

export default function AttachmentsBlock({ files, onChange, t }) {
  const [status, setStatus] = useState('');

  const handleFiles = (event) => {
    const incoming = Array.from(event.target.files || []);
    if (!incoming.length) return;

    const nextFiles = [...(files || [])];
    const pendingImages = [];
    let hadError = false;

    incoming.forEach((file) => {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setStatus(t('fileTooLarge'));
        hadError = true;
        return;
      }

      const entry = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        preview: ''
      };

      if (file.type?.startsWith('image/')) {
        pendingImages.push({ file, entry });
        return;
      }
      nextFiles.push(entry);
    });

    if (!pendingImages.length) {
      onChange(nextFiles);
    } else {
      let loaded = 0;
      pendingImages.forEach(({ file, entry }) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            entry.preview = reader.result;
            nextFiles.push(entry);
          }
          loaded++;
          if (loaded === pendingImages.length) {
            onChange([...nextFiles]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (!hadError) {
      setStatus('');
    }
    event.target.value = '';
  };

  const handleRemove = (id) => {
    onChange((files || []).filter((item) => item.id !== id));
  };

  return (
    <div className="block-content">
      <label className="field">
        <span>{t('attachmentsUpload')}</span>
        <input type="file" multiple onChange={handleFiles} />
      </label>
      {status ? <div className="form-note">{status}</div> : null}
      <div className="attachments-grid">
        {(files || []).length === 0 ? (
          <div className="empty-hint">{t('noAttachments')}</div>
        ) : (
          files.map((file) => (
            <div key={file.id} className="attachment-card">
              {file.preview ? (
                <img src={file.preview} alt={file.name} />
              ) : (
                <div className="attachment-placeholder">{t('file')}</div>
              )}
              <div className="attachment-meta">
                <div className="attachment-name">{file.name}</div>
                <div className="attachment-size">{Math.round(file.size / 1024)} KB</div>
              </div>
              <button
                className="icon-btn ghost"
                type="button"
                onClick={() => handleRemove(file.id)}
                aria-label={t('removeAttachment')}
              >
                x
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
