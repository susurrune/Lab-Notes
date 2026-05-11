import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      const title = t ? t('errorBoundaryTitle') : 'Something went wrong';
      const message = t
        ? t('errorBoundaryMessage')
        : 'An unexpected error occurred. Please try reloading the page.';
      const errorText = this.state.error?.message || '';

      return (
        <div className="empty-hint">
          <h2>{title}</h2>
          <p>{message}</p>
          {errorText && (
            <details style={{ marginBottom: 16, color: '#4c5b63' }}>
              <summary>Details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{errorText}</pre>
            </details>
          )}
          <button className="btn ghost" onClick={() => window.location.reload()}>
            {t ? t('reload') : 'Reload'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
