
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sprout, Mail, Lock, Eye, EyeOff,
  ArrowRight, Loader2
} from 'lucide-react';
import { useAuth } from './useAuth';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email.trim(), password);

      const routes = {
        farmer: '/farmer',
        consumer: '/consumer',
        bulk_buyer: '/bulk-buyer',
        admin: '/admin',
      };

      navigate(routes[user.role] || '/login', {
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'Unable to login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <div className="auth-logo">
            <Sprout size={25} />
          </div>
          <span>AgriDemand <b>AI</b></span>
        </div>

        <div className="auth-brand-content">
          <span className="auth-eyebrow">
            INTELLIGENT AGRICULTURE COMMERCE
          </span>
          <h1>Connecting harvests to <span>real demand.</span></h1>
          <p>
            One intelligent platform connecting farmers,
            consumers and bulk buyers through smarter
            agricultural procurement.
          </p>
        </div>

        <div className="auth-brand-footer">
          © 2026 AgriDemand AI
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <Sprout size={24} /> AgriDemand AI
          </div>

          <span className="auth-eyebrow">WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p className="auth-subtitle">
            Enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="auth-form-options">
              <span>Secure account access</span>
              <button type="button" onClick={() => setError('Password recovery is not available yet.')}>
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="auth-spinner" size={18} /> Signing in...</>
              ) : (
                <>Sign in <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="auth-divider"><span>NEW TO AGRIDEMAND?</span></div>

          <Link to="/signup" className="auth-secondary">
            Create an account
          </Link>

          <p className="auth-terms">
            By continuing, you agree to our Terms of Service
            and Privacy Policy.
          </p>
        </div>
      </section>
    </main>
  );
}


