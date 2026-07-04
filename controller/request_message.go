package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

// 单次批量查询的 request_id 数量上限，与日志页最大分页大小对齐
const maxRequestMessageBatchSize = 100

func parseRequestIds(c *gin.Context) []string {
	raw := strings.Split(c.Query("request_ids"), ",")
	requestIds := make([]string, 0, len(raw))
	for _, id := range raw {
		if id = strings.TrimSpace(id); id != "" {
			requestIds = append(requestIds, id)
		}
	}
	if len(requestIds) > maxRequestMessageBatchSize {
		requestIds = requestIds[:maxRequestMessageBatchSize]
	}
	return requestIds
}

func GetRequestMessages(c *gin.Context) {
	messages, err := model.GetRequestMessagesByRequestIds(parseRequestIds(c), 0)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, messages)
}

func GetUserRequestMessages(c *gin.Context) {
	messages, err := model.GetRequestMessagesByRequestIds(parseRequestIds(c), c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, messages)
}
