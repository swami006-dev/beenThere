import React, { createContext, useContext, useState, useEffect } from 'react';

const RouterContext = createContext(null);

export function RouterProvider({ children }) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [routeState, setRouteState] = useState(null);

  useEffect(() => {
    const handlePopState = (e) => {
      setCurrentPath(window.location.pathname || '/');
      setRouteState(window.history.state || e.state || null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path, state = null) => {
    if (path !== currentPath) {
      window.history.pushState(state, '', path);
      setCurrentPath(path);
      setRouteState(state);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Route matcher
  const getRouteMatch = () => {
    const rawPath = currentPath;
    const path = rawPath.split('?')[0];

    if (path === '/') return { route: 'landing', params: {} };
    if (path === '/login') return { route: 'login', params: {} };
    if (path === '/register') return { route: 'register', params: {} };
    if (path === '/forgot-password') return { route: 'forgot-password', params: {} };
    if (path === '/home') return { route: 'home', params: {} };
    if (path === '/share') return { route: 'share', params: {} };
    if (path === '/matching/results') return { route: 'matching-results', params: {} };
    if (path === '/matching') return { route: 'matching', params: {} };
    if (path === '/explore') return { route: 'explore', params: {} };
    if (path === '/saved') return { route: 'saved', params: {} };
    if (path === '/my-experiences' || path === '/my-posts') return { route: 'my-experiences', params: {} };
    if (path === '/community') return { route: 'community', params: {} };
    if (path === '/profile') return { route: 'profile', params: {} };
    if (path === '/conversations' || path === '/messages') return { route: 'conversations', params: {} };
    const convMatch = path.match(/^\/conversations\/([^/?#]+)/);
    if (convMatch) {
      return { route: 'conversations', params: { id: convMatch[1] } };
    }

    // /experience/:id
    const expMatch = path.match(/^\/experience\/([^/?#]+)/);
    if (expMatch) {
      return { route: 'experience-detail', params: { id: expMatch[1] } };
    }

    // /post/:id
    const postMatch = path.match(/^\/post\/([^/?#]+)/);
    if (postMatch) {
      return { route: 'post-detail', params: { id: postMatch[1] } };
    }

    // /moderator/review/:id or /moderation/review/:id
    const modReviewMatch = path.match(/^\/(?:moderator|moderation)\/review\/([^/?#]+)/);
    if (modReviewMatch) {
      return { route: 'moderator-review', params: { id: modReviewMatch[1] } };
    }

    return { route: '404', params: {} };
  };

  const match = getRouteMatch();

  return (
    <RouterContext.Provider value={{ currentPath, navigate, routeState, match }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
