import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Plus, Award, Send as TelegramIcon, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { STATUS_GLASS } from '../lib/constants';
import { CategoryBadgeIcon, CategoryCardIcon } from '../components/CategoryIcon';

export default function MyAchievements() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const FILTERS = [
    { value: 'all',      label: t('home.all'), Icon: null },
    { value: 'pending',  label: t('achievements.status.pending'), Icon: Clock },
    { value: 'approved', label: t('achievements.status.approved'), Icon: CheckCircle },
    { value: 'rejected', label: t('achievements.status.rejected'), Icon: XCircle },
  ];

  const catLabels = {
    academic: t('achievements.category.academic'),
    sport: t('achievements.category.sport'),
    cultural: t('achievements.category.cultural'),
    social: t('achievements.category.social'),
    other: t('achievements.category.other'),
  };

  const statusLabels = {
    pending: t('achievements.status.pending'),
    approved: t('achievements.status.approved'),
    rejected: t('achievements.status.rejected'),
  };

  useEffect(() => {
    setLoading(true);
    const params = { user_id: user.id };
    if (filter !== 'all') params.status = filter;
    api.get('/achievements', { params })
      .then((res) => setAchievements(res.data.achievements))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, user.id]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-theme">{t('profile.myAchievements')}</h1>
          <p className="text-muted text-sm mt-0.5">{t('admin.total', { count: achievements.length })}</p>
        </div>
        <Link to="/add" className="btn-primary px-5 py-2 rounded-2xl text-sm flex items-center gap-1.5">
          <Plus size={15} /> {t('achievements.add')}
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium smooth flex items-center gap-1.5 ${
              filter === value ? 'btn-primary' : 'btn-glass'
            }`}
          >
            {Icon && <Icon size={13} />}
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted py-16">{t('common.loading')}</div>
      ) : achievements.length === 0 ? (
        <div className="glass-panel text-center py-14">
          <div
            className="w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(99,102,241,0.12)' }}
          >
            <Award size={24} className="text-accent" />
          </div>
          <p className="text-muted text-sm mb-4">{t('achievements.empty')}</p>
          <Link to="/add" className="text-accent font-medium hover:underline text-sm flex items-center gap-1.5 justify-center">
            <Plus size={14} /> {t('profile.addFirst')}
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {achievements.map((a) => {
            const sg = STATUS_GLASS[a.status] || {};
            return (
              <Link to={`/achievements/${a.id}`} key={a.id} className="block group">
                <article className="glass-card overflow-hidden h-full hover-lift">
                  {a.preview_image ? (
                    <img src={a.preview_image} alt={a.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40">
                      <CategoryCardIcon category={a.category} />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="badge flex items-center gap-1.5">
                        <CategoryBadgeIcon category={a.category} size={12} />
                        {catLabels[a.category] || a.category}
                      </span>
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: sg.background, border: `1px solid ${sg.border}`, color: sg.color }}
                      >
                        {statusLabels[a.status] || a.status}
                      </span>
                      {a.source === 'telegram' && (
                        <span className="badge flex items-center gap-1">
                          <TelegramIcon size={10} /> TG
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-theme text-sm leading-snug line-clamp-2 group-hover:text-accent smooth">
                      {a.title}
                    </h3>
                    {a.description && (
                      <p className="text-muted text-xs line-clamp-2 mt-1">{a.description}</p>
                    )}
                    {a.moderator_comment && a.status === 'rejected' && (
                      <p className="text-xs mt-2 italic flex items-start gap-1" style={{ color: 'var(--clr-danger)' }}>
                        <MessageCircle size={11} className="shrink-0 mt-0.5" />
                        {a.moderator_comment}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
