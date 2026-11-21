import { StatusBadge } from '../../components/ui/StatusBadge';
import { USER_ROLES } from '../../types/domain';

export function AdminOverview() {
  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Administration</h2>
          <p className="muted">
            Manage roles, monitor onboarding throughput, and keep procurement access controlled.
          </p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <span className="stat__label">Active suppliers</span>
          <strong className="stat__value">—</strong>
        </div>
        <div className="stat">
          <span className="stat__label">In review</span>
          <strong className="stat__value">—</strong>
        </div>
        <div className="stat">
          <span className="stat__label">Approved</span>
          <strong className="stat__value">—</strong>
        </div>
      </div>

      <div className="panel">
        <h3>Role model</h3>
        <ul className="role-list">
          {USER_ROLES.map((role) => (
            <li key={role}>
              <code>{role}</code>
            </li>
          ))}
        </ul>
        <p className="muted">
          JWT authentication and role-guarded routes will enforce these permissions in later
          phases.
        </p>
      </div>

      <div className="panel">
        <h3>Onboarding health</h3>
        <div className="status-legend">
          <StatusBadge status="SUBMITTED" />
          <StatusBadge status="IN_REVIEW" />
          <StatusBadge status="NEEDS_INFORMATION" />
          <StatusBadge status="APPROVED" />
        </div>
      </div>
    </section>
  );
}
