package model

import (
	"errors"
	"fmt"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
)

var modelSquareUpdateMu sync.Mutex

var ErrModelSquareConfigStorage = errors.New("model square config storage failure")

// ValidateModelSquareAssociations permits editing existing unavailable models,
// but requires every newly associated model to exist in the pricing catalog.
func ValidateModelSquareAssociations(config, previous setting.ModelSquareConfig, pricing []Pricing) error {
	allowed := make(map[string]bool, len(pricing)+len(previous.Recommendations))
	for _, item := range pricing {
		allowed[item.ModelName] = true
	}
	for _, item := range previous.Recommendations {
		allowed[item.ModelName] = true
	}
	for _, item := range config.Recommendations {
		if !allowed[item.ModelName] {
			return fmt.Errorf("model %q is not available in the pricing catalog", item.ModelName)
		}
	}
	return nil
}

func SaveModelSquareConfig(config setting.ModelSquareConfig) (setting.ModelSquareConfig, error) {
	modelSquareUpdateMu.Lock()
	defer modelSquareUpdateMu.Unlock()
	config, err := setting.NormalizeModelSquareConfig(config)
	if err != nil {
		return config, err
	}
	previous, err := setting.GetModelSquareConfig()
	if err != nil {
		return config, fmt.Errorf("%w: cannot update invalid saved model square config: %w", ErrModelSquareConfigStorage, err)
	}
	if err := ValidateModelSquareAssociations(config, previous, GetPricing()); err != nil {
		return config, err
	}
	encoded, err := common.Marshal(config)
	if err != nil {
		return config, fmt.Errorf("%w: %w", ErrModelSquareConfigStorage, err)
	}
	if err := UpdateOptionsBulk(map[string]string{setting.ModelSquareConfigKey: string(encoded)}); err != nil {
		return config, fmt.Errorf("%w: %w", ErrModelSquareConfigStorage, err)
	}
	return config, nil
}

// GetModelSquareRecommendations must receive pricing already filtered to the
// caller's usable groups so recommendations cannot expose restricted models.
func GetModelSquareRecommendations(pricing []Pricing) []setting.ModelSquareRecommendation {
	config, err := setting.GetModelSquareConfig()
	if err != nil {
		common.SysError("invalid model square config: " + err.Error())
		return []setting.ModelSquareRecommendation{}
	}
	visible := make(map[string]bool, len(pricing))
	for _, item := range pricing {
		visible[item.ModelName] = true
	}
	return config.VisibleRecommendations(visible)
}
