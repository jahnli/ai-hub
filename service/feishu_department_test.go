package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testBpDepartmentName = "数智产品中心 / AI应用技术部 / AI工程效率科"

// buildBpTestTree returns a fixed three-level tree:
// 数智产品中心 (center) -> AI应用技术部 (bu) -> AI工程效率科 (team).
func buildBpTestTree() []*DeptTreeNode {
	team := &DeptTreeNode{Value: "team", Label: "AI工程效率科", Children: []*DeptTreeNode{}}
	bu := &DeptTreeNode{Value: "bu", Label: "AI应用技术部", Children: []*DeptTreeNode{team}}
	center := &DeptTreeNode{Value: "center", Label: "数智产品中心", Children: []*DeptTreeNode{bu}}
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

func TestTrimTreeForBP(t *testing.T) {
	tests := []struct {
		name           string
		bpLevel        int
		departmentName string
		wantEnabled    []string
		wantLeaderIDs  []string
	}{
		{
			name:           "unset level disables everything",
			bpLevel:        0,
			departmentName: testBpDepartmentName,
			wantEnabled:    nil,
			wantLeaderIDs:  nil,
		},
		{
			name:           "negative level disables everything",
			bpLevel:        -1,
			departmentName: testBpDepartmentName,
			wantEnabled:    nil,
			wantLeaderIDs:  nil,
		},
		{
			name:           "level 1 exposes center and subtree",
			bpLevel:        1,
			departmentName: testBpDepartmentName,
			wantEnabled:    []string{"center", "bu", "team"},
			wantLeaderIDs:  []string{"center"},
		},
		{
			name:           "level 2 exposes business unit and subtree",
			bpLevel:        2,
			departmentName: testBpDepartmentName,
			wantEnabled:    []string{"bu", "team"},
			wantLeaderIDs:  []string{"bu"},
		},
		{
			name:           "level 3 exposes only the deepest segment",
			bpLevel:        3,
			departmentName: testBpDepartmentName,
			wantEnabled:    []string{"team"},
			wantLeaderIDs:  []string{"team"},
		},
		{
			name:           "level beyond depth collapses to the deepest segment",
			bpLevel:        9,
			departmentName: testBpDepartmentName,
			wantEnabled:    []string{"team"},
			wantLeaderIDs:  []string{"team"},
		},
		{
			name:           "empty department name disables everything",
			bpLevel:        2,
			departmentName: "",
			wantEnabled:    nil,
			wantLeaderIDs:  nil,
		},
		{
			name:           "unknown segment label disables everything",
			bpLevel:        1,
			departmentName: "不存在的中心 / 未知部门",
			wantEnabled:    nil,
			wantLeaderIDs:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			trimmed, leaderIDs := trimTreeForBP(buildBpTestTree(), tt.bpLevel, tt.departmentName)

			assert.Equal(t, tt.wantLeaderIDs, leaderIDs)
			assert.Equal(t, tt.wantEnabled, collectEnabledNodeValues(trimmed))
		})
	}
}

func TestNormalizeBpLevelForDepartment(t *testing.T) {
	tests := []struct {
		name           string
		departmentName string
		bpLevel        int
		want           int
	}{
		{
			name:           "clamps level beyond hierarchy depth",
			departmentName: testBpDepartmentName,
			bpLevel:        9,
			want:           3,
		},
		{
			name:           "keeps level within hierarchy depth",
			departmentName: testBpDepartmentName,
			bpLevel:        2,
			want:           2,
		},
		{
			name:           "keeps level equal to the deepest segment",
			departmentName: testBpDepartmentName,
			bpLevel:        3,
			want:           3,
		},
		{
			name:           "keeps unset level unchanged",
			departmentName: testBpDepartmentName,
			bpLevel:        0,
			want:           0,
		},
		{
			name:           "keeps level unchanged when hierarchy is unknown",
			departmentName: "",
			bpLevel:        5,
			want:           5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, NormalizeBpLevelForDepartment(tt.departmentName, tt.bpLevel))
		})
	}
}

func TestTrimTreeForBPDoesNotMutateInputTree(t *testing.T) {
	input := buildBpTestTree()

	_, _ = trimTreeForBP(input, 1, testBpDepartmentName)

	require.Len(t, input, 1)
	assert.False(t, input[0].Disabled)
	assert.False(t, input[0].Children[0].Disabled)
	assert.False(t, input[0].Children[0].Children[0].Disabled)
}
