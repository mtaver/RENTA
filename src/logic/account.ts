export interface ProfileInput {
  displayName: string
  isLandlord: boolean
  isTenant: boolean
}

export interface ProfileErrors {
  displayName?: string
  capabilities?: string
}

export function validateProfile(input: ProfileInput): ProfileErrors {
  const errors: ProfileErrors = {}
  const name = input.displayName.trim()

  if (name.length < 2) errors.displayName = 'Enter a name using at least 2 characters.'
  else if (name.length > 80) errors.displayName = 'Name must be 80 characters or fewer.'

  if (!input.isLandlord && !input.isTenant) {
    errors.capabilities = 'Choose at least one capability.'
  }

  return errors
}

export function isProtectedPath(pathname: string): boolean {
  return pathname === '/dashboard'
}

export function destinationForProtectedPath(pathname: string, hasSession: boolean): string {
  return isProtectedPath(pathname) && !hasSession ? '/account' : pathname
}
