import { INSPECTION_STORAGE_KEY, parseStoredInspections, type InspectionResult } from './inspections.ts'
import type { EvidenceMetadata } from './evidence.ts'
import { sampleRental } from '../data/sampleRental.ts'
import { currentChargeDecision, sampleChargeProposals, type ChargeDecision, type ChargeProposal } from './charges.ts'

export const WORKFLOW_STORAGE_KEY = 'renta:demo-workflow:v2'
export const WORKFLOW_SCHEMA_VERSION = 4

export type DemoRole = 'landlord' | 'tenant' | 'reviewer'
export type ReviewObjectionType = 'repair' | 'charge'

export interface CorrectiveAction {
  id: string
  objectionType: ReviewObjectionType
  objectionId: string
  reviewerName: string
  decisionReason: string
  requiredAction: string
  deadline: string
  baselineRevisionRefs: string[]
  objectionRevisionRef: string
  createdAt: string
}

export interface TenantResolutionConfirmation {
  id: string
  objectionType: ReviewObjectionType
  objectionId: string
  tenantName: string
  correctiveActionId: string
  revisionRefs: string[]
  objectionRevisionRef: string
  createdAt: string
}

export interface ObjectionClosure {
  id: string
  objectionType: ReviewObjectionType
  objectionId: string
  reviewerName: string
  decisionReason: string
  tenantResolutionId: string
  revisionRefs: string[]
  createdAt: string
}

export interface CompletionReport {
  commitmentId: string
  revisionId: string
  version: number
  landlordName: string
  completionDate: string
  notes: string
  updatedAt: string
}

export interface VersionedInspection {
  commitmentId: string
  revisionId: string
  version: number
  inspectionDate: string
  inspectorName: string
  result: InspectionResult
  notes: string
  updatedAt: string
  evidenceIds: string[]
}

export interface TenantConfirmation {
  id: string
  commitmentId: string
  tenantName: string
  reportRevisionId: string
  inspectionRevisionId: string
  createdAt: string
  evidenceIds: string[]
}

export interface Objection {
  id: string
  tenantName: string
  commitmentIds: string[]
  reason: string
  createdAt: string
  updatedAt: string
  open: true
}

export interface HandoverAcceptance {
  id: string
  tenantName: string
  createdAt: string
  snapshot: Array<{
    commitmentId: string
    reportRevisionId: string
    inspectionRevisionId: string
    confirmationId: string
    evidenceIds: string[]
  }>
  chargeSnapshot: Array<{ chargeId: string, proposalRevisionId: string, decisionId: string }>
}

export interface ActivityEvent {
  id: string
  actorRole: DemoRole
  actorName: string
  action: string
  commitmentId?: string
  chargeId?: string
  timestamp: string
}

export interface WorkflowState {
  schemaVersion: 5
  completionReports: Record<string, CompletionReport>
  inspections: Record<string, VersionedInspection>
  confirmations: TenantConfirmation[]
  objections: Objection[]
  handoverAcceptances: HandoverAcceptance[]
  activity: ActivityEvent[]
  evidence: Record<string, EvidenceMetadata>
  chargeProposals: Record<string, ChargeProposal>
  chargeDecisions: ChargeDecision[]
  objectionHistory: Objection[]
  correctiveActions: CorrectiveAction[]
  tenantResolutionConfirmations: TenantResolutionConfirmation[]
  objectionClosures: ObjectionClosure[]
}

export type AgreementStatus =
  | 'Awaiting landlord completion report'
  | 'Awaiting inspection'
  | 'Awaiting tenant confirmation'
  | 'Confirmed by both parties'
  | 'Objection open'
  | 'Review required — record changed'

export function emptyWorkflowState(): WorkflowState {
  return {
    schemaVersion: 5,
    completionReports: {},
    inspections: {},
    confirmations: [],
    objections: [],
    handoverAcceptances: [],
    activity: [],
    evidence: {},
    chargeProposals: sampleChargeProposals(sampleRental.charges),
    chargeDecisions: [],
    objectionHistory: [],
    correctiveActions: [],
    tenantResolutionConfirmations: [],
    objectionClosures: [],
  }
}

function uid(prefix: string, timestamp: string, sequence = 0) {
  return `${prefix}-${timestamp}-${sequence}`
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isResult(value: unknown): value is InspectionResult {
  return value === 'meets' || value === 'does-not-meet' || value === 'unable'
}

function isCompletionReport(value: unknown): value is CompletionReport {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<CompletionReport>
  return isText(item.commitmentId) && isText(item.revisionId) && typeof item.version === 'number'
    && isText(item.landlordName) && isText(item.completionDate) && isText(item.notes) && isText(item.updatedAt)
}

function isInspection(value: unknown): value is VersionedInspection {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<VersionedInspection>
  return isText(item.commitmentId) && isText(item.revisionId) && typeof item.version === 'number'
    && isText(item.inspectionDate) && isText(item.inspectorName) && isResult(item.result)
    && isText(item.notes) && isText(item.updatedAt)
}

function isEvidence(value: unknown, allowed: Set<string>): value is EvidenceMetadata {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<EvidenceMetadata>
  return isText(item.id) && isText(item.commitmentId) && allowed.has(item.commitmentId)
    && isText(item.description) && (item.label === 'Before repair' || item.label === 'After repair' || item.label === 'Inspection')
    && isText(item.mimeType) && typeof item.size === 'number' && isText(item.createdAt)
}

function isChargeProposal(value: unknown): value is ChargeProposal {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ChargeProposal>
  return isText(item.id) && isText(item.revisionId) && typeof item.version === 'number' && isText(item.name)
    && Number.isSafeInteger(item.amountKobo) && (item.amountKobo ?? 0) > 0 && isText(item.purpose)
    && typeof item.refundable === 'boolean' && typeof item.landlordName === 'string' && typeof item.updatedAt === 'string'
    && (item.source === 'sample' || item.source === 'recorded')
}

function isChargeDecision(value: unknown): value is ChargeDecision {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ChargeDecision>
  return isText(item.id) && isText(item.chargeId) && isText(item.proposalRevisionId) && isText(item.tenantName)
    && isText(item.createdAt) && (item.type === 'approved' || (item.type === 'objected' && isText(item.reason)))
}

function isCorrectiveAction(value: unknown): value is CorrectiveAction {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<CorrectiveAction>
  return isText(item.id) && (item.objectionType === 'repair' || item.objectionType === 'charge') && isText(item.objectionId)
    && isText(item.reviewerName) && isText(item.decisionReason) && isText(item.requiredAction) && isText(item.deadline)
    && Array.isArray(item.baselineRevisionRefs) && isText(item.objectionRevisionRef) && isText(item.createdAt)
}

function isTenantResolution(value: unknown): value is TenantResolutionConfirmation {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<TenantResolutionConfirmation>
  return isText(item.id) && (item.objectionType === 'repair' || item.objectionType === 'charge') && isText(item.objectionId)
    && isText(item.tenantName) && isText(item.correctiveActionId) && Array.isArray(item.revisionRefs)
    && isText(item.objectionRevisionRef) && isText(item.createdAt)
}

function isObjectionClosure(value: unknown): value is ObjectionClosure {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ObjectionClosure>
  return isText(item.id) && (item.objectionType === 'repair' || item.objectionType === 'charge') && isText(item.objectionId)
    && isText(item.reviewerName) && isText(item.decisionReason) && isText(item.tenantResolutionId)
    && Array.isArray(item.revisionRefs) && isText(item.createdAt)
}

export function loadWorkflowState(
  workflowValue: string | null,
  legacyInspectionValue: string | null,
  commitmentIds: string[],
): WorkflowState {
  if (workflowValue) {
    try {
      const parsed = JSON.parse(workflowValue) as Partial<WorkflowState>
      const storedSchema = (parsed as { schemaVersion?: number }).schemaVersion
      if (storedSchema !== 2 && storedSchema !== 3 && storedSchema !== 4 && storedSchema !== WORKFLOW_SCHEMA_VERSION) return emptyWorkflowState()
      const allowed = new Set(commitmentIds)
      const completionReports = Object.fromEntries(Object.entries(parsed.completionReports ?? {}).filter(([id, value]) => allowed.has(id) && isCompletionReport(value)))
      const inspections = Object.fromEntries(Object.entries(parsed.inspections ?? {}).filter(([id, value]) => allowed.has(id) && isInspection(value)))
      const evidence = Object.fromEntries(Object.entries(parsed.evidence ?? {}).filter(([, value]) => isEvidence(value, allowed)))
      const migratedInspections = Object.fromEntries(Object.entries(inspections).map(([id, item]) => [id, { ...item, evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds.filter((evidenceId) => evidenceId in evidence) : [] }]))
      const parsedCharges = Object.fromEntries(Object.entries(parsed.chargeProposals ?? {}).filter(([, value]) => isChargeProposal(value)))
      const chargeProposals = { ...sampleChargeProposals(sampleRental.charges), ...parsedCharges }
      const chargeDecisions = Array.isArray(parsed.chargeDecisions) ? parsed.chargeDecisions.filter(isChargeDecision).filter((decision) => decision.chargeId in chargeProposals) : []
      const objections = Array.isArray(parsed.objections) ? parsed.objections.filter((item): item is Objection => Boolean(item && isText(item.id) && Array.isArray(item.commitmentIds) && item.commitmentIds.every((id) => allowed.has(id)) && item.open === true)) : []
      return {
        schemaVersion: 5,
        completionReports,
        inspections: migratedInspections,
        confirmations: Array.isArray(parsed.confirmations) ? parsed.confirmations.filter((item): item is TenantConfirmation => Boolean(item && isText(item.id) && allowed.has(item.commitmentId))).map((item) => ({ ...item, evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds.filter((id) => id in evidence) : [] })) : [],
        objections,
        handoverAcceptances: Array.isArray(parsed.handoverAcceptances) ? parsed.handoverAcceptances.filter((item): item is HandoverAcceptance => Boolean(item && isText(item.id) && Array.isArray(item.snapshot))).map((item) => ({ ...item, snapshot: item.snapshot.map((snapshot) => ({ ...snapshot, evidenceIds: Array.isArray(snapshot.evidenceIds) ? snapshot.evidenceIds.filter((id) => id in evidence) : [] })), chargeSnapshot: Array.isArray(item.chargeSnapshot) ? item.chargeSnapshot : [] })) : [],
        activity: Array.isArray(parsed.activity) ? parsed.activity.filter((item): item is ActivityEvent => Boolean(item && isText(item.id) && isText(item.action))) : [],
        evidence,
        chargeProposals,
        chargeDecisions,
        objectionHistory: Array.isArray(parsed.objectionHistory) ? parsed.objectionHistory.filter((item): item is Objection => Boolean(item && isText(item.id) && Array.isArray(item.commitmentIds))) : objections,
        correctiveActions: Array.isArray(parsed.correctiveActions) ? parsed.correctiveActions.filter(isCorrectiveAction) : [],
        tenantResolutionConfirmations: Array.isArray(parsed.tenantResolutionConfirmations) ? parsed.tenantResolutionConfirmations.filter(isTenantResolution) : [],
        objectionClosures: Array.isArray(parsed.objectionClosures) ? parsed.objectionClosures.filter(isObjectionClosure) : [],
      }
    } catch {
      return emptyWorkflowState()
    }
  }

  const legacy = parseStoredInspections(legacyInspectionValue, commitmentIds)
  const state = emptyWorkflowState()
  state.inspections = Object.fromEntries(Object.entries(legacy).map(([id, record]) => [id, {
    ...record,
    revisionId: `legacy-${id}-${record.updatedAt}`,
    version: 1,
    evidenceIds: [],
  }]))
  return state
}

export function saveChargeProposal(state: WorkflowState, input: Pick<ChargeProposal, 'id' | 'name' | 'amountKobo' | 'purpose' | 'refundable' | 'landlordName'>, now: string): WorkflowState {
  const previous = state.chargeProposals[input.id]
  const version = previous?.source === 'recorded' ? previous.version + 1 : 1
  const proposal: ChargeProposal = { ...input, version, source: 'recorded', updatedAt: now, revisionId: uid(`charge-${input.id}-v${version}`, now) }
  return { ...state, chargeProposals: { ...state.chargeProposals, [input.id]: proposal }, activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'landlord', actorName: input.landlordName, action: previous?.source === 'recorded' ? 'Edited charge proposal' : 'Submitted charge proposal', chargeId: input.id, timestamp: now }] }
}

export function decideCharge(state: WorkflowState, chargeId: string, type: ChargeDecision['type'], tenantName: string, reason: string | undefined, now: string): WorkflowState {
  const proposal = state.chargeProposals[chargeId]
  if (!proposal || proposal.source !== 'recorded' || !tenantName.trim() || (type === 'objected' && !reason?.trim())) return state
  const decision: ChargeDecision = { id: uid(`charge-decision-${chargeId}`, now, state.chargeDecisions.length), chargeId, proposalRevisionId: proposal.revisionId, type, tenantName: tenantName.trim(), reason: type === 'objected' ? reason!.trim() : undefined, createdAt: now }
  return { ...state, chargeDecisions: [...state.chargeDecisions, decision], activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'tenant', actorName: decision.tenantName, action: type === 'approved' ? 'Approved charge proposal' : 'Objected to charge proposal', chargeId, timestamp: now }] }
}

export function hasOpenChargeObjection(state: WorkflowState) {
  return openChargeObjections(state).length > 0
}

export function allCurrentChargesApproved(state: WorkflowState) {
  const proposals = Object.values(state.chargeProposals)
  return proposals.length > 0 && proposals.every((proposal) => proposal.source === 'recorded' && currentChargeDecision(state.chargeDecisions, proposal)?.type === 'approved')
}

export function saveCompletionReport(state: WorkflowState, input: Omit<CompletionReport, 'revisionId' | 'version' | 'updatedAt'>, now: string): WorkflowState {
  const previous = state.completionReports[input.commitmentId]
  const version = (previous?.version ?? 0) + 1
  const report: CompletionReport = { ...input, version, updatedAt: now, revisionId: uid(`report-${input.commitmentId}-v${version}`, now) }
  return {
    ...state,
    completionReports: { ...state.completionReports, [input.commitmentId]: report },
    activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'landlord', actorName: input.landlordName, action: previous ? 'Edited completion report' : 'Reported work complete', commitmentId: input.commitmentId, timestamp: now }],
  }
}

export function saveInspection(state: WorkflowState, input: Omit<VersionedInspection, 'revisionId' | 'version' | 'updatedAt' | 'evidenceIds'>, now: string): WorkflowState {
  const previous = state.inspections[input.commitmentId]
  const version = (previous?.version ?? 0) + 1
  const inspection: VersionedInspection = { ...input, evidenceIds: previous?.evidenceIds ?? [], version, updatedAt: now, revisionId: uid(`inspection-${input.commitmentId}-v${version}`, now) }
  return {
    ...state,
    inspections: { ...state.inspections, [input.commitmentId]: inspection },
    activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'tenant', actorName: input.inspectorName, action: previous ? 'Edited inspection' : 'Recorded inspection', commitmentId: input.commitmentId, timestamp: now }],
  }
}

export function addEvidence(state: WorkflowState, metadata: EvidenceMetadata, actorName: string, now: string): WorkflowState {
  const inspection = state.inspections[metadata.commitmentId]
  if (!inspection || metadata.commitmentId !== inspection.commitmentId || inspection.evidenceIds.length >= 4) return state
  return reviseEvidence({ ...state, evidence: { ...state.evidence, [metadata.id]: metadata } }, metadata.commitmentId, [...inspection.evidenceIds, metadata.id], actorName, 'Added photo evidence', now)
}

export function editEvidence(state: WorkflowState, id: string, replacementId: string, description: string, label: EvidenceMetadata['label'], actorName: string, now: string): WorkflowState {
  const metadata = state.evidence[id]
  const inspection = metadata && state.inspections[metadata.commitmentId]
  if (!metadata || !inspection?.evidenceIds.includes(id) || !description.trim()) return state
  const replacement = { ...metadata, id: replacementId, description: description.trim(), label, createdAt: now }
  return reviseEvidence({ ...state, evidence: { ...state.evidence, [replacementId]: replacement } }, metadata.commitmentId, inspection.evidenceIds.map((value) => value === id ? replacementId : value), actorName, 'Edited photo evidence', now)
}

export function removeCurrentEvidence(state: WorkflowState, id: string, actorName: string, now: string): WorkflowState {
  const metadata = state.evidence[id]
  const inspection = metadata && state.inspections[metadata.commitmentId]
  if (!metadata || !inspection?.evidenceIds.includes(id)) return state
  return reviseEvidence(state, metadata.commitmentId, inspection.evidenceIds.filter((value) => value !== id), actorName, 'Removed current photo evidence', now)
}

function reviseEvidence(state: WorkflowState, commitmentId: string, evidenceIds: string[], actorName: string, action: string, now: string): WorkflowState {
  const previous = state.inspections[commitmentId]
  const version = previous.version + 1
  return {
    ...state,
    inspections: { ...state.inspections, [commitmentId]: { ...previous, evidenceIds, version, updatedAt: now, revisionId: uid(`inspection-${commitmentId}-v${version}`, now) } },
    activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'tenant', actorName, action, commitmentId, timestamp: now }],
  }
}

export function hasOpenObjection(state: WorkflowState, commitmentId?: string) {
  return openRepairObjections(state).some((objection) => !commitmentId || objection.commitmentIds.includes(commitmentId))
}

export function currentConfirmation(state: WorkflowState, commitmentId: string) {
  const report = state.completionReports[commitmentId]
  const inspection = state.inspections[commitmentId]
  if (!report || !inspection) return undefined
  return [...state.confirmations].reverse().find((confirmation) => confirmation.commitmentId === commitmentId
    && confirmation.reportRevisionId === report.revisionId
    && confirmation.inspectionRevisionId === inspection.revisionId)
}

export function canConfirmCommitment(state: WorkflowState, commitmentId: string) {
  const openForCommitment = openRepairObjections(state).filter((objection) => objection.commitmentIds.includes(commitmentId))
  const correctionAllowsConfirmation = openForCommitment.length > 0 && openForCommitment.every((objection) => {
    const action = latestCorrectiveAction(state, 'repair', objection.id)
    if (!action || action.objectionRevisionRef !== objection.updatedAt) return false
    const currentRefs = [`report:${commitmentId}:${state.completionReports[commitmentId]?.revisionId ?? 'missing'}`, `inspection:${commitmentId}:${state.inspections[commitmentId]?.revisionId ?? 'missing'}`]
    const baselineRefs = action.baselineRevisionRefs.filter((ref) => ref.includes(`:${commitmentId}:`))
    return currentRefs.some((ref) => !baselineRefs.includes(ref))
  })
  return Boolean(state.completionReports[commitmentId]
    && state.inspections[commitmentId]?.result === 'meets'
    && (!openForCommitment.length || correctionAllowsConfirmation))
}

export function agreementStatus(state: WorkflowState, commitmentId: string): AgreementStatus {
  if (hasOpenObjection(state, commitmentId)) return 'Objection open'
  if (!state.completionReports[commitmentId]) return 'Awaiting landlord completion report'
  if (!state.inspections[commitmentId] || state.inspections[commitmentId].result !== 'meets') return 'Awaiting inspection'
  if (currentConfirmation(state, commitmentId)) return 'Confirmed by both parties'
  if (state.confirmations.some((confirmation) => confirmation.commitmentId === commitmentId)) return 'Review required — record changed'
  return 'Awaiting tenant confirmation'
}

export function confirmCommitment(state: WorkflowState, commitmentId: string, tenantName: string, now: string): WorkflowState {
  if (!canConfirmCommitment(state, commitmentId)) return state
  const report = state.completionReports[commitmentId]
  const inspection = state.inspections[commitmentId]
  const confirmation: TenantConfirmation = {
    id: uid(`confirmation-${commitmentId}`, now, state.confirmations.length), commitmentId, tenantName,
    reportRevisionId: report.revisionId, inspectionRevisionId: inspection.revisionId, createdAt: now,
    evidenceIds: [...inspection.evidenceIds],
  }
  return {
    ...state,
    confirmations: [...state.confirmations, confirmation],
    activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'tenant', actorName: tenantName, action: 'Confirmed repair', commitmentId, timestamp: now }],
  }
}

export function saveObjection(state: WorkflowState, input: Pick<Objection, 'id' | 'tenantName' | 'commitmentIds' | 'reason'>, now: string): WorkflowState {
  const existing = state.objections.find((item) => item.id === input.id)
  const objection: Objection = { ...input, open: true, createdAt: existing?.createdAt ?? now, updatedAt: now }
  return {
    ...state,
    objections: existing ? state.objections.map((item) => item.id === input.id ? objection : item) : [...state.objections, objection],
    objectionHistory: [...state.objectionHistory, objection],
    activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'tenant', actorName: input.tenantName, action: existing ? 'Edited objection' : 'Raised objection', timestamp: now }],
  }
}

function objectionKey(type: ReviewObjectionType, id: string) { return `${type}:${id}` }

export function isObjectionClosed(state: WorkflowState, type: ReviewObjectionType, id: string) {
  return state.objectionClosures.some((closure) => closure.objectionType === type && closure.objectionId === id)
}

export function openChargeObjections(state: WorkflowState) {
  return state.chargeDecisions.filter((decision) => decision.type === 'objected' && !isObjectionClosed(state, 'charge', decision.id))
}

export function openRepairObjections(state: WorkflowState) {
  return state.objections.filter((objection) => !isObjectionClosed(state, 'repair', objection.id))
}

function repairBaselineRefs(state: WorkflowState, objection: Objection) {
  return objection.commitmentIds.flatMap((id) => [`report:${id}:${state.completionReports[id]?.revisionId ?? 'missing'}`, `inspection:${id}:${state.inspections[id]?.revisionId ?? 'missing'}`])
}

function repairResolutionRefs(state: WorkflowState, objection: Objection) {
  return objection.commitmentIds.flatMap((id) => [`report:${id}:${state.completionReports[id]?.revisionId ?? 'missing'}`, `inspection:${id}:${state.inspections[id]?.revisionId ?? 'missing'}`, `confirmation:${id}:${currentConfirmation(state, id)?.id ?? 'missing'}`])
}

function chargeResolutionRefs(state: WorkflowState, decision: ChargeDecision) {
  const proposal = state.chargeProposals[decision.chargeId]
  return [`proposal:${decision.chargeId}:${proposal?.revisionId ?? 'missing'}`, `approval:${decision.chargeId}:${proposal ? currentChargeDecision(state.chargeDecisions, proposal)?.type === 'approved' ? currentChargeDecision(state.chargeDecisions, proposal)!.id : 'missing' : 'missing'}`]
}

export function latestCorrectiveAction(state: WorkflowState, type: ReviewObjectionType, id: string) {
  return [...state.correctiveActions].reverse().find((action) => action.objectionType === type && action.objectionId === id)
}

function currentObjectionRevisionRef(state: WorkflowState, type: ReviewObjectionType, id: string) {
  if (type === 'repair') return state.objections.find((item) => item.id === id)?.updatedAt ?? 'missing'
  return state.chargeDecisions.find((item) => item.id === id)?.id ?? 'missing'
}

export function recordCorrectiveAction(state: WorkflowState, type: ReviewObjectionType, id: string, reviewerName: string, decisionReason: string, requiredAction: string, deadline: string, now: string): WorkflowState {
  if (!reviewerName.trim() || !decisionReason.trim() || !requiredAction.trim() || !deadline || isObjectionClosed(state, type, id)) return state
  const repair = type === 'repair' ? state.objections.find((item) => item.id === id) : undefined
  const charge = type === 'charge' ? state.chargeDecisions.find((item) => item.id === id && item.type === 'objected') : undefined
  if (!repair && !charge) return state
  const baselineRevisionRefs = repair ? repairBaselineRefs(state, repair) : [`proposal:${charge!.chargeId}:${state.chargeProposals[charge!.chargeId]?.revisionId ?? 'missing'}`]
  const action: CorrectiveAction = { id: uid(`corrective-${objectionKey(type, id)}`, now, state.correctiveActions.length), objectionType: type, objectionId: id, reviewerName: reviewerName.trim(), decisionReason: decisionReason.trim(), requiredAction: requiredAction.trim(), deadline, baselineRevisionRefs, objectionRevisionRef: currentObjectionRevisionRef(state, type, id), createdAt: now }
  return { ...state, correctiveActions: [...state.correctiveActions, action], activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'reviewer', actorName: action.reviewerName, action: 'Required corrective action', timestamp: now }] }
}

function correctionReady(state: WorkflowState, action: CorrectiveAction) {
  if (currentObjectionRevisionRef(state, action.objectionType, action.objectionId) !== action.objectionRevisionRef) return false
  if (action.objectionType === 'repair') {
    const objection = state.objections.find((item) => item.id === action.objectionId)
    if (!objection) return false
    return objection.commitmentIds.every((id) => {
      const currentPair = [`report:${id}:${state.completionReports[id]?.revisionId ?? 'missing'}`, `inspection:${id}:${state.inspections[id]?.revisionId ?? 'missing'}`]
      const baselinePair = action.baselineRevisionRefs.filter((ref) => ref.includes(`:${id}:`))
      return currentPair.some((ref) => !baselinePair.includes(ref)) && Boolean(state.completionReports[id]) && state.inspections[id]?.result === 'meets' && Boolean(currentConfirmation(state, id))
    })
  }
  const objection = state.chargeDecisions.find((item) => item.id === action.objectionId)
  const proposal = objection && state.chargeProposals[objection.chargeId]
  return Boolean(proposal && !action.baselineRevisionRefs.includes(`proposal:${proposal.id}:${proposal.revisionId}`) && currentChargeDecision(state.chargeDecisions, proposal)?.type === 'approved')
}

export function canConfirmObjectionResolution(state: WorkflowState, type: ReviewObjectionType, id: string) {
  const action = latestCorrectiveAction(state, type, id)
  return Boolean(action && correctionReady(state, action) && !isObjectionClosed(state, type, id))
}

export function confirmObjectionResolution(state: WorkflowState, type: ReviewObjectionType, id: string, tenantName: string, now: string): WorkflowState {
  const action = latestCorrectiveAction(state, type, id)
  if (!action || !tenantName.trim() || !correctionReady(state, action) || isObjectionClosed(state, type, id)) return state
  const repair = type === 'repair' ? state.objections.find((item) => item.id === id) : undefined
  const charge = type === 'charge' ? state.chargeDecisions.find((item) => item.id === id) : undefined
  const revisionRefs = repair ? repairResolutionRefs(state, repair) : chargeResolutionRefs(state, charge!)
  const confirmation: TenantResolutionConfirmation = { id: uid(`resolution-${objectionKey(type, id)}`, now, state.tenantResolutionConfirmations.length), objectionType: type, objectionId: id, tenantName: tenantName.trim(), correctiveActionId: action.id, revisionRefs, objectionRevisionRef: action.objectionRevisionRef, createdAt: now }
  return { ...state, tenantResolutionConfirmations: [...state.tenantResolutionConfirmations, confirmation], activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'tenant', actorName: confirmation.tenantName, action: 'Confirmed objection correction', timestamp: now }] }
}

export function currentTenantResolution(state: WorkflowState, type: ReviewObjectionType, id: string) {
  const action = latestCorrectiveAction(state, type, id)
  if (!action || !correctionReady(state, action)) return undefined
  return [...state.tenantResolutionConfirmations].reverse().find((item) => item.objectionType === type && item.objectionId === id && item.correctiveActionId === action.id
    && item.objectionRevisionRef === currentObjectionRevisionRef(state, type, id)
    && JSON.stringify(item.revisionRefs) === JSON.stringify(type === 'repair' ? repairResolutionRefs(state, state.objections.find((objection) => objection.id === id)!) : chargeResolutionRefs(state, state.chargeDecisions.find((decision) => decision.id === id)!)))
}

export function closeObjection(state: WorkflowState, type: ReviewObjectionType, id: string, reviewerName: string, decisionReason: string, now: string): WorkflowState {
  const resolution = currentTenantResolution(state, type, id)
  if (!resolution || !reviewerName.trim() || !decisionReason.trim() || isObjectionClosed(state, type, id)) return state
  const closure: ObjectionClosure = { id: uid(`closure-${objectionKey(type, id)}`, now, state.objectionClosures.length), objectionType: type, objectionId: id, reviewerName: reviewerName.trim(), decisionReason: decisionReason.trim(), tenantResolutionId: resolution.id, revisionRefs: [...resolution.revisionRefs], createdAt: now }
  return { ...state, objectionClosures: [...state.objectionClosures, closure], activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'reviewer', actorName: closure.reviewerName, action: 'Closed objection following correction', timestamp: now }] }
}

export function canAcceptHandover(state: WorkflowState, commitmentIds: string[]) {
  return !hasOpenObjection(state) && !hasOpenChargeObjection(state) && allCurrentChargesApproved(state) && commitmentIds.every((id) => Boolean(currentConfirmation(state, id)))
}

export function acceptHandover(state: WorkflowState, commitmentIds: string[], tenantName: string, now: string): WorkflowState {
  if (!canAcceptHandover(state, commitmentIds)) return state
  const acceptance: HandoverAcceptance = {
    id: uid('handover', now, state.handoverAcceptances.length), tenantName, createdAt: now,
    snapshot: commitmentIds.map((commitmentId) => ({
      commitmentId,
      reportRevisionId: state.completionReports[commitmentId].revisionId,
      inspectionRevisionId: state.inspections[commitmentId].revisionId,
      confirmationId: currentConfirmation(state, commitmentId)!.id,
      evidenceIds: [...state.inspections[commitmentId].evidenceIds],
    })),
    chargeSnapshot: Object.values(state.chargeProposals).map((proposal) => ({ chargeId: proposal.id, proposalRevisionId: proposal.revisionId, decisionId: currentChargeDecision(state.chargeDecisions, proposal)!.id })),
  }
  return {
    ...state,
    handoverAcceptances: [...state.handoverAcceptances, acceptance],
    activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'tenant', actorName: tenantName, action: 'Accepted handover — demo record', timestamp: now }],
  }
}

export function currentHandoverAcceptance(state: WorkflowState, commitmentIds: string[]) {
  if (!canAcceptHandover(state, commitmentIds)) return undefined
  return [...state.handoverAcceptances].reverse().find((acceptance) => acceptance.chargeSnapshot.length === Object.keys(state.chargeProposals).length
    && acceptance.chargeSnapshot.every((snapshot) => {
      const proposal = state.chargeProposals[snapshot.chargeId]
      return proposal?.revisionId === snapshot.proposalRevisionId && currentChargeDecision(state.chargeDecisions, proposal)?.id === snapshot.decisionId
    }) && acceptance.snapshot.every((snapshot) => {
    const confirmation = currentConfirmation(state, snapshot.commitmentId)
    return state.completionReports[snapshot.commitmentId]?.revisionId === snapshot.reportRevisionId
      && state.inspections[snapshot.commitmentId]?.revisionId === snapshot.inspectionRevisionId
      && confirmation?.id === snapshot.confirmationId
  }))
}

export function clearWorkflowStorage(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem(WORKFLOW_STORAGE_KEY)
  storage.removeItem(INSPECTION_STORAGE_KEY)
}
