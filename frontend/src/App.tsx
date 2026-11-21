import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { defaultPathForRole } from './auth/paths';
import { AppShell } from './components/layout/AppShell';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminUsers } from './pages/admin/AdminUsers';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LandingPage } from './pages/LandingPage';
import { ReviewerQueue } from './pages/reviewer/ReviewerQueue';
import { ReviewWorkspace } from './pages/reviewer/ReviewWorkspace';
import { SupplierDashboard } from './pages/supplier/SupplierDashboard';
import { SupplierDocuments } from './pages/supplier/SupplierDocuments';
import { SupplierOnboarding } from './pages/supplier/SupplierOnboarding';
import { SupplierProfileForm } from './pages/supplier/SupplierProfileForm';

const supplierNav = [
  { to: '/supplier/dashboard', label: 'Dashboard', end: true },
  { to: '/supplier/profile', label: 'Company profile' },
  { to: '/supplier/documents', label: 'Documents' },
  { to: '/supplier/onboarding', label: 'Onboarding' },
];

const reviewerNav = [
  { to: '/reviewer', label: 'Review queue', end: true },
  { to: '/reviewer/workspace', label: 'Review workspace' },
];

const adminNav = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'User access' },
];

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Restoring session…</div>;
  }

  if (user) {
    return <Navigate to={defaultPathForRole(user.role)} replace />;
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/supplier"
        element={
          <ProtectedRoute roles={['SUPPLIER_CONTACT']}>
            <AppShell
              title="Supplier portal"
              subtitle="Submit and track your onboarding pack"
              items={supplierNav}
              roleLabel="SUPPLIER_CONTACT"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SupplierDashboard />} />
        <Route path="profile" element={<SupplierProfileForm />} />
        <Route path="documents" element={<SupplierDocuments />} />
        <Route path="onboarding" element={<SupplierOnboarding />} />
      </Route>

      <Route
        path="/reviewer"
        element={
          <ProtectedRoute roles={['REVIEWER']}>
            <AppShell
              title="Reviewer dashboard"
              subtitle="Assess supplier documents and decisions"
              items={reviewerNav}
              roleLabel="REVIEWER"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<ReviewerQueue />} />
        <Route path="workspace" element={<ReviewWorkspace />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AppShell
              title="Admin dashboard"
              subtitle="Control access and onboarding operations"
              items={adminNav}
              roleLabel="ADMIN"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
