import { useEffect, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { AccountPage, DashboardPage, type AccountView } from './components/AccountPages'
import SampleRentalPage from './components/SampleRentalPage'

type Route = 'home' | 'sample' | 'account' | 'dashboard'
const features = [
  { number: '01', title: 'Approved rental charges', description: 'Keep the agreed rent, deposits, fees and other approved charges together in one clear record.' },
  { number: '02', title: 'Documented repair commitments', description: 'Record what was promised, who is responsible and when the work was expected to be completed.' },
  { number: '03', title: 'Inspection evidence', description: 'Organise the observations and supporting details used to compare expectations with handover.' },
  { number: '04', title: 'Handover decisions', description: 'Create a clear basis for tenants, landlords and authorised agents to review what happens next.' },
]

function routeFromPath(pathname = window.location.pathname): { route: Route; accountView: AccountView } {
  if (pathname === '/sample-rental') return { route: 'sample', accountView: 'signin' }
  if (pathname === '/dashboard') return { route: 'dashboard', accountView: 'signin' }
  if (pathname === '/account/signup') return { route: 'account', accountView: 'signup' }
  if (pathname === '/account/forgot') return { route: 'account', accountView: 'forgot' }
  if (pathname === '/account/reset') return { route: 'account', accountView: 'reset' }
  if (pathname === '/account/verified') return { route: 'account', accountView: 'verified' }
  if (pathname === '/account') return { route: 'account', accountView: 'signin' }
  return { route: 'home', accountView: 'signin' }
}

function App() {
  const [location, setLocation] = useState(routeFromPath)
  const { session } = useAuth()

  useEffect(() => {
    const handlePopState = () => setLocation(routeFromPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setLocation(routeFromPath(path))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate('/') }} aria-label="RENTA home"><span className="brand-mark" aria-hidden="true">R</span><span>RENTA</span></a>
        <nav aria-label="Primary navigation">
          <a href="/" onClick={(event) => { event.preventDefault(); navigate('/') }} aria-current={location.route === 'home' ? 'page' : undefined}>Home</a>
          <a href="/sample-rental" onClick={(event) => { event.preventDefault(); navigate('/sample-rental') }} aria-current={location.route === 'sample' ? 'page' : undefined}>Local demo</a>
          <a href={session ? '/dashboard' : '/account'} onClick={(event) => { event.preventDefault(); navigate(session ? '/dashboard' : '/account') }} aria-current={location.route === 'account' || location.route === 'dashboard' ? 'page' : undefined}>{session ? 'Dashboard' : 'Sign in'}</a>
        </nav>
      </header>
      <main id="main-content">
        {location.route === 'home' && <>
          <section className="hero" aria-labelledby="hero-title">
            <div className="eyebrow"><span aria-hidden="true" /> Clear rental records</div>
            <h1 id="hero-title">Know what was promised. <em>Verify what is delivered.</em></h1>
            <p className="hero-copy">RENTA gives tenants, landlords and authorised agents a shared way to compare approved rental charges and documented property commitments with what is delivered at handover.</p>
            <div className="hero-actions"><button className="primary-button" type="button" onClick={() => navigate(session ? '/dashboard' : '/account')}>{session ? 'Open dashboard' : 'Create or access account'}</button><button className="secondary-button" type="button" onClick={() => navigate('/sample-rental')}>Explore local demo</button></div>
            <p className="scope-note">A clear record for review—not a property guarantee or payment protection service.</p>
          </section>
          <section className="features" aria-labelledby="features-title"><div className="section-heading"><p>From agreement to handover</p><h2 id="features-title">The details that matter, kept in view.</h2></div><div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.number}><span className="feature-number" aria-hidden="true">{feature.number}</span><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div></section>
          <section className="local-demo-section" aria-labelledby="local-demo-title"><div><p className="demo-label">Local demo</p><h2 id="local-demo-title">Try the existing fictional workflow</h2><p>The sample rental, role switch, inspections, evidence, objections and handover records remain stored only in this browser. They are separate from real accounts and are never uploaded automatically.</p></div><button className="secondary-button" type="button" onClick={() => navigate('/sample-rental')}>Open local demo</button></section>
        </>}
        {location.route === 'sample' && <SampleRentalPage onBackHome={() => navigate('/')} />}
        {location.route === 'account' && <AccountPage view={location.accountView} navigate={navigate} />}
        {location.route === 'dashboard' && <DashboardPage navigate={navigate} />}
      </main>
      <footer><p><strong>RENTA</strong> · A clearer record from agreement to handover.</p><p>Account foundation</p></footer>
    </div>
  )
}

export default App
