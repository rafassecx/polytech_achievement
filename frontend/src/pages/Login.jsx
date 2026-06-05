import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">

        {/* Логотип мен тақырып */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
          >
            АПК
          </div>
          <h1 className="text-2xl font-bold text-theme">Қош келдіңіз</h1>
          <p className="text-sm text-muted mt-1">Аккаунтыңызға кіріңіз</p>
        </div>

        {/* Форма */}
        <div className="glass-panel p-7 space-y-4">
          {error && <div className="alert-error">{error}</div>}

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
  );
}
