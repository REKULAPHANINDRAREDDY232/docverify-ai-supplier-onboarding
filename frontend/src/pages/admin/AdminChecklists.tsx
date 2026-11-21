import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import {
  createAdminChecklistItem,
  fetchAdminChecklists,
  fetchAdminDocumentTypes,
  updateAdminChecklistItem,
  type AdminChecklistItemDto,
  type AdminDocumentTypeDto,
} from '../../api/admin';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField, TextAreaField, TextField } from '../../components/ui/FormField';

function toDateInput(value: string): string {
  return value.slice(0, 10);
}

export function AdminChecklists() {
  const [items, setItems] = useState<AdminChecklistItemDto[]>([]);
  const [documentTypes, setDocumentTypes] = useState<AdminDocumentTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminChecklistItemDto | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [checklistData, typeData] = await Promise.all([
        fetchAdminChecklists(),
        fetchAdminDocumentTypes(),
      ]);
      setItems(checklistData.checklistItems);
      setDocumentTypes(typeData.documentTypes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load checklist items.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial checklist catalogue fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remote list load on mount
    void load();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    const documentTypeId = String(form.get('documentTypeId') ?? '');
    const payload = {
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? '') || null,
      documentTypeId: documentTypeId || null,
      isRequired: form.get('isRequired') === 'true',
      isActive: form.get('isActive') === 'true',
      version: String(form.get('version') ?? ''),
      effectiveDate: String(form.get('effectiveDate') ?? ''),
    };

    try {
      if (editing) {
        await updateAdminChecklistItem(editing.id, payload);
        setMessage('Checklist item updated.');
        setEditing(null);
      } else {
        await createAdminChecklistItem(payload);
        setMessage('Checklist item created.');
      }
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save checklist item.');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(item: AdminChecklistItemDto) {
    setUpdatingId(item.id);
    setError(null);
    try {
      await updateAdminChecklistItem(item.id, { isActive: false });
      setMessage(`Deactivated “${item.title}”.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to deactivate checklist item.');
    } finally {
      setUpdatingId(null);
    }
  }

  const columns: Column<AdminChecklistItemDto>[] = [
    { key: 'title', header: 'Requirement', render: (row) => row.title },
    {
      key: 'type',
      header: 'Document type',
      render: (row) => row.documentType?.code ?? '—',
    },
    { key: 'required', header: 'Required', render: (row) => (row.isRequired ? 'Yes' : 'No') },
    { key: 'version', header: 'Version', render: (row) => row.version },
    {
      key: 'effective',
      header: 'Effective',
      render: (row) => toDateInput(row.effectiveDate),
    },
    { key: 'active', header: 'Active', render: (row) => (row.isActive ? 'Yes' : 'No') },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="inline-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setEditing(row)}
          >
            Edit
          </button>
          {row.isActive ? (
            <button
              type="button"
              className="button button--secondary"
              disabled={updatingId === row.id}
              onClick={() => void deactivate(row)}
            >
              Deactivate
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Onboarding checklists</h2>
          <p className="muted">
            Create and version checklist requirements, link them to document types, and set
            effective dates. Examples: business registration, bank confirmation, insurance
            certificate.
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
        <h3>{editing ? 'Edit checklist item' : 'New checklist item'}</h3>
        <TextField
          label="Requirement"
          htmlFor="clTitle"
          name="title"
          required
          defaultValue={editing?.title}
          placeholder="Business registration certificate"
        />
        <SelectField
          label="Document type"
          htmlFor="clDocumentType"
          name="documentTypeId"
          defaultValue={editing?.documentTypeId ?? ''}
          options={[
            { value: '', label: 'None' },
            ...documentTypes.map((type) => ({
              value: type.id,
              label: `${type.code} — ${type.name}`,
            })),
          ]}
        />
        <TextAreaField
          label="Description"
          htmlFor="clDescription"
          name="description"
          rows={3}
          defaultValue={editing?.description ?? ''}
        />
        <TextField
          label="Version"
          htmlFor="clVersion"
          name="version"
          required
          defaultValue={editing?.version ?? '1.0'}
        />
        <TextField
          label="Effective date"
          htmlFor="clEffective"
          name="effectiveDate"
          type="date"
          required
          defaultValue={editing ? toDateInput(editing.effectiveDate) : ''}
        />
        <SelectField
          label="Required"
          htmlFor="clRequired"
          name="isRequired"
          defaultValue={editing ? String(editing.isRequired) : 'true'}
          options={[
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ]}
        />
        <SelectField
          label="Active"
          htmlFor="clActive"
          name="isActive"
          defaultValue={editing ? String(editing.isActive) : 'true'}
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Update item' : 'Create item'}
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
          <p className="muted">Loading checklist items…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            emptyMessage="No checklist items yet."
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </section>
  );
}
