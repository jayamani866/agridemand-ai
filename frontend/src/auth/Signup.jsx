
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sprout, User, Mail, Lock, Eye, EyeOff,
  ArrowRight, Loader2, Tractor, ShoppingBag, Truck,
  ShieldCheck, TrendingUp, Leaf, CheckCircle2,
} from 'lucide-react'
import { useAuth } from './AuthContext'
import './Auth.css'

const roles = [
  {
    value: 'farmer',
    label: 'Farmer',
    description: 'Sell your farm produce',
    icon: Tractor,
  },
  {
    value: 'consumer',
    label: 'Consumer',
    description: 'Buy fresh produce',
    icon: ShoppingBag,
  },
  {
    value: 'bulk_buyer',
    label: 'Bulk Buyer',
    description: 'Procure at scale',
    icon: Truck,
  },
]

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'farmer',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function updateField(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.full_name.trim().length < 2) {
      setError('Please enter your full name.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const user = await signup({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
      })

      const routes = {
        farmer: '/farmer',
        consumer: '/consumer',
        bulk_buyer: '/bulk-buyer',
      }

      navigate(routes[user.role] || '/login', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page signup-page">
      <section className="signup-visual-panel">
        <div className="signup-visual-overlay" />

        <header className="signup-brand">
          <div className="signup-brand-icon">
            <Sprout size={27} />
          </div>
          <div>
            <div className="signup-brand-name">
              AgriDemand <span>AI</span>
            </div>
            <small>INTELLIGENT AGRICULTURE COMMERCE</small>
          </div>
        </header>

        <div className="signup-visual-content">
          <span className="signup-kicker">
            <span className="signup-kicker-dot" />
            INTELLIGENT AGRICULTURE COMMERCE
          </span>

          <h1>
            Connect.
            <br />
            Sell. <span>Grow.</span>
            <br />
            With real demand.
          </h1>

          <p>
            One intelligent platform connecting farmers,
            consumers and bulk buyers through smarter
            agricultural procurement.
          </p>

          <div className="signup-benefits">
            <div className="signup-benefit">
              <div><TrendingUp size={20} /></div>
              <section>
                <strong>Better opportunities</strong>
                <small>Connect supply with demand</small>
              </section>
            </div>

            <div className="signup-benefit">
              <div><ShieldCheck size={20} /></div>
              <section>
                <strong>Secure accounts</strong>
                <small>Your role, your workspace</small>
              </section>
            </div>

            <div className="signup-benefit">
              <div><Leaf size={20} /></div>
              <section>
                <strong>Smarter agriculture</strong>
                <small>Build stronger market connections</small>
              </section>
            </div>
          </div>
        </div>

        <footer className="signup-visual-footer">
          <span>© 2026 AgriDemand AI</span>
          <span>Built for the future of agriculture</span>
        </footer>
      </section>

      <section className="signup-form-panel">
        <div className="signup-form-wrap">
          <div className="signup-mobile-brand">
            <Sprout size={25} />
            <strong>AgriDemand <span>AI</span></strong>
          </div>

          <div className="signup-heading">
            <span className="auth-eyebrow">CREATE YOUR ACCOUNT</span>
            <h2>Get started with AgriDemand AI</h2>
            <p>
              Join the network. Choose how you want to use the platform.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="signup-section-label">
              Choose your account type
            </label>

            <div className="signup-role-grid">
              {roles.map(({ value, label, description, icon: Icon }) => {
                const selected = form.role === value

                return (
                  <button
                    key={value}
                    type="button"
                    className={`signup-role-card ${selected ? 'selected' : ''}`}
                    onClick={() => setForm((previous) => ({
                      ...previous,
                      role: value,
                    }))}
                    aria-pressed={selected}
                  >
                    {selected && (
                      <span className="signup-role-check">
                        <CheckCircle2 size={17} />
                      </span>
                    )}
                    <Icon size={25} strokeWidth={1.8} />
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </button>
                )
              })}
            </div>

            <div className="signup-field-grid">
              <div className="signup-field">
                <label htmlFor="full_name">Full name</label>
                <div className="auth-input-wrap">
                  <User size={18} />
                  <input
                    id="full_name"
                    name="full_name"
                    placeholder="Enter your full name"
                    value={form.full_name}
                    onChange={updateField}
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              <div className="signup-field">
                <label htmlFor="signup_email">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={18} />
                  <input
                    id="signup_email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={updateField}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="signup-field signup-password-field">
              <label htmlFor="signup_password">Password</label>
              <div className="auth-input-wrap">
                <Lock size={18} />
                <input
                  id="signup_password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={updateField}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff size={18} />
                    : <Eye size={18} />}
                </button>
              </div>
              <p className="signup-password-hint">
                <ShieldCheck size={15} />
                Use at least 8 characters for your password.
              </p>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="signup-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="auth-spinner" size={19} />
                  Creating your account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="signup-login-link">
            Already have an account?
            <Link to="/login">Sign in</Link>
          </div>

          <div className="signup-security-note">
            <ShieldCheck size={15} />
            Secure account registration
          </div>
        </div>
      </section>
    </main>
  )
}
