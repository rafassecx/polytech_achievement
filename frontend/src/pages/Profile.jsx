import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, Pencil, Check, X, ChevronRight,
  Send, Link2, Unlink, LogOut,
  Sun, Moon, Lock, Eye, EyeOff,
  User, Info, Award,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import api from '../lib/api';

const ROLE_LABELS = { student: 'Студент', curator: 'Куратор', admin: 'Admin' };

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-medium rounded-xl smooth transition-all ${
        active
          ? 'text-white'
          : 'text-muted hover:text-theme'
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

  // редактирование профиля
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', bio: '', group_name: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // аватар
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // telegram
  const [tgCode, setTgCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [tgError, setTgError] = useState('');

  // пароль
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data);
      setForm({ full_name: data.full_name || '', bio: data.bio || '', group_name: data.group_name || '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

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
      const { data } = await api.post('/users/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
      await showAlert(err.response?.data?.message || 'Қате орын алды');
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);

    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: 'Жаңа құпиясөздер сәйкес келмейді' });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ ok: false, text: 'Жаңа құпиясөз кемінде 6 таңба' });
      return;
    }

    setPwLoading(true);
    try {
      await api.post('/users/me/password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      setPwMsg({ ok: true, text: 'Құпиясөз сәтті өзгертілді' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.message || 'Қате' });
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-muted py-20 text-sm">Жүктелуде...</div>;
  }
  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-5">

      {/* Аватар + аты */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-5">
          <div className="relative group shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-20 h-20 rounded-3xl object-cover"
                style={{ boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)' }}
              >
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
        </div>
      </div>

      {/* Вкладкалар */}
      <div
        className="glass-panel p-1.5 grid grid-cols-2 gap-1"
        style={{ borderRadius: 18 }}
      >
        <TabBtn active={tab === 'profile'} onClick={() => setTab('profile')}>
          Профиль
        </TabBtn>
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')}>
          Баптаулар
        </TabBtn>
      </div>

      {/* ── ПРОФИЛЬ БЕТІ ── */}
      {tab === 'profile' && (
        <>
          {/* Деректерді өзгерту */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-theme">Профильді өзгерту</h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5"
                >
                  <Pencil size={13} /> Өзгерту
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                {editError && <div className="alert-error">{editError}</div>}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">Аты-жөні</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">Топ</label>
                  <input
                    type="text"
                    value={form.group_name}
                    onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                    className="glass-input"
                    placeholder="P22-2B"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">Био</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={3}
                    className="glass-input"
                    placeholder="Өзіңіз туралы қысқаша..."
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-1.5">
                    <Check size={14} />
                    {saving ? 'Сақталуда...' : 'Сақтау'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditing(false);
                      setEditError('');
                      setForm({ full_name: profile.full_name || '', bio: profile.bio || '', group_name: profile.group_name || '' });
                    }}
                    className="btn-glass px-5 py-2 text-sm flex items-center gap-1.5"
                  >
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

          {/* Telegram */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4 flex items-center gap-2">
              <Send size={16} /> Telegram
            </h3>
            {tgError && <div className="alert-error mb-4">{tgError}</div>}

            {profile.telegram_id ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.12)' }}
                  >
                    <Send size={18} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-theme">Байланыстырылған</div>
                    {profile.telegram_username && (
                      <div className="text-xs text-muted">@{profile.telegram_username}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={unlinkTelegram}
                  className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5"
                  style={{ color: 'var(--clr-danger)' }}
                >
                  <Unlink size={13} /> Ажырату
                </button>
              </div>
            ) : tgCode ? (
              <div className="glass-card p-5" style={{ borderRadius: 14 }}>
                <p className="text-sm text-theme mb-3">Telegram ботында мына команданы жіберіңіз:</p>
                <div className="glass-panel p-3 mb-3 text-center">
                  <code className="text-xl font-mono tracking-widest text-accent">/link {tgCode.code}</code>
                </div>
                <p className="text-xs text-muted mb-3">Код 10 минут жарамды.</p>
                <button onClick={() => setTgCode(null)} className="btn-glass px-4 py-1.5 text-xs">
                  Жасыру
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted mb-4">
                  Telegram-ды байланыстыру арқылы бот арқылы жетістіктерді тіркей аласыз.
                </p>
                <button
                  onClick={generateCode}
                  disabled={generatingCode}
                  className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-2"
                >
                  <Link2 size={14} />
                  {generatingCode ? 'Жасалуда...' : 'Байланыстыру коды'}
                </button>
              </div>
            )}
          </div>

          {/* Менің жетістіктерім */}
          <Link
            to="/my-achievements"
            className="glass-panel p-5 flex items-center justify-between hover-lift"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.12)' }}
              >
                <Award size={18} className="text-accent" />
              </div>
              <div>
                <div className="text-sm font-semibold text-theme">Менің жетістіктерім</div>
                <div className="text-xs text-muted mt-0.5">Барлық тіркелген жетістіктерді көру</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </Link>
        </>
      )}

      {/* ── БАПТАУЛАР БЕТІ ── */}
      {tab === 'settings' && (
        <>
          {/* Тема */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4">Интерфейс тақырыбы</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => dark && toggleTheme()}
                className={`relative p-4 rounded-2xl border-2 smooth flex flex-col items-center gap-2 ${
                  !dark ? 'border-indigo-400/60' : 'border-white/20 hover:border-white/40'
                }`}
                style={{ background: !dark ? 'rgba(99,102,241,0.10)' : 'var(--glass)' }}
              >
                <Sun size={28} className={!dark ? 'text-amber-400' : 'text-muted'} />
                <span className="text-sm font-medium text-theme">Жарық</span>
                {!dark && (
                  <span
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--clr-accent)' }}
                  >
                    <Check size={11} className="text-white" />
                  </span>
                )}
              </button>

              <button
                onClick={() => !dark && toggleTheme()}
                className={`relative p-4 rounded-2xl border-2 smooth flex flex-col items-center gap-2 ${
                  dark ? 'border-indigo-400/60' : 'border-white/20 hover:border-white/40'
                }`}
                style={{ background: dark ? 'rgba(99,102,241,0.10)' : 'var(--glass)' }}
              >
                <Moon size={28} className={dark ? 'text-indigo-300' : 'text-muted'} />
                <span className="text-sm font-medium text-theme">Қараңғы</span>
                {dark && (
                  <span
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--clr-accent)' }}
                  >
                    <Check size={11} className="text-white" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Құпиясөз */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-4 flex items-center gap-2">
              <Lock size={16} /> Құпиясөзді өзгерту
            </h3>

            {pwMsg && (
              <div className={`${pwMsg.ok ? 'alert-success' : 'alert-error'} mb-4`}>
                {pwMsg.text}
              </div>
            )}

            <form onSubmit={handlePassword} className="space-y-4">
              {[
                { key: 'current', label: 'Ағымдағы құпиясөз' },
                { key: 'next', label: 'Жаңа құпиясөз', min: 6, placeholder: 'Кемінде 6 таңба' },
                { key: 'confirm', label: 'Жаңа құпиясөзді растаңыз' },
              ].map(({ key, label, min, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">{label}</label>
                  <div className="relative">
                    <input
                      type={showPw[key] ? 'text' : 'password'}
                      value={pwForm[key]}
                      onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                      required
                      minLength={min}
                      className="glass-input pr-10"
                      placeholder={placeholder || '••••••••'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-theme smooth"
                    >
                      {showPw[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="submit"
                disabled={pwLoading}
                className="btn-primary px-6 py-2.5 rounded-2xl text-sm flex items-center gap-2"
              >
                <Check size={14} />
                {pwLoading ? 'Сақталуда...' : 'Сақтау'}
              </button>
            </form>
          </div>

          {/* Аккаунт ақпараты */}
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

          {/* Жүйе туралы */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold text-theme mb-3 flex items-center gap-2">
              <Info size={16} /> Жүйе туралы
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Жоба</dt>
                <dd className="text-theme">АПК Жетістіктер жүйесі</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Нұсқасы</dt>
                <dd className="text-theme">1.0.0</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">© 2026</dt>
                <dd className="text-theme">Алматы Политехникалық Колледжі</dd>
              </div>
            </dl>
          </div>

          {/* Шығу */}
          <button
            onClick={logout}
            className="w-full glass-panel p-4 flex items-center justify-center gap-2.5 smooth hover:bg-red-500/10 transition-colors cursor-pointer"
            style={{ color: 'var(--clr-danger)', borderRadius: 18 }}
          >
            <LogOut size={17} />
            <span className="text-sm font-semibold">Шығу</span>
          </button>
        </>
      )}
    </div>
  );
}
