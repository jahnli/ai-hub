package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

// 单次批量查询的 request_id 数量上限，与日志页最大分页大小对齐
const maxRequestMessageBatchSize = 100

type requestMessagesBatchRequest struct {
	RequestIds []string `json:"request_ids"`
}

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

func parseRequestIdsFromBody(c *gin.Context) ([]string, error) {
	var request requestMessagesBatchRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		return nil, err
	}

	requestIds := make([]string, 0, len(request.RequestIds))
	for _, requestId := range request.RequestIds {
		requestId = strings.TrimSpace(requestId)
		if requestId != "" {
			requestIds = append(requestIds, requestId)
		}
	}
	if len(requestIds) > maxRequestMessageBatchSize {
		requestIds = requestIds[:maxRequestMessageBatchSize]
	}
	return requestIds, nil
}

func GetRequestMessages(c *gin.Context) {
	messages, err := model.GetRequestMessagesByRequestIds(parseRequestIds(c), 0)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, messages)
}

func GetRequestMessagesBatch(c *gin.Context) {
	requestIds, err := parseRequestIdsFromBody(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	messages, err := model.GetRequestMessagesByRequestIds(requestIds, 0)
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

func GetUserRequestMessagesBatch(c *gin.Context) {
	requestIds, err := parseRequestIdsFromBody(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	messages, err := model.GetRequestMessagesByRequestIds(requestIds, c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, messages)
}
