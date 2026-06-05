import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { CategoryBadgeIcon } from '../components/CategoryIcon';

const MEDALS = ['🥇', '🥈', '🥉'];

function Avatar({ name, src }) {
  if (src) {
    return <img src={src} alt={name} className="w-12 h-12 rounded-2xl object-cover" />;
  }
  return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
      style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

export default function Leaderboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');

  const load = async (group = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 20 });
      if (group) params.append('group', group);
      const { data } = await api.get(`/stats/leaderboard?${params}`);
      setStudents(data.students);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Топтар тізімін жүктеу (пайдаланушылардан алу)
  const loadGroups = async () => {
    try {
      const { data } = await api.get('/users?role=student&limit=200');
      const uniq = [...new Set(data.users.map((u) => u.group_name).filter(Boolean))].sort();
      setGroups(uniq);
    } catch { /* тыныш */ }
  };

  useEffect(() => {
    load();
    loadGroups();
  }, []);

  const handleGroup = (g) => {
    setGroupFilter(g);
    load(g);
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-theme">🏆 Рейтинг кестесі</h1>
        <p className="text-muted text-sm mt-1">
          Бекітілген жетістіктер санына қарай үздік студенттер
        </p>
      </div>

      {/* Топ сүзгісі */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => handleGroup('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium smooth ${
              groupFilter === '' ? 'btn-primary' : 'btn-glass'
            }`}
          >
            Барлық топтар
          </button>
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => handleGroup(g)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium smooth ${
                groupFilter === g ? 'btn-primary' : 'btn-glass'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted py-16">Жүктелуде...</div>
      ) : students.length === 0 ? (
        <div className="glass-panel text-center py-14">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-muted text-sm">Деректер жоқ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s, i) => (
            <div
              key={s.id}
              className={`glass-card p-4 flex items-center gap-4 hover-lift ${
                i === 0 ? 'ring-2 ring-amber-400/40' : ''
              }`}
            >
              {/* Орын */}
              <div className="w-10 text-center shrink-0">
                {i < 3 ? (
                  <span className="text-2xl">{MEDALS[i]}</span>
                ) : (
                  <span className="text-lg font-bold text-muted">{i + 1}</span>
                )}
              </div>

              {/* Аватар */}
              <Avatar name={s.full_name} src={s.avatar_url} />

              {/* Аты / топ */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-theme text-sm truncate">{s.full_name}</div>
                {s.group_name && (
                  <div className="text-xs text-muted mt-0.5">{s.group_name}</div>
                )}
                {/* Санат таратылуы */}
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {['academic', 'sport', 'cultural', 'social', 'other'].map((cat) =>
                    s[cat] > 0 ? (
                      <span key={cat} className="text-xs text-muted flex items-center gap-0.5">
                        <CategoryBadgeIcon category={cat} size={11} />
                        {s[cat]}
                      </span>
                    ) : null
                  )}
                </div>
              </div>

              {/* Жетістік саны */}
              <div className="shrink-0 text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : 'var(--clr-accent)' }}
                >
                  {s.total}
                </div>
                <div className="text-[10px] text-muted">жетістік</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/" className="text-accent text-sm hover:underline">
          ← Жаңалықтарға оралу
        </Link>
      </div>
    </div>
  );
}
