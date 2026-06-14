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
      <div className="w-full max-w-4xl">
        <div className="glass-card overflow-hidden flex flex-col md:flex-row">

          {/* Сол жақ — декоративтік сурет */}
          <div className="relative hidden md:flex md:w-5/12 items-end justify-start p-8 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.3 }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.75) 0%, rgba(79,70,229,0.6) 100%)' }}
            />
            <div className="relative z-10">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
              >
                <Check size={22} className="text-white" strokeWidth={2.8} />
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                Achiev<span style={{ color: '#c4b5fd' }}>ly</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Жетістіктеріңізді бөлісіп, топтастаңыз
              </p>
            </div>
          </div>

          {/* Оң жақ — форма */}
          <div className="flex-1 p-8 md:p-10">

            {/* Мобильде logo */}
            <div className="flex items-center gap-3 mb-7">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center md:hidden"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                <Check size={20} className="text-white" strokeWidth={2.8} />
              </div>
              <div>
                <div className="text-xl font-bold">
                  <span className="text-theme">Achiev</span>
                  <span style={{ color: '#818cf8' }}>ly</span>
                </div>
                <p className="text-sm text-muted">Жаңа аккаунт жасаңыз</p>
              </div>
            </div>

            {error && <div className="alert-error mb-4">{error}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">Аты-жөні *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={update('full_name')}
                    required
                    minLength={3}
                    className="glass-input"
                    placeholder="Аты-жөніңіз"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-theme">Топ</label>
                  <input
                    type="text"
                    value={form.group_name}
                    onChange={update('group_name')}
                    className="glass-input"
                    placeholder="Топ атауы"
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="text-sm font-medium text-theme">Қайталаңыз *</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={update('confirmPassword')}
                    required
                    className="glass-input"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary w-full py-3 mt-1"
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
      </div>
    </div>
  );
}
