import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Users, Award, MessageSquare, ArrowLeft, Trophy } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS = { student: 'Студент', curator: 'Куратор', admin: 'Admin' };

function MemberAvatar({ name, src }) {
  if (src) {
    return <img src={src} alt={name} className="w-10 h-10 rounded-2xl object-cover shrink-0" />;
  }
  return (
    <div
      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shrink-0"
      style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

export default function GroupProfile() {
  const { groupName } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/group/${encodeURIComponent(groupName)}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupName]);

  const openGroupChat = () => {
    navigate('/chat', { state: { openGroup: groupName } });
  };

  if (loading) {
    return <div className="text-center text-muted py-20">Жүктелуде...</div>;
  }

  if (!data || data.member_count === 0) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <div
          className="w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(99,102,241,0.10)' }}
        >
          <Users size={24} className="text-accent" />
        </div>
        <h1 className="text-xl font-bold text-theme mb-2">{groupName}</h1>
        <p className="text-muted text-sm mb-4">Топта мүшелер жоқ</p>
        <Link to="/" className="text-accent hover:underline text-sm">Басты бетке</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8">
      <button
        onClick={() => window.history.back()}
        className="text-muted hover:text-theme text-sm inline-flex items-center gap-1.5 mb-6 smooth"
      >
        <ArrowLeft size={14} /> Артқа
      </button>

      {/* Топ тақырыбы */}
      <div className="glass-card p-7 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(167,139,250,0.18))',
              border: '1.5px solid rgba(99,102,241,0.3)',
            }}
          >
            <Users size={28} className="text-accent" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-theme">{data.group_name}</h1>
            <p className="text-sm text-muted mt-1">Алматы Политехникалық Колледжі</p>
            <div className="flex items-center gap-5 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm">
                <Users size={14} className="text-accent" />
                <span className="font-semibold text-theme">{data.member_count}</span>
                <span className="text-muted">мүше</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Trophy size={14} className="text-accent" />
                <span className="font-semibold text-theme">{data.total_achievements}</span>
                <span className="text-muted">жетістік</span>
              </div>
            </div>
          </div>

          {user && (
            <button
              onClick={openGroupChat}
              className="btn-primary px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2 shrink-0"
            >
              <MessageSquare size={15} /> Топтық чат
            </button>
          )}
        </div>
      </div>

      {/* Мүшелер тізімі */}
      <h2 className="text-base font-semibold text-theme mb-4 flex items-center gap-2">
        <Users size={16} className="text-accent" /> Мүшелер ({data.member_count})
      </h2>

      <div className="space-y-2">
        {data.members.map((m, i) => (
          <Link to={`/users/${m.id}`} key={m.id} className="block group">
            <div className="glass-panel p-4 flex items-center gap-3 hover-lift" style={{ borderRadius: 16 }}>
              <span className="w-7 text-center text-xs font-bold text-muted shrink-0">{i + 1}</span>
              <MemberAvatar name={m.full_name} src={m.avatar_url} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-theme group-hover:text-accent smooth truncate">
                  {m.full_name}
                </div>
                <div className="text-xs text-muted">{ROLE_LABELS[m.role] || m.role}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Award size={13} className="text-accent" />
                <span className="text-sm font-semibold text-theme">{m.achievements_count}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
