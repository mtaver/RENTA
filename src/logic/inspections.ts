export type InspectionResult = 'meets' | 'does-not-meet' | 'unable'

export interface InspectionRecord {
  commitmentId: string
  inspectionDate: string
  inspectorName: string
  result: InspectionResult
  notes: string
  updatedAt: string
}

export type InspectionRecords = Record<string, InspectionRecord>

export interface HandoverSummary {
  decision: 'Pending inspection' | 'Inspection incomplete' | 'Outstanding issues' | 'Ready for handover review'
  passed: number
  failed: number
  unassessed: number
}

export const INSPECTION_STORAGE_KEY = 'renta:demo-inspections:v1'

export function clearStoredInspections(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem(INSPECTION_STORAGE_KEY)
}

export function calculateHandoverSummary(
  commitmentIds: string[],
  records: InspectionRecords,
): HandoverSummary {
  const relevantRecords = commitmentIds
    .map((id) => records[id])
    .filter((record): record is InspectionRecord => Boolean(record))

  const passed = relevantRecords.filter((record) => record.result === 'meets').length
  const failed = relevantRecords.filter((record) => record.result === 'does-not-meet').length
  const unassessed = commitmentIds.length - passed - failed

  if (relevantRecords.length === 0) {
    return { decision: 'Pending inspection', passed, failed, unassessed }
  }

  if (failed > 0) {
    return { decision: 'Outstanding issues', passed, failed, unassessed }
  }

  if (unassessed > 0) {
    return { decision: 'Inspection incomplete', passed, failed, unassessed }
  }

  return { decision: 'Ready for handover review', passed, failed, unassessed }
}

function isInspectionResult(value: unknown): value is InspectionResult {
  return value === 'meets' || value === 'does-not-meet' || value === 'unable'
}

function isValidRecord(value: unknown, commitmentId: string): value is InspectionRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<InspectionRecord>

  return record.commitmentId === commitmentId
    && typeof record.inspectionDate === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(record.inspectionDate)
    && typeof record.inspectorName === 'string'
    && record.inspectorName.trim().length > 0
    && isInspectionResult(record.result)
    && typeof record.notes === 'string'
    && record.notes.trim().length > 0
    && typeof record.updatedAt === 'string'
}

export function parseStoredInspections(
  storedValue: string | null,
  allowedCommitmentIds: string[],
): InspectionRecords {
  if (!storedValue) return {}

  try {
    const parsed: unknown = JSON.parse(storedValue)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return allowedCommitmentIds.reduce<InspectionRecords>((records, id) => {
      const record = (parsed as Record<string, unknown>)[id]
      if (isValidRecord(record, id)) records[id] = record
      return records
    }, {})
  } catch {
    return {}
  }
}
