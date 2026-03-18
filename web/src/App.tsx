import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AppPage } from './pages/AppPage';
import { AuthPage } from './pages/AuthPage';
import { CancelPage } from './pages/CancelPage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { PricingPage } from './pages/PricingPage';
import { StatusPage } from './pages/StatusPage';
import { SuccessPage } from './pages/SuccessPage';
import { TermsPage } from './pages/TermsPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing" replace />} />
      <Route element={<AppShell />}>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/remarketing" element={<PricingPage />} />
        <Route path="/cancel" element={<CancelPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  );
}
