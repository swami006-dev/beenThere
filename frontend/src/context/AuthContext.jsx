import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../config/api';

const AuthContext = createContext(null);

export const ANONYMOUS_PERSONAS = [
  { id: 'owl', name: 'Anonymous Owl', avatar: '🦉', desc: 'Observant & thoughtful' },
  { id: 'moon', name: 'Anonymous Moon', avatar: '🌙', desc: 'Calm & introspective' },
  { id: 'star', name: 'Anonymous Star', avatar: '⭐', desc: 'Quiet resilience' },
  { id: 'leaf', name: 'Anonymous Leaf', avatar: '🍃', desc: 'Gentle & grounded' },
  { id: 'fox', name: 'Anonymous Fox', avatar: '🦊', desc: 'Curious & watchful' }
];

const AVATAR_KEY_MAP = {
  owl: '🦉',
  moon: '🌙',
  star: '⭐',
  leaf: '🍃',
  fox: '🦊',
  panda: '🐼',
  wolf: '🐺',
  bear: '🐻'
};

function formatUserDTO(apiData) {
  const user = apiData.user || apiData;
  const anon = apiData.anonymousProfile || user.anonymousProfile || {};
  const avatarEmoji = AVATAR_KEY_MAP[anon.avatarKey] || '🦉';

  return {
    internalId: user.id || 'user_123',
    email: user.email || 'student@example.com',
    role: user.role || apiData.role || 'student',
    realName: '',
    anonymousIdentity: anon.anonymousDisplayName || 'Anonymous Peer',
    anonymousAvatar: avatarEmoji,
    academicContext: anon.academicContext || 'College student',
    savedExperienceIds: [],
    helpfulExperienceIds: [],
    myExperienceIds: [],
    topicsShared: ['Academic pressure', 'Peer support'],
    helpfulResponsesReceived: 0,
    joinedDate: 'October 2026',
    privacySettings: {
      hideYear: false,
      allowDirectNotes: true,
      blurTimeStamps: false
    }
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem('beenthere_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('beenthere_token');
  });

  const [loadingSession, setLoadingSession] = useState(true);

  // Handle unauthorized event dispatched when /auth/me returns 401
  useEffect(() => {
    const handleUnauthorized = (e) => {
      const endpoint = e.detail?.endpoint || '';
      if (endpoint.includes('/auth/me')) {
        console.warn('AUTH_SIGNED_OUT due to invalid session token on /auth/me');
        localStorage.removeItem('beenthere_token');
        localStorage.removeItem('beenthere_user');
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    };
    window.addEventListener('beenthere_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('beenthere_unauthorized', handleUnauthorized);
  }, []);

  // Restore authenticated session on mount using GET /api/auth/me
  useEffect(() => {
    console.log('[AUTH] AUTH_INIT_START');
    const token = localStorage.getItem('beenthere_token');
    
    if (!token) {
      console.log('[AUTH] No stored token found');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setLoadingSession(false);
      console.log('[AUTH] AUTH_INIT_COMPLETE');
      return;
    }

    console.log('[AUTH] AUTH_STORAGE_FOUND');

    api.get('/auth/me')
      .then(res => {
        const formatted = formatUserDTO(res);
        console.log('[AUTH] AUTH_ME_SUCCESS', { identity: formatted.anonymousIdentity });
        setCurrentUser(formatted);
        setIsAuthenticated(true);
        localStorage.setItem('beenthere_user', JSON.stringify(formatted));
        console.log('[AUTH] AUTH_SESSION_RESTORED');
      })
      .catch(err => {
        console.warn('[AUTH] AUTH_ME_FAILED:', err.message);
        if (err.status === 401) {
          localStorage.removeItem('beenthere_token');
          localStorage.removeItem('beenthere_user');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      })
      .finally(() => {
        setLoadingSession(false);
        console.log('[AUTH] AUTH_INIT_COMPLETE');
      });
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const formatted = formatUserDTO(res);
      if (res.token) {
        localStorage.setItem('beenthere_token', res.token);
        localStorage.setItem('beenthere_user', JSON.stringify(formatted));
      }
      setCurrentUser(formatted);
      setIsAuthenticated(true);
      return { success: true, user: formatted };
    } catch (err) {
      console.error('Login error:', err.message);
      throw err;
    }
  };

  const register = async (email, password, chosenIdentity = 'Anonymous Owl', context = 'College student') => {
    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        chosenIdentity,
        academicContext: context
      });
      if (res.token) {
        const formatted = formatUserDTO(res);
        localStorage.setItem('beenthere_token', res.token);
        localStorage.setItem('beenthere_user', JSON.stringify(formatted));
        setCurrentUser(formatted);
        setIsAuthenticated(true);
        return { success: true, token: res.token, user: formatted };
      } else {
        return { success: true, token: null, user: null, message: res.message || 'Registration successful! Please check your email to confirm your account.' };
      }
    } catch (err) {
      console.error('Registration error:', err.message);
      throw err;
    }
  };

  const logout = () => {
    console.log('[AUTH] AUTH_SIGNED_OUT via explicit user action');
    localStorage.removeItem('beenthere_token');
    localStorage.removeItem('beenthere_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const toggleSaveExperience = (experienceId) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      const isSaved = prev.savedExperienceIds.includes(experienceId);
      const updatedSaved = isSaved
        ? prev.savedExperienceIds.filter(id => id !== experienceId)
        : [...prev.savedExperienceIds, experienceId];
      return {
        ...prev,
        savedExperienceIds: updatedSaved
      };
    });
  };

  const isExperienceSaved = (experienceId) => {
    return currentUser?.savedExperienceIds?.includes(experienceId) || false;
  };

  const toggleHelpful = (experienceId) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      const isHelpful = prev.helpfulExperienceIds.includes(experienceId);
      const updated = isHelpful
        ? prev.helpfulExperienceIds.filter(id => id !== experienceId)
        : [...prev.helpfulExperienceIds, experienceId];
      return {
        ...prev,
        helpfulExperienceIds: updated
      };
    });
  };

  const setAnonymousIdentity = (identityName) => {
    const persona = ANONYMOUS_PERSONAS.find(p => p.name === identityName) || ANONYMOUS_PERSONAS[0];
    setCurrentUser(prev => prev ? ({
      ...prev,
      anonymousIdentity: persona.name,
      anonymousAvatar: persona.avatar
    }) : prev);
  };

  const setAcademicContext = (context) => {
    setCurrentUser(prev => prev ? ({
      ...prev,
      academicContext: context
    }) : prev);
  };

  const updateProfile = (updates) => {
    setCurrentUser(prev => prev ? ({ ...prev, ...updates }) : prev);
  };

  const updateNickname = async (nickname) => {
    try {
      const res = await api.patch('/auth/profile', { nickname });
      if (res) {
        const formatted = formatUserDTO(res);
        setCurrentUser(prev => prev ? ({
          ...prev,
          anonymousIdentity: formatted.anonymousIdentity || nickname,
          anonymousAvatar: formatted.anonymousAvatar || '🦉'
        }) : prev);
      }
      return { success: true };
    } catch (err) {
      console.error('Update nickname failed:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated,
      loadingSession,
      login,
      register,
      logout,
      toggleSaveExperience,
      isExperienceSaved,
      toggleHelpful,
      setAnonymousIdentity,
      setAcademicContext,
      updateProfile,
      updateNickname
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
