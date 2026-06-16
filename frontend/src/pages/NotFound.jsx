import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-5">
      <div className="glass-card p-12 text-center max-w-sm w-full">
        <div
          className="text-7xl font-bold mb-2"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          404
        </div>
        <h1 className="text-xl font-bold text-theme mb-2">{t('notFound.title')}</h1>
        <p className="text-muted text-sm mb-7">{t('notFound.desc')}</p>
        <Link to="/" className="btn-primary px-6 py-2.5 rounded-2xl text-sm">
          {t('notFound.back')}
        </Link>
      </div>
    </div>
  );
}
