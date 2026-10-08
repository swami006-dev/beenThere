import React from 'react';
import { RouterProvider, useRouter } from './context/RouterContext';
import { AuthProvider } from './context/AuthContext';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { SharePage } from './pages/SharePage';
import { MatchingPage } from './pages/MatchingPage';
import { ExperienceDetailPage } from './pages/ExperienceDetailPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ExplorePage } from './pages/ExplorePage';
import { SavedPage } from './pages/SavedPage';
import { CommunityPage } from './pages/CommunityPage';
import { MyPostsPage } from './pages/MyPostsPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnonymousProfilePage } from './pages/AnonymousProfilePage';
import { ModeratorPage } from './pages/ModeratorPage';
import { ModeratorReviewPage } from './pages/ModeratorReviewPage';
import { NotFoundPage } from './pages/NotFoundPage';

import './App.css';
import './styles/app-screens.css';

function RouteRenderer() {
  const { match } = useRouter();

  switch (match.route) {
    case 'landing':
      return <LandingPage />;
    case 'login':
      return <LoginPage />;
    case 'register':
      return <RegisterPage />;
    case 'forgot-password':
      return <ForgotPasswordPage />;
    case 'home':
      return <HomePage />;
    case 'share':
      return <SharePage />;
    case 'matching':
    case 'matching-results':
      return <MatchingPage />;
    case 'experience-detail':
      return <ExperienceDetailPage />;
    case 'post-detail':
      return <PostDetailPage />;
    case 'explore':
      return <ExplorePage />;
    case 'saved':
      return <SavedPage />;
    case 'community':
      return <CommunityPage />;
    case 'my-posts':
    case 'my-experiences':
      return <MyPostsPage />;
    case 'conversations':
      return <ConversationsPage />;
    case 'profile':
      return <ProfilePage />;
    case 'anonymous-profile':
      return <AnonymousProfilePage />;
    case 'moderator':
      return <ModeratorPage />;
    case 'moderator-review':
      return <ModeratorReviewPage />;
    case '404':
    default:
      return <NotFoundPage />;
  }
}

export function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <RouteRenderer />
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;
