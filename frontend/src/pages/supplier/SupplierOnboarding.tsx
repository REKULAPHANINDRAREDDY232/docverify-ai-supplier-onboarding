import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { submitSupplier } from '../../api/suppliers';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';

export function SupplierOnboarding() {
  const { supplier, documents, documentTypes, requests, loading, error, refresh } =
    useSupplierPortal();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) {
    return <p className="muted">Loading onboarding status…</p>;
  }

  if (error) {
    return <p className="form-error">{error}</p>;
  }

  if (!supplier) {
    return (
      <section className="stack">
        <p className="form-error">Create a supplier profile before submitting onboarding.</p>
        <Link className="button button--primary" to="/supplier/profile">
          Go to profile
        </Link>
      </section>
    );
  }

  const activeTypeIds = new Set(
    documents.filter((doc) => doc.status === 'ACTIVE').map((doc) => doc.documentTypeId),
  );
  const missing = documentTypes.filter((type) => type.required && !activeTypeIds.has(type.id));
  const openRequests = requests.filter((request) => request.status === 'OPEN');
  const canSubmit =
    (supplier.status === 'DRAFT' || supplier.status === 'NEEDS_INFORMATION') &&
    missing.length === 0;

  async function onSubmit() {
    if (!supplier) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setMessage(null);
    try {
      await submitSupplier(supplier.id);
      setMessage('Onboarding packet submitted for review.');
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to submit onboarding packet.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Onboarding submission</h2>
          <p className="muted">
            Confirm required documents are present, review open requests, then submit for review.
          </p>
        </div>
        <StatusBadge status={supplier.status} />
      </div>

      {formError ? <p className="form-error">{formError}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="panel">
        <h3>Packet checklist</h3>
        <ul className="checklist">
          <li>
            <span>Company profile</span>
            <StatusBadge status={supplier.status === 'DRAFT' ? 'DRAFT' : supplier.status} />
          </li>
          {documentTypes.map((type) => (
            <li key={type.id}>
              <span>{type.name}</span>
              {activeTypeIds.has(type.id) ? (
                <StatusBadge status="ACTIVE" kind="document" />
              ) : (
                <span className="status-badge status-badge--warning">Missing</span>
              )}
            </li>
          ))}
        </ul>
        {missing.length > 0 ? (
          <p className="muted">
            Upload missing documents before submission:{' '}
            <Link to="/supplier/documents">Documents</Link>
          </p>
        ) : (
          <p className="muted">All required documents are present.</p>
        )}
      </div>

      <div className="panel">
        <h3>Reviewer requests</h3>
        {openRequests.length === 0 ? (
          <p className="muted">No open requests from reviewers.</p>
        ) : (
          <ul className="checklist">
            {openRequests.map((request) => (
              <li key={request.id}>
                <span>
                  {request.documentType.name}: {request.message}
                </span>
                <span className="status-badge status-badge--warning">{request.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="button button--primary"
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
        >
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>
    </section>
  );
}
