'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const NAV_LINKS = [
  { href: '/',         route: 'listings',  label: '🏠 Properties' },
  { href: '/rentals',  route: 'rentals',   label: '🔑 Rentals' },
  { href: '/projects', route: 'projects',  label: '🏗️ Projects' },
  { href: '/saved',    route: 'saved',     label: '❤️ Saved' },
  { href: '/insights', route: 'insights',  label: '📊 Insights' },
  { href: '/findings', route: 'findings',  label: '🔍 API Findings' },
  { href: '/answers',  route: 'answers',   label: '📝 10 Questions' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, setLoginOpen } = useAuth();
  const { theme, toggleTheme }         = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const initials = user?.email?.charAt(0)?.toUpperCase();

  return (
    <header className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <Link href="/" className="brand-logo">
        <div className="brand-icon">🌿</div>
        <span>Ivy<span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Homes</span></span>
        <span className="brand-badge">Bangalore</span>
      </Link>

      <nav className="nav-links">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item${pathname === href ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          id="theme-toggle-btn"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title="Toggle Theme"
          aria-label="Toggle theme"
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>

        <div className="nav-auth">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', padding: '5px 12px 5px 6px', borderRadius: 99 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#022c20' }}>{initials}</div>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setLoginOpen(true)}>Sign in</button>
          )}
        </div>
      </div>
    </header>
  );
}
