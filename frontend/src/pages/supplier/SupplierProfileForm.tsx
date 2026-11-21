import { useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { createSupplier, updateSupplier } from '../../api/suppliers';
import { useAuth } from '../../auth/AuthContext';
import { TextAreaField, TextField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';

type ProfileFormState = {
  companyName: string;
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  contactPerson: string;
  contactEmail: string;
  notes: string;
};

export function SupplierProfileForm() {
  const { user, refresh: refreshAuth } = useAuth();
  const { supplier, loading, error, refresh } = useSupplierPortal();
  const [draft, setDraft] = useState<Partial<ProfileFormState>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const defaults = useMemo<ProfileFormState>(
    () => ({
      companyName: supplier?.companyName ?? user?.supplierAsContact?.companyName ?? '',
      legalName: supplier?.legalName ?? user?.supplierAsContact?.legalName ?? '',
      tradingName: supplier?.tradingName ?? '',
      registrationNumber: supplier?.registrationNumber ?? '',
      contactPerson: supplier?.contactPerson ?? user?.name ?? '',
      contactEmail: supplier?.contactEmail ?? user?.email ?? '',
      notes: supplier?.notes ?? '',
    }),
    [supplier, user],
  );

  const form: ProfileFormState = {
    companyName: draft.companyName ?? defaults.companyName,
    legalName: draft.legalName ?? defaults.legalName,
    tradingName: draft.tradingName ?? defaults.tradingName,
    registrationNumber: draft.registrationNumber ?? defaults.registrationNumber,
    contactPerson: draft.contactPerson ?? defaults.contactPerson,
    contactEmail: draft.contactEmail ?? defaults.contactEmail,
    notes: draft.notes ?? defaults.notes,
  };

  function updateField<K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setMessage(null);

    const payload = {
      companyName: form.companyName,
      legalName: form.legalName || form.companyName,
      tradingName: form.tradingName || null,
      registrationNumber: form.registrationNumber || null,
      contactPerson: form.contactPerson,
      contactEmail: form.contactEmail,
      notes: form.notes || null,
    };

    try {
      if (supplier) {
        await updateSupplier(supplier.id, payload);
        setMessage('Supplier profile updated.');
      } else {
        await createSupplier(payload);
        setMessage('Supplier profile created.');
      }
      setDraft({});
      await Promise.all([refresh(), refreshAuth()]);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to save supplier profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="muted">Loading supplier profile…</p>;
  }

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>{supplier ? 'Edit company profile' : 'Create company profile'}</h2>
          <p className="muted">Store legal entity and contact details for procurement review.</p>
        </div>
        {supplier ? <StatusBadge status={supplier.status} /> : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <form className="panel form-grid" onSubmit={onSubmit}>
        <TextField
          label="Company name"
          htmlFor="companyName"
          required
          value={form.companyName}
          onChange={(event) => updateField('companyName', event.target.value)}
        />
        <TextField
          label="Legal company name"
          htmlFor="legalName"
          required
          value={form.legalName}
          onChange={(event) => updateField('legalName', event.target.value)}
        />
        <TextField
          label="Trading name"
          htmlFor="tradingName"
          value={form.tradingName}
          onChange={(event) => updateField('tradingName', event.target.value)}
        />
        <TextField
          label="Company registration number"
          htmlFor="registrationNumber"
          value={form.registrationNumber}
          onChange={(event) => updateField('registrationNumber', event.target.value)}
        />
        <TextField
          label="Contact person"
          htmlFor="contactPerson"
          required
          value={form.contactPerson}
          onChange={(event) => updateField('contactPerson', event.target.value)}
        />
        <TextField
          label="Contact email"
          htmlFor="contactEmail"
          type="email"
          required
          value={form.contactEmail}
          onChange={(event) => updateField('contactEmail', event.target.value)}
        />
        <TextAreaField
          label="Optional notes"
          htmlFor="notes"
          rows={4}
          value={form.notes}
          onChange={(event) => updateField('notes', event.target.value)}
        />
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? 'Saving…' : supplier ? 'Save changes' : 'Create profile'}
          </button>
        </div>
      </form>
    </section>
  );
}
