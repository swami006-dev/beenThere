import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';

export function AppNavbar() {
  const { currentPath, navigate } = useRouter();
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/home');
    } else {
      navigate('/');
    }
  };

  const isActive = (path) => currentPath === path;

  return (
    <header className={`app-nav-wrapper ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="container app-nav-inner">
        {/* Brand Logo */}
        <a href="/" onClick={handleLogoClick} className="nav-brand" aria-label="BeenThere Home">
          <span className="brand-dot" aria-hidden="true" />
          <span className="brand-name">BEENTHERE</span>
        </a>

        {/* Desktop Navigation */}
        <nav className="nav-desktop-links" aria-label="Main Navigation">
          {isAuthenticated ? (
            <>
              <button 
                type="button" 
                className={`nav-item ${isActive('/home') ? 'active' : ''}`}
                onClick={() => navigate('/home')}
              >
                Home
              </button>
              <button 
                type="button" 
                className={`nav-item ${isActive('/explore') ? 'active' : ''}`}
                onClick={() => navigate('/explore')}
              >
                Explore
              </button>
              <button 
                type="button" 
                className={`nav-item ${isActive('/community') ? 'active' : ''}`}
                onClick={() => navigate('/community')}
              >
                Community
              </button>
              <button 
                type="button" 
                className={`nav-item ${isActive('/conversations') || isActive('/messages') ? 'active' : ''}`}
                onClick={() => navigate('/conversations')}
              >
                Messages
              </button>
              <button 
                type="button" 
                className={`nav-item ${isActive('/my-posts') || isActive('/my-experiences') ? 'active' : ''}`}
                onClick={() => navigate('/my-posts')}
              >
                My experiences
              </button>
              <button 
                type="button" 
                className={`nav-item ${isActive('/saved') ? 'active' : ''}`}
                onClick={() => navigate('/saved')}
              >
                Saved
              </button>

              {currentUser?.role === 'moderator' && (
                <button 
                  type="button" 
                  className={`nav-item ${isActive('/moderator') || isActive('/moderation') ? 'active' : ''}`}
                  onClick={() => navigate('/moderation')}
                  title="Moderator Dashboard"
                >
                  Moderation
                </button>
              )}

              <div className="nav-sep" aria-hidden="true" />

              <button 
                type="button" 
                className="nav-btn-share-trigger"
                onClick={() => navigate('/share')}
              >
                <span>Write</span>
                <span className="share-plus" aria-hidden="true">+</span>
              </button>

              <button 
                type="button" 
                className={`nav-profile-pill ${isActive('/profile') ? 'active' : ''}`}
                onClick={() => navigate('/profile')}
                title="View anonymous profile"
              >
                <span className="profile-shield" aria-hidden="true">🛡</span>
                <span className="profile-anon-text">{currentUser?.anonymousIdentity || 'Anonymous'}</span>
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                className={`nav-item ${isActive('/') ? 'active' : ''}`}
                onClick={() => navigate('/')}
              >
                About
              </button>
              <button 
                type="button" 
                className={`nav-item ${isActive('/explore') ? 'active' : ''}`}
                onClick={() => navigate('/explore')}
              >
                Explore
              </button>

              <div className="nav-sep" aria-hidden="true" />

              <button 
                type="button" 
                className={`nav-item ${isActive('/login') ? 'active' : ''}`}
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>

              <button 
                type="button" 
                className="nav-btn-create-space"
                onClick={() => navigate('/register')}
              >
                Create space
              </button>
            </>
          )}
        </nav>

        {/* Mobile Hamburger */}
        <button 
          type="button" 
          className="nav-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation"
        >
          <span className={`bar ${mobileMenuOpen ? 'bar-open-1' : ''}`} />
          <span className={`bar ${mobileMenuOpen ? 'bar-open-2' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="nav-mobile-drawer" role="dialog" aria-modal="true">
          <div className="container mobile-drawer-inner">
            {isAuthenticated ? (
              <>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/home'); }}
                >
                  Home
                </button>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/explore'); }}
                >
                  Explore experiences
                </button>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/community'); }}
                >
                  Community reflections
                </button>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/conversations'); }}
                >
                  Messages
                </button>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/my-posts'); }}
                >
                  My shared experiences
                </button>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/saved'); }}
                >
                  Saved experiences
                </button>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/profile'); }}
                >
                  Anonymous profile
                </button>
                {currentUser?.role === 'moderator' && (
                  <button 
                    type="button" 
                    className="mobile-item"
                    onClick={() => { setMobileMenuOpen(false); navigate('/moderation'); }}
                  >
                    Moderator desk
                  </button>
                )}
                <button 
                  type="button" 
                  className="mobile-item highlight-write"
                  onClick={() => { setMobileMenuOpen(false); navigate('/share'); }}
                >
                  Write: What’s on your mind? →
                </button>
                <button 
                  type="button" 
                  className="mobile-item dim"
                  onClick={() => { setMobileMenuOpen(false); logout(); navigate('/'); }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/'); }}
                >
                  Home / Overview
                </button>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/explore'); }}
                >
                  Explore experiences
                </button>
                <button 
                  type="button" 
                  className="mobile-item"
                  onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                >
                  Sign in
                </button>
                <button 
                  type="button" 
                  className="mobile-item highlight-write"
                  onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}
                >
                  Create your space →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
