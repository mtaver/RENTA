import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { sampleRental, totalUpfrontCost, type CommitmentStatus, type PropertyCommitment } from '../data/sampleRental'
import {
  calculateHandoverSummary,
  clearStoredInspections,
  INSPECTION_STORAGE_KEY,
  parseStoredInspections,
  type InspectionRecord,
  type InspectionRecords,
  type InspectionResult,
} from '../logic/inspections'

interface SampleRentalPageProps {
  onBackHome: () => void
}

interface FormValues {
  inspectionDate: string
  inspectorName: string
  result: '' | InspectionResult
  notes: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
})

const resultLabels: Record<InspectionResult, string> = {
  meets: 'Meets criteria',
  'does-not-meet': 'Does not meet criteria',
  unable: 'Unable to assess',
}

function statusClass(status: CommitmentStatus) {
  return `status status--${status.toLowerCase().replaceAll(' ', '-')}`
}

function resultClass(result: InspectionResult) {
  return `inspection-result inspection-result--${result}`
}

function todayIso() {
  const today = new Date()
  const offset = today.getTimezoneOffset() * 60_000
  return new Date(today.getTime() - offset).toISOString().slice(0, 10)
}

function formatInspectionDate(date: string) {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

function InspectionForm({ commitment, existing, onSave, onCancel }: {
  commitment: PropertyCommitment
  existing?: InspectionRecord
  onSave: (record: InspectionRecord) => void
  onCancel: () => void
}) {
  const formId = useId()
  const [values, setValues] = useState<FormValues>({
    inspectionDate: existing?.inspectionDate ?? '',
    inspectorName: existing?.inspectorName ?? '',
    result: existing?.result ?? '',
    notes: existing?.notes ?? '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const update = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    if (!values.inspectionDate) nextErrors.inspectionDate = 'Enter an inspection date.'
    else if (values.inspectionDate > todayIso()) nextErrors.inspectionDate = 'Inspection date cannot be in the future.'
    if (!values.inspectorName.trim()) nextErrors.inspectorName = 'Enter the inspector’s name.'
    if (!values.result) nextErrors.result = 'Choose an inspection result.'
    if (!values.notes.trim()) nextErrors.notes = 'Enter inspection notes.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSave({
      commitmentId: commitment.id,
      inspectionDate: values.inspectionDate,
      inspectorName: values.inspectorName.trim(),
      result: values.result as InspectionResult,
      notes: values.notes.trim(),
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <form className="inspection-form" onSubmit={submit} noValidate aria-labelledby={`${formId}-title`}>
      <div className="inspection-form-heading">
        <div>
          <p className="form-kicker">{existing ? 'Edit inspection' : 'Record inspection'}</p>
          <h4 id={`${formId}-title`}>{commitment.title}</h4>
        </div>
        <button className="text-button" type="button" onClick={onCancel}>Cancel</button>
      </div>
      <div className="criteria-panel"><span>Acceptance criteria</span><p>{commitment.acceptanceCriteria}</p></div>
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor={`${formId}-date`}>Inspection date</label>
          <input id={`${formId}-date`} type="date" value={values.inspectionDate} max={todayIso()} onChange={(event) => update('inspectionDate', event.target.value)} aria-invalid={Boolean(errors.inspectionDate)} aria-describedby={errors.inspectionDate ? `${formId}-date-error` : undefined} />
          {errors.inspectionDate && <p className="field-error" id={`${formId}-date-error`}>{errors.inspectionDate}</p>}
        </div>
        <div className="field-group">
          <label htmlFor={`${formId}-name`}>Inspector name</label>
          <input id={`${formId}-name`} type="text" value={values.inspectorName} onChange={(event) => update('inspectorName', event.target.value)} aria-invalid={Boolean(errors.inspectorName)} aria-describedby={errors.inspectorName ? `${formId}-name-error` : undefined} />
          {errors.inspectorName && <p className="field-error" id={`${formId}-name-error`}>{errors.inspectorName}</p>}
        </div>
        <fieldset className="field-group result-fieldset" aria-describedby={errors.result ? `${formId}-result-error` : undefined}>
          <legend>Result</legend>
          <div className="radio-options">
            {(Object.entries(resultLabels) as [InspectionResult, string][]).map(([value, label]) => (
              <label key={value}><input type="radio" name={`${formId}-result`} value={value} checked={values.result === value} onChange={() => update('result', value)} /> <span>{label}</span></label>
            ))}
          </div>
          {errors.result && <p className="field-error" id={`${formId}-result-error`}>{errors.result}</p>}
        </fieldset>
        <div className="field-group notes-field">
          <label htmlFor={`${formId}-notes`}>Inspection notes</label>
          <textarea id={`${formId}-notes`} rows={4} value={values.notes} onChange={(event) => update('notes', event.target.value)} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? `${formId}-notes-error` : undefined} />
          {errors.notes && <p className="field-error" id={`${formId}-notes-error`}>{errors.notes}</p>}
        </div>
      </div>
      <button className="primary-button save-inspection" type="submit">Save inspection</button>
    </form>
  )
}

export default function SampleRentalPage({ onBackHome }: SampleRentalPageProps) {
  const commitmentIds = useMemo(() => sampleRental.commitments.map(({ id }) => id), [])
  const [records, setRecords] = useState<InspectionRecords>(() => {
    try { return parseStoredInspections(window.localStorage.getItem(INSPECTION_STORAGE_KEY), commitmentIds) }
    catch { return {} }
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [storageMessage, setStorageMessage] = useState('')
  const summary = calculateHandoverSummary(commitmentIds, records)

  useEffect(() => {
    try {
      window.localStorage.setItem(INSPECTION_STORAGE_KEY, JSON.stringify(records))
      setStorageMessage('')
    } catch {
      setStorageMessage('This browser could not save the demo inspections. Your current entries may not survive a refresh.')
    }
  }, [records])

  const saveInspection = (record: InspectionRecord) => {
    setRecords((current) => ({ ...current, [record.commitmentId]: record }))
    setEditingId(null)
  }

  const resetInspections = () => {
    if (!window.confirm('Reset all RENTA demo inspection records? This cannot be undone.')) return
    try { clearStoredInspections(window.localStorage) } catch { /* state still resets */ }
    setRecords({})
    setEditingId(null)
  }

  return (
    <div className="rental-page">
      <section className="rental-intro" aria-labelledby="sample-title">
        <div><p className="demo-label">Demo data — fictional property and parties</p><h1 id="sample-title">{sampleRental.property}</h1><p className="rental-location">{sampleRental.location}</p></div>
        <button className="secondary-button" type="button" onClick={onBackHome}>Back to home</button>
      </section>

      <aside className="demo-notice" aria-label="Demo record notice"><strong>{sampleRental.approvalStatus}</strong><p>This is a sample agreement for demonstration. It has not been independently verified.</p></aside>
      <aside className="browser-notice"><strong>Demo only.</strong> Records are saved in this browser and are not shared or independently verified. Use fictional details.</aside>
      {storageMessage && <p className="storage-error" role="alert">{storageMessage}</p>}

      <section className="record-section overview-section" aria-labelledby="overview-title">
        <div className="record-section-heading"><p>Rental overview</p><h2 id="overview-title">Parties and handover</h2></div>
        <dl className="details-grid"><div><dt>Tenant</dt><dd>{sampleRental.tenant}</dd></div><div><dt>Landlord</dt><dd>{sampleRental.landlord}</dd></div><div><dt>Authorised agent</dt><dd>{sampleRental.agent}</dd></div><div><dt>Planned handover</dt><dd>{sampleRental.plannedHandover}</dd></div></dl>
      </section>

      <section className="record-section" aria-labelledby="charges-title">
        <div className="record-section-heading"><p>Financial record</p><h2 id="charges-title">Agreed charges</h2></div>
        <div className="charges-card"><dl className="charges-list">{sampleRental.charges.map((charge) => <div key={charge.label}><dt>{charge.label}</dt><dd>{currencyFormatter.format(charge.amount)}</dd></div>)}<div className="charges-total"><dt>Total upfront cost</dt><dd>{currencyFormatter.format(totalUpfrontCost)}</dd></div></dl></div>
      </section>

      <section className="record-section" aria-labelledby="commitments-title">
        <div className="record-section-heading"><p>Before handover</p><h2 id="commitments-title">Property commitments</h2></div>
        <div className="commitments-list">
          {sampleRental.commitments.map((commitment, index) => {
            const inspection = records[commitment.id]
            const isEditing = editingId === commitment.id
            return (
              <article className="commitment-card" key={commitment.id}>
                <div className="commitment-topline"><span className="commitment-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span className={statusClass(commitment.status)} aria-label={`Reported work status: ${commitment.status}`}>{commitment.status}</span></div>
                <h3>{commitment.title}</h3>
                <dl><div><dt>Deadline</dt><dd>{commitment.deadline}</dd></div><div><dt>Acceptance criteria</dt><dd>{commitment.acceptanceCriteria}</dd></div></dl>
                {!isEditing && <button className="record-button" type="button" onClick={() => setEditingId(commitment.id)}>{inspection ? 'Edit inspection' : 'Record inspection'}</button>}
                {isEditing && <InspectionForm commitment={commitment} existing={inspection} onSave={saveInspection} onCancel={() => setEditingId(null)} />}
                {inspection && !isEditing && (
                  <section className="saved-inspection" aria-label={`Inspection record for ${commitment.title}`}>
                    <div className="saved-inspection-heading"><p>Inspection record</p><span className={resultClass(inspection.result)}>{resultLabels[inspection.result]}</span></div>
                    <dl><div><dt>Inspection date</dt><dd>{formatInspectionDate(inspection.inspectionDate)}</dd></div><div><dt>Inspector</dt><dd>{inspection.inspectorName}</dd></div><div className="inspection-notes"><dt>Notes</dt><dd>{inspection.notes}</dd></div></dl>
                  </section>
                )}
              </article>
            )
          })}
        </div>
        <p className="inspection-note"><strong>Reported complete</strong> records the reporting party’s update only. The commitment still requires inspection and acceptance.</p>
      </section>

      <section className="record-section handover-section" aria-labelledby="handover-title">
        <div className="record-section-heading"><p>Calculated from inspections</p><h2 id="handover-title">Handover summary</h2></div>
        <div>
          <div className="handover-decision"><span>Current decision</span><strong aria-live="polite">{summary.decision}</strong></div>
          <div className="summary-counts" aria-label="Inspection result counts"><div><strong>{summary.passed}</strong><span>Passed</span></div><div><strong>{summary.failed}</strong><span>Failed</span></div><div><strong>{summary.unassessed}</strong><span>Unassessed</span></div></div>
          <p className="acceptance-note">A passing inspection does not accept the property or complete handover. Formal acceptance will be a later step.</p>
          <button className="reset-button" type="button" onClick={resetInspections} disabled={Object.keys(records).length === 0}>Reset demo inspections</button>
        </div>
      </section>
    </div>
  )
}
