import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import api from '../lib/api';
import { CATEGORY_LABELS } from '../lib/constants';
import { CategoryBadgeIcon, CategoryCardIcon } from '../components/CategoryIcon';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookmarks')
      .then((r) => setBookmarks(r.data.bookmarks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.12)' }}
        >
          <Bookmark size={18} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-theme">Таңдаулылар</h1>
          <p className="text-muted text-sm mt-0.5">Сақталған жетістіктер: {bookmarks.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted py-16 text-sm">Жүктелуде...</div>
      ) : bookmarks.length === 0 ? (
        <div className="glass-panel text-center py-14 px-8 flex flex-col items-center">
          <svg width="110" height="100" viewBox="0 0 110 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-5 opacity-55">
            <circle cx="55" cy="52" r="36" fill="rgba(99,102,241,0.08)" />
            {/* Кітапша */}
            <rect x="30" y="30" width="28" height="38" rx="4" fill="rgba(99,102,241,0.15)" />
            <path d="M30 34 Q44 30 58 34 L58 68 Q44 64 30 68 Z" fill="rgba(99,102,241,0.22)" />
            {/* Жер белгісі */}
            <path d="M68 24 L68 52 L61 46 L54 52 L54 24 Z" fill="rgba(245,158,11,0.55)" stroke="rgba(245,158,11,0.8)" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <p className="text-theme font-semibold text-base mb-1">Таңдаулылар жоқ</p>
          <p className="text-muted text-sm mb-4">Жетістіктерді таңдаулыларға қосыңыз</p>
          <Link to="/" className="text-accent text-sm hover:underline font-medium">
            Жетістіктерді қарау
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bookmarks.map((a) => (
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
                  <h3 className="font-semibold text-theme text-base leading-snug mb-1 line-clamp-2 group-hover:text-accent smooth">
                    {a.title}
                  </h3>
                  {a.description && (
                    <p className="text-muted text-sm line-clamp-2 mb-2">{a.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-xs text-muted pt-3 border-t border-white/20">
                    <Link
                      to={`/users/${a.user_id}`}
                      className="truncate max-w-32 hover:text-accent smooth"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {a.author_name}
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1"><Heart size={11} /> {a.likes_count || 0}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={11} /> {a.comments_count || 0}</span>
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
