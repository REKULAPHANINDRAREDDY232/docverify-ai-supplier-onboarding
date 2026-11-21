import { DataTable, type Column } from '../../components/ui/DataTable';
import { SelectField, TextField } from '../../components/ui/FormField';
import { USER_ROLES, type UserRole } from '../../types/domain';

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

const columns: Column<UserRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (row) => row.fullName,
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
];

export function AdminUsers() {
  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>User access</h2>
          <p className="muted">Invite reviewers and supplier contacts to the onboarding workspace.</p>
        </div>
      </div>

      <form
        className="panel form-grid"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <TextField label="Full name" htmlFor="fullName" name="fullName" required />
        <TextField label="Email" htmlFor="email" name="email" type="email" required />
        <SelectField
          label="Role"
          htmlFor="role"
          name="role"
          options={USER_ROLES.map((role) => ({ value: role, label: role }))}
        />
        <div className="form-actions">
          <button type="submit" className="button button--primary">
            Prepare invite
          </button>
        </div>
      </form>

      <div className="panel">
        <h3>Directory</h3>
        <DataTable
          columns={columns}
          rows={[]}
          emptyMessage="No users loaded. The directory will populate from the authenticated users API."
          getRowKey={(row) => row.id}
        />
      </div>
    </section>
  );
}
