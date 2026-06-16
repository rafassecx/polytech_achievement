import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Pencil, Check, X, ChevronRight,
  Send, Link2, Unlink, LogOut,
  Sun, Moon, Lock, Eye, EyeOff,
  User, Info, Award, Bookmark, Users,
  UserCheck, UserX, Clock, Share2, Heart, MessageCircle,
  Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CategoryBadgeIcon } from '../components/CategoryIcon';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import api from '../lib/api';

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
  const { t, i18n } = useTranslation();

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
  };

  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [tgCode, setTgCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [tgError, setTgError] = useState('');

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const [friendRequests, setFriendRequests] = useState([]);
  const [processingFriend, setProcessingFriend] = useState(null);

  const [friends, setFriends] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
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
      setEditError(err.response?.data?.message || t('common.error'));
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
      await showAlert(err.response?.data?.message || t('common.error'));
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
      setTgError(err.response?.data?.message || t('common.error'));
    } finally {
      setGeneratingCode(false);
    }
  };

  const unlinkTelegram = async () => {
    const ok = await showConfirm(t('profile.telegramDisconnectConfirm'));
    if (!ok) return;
    try {
      await api.post('/users/me/telegram-unlink');
      await loadProfile();
      setTgCode(null);
    } catch (err) {
      await showAlert(err.response?.data?.message || t('common.error'));
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: t('register.errorMatch') });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ ok: false, text: t('register.errorLength') });
      return;
    }
    setPwLoading(true);
    try {
      await api.post('/users/me/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwMsg({ ok: true, text: t('settings.passwordSuccess') });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.message || t('common.error') });
    } finally {
      setPwLoading(false);
    }
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

  if (loading) return <div className="text-center text-muted py-20 text-sm">{t('common.loading')}</div>;
  if (!profile) return null;

  const catLabels = {
    academic: t('achievements.category.academic'),
    sport: t('achievements.category.sport'),
    cultural: t('achievements.category.cultural'),
    social: t('achievements.category.social'),
    other: t('achievements.category.other'),
  };

  const roleLabels = {
    student: t('profile.roles.student'),
    curator: t('profile.roles.curator'),
    admin: t('profile.roles.admin'),
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-5">

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
              <span className="badge">{roleLabels[profile.role] || profile.role}</span>
              {profile.group_name && <span className="badge">{profile.group_name}</span>}
            </div>
            <p className="text-xs text-muted mt-2">{profile.email}</p>
          </div>

          <button
            onClick={shareProfile}
            className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0 smooth"
            style={copied ? { color: 'var(--clr-success)', borderColor: 'rgba(16,185,129,0.4)' } : {}}
          >
            {copied ? <><Check size={12} /> {t('profile.copied')}</> : <><Share2 size={12} /> {t('profile.share')}</>}
          </button>
        </div>
      </div>

      <div className="glass-panel p-1.5 grid grid-cols-2 gap-1" style={{ borderRadius: 18 }}>
        <TabBtn active={tab === 'profile'} onClick={() => setTab('profile')}>{t('profile.tabs.profile')}</TabBtn>
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')}>{t('profile.tabs.settings')}</TabBtn>
      </div>

      {tab === 'profile' && (
        <>
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-theme flex items-center gap-2">
                <Users size={16} className="text-accent" /> {t('profile.myFriends')}
                <span className="badge ml-1">{friends.length}</span>
              </h3>
              <Link to={`/users/${user?.id}`} className="text-xs text-accent hover:underline smooth">
                {t('profile.viewAll')}
              </Link>
            </div>
            {friends.length === 0 ? (
              <p className="text-sm text-muted">{t('profile.noFriends')}</p>
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

          {friendRequests.length > 0 && (
            <div className="glass-panel p-5">
              <h3 className="text-sm font-semibold text-theme mb-3 flex items-center gap-2">
                <Users size={15} className="text-accent" /> {t('profile.friendRequests', { count: friendRequests.length })}
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

          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-theme">{t('profile.editTitle')}</h3>
              {!editing && (
                <button onClick={() => setEditing(true)} className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5">
                  <Pencil size={13} /> {t('profile.editBtn')}
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                {editError && <div className="alert-error">{editError}</div>}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">{t('profile.fullName')}</label>
                  <input type="text" value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="glass-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">{t('profile.bio')}</label>
                  <textarea value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={3} className="glass-input" placeholder={t('profile.bioPlaceholder')} />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving}
                    className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-1.5">
                    <Check size={14} /> {saving ? t('profile.saving') : t('profile.save')}
                  </button>
                  <button type="button" disabled={saving} onClick={() => { setEditing(false); setEditError(''); setForm({ full_name: profile.full_name || '', bio: profile.bio || '' }); }}
                    className="btn-glass px-5 py-2 text-sm flex items-center gap-1.5">
                    <X size={14} /> {t('profile.cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-3 text-sm">
                {[
                  { label: t('profile.fullName'), value: profile.full_name },
                  { label: t('profile.group'), value: profile.group_name },
                  { label: t('profile.bio'), value: profile.bio },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-muted mb-0.5">{label}</dt>
                    <dd className="text-theme whitespace-pre-wrap">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4 flex items-center gap-2">
              <Send size={16} /> {t('profile.telegramTitle')}
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
                    <div className="text-sm font-medium text-theme">{t('profile.telegramLinked')}</div>
                    {profile.telegram_username && <div className="text-xs text-muted">@{profile.telegram_username}</div>}
                  </div>
                </div>
                <button onClick={unlinkTelegram} className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5"
                  style={{ color: 'var(--clr-danger)' }}>
                  <Unlink size={13} /> {t('profile.telegramDisconnect')}
                </button>
              </div>
            ) : tgCode ? (
              <div className="glass-card p-5" style={{ borderRadius: 14 }}>
                <p className="text-sm text-theme mb-3">{t('profile.telegramCodeSend')}</p>
                <div className="glass-panel p-3 mb-3 text-center">
                  <code className="text-xl font-mono tracking-widest text-accent">/link {tgCode.code}</code>
                </div>
                <p className="text-xs text-muted mb-3">{t('profile.telegramCodeNote')}</p>
                <button onClick={() => setTgCode(null)} className="btn-glass px-4 py-1.5 text-xs">
                  {t('profile.telegramHide')}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted mb-4">{t('profile.telegramDesc')}</p>
                <button onClick={generateCode} disabled={generatingCode}
                  className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-2">
                  <Link2 size={14} /> {generatingCode ? t('profile.telegramGenerating') : t('profile.telegramConnect')}
                </button>
              </div>
            )}
          </div>

          <Link to="/my-achievements"
            className="glass-panel p-4 flex items-center justify-between hover-lift">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.12)' }}>
                <Award size={16} className="text-accent" />
              </div>
              <span className="text-sm font-medium text-theme">{t('profile.myAchievements')}</span>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </Link>

          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-theme flex items-center gap-2">
                <Bookmark size={16} className="text-accent" /> {t('profile.bookmarks')}
                <span className="badge ml-1">{bookmarks.length}</span>
              </h3>
              {bookmarks.length > 0 && (
                <Link to="/bookmarks" className="text-xs text-accent hover:underline smooth">
                  {t('profile.viewAll')}
                </Link>
              )}
            </div>
            {bookmarks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted mb-2">{t('profile.noBookmarks')}</p>
                <Link to="/" className="text-xs text-accent hover:underline">
                  {t('profile.browseAchievements')}
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
                          {catLabels[a.category] || a.category}
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
                    {t('profile.moreBookmarks', { count: bookmarks.length - 4 })}
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'settings' && (
        <>
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4">{t('settings.theme')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => dark && toggleTheme()}
                className={`relative p-4 rounded-2xl border-2 smooth flex flex-col items-center gap-2 ${!dark ? 'border-indigo-400/60' : 'border-white/20 hover:border-white/40'}`}
                style={{ background: !dark ? 'rgba(99,102,241,0.10)' : 'var(--glass)' }}>
                <Sun size={28} className={!dark ? 'text-amber-400' : 'text-muted'} />
                <span className="text-sm font-medium text-theme">{t('settings.themeLight')}</span>
                {!dark && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--clr-accent)' }}><Check size={11} className="text-white" /></span>}
              </button>
              <button onClick={() => !dark && toggleTheme()}
                className={`relative p-4 rounded-2xl border-2 smooth flex flex-col items-center gap-2 ${dark ? 'border-indigo-400/60' : 'border-white/20 hover:border-white/40'}`}
                style={{ background: dark ? 'rgba(99,102,241,0.10)' : 'var(--glass)' }}>
                <Moon size={28} className={dark ? 'text-indigo-300' : 'text-muted'} />
                <span className="text-sm font-medium text-theme">{t('settings.themeDark')}</span>
                {dark && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--clr-accent)' }}><Check size={11} className="text-white" /></span>}
              </button>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4 flex items-center gap-2">
              <Globe size={16} /> {t('settings.language')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => changeLang('kk')}
                className={`relative p-4 rounded-2xl border-2 smooth flex flex-col items-center gap-2 ${i18n.language === 'kk' ? 'border-indigo-400/60' : 'border-white/20 hover:border-white/40'}`}
                style={{ background: i18n.language === 'kk' ? 'rgba(99,102,241,0.10)' : 'var(--glass)' }}>
                <span className="text-2xl font-bold text-theme">ҚАЗ</span>
                <span className="text-sm font-medium text-theme">Қазақша</span>
                {i18n.language === 'kk' && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--clr-accent)' }}><Check size={11} className="text-white" /></span>}
              </button>
              <button onClick={() => changeLang('ru')}
                className={`relative p-4 rounded-2xl border-2 smooth flex flex-col items-center gap-2 ${i18n.language === 'ru' ? 'border-indigo-400/60' : 'border-white/20 hover:border-white/40'}`}
                style={{ background: i18n.language === 'ru' ? 'rgba(99,102,241,0.10)' : 'var(--glass)' }}>
                <span className="text-2xl font-bold text-theme">РУС</span>
                <span className="text-sm font-medium text-theme">Русский</span>
                {i18n.language === 'ru' && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--clr-accent)' }}><Check size={11} className="text-white" /></span>}
              </button>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4 flex items-center gap-2">
              <Lock size={16} /> {t('settings.password')}
            </h3>
            {pwMsg && <div className={`${pwMsg.ok ? 'alert-success' : 'alert-error'} mb-4`}>{pwMsg.text}</div>}
            <form onSubmit={handlePassword} className="space-y-4">
              {[
                { key: 'current', label: t('settings.passwordCurrent') },
                { key: 'next', label: t('settings.passwordNew'), min: 6, placeholder: t('settings.passwordMinLength') },
                { key: 'confirm', label: t('settings.passwordConfirm') },
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
                <Check size={14} /> {pwLoading ? t('settings.passwordSaving') : t('settings.passwordSave')}
              </button>
            </form>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-3 flex items-center gap-2">
              <User size={16} /> {t('profile.accountTitle')}
            </h3>
            <dl className="space-y-2.5 text-sm">
              {[
                { label: 'Email', value: user?.email },
                { label: t('profile.roleLabel'), value: roleLabels[user?.role] || user?.role },
                user?.group_name ? { label: t('profile.group'), value: user.group_name } : null,
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-theme">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-3 flex items-center gap-2">
              <Info size={16} /> {t('profile.aboutTitle')}
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{t('profile.aboutProject')}</dt><dd className="text-theme">Achievly</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t('profile.aboutVersion')}</dt><dd className="text-theme">1.0.0</dd></div>
              <div className="flex justify-between"><dt className="text-muted">© 2026</dt><dd className="text-theme">Achievly</dd></div>
            </dl>
          </div>

          <button onClick={logout}
            className="w-full glass-panel p-4 flex items-center justify-center gap-2.5 smooth hover:bg-red-500/10 cursor-pointer"
            style={{ color: 'var(--clr-danger)', borderRadius: 18 }}>
            <LogOut size={17} />
            <span className="text-sm font-semibold">{t('profile.logout')}</span>
          </button>
        </>
      )}
    </div>
  );
}
