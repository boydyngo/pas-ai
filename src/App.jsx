import React from 'react';
import Hero from './components/Hero';
import About from './components/About';
import Portfolio from './components/Portfolio';
import { projects } from './data/projects';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

const App = () => {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: 'var(--space-4) 0',
        background: 'var(--color-navbar-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border-subtle)'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo */}
          <a href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            textDecoration: 'none'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'white'
            }}>
              P
            </div>
            <span style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em'
            }}>
              PAS AI
            </span>
          </a>

          {/* Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
            <a
              href="#about"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              About
            </a>
            <a
              href="#portfolio"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Projects
            </a>
            <a
              href="https://github.com/boydyngo"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      < main >
        <Hero />
        <About />
        <Portfolio projects={projects} />
      </main >

      {/* Footer */}
      < footer style={{
        padding: 'var(--space-8) 0',
        borderTop: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-secondary)'
      }}>
        <div className="container">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                © {new Date().getFullYear()} PAS AI
              </span>
              <span style={{ color: 'var(--color-border-default)' }}>·</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Donovan Williams
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <a
                href="https://github.com/boydyngo"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}
              >
                GitHub
              </a>
              <a
                href="http://www.getty.edu"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}
              >
                Getty
              </a>
            </div>
          </div>
        </div>
      </footer >
    </div >
  );
};

export default App;
