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
			name:     "BP with configured visible departments can access",
			user:     &model.User{Role: common.RoleBUBP, OverviewDeptIDs: []string{"dept:1:team"}},
			expected: true,
		},
		{
			name:     "BP with multiple visible departments can access",
			user:     &model.User{Role: common.RoleBUBP, OverviewDeptIDs: []string{"dept:1:team", "dept:1:bu"}},
			expected: true,
		},
		{
			name:     "BP without visible departments is denied",
			user:     &model.User{Role: common.RoleBUBP},
			expected: false,
		},
		{
			name:     "BP without visible departments is denied even when leading departments",
			user:     &model.User{Role: common.RoleBUBP, OpenId: "ou_bp", Departments: `[{"department_id":"team","leaders":[{"leader_id":"ou_bp"}]}]`},
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
