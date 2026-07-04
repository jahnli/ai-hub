package model

import (
	"github.com/QuantumNous/new-api/common"
)

// RequestMessage 存储每次中继请求中用户的真实输入（提示词）与模型参数，
// 通过 request_id 与 logs 表关联，独立于 logs 表存储。
type RequestMessage struct {
	Id          int    `json:"id"`
	RequestId   string `json:"request_id" gorm:"type:varchar(64);index:idx_request_message_request_id"`
	UserId      int    `json:"user_id" gorm:"index:idx_request_message_user_id_id,priority:1"`
	TokenId     int    `json:"token_id" gorm:"default:0"`
	ModelName   string `json:"model_name" gorm:"default:''"`
	RelayFormat string `json:"relay_format" gorm:"type:varchar(32);default:''"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint;index"`
	UserContent string `json:"user_content" gorm:"type:text"`
	Parameters  string `json:"parameters" gorm:"type:text"`
}

func InsertRequestMessage(rm *RequestMessage) {
	if rm == nil || rm.RequestId == "" {
		return
	}
	if err := DB.Create(rm).Error; err != nil {
		common.SysError("failed to record request message: " + err.Error())
	}
}

// GetRequestMessagesByRequestIds 按 request_id 批量查询。
// userId > 0 时仅返回该用户自己的记录（普通用户接口）；userId == 0 表示管理员查询。
func GetRequestMessagesByRequestIds(requestIds []string, userId int) ([]*RequestMessage, error) {
	if len(requestIds) == 0 {
		return []*RequestMessage{}, nil
	}
	tx := DB.Where("request_id IN ?", requestIds)
	if userId > 0 {
		tx = tx.Where("user_id = ?", userId)
	}
	var messages []*RequestMessage
	err := tx.Find(&messages).Error
	return messages, err
}
