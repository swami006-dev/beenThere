import React, { useState, useEffect } from 'react';

export function Navbar({ onExploreClick, onWriteClick, onPrivacyClick, onHowItWorksClick, onSignInClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`navbar-wrapper ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="container navbar-inner">
        <a href="#top" className="navbar-logo" aria-label="BeenThere Home">
          <span className="logo-pulse-dot" aria-hidden="true" />
          <span className="logo-text">BEENTHERE</span>
        </a>

        {/* Desktop Navigation */}
        <nav className="navbar-links" aria-label="Main Navigation">
          <button 
            type="button" 
            className="nav-link" 
            onClick={onExploreClick}
          >
            Explore
          </button>
          <button 
            type="button" 
            className="nav-link" 
            onClick={onHowItWorksClick}
          >
            How it works
          </button>
          <button 
            type="button" 
            className="nav-link" 
            onClick={onPrivacyClick}
          >
            Privacy
          </button>
          <div className="nav-divider" aria-hidden="true" />
          <button 
            type="button" 
            className="nav-btn-signin"
            onClick={onSignInClick}
          >
            Sign in
          </button>
          <button 
            type="button" 
            className="nav-btn-write"
            onClick={onWriteClick}
          >
            Write
          </button>
        </nav>

        {/* Mobile Menu Toggle */}
        <button 
          type="button" 
          className="navbar-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer" role="dialog" aria-modal="true">
          <div className="container mobile-drawer-content">
            <button 
              type="button" 
              className="mobile-nav-link"
              onClick={() => { setMobileMenuOpen(false); onExploreClick(); }}
            >
              Explore experiences
            </button>
            <button 
              type="button" 
              className="mobile-nav-link"
              onClick={() => { setMobileMenuOpen(false); onHowItWorksClick(); }}
            >
              How it works
            </button>
            <button 
              type="button" 
              className="mobile-nav-link"
              onClick={() => { setMobileMenuOpen(false); onPrivacyClick(); }}
            >
              Privacy & trust
            </button>
            <button 
              type="button" 
              className="mobile-nav-link"
              onClick={() => { setMobileMenuOpen(false); onSignInClick && onSignInClick(); }}
            >
              Sign in to your space
            </button>
            <button 
              type="button" 
              className="mobile-nav-link highlight"
              onClick={() => { setMobileMenuOpen(false); onWriteClick(); }}
            >
              What’s on your mind? →
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
