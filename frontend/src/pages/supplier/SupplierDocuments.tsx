import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  DOCUMENT_TYPE_CODES,
  DOCUMENT_TYPE_LABELS,
  type DocumentStatus,
  type DocumentTypeCode,
} from '../../types/domain';

interface DocumentRow {
  id: string;
  documentType: DocumentTypeCode;
  filename: string;
  status: DocumentStatus;
  uploadedAt: string;
}

const columns: Column<DocumentRow>[] = [
  {
    key: 'type',
    header: 'Document type',
    render: (row) => DOCUMENT_TYPE_LABELS[row.documentType],
  },
  {
    key: 'filename',
    header: 'File',
    render: (row) => row.filename,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} kind="document" />,
  },
  {
    key: 'uploadedAt',
    header: 'Uploaded',
    render: (row) => row.uploadedAt,
  },
];

export function SupplierDocuments() {
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

      <form
        className="panel form-grid"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <SelectField
          label="Document type"
          htmlFor="documentType"
          name="documentType"
          options={DOCUMENT_TYPE_CODES.map((type) => ({
            value: type,
            label: DOCUMENT_TYPE_LABELS[type],
          }))}
        />
        <label className="form-field" htmlFor="documentFile">
          <span className="form-field__label">File upload</span>
          <input id="documentFile" className="form-field__control" type="file" name="documentFile" />
          <span className="form-field__hint">
            PDF or image files. Upload wiring will use Multer later.
          </span>
        </label>
        <div className="form-actions">
          <button type="submit" className="button button--primary">
            Queue upload
          </button>
        </div>
      </form>

      <div className="panel">
        <h3>Uploaded documents</h3>
        <DataTable
          columns={columns}
          rows={[]}
          emptyMessage="No documents uploaded yet. Files will appear here after the upload API is connected."
          getRowKey={(row) => row.id}
        />
      </div>
    </section>
  );
}
