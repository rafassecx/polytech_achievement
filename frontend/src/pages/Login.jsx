import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Кіру қатесі');
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
              src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.35 }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.72) 0%, rgba(124,58,237,0.55) 100%)' }}
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
                Студенттердің жетістіктерін бақылаудың ең оңай жолы
              </p>
            </div>
          </div>

          {/* Оң жақ — форма */}
          <div className="flex-1 p-8 md:p-10">

            {/* Мобильде logo */}
            <div className="flex items-center gap-3 mb-7 md:mb-8">
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
                <p className="text-sm text-muted">Аккаунтыңызға кіріңіз</p>
              </div>
            </div>

            {error && <div className="alert-error mb-4">{error}</div>}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-theme">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-input"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-theme">Құпиясөз</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {loading ? 'Кіруде...' : 'Кіру'}
              </button>

              <p className="text-center text-sm text-muted pt-1">
                Аккаунт жоқ па?{' '}
                <Link to="/register" className="text-accent font-medium hover:underline">
                  Тіркелу
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
