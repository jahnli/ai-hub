package setting

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
)

const ModelSquareConfigKey = "ModelSquareConfig"
const ModelSquareMaxBodyBytes = 256 * 1024

type ModelSquareRecommendation struct {
	ModelName string `json:"model_name"`
	Scenario  string `json:"scenario"`
	Reason    string `json:"reason"`
	Enabled   bool   `json:"enabled"`
}

type ModelSquareConfig struct {
	Enabled         bool                        `json:"enabled"`
	Recommendations []ModelSquareRecommendation `json:"recommendations"`
}

func ParseModelSquareConfig(raw string) (ModelSquareConfig, error) {
	var wire *struct {
		Enabled         *bool `json:"enabled"`
		Recommendations *[]struct {
			ModelName *string `json:"model_name"`
			Scenario  *string `json:"scenario"`
			Reason    string  `json:"reason"`
			Enabled   *bool   `json:"enabled"`
		} `json:"recommendations"`
	}
	config := ModelSquareConfig{Recommendations: []ModelSquareRecommendation{}}
	if len(raw) > ModelSquareMaxBodyBytes {
		return config, fmt.Errorf("model square config exceeds 256 KiB")
	}
	if err := common.UnmarshalJsonStr(raw, &wire); err != nil {
		return config, fmt.Errorf("invalid model square config: %w", err)
	}
	if wire == nil || wire.Enabled == nil || wire.Recommendations == nil {
		return config, fmt.Errorf("enabled and recommendations are required and cannot be null")
	}
	config.Enabled = *wire.Enabled
	for i, item := range *wire.Recommendations {
		if item.ModelName == nil || item.Scenario == nil || item.Enabled == nil {
			return config, fmt.Errorf("recommendation %d: model_name, scenario and enabled are required and cannot be null", i+1)
		}
		config.Recommendations = append(config.Recommendations, ModelSquareRecommendation{
			ModelName: *item.ModelName, Scenario: *item.Scenario, Reason: item.Reason,
			Enabled: *item.Enabled,
		})
	}
	return NormalizeModelSquareConfig(config)
}

func NormalizeModelSquareConfig(config ModelSquareConfig) (ModelSquareConfig, error) {
	if len(config.Recommendations) > 100 {
		return config, fmt.Errorf("at most 100 recommendations are allowed")
	}
	items := make([]ModelSquareRecommendation, 0, len(config.Recommendations))
	seen := make(map[[2]string]bool)
	for i, item := range config.Recommendations {
		item.ModelName = strings.TrimSpace(item.ModelName)
		item.Reason = strings.TrimSpace(item.Reason)
		if item.ModelName == "" || utf8.RuneCountInString(item.ModelName) > 128 {
			return config, fmt.Errorf("recommendation %d: model name must contain 1 to 128 characters", i+1)
		}
		if utf8.RuneCountInString(item.Reason) > 300 {
			return config, fmt.Errorf("recommendation %d: reason must not exceed 300 characters", i+1)
		}
		switch item.Scenario {
		case "general", "coding", "chat", "writing", "image":
		default:
			return config, fmt.Errorf("recommendation %d: invalid scenario", i+1)
		}
		key := [2]string{item.Scenario, item.ModelName}
		if seen[key] {
			return config, fmt.Errorf("recommendation %d: duplicate scenario and model", i+1)
		}
		seen[key] = true
		items = append(items, item)
	}
	config.Recommendations = items
	return config, nil
}

// GetModelSquareConfig reads a snapshot refreshed by the existing option sync.
// A corrupt saved value is an error, never a replacement with empty settings.
func GetModelSquareConfig() (ModelSquareConfig, error) {
	common.OptionMapRWMutex.RLock()
	raw, exists := common.OptionMap[ModelSquareConfigKey]
	common.OptionMapRWMutex.RUnlock()
	if !exists {
		return ModelSquareConfig{Recommendations: []ModelSquareRecommendation{}}, nil
	}
	return ParseModelSquareConfig(raw)
}

func (config ModelSquareConfig) VisibleRecommendations(modelNames map[string]bool) []ModelSquareRecommendation {
	items := make([]ModelSquareRecommendation, 0)
	if !config.Enabled {
		return items
	}
	for _, item := range config.Recommendations {
		if item.Enabled && modelNames[item.ModelName] {
			items = append(items, item)
		}
	}
	return items
}
