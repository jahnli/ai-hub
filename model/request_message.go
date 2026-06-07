package model

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type RequestMessage struct {
	Id        int    `json:"id" gorm:"primaryKey;autoIncrement"`
	RequestId string `json:"request_id" gorm:"type:varchar(64);index:idx_rm_request_id;not null"`
	UserId    int    `json:"user_id" gorm:"index:idx_rm_user_id;not null"`
	CreatedAt int64  `json:"created_at" gorm:"bigint;index:idx_rm_created_at"`
	Summary   string `json:"summary" gorm:"type:varchar(200);default:''"`
	Messages  string `json:"messages" gorm:"type:text"`
}

func (RequestMessage) TableName() string {
	return "request_messages"
}

func CreateRequestMessage(requestId string, userId int, summary string, messages string) {
	rm := &RequestMessage{
		RequestId: requestId,
		UserId:    userId,
		CreatedAt: common.GetTimestamp(),
		Summary:   summary,
		Messages:  messages,
	}
	err := LOG_DB.Create(rm).Error
	if err != nil {
		common.SysLog("failed to create request message: " + err.Error())
	}
}

func GetRequestMessageByRequestId(requestId string) (*RequestMessage, error) {
	var rm RequestMessage
	err := LOG_DB.Where("request_id = ?", requestId).First(&rm).Error
	return &rm, err
}

func GetRequestMessageSummariesByRequestIds(requestIds []string) (map[string]string, error) {
	if len(requestIds) == 0 {
		return map[string]string{}, nil
	}
	var messages []RequestMessage
	err := LOG_DB.Select("request_id, summary").Where("request_id IN ?", requestIds).Find(&messages).Error
	if err != nil {
		return nil, err
	}
	result := make(map[string]string, len(messages))
	for _, m := range messages {
		result[m.RequestId] = m.Summary
	}
	return result, nil
}

func DeleteOldRequestMessages(ctx context.Context, targetTimestamp int64, limit int) (int64, error) {
	var total int64 = 0
	for {
		if ctx.Err() != nil {
			return total, ctx.Err()
		}
		result := LOG_DB.Where("created_at < ?", targetTimestamp).Limit(limit).Delete(&RequestMessage{})
		if result.Error != nil {
			return total, result.Error
		}
		total += result.RowsAffected
		if result.RowsAffected < int64(limit) {
			break
		}
	}
	return total, nil
}

type UserMessageItem struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func BuildUserMessageSummary(messages []UserMessageItem) string {
	var lastContent string
	for _, msg := range messages {
		if msg.Role == "user" && strings.TrimSpace(msg.Content) != "" {
			lastContent = strings.TrimSpace(msg.Content)
		}
	}
	if lastContent == "" {
		return ""
	}
	runes := []rune(lastContent)
	if len(runes) > 200 {
		return string(runes[:200])
	}
	return lastContent
}

func SaveRequestMessages(requestId string, userId int, messages []UserMessageItem) {
	if requestId == "" || len(messages) == 0 {
		return
	}
	summary := BuildUserMessageSummary(messages)
	messagesJson, err := json.Marshal(messages)
	if err != nil {
		common.SysLog("failed to marshal request messages: " + err.Error())
		return
	}
	CreateRequestMessage(requestId, userId, summary, string(messagesJson))
}
