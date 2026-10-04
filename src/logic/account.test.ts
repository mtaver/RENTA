import assert from 'node:assert/strict'
import test from 'node:test'
import { destinationForProtectedPath, validateProfile } from './account.ts'

test('profile validation rejects blank and implausible names', () => {
  assert.equal(validateProfile({ displayName: '   ', isLandlord: true, isTenant: false }).displayName !== undefined, true)
  assert.equal(validateProfile({ displayName: 'x'.repeat(81), isLandlord: true, isTenant: false }).displayName !== undefined, true)
})

test('profile allows tenant, landlord, or both but not neither', () => {
  assert.deepEqual(validateProfile({ displayName: 'Demo Tenant', isLandlord: false, isTenant: true }), {})
  assert.deepEqual(validateProfile({ displayName: 'Demo Landlord', isLandlord: true, isTenant: false }), {})
  assert.deepEqual(validateProfile({ displayName: 'Demo User', isLandlord: true, isTenant: true }), {})
  assert.ok(validateProfile({ displayName: 'Demo User', isLandlord: false, isTenant: false }).capabilities)
})

test('signed-out dashboard navigation resolves to the account page', () => {
  assert.equal(destinationForProtectedPath('/dashboard', false), '/account')
  assert.equal(destinationForProtectedPath('/dashboard', true), '/dashboard')
  assert.equal(destinationForProtectedPath('/sample-rental', false), '/sample-rental')
})
