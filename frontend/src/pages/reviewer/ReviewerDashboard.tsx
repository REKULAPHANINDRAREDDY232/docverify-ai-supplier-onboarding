import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { fetchReviewerDashboard, type ReviewerStats } from '../../api/reviewer';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { SupplierStatus } from '../../types/domain';

export function ReviewerDashboard() {
  const [stats, setStats] = useState<ReviewerStats | null>(null);
  const [recent, setRecent] = useState<
    Array<{
      id: string;
      companyName: string;
      status: SupplierStatus;
      updatedAt: string;
      contactPerson: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchReviewerDashboard();
        if (!active) return;
        setStats(data.stats);
        setRecent(data.recent);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load reviewer dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="muted">Loading reviewer dashboard…</p>;
  if (error) return <p className="form-error">{error}</p>;

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Reviewer dashboard</h2>
          <p className="muted">Monitor submitted supplier packets and continue open reviews.</p>
        </div>
        <Link className="button button--primary" to="/reviewer/suppliers">
          Browse suppliers
        </Link>
      </div>

      <div className="stats-row">
        <div className="stat">
          <span className="stat__label">Submitted</span>
          <strong className="stat__value">{stats?.submitted ?? 0}</strong>
        </div>
        <div className="stat">
          <span className="stat__label">In review</span>
          <strong className="stat__value">{stats?.inReview ?? 0}</strong>
        </div>
        <div className="stat">
          <span className="stat__label">Needs information</span>
          <strong className="stat__value">{stats?.needsInformation ?? 0}</strong>
        </div>
      </div>

      <div className="panel">
        <h3>Recent packets</h3>
        {recent.length === 0 ? (
          <p className="muted">No submitted packets waiting for review.</p>
        ) : (
          <ul className="checklist">
            {recent.map((item) => (
              <li key={item.id}>
                <span>
                  <Link to={`/reviewer/suppliers/${item.id}`}>{item.companyName}</Link>
                  <span className="muted"> · {item.contactPerson}</span>
                </span>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
