package controller

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"sort"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

func GetModelSquareConfig(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	config, err := setting.GetModelSquareConfig()
	if err != nil {
		common.SysError("read model square config failed: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "saved model square config is invalid"})
		return
	}
	names := make([]string, 0)
	seen := make(map[string]bool)
	for _, item := range model.GetPricing() {
		if !seen[item.ModelName] {
			names = append(names, item.ModelName)
			seen[item.ModelName] = true
		}
	}
	sort.Strings(names)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": config, "models": names})
}

func UpdateModelSquareConfig(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, setting.ModelSquareMaxBodyBytes)
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid or oversized model square config"})
		return
	}
	// Decode from the bounded buffer and check its full extent: DecodeJson alone
	// accepts trailing JSON because its decoder buffers beyond the first value.
	var raw json.RawMessage
	if err := common.DecodeJson(bytes.NewReader(body), &raw); err != nil || !bytes.Equal(bytes.TrimSpace(body), bytes.TrimSpace(raw)) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid model square JSON"})
		return
	}
	config, err := setting.ParseModelSquareConfig(string(raw))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	config, err = model.SaveModelSquareConfig(config)
	if err != nil {
		common.SysError("save model square config failed: " + err.Error())
		if errors.Is(err, model.ErrModelSquareConfigStorage) {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to save model square config"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": config})
}
