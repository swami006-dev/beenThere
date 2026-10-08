import React from 'react';
import { useRouter } from '../context/RouterContext';
import { AppNavbar } from '../components/AppNavbar';
import { Footer } from '../components/Footer';

export function NotFoundPage() {
  const { navigate } = useRouter();

  return (
    <div className="page-shell">
      <AppNavbar />

      <main className="state-page-main">
        <div className="container-reading text-center">
          <div className="state-badge-circle">○</div>
          <h1 className="state-heading">Looks like this experience doesn't exist.</h1>
          <p className="state-subtext">Let's find something that does.</p>
          
          <div className="state-actions-wrap">
            <button 
              type="button" 
              className="btn-primary"
              onClick={() => navigate('/explore')}
            >
              Explore experiences →
            </button>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => navigate('/home')}
            >
              Return home
            </button>
          </div>
        </div>
      </main>

      <Footer 
        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onExploreClick={() => navigate('/explore')}
        onPrivacyClick={() => navigate('/')}
        onHowItWorksClick={() => navigate('/')}
      />
    </div>
  );
}
