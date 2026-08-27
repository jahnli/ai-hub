import { assert, describe, test } from 'vitest'

import type { AuthUser } from '@/stores/auth-store'

import {
  ADMIN_PERMISSION_ACTIONS,
  ADMIN_PERMISSION_RESOURCES,
  hasPermission,
  normalizeAdminPermissions,
  type PermissionCatalog,
} from '../admin-permissions'
import { ROLE } from '../roles'

const adminUser = (interfaceView?: boolean): AuthUser => ({
  id: 1,
  username: 'admin',
  role: ROLE.ADMIN,
  permissions:
    interfaceView === undefined
      ? undefined
      : {
          admin_permissions: {
            [ADMIN_PERMISSION_RESOURCES.CHANNEL]: {
              [ADMIN_PERMISSION_ACTIONS.INTERFACE_VIEW]: interfaceView,
            },
          },
        },
})

describe('channel interface access', () => {
  test('is denied by default for administrators', () => {
    assert.equal(
      hasPermission(
        adminUser(),
        ADMIN_PERMISSION_RESOURCES.CHANNEL,
        ADMIN_PERMISSION_ACTIONS.INTERFACE_VIEW
      ),
      false
    )
    assert.equal(
      hasPermission(
        adminUser(false),
        ADMIN_PERMISSION_RESOURCES.CHANNEL,
        ADMIN_PERMISSION_ACTIONS.INTERFACE_VIEW
      ),
      false
    )
  })

  test('is allowed after an administrator receives the permission', () => {
    assert.equal(
      hasPermission(
        adminUser(true),
        ADMIN_PERMISSION_RESOURCES.CHANNEL,
        ADMIN_PERMISSION_ACTIONS.INTERFACE_VIEW
      ),
      true
    )
  })

  test('remains allowed for root users', () => {
    assert.equal(
      hasPermission(
        { ...adminUser(), role: ROLE.SUPER_ADMIN },
        ADMIN_PERMISSION_RESOURCES.CHANNEL,
        ADMIN_PERMISSION_ACTIONS.INTERFACE_VIEW
      ),
      true
    )
  })

  test('normalizes the new catalog action to false without a role grant', () => {
    const catalog: PermissionCatalog = {
      resources: [
        {
          resource: ADMIN_PERMISSION_RESOURCES.CHANNEL,
          label_key: 'Channel Management',
          actions: [
            {
              action: ADMIN_PERMISSION_ACTIONS.INTERFACE_VIEW,
              label_key: 'Channel interface view',
              description_key: 'Access the channel management interface.',
            },
          ],
        },
      ],
      roles: [
        {
          key: 'admin',
          name: 'Admin',
          built_in: true,
          superuser: false,
          grants: {},
        },
      ],
    }

    assert.deepEqual(normalizeAdminPermissions(undefined, catalog), {
      [ADMIN_PERMISSION_RESOURCES.CHANNEL]: {
        [ADMIN_PERMISSION_ACTIONS.INTERFACE_VIEW]: false,
      },
    })
  })
})
