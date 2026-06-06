import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  UserPlus, UserMinus, UserCheck, Clock, Link2, Check,
  Award, Users, Heart, MessageCircle, ArrowLeft,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { CATEGORY_LABELS } from '../lib/constants';
import { CategoryBadgeIcon, CategoryCardIcon } from '../components/CategoryIcon';

const ROLE_LABELS = { student: 'Студент', curator: 'Куратор', admin: 'Admin' };

function Avatar({ name, src, size = 20 }) {
  const cls = `w-${size} h-${size} rounded-3xl object-cover`;
  if (src) return <img src={src} alt={name} className={cls} />;
  return (
    <div
      className={`${cls} flex items-center justify-center text-white font-bold text-3xl`}
      style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

function FriendButton({ status, direction, friendshipId, onAction, loading }) {
  if (status === 'none') return (
    <button onClick={() => onAction('request')} disabled={loading} className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-1.5">
      <UserPlus size={15} /> Достыққа қосу
    </button>
  );

  if (status === 'pending' && direction === 'sent') return (
    <button onClick={() => onAction('cancel', friendshipId)} disabled={loading} className="btn-glass px-4 py-2 text-sm flex items-center gap-1.5">
      <Clock size={15} /> Сұрау жіберілді
    </button>
  );

  if (status === 'pending' && direction === 'received') return (
    <div className="flex gap-2">
      <button onClick={() => onAction('accept', friendshipId)} disabled={loading}
        className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-1.5"
        style={{ background: '#059669', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
        <UserCheck size={15} /> Қабылдау
      </button>
      <button onClick={() => onAction('reject', friendshipId)} disabled={loading}
        className="btn-glass px-4 py-2 text-sm" style={{ color: 'var(--clr-danger)' }}>
        Бас тарту
      </button>
    </div>
  );

  if (status === 'accepted') return (
    <button onClick={() => onAction('unfriend')} disabled={loading}
      className="btn-glass px-4 py-2 text-sm flex items-center gap-1.5"
      style={{ color: 'var(--clr-success)', borderColor: 'rgba(16,185,129,0.35)' }}>
      <UserCheck size={15} /> Дос
    </button>
  );

  return null;
}

export default function PublicProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { showConfirm } = useModal();

  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [friendStatus, setFriendStatus] = useState({ status: 'none' });
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

  useEffect(() => {
    loadProfile();
    loadFriendStatus();
  }, [loadProfile, loadFriendStatus]);

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
      } else if (action === 'reject') {
        await api.patch(`/friends/request/${friendshipId}/reject`);
        setFriendStatus({ status: 'none' });
      } else if (action === 'unfriend') {
        const ok = await showConfirm(`«${profile?.full_name}» достықтан шығаруды растайсыз ба?`, { danger: true });
        if (!ok) { setFriendLoading(false); return; }
        await api.delete(`/friends/${id}`);
        setFriendStatus({ status: 'none' });
        setProfile(prev => ({ ...prev, friends_count: Math.max(0, (prev.friends_count || 1) - 1) }));
      }
    } catch { /* тыныш */ }
    setFriendLoading(false);
  };

  const shareProfile = () => {
    const url = `${window.location.origin}/users/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      <Link to="/" className="text-muted hover:text-theme text-sm inline-flex items-center gap-1.5 mb-6 smooth">
        <ArrowLeft size={14} /> Артқа
      </Link>

      {/* Профиль тақырыбы */}
      <div className="glass-card p-7 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar name={profile.full_name} src={profile.avatar_url} size={20} />

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-theme leading-tight">{profile.full_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="badge">{ROLE_LABELS[profile.role] || profile.role}</span>
              {profile.group_name && <span className="badge">{profile.group_name}</span>}
            </div>
            {profile.bio && (
              <p className="text-sm text-muted mt-2 leading-relaxed">{profile.bio}</p>
            )}

            {/* Статистика */}
            <div className="flex items-center gap-5 mt-3">
              <div className="flex items-center gap-1.5 text-sm">
                <Award size={14} className="text-accent" />
                <span className="font-semibold text-theme">{profile.achievements_count}</span>
                <span className="text-muted">жетістік</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Users size={14} className="text-accent" />
                <span className="font-semibold text-theme">{profile.friends_count || 0}</span>
                <span className="text-muted">дос</span>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {isOwnProfile ? (
              <Link to="/profile" className="btn-glass px-4 py-2 text-sm flex items-center gap-1.5">
                Профильді өзгерту
              </Link>
            ) : me ? (
              <FriendButton
                status={friendStatus.status}
                direction={friendStatus.direction}
                friendshipId={friendStatus.friendship_id}
                onAction={handleFriendAction}
                loading={friendLoading}
              />
            ) : null}

            <button
              onClick={shareProfile}
              className="btn-glass px-4 py-2 text-sm flex items-center gap-1.5"
              style={copied ? { color: 'var(--clr-success)', borderColor: 'rgba(16,185,129,0.35)' } : {}}
            >
              {copied ? <><Check size={14} /> Көшірілді</> : <><Link2 size={14} /> Бөлісу</>}
            </button>
          </div>
        </div>
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
                  <div className="w-full h-36 shrink-0">
                    <CategoryCardIcon category={a.category} />
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <div className="badge mb-2 flex items-center gap-1.5 w-fit">
                    <CategoryBadgeIcon category={a.category} size={11} />
                    {CATEGORY_LABELS[a.category] || a.category}
                  </div>
                  <h3 className="font-semibold text-theme text-sm leading-snug mb-1 line-clamp-2 group-hover:text-accent smooth">
                    {a.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between text-xs text-muted pt-2 border-t border-white/20">
                    <span className="text-[10px] text-muted">
                      {a.event_date ? new Date(a.event_date).toLocaleDateString('kk-KZ') : ''}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
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
