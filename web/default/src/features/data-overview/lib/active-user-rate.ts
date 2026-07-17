export function getActiveUserRateClassName(rate: number): string {
  if (rate > 80) return 'text-success'
  if (rate >= 50) return 'text-warning'
  return 'text-destructive'
}
