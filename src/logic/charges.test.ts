import assert from 'node:assert/strict'
import test from 'node:test'
import { chargeStatus, chargeTotals, parseNairaToKobo, type ChargeDecision, type ChargeProposal } from './charges.ts'

const proposal: ChargeProposal = { id: 'rent', revisionId: 'rent-v1', version: 1, name: 'Annual rent', amountKobo: 120000050, purpose: 'One year rent', refundable: false, landlordName: 'Demo Landlord', updatedAt: '2026-10-04T10:00:00Z', source: 'recorded' }

test('amount validation accepts positive naira with at most two decimal places', () => {
  assert.equal(parseNairaToKobo('1,200,000.50'), 120000050)
  assert.equal(parseNairaToKobo('0.01'), 1)
  for (const invalid of ['', '0', '-1', '12.345', 'one hundred', '1.']) assert.equal(parseNairaToKobo(invalid), undefined)
})

test('totals use exact integer kobo', () => {
  const second = { ...proposal, id: 'deposit', revisionId: 'deposit-v1', amountKobo: 10001, refundable: true }
  const decisions: ChargeDecision[] = [{ id: 'd1', chargeId: 'rent', proposalRevisionId: 'rent-v1', type: 'approved', tenantName: 'Demo Tenant', createdAt: proposal.updatedAt }]
  assert.deepEqual(chargeTotals({ rent: proposal, deposit: second }, decisions), { proposedKobo: 120010051, approvedKobo: 120000050, refundableKobo: 10001 })
})

test('tenant decisions apply only to their proposal revision', () => {
  const decisions: ChargeDecision[] = [{ id: 'd1', chargeId: 'rent', proposalRevisionId: 'rent-v1', type: 'approved', tenantName: 'Demo Tenant', createdAt: proposal.updatedAt }]
  assert.equal(chargeStatus(decisions, proposal), 'Approved by both parties — demo record')
  assert.equal(chargeStatus(decisions, { ...proposal, revisionId: 'rent-v2', version: 2 }), 'Review required — charge changed')
})
