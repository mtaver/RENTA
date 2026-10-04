import assert from 'node:assert/strict'
import test from 'node:test'
import {
  acceptHandover, addEvidence, agreementStatus, canAcceptHandover, canConfirmCommitment, clearWorkflowStorage,
  confirmCommitment, currentHandoverAcceptance, editEvidence, emptyWorkflowState, loadWorkflowState,
  removeCurrentEvidence, saveCompletionReport, saveInspection, saveObjection, WORKFLOW_STORAGE_KEY,
} from './workflow.ts'
import { INSPECTION_STORAGE_KEY } from './inspections.ts'

const ids = ['one', 'two']
const now = '2026-10-04T10:00:00.000Z'

function withReport(state = emptyWorkflowState(), id = 'one') {
  return saveCompletionReport(state, { commitmentId: id, landlordName: 'Demo Landlord', completionDate: '2026-10-03', notes: 'Done.' }, now)
}

function withInspection(state = emptyWorkflowState(), id = 'one', result: 'meets' | 'does-not-meet' | 'unable' = 'meets') {
  return saveInspection(state, { commitmentId: id, inspectionDate: '2026-10-03', inspectorName: 'Demo Tenant', result, notes: 'Checked.' }, now)
}

test('landlord report alone does not confirm a repair', () => {
  assert.equal(agreementStatus(withReport(), 'one'), 'Awaiting inspection')
})

test('passing inspection alone does not confirm a repair', () => {
  assert.equal(agreementStatus(withInspection(), 'one'), 'Awaiting landlord completion report')
})

test('both-party confirmation requires every prerequisite', () => {
  let state = withInspection(withReport())
  assert.equal(canConfirmCommitment(state, 'one'), true)
  state = confirmCommitment(state, 'one', 'Demo Tenant', now)
  assert.equal(agreementStatus(state, 'one'), 'Confirmed by both parties')
})

test('objections block affected confirmation and handover acceptance', () => {
  let state = withInspection(withReport())
  state = saveObjection(state, { id: 'objection-1', tenantName: 'Demo Tenant', commitmentIds: ['one'], reason: 'Leak remains.' }, now)
  assert.equal(canConfirmCommitment(state, 'one'), false)
  assert.equal(canAcceptHandover(state, ['one']), false)
  assert.equal(agreementStatus(state, 'one'), 'Objection open')
})

test('record edits invalidate confirmations and acceptance without restoring them when values change back', () => {
  let state = withInspection(withReport())
  state = confirmCommitment(state, 'one', 'Demo Tenant', now)
  state = acceptHandover(state, ['one'], 'Demo Tenant', now)
  assert.ok(currentHandoverAcceptance(state, ['one']))
  const originalNotes = state.completionReports.one.notes
  state = saveCompletionReport(state, { commitmentId: 'one', landlordName: 'Demo Landlord', completionDate: '2026-10-03', notes: 'Changed.' }, '2026-10-04T11:00:00.000Z')
  assert.equal(agreementStatus(state, 'one'), 'Review required — record changed')
  assert.equal(currentHandoverAcceptance(state, ['one']), undefined)
  state = saveCompletionReport(state, { commitmentId: 'one', landlordName: 'Demo Landlord', completionDate: '2026-10-03', notes: originalNotes }, '2026-10-04T12:00:00.000Z')
  assert.equal(agreementStatus(state, 'one'), 'Review required — record changed')
  assert.equal(currentHandoverAcceptance(state, ['one']), undefined)
  assert.equal(state.handoverAcceptances.length, 1)
})

test('historical acceptance remains visible after invalidation', () => {
  let state = withInspection(withReport())
  state = confirmCommitment(state, 'one', 'Demo Tenant', now)
  state = acceptHandover(state, ['one'], 'Demo Tenant', now)
  state = saveInspection(state, { commitmentId: 'one', inspectionDate: '2026-10-03', inspectorName: 'Demo Tenant', result: 'meets', notes: 'Edited.' }, '2026-10-04T13:00:00.000Z')
  assert.equal(currentHandoverAcceptance(state, ['one']), undefined)
  assert.equal(state.handoverAcceptances.length, 1)
})

test('evidence is associated with its commitment and creates an inspection revision', () => {
  let state = withInspection(withReport())
  const previousRevision = state.inspections.one.revisionId
  state = addEvidence(state, { id: 'photo-1', commitmentId: 'one', description: 'Window lock', label: 'Inspection', mimeType: 'image/jpeg', size: 200, createdAt: now }, 'Demo Tenant', '2026-10-04T11:00:00.000Z')
  assert.deepEqual(state.inspections.one.evidenceIds, ['photo-1'])
  assert.equal(state.evidence['photo-1'].commitmentId, 'one')
  assert.notEqual(state.inspections.one.revisionId, previousRevision)
})

test('evidence revisions invalidate current confirmation and handover acceptance', () => {
  let state = withInspection(withReport())
  state = confirmCommitment(state, 'one', 'Demo Tenant', now)
  state = acceptHandover(state, ['one'], 'Demo Tenant', now)
  state = addEvidence(state, { id: 'photo-1', commitmentId: 'one', description: 'Repair', label: 'After repair', mimeType: 'image/png', size: 200, createdAt: now }, 'Demo Tenant', '2026-10-04T11:00:00.000Z')
  assert.equal(agreementStatus(state, 'one'), 'Review required — record changed')
  assert.equal(currentHandoverAcceptance(state, ['one']), undefined)
})

test('removing current evidence preserves historical acceptance references and metadata', () => {
  let state = withInspection(withReport())
  state = addEvidence(state, { id: 'photo-1', commitmentId: 'one', description: 'Repair', label: 'After repair', mimeType: 'image/webp', size: 200, createdAt: now }, 'Demo Tenant', '2026-10-04T11:00:00.000Z')
  state = confirmCommitment(state, 'one', 'Demo Tenant', '2026-10-04T12:00:00.000Z')
  state = acceptHandover(state, ['one'], 'Demo Tenant', '2026-10-04T13:00:00.000Z')
  state = removeCurrentEvidence(state, 'photo-1', 'Demo Tenant', '2026-10-04T14:00:00.000Z')
  assert.deepEqual(state.inspections.one.evidenceIds, [])
  assert.deepEqual(state.handoverAcceptances[0].snapshot[0].evidenceIds, ['photo-1'])
  assert.equal(state.evidence['photo-1'].description, 'Repair')
})

test('editing evidence creates a new reference without changing historical metadata', () => {
  let state = withInspection(withReport())
  state = addEvidence(state, { id: 'photo-1', commitmentId: 'one', description: 'Original description', label: 'Before repair', mimeType: 'image/jpeg', size: 200, createdAt: now }, 'Demo Tenant', '2026-10-04T11:00:00.000Z')
  state = confirmCommitment(state, 'one', 'Demo Tenant', '2026-10-04T12:00:00.000Z')
  state = acceptHandover(state, ['one'], 'Demo Tenant', '2026-10-04T13:00:00.000Z')
  state = editEvidence(state, 'photo-1', 'photo-2', 'Revised description', 'After repair', 'Demo Tenant', '2026-10-04T14:00:00.000Z')
  assert.deepEqual(state.inspections.one.evidenceIds, ['photo-2'])
  assert.equal(state.evidence['photo-1'].description, 'Original description')
  assert.deepEqual(state.handoverAcceptances[0].snapshot[0].evidenceIds, ['photo-1'])
})

test('valid legacy inspections survive the storage upgrade', () => {
  const legacy = JSON.stringify({ one: { commitmentId: 'one', inspectionDate: '2026-10-03', inspectorName: 'Demo Tenant', result: 'meets', notes: 'Checked.', updatedAt: now } })
  const state = loadWorkflowState(null, legacy, ids)
  assert.equal(state.inspections.one.result, 'meets')
  assert.equal(state.inspections.one.version, 1)
})

test('reset clears only associated RENTA demo records', () => {
  const removed: string[] = []
  clearWorkflowStorage({ removeItem: (key) => { removed.push(key) } })
  assert.deepEqual(removed, [WORKFLOW_STORAGE_KEY, INSPECTION_STORAGE_KEY])
})
