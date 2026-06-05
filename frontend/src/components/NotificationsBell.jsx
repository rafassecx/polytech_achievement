import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../lib/api';

const typeEmoji = {
  comment: '💬',
  like: '❤️',
  achievement_approved: '✅',
  achievement_rejected: '❌',
  new_pending: '📋',
};

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'жаңа';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} сағ`;
  return `${Math.floor(h / 24)} күн`;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Закрываем при клике вне
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadCount = async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setCount(data.count);
    } catch { /* тыныш */ }
  };

  useEffect(() => {
    loadCount();
    const iv = setInterval(loadCount, 30000);
    return () => clearInterval(iv);
  }, []);

  const loadList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications?limit=20');
      setItems(data.notifications);
    } catch { /* тыныш */ }
    setLoading(false);
  };

  const toggle = () => {
    if (!open) loadList();
    setOpen(!open);
  };

  const handleClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}/read`);
        setItems(items.map(i => i.id === n.id ? { ...i, is_read: true } : i));
        setCount(Math.max(0, count - 1));
      } catch { /* тыныш */ }
    }
    if (n.related_id) navigate(`/achievements/${n.related_id}`);
    setOpen(false);
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems(items.map(i => ({ ...i, is_read: true })));
      setCount(0);
    } catch { /* тыныш */ }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="btn-glass px-2.5 py-2 leading-none relative flex items-center justify-center"
        aria-label="Хабарландырулар"
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full min-w-4.25 h-4.25 px-1 flex items-center justify-center"
            style={{ background: 'var(--clr-danger)' }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 glass-panel z-50 overflow-hidden flex flex-col max-h-115">
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <span className="text-sm font-semibold text-theme">Хабарландырулар</span>
            {count > 0 && (
              <button onClick={markAllRead} className="text-xs text-accent hover:underline">
                Барлығын оқу
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="text-center text-muted py-8 text-sm">Жүктелуде...</div>
            ) : items.length === 0 ? (
              <div className="text-center text-muted py-8 text-sm">Хабарландырулар жоқ</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 smooth border-b border-white/5 last:border-0 ${
                    !n.is_read ? 'bg-white/5' : ''
                  } hover:bg-white/10`}
                >
                  <span className="text-xl shrink-0">{typeEmoji[n.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-theme leading-tight">{n.title}</div>
                    {n.message && (
                      <div className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</div>
                    )}
                    <div className="text-xs text-muted mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--clr-accent)' }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
