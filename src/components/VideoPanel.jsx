import { useEffect, useState } from 'react';

export default function VideoPanel({ video, onChange, t }) {
  const [previewUrl, setPreviewUrl] = useState(video.url);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onChange({ url, name: file.name, description: video.description });
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{t('experimentVideo')}</h2>
        <p>{t('experimentVideoDesc')}</p>
      </header>
      <div className="panel-body">
        <label className="field">
          <span>{t('upload')}</span>
          <input type="file" accept="video/*" onChange={handleFile} />
        </label>
        <label className="field">
          <span>{t('description')}</span>
          <textarea
            rows="2"
            value={video.description}
            onChange={(event) => onChange({ ...video, description: event.target.value })}
            placeholder={t('description')}
          />
        </label>
        {previewUrl ? (
          <div className="video-preview">
            <video controls src={previewUrl} />
            <div className="video-name">{video.name}</div>
          </div>
        ) : (
          <div className="video-empty">{t('noVideo')}</div>
        )}
      </div>
    </section>
  );
}
