import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';

const Auth = () => {
  const [mode, setMode] = useState('signin');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login } = useUser();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const isSignIn = mode === 'signin';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isSignIn && formData.password !== formData.confirmPassword) {
      setError('Passwords need to match before we can create your workspace.');
      return;
    }

    setIsSubmitting(true);

    try {
      login({
        email: formData.email,
        fullName: formData.fullName,
      });
      navigate('/dashboard', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-page__hero panel panel--hero">
        <p className="eyebrow">Internships + research in one place</p>
        <h1 className="display-title">Build a profile once. Explore smarter matches faster.</h1>
        <p className="lead">
          PathFinder gives students a guided flow for onboarding, profile building,
          opportunity matching, and AI-assisted application prep.
        </p>

        <div className="feature-grid">
          <article className="feature-card">
            <p className="feature-card__number">01</p>
            <h2>Profile-aware matching</h2>
            <p>Turn education, skills, interests, and resume signals into ranked opportunities.</p>
          </article>
          <article className="feature-card">
            <p className="feature-card__number">02</p>
            <h2>Mock scraped pipeline</h2>
            <p>Preview internship and research leads without needing a live backend.</p>
          </article>
          <article className="feature-card">
            <p className="feature-card__number">03</p>
            <h2>AI workshop support</h2>
            <p>Draft essays, outreach emails, and application plans in a focused workspace.</p>
          </article>
        </div>
      </div>

      <div className="auth-page__form panel">
        <div className="auth-toggle">
          <button
            className={isSignIn ? 'auth-toggle__button auth-toggle__button--active' : 'auth-toggle__button'}
            type="button"
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            className={!isSignIn ? 'auth-toggle__button auth-toggle__button--active' : 'auth-toggle__button'}
            type="button"
            onClick={() => setMode('signup')}
          >
            Create account
          </button>
        </div>

        <div className="section-copy">
          <p className="eyebrow">Welcome</p>
          <h2>{isSignIn ? 'Pick up where you left off' : 'Start your PathFinder workspace'}</h2>
          <p>
            This demo keeps auth local only, so you can move straight into the product flow.
          </p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {!isSignIn && (
            <label className="field">
              <span>Full name</span>
              <input
                className="input"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Avery Johnson"
                required={!isSignIn}
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@school.edu"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter any password for demo mode"
              required
            />
          </label>

          {!isSignIn && (
            <label className="field">
              <span>Confirm password</span>
              <input
                className="input"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
              />
            </label>
          )}

          {error ? <p className="status-message status-message--error">{error}</p> : null}

          <button className="button button--primary button--full" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Setting up your workspace...'
              : isSignIn
                ? 'Enter dashboard'
                : 'Create demo account'}
          </button>
        </form>

        <div className="info-banner">
          <span className="status-dot" />
          UI-only auth with local session persistence for easy testing.
        </div>
      </div>
    </section>
  );
};

export default Auth;
