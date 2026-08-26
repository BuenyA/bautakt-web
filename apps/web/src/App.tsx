import { useState, type FormEvent } from 'react'
import './App.css'

type AuthMode = 'sign-in' | 'sign-up'

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')
  const [status, setStatus] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(
      authMode === 'sign-in'
        ? 'Sign-in request submitted. Connect this form to your backend API.'
        : 'Account creation request submitted. Connect this form to your backend API.',
    )
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Bautakt Web App</p>
        <h1>Authentication</h1>
        <p className="subtitle">Use this starter mode to handle sign-in and sign-up flows.</p>

        <div className="mode-switch" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={authMode === 'sign-in'}
            className={authMode === 'sign-in' ? 'active' : ''}
            onClick={() => setAuthMode('sign-in')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === 'sign-up'}
            className={authMode === 'sign-up' ? 'active' : ''}
            onClick={() => setAuthMode('sign-up')}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />

          {authMode === 'sign-up' && (
            <>
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </>
          )}

          <button className="submit" type="submit">
            {authMode === 'sign-in' ? 'Continue' : 'Create account'}
          </button>
        </form>

        {status && <p className="status">{status}</p>}
      </section>
    </main>
  )
}

export default App
