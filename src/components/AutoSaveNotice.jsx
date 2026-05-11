export default function AutoSaveNotice({ lastSavedAt, autoSaveEnabled, t }) {
  return (
    <div className="auto-save">
      {autoSaveEnabled
        ? `${t('autoSaved')} ${lastSavedAt ? lastSavedAt : t('pending')}`
        : t('autoSaveOff')}
    </div>
  );
}
