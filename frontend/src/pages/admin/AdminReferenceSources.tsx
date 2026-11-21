import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import {
  createAdminReferenceSource,
  fetchAdminReferenceSources,
  updateAdminReferenceSource,
  type AdminReferenceSourceDto,
} from '../../api/admin';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { TextAreaField, TextField } from '../../components/ui/FormField';

function toDateInput(value: string): string {
  return value.slice(0, 10);
}

export function AdminReferenceSources() {
  const [items, setItems] = useState<AdminReferenceSourceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdminReferenceSourceDto | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminReferenceSources();
      setItems(data.referenceSources);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load reference sources.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get('title') ?? ''),
      version: String(form.get('version') ?? ''),
      effectiveDate: String(form.get('effectiveDate') ?? ''),
      sourceDescription: String(form.get('sourceDescription') ?? ''),
    };

    try {
      if (editing) {
        await updateAdminReferenceSource(editing.id, payload);
        setMessage('Reference source updated.');
        setEditing(null);
      } else {
        await createAdminReferenceSource(payload);
        setMessage('Reference source created.');
      }
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save reference source.');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<AdminReferenceSourceDto>[] = [
    { key: 'title', header: 'Title', render: (row) => row.title },
    { key: 'version', header: 'Version', render: (row) => row.version },
    {
      key: 'effective',
      header: 'Effective',
      render: (row) => toDateInput(row.effectiveDate),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => row.sourceDescription,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button type="button" className="button button--secondary" onClick={() => setEditing(row)}>
          Edit
        </button>
      ),
    },
  ];

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Reference sources</h2>
          <p className="muted">
            Maintain policy and guidance metadata that procurement teams reference during
            onboarding.
          </p>
        </div>
      </div>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <form
        key={editing?.id ?? 'create'}
        className="panel form-grid form-grid--two"
        onSubmit={handleSubmit}
      >
        <h3>{editing ? 'Edit reference source' : 'Add reference source'}</h3>
        <TextField
          label="Title"
          htmlFor="rsTitle"
          name="title"
          required
          defaultValue={editing?.title}
        />
        <TextField
          label="Version"
          htmlFor="rsVersion"
          name="version"
          required
          defaultValue={editing?.version ?? '1.0'}
        />
        <TextField
          label="Effective date"
          htmlFor="rsEffective"
          name="effectiveDate"
          type="date"
          required
          defaultValue={editing ? toDateInput(editing.effectiveDate) : ''}
        />
        <TextAreaField
          label="Source description"
          htmlFor="rsDescription"
          name="sourceDescription"
          rows={4}
          required
          defaultValue={editing?.sourceDescription}
        />
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Update source' : 'Add source'}
          </button>
          {editing ? (
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel">
        {loading ? (
          <p className="muted">Loading reference sources…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            emptyMessage="No reference sources yet."
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </section>
  );
}
