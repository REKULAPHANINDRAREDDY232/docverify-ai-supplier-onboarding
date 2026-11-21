import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import {
  correctSupplierDetails,
  createReviewerDocumentRequest,
  fetchDocumentBlob,
  saveChecklistCheck,
  submitReviewDecision,
  type ChecklistCheckDto,
} from '../../api/reviewer';
import { SelectField, TextAreaField, TextField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useReviewerSupplierDetail } from '../../hooks/useReviewerSupplierDetail';
import {
  CHECKLIST_STATUSES,
  DOCUMENT_TYPE_LABELS,
  REVIEW_DECISIONS,
  type ChecklistStatus,
  type DocumentTypeCode,
  type ReviewDecision,
} from '../../types/domain';

export function ReviewerSupplierDetailPage() {
  const { id = '' } = useParams();
  const {
    detail,
    documentTypes,
    checkDrafts,
    setCheckDrafts,
    correction,
    setCorrection,
    loading,
    error,
    setError,
    refresh,
  } = useReviewerSupplierDetail(id);

  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [previewMime, setPreviewMime] = useState('');
  const [decision, setDecision] = useState<ReviewDecision>('NEEDS_INFORMATION');
  const [decisionComment, setDecisionComment] = useState('');
  const [requestTypeId, setRequestTypeId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const selectedRequestTypeId = requestTypeId || documentTypes[0]?.id || '';

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const checksByItem = useMemo(() => {
    const map = new Map<string, ChecklistCheckDto>();
    detail?.supplier.checklistChecks.forEach((check) => map.set(check.checklistItemId, check));
    return map;
  }, [detail]);

  const activeDocs = detail?.supplier.documents.filter((doc) => doc.status === 'ACTIVE') ?? [];

  async function openPreview(documentId: string, name: string, mimeType: string) {
    try {
      const blob = await fetchDocumentBlob(documentId);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
      setPreviewName(name);
      setPreviewMime(mimeType);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to preview document.');
    }
  }

  async function onSaveCheck(itemId: string) {
    const draft = checkDrafts[itemId];
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await saveChecklistCheck(id, itemId, {
        status: draft.status,
        comment: draft.comment || undefined,
      });
      setMessage('Checklist result saved.');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save checklist result.');
    } finally {
      setBusy(false);
    }
  }

  async function onDecision(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await submitReviewDecision(id, {
        decision,
        comment: decisionComment || undefined,
      });
      setMessage('Review decision recorded.');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to record decision.');
    } finally {
      setBusy(false);
    }
  }

  async function onRequest(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await createReviewerDocumentRequest(id, {
        documentTypeId: selectedRequestTypeId,
        message: requestMessage,
      });
      setRequestMessage('');
      setMessage('Document request sent. Supplier status set to NEEDS_INFORMATION.');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create document request.');
    } finally {
      setBusy(false);
    }
  }

  async function onCorrection(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await correctSupplierDetails(id, {
        companyName: correction.companyName,
        legalName: correction.legalName,
        tradingName: correction.tradingName || null,
        registrationNumber: correction.registrationNumber || null,
        contactPerson: correction.contactPerson,
        contactEmail: correction.contactEmail,
        notes: correction.notes || null,
        reason: correction.reason,
      });
      setMessage('Manual correction saved with audit history.');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save correction.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading supplier review packet…</p>;
  if (error && !detail) return <p className="form-error">{error}</p>;
  if (!detail) return <p className="form-error">Supplier not found.</p>;

  const { supplier, checklistItems, auditLogs } = detail;

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <p className="muted">
            <Link to="/reviewer/suppliers">← Suppliers</Link>
          </p>
          <h2>{supplier.companyName}</h2>
          <p className="muted">
            {supplier.legalName} · {supplier.contactPerson} · {supplier.contactEmail}
          </p>
        </div>
        <StatusBadge status={supplier.status} />
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="split-panels">
        <div className="panel">
          <h3>Supplier information</h3>
          <dl className="detail-list">
            <div>
              <dt>Trading name</dt>
              <dd>{supplier.tradingName || '—'}</dd>
            </div>
            <div>
              <dt>Registration number</dt>
              <dd>{supplier.registrationNumber || '—'}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{supplier.notes || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <h3>Documents</h3>
          {activeDocs.length === 0 ? (
            <p className="muted">No active documents uploaded.</p>
          ) : (
            <ul className="checklist">
              {activeDocs.map((doc) => (
                <li key={doc.id}>
                  <span>
                    {DOCUMENT_TYPE_LABELS[doc.documentType.code as DocumentTypeCode] ??
                      doc.documentType.name}
                    <div className="muted">{doc.originalFilename}</div>
                  </span>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => void openPreview(doc.id, doc.originalFilename, doc.mimeType)}
                  >
                    Preview
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {previewUrl ? (
        <div className="panel">
          <h3>Document preview · {previewName}</h3>
          {previewMime.startsWith('image/') ? (
            <img className="preview-media" src={previewUrl} alt={previewName} />
          ) : (
            <iframe className="preview-frame" title={previewName} src={previewUrl} />
          )}
          <div className="form-actions">
            <a className="button button--secondary" href={previewUrl} download={previewName}>
              Download
            </a>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
            >
              Close preview
            </button>
          </div>
        </div>
      ) : null}

      <div className="panel">
        <h3>Manual checklist</h3>
        <p className="muted">
          Compare uploaded documents and supplier fields against the configured checklist. No OCR
          or AI scoring is used.
        </p>
        <div className="stack">
          {checklistItems.map((item) => {
            const draft = checkDrafts[item.id] ?? {
              status: 'NEEDS_REVIEW' as ChecklistStatus,
              comment: '',
            };
            const existing = checksByItem.get(item.id);
            return (
              <div key={item.id} className="checklist-card">
                <div className="page-header">
                  <div>
                    <h4>{item.title}</h4>
                    <p className="muted">{item.description}</p>
                  </div>
                  {existing ? (
                    <span className="muted">
                      Last by {existing.checkedBy.name} ·{' '}
                      {new Date(existing.checkedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                <div className="form-grid form-grid--two">
                  <SelectField
                    label="Status"
                    htmlFor={`check-status-${item.id}`}
                    value={draft.status}
                    onChange={(event) =>
                      setCheckDrafts((current) => ({
                        ...current,
                        [item.id]: {
                          ...draft,
                          status: event.target.value as ChecklistStatus,
                        },
                      }))
                    }
                    options={CHECKLIST_STATUSES.map((status) => ({
                      value: status,
                      label: status.replaceAll('_', ' '),
                    }))}
                  />
                  <TextAreaField
                    label="Reviewer comment"
                    htmlFor={`check-comment-${item.id}`}
                    rows={3}
                    value={draft.comment}
                    onChange={(event) =>
                      setCheckDrafts((current) => ({
                        ...current,
                        [item.id]: { ...draft, comment: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={busy}
                    onClick={() => void onSaveCheck(item.id)}
                  >
                    Save checklist result
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="split-panels">
        <form className="panel form-grid" onSubmit={onDecision}>
          <h3>Review decision</h3>
          <SelectField
            label="Decision"
            htmlFor="decision"
            value={decision}
            onChange={(event) => setDecision(event.target.value as ReviewDecision)}
            options={REVIEW_DECISIONS.map((item) => ({
              value: item,
              label: item.replaceAll('_', ' '),
            }))}
          />
          <TextAreaField
            label="Reviewer notes"
            htmlFor="decisionComment"
            rows={4}
            value={decisionComment}
            onChange={(event) => setDecisionComment(event.target.value)}
          />
          <div className="form-actions">
            <button type="submit" className="button button--primary" disabled={busy}>
              Record decision
            </button>
          </div>
        </form>

        <form className="panel form-grid" onSubmit={onRequest}>
          <h3>Request document</h3>
          <SelectField
            label="Document type"
            htmlFor="requestType"
            value={selectedRequestTypeId}
            onChange={(event) => setRequestTypeId(event.target.value)}
            options={documentTypes.map((type) => ({
              value: type.id,
              label: DOCUMENT_TYPE_LABELS[type.code as DocumentTypeCode] ?? type.name,
            }))}
          />
          <TextAreaField
            label="Explanation for supplier"
            htmlFor="requestMessage"
            rows={4}
            required
            value={requestMessage}
            onChange={(event) => setRequestMessage(event.target.value)}
          />
          <div className="form-actions">
            <button type="submit" className="button button--primary" disabled={busy}>
              Send request
            </button>
          </div>
        </form>
      </div>

      <form className="panel form-grid form-grid--two" onSubmit={onCorrection}>
        <h3 className="span-2">Manual company detail correction</h3>
        <p className="muted span-2">
          Previous values are preserved in audit history when you save a correction.
        </p>
        <TextField
          label="Company name"
          htmlFor="corrCompany"
          value={correction.companyName}
          onChange={(event) =>
            setCorrection((current) => ({ ...current, companyName: event.target.value }))
          }
        />
        <TextField
          label="Legal name"
          htmlFor="corrLegal"
          value={correction.legalName}
          onChange={(event) =>
            setCorrection((current) => ({ ...current, legalName: event.target.value }))
          }
        />
        <TextField
          label="Trading name"
          htmlFor="corrTrading"
          value={correction.tradingName}
          onChange={(event) =>
            setCorrection((current) => ({ ...current, tradingName: event.target.value }))
          }
        />
        <TextField
          label="Registration number"
          htmlFor="corrReg"
          value={correction.registrationNumber}
          onChange={(event) =>
            setCorrection((current) => ({
              ...current,
              registrationNumber: event.target.value,
            }))
          }
        />
        <TextField
          label="Contact person"
          htmlFor="corrPerson"
          value={correction.contactPerson}
          onChange={(event) =>
            setCorrection((current) => ({ ...current, contactPerson: event.target.value }))
          }
        />
        <TextField
          label="Contact email"
          htmlFor="corrEmail"
          type="email"
          value={correction.contactEmail}
          onChange={(event) =>
            setCorrection((current) => ({ ...current, contactEmail: event.target.value }))
          }
        />
        <TextAreaField
          label="Notes"
          htmlFor="corrNotes"
          rows={3}
          value={correction.notes}
          onChange={(event) =>
            setCorrection((current) => ({ ...current, notes: event.target.value }))
          }
        />
        <TextAreaField
          label="Correction reason"
          htmlFor="corrReason"
          rows={3}
          required
          value={correction.reason}
          onChange={(event) =>
            setCorrection((current) => ({ ...current, reason: event.target.value }))
          }
        />
        <div className="form-actions span-2">
          <button type="submit" className="button button--primary" disabled={busy}>
            Save correction
          </button>
        </div>
      </form>

      <div className="split-panels">
        <div className="panel">
          <h3>Review history</h3>
          {supplier.reviewActions.length === 0 ? (
            <p className="muted">No decisions recorded yet.</p>
          ) : (
            <ul className="checklist">
              {supplier.reviewActions.map((action) => (
                <li key={action.id}>
                  <span>
                    {action.decision.replaceAll('_', ' ')}
                    <div className="muted">
                      {action.reviewer.name} · {new Date(action.createdAt).toLocaleString()}
                    </div>
                    {action.comment ? <div>{action.comment}</div> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h3>Audit trail</h3>
          {auditLogs.length === 0 ? (
            <p className="muted">No audit entries for this supplier.</p>
          ) : (
            <ul className="checklist">
              {auditLogs.slice(0, 12).map((log) => (
                <li key={log.id}>
                  <span>
                    {log.action}
                    <div className="muted">
                      {log.actor?.name ?? 'System'} · {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel">
        <h3>Open document requests</h3>
        {supplier.documentRequests.filter((item) => item.status === 'OPEN').length === 0 ? (
          <p className="muted">No open requests.</p>
        ) : (
          <ul className="checklist">
            {supplier.documentRequests
              .filter((item) => item.status === 'OPEN')
              .map((item) => (
                <li key={item.id}>
                  <span>
                    {item.documentType.name}: {item.message}
                  </span>
                  <span className="status-badge status-badge--warning">OPEN</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}
