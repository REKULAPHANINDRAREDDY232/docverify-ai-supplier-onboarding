import { Link } from 'react-router-dom';
import { env } from '../config/env';

export function LandingPage() {
  return (
    <div className="landing">
      <div className="landing__panel">
        <p className="landing__brand">{env.appName}</p>
        <h1 className="landing__headline">Supplier onboarding for procurement teams</h1>
        <p className="landing__copy">
          Collect registration, banking, and insurance documents in one workspace. Reviewers and
          admins track onboarding status without spreadsheet handoffs.
        </p>
        <div className="landing__actions">
          <Link className="button button--primary" to="/login">
            Sign in
          </Link>
          <Link className="button button--secondary" to="/register">
            Register as supplier
          </Link>
        </div>
      </div>
    </div>
  );
}
