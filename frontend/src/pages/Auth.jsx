import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';

const Auth = () => {
  const [mode, setMode]       = useState('signin');
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError]     = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const { user, login, signup } = useUser();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  const isSignIn = mode === 'signin';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((c) => ({ ...c, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isSignIn && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignIn) {
        await login({ email: formData.email, password: formData.password });
      } else {
        await signup({ email: formData.email, password: formData.password, fullName: formData.fullName });
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-page__hero panel panel--hero">
        <p className="eyebrow">Volunteer + internship opportunities</p>
        <h1 className="display-title">Build a profile once. Explore smarter matches faster.</h1>
        <p className="lead">
          PathFinder finds real local volunteer and internship opportunities near you,
          ranks them by fit, and writes your outreach email with one click.
        </p>

        <div className="feature-grid">
          <article className="feature-card">
            <p className="feature-card__number">01</p>
            <h2>Profile-aware matching</h2>
            <p>Turn your skills, interests, and goals into ranked local opportunities.</p>
          </article>
          <article className="feature-card">
            <p className="feature-card__number">02</p>
            <h2>Live web scraping</h2>
            <p>Real opportunities found via search — updated every time you run a search.</p>
          </article>
          <article className="feature-card">
            <p className="feature-card__number">03</p>
            <h2>One-click outreach</h2>
            <p>Draft and send a personalised email to any opportunity in seconds.</p>
          </article>
        </div>
      </div>

      <div className="auth-page__form panel">
        <div className="auth-toggle">
          <button
            className={isSignIn ? 'auth-toggle__button auth-toggle__button--active' : 'auth-toggle__button'}
            type="button"
            onClick={() => { setMode('signin'); setError(''); }}
          >
            Sign in
          </button>
          <button
            className={!isSignIn ? 'auth-toggle__button auth-toggle__button--active' : 'auth-toggle__button'}
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
          >
            Create account
          </button>
        </div>

        <div className="section-copy">
          <p className="eyebrow">Welcome</p>
          <h2>{isSignIn ? 'Pick up where you left off' : 'Start your PathFinder workspace'}</h2>
          <p>
            {isSignIn
              ? 'Sign in to access your saved profile and opportunities.'
              : 'Create an account to save your profile and track your progress.'}
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
                placeholder="Alex Chen"
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
              placeholder="At least 6 characters"
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

          {error && <p className="status-message status-message--error">{error}</p>}

          <div style={{ marginBottom: 8 }} />
          <button
            className="button button--primary button--full"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? (isSignIn ? 'Signing in...' : 'Creating account...')
              : (isSignIn ? 'Sign in' : 'Create account')}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Auth;
