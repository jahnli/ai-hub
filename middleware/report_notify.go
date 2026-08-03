package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	reportNotifySigningSecretEnv = "REPORT_NOTIFY_SIGNING_SECRET"
	reportNotifyTimestampHeader  = "X-Report-Timestamp"
	reportNotifySignatureHeader  = "X-Report-Signature"
	reportNotifySignatureMaxAge  = 5 * time.Minute
	reportNotifyMaxBodySize      = 1 << 20
)

// ReportNotifySignatureAuth verifies an HMAC-SHA256 signature over the method,
// path, timestamp and request-body hash. The shared secret is never transmitted.
func ReportNotifySignatureAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		secret := strings.TrimSpace(os.Getenv(reportNotifySigningSecretEnv))
		if len([]byte(secret)) < 32 {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"success": false,
				"message": "report notify signing secret must be at least 32 bytes",
			})
			return
		}

		timestampText := strings.TrimSpace(c.GetHeader(reportNotifyTimestampHeader))
		timestamp, err := strconv.ParseInt(timestampText, 10, 64)
		now := time.Now().Unix()
		maxAgeSeconds := int64(reportNotifySignatureMaxAge / time.Second)
		if err != nil || timestamp < now-maxAgeSeconds || timestamp > now+maxAgeSeconds {
			abortReportNotifyUnauthorized(c)
			return
		}

		body, err := io.ReadAll(io.LimitReader(c.Request.Body, reportNotifyMaxBodySize+1))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request body"})
			return
		}
		if len(body) > reportNotifyMaxBodySize {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{"success": false, "message": "request body too large"})
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewReader(body))

		providedSignature, err := hex.DecodeString(strings.TrimSpace(c.GetHeader(reportNotifySignatureHeader)))
		if err != nil {
			abortReportNotifyUnauthorized(c)
			return
		}
		expectedSignature := reportNotifySignature(
			[]byte(secret),
			c.Request.Method,
			c.Request.URL.Path,
			timestampText,
			body,
		)
		if !hmac.Equal(providedSignature, expectedSignature) {
			abortReportNotifyUnauthorized(c)
			return
		}

		c.Next()
	}
}

func reportNotifySignature(secret []byte, method, path, timestamp string, body []byte) []byte {
	bodyHash := sha256.Sum256(body)
	canonical := fmt.Sprintf("%s\n%s\n%s\n%s", method, path, timestamp, hex.EncodeToString(bodyHash[:]))
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(canonical))
	return mac.Sum(nil)
}

func abortReportNotifyUnauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"success": false,
		"message": "unauthorized",
	})
}
