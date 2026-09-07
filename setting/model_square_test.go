package setting

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestModelSquareConfigValidation(t *testing.T) {
	valid := ModelSquareRecommendation{ModelName: " 模型 ", Scenario: "general", Reason: " 推荐 ", Enabled: true}
	for _, test := range []struct {
		name string
		edit func(*ModelSquareRecommendation)
	}{
		{"empty model", func(r *ModelSquareRecommendation) { r.ModelName = " " }},
		{"long model", func(r *ModelSquareRecommendation) { r.ModelName = strings.Repeat("型", 129) }},
		{"long reason", func(r *ModelSquareRecommendation) { r.Reason = strings.Repeat("荐", 301) }},
		{"scenario", func(r *ModelSquareRecommendation) { r.Scenario = "unknown" }},
	} {
		t.Run(test.name, func(t *testing.T) {
			item := valid
			test.edit(&item)
			_, err := NormalizeModelSquareConfig(ModelSquareConfig{Recommendations: []ModelSquareRecommendation{item}})
			require.Error(t, err)
		})
	}
	config, err := NormalizeModelSquareConfig(ModelSquareConfig{Recommendations: []ModelSquareRecommendation{valid}})
	require.NoError(t, err)
	assert.Equal(t, "模型", config.Recommendations[0].ModelName)
	assert.Equal(t, "推荐", config.Recommendations[0].Reason)
	_, err = NormalizeModelSquareConfig(ModelSquareConfig{Recommendations: []ModelSquareRecommendation{valid, config.Recommendations[0]}})
	require.ErrorContains(t, err, "duplicate")
	_, err = NormalizeModelSquareConfig(ModelSquareConfig{Recommendations: make([]ModelSquareRecommendation, 101)})
	require.ErrorContains(t, err, "100")
	valid.ModelName, valid.Reason = strings.Repeat("型", 128), strings.Repeat("荐", 300)
	_, err = NormalizeModelSquareConfig(ModelSquareConfig{Recommendations: []ModelSquareRecommendation{valid}})
	require.NoError(t, err)
}

func TestModelSquareConfigRejectsNullAndInvalidJSONTypes(t *testing.T) {
	for _, raw := range []string{
		`null`, `{}`, `{"enabled":true,"recommendations":null}`,
		`{"enabled":null,"recommendations":[]}`, `{"enabled":false,"recommendations":[]} {}`,
		`{"enabled":true,"recommendations":[null]}`,
	} {
		t.Run(raw, func(t *testing.T) {
			_, err := ParseModelSquareConfig(raw)
			require.Error(t, err)
		})
	}
	config, err := ParseModelSquareConfig(`{"enabled":false,"recommendations":[]}`)
	require.NoError(t, err)
	assert.NotNil(t, config.Recommendations)
}

func TestModelSquareConfigOptionalReason(t *testing.T) {
	for _, field := range []string{``, `,"reason":""`, `,"reason":"  \t "`, `,"reason":null`} {
		t.Run(field, func(t *testing.T) {
			config, err := ParseModelSquareConfig(`{"enabled":true,"recommendations":[{"model_name":"m","scenario":"chat","enabled":true` + field + `}]}`)
			require.NoError(t, err)
			require.Len(t, config.Recommendations, 1)
			assert.Empty(t, config.Recommendations[0].Reason)
		})
	}
}

func TestModelSquareConfigDefaultAndInvalidSnapshot(t *testing.T) {
	common.OptionMapRWMutex.Lock()
	previous := common.OptionMap
	common.OptionMap = map[string]string{}
	common.OptionMapRWMutex.Unlock()
	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		common.OptionMap = previous
		common.OptionMapRWMutex.Unlock()
	})
	config, err := GetModelSquareConfig()
	require.NoError(t, err)
	assert.False(t, config.Enabled)
	assert.NotNil(t, config.Recommendations)
	common.OptionMapRWMutex.Lock()
	common.OptionMap[ModelSquareConfigKey] = "broken"
	common.OptionMapRWMutex.Unlock()
	_, err = GetModelSquareConfig()
	require.Error(t, err)
}

func TestModelSquareRecommendationsFilterInConfiguredOrder(t *testing.T) {
	config := ModelSquareConfig{Enabled: true, Recommendations: []ModelSquareRecommendation{
		{ModelName: "b", Scenario: "chat", Enabled: true},
		{ModelName: "a", Scenario: "writing", Enabled: true},
		{ModelName: "a", Scenario: "coding", Enabled: true},
		{ModelName: "first", Scenario: "general", Enabled: true},
		{ModelName: "hidden", Scenario: "general", Enabled: true},
		{ModelName: "disabled", Scenario: "general", Enabled: false},
	}}
	visible := map[string]bool{"a": true, "b": true, "first": true, "disabled": true}
	assert.Equal(t, []ModelSquareRecommendation{config.Recommendations[0], config.Recommendations[1], config.Recommendations[2], config.Recommendations[3]}, config.VisibleRecommendations(visible))
	config.Enabled = false
	assert.Empty(t, config.VisibleRecommendations(visible))
	assert.NotNil(t, config.VisibleRecommendations(visible))
}
