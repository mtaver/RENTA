import { useEffect, useState } from 'react'
import SampleRentalPage from './components/SampleRentalPage'

type Route = 'home' | 'sample'

const features = [
  {
    number: '01',
    title: 'Approved rental charges',
    description: 'Keep the agreed rent, deposits, fees and other approved charges together in one clear record.',
  },
  {
    number: '02',
    title: 'Documented repair commitments',
    description: 'Record what was promised, who is responsible and when the work was expected to be completed.',
  },
  {
    number: '03',
    title: 'Inspection evidence',
    description: 'Organise the observations and supporting details used to compare expectations with handover.',
  },
  {
    number: '04',
    title: 'Handover decisions',
    description: 'Create a clear basis for tenants, landlords and authorised agents to review what happens next.',
  },
]

function routeFromPath(): Route {
  return window.location.pathname === '/sample-rental' ? 'sample' : 'home'
}

function App() {
  const [route, setRoute] = useState<Route>(routeFromPath)

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (nextRoute: Route) => {
    const path = nextRoute === 'sample' ? '/sample-rental' : '/'
    window.history.pushState({}, '', path)
    setRoute(nextRoute)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate('home') }} aria-label="RENTA home">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>RENTA</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/" onClick={(event) => { event.preventDefault(); navigate('home') }} aria-current={route === 'home' ? 'page' : undefined}>Home</a>
          <a href="/sample-rental" onClick={(event) => { event.preventDefault(); navigate('sample') }} aria-current={route === 'sample' ? 'page' : undefined}>Sample rental</a>
        </nav>
      </header>

      <main id="main-content">
        {route === 'home' ? (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <div className="eyebrow"><span aria-hidden="true" /> Clear rental records</div>
              <h1 id="hero-title">Know what was promised. <em>Verify what is delivered.</em></h1>
              <p className="hero-copy">RENTA gives tenants, landlords and authorised agents a shared way to compare approved rental charges and documented property commitments with what is delivered at handover.</p>
              <button className="primary-button" type="button" onClick={() => navigate('sample')}>View sample rental</button>
              <p className="scope-note">A clear record for review—not a property guarantee or payment protection service.</p>
            </section>

            <section className="features" aria-labelledby="features-title">
              <div className="section-heading">
                <p>From agreement to handover</p>
                <h2 id="features-title">The details that matter, kept in view.</h2>
              </div>
              <div className="feature-grid">
                {features.map((feature) => (
                  <article className="feature-card" key={feature.number}>
                    <span className="feature-number" aria-hidden="true">{feature.number}</span>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : <SampleRentalPage onBackHome={() => navigate('home')} />}
      </main>

      <footer>
        <p><strong>RENTA</strong> · A clearer record from agreement to handover.</p>
        <p>Foundation release</p>
      </footer>
    </div>
  )
}

export default App
