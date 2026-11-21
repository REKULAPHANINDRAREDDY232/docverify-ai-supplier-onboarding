import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { defaultPathForRole } from './auth/paths';
import { AppShell } from './components/layout/AppShell';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminChecklists } from './pages/admin/AdminChecklists';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminDocumentTypes } from './pages/admin/AdminDocumentTypes';
import { AdminReferenceSources } from './pages/admin/AdminReferenceSources';
import { AdminSuppliers } from './pages/admin/AdminSuppliers';
import { AdminUsers } from './pages/admin/AdminUsers';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LandingPage } from './pages/LandingPage';
import { ReviewerDashboard } from './pages/reviewer/ReviewerDashboard';
import { ReviewerSupplierDetailPage } from './pages/reviewer/ReviewerSupplierDetail';
import { ReviewerSuppliers } from './pages/reviewer/ReviewerSuppliers';
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
  { to: '/reviewer/dashboard', label: 'Dashboard', end: true },
  { to: '/reviewer/suppliers', label: 'Suppliers' },
];

const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/suppliers', label: 'Suppliers' },
  { to: '/admin/document-types', label: 'Document types' },
  { to: '/admin/checklists', label: 'Checklists' },
  { to: '/admin/reference-sources', label: 'Reference sources' },
  { to: '/admin/audit-logs', label: 'Audit logs' },
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
          <ProtectedRoute roles={['REVIEWER', 'ADMIN']}>
            <AppShell
              title="Reviewer dashboard"
              subtitle="Assess supplier documents and decisions"
              items={reviewerNav}
              roleLabel="REVIEWER"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ReviewerDashboard />} />
        <Route path="suppliers" element={<ReviewerSuppliers />} />
        <Route path="suppliers/:id" element={<ReviewerSupplierDetailPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AppShell
              title="Admin workspace"
              subtitle="Control access, catalogues, and onboarding operations"
              items={adminNav}
              roleLabel="ADMIN"
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="suppliers" element={<AdminSuppliers />} />
        <Route path="document-types" element={<AdminDocumentTypes />} />
        <Route path="checklists" element={<AdminChecklists />} />
        <Route path="reference-sources" element={<AdminReferenceSources />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
