export type LoginView = 'ldap' | 'password' | 'oauth'

type LoginViewTitleKey =
  | 'Account sign in'
  | 'Enterprise account sign in'
  | 'Other sign in options'

export function getLoginViewTitleKey(activeView: LoginView): LoginViewTitleKey {
  if (activeView === 'ldap') {
    return 'Enterprise account sign in'
  }
  if (activeView === 'oauth') {
    return 'Other sign in options'
  }
  return 'Account sign in'
}
