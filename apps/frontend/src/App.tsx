import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { AssessmentPage } from "./pages/AssessmentPage";
import { TrendsPage } from "./pages/TrendsPage";
import { SessionDetailPage } from "./pages/SessionDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoadingSpinner } from "./components/LoadingSpinner";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { userId, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { userId, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (userId) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/assessment" element={<ProtectedRoute><AssessmentPage /></ProtectedRoute>} />
        <Route path="/trends" element={<ProtectedRoute><TrendsPage /></ProtectedRoute>} />
        <Route path="/session/:sessionId" element={<ProtectedRoute><SessionDetailPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}