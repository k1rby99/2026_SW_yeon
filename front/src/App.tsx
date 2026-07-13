import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from './routes/AppLayout';
import { RequireAuth } from './routes/RequireAuth';
import { OnboardingGuard } from './routes/OnboardingGuard';

import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { GoalsPage } from './pages/GoalsPage';
import { RecommendationDetailPage } from './pages/RecommendationDetailPage';
import { MatchesPage } from './pages/MatchesPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { ProfilePage } from './pages/ProfilePage';
import { IntroScreen } from './components/common/IntroScreen';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { RoomEditorPage } from './pages/RoomEditorPage';
import { RoomInvitePage } from './pages/RoomInvitePage';
import { RoomApplicationsPage } from './pages/RoomApplicationsPage';
import { RoomChatPage } from './pages/RoomChatPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<IntroScreen />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/matches/:id/feedback" element={<FeedbackPage />} />

            <Route element={<OnboardingGuard />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/recommendations/:id" element={<RecommendationDetailPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/rooms/:id" element={<RoomDetailPage />} />
                <Route path="/rooms/new" element={<RoomEditorPage />} />
                <Route path="/rooms/:id/settings" element={<RoomEditorPage />} />
                <Route path="/rooms/:id/invite" element={<RoomInvitePage />} />
                <Route path="/rooms/:id/applications" element={<RoomApplicationsPage />} />
                <Route path="/rooms/:id/chat" element={<RoomChatPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
