import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';
import { DOCUMENT_TYPE_LABELS, type DocumentTypeCode } from '../../types/domain';

export function SupplierDashboard() {
  const { supplier, documents, documentTypes, requests, loading, error } = useSupplierPortal();

  if (loading) {
    return <p className="muted">Loading supplier dashboard…</p>;
  }

  if (error) {
    return <p className="form-error">{error}</p>;
  }

  if (!supplier) {
    return (
      <section className="stack">
        <div className="page-header">
          <div>
            <h2>Supplier dashboard</h2>
            <p className="muted">Create your company profile to start onboarding.</p>
          </div>
        </div>
        <div className="panel">
          <Link className="button button--primary" to="/supplier/profile">
            Create supplier profile
          </Link>
        </div>
      </section>
    );
  }

  const activeByType = new Map(
    documents
      .filter((doc) => doc.status === 'ACTIVE')
      .map((doc) => [doc.documentTypeId, doc] as const),
  );

  const missingTypes = documentTypes.filter(
    (type) => type.required && !activeByType.has(type.id),
  );
  const openRequests = requests.filter((request) => request.status === 'OPEN');

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Supplier dashboard</h2>
          <p className="muted">
            Track {supplier.companyName} onboarding status, documents, and reviewer requests.
          </p>
        </div>
        <StatusBadge status={supplier.status} />
      </div>

      <div className="stats-row">
        <div className="stat">
          <span className="stat__label">Required document types</span>
          <strong className="stat__value">{documentTypes.filter((type) => type.required).length}</strong>
        </div>
        <div className="stat">
          <span className="stat__label">Active uploads</span>
          <strong className="stat__value">{activeByType.size}</strong>
        </div>
        <div className="stat">
          <span className="stat__label">Open requests</span>
          <strong className="stat__value">{openRequests.length}</strong>
        </div>
      </div>

      <div className="panel">
        <h3>Document coverage</h3>
        <ul className="checklist">
          {documentTypes.map((type) => {
            const active = activeByType.get(type.id);
            return (
              <li key={type.id}>
                <span>
                  {DOCUMENT_TYPE_LABELS[type.code as DocumentTypeCode] ?? type.name}
                  {type.required ? ' (required)' : ''}
                </span>
                {active ? (
                  <StatusBadge status="ACTIVE" kind="document" />
                ) : (
                  <span className="status-badge status-badge--warning">Missing</span>
                )}
              </li>
            );
          })}
        </ul>
        {missingTypes.length > 0 ? (
          <p className="muted">
            Missing: {missingTypes.map((type) => type.name).join(', ')}. Upload them in Documents.
          </p>
        ) : (
          <p className="muted">All required document types have an active file.</p>
        )}
        <div className="form-actions">
          <Link className="button button--secondary" to="/supplier/documents">
            Manage documents
          </Link>
          <Link className="button button--primary" to="/supplier/onboarding">
            Continue onboarding
          </Link>
        </div>
      </div>

      <div className="panel">
        <h3>Reviewer requests</h3>
        {openRequests.length === 0 ? (
          <p className="muted">No open document requests.</p>
        ) : (
          <ul className="checklist">
            {openRequests.map((request) => (
              <li key={request.id}>
                <span>
                  {request.documentType.name}: {request.message}
                </span>
                <span className="status-badge status-badge--warning">Open</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
