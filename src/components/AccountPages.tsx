import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { validateProfile } from '../logic/account'

export type AccountView = 'signin' | 'signup' | 'forgot' | 'reset' | 'verified'

function ConfigurationRequired() {
  return (
    <section className="account-card config-card" aria-labelledby="config-title">
      <p className="demo-label">Configuration required</p>
      <h1 id="config-title">Connect a Supabase project</h1>
      <p>Real accounts are prepared but unavailable until this installation has a Supabase project URL and publishable client key.</p>
      <ol>
        <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
        <li>Add the project URL and publishable key from the Supabase project settings.</li>
        <li>Apply the migration in <code>supabase/migrations</code>, then restart Vite.</li>
      </ol>
      <p>No service-role or secret key belongs in this browser application.</p>
    </section>
  )
}

interface AccountPageProps {
  view: AccountView
  navigate: (path: string) => void
}

export function AccountPage({ view, navigate }: AccountPageProps) {
  const { configured, loading, session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLandlord, setIsLandlord] = useState(false)
  const [isTenant, setIsTenant] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMessage(null)
    setError(null)
  }, [view])

  if (!configured) return <div className="account-page"><ConfigurationRequired /></div>
  if (loading) return <div className="account-page"><p role="status">Restoring your session…</p></div>
  if (view === 'signin' && session) {
    return (
      <div className="account-page">
        <section className="account-card">
          <p className="demo-label">Account</p>
          <h1>You are signed in</h1>
          <button className="primary-button" type="button" onClick={() => navigate('/dashboard')}>Open dashboard</button>
        </section>
      </div>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      if (view === 'signup') {
        const profileErrors = validateProfile({ displayName, isLandlord, isTenant })
        if (profileErrors.displayName || profileErrors.capabilities) {
          setError(profileErrors.displayName ?? profileErrors.capabilities ?? 'Check your profile details.')
          return
        }
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/account/verified`,
            data: { display_name: displayName.trim(), is_landlord: isLandlord, is_tenant: isTenant },
          },
        })
        if (authError) throw authError
        setMessage(data.session ? 'Account created. You can now open your dashboard.' : 'Check your email to continue. If an account can be created for this address, a verification message will arrive shortly.')
      } else if (view === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account/reset` })
        if (authError) throw authError
        setMessage('If an account is eligible for password recovery, reset instructions will arrive shortly.')
      } else if (view === 'reset') {
        const { error: authError } = await supabase.auth.updateUser({ password })
        if (authError) throw authError
        setMessage('Password updated. You can continue to your dashboard.')
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        navigate('/dashboard')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request could not be completed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (view === 'verified') {
    return (
      <div className="account-page">
        <section className="account-card" aria-labelledby="verified-title">
          <p className="demo-label">Email verification</p>
          <h1 id="verified-title">Verification link received</h1>
          <p>{session ? 'Your session is active. Continue to your account dashboard.' : 'Verification is being completed by Supabase. If you are not signed in, return to sign in.'}</p>
          <button className="primary-button" type="button" onClick={() => navigate(session ? '/dashboard' : '/account')}>{session ? 'Open dashboard' : 'Return to sign in'}</button>
        </section>
      </div>
    )
  }

  const title = view === 'signup' ? 'Create your RENTA account' : view === 'forgot' ? 'Reset your password' : view === 'reset' ? 'Choose a new password' : 'Sign in to RENTA'
  return (
    <div className="account-page">
      <section className="account-card" aria-labelledby="account-title">
        <p className="demo-label">Real account</p>
        <h1 id="account-title">{title}</h1>
        <p className="account-intro">Account data is stored in the configured Supabase project. The Local demo remains separate in this browser.</p>
        <form className="account-form" onSubmit={submit} noValidate>
          {view === 'signup' && (
            <>
              <div className="field-group">
                <label htmlFor="display-name">Profile name</label>
                <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required minLength={2} maxLength={80} />
              </div>
              <fieldset className="capability-fieldset">
                <legend>Available capabilities</legend>
                <label><input type="checkbox" checked={isTenant} onChange={(event) => setIsTenant(event.target.checked)} /> Tenant</label>
                <label><input type="checkbox" checked={isLandlord} onChange={(event) => setIsLandlord(event.target.checked)} /> Landlord</label>
                <p>One account may have both. Agency access cannot be selected here.</p>
              </fieldset>
            </>
          )}
          {view !== 'reset' && (
            <div className="field-group">
              <label htmlFor="account-email">Email</label>
              <input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </div>
          )}
          {view !== 'forgot' && (
            <div className="field-group">
              <label htmlFor="account-password">{view === 'reset' ? 'New password' : 'Password'}</label>
              <input id="account-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={view === 'signin' ? 'current-password' : 'new-password'} required minLength={8} />
              <p className="field-hint">Use at least 8 characters. RENTA does not store your password.</p>
            </div>
          )}
          {error && <p className="form-alert form-alert--error" role="alert">{error}</p>}
          {message && <p className="form-alert form-alert--success" role="status">{message}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Please wait…' : view === 'signup' ? 'Create account' : view === 'forgot' ? 'Send reset instructions' : view === 'reset' ? 'Update password' : 'Sign in'}</button>
        </form>
        <div className="account-links">
          {view !== 'signin' && <button className="text-button" type="button" onClick={() => navigate('/account')}>Sign in</button>}
          {view !== 'signup' && <button className="text-button" type="button" onClick={() => navigate('/account/signup')}>Create account</button>}
          {view === 'signin' && <button className="text-button" type="button" onClick={() => navigate('/account/forgot')}>Forgot password?</button>}
        </div>
      </section>
    </div>
  )
}

export function DashboardPage({ navigate }: { navigate: (path: string) => void }) {
  const { configured, loading, session, profile, isAgencyStaff, profileError, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [isLandlord, setIsLandlord] = useState(false)
  const [isTenant, setIsTenant] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name)
      setIsLandlord(profile.is_landlord)
      setIsTenant(profile.is_tenant)
    }
  }, [profile])

  if (!configured) return <div className="account-page"><ConfigurationRequired /></div>
  if (loading) return <div className="account-page"><p role="status">Restoring your session…</p></div>
  if (!session) {
    return <div className="account-page"><section className="account-card"><h1>Sign in required</h1><p>Your dashboard is protected.</p><button className="primary-button" type="button" onClick={() => navigate('/account')}>Go to sign in</button></section></div>
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    const validation = validateProfile({ displayName, isLandlord, isTenant })
    if (validation.displayName || validation.capabilities) {
      setError(validation.displayName ?? validation.capabilities ?? 'Check your profile details.')
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error: updateError } = await supabase.from('profiles').update({ display_name: displayName.trim(), is_landlord: isLandlord, is_tenant: isTenant }).eq('user_id', session.user.id)
    if (updateError) setError('Your profile could not be updated. Please try again.')
    else {
      await refreshProfile()
      setNotice('Profile updated.')
    }
    setBusy(false)
  }

  const signOut = async () => {
    if (!supabase) return
    setBusy(true)
    const { error: signOutError } = await supabase.auth.signOut()
    setBusy(false)
    if (signOutError) setError('Sign out could not be completed. Please try again.')
    else navigate('/')
  }

  return (
    <div className="account-page dashboard-page">
      <section className="dashboard-heading">
        <p className="demo-label">Protected account dashboard</p>
        <h1>Welcome, {profile?.display_name ?? session.user.email ?? 'RENTA user'}</h1>
        <p>Real account permissions come from authenticated database records—not the Local demo role switch.</p>
      </section>
      <div className="dashboard-grid">
        <section className="account-card">
          <h2>Your profile</h2>
          {profileError && <p className="form-alert form-alert--error" role="alert">{profileError}</p>}
          <form className="account-form" onSubmit={saveProfile}>
            <div className="field-group"><label htmlFor="dashboard-name">Profile name</label><input id="dashboard-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={80} /></div>
            <fieldset className="capability-fieldset"><legend>Capabilities</legend><label><input type="checkbox" checked={isTenant} onChange={(event) => setIsTenant(event.target.checked)} /> Tenant</label><label><input type="checkbox" checked={isLandlord} onChange={(event) => setIsLandlord(event.target.checked)} /> Landlord</label></fieldset>
            {error && <p className="form-alert form-alert--error" role="alert">{error}</p>}
            {notice && <p className="form-alert form-alert--success" role="status">{notice}</p>}
            <button className="primary-button" type="submit" disabled={busy}>Save profile</button>
          </form>
        </section>
        <section className="account-card">
          <h2>Available to you</h2>
          <ul className="capability-list">
            {isTenant && <li><strong>Tenant</strong><span>Property browsing, proposals and private messaging are planned.</span></li>}
            {isLandlord && <li><strong>Landlord</strong><span>Listing submission and negotiation tools are planned.</span></li>}
            {isAgencyStaff && <li><strong>Agency staff</strong><span>Agency review dashboard — planned.</span></li>}
          </ul>
          {!isAgencyStaff && <p className="section-note">Agency staff access is assigned through a trusted database process and cannot be added here.</p>}
          <button className="secondary-button" type="button" disabled={busy} onClick={signOut}>Sign out</button>
        </section>
      </div>
    </div>
  )
}
