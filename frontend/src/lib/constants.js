export const CATEGORIES = ['academic', 'sport', 'cultural', 'social', 'other'];

export const CATEGORY_EMOJI = {
  academic: '📚',
  sport: '⚽',
  cultural: '🎭',
  social: '🤝',
  other: '✨',
};

export const CATEGORY_LABELS = {
  academic: 'Оқу',
  sport: 'Спорт',
  cultural: 'Мәдениет',
  social: 'Қоғамдық',
  other: 'Басқа',
};

export const STATUS_LABELS = {
  pending: 'Модерацияда',
  approved: 'Бекітілген',
  rejected: 'Бас тартылған',
};

// Стильдер — glassmorphism-ге лайық (CSS variable арқылы жарық/қараңғы тема)
export const STATUS_GLASS = {
  pending:  { background: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.30)',  color: '#d97706' },
  approved: { background: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.30)',  color: '#059669' },
  rejected: { background: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.30)',   color: '#dc2626' },
};

// Ескі экспорт (backward compat)
export const statusColors = {
  pending:  'border',
  approved: 'border',
  rejected: 'border',
};
