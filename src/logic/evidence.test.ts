import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_EVIDENCE_FILE_SIZE, validateEvidenceDetails } from './evidence.ts'

test('accepts supported photo metadata within the file and count limits', () => {
  assert.equal(validateEvidenceDetails({ type: 'image/jpeg', size: 1024 }, 'Bathroom fittings after repair', 'After repair', 0), '')
})

test('rejects invalid types, oversized files, missing descriptions and a fifth photo', () => {
  assert.match(validateEvidenceDetails({ type: 'application/pdf', size: 100 }, 'Evidence', 'Inspection', 0), /JPEG/)
  assert.match(validateEvidenceDetails({ type: 'image/png', size: MAX_EVIDENCE_FILE_SIZE + 1 }, 'Evidence', 'Inspection', 0), /5 MB/)
  assert.match(validateEvidenceDetails({ type: 'image/webp', size: 100 }, '   ', 'Inspection', 0), /description/)
  assert.match(validateEvidenceDetails({ type: 'image/webp', size: 100 }, 'Evidence', 'Inspection', 4), /up to 4/)
})
