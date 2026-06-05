import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Search, FileText, Check, X, Send as TelegramIcon } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_GLASS } from '../lib/constants';
import { CategoryBadgeIcon } from '../components/CategoryIcon';

function StatusBadge({ status }) {
  const s = STATUS_GLASS[status] || {};
  return (
    <span
      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
      style={{ background: s.background, border: `1px solid ${s.border}`, color: s.color }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function AchievementDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showAlert, showConfirm, showPrompt } = useModal();
  const navigate = useNavigate();

  const [achievement, setAchievement] = useState(null);
  const [comments, setComments] = useState([]);
  const [likeInfo, setLikeInfo] = useState({ count: 0, liked: false });
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [moderating, setModerating] = useState(false);

  const load = async () => {
    try {
      const [a, c, l] = await Promise.all([
        api.get(`/achievements/${id}`),
        api.get(`/comments/${id}`),
        api.get(`/likes/${id}`),
      ]);
      setAchievement(a.data);
      setComments(c.data.comments);
      setLikeInfo(l.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const toggleLike = async () => {
    if (!user) return navigate('/login');
    try {
      const { data } = await api.post(`/likes/${id}`);
      setLikeInfo(data);
    } catch { /* тыныш */ }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/comments', {
        achievement_id: parseInt(id),
        content: newComment.trim(),
      });
      setComments([data.comment, ...comments]);
      setNewComment('');
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате орын алды');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId) => {
    const ok = await showConfirm('Пікірді жоюды растайсыз ба?', { danger: true });
    if (!ok) return;
    try {
      await api.delete(`/comments/${commentId}`);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате орын алды');
    }
  };

  const moderate = async (status) => {
    let comment = null;
    if (status === 'rejected') {
      comment = await showPrompt('Бас тарту себебін жазыңыз (міндетті емес):', {
        placeholder: 'Себебі...',
      });
      if (comment === null) return;
    }
    setModerating(true);
    try {
      await api.patch(`/achievements/${id}/moderate`, { status, moderator_comment: comment });
      await load();
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате орын алды');
    } finally {
      setModerating(false);
    }
  };

  const deleteAchievement = async () => {
    const ok = await showConfirm('Жетістікті жоюды растайсыз ба? Бұл әрекетті болдырмауға болмайды.', { danger: true });
    if (!ok) return;
    try {
      await api.delete(`/achievements/${id}`);
      navigate('/');
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате орын алды');
    }
  };

  if (loading) {
    return <div className="text-center text-muted py-20">Жүктелуде...</div>;
  }
  if (!achievement) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(99,102,241,0.12)' }}
        >
          <Search size={28} className="text-accent" />
        </div>
        <h1 className="text-xl font-bold text-theme mb-3">Жетістік табылмады</h1>
        <Link to="/" className="text-accent hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Басты бетке
        </Link>
      </div>
    );
  }

  const isOwner = user && user.id === achievement.user_id;
  const canModerate = user && ['curator', 'admin'].includes(user.role);
  const canDelete = isOwner || (user?.role === 'admin');
  const images = achievement.files?.filter((f) => f.file_type === 'image') || [];
  const videos = achievement.files?.filter((f) => f.file_type === 'video') || [];
  const docs   = achievement.files?.filter((f) => f.file_type === 'document') || [];

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <Link to="/" className="text-muted hover:text-theme text-sm inline-flex items-center gap-1.5 mb-6 smooth">
        <ArrowLeft size={14} /> Жаңалықтарға оралу
      </Link>

      <article className="glass-card overflow-hidden">
        {/* Тақырып */}
        <div className="p-7 pb-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="badge flex items-center gap-1.5">
              <CategoryBadgeIcon category={achievement.category} size={13} />
              {CATEGORY_LABELS[achievement.category] || achievement.category}
            </span>
            <StatusBadge status={achievement.status} />
            {achievement.source === 'telegram' && (
              <span className="badge flex items-center gap-1">
                <TelegramIcon size={11} /> Telegram
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-theme leading-tight mb-3">
            {achievement.title}
          </h1>
          <div className="text-sm text-muted flex flex-wrap gap-x-2">
            <span className="font-medium text-sub">{achievement.author_name}</span>
            {achievement.author_group && <span>· {achievement.author_group}</span>}
            {achievement.event_date && (
              <span>· {new Date(achievement.event_date).toLocaleDateString('kk-KZ')}</span>
            )}
          </div>
        </div>

        {/* Сипаттама */}
        {achievement.description && (
          <div className="px-7 py-5 border-t border-white/10">
            <p className="text-theme whitespace-pre-wrap leading-relaxed">{achievement.description}</p>
          </div>
        )}

        {/* Суреттер */}
        {images.length > 0 && (
          <div className="px-7 py-5 border-t border-white/10">
            <h3 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wider">Фотолар</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((f) => (
                <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={f.file_url}
                    alt=""
                    className="w-full h-44 object-cover rounded-2xl hover-lift"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Видео */}
        {videos.length > 0 && (
          <div className="px-7 py-5 border-t border-white/10">
            <h3 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wider">Видео</h3>
            <div className="space-y-3">
              {videos.map((f) => (
                <video key={f.id} src={f.file_url} controls className="w-full rounded-2xl" />
              ))}
            </div>
          </div>
        )}

        {/* Құжаттар */}
        {docs.length > 0 && (
          <div className="px-7 py-5 border-t border-white/10">
            <h3 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wider">Құжаттар</h3>
            <div className="space-y-2">
              {docs.map((f) => (
                <a
                  key={f.id}
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 glass-panel px-4 py-3 hover-lift"
                  style={{ borderRadius: 14 }}
                >
                  <FileText size={20} className="text-accent shrink-0" />
                  <span className="text-sm text-theme flex-1 truncate">
                    {f.file_name || f.file_url.split('/').pop()}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Лайк + удалить */}
        <div className="px-7 py-5 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={toggleLike}
            className={`btn-glass flex items-center gap-2 px-4 py-2 spring ${likeInfo.liked ? 'scale-95' : ''}`}
            style={likeInfo.liked ? { color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' } : {}}
          >
            <Heart size={17} fill={likeInfo.liked ? '#ef4444' : 'none'} />
            <span className="font-semibold text-sm">{likeInfo.count}</span>
          </button>
          {canDelete && (
            <button
              onClick={deleteAchievement}
              className="text-xs px-3 py-1.5 rounded-xl smooth"
              style={{ color: 'var(--clr-danger)' }}
            >
              Жою
            </button>
          )}
        </div>

        {/* Модерация панелі */}
        {achievement.status === 'pending' && canModerate && (
          <div className="px-7 py-5 border-t border-white/10" style={{ background: 'var(--warn-bg)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--warn-text)' }}>
              Растау керек
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--warn-text)', opacity: 0.8 }}>
              Бұл жетістік растауды күтеді.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => moderate('approved')}
                disabled={moderating}
                className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-1.5"
                style={{ background: '#059669', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}
              >
                <Check size={14} /> Бекіту
              </button>
              <button
                onClick={() => moderate('rejected')}
                disabled={moderating}
                className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-1.5"
                style={{ background: '#dc2626', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}
              >
                <X size={14} /> Бас тарту
              </button>
            </div>
          </div>
        )}

        {/* Бас тарту себебі */}
        {achievement.status === 'rejected' && achievement.moderator_comment && (
          <div className="px-7 py-4 border-t border-white/10 alert-error mx-7 my-4" style={{ borderRadius: 14 }}>
            <strong>Бас тарту себебі:</strong> {achievement.moderator_comment}
          </div>
        )}

        {/* Пікірлер */}
        <div className="px-7 py-6 border-t border-white/10">
          <h3 className="text-base font-semibold text-theme mb-4">
            Пікірлер ({comments.length})
          </h3>

          {user ? (
            <form onSubmit={submitComment} className="mb-6 space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                placeholder="Пікіріңізді жазыңыз..."
                className="glass-input"
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="btn-primary px-5 py-2 rounded-xl text-sm"
              >
                {submitting ? 'Жіберілуде...' : 'Жариялау'}
              </button>
            </form>
          ) : (
            <div className="glass-panel px-5 py-4 text-sm text-muted text-center mb-5">
              Пікір қалдыру үшін{' '}
              <Link to="/login" className="text-accent font-medium hover:underline">кіріңіз</Link>
            </div>
          )}

          {comments.length === 0 ? (
            <p className="text-center text-muted text-sm py-6">Әзірше пікір жоқ</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}
                  >
                    {c.author_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0 glass-panel p-3" style={{ borderRadius: 14 }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-theme">{c.author_name}</span>
                      {c.author_role !== 'student' && (
                        <span className="badge text-[10px]">
                          {c.author_role === 'curator' ? 'Куратор' : 'Admin'}
                        </span>
                      )}
                      <span className="text-xs text-muted ml-auto">
                        {new Date(c.created_at).toLocaleString('kk-KZ')}
                      </span>
                      {user && (user.id === c.user_id || user.role === 'admin') && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="smooth hover:opacity-70"
                          style={{ color: 'var(--clr-danger)' }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-theme whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
