import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, GraduationCap, CalendarDays, Heart, MessageCircle, Trophy, ChevronRight, Flame, Plus } from 'lucide-react';
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

      {/* Hero */}
      <div className="glass-card px-5 py-7 sm:px-8 sm:py-10 mb-6 text-center">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(245,158,11,0.15)' }}
        >
          <GraduationCap size={32} style={{ color: '#f59e0b' }} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-theme mb-2 leading-tight">
          Студент жетістіктері
        </h1>
        <p className="text-muted text-base max-w-xl mx-auto mb-6">
          Олимпиадалар, спорт жарыстары, шығармашылық жобалар — барлығын бір жерде
        </p>
        <div className="flex justify-center flex-wrap gap-3">
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

      {/* Статистика карточкалары */}
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

      {/* Мини-рейтинг + осы айда */}
      {(topStudents.length > 0 || stats) && (
        <div className="flex flex-col sm:flex-row gap-4 mb-7">
          <MiniLeaderboard students={topStudents} />
          <MonthCard stats={stats} user={user} />
        </div>
      )}

      {/* Санат сүзгісі */}
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

      {/* Жетістіктер торы */}
      {loading ? (
        <div className="text-center text-muted py-16 text-sm">Жүктелуде...</div>
      ) : achievements.length === 0 ? (
        <div className="glass-panel text-center py-16 text-muted text-sm">
          Расталған жетістіктер жоқ
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {achievements.map((a) => (
            <Link to={`/achievements/${a.id}`} key={a.id} className="block group">
              <article className="glass-card overflow-hidden h-full hover-lift">
                {a.preview_image ? (
                  <img src={a.preview_image} alt={a.title} className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44">
                    <CategoryCardIcon category={a.category} />
                  </div>
                )}
                <div className="p-5">
                  <div className="badge mb-3 flex items-center gap-1.5 w-fit">
                    <CategoryBadgeIcon category={a.category} size={12} />
                    {CATEGORY_LABELS[a.category] || a.category}
                  </div>
                  <h3 className="font-semibold text-theme text-base leading-snug mb-2 line-clamp-2 group-hover:text-accent smooth">
                    {a.title}
                  </h3>
                  {a.description && (
                    <p className="text-muted text-sm line-clamp-2 mb-4">{a.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted pt-3 border-t border-white/20">
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
