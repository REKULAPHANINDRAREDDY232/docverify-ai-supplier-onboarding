import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import {
  fetchReviewerSuppliers,
  type ReviewerSupplierListItem,
} from '../../api/reviewer';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField, TextField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SUPPLIER_STATUSES, type SupplierStatus } from '../../types/domain';

export function ReviewerSuppliers() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<SupplierStatus | ''>('SUBMITTED');
  const [suppliers, setSuppliers] = useState<ReviewerSupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchReviewerSuppliers({ q, status });
        if (!active) return;
        setSuppliers(data.suppliers);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load suppliers.');
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [q, status]);

  const columns: Column<ReviewerSupplierListItem>[] = [
    {
      key: 'company',
      header: 'Company',
      render: (row) => (
        <Link to={`/reviewer/suppliers/${row.id}`}>
          <strong>{row.companyName}</strong>
          <div className="muted">{row.legalName}</div>
        </Link>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <span>
          {row.contactPerson}
          <div className="muted">{row.contactEmail}</div>
        </span>
      ),
    },
    {
      key: 'docs',
      header: 'Active docs',
      render: (row) => row.documents.length,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row) => new Date(row.updatedAt).toLocaleString(),
    },
  ];

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Supplier packets</h2>
          <p className="muted">Search and filter submitted supplier onboarding packets.</p>
        </div>
      </div>

      <div className="panel form-grid form-grid--two">
        <TextField
          label="Search company name"
          htmlFor="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="e.g. Northwind"
        />
        <SelectField
          label="Onboarding status"
          htmlFor="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as SupplierStatus | '')}
          options={[
            { value: '', label: 'All reviewable statuses' },
            ...SUPPLIER_STATUSES.filter((item) => item !== 'DRAFT').map((item) => ({
              value: item,
              label: item.replaceAll('_', ' '),
            })),
          ]}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="panel">
        {loading ? (
          <p className="muted">Loading suppliers…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={suppliers}
            emptyMessage="No supplier packets match the current filters."
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </section>
  );
}
