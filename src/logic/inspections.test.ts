import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateHandoverSummary, clearStoredInspections, INSPECTION_STORAGE_KEY, parseStoredInspections, type InspectionRecord } from './inspections.ts'

const ids = ['one', 'two', 'three']

function record(commitmentId: string, result: InspectionRecord['result']): InspectionRecord {
  return {
    commitmentId,
    inspectionDate: '2026-01-10',
    inspectorName: 'Demo Inspector',
    result,
    notes: 'Demo inspection notes.',
    updatedAt: '2026-01-10T12:00:00.000Z',
  }
}

test('no inspections are pending inspection', () => {
  assert.deepEqual(calculateHandoverSummary(ids, {}), {
    decision: 'Pending inspection', passed: 0, failed: 0, unassessed: 3,
  })
})

test('partial and unable results are inspection incomplete', () => {
  assert.deepEqual(calculateHandoverSummary(ids, {
    one: record('one', 'meets'),
    two: record('two', 'unable'),
  }), {
    decision: 'Inspection incomplete', passed: 1, failed: 0, unassessed: 2,
  })
})

test('failed criteria take priority over incomplete inspections', () => {
  assert.deepEqual(calculateHandoverSummary(ids, {
    one: record('one', 'does-not-meet'),
  }), {
    decision: 'Outstanding issues', passed: 0, failed: 1, unassessed: 2,
  })
})

test('all passing inspections are ready for handover review', () => {
  assert.deepEqual(calculateHandoverSummary(ids, {
    one: record('one', 'meets'),
    two: record('two', 'meets'),
    three: record('three', 'meets'),
  }), {
    decision: 'Ready for handover review', passed: 3, failed: 0, unassessed: 0,
  })
})

test('invalid stored data is discarded safely', () => {
  assert.deepEqual(parseStoredInspections('not json', ids), {})
  assert.deepEqual(parseStoredInspections('{"one":{"result":"unknown"}}', ids), {})
})

test('valid stored records are restored and unrelated keys are ignored', () => {
  const valid = record('one', 'meets')
  assert.deepEqual(parseStoredInspections(JSON.stringify({ one: valid, unrelated: record('unrelated', 'meets') }), ids), { one: valid })
})

test('reset removes only the RENTA inspection storage key', () => {
  const removed: string[] = []
  clearStoredInspections({ removeItem: (key) => { removed.push(key) } })
  assert.deepEqual(removed, [INSPECTION_STORAGE_KEY])
})
