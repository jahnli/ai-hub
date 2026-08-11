package ratio_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setGroupRatioFixture(t *testing.T, groupRatio, groupGroupRatio, groupVendorRatio string) {
	t.Helper()
	originalGroupRatio := GroupRatio2JSONString()
	originalGroupGroupRatio := GroupGroupRatio2JSONString()
	originalGroupVendorRatio := GroupVendorRatio2JSONString()
	t.Cleanup(func() {
		require.NoError(t, UpdateGroupRatioByJSONString(originalGroupRatio))
		require.NoError(t, UpdateGroupGroupRatioByJSONString(originalGroupGroupRatio))
		require.NoError(t, UpdateGroupVendorRatioByJSONString(originalGroupVendorRatio))
	})
	require.NoError(t, UpdateGroupRatioByJSONString(groupRatio))
	require.NoError(t, UpdateGroupGroupRatioByJSONString(groupGroupRatio))
	require.NoError(t, UpdateGroupVendorRatioByJSONString(groupVendorRatio))
}

func TestResolveGroupRatioPriority(t *testing.T) {
	setGroupRatioFixture(t,
		`{"default": 1, "vip": 0.8}`,
		`{"vip": {"default": 0.5}}`,
		`{"default": {"1": 2, "2": 0}, "vip": {"1": 0.3}}`,
	)

	tests := []struct {
		name            string
		userGroup       string
		usingGroup      string
		vendorID        int
		wantRatio       float64
		wantSpecial     bool
		wantVendorRatio bool
		wantVendorID    int
	}{
		{
			name:        "special ratio wins over vendor ratio",
			userGroup:   "vip",
			usingGroup:  "default",
			vendorID:    1,
			wantRatio:   0.5,
			wantSpecial: true,
		},
		{
			name:            "vendor ratio replaces base group ratio",
			userGroup:       "default",
			usingGroup:      "default",
			vendorID:        1,
			wantRatio:       2,
			wantVendorRatio: true,
			wantVendorID:    1,
		},
		{
			name:            "vendor ratio zero is kept as-is (free)",
			userGroup:       "default",
			usingGroup:      "default",
			vendorID:        2,
			wantRatio:       0,
			wantVendorRatio: true,
			wantVendorID:    2,
		},
		{
			name:       "unconfigured vendor falls back to base ratio",
			userGroup:  "default",
			usingGroup: "vip",
			vendorID:   99,
			wantRatio:  0.8,
		},
		{
			name:       "vendor id zero skips vendor ratio",
			userGroup:  "default",
			usingGroup: "default",
			vendorID:   0,
			wantRatio:  1,
		},
		{
			name:       "unknown group falls back to 1",
			userGroup:  "default",
			usingGroup: "unknown",
			vendorID:   1,
			wantRatio:  1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			info := ResolveGroupRatio(tt.userGroup, tt.usingGroup, tt.vendorID)
			assert.Equal(t, tt.wantRatio, info.GroupRatio)
			assert.Equal(t, tt.wantSpecial, info.HasSpecialRatio)
			assert.Equal(t, tt.wantVendorRatio, info.HasVendorRatio)
			assert.Equal(t, tt.wantVendorID, info.VendorID)
			if tt.wantSpecial {
				assert.Equal(t, tt.wantRatio, info.GroupSpecialRatio)
			} else {
				assert.Equal(t, float64(-1), info.GroupSpecialRatio)
			}
		})
	}
}

func TestGetGroupVendorRatio(t *testing.T) {
	setGroupRatioFixture(t, `{}`, `{}`, `{"default": {"3": 1.5}}`)

	ratio, ok := GetGroupVendorRatio("default", 3)
	require.True(t, ok)
	assert.Equal(t, 1.5, ratio)

	_, ok = GetGroupVendorRatio("default", 4)
	assert.False(t, ok)

	_, ok = GetGroupVendorRatio("missing", 3)
	assert.False(t, ok)
}

func TestCheckGroupVendorRatio(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		wantErr bool
	}{
		{name: "empty object", json: `{}`, wantErr: false},
		{name: "valid ratios", json: `{"default": {"1": 1.2, "2": 0}}`, wantErr: false},
		{name: "negative ratio", json: `{"default": {"1": -0.1}}`, wantErr: true},
		{name: "non-numeric vendor key", json: `{"default": {"OpenAI": 1.2}}`, wantErr: true},
		{name: "zero vendor id", json: `{"default": {"0": 1.2}}`, wantErr: true},
		{name: "negative vendor id", json: `{"default": {"-1": 1.2}}`, wantErr: true},
		{name: "malformed json", json: `{"default": `, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckGroupVendorRatio(tt.json)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGroupVendorRatioJSONRoundTrip(t *testing.T) {
	setGroupRatioFixture(t, `{}`, `{}`, `{"default": {"1": 1.25}, "vip": {"2": 0.5}}`)

	jsonStr := GroupVendorRatio2JSONString()
	copyBefore := GetGroupVendorRatioCopy()

	require.NoError(t, UpdateGroupVendorRatioByJSONString(jsonStr))
	assert.Equal(t, copyBefore, GetGroupVendorRatioCopy())

	// 拷贝不应共享内层 map
	copyBefore["default"]["1"] = 999
	ratio, ok := GetGroupVendorRatio("default", 1)
	require.True(t, ok)
	assert.Equal(t, 1.25, ratio)
}
