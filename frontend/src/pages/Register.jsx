import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirmPassword: '', group_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Құпиясөздер сәйкес келмейді');
      return;
    }
    if (form.password.length < 6) {
      setError('Құпиясөз кемінде 6 таңбадан тұруы керек');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name, form.group_name);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Тіркеу қатесі');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
          >
            <Check size={28} className="text-white" strokeWidth={2.8} />
          </div>
          <div className="text-2xl font-bold mb-1">
            <span className="text-theme">Achiev</span>
            <span style={{ color: '#818cf8' }}>ly</span>
          </div>
          <h1 className="text-base font-medium text-theme">Тіркелу</h1>
          <p className="text-sm text-muted mt-0.5">Жаңа аккаунт жасаңыз</p>
        </div>

        <div className="glass-panel p-7 space-y-4">
          {error && <div className="alert-error">{error}</div>}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-theme">Аты-жөні *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={update('full_name')}
              required
              minLength={3}
              className="glass-input"
              placeholder="Айбек Сейтімбетов"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-theme">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              required
              className="glass-input"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-theme">Топ</label>
            <input
              type="text"
              value={form.group_name}
              onChange={update('group_name')}
              className="glass-input"
              placeholder="P22-2B"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-theme">Құпиясөз *</label>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
              className="glass-input"
              placeholder="Кемінде 6 таңба"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-theme">Құпиясөзді қайталаңыз *</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              required
              className="glass-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-3 mt-2"
          >
            {loading ? 'Тіркелуде...' : 'Тіркелу'}
          </button>

          <p className="text-center text-sm text-muted pt-1">
            Аккаунт бар ма?{' '}
            <Link to="/login" className="text-accent font-medium hover:underline">
              Кіру
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
