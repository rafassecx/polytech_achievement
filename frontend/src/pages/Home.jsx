import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, GraduationCap, CalendarDays, Heart, MessageCircle, Trophy, ChevronRight, Flame, Plus, BookOpen, Dumbbell, Star, Palette, Handshake, Award } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORIES, CATEGORY_LABELS } from '../lib/constants';
import { CategoryBadgeIcon, CategoryCardIcon } from '../components/CategoryIcon';

const MEDALS = ['🥇', '🥈', '🥉'];

function StatCard({ Icon, iconColor, iconBg, value, label }) {
  return (
    <div className="glass-card p-3 sm:p-5 text-center">
      <div
        className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3"
        style={{ background: iconBg }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div className="text-xl sm:text-2xl font-bold text-theme">{value ?? '—'}</div>
      <div className="text-[11px] sm:text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}

function MiniLeaderboard({ students }) {
  if (!students || students.length === 0) return null;

  return (
    <div className="glass-panel p-4 flex-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Trophy size={14} className="text-accent" />
          <span className="text-sm font-semibold text-theme">Үздік студенттер</span>
        </div>
        <Link
          to="/leaderboard"
          className="text-xs text-accent hover:underline flex items-center gap-0.5 smooth"
        >
          Барлығы <ChevronRight size={12} />
        </Link>
      </div>

      <div className="space-y-2">
        {students.slice(0, 3).map((s, i) => (
          <div key={s.id} className="flex items-center gap-2.5">
            <span className="w-5 text-center text-sm shrink-0">{MEDALS[i]}</span>

            {s.avatar_url ? (
              <img src={s.avatar_url} alt="" className="w-7 h-7 rounded-xl object-cover shrink-0" />
            ) : (
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}
              >
                {s.full_name?.charAt(0) || '?'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-theme truncate">{s.full_name}</div>
              {s.group_name && <div className="text-[10px] text-muted">{s.group_name}</div>}
            </div>

            <div
              className="text-sm font-bold shrink-0"
              style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7c2f' }}
            >
              {s.total}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthCard({ stats, user }) {
  const topLabel = stats?.top_category
    ? { academic: 'Оқу', sport: 'Спорт', cultural: 'Мәдениет', social: 'Қоғамдық', other: 'Басқа' }[stats.top_category]
    : null;

  return (
    <div className="glass-panel p-4 flex-1 flex flex-col justify-between">
      <div className="flex items-center gap-1.5 mb-3">
        <Flame size={14} style={{ color: '#f97316' }} />
        <span className="text-sm font-semibold text-theme">Осы айда</span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.12)' }}
          >
            <CalendarDays size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <div className="text-xl font-bold text-theme">{stats?.this_month ?? 0}</div>
            <div className="text-[11px] text-muted">жаңа жетістік</div>
          </div>
        </div>

        {topLabel && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Үздік санат:</span>
            <span className="font-medium text-theme">{topLabel}</span>
          </div>
        )}
      </div>

      <Link
        to={user ? '/add' : '/register'}
        className="mt-3 btn-primary w-full py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
      >
        <Plus size={13} />
        {user ? 'Жетістік қосу' : 'Тіркелу'}
      </Link>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [topStudents, setTopStudents] = useState([]);

  useEffect(() => {
    api.get('/stats/summary').then((r) => setStats(r.data)).catch(() => {});
    api.get('/stats/leaderboard?limit=5').then((r) => setTopStudents(r.data.students)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: 'approved' });
    if (filter) params.append('category', filter);
    api.get(`/achievements?${params}`)
      .then((r) => setAchievements(r.data.achievements))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">

      <div className="glass-card overflow-hidden mb-6 relative">

        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.12 }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 0%, var(--glass) 80%)' }} />
        </div>

        <div className="relative z-10 px-5 py-8 sm:px-8 sm:py-12 flex flex-col md:flex-row items-center gap-8">

          <div className="flex-1 text-center md:text-left">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto md:mx-0"
              style={{ background: 'rgba(245,158,11,0.18)', backdropFilter: 'blur(10px)' }}
            >
              <GraduationCap size={28} style={{ color: '#f59e0b' }} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-theme mb-2 leading-tight">
              Студент жетістіктері
            </h1>
            <p className="text-muted text-base max-w-md mb-6">
              Олимпиадалар, спорт жарыстары, шығармашылық жобалар — барлығын бір жерде
            </p>
            <div className="flex justify-center md:justify-start flex-wrap gap-3">
              {!user ? (
                <>
                  <Link to="/register" className="btn-primary px-6 py-2.5 rounded-2xl text-sm">
                    Тіркелу
                  </Link>
                  <Link to="/login" className="btn-glass px-6 py-2.5 text-sm rounded-xl">
                    Кіру
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/add" className="btn-primary px-6 py-2.5 rounded-2xl text-sm">
                    + Жетістік қосу
                  </Link>
                  <Link to="/leaderboard" className="btn-glass px-6 py-2.5 text-sm rounded-xl">
                    Рейтинг
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:block shrink-0 relative" style={{ width: 280, height: 240 }}>

            <div className="absolute rounded-full border border-indigo-400/20"
              style={{ width: 220, height: 220, top: 10, left: 30 }} />
            <div className="absolute rounded-full border border-violet-400/12"
              style={{ width: 155, height: 155, top: 43, left: 63 }} />

            <div className="absolute z-20 flex items-center justify-center"
              style={{ width: 72, height: 72, top: 84, left: 104,
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                borderRadius: 22,
                boxShadow: '0 14px 44px rgba(99,102,241,0.48), 0 0 0 7px rgba(99,102,241,0.10)' }}>
              <Trophy size={32} className="text-white" strokeWidth={1.5} />
            </div>

            <div className="absolute z-10 flex items-center justify-center rounded-2xl"
              style={{ width: 42, height: 42, top: 14, left: 119,
                background: 'rgba(99,102,241,0.14)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(99,102,241,0.28)',
                animation: 'orbFloat 6s ease-in-out infinite alternate', '--ty': '-9px' }}>
              <BookOpen size={18} style={{ color: '#818cf8' }} />
            </div>

            <div className="absolute z-10 flex items-center justify-center rounded-2xl"
              style={{ width: 42, height: 42, top: 99, left: 18,
                background: 'rgba(239,68,68,0.13)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(239,68,68,0.22)',
                animation: 'orbFloat 7s ease-in-out infinite alternate', '--tx': '-9px', animationDelay: '-2.5s' }}>
              <Dumbbell size={18} style={{ color: '#f87171' }} />
            </div>

            <div className="absolute z-10 flex items-center justify-center rounded-2xl"
              style={{ width: 42, height: 42, top: 99, right: 14,
                background: 'rgba(245,158,11,0.14)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(245,158,11,0.26)',
                animation: 'orbFloat 5s ease-in-out infinite alternate', '--tx': '9px', animationDelay: '-1s' }}>
              <Star size={18} style={{ color: '#f59e0b' }} />
            </div>

            <div className="absolute z-10 flex items-center justify-center rounded-2xl"
              style={{ width: 42, height: 42, bottom: 14, left: 119,
                background: 'rgba(16,185,129,0.13)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(16,185,129,0.24)',
                animation: 'orbFloat 8s ease-in-out infinite alternate', '--ty': '9px', animationDelay: '-4s' }}>
              <GraduationCap size={18} style={{ color: '#34d399' }} />
            </div>

            <div className="absolute z-10 flex items-center justify-center rounded-2xl"
              style={{ width: 38, height: 38, top: 42, left: 46,
                background: 'rgba(139,92,246,0.13)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(139,92,246,0.25)',
                animation: 'orbFloat 9s ease-in-out infinite alternate', '--tx': '-7px', '--ty': '-7px', animationDelay: '-1.8s' }}>
              <Palette size={16} style={{ color: '#a78bfa' }} />
            </div>

            <div className="absolute z-10 flex items-center justify-center rounded-2xl"
              style={{ width: 38, height: 38, top: 42, right: 30,
                background: 'rgba(20,184,166,0.13)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(20,184,166,0.25)',
                animation: 'orbFloat 7.5s ease-in-out infinite alternate', '--tx': '7px', '--ty': '-7px', animationDelay: '-6s' }}>
              <Handshake size={16} style={{ color: '#2dd4bf' }} />
            </div>

            <div className="absolute z-10 flex items-center justify-center rounded-2xl"
              style={{ width: 38, height: 38, bottom: 42, right: 30,
                background: 'rgba(245,158,11,0.13)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(245,158,11,0.24)',
                animation: 'orbFloat 6s ease-in-out infinite alternate', '--tx': '7px', '--ty': '7px', animationDelay: '-3s' }}>
              <Award size={16} style={{ color: '#fbbf24' }} />
            </div>

          </div>

        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-7">
          <StatCard
            Icon={CheckCircle2}
            iconColor="#059669"
            iconBg="rgba(16,185,129,0.12)"
            value={stats.total_approved}
            label="Жетістіктер"
          />
          <StatCard
            Icon={GraduationCap}
            iconColor="#6366f1"
            iconBg="rgba(99,102,241,0.12)"
            value={stats.total_students}
            label="Студенттер"
          />
          <StatCard
            Icon={CalendarDays}
            iconColor="#8b5cf6"
            iconBg="rgba(139,92,246,0.12)"
            value={stats.this_month}
            label="Осы ай"
          />
        </div>
      )}

      {(topStudents.length > 0 || stats) && (
        <div className="flex flex-col sm:flex-row gap-4 mb-7">
          <MiniLeaderboard students={topStudents} />
          <MonthCard stats={stats} user={user} />
        </div>
      )}

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium smooth ${
            filter === '' ? 'btn-primary' : 'btn-glass'
          }`}
        >
          Барлығы
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium smooth ${
              filter === cat ? 'btn-primary' : 'btn-glass'
            }`}
          >
            <CategoryBadgeIcon category={cat} size={13} />
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted py-16 text-sm">Жүктелуде...</div>
      ) : achievements.length === 0 ? (
        <div className="glass-panel text-center py-14 px-8 flex flex-col items-center">
          <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-5 opacity-60">
            <circle cx="60" cy="52" r="38" fill="rgba(99,102,241,0.08)" />
            <rect x="32" y="44" width="36" height="26" rx="4" fill="rgba(99,102,241,0.18)" />
            <rect x="32" y="44" width="3" height="26" rx="1.5" fill="rgba(99,102,241,0.4)" />
            <line x1="38" y1="52" x2="62" y2="52" stroke="rgba(99,102,241,0.5)" strokeWidth="2" strokeLinecap="round" />
            <line x1="38" y1="58" x2="60" y2="58" stroke="rgba(99,102,241,0.35)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="38" y1="63" x2="56" y2="63" stroke="rgba(99,102,241,0.25)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M76 28 L78 34 L84 34 L79.5 38 L81.5 44 L76 40.5 L70.5 44 L72.5 38 L68 34 L74 34 Z" fill="rgba(245,158,11,0.55)" />
            <circle cx="82" cy="62" r="10" fill="rgba(16,185,129,0.2)" />
            <path d="M77.5 62 L80.5 65 L86 59" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-theme font-semibold text-base mb-1">Жетістіктер жоқ</p>
          <p className="text-muted text-sm">
            {filter ? 'Бұл санатта расталған жетістіктер жоқ' : 'Алғашқы жетістіктерді күтуде'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {achievements.map((a) => (
            <Link to={`/achievements/${a.id}`} key={a.id} className="block group">
              <article className="glass-card overflow-hidden h-full hover-lift flex flex-col">
                {a.preview_image ? (
                  <img src={a.preview_image} alt={a.title} className="w-full h-44 object-cover shrink-0" />
                ) : (
                  <div className="w-full h-44 shrink-0">
                    <CategoryCardIcon category={a.category} />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="badge mb-3 flex items-center gap-1.5 w-fit">
                    <CategoryBadgeIcon category={a.category} size={12} />
                    {CATEGORY_LABELS[a.category] || a.category}
                  </div>
                  <h3 className="font-semibold text-theme text-base leading-snug mb-2 line-clamp-2 group-hover:text-accent smooth">
                    {a.title}
                  </h3>
                  {a.description && (
                    <p className="text-muted text-sm line-clamp-2 mb-2">{a.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-xs text-muted pt-3 border-t border-white/20">
                    <span className="truncate max-w-32">{a.author_name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1">
                        <Heart size={11} /> {a.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={11} /> {a.comments_count || 0}
                      </span>
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
