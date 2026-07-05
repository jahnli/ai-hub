package common

import "github.com/gin-gonic/gin"

// DetectClientApp returns the raw User-Agent header sent by the client.
// The value is intentionally not mapped to a normalized app name because users
// need to inspect the actual request identity reported by client tooling.
func DetectClientApp(c *gin.Context) string {
	if c == nil || c.Request == nil {
		return ""
	}
	return c.Request.UserAgent()
}
