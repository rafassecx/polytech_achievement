import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <footer className="glass-nav mt-6">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center text-sm text-muted">
          © 2026 <span className="font-semibold">Achiev<span style={{ color: '#818cf8' }}>ly</span></span>
        </div>
      </footer>
    </div>
  );
}
