import assert from 'node:assert/strict'
import test from 'node:test'
import {
  acceptHandover, addEvidence, agreementStatus, canAcceptHandover, canConfirmCommitment, clearWorkflowStorage,
  closeObjection, confirmCommitment, confirmObjectionResolution, currentHandoverAcceptance, currentTenantResolution, editEvidence, emptyWorkflowState, hasOpenObjection, loadWorkflowState,
  decideCharge, recordCorrectiveAction, removeCurrentEvidence, saveChargeProposal, saveCompletionReport, saveInspection, saveObjection, WORKFLOW_STORAGE_KEY,
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

function withApprovedCharges(state: ReturnType<typeof emptyWorkflowState>) {
  let next = state
  for (const charge of Object.values(next.chargeProposals)) {
    next = saveChargeProposal(next, { id: charge.id, name: charge.name, amountKobo: charge.amountKobo, purpose: charge.purpose, refundable: charge.refundable, landlordName: 'Demo Landlord' }, now)
    next = decideCharge(next, charge.id, 'approved', 'Demo Tenant', undefined, now)
  }
  return next
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
  state = withApprovedCharges(state)
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
  state = withApprovedCharges(state)
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
  state = withApprovedCharges(state)
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
  state = withApprovedCharges(state)
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

test('charge objections block handover acceptance', () => {
  let state = withApprovedCharges(confirmCommitment(withInspection(withReport()), 'one', 'Demo Tenant', now))
  const rent = state.chargeProposals['annual-rent']
  state = saveChargeProposal(state, { id: rent.id, name: rent.name, amountKobo: rent.amountKobo, purpose: rent.purpose, refundable: rent.refundable, landlordName: 'Demo Landlord' }, '2026-10-04T11:00:00.000Z')
  state = decideCharge(state, rent.id, 'objected', 'Demo Tenant', 'Amount needs review.', '2026-10-04T12:00:00.000Z')
  assert.equal(canAcceptHandover(state, ['one']), false)
})

test('charge revision invalidates acceptance and changing values back does not restore it', () => {
  let state = withApprovedCharges(confirmCommitment(withInspection(withReport()), 'one', 'Demo Tenant', now))
  state = acceptHandover(state, ['one'], 'Demo Tenant', now)
  const rent = state.chargeProposals['annual-rent']
  state = saveChargeProposal(state, { id: rent.id, name: rent.name, amountKobo: rent.amountKobo + 100, purpose: rent.purpose, refundable: rent.refundable, landlordName: 'Demo Landlord' }, '2026-10-04T11:00:00.000Z')
  assert.equal(currentHandoverAcceptance(state, ['one']), undefined)
  state = saveChargeProposal(state, { id: rent.id, name: rent.name, amountKobo: rent.amountKobo, purpose: rent.purpose, refundable: rent.refundable, landlordName: 'Demo Landlord' }, '2026-10-04T12:00:00.000Z')
  assert.equal(currentHandoverAcceptance(state, ['one']), undefined)
  assert.equal(state.handoverAcceptances.length, 1)
})

test('schema three migration preserves repairs and makes old acceptance historical', () => {
  let oldState = withInspection(withReport())
  oldState = confirmCommitment(oldState, 'one', 'Demo Tenant', now)
  const legacy = { ...oldState, schemaVersion: 3, chargeProposals: undefined, chargeDecisions: undefined, handoverAcceptances: [{ id: 'old', tenantName: 'Demo Tenant', createdAt: now, snapshot: [{ commitmentId: 'one', reportRevisionId: oldState.completionReports.one.revisionId, inspectionRevisionId: oldState.inspections.one.revisionId, confirmationId: oldState.confirmations[0].id, evidenceIds: [] }] }] }
  const migrated = loadWorkflowState(JSON.stringify(legacy), null, ids)
  assert.equal(migrated.inspections.one.result, 'meets')
  assert.equal(migrated.handoverAcceptances[0].chargeSnapshot.length, 0)
  assert.equal(currentHandoverAcceptance(migrated, ['one']), undefined)
})

function repairObjectionFlow() {
  let state = confirmCommitment(withInspection(withReport()), 'one', 'Demo Tenant', now)
  state = saveObjection(state, { id: 'repair-objection', tenantName: 'Demo Tenant', commitmentIds: ['one'], reason: 'Leak remains.' }, '2026-10-04T11:00:00.000Z')
  return recordCorrectiveAction(state, 'repair', 'repair-objection', 'Demo Reviewer', 'Correction is required.', 'Repair and reinspect the fitting.', '2026-10-10', '2026-10-04T12:00:00.000Z')
}

function correctedRepair(state = repairObjectionFlow()) {
  state = saveCompletionReport(state, { commitmentId: 'one', landlordName: 'Demo Landlord', completionDate: '2026-10-04', notes: 'Corrected.' }, '2026-10-04T13:00:00.000Z')
  return confirmCommitment(state, 'one', 'Demo Tenant', '2026-10-04T14:00:00.000Z')
}

test('corrective action keeps an objection open and handover blocked', () => {
  const state = repairObjectionFlow()
  assert.equal(hasOpenObjection(state, 'one'), true)
  assert.equal(canAcceptHandover(withApprovedCharges(state), ['one']), false)
})

test('closure requires correction, current tenant consent and reviewer reason', () => {
  let state = repairObjectionFlow()
  assert.equal(closeObjection(state, 'repair', 'repair-objection', 'Demo Reviewer', 'Closed.', '2026-10-04T13:00:00.000Z'), state)
  state = correctedRepair(state)
  state = confirmObjectionResolution(state, 'repair', 'repair-objection', 'Demo Tenant', '2026-10-04T15:00:00.000Z')
  assert.ok(currentTenantResolution(state, 'repair', 'repair-objection'))
  assert.equal(closeObjection(state, 'repair', 'repair-objection', 'Demo Reviewer', ' ', '2026-10-04T16:00:00.000Z'), state)
  state = closeObjection(state, 'repair', 'repair-objection', 'Demo Reviewer', 'Correction reviewed and accepted.', '2026-10-04T16:00:00.000Z')
  assert.equal(hasOpenObjection(state, 'one'), false)
})

test('record changes invalidate pending tenant resolution consent', () => {
  let state = correctedRepair()
  state = confirmObjectionResolution(state, 'repair', 'repair-objection', 'Demo Tenant', '2026-10-04T15:00:00.000Z')
  state = saveInspection(state, { commitmentId: 'one', inspectionDate: '2026-10-04', inspectorName: 'Demo Tenant', result: 'meets', notes: 'Changed after consent.' }, '2026-10-04T16:00:00.000Z')
  assert.equal(currentTenantResolution(state, 'repair', 'repair-objection'), undefined)
  assert.equal(closeObjection(state, 'repair', 'repair-objection', 'Demo Reviewer', 'Cannot close.', '2026-10-04T17:00:00.000Z'), state)
})

test('reviewer actions cannot substitute for tenant repair confirmation', () => {
  let state = repairObjectionFlow()
  state = saveCompletionReport(state, { commitmentId: 'one', landlordName: 'Demo Landlord', completionDate: '2026-10-04', notes: 'Corrected.' }, '2026-10-04T13:00:00.000Z')
  state = confirmObjectionResolution(state, 'repair', 'repair-objection', 'Demo Reviewer', '2026-10-04T14:00:00.000Z')
  assert.equal(state.tenantResolutionConfirmations.length, 0)
  assert.equal(state.objectionClosures.length, 0)
})

test('multiple objections remain independently blocking', () => {
  let state = repairObjectionFlow()
  state = saveObjection(state, { id: 'second-objection', tenantName: 'Demo Tenant', commitmentIds: ['two'], reason: 'Window remains unsafe.' }, '2026-10-04T12:30:00.000Z')
  state = correctedRepair(state)
  state = confirmObjectionResolution(state, 'repair', 'repair-objection', 'Demo Tenant', '2026-10-04T15:00:00.000Z')
  state = closeObjection(state, 'repair', 'repair-objection', 'Demo Reviewer', 'First correction accepted.', '2026-10-04T16:00:00.000Z')
  assert.equal(hasOpenObjection(state), true)
  assert.equal(hasOpenObjection(state, 'one'), false)
  assert.equal(hasOpenObjection(state, 'two'), true)
})

test('closing an objection does not automatically accept handover', () => {
  let state = correctedRepair()
  state = confirmObjectionResolution(state, 'repair', 'repair-objection', 'Demo Tenant', '2026-10-04T15:00:00.000Z')
  state = closeObjection(state, 'repair', 'repair-objection', 'Demo Reviewer', 'Correction accepted.', '2026-10-04T16:00:00.000Z')
  state = withApprovedCharges(state)
  assert.equal(canAcceptHandover(state, ['one']), true)
  assert.equal(state.handoverAcceptances.length, 0)
})

test('schema four migration adds empty review records without losing workflow data', () => {
  const source = withInspection(withReport())
  const migrated = loadWorkflowState(JSON.stringify({ ...source, schemaVersion: 4, correctiveActions: undefined, tenantResolutionConfirmations: undefined, objectionClosures: undefined, objectionHistory: undefined }), null, ids)
  assert.equal(migrated.inspections.one.result, 'meets')
  assert.deepEqual(migrated.correctiveActions, [])
  assert.deepEqual(migrated.tenantResolutionConfirmations, [])
  assert.deepEqual(migrated.objectionClosures, [])
})

test('repair and charge objections can be independently corrected and closed before explicit handover', () => {
  let state = withApprovedCharges(confirmCommitment(withInspection(withReport()), 'one', 'Demo Tenant', now))
  state = saveObjection(state, { id: 'repair-flow', tenantName: 'Demo Tenant', commitmentIds: ['one'], reason: 'Repair needs correction.' }, '2026-10-04T11:00:00.000Z')
  const rent = state.chargeProposals['annual-rent']
  state = saveChargeProposal(state, { id: rent.id, name: rent.name, amountKobo: rent.amountKobo + 100, purpose: rent.purpose, refundable: rent.refundable, landlordName: 'Demo Landlord' }, '2026-10-04T11:10:00.000Z')
  state = decideCharge(state, rent.id, 'objected', 'Demo Tenant', 'Charge needs correction.', '2026-10-04T11:20:00.000Z')
  const chargeObjection = state.chargeDecisions.at(-1)!
  state = recordCorrectiveAction(state, 'repair', 'repair-flow', 'Demo Reviewer', 'Repair correction required.', 'Complete and reinspect the repair.', '2026-10-10', '2026-10-04T12:00:00.000Z')
  state = recordCorrectiveAction(state, 'charge', chargeObjection.id, 'Demo Reviewer', 'Charge correction required.', 'Revise the charge explanation and amount.', '2026-10-10', '2026-10-04T12:10:00.000Z')
  assert.equal(canAcceptHandover(state, ['one']), false)

  state = saveCompletionReport(state, { commitmentId: 'one', landlordName: 'Demo Landlord', completionDate: '2026-10-04', notes: 'Corrected repair.' }, '2026-10-04T13:00:00.000Z')
  state = confirmCommitment(state, 'one', 'Demo Tenant', '2026-10-04T13:10:00.000Z')
  state = saveChargeProposal(state, { id: rent.id, name: rent.name, amountKobo: rent.amountKobo, purpose: 'Corrected charge explanation.', refundable: rent.refundable, landlordName: 'Demo Landlord' }, '2026-10-04T13:20:00.000Z')
  state = decideCharge(state, rent.id, 'approved', 'Demo Tenant', undefined, '2026-10-04T13:30:00.000Z')
  state = confirmObjectionResolution(state, 'repair', 'repair-flow', 'Demo Tenant', '2026-10-04T14:00:00.000Z')
  state = confirmObjectionResolution(state, 'charge', chargeObjection.id, 'Demo Tenant', '2026-10-04T14:10:00.000Z')
  state = closeObjection(state, 'repair', 'repair-flow', 'Demo Reviewer', 'Repair correction verified.', '2026-10-04T15:00:00.000Z')
  state = closeObjection(state, 'charge', chargeObjection.id, 'Demo Reviewer', 'Charge correction verified.', '2026-10-04T15:10:00.000Z')
  assert.equal(canAcceptHandover(state, ['one']), true)
  assert.equal(state.handoverAcceptances.length, 0)
  state = acceptHandover(state, ['one'], 'Demo Tenant', '2026-10-04T16:00:00.000Z')
  assert.ok(currentHandoverAcceptance(state, ['one']))
})

test('reset clears only associated RENTA demo records', () => {
  const removed: string[] = []
  clearWorkflowStorage({ removeItem: (key) => { removed.push(key) } })
  assert.deepEqual(removed, [WORKFLOW_STORAGE_KEY, INSPECTION_STORAGE_KEY])
})
