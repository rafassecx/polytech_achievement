import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.split('-')[0] || 'kk';

  const switchTo = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex items-center text-xs border border-white/20 rounded overflow-hidden">
      <button
        onClick={() => switchTo('kk')}
        className={`px-2 py-1 transition ${
          current === 'kk' ? 'bg-gold text-navy font-semibold' : 'text-white/70 hover:text-white'
        }`}
      >
        ҚАЗ
      </button>
      <button
        onClick={() => switchTo('ru')}
        className={`px-2 py-1 transition ${
          current === 'ru' ? 'bg-gold text-navy font-semibold' : 'text-white/70 hover:text-white'
        }`}
      >
        РУС
      </button>
    </div>
  );
}