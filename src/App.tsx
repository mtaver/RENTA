import { useEffect, useState } from 'react'
import { sampleRental, totalUpfrontCost, type CommitmentStatus } from './data/sampleRental'

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

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

function statusClass(status: CommitmentStatus) {
  return `status status--${status.toLowerCase().replaceAll(' ', '-')}`
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
        ) : (
          <div className="rental-page">
            <section className="rental-intro" aria-labelledby="sample-title">
              <div>
                <p className="demo-label">Demo data — fictional property and parties</p>
                <h1 id="sample-title">{sampleRental.property}</h1>
                <p className="rental-location">{sampleRental.location}</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => navigate('home')}>Back to home</button>
            </section>

            <aside className="demo-notice" aria-label="Demo record notice">
              <strong>{sampleRental.approvalStatus}</strong>
              <p>This is a sample agreement for demonstration. It has not been independently verified.</p>
            </aside>

            <section className="record-section overview-section" aria-labelledby="overview-title">
              <div className="record-section-heading">
                <p>Rental overview</p>
                <h2 id="overview-title">Parties and handover</h2>
              </div>
              <dl className="details-grid">
                <div><dt>Tenant</dt><dd>{sampleRental.tenant}</dd></div>
                <div><dt>Landlord</dt><dd>{sampleRental.landlord}</dd></div>
                <div><dt>Authorised agent</dt><dd>{sampleRental.agent}</dd></div>
                <div><dt>Planned handover</dt><dd>{sampleRental.plannedHandover}</dd></div>
              </dl>
            </section>

            <section className="record-section" aria-labelledby="charges-title">
              <div className="record-section-heading">
                <p>Financial record</p>
                <h2 id="charges-title">Agreed charges</h2>
              </div>
              <div className="charges-card">
                <dl className="charges-list">
                  {sampleRental.charges.map((charge) => (
                    <div key={charge.label}>
                      <dt>{charge.label}</dt>
                      <dd>{currencyFormatter.format(charge.amount)}</dd>
                    </div>
                  ))}
                  <div className="charges-total">
                    <dt>Total upfront cost</dt>
                    <dd>{currencyFormatter.format(totalUpfrontCost)}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="record-section" aria-labelledby="commitments-title">
              <div className="record-section-heading">
                <p>Before handover</p>
                <h2 id="commitments-title">Property commitments</h2>
              </div>
              <div className="commitments-list">
                {sampleRental.commitments.map((commitment, index) => (
                  <article className="commitment-card" key={commitment.id}>
                    <div className="commitment-topline">
                      <span className="commitment-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <span className={statusClass(commitment.status)} aria-label={`Status: ${commitment.status}`}>{commitment.status}</span>
                    </div>
                    <h3>{commitment.title}</h3>
                    <dl>
                      <div><dt>Deadline</dt><dd>{commitment.deadline}</dd></div>
                      <div><dt>Acceptance criteria</dt><dd>{commitment.acceptanceCriteria}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
              <p className="inspection-note"><strong>Reported complete</strong> records the reporting party’s update only. The commitment still requires inspection and acceptance.</p>
            </section>

            <section className="record-section handover-section" aria-labelledby="handover-title">
              <div className="record-section-heading">
                <p>Current position</p>
                <h2 id="handover-title">Handover summary</h2>
              </div>
              <div className="handover-grid">
                <div><span>Decision</span><strong>{sampleRental.handover.decision}</strong></div>
                <div><span>Outstanding items</span><strong>{sampleRental.handover.outstandingItems}</strong></div>
                <div><span>Inspection evidence</span><strong>{sampleRental.handover.evidenceStatus}</strong></div>
              </div>
            </section>
          </div>
        )}
      </main>

      <footer>
        <p><strong>RENTA</strong> · A clearer record from agreement to handover.</p>
        <p>Foundation release</p>
      </footer>
    </div>
  )
}

export default App
