package relay

import (
	"context"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/relaykit/dto"

	"github.com/gin-gonic/gin"
)

// ImageAutoRecordInput carries every field extracted from a successful relay
// image response that the image studio history recorder needs to persist a
// generation. It intentionally mirrors the payload the Image Studio frontend
// posts to StoreImageStudioImages, so both paths converge on the same record
// shape.
type ImageAutoRecordInput struct {
	UserID       int
	ChannelId    int
	Group        string
	ModelName    string
	Prompt       string
	Mode         string // "generate" | "edit"
	Size         string
	Quality      string
	Moderation   string
	OutputFormat string
	N            int
	DurationMs   int64
	UserAgent    string // 发起请求的原始 User-Agent，空串表示请求未携带
	Images       []dto.ImageAutoRecordSource
}

// ImageAutoRecordFunc records a relay-generated image set into the image studio
// history. Implementations are registered by the controller package at startup
// to avoid a relay → controller import cycle.
type ImageAutoRecordFunc func(ctx context.Context, input ImageAutoRecordInput)

// registeredImageAutoRecorder holds the recorder registered by the controller
// package. It is read on the hot path, so an atomic pointer keeps the lookup
// lock-free.
var registeredImageAutoRecorder atomic.Pointer[ImageAutoRecordFunc]

// RegisterImageAutoRecordHook stores the recorder implementation. Passing nil
// clears it. Called from controller.init().
func RegisterImageAutoRecordHook(fn ImageAutoRecordFunc) {
	if fn == nil {
		registeredImageAutoRecorder.Store(nil)
		return
	}
	registeredImageAutoRecorder.Store(&fn)
}

// scheduleImageAutoRecord fires the registered recorder in a detached goroutine
// when the image sources captured during response handling are available. It is
// a no-op when no recorder is registered or the request produced no image
// sources (e.g. auto-recording disabled, playground request, or empty result).
func scheduleImageAutoRecord(c *gin.Context, info *relaycommon.RelayInfo, request *dto.ImageRequest) {
	recorderPtr := registeredImageAutoRecorder.Load()
	if recorderPtr == nil || info == nil || request == nil {
		return
	}

	rawSources, ok := c.Get(string(constant.ContextKeyRelayImageResponseData))
	if !ok {
		return
	}
	imageSources, ok := rawSources.([]dto.ImageAutoRecordSource)
	if !ok || len(imageSources) == 0 {
		return
	}

	imageN := 1
	if request.N != nil && *request.N > 0 {
		imageN = int(*request.N)
	}

	mode := "generate"
	if info.RelayMode == relayconstant.RelayModeImagesEdits {
		mode = "edit"
	}

	modelName := info.OriginModelName
	if modelName == "" {
		modelName = request.Model
	}

	group := info.UsingGroup
	if group == "" {
		group = info.UserGroup
	}

	durationMs := int64(0)
	if !info.StartTime.IsZero() {
		durationMs = time.Since(info.StartTime).Milliseconds()
	}

	input := ImageAutoRecordInput{
		UserID:       info.UserId,
		ChannelId:    info.ChannelId,
		Group:        group,
		ModelName:    modelName,
		Prompt:       request.Prompt,
		Mode:         mode,
		Size:         request.Size,
		Quality:      request.Quality,
		Moderation:   rawMessageToString(request.Moderation),
		OutputFormat: rawMessageToString(request.OutputFormat),
		N:            imageN,
		DurationMs:   durationMs,
		UserAgent:    info.ClientApp,
		Images:       imageSources,
	}

	recorder := *recorderPtr
	// Detach from the request context: the goroutine downloads and stores images
	// after the HTTP response is sent and the gin context is recycled.
	go recorder(context.Background(), input)
}

// rawMessageToString decodes a JSON raw string value (e.g. "auto") into a plain
// Go string, returning "" for null/empty/non-string payloads.
func rawMessageToString(raw []byte) string {
	if len(raw) == 0 {
		return ""
	}
	var value string
	if err := common.Unmarshal(raw, &value); err != nil {
		return ""
	}
	return value
}
