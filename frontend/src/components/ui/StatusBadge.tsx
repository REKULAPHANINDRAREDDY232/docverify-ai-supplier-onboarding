import type { DocumentStatus, SupplierStatus } from '../../types/domain';
import { DOCUMENT_STATUS_LABELS, SUPPLIER_STATUS_LABELS } from '../../types/domain';

type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const supplierTone: Record<SupplierStatus, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  IN_REVIEW: 'info',
  NEEDS_INFORMATION: 'warning',
  APPROVED: 'success',
  ON_HOLD: 'danger',
};

const documentTone: Record<DocumentStatus, StatusTone> = {
  ACTIVE: 'success',
  REPLACED: 'neutral',
};

interface StatusBadgeProps {
  status: SupplierStatus | DocumentStatus;
  kind?: 'supplier' | 'document';
}

export function StatusBadge({ status, kind = 'supplier' }: StatusBadgeProps) {
  const tone =
    kind === 'document'
      ? documentTone[status as DocumentStatus]
      : supplierTone[status as SupplierStatus];

  const label =
    kind === 'document'
      ? DOCUMENT_STATUS_LABELS[status as DocumentStatus]
      : SUPPLIER_STATUS_LABELS[status as SupplierStatus];

  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}
