import { DataTable, type Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { DocumentTypeCode, SupplierStatus } from '../../types/domain';
import { DOCUMENT_TYPE_LABELS } from '../../types/domain';

interface ReviewQueueRow {
  id: string;
  supplierName: string;
  documentType: DocumentTypeCode;
  supplierStatus: SupplierStatus;
  submittedAt: string;
}

const columns: Column<ReviewQueueRow>[] = [
  {
    key: 'supplier',
    header: 'Supplier',
    render: (row) => row.supplierName,
  },
  {
    key: 'document',
    header: 'Document',
    render: (row) => DOCUMENT_TYPE_LABELS[row.documentType],
  },
  {
    key: 'status',
    header: 'Supplier status',
    render: (row) => <StatusBadge status={row.supplierStatus} />,
  },
  {
    key: 'submittedAt',
    header: 'Submitted',
    render: (row) => row.submittedAt,
  },
];

export function ReviewerQueue() {
  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Review queue</h2>
          <p className="muted">Prioritise submitted supplier packs waiting for document checks.</p>
        </div>
      </div>

      <div className="stats-row" aria-label="Queue summary">
        <div className="stat">
          <span className="stat__label">Awaiting review</span>
          <strong className="stat__value">—</strong>
        </div>
        <div className="stat">
          <span className="stat__label">Needs information</span>
          <strong className="stat__value">—</strong>
        </div>
        <div className="stat">
          <span className="stat__label">Approved today</span>
          <strong className="stat__value">—</strong>
        </div>
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          rows={[]}
          emptyMessage="The review queue is empty until suppliers submit onboarding packets."
          getRowKey={(row) => row.id}
        />
      </div>
    </section>
  );
}
