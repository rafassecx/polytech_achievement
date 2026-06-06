import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ArrowRight, PartyPopper, Send as TelegramIcon, Users, Clock, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { CATEGORY_LABELS } from '../lib/constants';
import { CategoryBadgeIcon, CategoryCardIcon } from '../components/CategoryIcon';
import { useModal } from '../contexts/ModalContext';

function TabBtn({ active, onClick, children, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-medium rounded-xl smooth relative ${
        active ? 'text-white' : 'text-muted hover:text-theme'
      }`}
      style={active ? { background: 'var(--clr-accent)' } : {}}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function Moderation() {
  const { showAlert, showPrompt } = useModal();
  const [tab, setTab] = useState('achievements');

  // Жетістіктер tab
  const [achievements, setAchievements] = useState([]);
  const [achLoading, setAchLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState('');
  const [moderatingId, setModeratingId] = useState(null);

  // Топ сұраулары tab
  const [groupRequests, setGroupRequests] = useState([]);
  const [grLoading, setGrLoading] = useState(false);
  const [grProcessing, setGrProcessing] = useState(null);

  const loadAchievements = async () => {
    setAchLoading(true);
    try {
      const { data } = await api.get('/achievements', { params: { status: 'pending', limit: 200 } });
      setAchievements(data.achievements);
    } catch (err) {
      console.error(err);
    } finally {
      setAchLoading(false);
    }
  };

  const loadGroupRequests = async () => {
    setGrLoading(true);
    try {
      const { data } = await api.get('/users/group-requests');
      setGroupRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setGrLoading(false);
    }
  };

  useEffect(() => { loadAchievements(); }, []);
  useEffect(() => { if (tab === 'groups') loadGroupRequests(); }, [tab]);

  const moderate = async (id, status) => {
    let comment = null;
    if (status === 'rejected') {
      comment = await showPrompt('Бас тарту себебін жазыңыз (міндетті емес):', {
        placeholder: 'Себебі...',
      });
      if (comment === null) return;
    }
    setModeratingId(id);
    try {
      await api.patch(`/achievements/${id}/moderate`, { status, moderator_comment: comment });
      setAchievements(achievements.filter((a) => a.id !== id));
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате орын алды');
    } finally {
      setModeratingId(null);
    }
  };

  const handleGroupRequest = async (reqId, action) => {
    let comment = null;
    if (action === 'reject') {
      comment = await showPrompt('Бас тарту себебін жазыңыз (міндетті емес):', {
        placeholder: 'Себебі...',
      });
      if (comment === null) return;
    }
    setGrProcessing(reqId);
    try {
      await api.patch(`/users/group-requests/${reqId}/${action}`, { comment });
      setGroupRequests(groupRequests.filter((r) => r.id !== reqId));
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате орын алды');
    } finally {
      setGrProcessing(null);
    }
  };

  const groups = [...new Set(achievements.map((a) => a.author_group).filter(Boolean))].sort();
  const filtered = groupFilter ? achievements.filter((a) => a.author_group === groupFilter) : achievements;

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-theme">Модерация</h1>
        <p className="text-muted text-sm mt-0.5">Модераторлық панель</p>
      </div>

      {/* Вкладки */}
      <div className="glass-panel p-1.5 grid grid-cols-2 gap-1 mb-6" style={{ borderRadius: 18 }}>
        <TabBtn active={tab === 'achievements'} onClick={() => setTab('achievements')} badge={achievements.length}>
          Жетістіктер
        </TabBtn>
        <TabBtn active={tab === 'groups'} onClick={() => setTab('groups')} badge={groupRequests.length}>
          Топ сұраулары
        </TabBtn>
      </div>

      {/* ── Жетістіктер ── */}
      {tab === 'achievements' && (
        <>
          <p className="text-muted text-sm mb-4">Растауды күтетін жетістіктер: {filtered.length}</p>

          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setGroupFilter('')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium smooth ${groupFilter === '' ? 'btn-primary' : 'btn-glass'}`}
              >
                Барлық топтар
              </button>
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium smooth ${groupFilter === g ? 'btn-primary' : 'btn-glass'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {achLoading ? (
            <div className="text-center text-muted py-16">Жүктелуде...</div>
          ) : filtered.length === 0 ? (
            <div className="glass-card text-center py-16">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(5,150,105,0.12)' }}>
                <PartyPopper size={28} style={{ color: '#059669' }} />
              </div>
              <h2 className="text-xl font-bold text-theme mb-2">Барлығы өңделді!</h2>
              <p className="text-muted text-sm">Растауды күтетін жетістіктер жоқ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((a) => (
                <div key={a.id} className="glass-card overflow-hidden flex flex-col md:flex-row">
                  <div className="md:w-44 shrink-0">
                    {a.preview_image ? (
                      <img src={a.preview_image} alt="" className="w-full h-44 md:h-full object-cover" />
                    ) : (
                      <div className="w-full h-44 md:h-full">
                        <CategoryCardIcon category={a.category} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-5 flex flex-col">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="badge flex items-center gap-1.5">
                        <CategoryBadgeIcon category={a.category} size={12} />
                        {CATEGORY_LABELS[a.category] || a.category}
                      </span>
                      {a.source === 'telegram' && (
                        <span className="badge flex items-center gap-1">
                          <TelegramIcon size={11} /> Telegram
                        </span>
                      )}
                      <span className="text-xs text-muted ml-auto">
                        {new Date(a.created_at).toLocaleString('kk-KZ')}
                      </span>
                    </div>
                    <Link to={`/achievements/${a.id}`} className="group mb-1">
                      <h3 className="font-semibold text-theme leading-snug group-hover:text-accent smooth">
                        {a.title}
                      </h3>
                    </Link>
                    <div className="text-sm text-muted mb-1">
                      <span className="font-medium text-sub">{a.author_name}</span>
                      {a.author_group && <span> · {a.author_group}</span>}
                      {a.event_date && (
                        <span> · {new Date(a.event_date).toLocaleDateString('kk-KZ')}</span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-sm text-muted line-clamp-2 mb-3">{a.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-auto flex-wrap">
                      <button
                        onClick={() => moderate(a.id, 'approved')}
                        disabled={moderatingId === a.id}
                        className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-1.5"
                        style={{ background: '#059669', boxShadow: '0 4px 14px rgba(5,150,105,0.28)' }}
                      >
                        <Check size={14} /> Бекіту
                      </button>
                      <button
                        onClick={() => moderate(a.id, 'rejected')}
                        disabled={moderatingId === a.id}
                        className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-1.5"
                        style={{ background: '#dc2626', boxShadow: '0 4px 14px rgba(220,38,38,0.28)' }}
                      >
                        <X size={14} /> Бас тарту
                      </button>
                      <Link
                        to={`/achievements/${a.id}`}
                        className="text-sm text-accent hover:underline ml-auto flex items-center gap-1"
                      >
                        Толық қарау <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Топ сұраулары ── */}
      {tab === 'groups' && (
        <>
          <p className="text-muted text-sm mb-4">Студенттердің топты ауыстыру сұраулары: {groupRequests.length}</p>

          {grLoading ? (
            <div className="text-center text-muted py-16">Жүктелуде...</div>
          ) : groupRequests.length === 0 ? (
            <div className="glass-card text-center py-16">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(99,102,241,0.10)' }}>
                <CheckCircle2 size={28} className="text-accent" />
              </div>
              <h2 className="text-xl font-bold text-theme mb-2">Сұраулар жоқ</h2>
              <p className="text-muted text-sm">Барлық топ ауыстыру сұраулары өңделген</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupRequests.map((r) => (
                <div key={r.id} className="glass-card p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>
                      {r.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Link to={`/users/${r.user_id}`} className="font-semibold text-theme hover:text-accent smooth text-sm">
                          {r.full_name}
                        </Link>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Clock size={11} /> {new Date(r.created_at).toLocaleString('kk-KZ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="badge">{r.current_group || 'топсыз'}</span>
                        <ArrowRight size={13} className="text-muted shrink-0" />
                        <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.35)', color: 'var(--clr-accent)' }}>
                          {r.requested_group}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <button
                      onClick={() => handleGroupRequest(r.id, 'approve')}
                      disabled={grProcessing === r.id}
                      className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-1.5"
                      style={{ background: '#059669', boxShadow: '0 4px 14px rgba(5,150,105,0.28)' }}
                    >
                      <Check size={14} /> Бекіту
                    </button>
                    <button
                      onClick={() => handleGroupRequest(r.id, 'reject')}
                      disabled={grProcessing === r.id}
                      className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-1.5"
                      style={{ background: '#dc2626', boxShadow: '0 4px 14px rgba(220,38,38,0.28)' }}
                    >
                      <X size={14} /> Бас тарту
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
