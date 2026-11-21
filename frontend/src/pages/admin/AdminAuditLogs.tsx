import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { fetchAdminAuditLogs, type AdminAuditLogDto } from '../../api/admin';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { TextField } from '../../components/ui/FormField';

const columns: Column<AdminAuditLogDto>[] = [
  {
    key: 'when',
    header: 'When',
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
  {
    key: 'actor',
    header: 'Actor',
    render: (row) => row.actor?.email ?? 'System',
  },
  {
    key: 'action',
    header: 'Action',
    render: (row) => <code>{row.action}</code>,
  },
  {
    key: 'entity',
    header: 'Entity',
    render: (row) => (
      <span>
        {row.entityType}
        <span className="muted"> · {row.entityId}</span>
      </span>
    ),
  },
];

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AdminAuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminAuditLogs({
        q: q || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
      });
      setLogs(data.auditLogs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial audit log fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remote list load on mount
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
          <h2>Audit logs</h2>
          <p className="muted">
            Review important authentication, role, catalogue, and onboarding change records.
          </p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <form className="panel form-grid form-grid--two" onSubmit={handleSearch}>
        <TextField
          label="Search"
          htmlFor="auditQ"
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Action, entity type, or id"
        />
        <TextField
          label="Action contains"
          htmlFor="auditAction"
          name="action"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="ADMIN_USER"
        />
        <TextField
          label="Entity type"
          htmlFor="auditEntity"
          name="entityType"
          value={entityType}
          onChange={(event) => setEntityType(event.target.value)}
          placeholder="User"
        />
        <div className="form-actions">
          <button type="submit" className="button button--secondary">
            Search
          </button>
        </div>
      </form>

      <div className="panel">
        {loading ? (
          <p className="muted">Loading audit logs…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={logs}
            emptyMessage="No audit records found."
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </section>
  );
}
