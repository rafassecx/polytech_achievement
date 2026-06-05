import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, Trophy, Plus, MessageSquare, ClipboardList, Users } from 'lucide-react';
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

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">

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

        {/* Навигация */}
        <nav className="flex items-center gap-0.5 md:gap-1">
          <NavLink to="/" className={lc} end>
            <Home size={15} />
            <span className="hidden md:inline">Басты бет</span>
          </NavLink>
          <NavLink to="/leaderboard" className={lc}>
            <Trophy size={15} />
            <span className="hidden md:inline">Рейтинг</span>
          </NavLink>

          {user && (
            <>
              {(user.role === 'curator' || user.role === 'admin') && (
                <NavLink to="/moderation" className={lc}>
                  <ClipboardList size={15} />
                  <span className="hidden md:inline">Тексеру</span>
                </NavLink>
              )}
              {user.role === 'admin' && (
                <NavLink to="/admin/users" className={lc}>
                  <Users size={15} />
                  <span className="hidden md:inline">Басқару</span>
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

              {/* Жетістік қосу — тек иконка, ерекше түс */}
              <NavLink
                to="/add"
                className={({ isActive }) =>
                  `w-9 h-9 rounded-2xl flex items-center justify-center smooth transition-all ${
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
  );
}
