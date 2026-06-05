import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-sm">Жүктелуде...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-60 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-xs">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-bold text-theme mb-2">Қол жетімсіз</h1>
          <p className="text-muted text-sm">Бұл бетке кіру үшін рөл жеткіліксіз</p>
        </div>
      </div>
    );
  }

  return children;
}
