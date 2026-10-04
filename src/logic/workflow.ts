import { INSPECTION_STORAGE_KEY, parseStoredInspections, type InspectionResult } from './inspections.ts'
import type { EvidenceMetadata } from './evidence.ts'

export const WORKFLOW_STORAGE_KEY = 'renta:demo-workflow:v2'
export const WORKFLOW_SCHEMA_VERSION = 3

export type DemoRole = 'landlord' | 'tenant'

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
}

export interface ActivityEvent {
  id: string
  actorRole: DemoRole
  actorName: string
  action: string
  commitmentId?: string
  timestamp: string
}

export interface WorkflowState {
  schemaVersion: 3
  completionReports: Record<string, CompletionReport>
  inspections: Record<string, VersionedInspection>
  confirmations: TenantConfirmation[]
  objections: Objection[]
  handoverAcceptances: HandoverAcceptance[]
  activity: ActivityEvent[]
  evidence: Record<string, EvidenceMetadata>
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
    schemaVersion: 3,
    completionReports: {},
    inspections: {},
    confirmations: [],
    objections: [],
    handoverAcceptances: [],
    activity: [],
    evidence: {},
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

export function loadWorkflowState(
  workflowValue: string | null,
  legacyInspectionValue: string | null,
  commitmentIds: string[],
): WorkflowState {
  if (workflowValue) {
    try {
      const parsed = JSON.parse(workflowValue) as Partial<WorkflowState>
      const storedSchema = (parsed as { schemaVersion?: number }).schemaVersion
      if (storedSchema !== 2 && storedSchema !== WORKFLOW_SCHEMA_VERSION) return emptyWorkflowState()
      const allowed = new Set(commitmentIds)
      const completionReports = Object.fromEntries(Object.entries(parsed.completionReports ?? {}).filter(([id, value]) => allowed.has(id) && isCompletionReport(value)))
      const inspections = Object.fromEntries(Object.entries(parsed.inspections ?? {}).filter(([id, value]) => allowed.has(id) && isInspection(value)))
      const evidence = Object.fromEntries(Object.entries(parsed.evidence ?? {}).filter(([, value]) => isEvidence(value, allowed)))
      const migratedInspections = Object.fromEntries(Object.entries(inspections).map(([id, item]) => [id, { ...item, evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds.filter((evidenceId) => evidenceId in evidence) : [] }]))
      return {
        schemaVersion: 3,
        completionReports,
        inspections: migratedInspections,
        confirmations: Array.isArray(parsed.confirmations) ? parsed.confirmations.filter((item): item is TenantConfirmation => Boolean(item && isText(item.id) && allowed.has(item.commitmentId))).map((item) => ({ ...item, evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds.filter((id) => id in evidence) : [] })) : [],
        objections: Array.isArray(parsed.objections) ? parsed.objections.filter((item): item is Objection => Boolean(item && isText(item.id) && Array.isArray(item.commitmentIds) && item.commitmentIds.every((id) => allowed.has(id)) && item.open === true)) : [],
        handoverAcceptances: Array.isArray(parsed.handoverAcceptances) ? parsed.handoverAcceptances.filter((item): item is HandoverAcceptance => Boolean(item && isText(item.id) && Array.isArray(item.snapshot))).map((item) => ({ ...item, snapshot: item.snapshot.map((snapshot) => ({ ...snapshot, evidenceIds: Array.isArray(snapshot.evidenceIds) ? snapshot.evidenceIds.filter((id) => id in evidence) : [] })) })) : [],
        activity: Array.isArray(parsed.activity) ? parsed.activity.filter((item): item is ActivityEvent => Boolean(item && isText(item.id) && isText(item.action))) : [],
        evidence,
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
  return state.objections.some((objection) => objection.open && (!commitmentId || objection.commitmentIds.includes(commitmentId)))
}

export function currentConfirmation(state: WorkflowState, commitmentId: string) {
  const report = state.completionReports[commitmentId]
  const inspection = state.inspections[commitmentId]
  if (!report || !inspection || hasOpenObjection(state, commitmentId)) return undefined
  return [...state.confirmations].reverse().find((confirmation) => confirmation.commitmentId === commitmentId
    && confirmation.reportRevisionId === report.revisionId
    && confirmation.inspectionRevisionId === inspection.revisionId)
}

export function canConfirmCommitment(state: WorkflowState, commitmentId: string) {
  return Boolean(state.completionReports[commitmentId]
    && state.inspections[commitmentId]?.result === 'meets'
    && !hasOpenObjection(state, commitmentId))
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
    activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'tenant', actorName: input.tenantName, action: existing ? 'Edited objection' : 'Raised objection', timestamp: now }],
  }
}

export function canAcceptHandover(state: WorkflowState, commitmentIds: string[]) {
  return !hasOpenObjection(state) && commitmentIds.every((id) => Boolean(currentConfirmation(state, id)))
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
  }
  return {
    ...state,
    handoverAcceptances: [...state.handoverAcceptances, acceptance],
    activity: [...state.activity, { id: uid('activity', now, state.activity.length), actorRole: 'tenant', actorName: tenantName, action: 'Accepted handover — demo record', timestamp: now }],
  }
}

export function currentHandoverAcceptance(state: WorkflowState, commitmentIds: string[]) {
  if (!canAcceptHandover(state, commitmentIds)) return undefined
  return [...state.handoverAcceptances].reverse().find((acceptance) => acceptance.snapshot.every((snapshot) => {
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
