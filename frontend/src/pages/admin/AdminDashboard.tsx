import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { fetchAdminDashboard, type AdminDashboardData } from '../../api/admin';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SUPPLIER_STATUSES, type SupplierStatus } from '../../types/domain';

export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const dashboard = await fetchAdminDashboard();
        if (!active) return;
        setData(dashboard);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load admin dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="muted">Loading administration dashboard…</p>;
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return null;

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Administration</h2>
          <p className="muted">
            Live supplier onboarding throughput, user access, and catalogue health from PostgreSQL.
          </p>
        </div>
        <Link className="button button--primary" to="/admin/users">
          Manage users
        </Link>
      </div>

      <div className="stats-row">
        <div className="stat">
          <span className="stat__label">Total suppliers</span>
          <strong className="stat__value">{data.suppliers.total}</strong>
        </div>
        <div className="stat">
          <span className="stat__label">Active users</span>
          <strong className="stat__value">
            {data.users.active}/{data.users.total}
          </strong>
        </div>
        <div className="stat">
          <span className="stat__label">Active checklist items</span>
          <strong className="stat__value">{data.catalogue.checklistItems}</strong>
        </div>
      </div>

      <div className="panel">
        <h3>Onboarding statuses</h3>
        <div className="stats-row stats-row--six">
          {SUPPLIER_STATUSES.map((status: SupplierStatus) => (
            <div className="stat" key={status}>
              <span className="stat__label">
                <StatusBadge status={status} />
              </span>
              <strong className="stat__value">{data.suppliers.byStatus[status]}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Catalogue</h3>
        <p className="muted">
          {data.catalogue.documentTypes} active document types ·{' '}
          {data.catalogue.checklistItems} active checklist requirements
        </p>
        <div className="form-actions">
          <Link className="button button--secondary" to="/admin/document-types">
            Document types
          </Link>
          <Link className="button button--secondary" to="/admin/checklists">
            Checklists
          </Link>
          <Link className="button button--secondary" to="/admin/audit-logs">
            Audit logs
          </Link>
        </div>
      </div>
    </section>
  );
}
