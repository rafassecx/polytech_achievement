import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { CATEGORIES, CATEGORY_EMOJI } from '../lib/constants';


export default function AddAchievement() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const CATEGORY_LABELS = {
    academic: t('achievements.category.academic'),
    sport: t('achievements.category.sport'),
    cultural: t('achievements.category.cultural'),
    social: t('achievements.category.social'),
    other: t('achievements.category.other'),
  };
  const [form, setForm] = useState({
    title: '', description: '', category: 'academic', event_date: ''
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const handleFiles = (e) => setFiles(Array.from(e.target.files));
  const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setProgress(t('add.creating'));
    try {
      const { data } = await api.post('/achievements', form);
      const achievementId = data.achievement.id;
      if (files.length > 0) {
        setProgress(`${t('add.uploading')} (${files.length})...`);
        const fd = new FormData();
        files.forEach((file) => fd.append('files', file));
        await api.post(`/upload/${achievementId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      navigate(`/achievements/${achievementId}`);
    } catch (err) {
      setError(err.response?.data?.message || t('add.error'));
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-theme">{t('add.title')}</h1>
        <p className="text-muted text-sm mt-1">{t('add.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-7 space-y-5">
        {error && <div className="alert-error">{error}</div>}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-theme">{t('add.nameLabel')} *</label>
          <input
            type="text"
            value={form.title}
            onChange={update('title')}
            required
            minLength={3}
            className="glass-input"
            placeholder={t('add.namePlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-theme">{t('add.categoryLabel')} *</label>
          <select value={form.category} onChange={update('category')} required className="glass-input">
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_EMOJI[cat]} {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Күні */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-theme">{t('add.dateLabel')}</label>
          <input
            type="date"
            value={form.event_date}
            onChange={update('event_date')}
            className="glass-input"
          />
          <p className="text-[11px] text-muted">{t('add.dateHint')}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-theme">{t('add.descLabel')}</label>
          <textarea
            value={form.description}
            onChange={update('description')}
            rows={5}
            className="glass-input"
            placeholder={t('add.descPlaceholder')}
          />
        </div>

        {/* Файлдар */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-theme">{t('add.filesLabel')}</label>
          <input
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleFiles}
            className="glass-input py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:cursor-pointer"
          />
          {files.length > 0 && (
            <div className="space-y-2 mt-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm glass-card px-3 py-2"
                  style={{ borderRadius: 12 }}
                >
                  <span className="truncate text-theme">
                    {file.name}{' '}
                    <span className="text-muted text-xs">({(file.size / 1024).toFixed(0)} КБ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="ml-2 shrink-0 smooth hover:opacity-70"
                    style={{ color: 'var(--clr-danger)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted">{t('add.filesHint')}</p>
        </div>

        <div className="alert-warn flex items-start gap-2">
          <Lightbulb size={15} className="shrink-0 mt-0.5" />
          <span>{t('add.moderationNote')}</span>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 py-3 rounded-2xl"
          >
            {loading ? (progress || t('add.submitting')) : t('add.submit')}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="btn-glass px-6 py-3"
          >
            {t('add.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
