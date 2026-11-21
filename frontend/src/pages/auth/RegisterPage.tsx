import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { defaultPathForRole } from '../../auth/paths';
import { TextField } from '../../components/ui/FormField';
import { env } from '../../config/env';

export function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    legalName: '',
    tradingName: '',
    registrationNumber: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={defaultPathForRole(user.role)} replace />;
  }

  function updateField(field: keyof typeof form) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const authenticated = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        companyName: form.companyName,
        legalName: form.legalName || undefined,
        tradingName: form.tradingName || undefined,
        registrationNumber: form.registrationNumber || undefined,
      });
      navigate(defaultPathForRole(authenticated.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card auth-card--wide" onSubmit={onSubmit}>
        <p className="landing__brand">{env.appName}</p>
        <h1>Supplier registration</h1>
        <p className="muted">
          Create a supplier contact account. Reviewer and admin access is provisioned separately.
        </p>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="form-grid form-grid--two">
          <TextField
            label="Contact name"
            htmlFor="name"
            name="name"
            required
            value={form.name}
            onChange={updateField('name')}
          />
          <TextField
            label="Work email"
            htmlFor="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={updateField('email')}
          />
          <TextField
            label="Password"
            htmlFor="password"
            name="password"
            type="password"
            required
            hint="At least 10 characters."
            value={form.password}
            onChange={updateField('password')}
          />
          <TextField
            label="Company name"
            htmlFor="companyName"
            name="companyName"
            required
            value={form.companyName}
            onChange={updateField('companyName')}
          />
          <TextField
            label="Legal name"
            htmlFor="legalName"
            name="legalName"
            hint="Defaults to company name if left blank."
            value={form.legalName}
            onChange={updateField('legalName')}
          />
          <TextField
            label="Trading name"
            htmlFor="tradingName"
            name="tradingName"
            value={form.tradingName}
            onChange={updateField('tradingName')}
          />
          <TextField
            label="Registration number"
            htmlFor="registrationNumber"
            name="registrationNumber"
            value={form.registrationNumber}
            onChange={updateField('registrationNumber')}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create supplier account'}
          </button>
        </div>

        <p className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
