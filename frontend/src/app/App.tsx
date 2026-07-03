import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { StudentDashboard } from './components/dashboards/StudentDashboard';
import { AdvisorDashboard } from './components/dashboards/AdvisorDashboard';
import { AdminDashboard } from './components/dashboards/AdminDashboard';

// Kept so the dashboard components (which take an onNavigate prop for the
// sign-out button) don't need to change shape. Real navigation now just
// means "log out", since which dashboard renders is decided by the
// logged-in user's role, not by clicking around a preview bar.
export type Page = 'login' | 'student' | 'advisor' | 'admin';

function AppContent() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const onNavigate = (page: Page) => {
    if (page === 'login') logout();
  };

  switch (user.role) {
    case 'student':
      return <StudentDashboard onNavigate={onNavigate} />;
    case 'advisor':
      return <AdvisorDashboard onNavigate={onNavigate} />;
    case 'admin':
      return <AdminDashboard onNavigate={onNavigate} />;
    default:
      return <LoginPage />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
