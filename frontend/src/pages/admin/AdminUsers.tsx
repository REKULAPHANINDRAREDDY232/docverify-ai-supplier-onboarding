import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import {
  createAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminUserDto,
} from '../../api/admin';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField, TextField } from '../../components/ui/FormField';
import { USER_ROLES, type UserRole } from '../../types/domain';

const columns: Column<AdminUserDto>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (row) => row.name,
  },
  {
    key: 'email',
    header: 'Email',
    render: (row) => row.email,
  },
  {
    key: 'role',
    header: 'Role',
    render: (row) => <code>{row.role}</code>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (row.isActive ? 'Active' : 'Inactive'),
  },
];

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers({
        q: q || undefined,
        role: roleFilter,
        isActive: activeFilter,
      });
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await createAdminUser({
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        role: String(form.get('role') ?? 'REVIEWER') as UserRole,
      });
      event.currentTarget.reset();
      setMessage('User created.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(user: AdminUserDto, role: UserRole) {
    setUpdatingId(user.id);
    setError(null);
    try {
      await updateAdminUser(user.id, { role });
      setMessage(`Updated role for ${user.email}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update role.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleActive(user: AdminUserDto) {
    setUpdatingId(user.id);
    setError(null);
    try {
      await updateAdminUser(user.id, { isActive: !user.isActive });
      setMessage(`${user.email} is now ${user.isActive ? 'inactive' : 'active'}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update user status.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Users</h2>
          <p className="muted">
            Search accounts, assign SUPPLIER_CONTACT, REVIEWER, or ADMIN roles, and activate or
            deactivate access.
          </p>
        </div>
      </div>

      {message ? <p className="form-success">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <form className="panel form-grid form-grid--two" onSubmit={handleCreate}>
        <TextField label="Full name" htmlFor="name" name="name" required />
        <TextField label="Email" htmlFor="email" name="email" type="email" required />
        <TextField
          label="Temporary password"
          htmlFor="password"
          name="password"
          type="password"
          minLength={10}
          required
        />
        <SelectField
          label="Role"
          htmlFor="role"
          name="role"
          defaultValue="REVIEWER"
          options={USER_ROLES.map((role) => ({ value: role, label: role }))}
        />
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>

      <form
        className="panel form-grid form-grid--two"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <TextField
          label="Search"
          htmlFor="q"
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Name or email"
        />
        <SelectField
          label="Role filter"
          htmlFor="roleFilter"
          name="roleFilter"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as UserRole | '')}
          options={[
            { value: '', label: 'All roles' },
            ...USER_ROLES.map((role) => ({ value: role, label: role })),
          ]}
        />
        <SelectField
          label="Status filter"
          htmlFor="activeFilter"
          name="activeFilter"
          value={activeFilter}
          onChange={(event) => setActiveFilter(event.target.value as '' | 'true' | 'false')}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
        <div className="form-actions">
          <button type="submit" className="button button--secondary">
            Search
          </button>
        </div>
      </form>

      <div className="panel">
        <h3>Directory</h3>
        {loading ? (
          <p className="muted">Loading users…</p>
        ) : (
          <DataTable
            columns={[
              ...columns,
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="inline-actions">
                    <select
                      aria-label={`Role for ${row.email}`}
                      value={row.role}
                      disabled={updatingId === row.id}
                      onChange={(event) =>
                        void handleRoleChange(row, event.target.value as UserRole)
                      }
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="button button--secondary"
                      disabled={updatingId === row.id}
                      onClick={() => void handleToggleActive(row)}
                    >
                      {row.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ),
              },
            ]}
            rows={users}
            emptyMessage="No users match the current filters."
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </section>
  );
}
