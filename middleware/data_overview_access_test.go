package middleware

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
)

func TestCanAccessDataOverview(t *testing.T) {
	tests := []struct {
		name     string
		user     *model.User
		expected bool
	}{
		{
			name:     "root can access",
			user:     &model.User{Role: common.RoleRootUser},
			expected: true,
		},
		{
			name:     "admin can access",
			user:     &model.User{Role: common.RoleAdminUser},
			expected: true,
		},
		{
			name:     "BP with configured bp_level can access",
			user:     &model.User{Role: common.RoleBUBP, BpLevel: 2},
			expected: true,
		},
		{
			name:     "BP with bp_level 1 can access",
			user:     &model.User{Role: common.RoleBUBP, BpLevel: 1},
			expected: true,
		},
		{
			name:     "BP with bp_level 0 is denied",
			user:     &model.User{Role: common.RoleBUBP, BpLevel: 0},
			expected: false,
		},
		{
			name:     "BP with bp_level 0 is denied even when leading departments",
			user:     &model.User{Role: common.RoleBUBP, BpLevel: 0, OpenId: "ou_bp", Departments: `[{"department_id":"team","leaders":[{"leader_id":"ou_bp"}]}]`},
			expected: false,
		},
		{
			name:     "dept leader with common role can access",
			user:     &model.User{Role: common.RoleCommonUser, OpenId: "ou_leader", Departments: `[{"department_id":"team","leaders":[{"leader_id":"ou_leader"}]}]`},
			expected: true,
		},
		{
			name:     "common user without leader departments is denied",
			user:     &model.User{Role: common.RoleCommonUser},
			expected: false,
		},
		{
			name:     "guest user is denied",
			user:     &model.User{Role: common.RoleGuestUser},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, canAccessDataOverview(tt.user))
		})
	}
}
