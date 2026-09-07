package router

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestModelSquareRoutesRequireRoot(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	require.NoError(t, db.AutoMigrate(&model.User{}))
	previousDB, previousRedis := model.DB, common.RedisEnabled
	model.DB, common.RedisEnabled = db, false
	common.OptionMapRWMutex.Lock()
	previousOptions := common.OptionMap
	common.OptionMap = map[string]string{setting.ModelSquareConfigKey: "broken"}
	common.OptionMapRWMutex.Unlock()
	t.Cleanup(func() {
		model.DB, common.RedisEnabled = previousDB, previousRedis
		common.OptionMapRWMutex.Lock()
		common.OptionMap = previousOptions
		common.OptionMapRWMutex.Unlock()
	})
	engine := gin.New()
	SetApiRouter(engine)
	for _, role := range []int{0, common.RoleCommonUser, common.RoleAdminUser, common.RoleRootUser} {
		t.Run(fmt.Sprint(role), func(t *testing.T) {
			token := ""
			if role != 0 {
				token = fmt.Sprintf("model-square-role-%d", role)
				user := model.User{Username: token, Password: "unused", Role: role, Status: common.UserStatusEnabled, Group: "default", AuthVersion: 1}
				user.SetAccessToken(token)
				require.NoError(t, db.Create(&user).Error)
			}
			for _, method := range []string{http.MethodGet, http.MethodPut} {
				request := httptest.NewRequest(method, "/api/model-square/config", strings.NewReader("null"))
				if token != "" {
					request.Header.Set("Authorization", "Bearer "+token)
				}
				recorder := httptest.NewRecorder()
				engine.ServeHTTP(recorder, request)
				assert.Equal(t, "no-store", recorder.Header().Get("Cache-Control"))
				switch role {
				case 0:
					assert.Equal(t, http.StatusUnauthorized, recorder.Code)
				case common.RoleRootUser:
					// Root reaches the real handlers: corrupt stored JSON / null body.
					if method == http.MethodGet {
						assert.Equal(t, http.StatusInternalServerError, recorder.Code)
					} else {
						assert.Equal(t, http.StatusBadRequest, recorder.Code)
					}
				default:
					assert.Equal(t, http.StatusForbidden, recorder.Code)
				}
			}
		})
	}
}
