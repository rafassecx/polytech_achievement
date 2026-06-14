import { BookOpen, Dumbbell, Palette, Handshake, Sparkles } from 'lucide-react';

const MAP = {
  academic: { Icon: BookOpen,  color: '#6366f1', bg: 'rgba(99,102,241,0.15)'  },
  sport:    { Icon: Dumbbell,  color: '#ef4444', bg: 'rgba(239,68,68,0.15)'   },
  cultural: { Icon: Palette,   color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  social:   { Icon: Handshake, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  other:    { Icon: Sparkles,  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
};

// Маленькая инлайн-иконка для бейджей
export function CategoryBadgeIcon({ category, size = 13 }) {
  const item = MAP[category] || MAP.other;
  return <item.Icon size={size} style={{ color: item.color }} className="shrink-0" />;
}

// Большая иконка с фоном для карточки (когда нет preview)
export function CategoryCardIcon({ category, className = '' }) {
  const item = MAP[category] || MAP.other;
  return (
    <div
      className={`w-full h-full flex items-center justify-center relative overflow-hidden ${className}`}
      style={{ background: item.bg }}
    >
      {/* Нүктелі тор паттерні */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.18 }}
        aria-hidden="true"
      >
        <defs>
          <pattern id={`dots-${category}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill={item.color} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${category})`} />
      </svg>
      <item.Icon size={44} style={{ color: item.color }} strokeWidth={1.5} className="relative z-10" />
    </div>
  );
}
