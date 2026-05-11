import { useEffect, useState } from 'react';

export default function VideoBlock({ video, onChange, t }) {
  const [previewUrl, setPreviewUrl] = useState(video?.url);

  if (!video) {
    return (
      <div className="block-content">
        <div className="empty-hint">{t('videoMissing')}</div>
      </div>
    );
  }

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (video.url?.startsWith('blob:')) {
      URL.revokeObjectURL(video.url);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onChange({ url, name: file.name, description: video.description });
  };

  return (
    <div className="block-content">
      <div className="block-header-row">
        <div>
          <div className="block-title">{t('experimentVideo')}</div>
          <div className="block-subtitle">{t('experimentVideoDesc')}</div>
        </div>
      </div>
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
  );
}
