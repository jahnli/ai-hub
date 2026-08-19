package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// buildOverviewDepartmentTestTree returns a fixed three-level tree:
// center -> business unit -> team.
func buildOverviewDepartmentTestTree() []*DeptTreeNode {
	team := &DeptTreeNode{Value: "dept:1:team", Label: "AI Engineering", Children: []*DeptTreeNode{}}
	businessUnit := &DeptTreeNode{Value: "dept:1:bu", Label: "AI Applications", Children: []*DeptTreeNode{team}}
	center := &DeptTreeNode{Value: "dept:1:center", Label: "Digital Center", Children: []*DeptTreeNode{businessUnit}}
	return []*DeptTreeNode{center}
}

func collectEnabledNodeValues(nodes []*DeptTreeNode) []string {
	var values []string
	for _, node := range nodes {
		if !node.Disabled {
			values = append(values, node.Value)
		}
		values = append(values, collectEnabledNodeValues(node.Children)...)
	}
	return values
}

func TestTrimTreeForExplicitDepts(t *testing.T) {
	tests := []struct {
		name          string
		departmentIDs []string
		wantEnabled   []string
		wantScopeIDs  []string
	}{
		{
			name:          "no configured departments disables every node",
			departmentIDs: nil,
			wantEnabled:   nil,
			wantScopeIDs:  nil,
		},
		{
			name:          "selected parent includes its complete subtree",
			departmentIDs: []string{"dept:1:bu"},
			wantEnabled:   []string{"dept:1:bu", "dept:1:team"},
			wantScopeIDs:  []string{"dept:1:bu"},
		},
		{
			name:          "multiple departments are combined",
			departmentIDs: []string{"dept:1:center", "dept:1:team"},
			wantEnabled:   []string{"dept:1:center", "dept:1:bu", "dept:1:team"},
			wantScopeIDs:  []string{"dept:1:center", "dept:1:team"},
		},
		{
			name:          "unknown departments do not grant access",
			departmentIDs: []string{"dept:1:missing"},
			wantEnabled:   nil,
			wantScopeIDs:  []string{"dept:1:missing"},
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			trimmedTree, scopeIDs := trimTreeForExplicitDepts(buildOverviewDepartmentTestTree(), testCase.departmentIDs)

			assert.Equal(t, testCase.wantScopeIDs, scopeIDs)
			assert.Equal(t, testCase.wantEnabled, collectEnabledNodeValues(trimmedTree))
		})
	}
}

func TestTrimTreeForExplicitDeptsDoesNotMutateInputTree(t *testing.T) {
	inputTree := buildOverviewDepartmentTestTree()

	_, _ = trimTreeForExplicitDepts(inputTree, []string{"dept:1:bu"})

	require.Len(t, inputTree, 1)
	assert.False(t, inputTree[0].Disabled)
	assert.False(t, inputTree[0].Children[0].Disabled)
	assert.False(t, inputTree[0].Children[0].Children[0].Disabled)
}

func TestParseOverviewDeptIDsRemovesEmptyAndDuplicateValues(t *testing.T) {
	values := ParseOverviewDeptIDs([]string{"dept:1:team", "", " dept:1:team ", "dept:1:bu"})

	assert.Equal(t, []string{"dept:1:team", "dept:1:bu"}, values)
}
