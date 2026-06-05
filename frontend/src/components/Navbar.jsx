import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, Trophy, Plus, MessageSquare, ClipboardList, Users, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NotificationsBell from './NotificationsBell';
import api from '../lib/api';

export default function Navbar() {
  const { user } = useAuth();
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data } = await api.get('/messages/unread-count');
        setUnreadMsgs(data.count);
      } catch { /* тыныш */ }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [user]);

  const lc = ({ isActive }) =>
    `flex items-center gap-1.5 text-sm font-medium smooth px-2 py-1.5 rounded-lg transition-colors ${
      isActive ? 'text-accent' : 'text-muted hover:text-theme'
    }`;

  // Нижняя навигация для мобильных
  const bottomLinkCls = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-xl smooth min-w-0 ${
      isActive ? 'text-accent' : 'text-muted'
    }`;

  // Средняя кнопка для разных ролей
  const midItem = user
    ? user.role === 'admin'
      ? { to: '/admin/users', Icon: Users, label: 'Басқару' }
      : user.role === 'curator'
      ? { to: '/moderation', Icon: ClipboardList, label: 'Тексеру' }
      : { to: '/add', Icon: Plus, label: 'Қосу', isAdd: true }
    : null;

  return (
    <>
      {/* ═══ ЖОҒАРҒЫ NAVBAR ═══ */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

          {/* Логотип */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)' }}
            >
              АПК
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-semibold text-theme">Жетістіктер жүйесі</div>
              <div className="text-[10px] text-muted">Алматы Политехникалық Колледжі</div>
            </div>
          </Link>

          {/* Десктоп навигация (md+) */}
          <nav className="hidden md:flex items-center gap-0.5">
            <NavLink to="/" className={lc} end>
              <Home size={15} />
              <span>Басты бет</span>
            </NavLink>
            <NavLink to="/leaderboard" className={lc}>
              <Trophy size={15} />
              <span>Рейтинг</span>
            </NavLink>
            {user && (
              <>
                {(user.role === 'curator' || user.role === 'admin') && (
                  <NavLink to="/moderation" className={lc}>
                    <ClipboardList size={15} />
                    <span>Тексеру</span>
                  </NavLink>
                )}
                {user.role === 'admin' && (
                  <NavLink to="/admin/users" className={lc}>
                    <Users size={15} />
                    <span>Басқару</span>
                  </NavLink>
                )}
              </>
            )}
          </nav>

          {/* Оң жақ */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                {/* Чат — иконка ғана */}
                <NavLink
                  to="/chat"
                  className={({ isActive }) =>
                    `relative btn-glass px-2.5 py-2 flex items-center justify-center smooth ${
                      isActive ? 'text-accent' : ''
                    }`
                  }
                  title="Чат"
                >
                  <MessageSquare size={17} />
                  {unreadMsgs > 0 && (
                    <span
                      className="absolute -top-1 -right-1 text-white text-[9px] font-bold rounded-full min-w-4 h-4 flex items-center justify-center px-0.5"
                      style={{ background: 'var(--clr-accent)' }}
                    >
                      {unreadMsgs > 9 ? '9+' : unreadMsgs}
                    </span>
                  )}
                </NavLink>

                <NotificationsBell />

                {/* Жетістік қосу — тек десктопта */}
                <NavLink
                  to="/add"
                  className={({ isActive }) =>
                    `hidden md:flex w-9 h-9 rounded-2xl items-center justify-center smooth transition-all ${
                      isActive ? 'opacity-90 scale-95' : 'hover:scale-105'
                    }`
                  }
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}
                  title="Жетістік қосу"
                >
                  <Plus size={18} className="text-white" strokeWidth={2.5} />
                </NavLink>

                {/* Профиль аватары */}
                <NavLink
                  to="/profile"
                  className="block rounded-2xl smooth hover:opacity-90"
                  title={user.full_name}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-9 h-9 rounded-2xl object-cover"
                      style={{ boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)' }}
                    >
                      {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </NavLink>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-glass px-3 py-2 text-xs">Кіру</Link>
                <Link to="/register" className="btn-primary px-3 py-2 text-xs rounded-xl">
                  Тіркелу
                </Link>
              </>
            )}
          </div>

        </div>
      </header>

      {/* ═══ ТӨМЕНГІ МОБИЛЬДІ НАВИГАЦИЯ (md-ге дейін) ═══ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
        style={{ background: 'var(--glass-nav)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-around px-2 py-1 pb-safe">
          <NavLink to="/" className={bottomLinkCls} end>
            <Home size={21} />
            <span className="text-[10px] font-medium">Басты</span>
          </NavLink>

          <NavLink to="/leaderboard" className={bottomLinkCls}>
            <Trophy size={21} />
            <span className="text-[10px] font-medium">Рейтинг</span>
          </NavLink>

          {user ? (
            midItem?.isAdd ? (
              <NavLink
                to="/add"
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', boxShadow: '0 4px 18px rgba(16,185,129,0.5)' }}
                >
                  <Plus size={26} className="text-white" strokeWidth={2.5} />
                </div>
              </NavLink>
            ) : midItem ? (
              <NavLink to={midItem.to} className={bottomLinkCls}>
                <midItem.Icon size={21} />
                <span className="text-[10px] font-medium">{midItem.label}</span>
              </NavLink>
            ) : null
          ) : (
            <div className="w-14" />
          )}

          {user ? (
            <NavLink to="/chat" className={({ isActive }) => `${bottomLinkCls({ isActive })} relative`}>
              <div className="relative">
                <MessageSquare size={21} />
                {unreadMsgs > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-white text-[8px] font-bold rounded-full min-w-3.5 h-3.5 flex items-center justify-center"
                    style={{ background: 'var(--clr-accent)' }}
                  >
                    {unreadMsgs > 9 ? '9+' : unreadMsgs}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">Чат</span>
            </NavLink>
          ) : (
            <NavLink to="/login" className={bottomLinkCls}>
              <UserCircle size={21} />
              <span className="text-[10px] font-medium">Кіру</span>
            </NavLink>
          )}

          {user ? (
            <NavLink to="/profile" className={bottomLinkCls}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-lg object-cover" />
              ) : (
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}
                >
                  {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <span className="text-[10px] font-medium">Профиль</span>
            </NavLink>
          ) : (
            <NavLink to="/register" className={bottomLinkCls}>
              <Plus size={21} />
              <span className="text-[10px] font-medium">Тіркелу</span>
            </NavLink>
          )}
        </div>
      </nav>
    </>
  );
}
