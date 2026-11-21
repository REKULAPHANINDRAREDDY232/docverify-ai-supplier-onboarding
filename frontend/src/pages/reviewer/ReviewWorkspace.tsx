import { SelectField, TextAreaField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { REVIEW_DECISIONS } from '../../types/domain';

const decisionLabels: Record<(typeof REVIEW_DECISIONS)[number], string> = {
  APPROVED: 'Approve supplier',
  ON_HOLD: 'Place on hold',
  NEEDS_INFORMATION: 'Request more information',
};

export function ReviewWorkspace() {
  return (
    <section className="stack">
      <div className="page-header">
        <div>
          <h2>Supplier review</h2>
          <p className="muted">
            Record checklist-backed decisions and comments for the supplier contact.
          </p>
        </div>
        <StatusBadge status="IN_REVIEW" />
      </div>

      <div className="split-panels">
        <div className="panel">
          <h3>Selected supplier packet</h3>
          <dl className="detail-list">
            <div>
              <dt>Supplier</dt>
              <dd>Not selected</dd>
            </div>
            <div>
              <dt>Document focus</dt>
              <dd>Select a queue item to begin</dd>
            </div>
            <div>
              <dt>Document status</dt>
              <dd>
                <StatusBadge status="ACTIVE" kind="document" />
              </dd>
            </div>
          </dl>
        </div>

        <form
          className="panel form-grid"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <SelectField
            label="Decision"
            htmlFor="decision"
            name="decision"
            options={REVIEW_DECISIONS.map((decision) => ({
              value: decision,
              label: decisionLabels[decision],
            }))}
          />
          <TextAreaField
            label="Reviewer notes"
            htmlFor="notes"
            name="notes"
            rows={5}
            placeholder="Explain missing information or confirmation details for the supplier."
          />
          <div className="form-actions">
            <button type="submit" className="button button--primary">
              Save decision
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
