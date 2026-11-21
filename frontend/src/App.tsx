import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminUsers } from './pages/admin/AdminUsers';
import { LandingPage } from './pages/LandingPage';
import { ReviewerQueue } from './pages/reviewer/ReviewerQueue';
import { ReviewWorkspace } from './pages/reviewer/ReviewWorkspace';
import { SupplierDocuments } from './pages/supplier/SupplierDocuments';
import { SupplierOverview } from './pages/supplier/SupplierOverview';
import { SupplierProfileForm } from './pages/supplier/SupplierProfileForm';

const supplierNav = [
  { to: '/supplier', label: 'Overview', end: true },
  { to: '/supplier/profile', label: 'Company profile' },
  { to: '/supplier/documents', label: 'Documents' },
];

const reviewerNav = [
  { to: '/reviewer', label: 'Review queue', end: true },
  { to: '/reviewer/workspace', label: 'Review workspace' },
];

const adminNav = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'User access' },
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/supplier"
        element={
          <AppShell
            title="Supplier portal"
            subtitle="Submit and track your onboarding pack"
            items={supplierNav}
            roleLabel="SUPPLIER_CONTACT"
          />
        }
      >
        <Route index element={<SupplierOverview />} />
        <Route path="profile" element={<SupplierProfileForm />} />
        <Route path="documents" element={<SupplierDocuments />} />
      </Route>

      <Route
        path="/reviewer"
        element={
          <AppShell
            title="Reviewer dashboard"
            subtitle="Assess supplier documents and decisions"
            items={reviewerNav}
            roleLabel="REVIEWER"
          />
        }
      >
        <Route index element={<ReviewerQueue />} />
        <Route path="workspace" element={<ReviewWorkspace />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AppShell
            title="Admin dashboard"
            subtitle="Control access and onboarding operations"
            items={adminNav}
            roleLabel="ADMIN"
          />
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
