import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">

      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="orb" style={{
          width: 600, height: 600, top: -220, right: -160,
          background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
          animationDuration: '14s',
        }} />
        <div className="orb" style={{
          width: 500, height: 500, bottom: 40, left: -180,
          background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)',
          animationDuration: '11s', animationDelay: '-5s',
          '--tx': '-30px', '--ty': '40px',
        }} />
        <div className="orb" style={{
          width: 340, height: 340, top: '40%', right: '12%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
          animationDuration: '17s', animationDelay: '-9s',
          '--tx': '25px', '--ty': '-50px',
        }} />
      </div>

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
