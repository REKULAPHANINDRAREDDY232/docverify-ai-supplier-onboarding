import { useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import {
  documentDownloadUrl,
  uploadSupplierDocument,
  type SupplierDocumentDto,
} from '../../api/suppliers';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';
import { DOCUMENT_TYPE_LABELS, type DocumentTypeCode } from '../../types/domain';

export function SupplierDocuments() {
  const { supplier, documents, documentTypes, loading, error, refresh } = useSupplierPortal();
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [replaceDocumentId, setReplaceDocumentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeDocuments = useMemo(
    () => documents.filter((doc) => doc.status === 'ACTIVE'),
    [documents],
  );

  const selectedActive = activeDocuments.find((doc) => doc.documentTypeId === documentTypeId);

  const columns: Column<SupplierDocumentDto>[] = [
    {
      key: 'type',
      header: 'Document type',
      render: (row) =>
        DOCUMENT_TYPE_LABELS[row.documentType.code as DocumentTypeCode] ?? row.documentType.name,
    },
    {
      key: 'filename',
      header: 'File',
      render: (row) => row.originalFilename,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} kind="document" />,
    },
    {
      key: 'uploadedAt',
      header: 'Uploaded',
      render: (row) => new Date(row.uploadedAt).toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.status === 'ACTIVE' ? (
          <a
            className="button button--secondary"
            href={documentDownloadUrl(row.id)}
            target="_blank"
            rel="noreferrer"
          >
            Download
          </a>
        ) : (
          <span className="muted">Replaced</span>
        ),
    },
  ];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supplier || !file || !documentTypeId) {
      setFormError('Select a document type and choose a PDF, JPG, or PNG file.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setFormError(null);
    setMessage(null);

    try {
      await uploadSupplierDocument({
        supplierId: supplier.id,
        documentTypeId,
        file,
        replaceDocumentId: replaceDocumentId || selectedActive?.id,
        onProgress: setProgress,
      });
      setMessage(
        selectedActive || replaceDocumentId
          ? 'Replacement uploaded. Previous file marked as replaced.'
          : 'Document uploaded successfully.',
      );
      setFile(null);
      setReplaceDocumentId('');
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <p className="muted">Loading documents…</p>;
  }

  if (!supplier) {
    return <p className="form-error">Create a supplier profile before uploading documents.</p>;
  }

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Required documents</h2>
          <p className="muted">
            Upload business registration, bank confirmation, and insurance certificate files.
          </p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <form className="panel form-grid" onSubmit={onSubmit}>
        <SelectField
          label="Document type"
          htmlFor="documentTypeId"
          value={documentTypeId}
          onChange={(event) => setDocumentTypeId(event.target.value)}
          options={[
            { value: '', label: 'Select document type' },
            ...documentTypes.map((type) => ({
              value: type.id,
              label: DOCUMENT_TYPE_LABELS[type.code as DocumentTypeCode] ?? type.name,
            })),
          ]}
        />
        <label className="form-field" htmlFor="documentFile">
          <span className="form-field__label">File upload</span>
          <input
            id="documentFile"
            className="form-field__control"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span className="form-field__hint">PDF, JPG, or PNG. Maximum 10 MB.</span>
        </label>
        {selectedActive ? (
          <p className="muted">
            An active file already exists for this type ({selectedActive.originalFilename}).
            Uploading again will mark the previous file as replaced.
          </p>
        ) : null}
        {uploading ? (
          <div className="progress">
            <div className="progress__bar" style={{ width: `${progress}%` }} />
            <span className="progress__label">{progress}%</span>
          </div>
        ) : null}
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={uploading}>
            {uploading
              ? 'Uploading…'
              : selectedActive
                ? 'Upload replacement'
                : 'Upload document'}
          </button>
        </div>
      </form>

      <div className="panel">
        <h3>Uploaded documents</h3>
        <DataTable
          columns={columns}
          rows={documents}
          emptyMessage="No documents uploaded yet."
          getRowKey={(row) => row.id}
        />
      </div>
    </section>
  );
}
