import type { SecurityAuditSectionId } from './section-registry'

export function getVisibleSecurityAuditSectionIds(
  sectionIds: readonly SecurityAuditSectionId[],
  offHoursEnabled: boolean,
  imageStudioEnabled: boolean
): readonly SecurityAuditSectionId[] {
  return sectionIds.filter((sectionId) => {
    if (sectionId === 'off-hours') return offHoursEnabled
    if (sectionId === 'image-studio') return imageStudioEnabled
    return true
  })
}
