package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type violationNoticeCard struct {
	Header struct {
		Template string `json:"template"`
		Title    struct {
			Content string `json:"content"`
		} `json:"title"`
	} `json:"header"`
	Elements []struct {
		Tag     string `json:"tag"`
		Content string `json:"content"`
		Fields  []struct {
			Text struct {
				Content string `json:"content"`
			} `json:"text"`
		} `json:"fields"`
		Text struct {
			Content string `json:"content"`
		} `json:"text"`
	} `json:"elements"`
}

func TestBuildOffHoursViolationNoticeCardIncludesAuditWindowAndCount(t *testing.T) {
	cardJSON, err := BuildOffHoursViolationNoticeCard(
		"2026-08-05 01:15:00 - 2026-08-05 04:20:00",
		37,
	)
	require.NoError(t, err)

	var card violationNoticeCard
	require.NoError(t, common.Unmarshal([]byte(cardJSON), &card))
	require.Len(t, card.Elements, 3)
	require.Len(t, card.Elements[1].Fields, 2)

	assert.Equal(t, "red", card.Header.Template)
	assert.Equal(t, "安全审计提醒", card.Header.Title.Content)
	assert.Equal(t, "系统监测到您在非工作时间内较频繁地使用了中转站服务，请确认相关请求，并合理调整使用时间", card.Elements[0].Content)
	assert.Equal(t, "**请求时间**\n2026-08-05 01:15:00 - 2026-08-05 04:20:00", card.Elements[1].Fields[0].Text.Content)
	assert.Equal(t, "**请求次数**\n37", card.Elements[1].Fields[1].Text.Content)
	assert.Equal(t, "如上述请求属于正常业务使用，忽略即可；如非本人或非预期操作，请及时检查相关账号、密钥及调用配置", card.Elements[2].Content)
}

func TestBuildViolationNoticeCardKeepsRequestDetails(t *testing.T) {
	cardJSON, err := BuildViolationNoticeCard("2026-08-05 09:30:00", "req-123", "gpt-test")
	require.NoError(t, err)

	var card violationNoticeCard
	require.NoError(t, common.Unmarshal([]byte(cardJSON), &card))
	require.Len(t, card.Elements, 4)
	require.Len(t, card.Elements[1].Fields, 2)

	assert.Equal(t, "**请求时间**\n2026-08-05 09:30:00", card.Elements[1].Fields[0].Text.Content)
	assert.Equal(t, "**模型**\ngpt-test", card.Elements[1].Fields[1].Text.Content)
	assert.Equal(t, "**Request ID**\nreq-123", card.Elements[2].Text.Content)
}
