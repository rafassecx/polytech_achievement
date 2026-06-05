import { useState, useEffect } from 'react';
import { Send as TelegramIcon } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

const ROLE_LABELS = { student: 'Студент', curator: 'Куратор', admin: 'Admin' };

const ROLE_STYLE = {
  student: { background: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)',  color: '#4338ca' },
  curator: { background: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', color: '#7c3aed' },
  admin:   { background: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#dc2626' },
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const { data } = await api.get('/users', { params });
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [roleFilter, search]);

  const changeRole = async (id, newRole, name) => {
    const ok = await showConfirm(`«${name}» пайдаланушысының рөлін «${ROLE_LABELS[newRole]}» етіп өзгертесіз бе?`);
    if (!ok) { load(); return; }
    try {
      await api.patch(`/users/${id}/role`, { role: newRole });
      setUsers(users.map((u) => u.id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате орын алды');
      load();
    }
  };

  const toggleActive = async (id, isActive, name) => {
    const action = isActive ? 'блоктау' : 'белсендіру';
    const ok = await showConfirm(`«${name}» — ${action}?`, { danger: isActive });
    if (!ok) return;
    try {
      const { data } = await api.patch(`/users/${id}/toggle-active`);
      setUsers(users.map((u) => u.id === id ? { ...u, is_active: data.user.is_active } : u));
    } catch (err) {
      await showAlert(err.response?.data?.message || 'Қате орын алды');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-theme">Пайдаланушылар</h1>
        <p className="text-muted text-sm mt-0.5">Барлығы: {users.length}</p>
      </div>

      {/* Іздеу + сүзгі */}
      <div className="glass-panel p-4 mb-6 flex gap-3 flex-wrap">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Іздеу (аты-жөні немесе email)..."
          className="glass-input flex-1 min-w-52"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="glass-input w-auto min-w-40"
        >
          <option value="">Барлық рөлдер</option>
          <option value="student">Студенттер</option>
          <option value="curator">Кураторлар</option>
          <option value="admin">Adminдер</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-muted py-16">Жүктелуде...</div>
      ) : users.length === 0 ? (
        <div className="glass-panel text-center py-14 text-muted">
          Пайдаланушылар табылмады
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Пайдаланушы</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Топ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Рөл</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden lg:table-cell">Telegram</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Күй</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const rs = ROLE_STYLE[u.role] || ROLE_STYLE.student;
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-white/5 last:border-0 smooth hover:bg-white/5 ${!u.is_active ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-xl object-cover" />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                              style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}
                            >
                              {u.full_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="font-medium text-theme">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden md:table-cell">{u.email}</td>
                      <td className="px-4 py-3 text-muted text-xs hidden sm:table-cell">{u.group_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ background: rs.background, border: `1px solid ${rs.border}`, color: rs.color }}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted hidden lg:table-cell">
                        {u.telegram_id
                          ? <span className="flex items-center gap-1"><TelegramIcon size={12} /> @{u.telegram_username || ''}</span>
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className="text-xs font-medium"
                          style={{ color: u.is_active ? 'var(--clr-success)' : 'var(--clr-danger)' }}
                        >
                          {u.is_active ? '● Белсенді' : '● Блокталған'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.id === me.id ? (
                          <span className="text-xs text-muted italic">Бұл сіз</span>
                        ) : (
                          <div className="flex gap-2 justify-end items-center">
                            <select
                              value={u.role}
                              onChange={(e) => changeRole(u.id, e.target.value, u.full_name)}
                              className="glass-input w-auto text-xs py-1 px-2"
                              style={{ borderRadius: 10, minWidth: 90 }}
                            >
                              <option value="student">Студент</option>
                              <option value="curator">Куратор</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => toggleActive(u.id, u.is_active, u.full_name)}
                              className="btn-glass text-xs px-2.5 py-1"
                              style={u.is_active
                                ? { color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }
                                : { color: '#059669', borderColor: 'rgba(5,150,105,0.3)' }
                              }
                            >
                              {u.is_active ? 'Блок' : 'Жаю'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
