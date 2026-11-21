import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import {
  createAdminDocumentType,
  fetchAdminDocumentTypes,
  updateAdminDocumentType,
  type AdminDocumentTypeDto,
} from '../../api/admin';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField, TextAreaField, TextField } from '../../components/ui/FormField';

export function AdminDocumentTypes() {
  const [items, setItems] = useState<AdminDocumentTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDocumentTypes();
      setItems(data.documentTypes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load document types.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial document-type catalogue fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remote list load on mount
    void load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await createAdminDocumentType({
        name: String(form.get('name') ?? ''),
        code: String(form.get('code') ?? '').toUpperCase(),
        description: String(form.get('description') ?? '') || null,
        required: form.get('required') === 'true',
        active: form.get('active') === 'true',
      });
      event.currentTarget.reset();
      setMessage('Document type created.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create document type.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: AdminDocumentTypeDto) {
    setUpdatingId(item.id);
    setError(null);
    try {
      await updateAdminDocumentType(item.id, { active: !item.active });
      setMessage(`${item.code} is now ${item.active ? 'inactive' : 'active'}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update document type.');
    } finally {
      setUpdatingId(null);
    }
  }

  const columns: Column<AdminDocumentTypeDto>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'code', header: 'Code', render: (row) => <code>{row.code}</code> },
    { key: 'required', header: 'Required', render: (row) => (row.required ? 'Yes' : 'No') },
    { key: 'active', header: 'Active', render: (row) => (row.active ? 'Yes' : 'No') },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          type="button"
          className="button button--secondary"
          disabled={updatingId === row.id}
          onClick={() => void toggleActive(row)}
        >
          {row.active ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ];

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Document types</h2>
          <p className="muted">
            Maintain the required document catalogue used by checklists and supplier uploads.
          </p>
        </div>
      </div>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <form className="panel form-grid form-grid--two" onSubmit={handleCreate}>
        <TextField label="Name" htmlFor="dtName" name="name" required />
        <TextField
          label="Code"
          htmlFor="dtCode"
          name="code"
          required
          placeholder="BUSINESS_REGISTRATION"
          hint="Uppercase letters, numbers, and underscores"
        />
        <TextAreaField label="Description" htmlFor="dtDescription" name="description" rows={3} />
        <SelectField
          label="Required"
          htmlFor="dtRequired"
          name="required"
          defaultValue="true"
          options={[
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ]}
        />
        <SelectField
          label="Active"
          htmlFor="dtActive"
          name="active"
          defaultValue="true"
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add document type'}
          </button>
        </div>
      </form>

      <div className="panel">
        {loading ? (
          <p className="muted">Loading document types…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            emptyMessage="No document types yet."
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </section>
  );
}
