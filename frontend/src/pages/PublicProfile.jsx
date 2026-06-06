import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  UserPlus, UserCheck, Clock, Link2, Check,
  Award, Users, Heart, MessageCircle, ArrowLeft, MessageSquare, X,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { CATEGORY_LABELS } from '../lib/constants';
import { CategoryBadgeIcon, CategoryCardIcon } from '../components/CategoryIcon';

const ROLE_LABELS = { student: 'Студент', curator: 'Куратор', admin: 'Admin' };

function ProfileAvatar({ name, src }) {
  if (src) {
    return (
      <img src={src} alt={name}
        className="w-16 h-16 rounded-2xl object-cover shrink-0"
        style={{ boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }} />
    );
  }
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0"
      style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

function SmallAvatar({ name, src }) {
  if (src) return <img src={src} alt={name} className="w-9 h-9 rounded-xl object-cover shrink-0" />;
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
      style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

// Кнопка дружбы — без hover-флика: pending_sent показывает Clock + отдельный X
function FriendButton({ status, direction, friendshipId, onAction, loading }) {
  if (status === 'none') return (
    <button onClick={() => onAction('request')} disabled={loading}
      className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-1.5">
      <UserPlus size={14} /> Достыққа қосу
    </button>
  );

  if (status === 'pending' && direction === 'sent') return (
    <div className="flex items-center gap-1.5">
      <span className="btn-glass px-3 py-2 text-sm flex items-center gap-1.5 cursor-default"
        style={{ opacity: 0.85 }}>
        <Clock size={14} /> Сұрау жіберілді
      </span>
      <button
        onClick={() => onAction('cancel', friendshipId)}
        disabled={loading}
        title="Сұрауды бас тарту"
        className="btn-glass px-2.5 py-2 text-sm flex items-center justify-center smooth hover:bg-red-500/15"
        style={{ color: 'var(--clr-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
      >
        <X size={15} />
      </button>
    </div>
  );

  if (status === 'pending' && direction === 'received') return (
    <div className="flex gap-2">
      <button onClick={() => onAction('accept', friendshipId)} disabled={loading}
        className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-1.5"
        style={{ background: '#059669', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
        <UserCheck size={14} /> Қабылдау
      </button>
      <button onClick={() => onAction('reject', friendshipId)} disabled={loading}
        className="btn-glass px-3 py-2 text-sm" style={{ color: 'var(--clr-danger)' }}>
        <X size={15} />
      </button>
    </div>
  );

  if (status === 'accepted') return (
    <button onClick={() => onAction('unfriend')} disabled={loading}
      className="btn-glass px-4 py-2 text-sm flex items-center gap-1.5"
      style={{ color: 'var(--clr-success)', borderColor: 'rgba(16,185,129,0.35)' }}>
      <UserCheck size={14} /> Дос
    </button>
  );

  return null;
}

export default function PublicProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { showConfirm } = useModal();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [friendStatus, setFriendStatus] = useState({ status: 'none' });
  const [friends, setFriends] = useState([]);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendLoading, setFriendLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwnProfile = me && String(me.id) === String(id);

  const loadProfile = useCallback(async () => {
    try {
      const [profileRes, achRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/achievements?status=approved&user_id=${id}&limit=50`),
      ]);
      setProfile(profileRes.data);
      setAchievements(achRes.data.achievements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadFriendStatus = useCallback(async () => {
    if (!me || isOwnProfile) return;
    try {
      const { data } = await api.get(`/friends/status/${id}`);
      setFriendStatus(data);
    } catch { /* тыныш */ }
  }, [id, me, isOwnProfile]);

  const loadFriends = useCallback(async () => {
    try {
      const { data } = await api.get(`/users/${id}/friends`);
      setFriends(data.friends || []);
    } catch { /* тыныш */ }
  }, [id]);

  useEffect(() => {
    loadProfile();
    loadFriendStatus();
    loadFriends();
  }, [loadProfile, loadFriendStatus, loadFriends]);

  const handleFriendAction = async (action, friendshipId) => {
    setFriendLoading(true);
    try {
      if (action === 'request') {
        await api.post(`/friends/request/${id}`);
        setFriendStatus({ status: 'pending', direction: 'sent' });
      } else if (action === 'cancel') {
        await api.patch(`/friends/request/${friendshipId}/reject`);
        setFriendStatus({ status: 'none' });
      } else if (action === 'accept') {
        await api.patch(`/friends/request/${friendshipId}/accept`);
        setFriendStatus({ status: 'accepted' });
        setProfile(prev => ({ ...prev, friends_count: (prev.friends_count || 0) + 1 }));
        loadFriends();
      } else if (action === 'reject') {
        await api.patch(`/friends/request/${friendshipId}/reject`);
        setFriendStatus({ status: 'none' });
      } else if (action === 'unfriend') {
        const ok = await showConfirm(`«${profile?.full_name}» достықтан шығаруды растайсыз ба?`, { danger: true });
        if (!ok) { setFriendLoading(false); return; }
        await api.delete(`/friends/${id}`);
        setFriendStatus({ status: 'none' });
        setProfile(prev => ({ ...prev, friends_count: Math.max(0, (prev.friends_count || 1) - 1) }));
        setFriends(friends.filter(f => String(f.id) !== String(me?.id)));
      }
    } catch { /* тыныш */ }
    setFriendLoading(false);
  };

  const shareProfile = () => {
    navigator.clipboard.writeText(`${window.location.origin}/users/${id}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openChat = () => {
    navigate('/chat', {
      state: { openChatWith: { id: parseInt(id), full_name: profile.full_name, avatar_url: profile.avatar_url } }
    });
  };

  if (loading) return <div className="text-center text-muted py-20">Жүктелуде...</div>;
  if (!profile) return (
    <div className="max-w-xl mx-auto px-5 py-20 text-center">
      <h1 className="text-xl font-bold text-theme mb-3">Пайдаланушы табылмады</h1>
      <Link to="/" className="text-accent hover:underline">Басты бетке</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <Link to="/" className="text-muted hover:text-theme text-sm inline-flex items-center gap-1.5 mb-5 smooth">
        <ArrowLeft size={14} /> Артқа
      </Link>

      {/* ── Профиль картасы ── */}
      <div className="glass-card p-6 mb-6">

        {/* Аватар + аты */}
        <div className="flex items-center gap-4 mb-4">
          <ProfileAvatar name={profile.full_name} src={profile.avatar_url} />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-theme leading-tight">{profile.full_name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="badge">{ROLE_LABELS[profile.role] || profile.role}</span>
              {profile.group_name && (
                <Link
                  to={`/groups/${encodeURIComponent(profile.group_name)}`}
                  className="badge hover:opacity-75 smooth"
                >
                  {profile.group_name}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Био */}
        {profile.bio && (
          <p className="text-sm text-muted mb-4 leading-relaxed">{profile.bio}</p>
        )}

        {/* Статистика */}
        <div className="flex items-center gap-5 mb-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Award size={14} className="text-accent" />
            <span className="font-semibold text-theme">{profile.achievements_count}</span>
            <span className="text-muted">жетістік</span>
          </div>
          <button
            onClick={() => setFriendsOpen(!friendsOpen)}
            className="flex items-center gap-1.5 text-sm hover:text-accent smooth"
          >
            <Users size={14} className="text-accent" />
            <span className="font-semibold text-theme">{profile.friends_count || 0}</span>
            <span className="text-muted">дос</span>
          </button>
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-wrap gap-2">
          {isOwnProfile ? (
            <Link to="/profile" className="btn-glass px-4 py-2 text-sm flex items-center gap-1.5">
              Профильді өзгерту
            </Link>
          ) : me ? (
            <>
              <FriendButton
                status={friendStatus.status}
                direction={friendStatus.direction}
                friendshipId={friendStatus.friendship_id}
                onAction={handleFriendAction}
                loading={friendLoading}
              />
              <button onClick={openChat}
                className="btn-glass px-4 py-2 text-sm flex items-center gap-1.5">
                <MessageSquare size={14} /> Хабарлама
              </button>
            </>
          ) : null}

          <button
            onClick={shareProfile}
            className="btn-glass px-4 py-2 text-sm flex items-center gap-1.5 smooth"
            style={copied ? { color: 'var(--clr-success)', borderColor: 'rgba(16,185,129,0.35)' } : {}}
          >
            {copied ? <><Check size={14} /> Көшірілді</> : <><Link2 size={14} /> Бөлісу</>}
          </button>
        </div>

        {/* Список друзей */}
        {friendsOpen && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-sm font-semibold text-theme mb-3">Достар ({friends.length})</p>
            {friends.length === 0 ? (
              <p className="text-sm text-muted">Достар жоқ</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {friends.map((f) => (
                  <Link to={`/users/${f.id}`} key={f.id}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/10 smooth">
                    <SmallAvatar name={f.full_name} src={f.avatar_url} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-theme truncate">{f.full_name}</div>
                      {f.group_name && <div className="text-[10px] text-muted truncate">{f.group_name}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Жетістіктер торы */}
      <h2 className="text-base font-semibold text-theme mb-4">
        Жетістіктер ({achievements.length})
      </h2>

      {achievements.length === 0 ? (
        <div className="glass-panel text-center py-14 text-muted text-sm">
          Расталған жетістіктер жоқ
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {achievements.map((a) => (
            <Link to={`/achievements/${a.id}`} key={a.id} className="block group">
              <article className="glass-card overflow-hidden h-full hover-lift flex flex-col">
                {a.preview_image ? (
                  <img src={a.preview_image} alt={a.title} className="w-full h-36 object-cover shrink-0" />
                ) : (
                  <div className="w-full h-36 shrink-0"><CategoryCardIcon category={a.category} /></div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <div className="badge mb-2 flex items-center gap-1.5 w-fit">
                    <CategoryBadgeIcon category={a.category} size={11} />
                    {CATEGORY_LABELS[a.category] || a.category}
                  </div>
                  <h3 className="font-semibold text-theme text-sm leading-snug line-clamp-2 group-hover:text-accent smooth">
                    {a.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between text-xs text-muted pt-2 border-t border-white/20">
                    <span className="text-[10px]">
                      {a.event_date ? new Date(a.event_date).toLocaleDateString('kk-KZ') : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5"><Heart size={10} /> {a.likes_count || 0}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={10} /> {a.comments_count || 0}</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
