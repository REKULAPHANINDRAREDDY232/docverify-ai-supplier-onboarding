import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { fetchAdminSuppliers, type AdminSupplierDto } from '../../api/admin';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField, TextField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SUPPLIER_STATUSES, type SupplierStatus } from '../../types/domain';

const columns: Column<AdminSupplierDto>[] = [
  {
    key: 'company',
    header: 'Company',
    render: (row) => (
      <span>
        <strong>{row.companyName}</strong>
        <span className="muted"> · {row.legalName}</span>
      </span>
    ),
  },
  {
    key: 'contact',
    header: 'Contact',
    render: (row) => (
      <span>
        {row.contactPerson}
        <span className="muted"> · {row.contactEmail}</span>
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: 'docs',
    header: 'Documents',
    render: (row) => row._count.documents,
  },
  {
    key: 'updated',
    header: 'Updated',
    render: (row) => new Date(row.updatedAt).toLocaleString(),
  },
];

export function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState<AdminSupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<SupplierStatus | ''>('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminSuppliers({ q: q || undefined, status });
      setSuppliers(data.suppliers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load suppliers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, []);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    void load();
  }

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Suppliers</h2>
          <p className="muted">Browse onboarding records and filter by company or status.</p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <form className="panel form-grid form-grid--two" onSubmit={handleSearch}>
        <TextField
          label="Search"
          htmlFor="supplierQ"
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Company, legal name, or email"
        />
        <SelectField
          label="Status"
          htmlFor="supplierStatus"
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as SupplierStatus | '')}
          options={[
            { value: '', label: 'All statuses' },
            ...SUPPLIER_STATUSES.map((value) => ({ value, label: value })),
          ]}
        />
        <div className="form-actions">
          <button type="submit" className="button button--secondary">
            Search
          </button>
        </div>
      </form>

      <div className="panel">
        {loading ? (
          <p className="muted">Loading suppliers…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={suppliers}
            emptyMessage="No suppliers found."
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </section>
  );
}
