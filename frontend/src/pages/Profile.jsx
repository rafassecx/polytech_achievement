import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Pencil, Check, X, ChevronRight,
  Send, Link2, Unlink, LogOut,
  Sun, Moon, Lock, Eye, EyeOff,
  User, Info, Award, Bookmark, Users,
  UserCheck, UserX, Clock, Share2, Heart, MessageCircle,
} from 'lucide-react';
import { CATEGORY_LABELS } from '../lib/constants';
import { CategoryBadgeIcon } from '../components/CategoryIcon';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import api from '../lib/api';

const ROLE_LABELS = { student: 'Студент', curator: 'Куратор', admin: 'Admin' };

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-medium rounded-xl smooth ${
        active ? 'text-white' : 'text-muted hover:text-theme'
      }`}
      style={active ? { background: 'var(--clr-accent)' } : {}}
    >
      {children}
    </button>
  );
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const { showAlert, showConfirm } = useModal();

  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Редактирование
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Аватар
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Telegram
  const [tgCode, setTgCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [tgError, setTgError] = useState('');

  // Пароль
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  // Запрос смены группы
  const [groupRequest, setGroupRequest] = useState(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [groupSending, setGroupSending] = useState(false);
  const [groupMsg, setGroupMsg] = useState(null);

  // Входящие заявки в друзья
  const [friendRequests, setFriendRequests] = useState([]);
  const [processingFriend, setProcessingFriend] = useState(null);

  // Список друзей
  const [friends, setFriends] = useState([]);

  // Закладки
  const [bookmarks, setBookmarks] = useState([]);

  // Поделиться
  const [copied, setCopied] = useState(false);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data);
      setForm({ full_name: data.full_name || '', bio: data.bio || '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupRequest = async () => {
    try {
      const { data } = await api.get('/users/me/group-request');
      setGroupRequest(data.request);
    } catch { /* тыныш */ }
  };

  const loadFriendRequests = async () => {
    try {
      const { data } = await api.get('/friends/requests');
      setFriendRequests(data.requests || []);
    } catch { /* тыныш */ }
  };

  const loadFriends = async () => {
    try {
      const { data } = await api.get('/friends');
      setFriends(data.friends || []);
    } catch { /* тыныш */ }
  };

  const loadBookmarks = async () => {
    try {
      const { data } = await api.get('/bookmarks');
      setBookmarks(data.bookmarks || []);
    } catch { /* тыныш */ }
  };

  useEffect(() => {
    loadProfile();
    loadGroupRequest();
    if (user) {
      loadFriendRequests();
      loadFriends();
      loadBookmarks();
    }
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      const { data } = await api.put('/users/me', form);
      setProfile({ ...profile, ...data.user });
      updateUser({ ...user, ...data.user });
      setEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Қате');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile({ ...profile, avatar_url: data.avatar_url });
      updateUser({ ...user, avatar_url: data.avatar_url });
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате орын алды');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const generateCode = async () => {
    setGeneratingCode(true);
    setTgError('');
    try {
      const { data } = await api.post('/users/me/telegram-code');
      setTgCode(data);
    } catch (err) {
      setTgError(err.response?.data?.message || 'Қате');
    } finally {
      setGeneratingCode(false);
    }
  };

  const unlinkTelegram = async () => {
    const ok = await showConfirm('Telegram-ды ажыратуды растайсыз ба?');
    if (!ok) return;
    try {
      await api.post('/users/me/telegram-unlink');
      await loadProfile();
      setTgCode(null);
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате');
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ ok: false, text: 'Жаңа құпиясөздер сәйкес келмейді' }); return; }
    if (pwForm.next.length < 6) { setPwMsg({ ok: false, text: 'Жаңа құпиясөз кемінде 6 таңба' }); return; }
    setPwLoading(true);
    try {
      await api.post('/users/me/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwMsg({ ok: true, text: 'Құпиясөз сәтті өзгертілді' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.message || 'Қате' });
    } finally {
      setPwLoading(false);
    }
  };

  const submitGroupRequest = async (e) => {
    e.preventDefault();
    if (!newGroup.trim()) return;
    setGroupSending(true);
    setGroupMsg(null);
    try {
      await api.post('/users/me/group-request', { requested_group: newGroup.trim() });
      setGroupMsg({ ok: true, text: 'Сұрау жіберілді. Модератор қарайды.' });
      setShowGroupForm(false);
      setNewGroup('');
      loadGroupRequest();
    } catch (err) {
      setGroupMsg({ ok: false, text: err.response?.data?.message || 'Қате' });
    } finally {
      setGroupSending(false);
    }
  };

  const cancelGroupRequest = async () => {
    try {
      await api.delete('/users/me/group-request');
      setGroupRequest(null);
      setGroupMsg(null);
    } catch { /* тыныш */ }
  };

  const handleFriendAction = async (reqId, userId, action) => {
    setProcessingFriend(reqId);
    try {
      if (action === 'accept') {
        await api.patch(`/friends/request/${reqId}/accept`);
      } else {
        await api.patch(`/friends/request/${reqId}/reject`);
      }
      setFriendRequests(friendRequests.filter(r => r.id !== reqId));
    } catch { /* тыныш */ }
    setProcessingFriend(null);
  };

  const shareProfile = () => {
    navigator.clipboard.writeText(`${window.location.origin}/users/${user?.id}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (loading) return <div className="text-center text-muted py-20 text-sm">Жүктелуде...</div>;
  if (!profile) return null;

  const isStudent = user?.role === 'student';

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-5">

      {/* Аватар + аты + публичный профиль */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-5">
          <div className="relative group shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-3xl object-cover"
                style={{ boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }} />
            ) : (
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)' }}>
                {profile.full_name?.charAt(0) || '?'}
              </div>
            )}
            <label className="absolute inset-0 rounded-3xl bg-black/0 group-hover:bg-black/50 flex items-center justify-center cursor-pointer smooth">
              <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 smooth" />
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-3xl bg-black/50 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleAvatar} disabled={uploadingAvatar} className="hidden" />
            </label>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-theme">{profile.full_name}</h2>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <span className="badge">{ROLE_LABELS[profile.role] || profile.role}</span>
              {profile.group_name && <span className="badge">{profile.group_name}</span>}
            </div>
            <p className="text-xs text-muted mt-2">{profile.email}</p>
          </div>

          <button
            onClick={shareProfile}
            className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0 smooth"
            style={copied ? { color: 'var(--clr-success)', borderColor: 'rgba(16,185,129,0.4)' } : {}}
          >
            {copied ? <><Check size={12} /> Көшірілді</> : <><Share2 size={12} /> Бөлісу</>}
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="glass-panel p-1.5 grid grid-cols-2 gap-1" style={{ borderRadius: 18 }}>
        <TabBtn active={tab === 'profile'} onClick={() => setTab('profile')}>Профиль</TabBtn>
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')}>Баптаулар</TabBtn>
      </div>

      {/* ── ПРОФИЛЬ ── */}
      {tab === 'profile' && (
        <>
          {/* Достар тізімі — бірінші орында */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-theme flex items-center gap-2">
                <Users size={16} className="text-accent" /> Достарым
                <span className="badge ml-1">{friends.length}</span>
              </h3>
              <Link to={`/users/${user?.id}`} className="text-xs text-accent hover:underline smooth">
                Барлығын көру
              </Link>
            </div>
            {friends.length === 0 ? (
              <p className="text-sm text-muted">Достар жоқ. Достыққа қосу үшін профильдерге кіріңіз.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {friends.slice(0, 6).map((f) => (
                  <Link to={`/users/${f.id}`} key={f.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl hover:bg-white/10 smooth">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>
                        {f.full_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-theme truncate">{f.full_name}</div>
                      {f.group_name && <div className="text-[10px] text-muted truncate">{f.group_name}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Входящие заявки в друзья */}
          {friendRequests.length > 0 && (
            <div className="glass-panel p-5">
              <h3 className="text-sm font-semibold text-theme mb-3 flex items-center gap-2">
                <Users size={15} className="text-accent" /> Достық сұраулары ({friendRequests.length})
              </h3>
              <div className="space-y-3">
                {friendRequests.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>
                      {r.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/users/${r.user_id}`} className="text-sm font-medium text-theme hover:text-accent smooth truncate block">
                        {r.full_name}
                      </Link>
                      {r.group_name && <div className="text-xs text-muted">{r.group_name}</div>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleFriendAction(r.id, r.user_id, 'accept')}
                        disabled={processingFriend === r.id}
                        className="w-8 h-8 rounded-xl flex items-center justify-center smooth"
                        style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--clr-success)' }}
                      >
                        <UserCheck size={15} />
                      </button>
                      <button
                        onClick={() => handleFriendAction(r.id, r.user_id, 'reject')}
                        disabled={processingFriend === r.id}
                        className="w-8 h-8 rounded-xl flex items-center justify-center smooth"
                        style={{ background: 'rgba(239,68,68,0.10)', color: 'var(--clr-danger)' }}
                      >
                        <UserX size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Редактирование профиля (без группы) */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-theme">Профильді өзгерту</h3>
              {!editing && (
                <button onClick={() => setEditing(true)} className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5">
                  <Pencil size={13} /> Өзгерту
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                {editError && <div className="alert-error">{editError}</div>}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">Аты-жөні</label>
                  <input type="text" value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="glass-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">Био</label>
                  <textarea value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={3} className="glass-input" placeholder="Өзіңіз туралы қысқаша..." />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving}
                    className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-1.5">
                    <Check size={14} /> {saving ? 'Сақталуда...' : 'Сақтау'}
                  </button>
                  <button type="button" disabled={saving} onClick={() => { setEditing(false); setEditError(''); setForm({ full_name: profile.full_name || '', bio: profile.bio || '' }); }}
                    className="btn-glass px-5 py-2 text-sm flex items-center gap-1.5">
                    <X size={14} /> Бас тарту
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-3 text-sm">
                {[
                  { label: 'Аты-жөні', value: profile.full_name },
                  { label: 'Топ', value: profile.group_name },
                  { label: 'Био', value: profile.bio },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-muted mb-0.5">{label}</dt>
                    <dd className="text-theme whitespace-pre-wrap">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Топ ауыстыру сұрауы */}
          {isStudent && (
            <div className="glass-panel p-6">
              <h3 className="text-base font-semibold text-theme mb-1">Топты ауыстыру</h3>
              <p className="text-xs text-muted mb-4">
                Топты тікелей өзгерту мүмкін емес. Сұрау жіберіңіз — модератор мақұлдайды.
              </p>

              {groupMsg && (
                <div className={`${groupMsg.ok ? 'alert-success' : 'alert-error'} mb-4`}>{groupMsg.text}</div>
              )}

              {groupRequest && groupRequest.status === 'pending' ? (
                <div className="flex items-center justify-between glass-panel p-3" style={{ borderRadius: 12 }}>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} style={{ color: '#f59e0b' }} />
                    <span className="text-muted">Сұрау:</span>
                    <span className="font-medium text-theme">«{groupRequest.requested_group}»</span>
                    <span className="text-xs text-muted">— модерацияда</span>
                  </div>
                  <button onClick={cancelGroupRequest} className="text-xs text-muted hover:text-danger smooth">
                    Жою
                  </button>
                </div>
              ) : showGroupForm ? (
                <form onSubmit={submitGroupRequest} className="space-y-3">
                  <input
                    type="text"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    placeholder="Жаңа топ: P22-2B"
                    className="glass-input"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={groupSending || !newGroup.trim()}
                      className="btn-primary px-4 py-2 rounded-xl text-sm">
                      {groupSending ? 'Жіберілуде...' : 'Жіберу'}
                    </button>
                    <button type="button" onClick={() => { setShowGroupForm(false); setNewGroup(''); }}
                      className="btn-glass px-4 py-2 text-sm">
                      Бас тарту
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowGroupForm(true)}
                  className="btn-glass px-4 py-2 text-sm flex items-center gap-1.5">
                  <Pencil size={13} /> Топты ауыстыруды сұрау
                </button>
              )}
            </div>
          )}

          {/* Telegram */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4 flex items-center gap-2">
              <Send size={16} /> Telegram
            </h3>
            {tgError && <div className="alert-error mb-4">{tgError}</div>}

            {profile.telegram_id ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.12)' }}>
                    <Send size={18} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-theme">Байланыстырылған</div>
                    {profile.telegram_username && <div className="text-xs text-muted">@{profile.telegram_username}</div>}
                  </div>
                </div>
                <button onClick={unlinkTelegram} className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5"
                  style={{ color: 'var(--clr-danger)' }}>
                  <Unlink size={13} /> Ажырату
                </button>
              </div>
            ) : tgCode ? (
              <div className="glass-card p-5" style={{ borderRadius: 14 }}>
                <p className="text-sm text-theme mb-3">Telegram ботында жіберіңіз:</p>
                <div className="glass-panel p-3 mb-3 text-center">
                  <code className="text-xl font-mono tracking-widest text-accent">/link {tgCode.code}</code>
                </div>
                <p className="text-xs text-muted mb-3">Код 10 минут жарамды.</p>
                <button onClick={() => setTgCode(null)} className="btn-glass px-4 py-1.5 text-xs">Жасыру</button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted mb-4">Telegram-ды байланыстыру арқылы бот арқылы жетістіктерді тіркей аласыз.</p>
                <button onClick={generateCode} disabled={generatingCode}
                  className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-2">
                  <Link2 size={14} /> {generatingCode ? 'Жасалуда...' : 'Байланыстыру коды'}
                </button>
              </div>
            )}
          </div>

          {/* Жылдам сілтеме — жетістіктерім */}
          <Link to="/my-achievements"
            className="glass-panel p-4 flex items-center justify-between hover-lift">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.12)' }}>
                <Award size={16} className="text-accent" />
              </div>
              <span className="text-sm font-medium text-theme">Менің жетістіктерім</span>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </Link>

          {/* Таңдаулылар секциясы */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-theme flex items-center gap-2">
                <Bookmark size={16} className="text-accent" /> Таңдаулылар
                <span className="badge ml-1">{bookmarks.length}</span>
              </h3>
              {bookmarks.length > 0 && (
                <Link to="/bookmarks" className="text-xs text-accent hover:underline smooth">
                  Барлығын көру
                </Link>
              )}
            </div>
            {bookmarks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted mb-2">Таңдаулылар жоқ</p>
                <Link to="/" className="text-xs text-accent hover:underline">
                  Жетістіктерді қарау
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.slice(0, 4).map((a) => (
                  <Link to={`/achievements/${a.id}`} key={a.id}
                    className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 smooth group">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
                      style={{ background: 'rgba(99,102,241,0.10)' }}>
                      {a.preview_image
                        ? <img src={a.preview_image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <CategoryBadgeIcon category={a.category} size={16} />
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-theme truncate group-hover:text-accent smooth">
                        {a.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                        <span className="flex items-center gap-0.5">
                          <CategoryBadgeIcon category={a.category} size={9} />
                          {CATEGORY_LABELS[a.category] || a.category}
                        </span>
                        <span className="flex items-center gap-0.5"><Heart size={9} /> {a.likes_count || 0}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle size={9} /> {a.comments_count || 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {bookmarks.length > 4 && (
                  <Link to="/bookmarks"
                    className="block text-center text-xs text-accent hover:underline pt-1 smooth">
                    + тағы {bookmarks.length - 4}
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── БАПТАУЛАР ── */}
      {tab === 'settings' && (
        <>
          {/* Тема */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4">Интерфейс тақырыбы</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => dark && toggleTheme()}
                className={`relative p-4 rounded-2xl border-2 smooth flex flex-col items-center gap-2 ${!dark ? 'border-indigo-400/60' : 'border-white/20 hover:border-white/40'}`}
                style={{ background: !dark ? 'rgba(99,102,241,0.10)' : 'var(--glass)' }}>
                <Sun size={28} className={!dark ? 'text-amber-400' : 'text-muted'} />
                <span className="text-sm font-medium text-theme">Жарық</span>
                {!dark && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--clr-accent)' }}><Check size={11} className="text-white" /></span>}
              </button>
              <button onClick={() => !dark && toggleTheme()}
                className={`relative p-4 rounded-2xl border-2 smooth flex flex-col items-center gap-2 ${dark ? 'border-indigo-400/60' : 'border-white/20 hover:border-white/40'}`}
                style={{ background: dark ? 'rgba(99,102,241,0.10)' : 'var(--glass)' }}>
                <Moon size={28} className={dark ? 'text-indigo-300' : 'text-muted'} />
                <span className="text-sm font-medium text-theme">Қараңғы</span>
                {dark && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--clr-accent)' }}><Check size={11} className="text-white" /></span>}
              </button>
            </div>
          </div>

          {/* Пароль */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4 flex items-center gap-2">
              <Lock size={16} /> Құпиясөзді өзгерту
            </h3>
            {pwMsg && <div className={`${pwMsg.ok ? 'alert-success' : 'alert-error'} mb-4`}>{pwMsg.text}</div>}
            <form onSubmit={handlePassword} className="space-y-4">
              {[
                { key: 'current', label: 'Ағымдағы құпиясөз' },
                { key: 'next', label: 'Жаңа құпиясөз', min: 6, placeholder: 'Кемінде 6 таңба' },
                { key: 'confirm', label: 'Жаңа құпиясөзді растаңыз' },
              ].map(({ key, label, min, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">{label}</label>
                  <div className="relative">
                    <input type={showPw[key] ? 'text' : 'password'} value={pwForm[key]}
                      onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                      required minLength={min} className="glass-input pr-10" placeholder={placeholder || '••••••••'} />
                    <button type="button" onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-theme smooth">
                      {showPw[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={pwLoading}
                className="btn-primary px-6 py-2.5 rounded-2xl text-sm flex items-center gap-2">
                <Check size={14} /> {pwLoading ? 'Сақталуда...' : 'Сақтау'}
              </button>
            </form>
          </div>

          {/* Аккаунт */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-3 flex items-center gap-2">
              <User size={16} /> Аккаунт
            </h3>
            <dl className="space-y-2.5 text-sm">
              {[
                { label: 'Email', value: user?.email },
                { label: 'Рөл', value: ROLE_LABELS[user?.role] || user?.role },
                user?.group_name ? { label: 'Топ', value: user.group_name } : null,
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-theme">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Жүйе */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-3 flex items-center gap-2">
              <Info size={16} /> Жүйе туралы
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Жоба</dt><dd className="text-theme">Achievly</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Нұсқасы</dt><dd className="text-theme">1.0.0</dd></div>
              <div className="flex justify-between"><dt className="text-muted">© 2026</dt><dd className="text-theme">Achievly</dd></div>
            </dl>
          </div>

          <button onClick={logout}
            className="w-full glass-panel p-4 flex items-center justify-center gap-2.5 smooth hover:bg-red-500/10 cursor-pointer"
            style={{ color: 'var(--clr-danger)', borderRadius: 18 }}>
            <LogOut size={17} />
            <span className="text-sm font-semibold">Шығу</span>
          </button>
        </>
      )}
    </div>
  );
}
