import { TextAreaField, TextField } from '../../components/ui/FormField';

export function SupplierProfileForm() {
  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Company profile</h2>
          <p className="muted">Provide legal entity details for procurement verification.</p>
        </div>
      </div>

      <form
        className="panel form-grid"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <TextField
          label="Legal company name"
          htmlFor="legalName"
          name="legalName"
          placeholder="Enter registered legal name"
          required
        />
        <TextField
          label="Trading name"
          htmlFor="tradingName"
          name="tradingName"
          placeholder="Optional trading or brand name"
        />
        <TextField
          label="Registration number"
          htmlFor="registrationNumber"
          name="registrationNumber"
          placeholder="Business registration identifier"
        />
        <TextField
          label="Country"
          htmlFor="country"
          name="country"
          placeholder="Country of registration"
          required
        />
        <TextAreaField
          label="Registered address"
          htmlFor="address"
          name="address"
          placeholder="Street, city, postal code"
          rows={4}
        />
        <div className="form-actions">
          <button type="submit" className="button button--primary">
            Save draft
          </button>
        </div>
      </form>
    </section>
  );
}
