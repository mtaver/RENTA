export type ChargeDecisionType = 'approved' | 'objected'
export type ChargeStatus = 'Awaiting tenant approval' | 'Approved by both parties — demo record' | 'Tenant objection' | 'Review required — charge changed'

export interface ChargeProposal {
  id: string
  revisionId: string
  version: number
  name: string
  amountKobo: number
  purpose: string
  refundable: boolean
  landlordName: string
  updatedAt: string
  source: 'sample' | 'recorded'
}

export interface ChargeDecision {
  id: string
  chargeId: string
  proposalRevisionId: string
  type: ChargeDecisionType
  tenantName: string
  reason?: string
  createdAt: string
}

export interface SampleChargeInput { id: string, label: string, amount: number, refundable: boolean, purpose: string }

export function sampleChargeProposals(charges: SampleChargeInput[]): Record<string, ChargeProposal> {
  return Object.fromEntries(charges.map((charge) => [charge.id, {
    id: charge.id,
    revisionId: `sample-${charge.id}-v0`,
    version: 0,
    name: charge.label,
    amountKobo: charge.amount * 100,
    purpose: charge.purpose,
    refundable: charge.refundable,
    landlordName: '',
    updatedAt: '',
    source: 'sample' as const,
  }]))
}

export function parseNairaToKobo(value: string): number | undefined {
  const normalized = value.trim().replaceAll(',', '')
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) return undefined
  const [naira, fraction = ''] = normalized.split('.')
  const kobo = Number(naira) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(kobo) && kobo > 0 ? kobo : undefined
}

export function formatKobo(kobo: number) { return kobo / 100 }

export function currentChargeDecision(decisions: ChargeDecision[], proposal: ChargeProposal) {
  return [...decisions].reverse().find((decision) => decision.chargeId === proposal.id && decision.proposalRevisionId === proposal.revisionId)
}

export function chargeStatus(decisions: ChargeDecision[], proposal: ChargeProposal): ChargeStatus {
  const current = currentChargeDecision(decisions, proposal)
  if (current?.type === 'approved') return 'Approved by both parties — demo record'
  if (current?.type === 'objected') return 'Tenant objection'
  if (decisions.some((decision) => decision.chargeId === proposal.id)) return 'Review required — charge changed'
  return 'Awaiting tenant approval'
}

export function chargeTotals(proposals: Record<string, ChargeProposal>, decisions: ChargeDecision[]) {
  const current = Object.values(proposals)
  return {
    proposedKobo: current.reduce((sum, charge) => sum + charge.amountKobo, 0),
    approvedKobo: current.reduce((sum, charge) => sum + (currentChargeDecision(decisions, charge)?.type === 'approved' ? charge.amountKobo : 0), 0),
    refundableKobo: current.reduce((sum, charge) => sum + (charge.refundable ? charge.amountKobo : 0), 0),
  }
}
