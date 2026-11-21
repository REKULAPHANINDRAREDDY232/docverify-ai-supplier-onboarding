import { useAuth } from '../../auth/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SUPPLIER_STATUSES, type SupplierStatus } from '../../types/domain';

const checklist: Array<{ label: string; status: SupplierStatus }> = [
  { label: 'Company profile', status: 'DRAFT' },
  { label: 'Required documents', status: 'DRAFT' },
  { label: 'Submission for review', status: 'DRAFT' },
];

export function SupplierOverview() {
  const { user } = useAuth();
  const supplierStatus = (user?.supplierAsContact?.status as SupplierStatus | undefined) ?? 'DRAFT';

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Onboarding overview</h2>
          <p className="muted">
            Complete your company profile and upload the required compliance documents.
          </p>
        </div>
        <StatusBadge status={supplierStatus} />
      </div>

      <div className="panel">
        <h3>Current status</h3>
        <p className="muted">
          Signed in as {user?.name}.{' '}
          {user?.supplierAsContact
            ? `${user.supplierAsContact.companyName} is currently ${supplierStatus.replaceAll('_', ' ').toLowerCase()}.`
            : 'Your supplier packet will appear here once linked.'}
        </p>
        <ul className="status-legend">
          {SUPPLIER_STATUSES.map((status) => (
            <li key={status}>
              <StatusBadge status={status} />
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3>Getting started checklist</h3>
        <ul className="checklist">
          {checklist.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
