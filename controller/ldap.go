package controller

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// LDAPLoginRequest 是 LDAP 登录请求体。
type LDAPLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LDAPBindRequest 是已登录用户绑定 LDAP 账号的请求体。
type LDAPBindRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LDAPLogin 处理 LDAP 登录：认证通过后查找或创建用户，并建立登录态。
func LDAPLogin(c *gin.Context) {
	if !system_setting.GetLDAPSettings().Enabled {
		common.ApiErrorI18n(c, i18n.MsgLDAPNotEnabled)
		return
	}

	var req LDAPLoginRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if req.Username == "" || req.Password == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	ldapUser, err := service.AuthenticateLDAP(req.Username, req.Password)
	if err != nil {
		common.SysError("LDAP 认证失败: " + err.Error())
		common.ApiErrorI18n(c, i18n.MsgLDAPAuthFailed)
		return
	}

	user, err := findOrCreateLDAPUser(c, ldapUser)
	if err != nil {
		switch err.(type) {
		case *LDAPRegistrationDisabledError:
			common.ApiErrorI18n(c, i18n.MsgUserRegisterDisabled)
		case *LDAPUserDeletedError:
			common.ApiErrorI18n(c, i18n.MsgLDAPUserDeleted)
		default:
			common.ApiErrorMsg(c, err.Error())
		}
		return
	}

	if user.Status != common.UserStatusEnabled {
		common.ApiErrorI18n(c, i18n.MsgLDAPUserBanned)
		return
	}

	setupLogin(user, c)
}

// findOrCreateLDAPUser 以 username 唯一关联用户：若用户名已存在则返回已有用户，
// 否则在注册开启时创建新用户，并在创建成功后异步触发飞书字段同步。
func findOrCreateLDAPUser(c *gin.Context, ldapUser *service.LDAPUserInfo) (*model.User, error) {
	user := &model.User{}

	// 以 username 查找已有用户（含软删除，避免账号被删后被同名顶替）
	username := ldapUser.Username
	if username == "" {
		return nil, fmt.Errorf("ldap username is empty")
	}

	existing := &model.User{}
	err := model.DB.Unscoped().Where("username = ?", username).First(existing).Error
	if err == nil {
		// 找到用户
		if existing.DeletedAt.Valid {
			return nil, &LDAPUserDeletedError{}
		}
		company := model.NormalizeCompany(ldapUser.Company)
		if company != "" && existing.Company != company {
			if err := model.DB.Model(&model.User{}).Where("id = ?", existing.Id).Update("company", company).Error; err != nil {
				return nil, err
			}
			existing.Company = company
		}
		return existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// 不存在则创建
	if !common.RegisterEnabled {
		return nil, &LDAPRegistrationDisabledError{}
	}

	user.Username = username
	if len(user.Username) > model.UserNameMaxLength {
		user.Username = user.Username[:model.UserNameMaxLength]
	}

	if ldapUser.DisplayName != "" {
		user.DisplayName = ldapUser.DisplayName
	} else {
		user.DisplayName = user.Username
	}
	user.Company = model.NormalizeCompany(ldapUser.Company)
	if ldapUser.Email != "" {
		user.Email = ldapUser.Email
	} else if cfg, ok := system_setting.GetLDAPCompanySyncConfig(user.Company); ok && cfg.FeishuEmailSuffix != "" {
		user.Email = user.Username + cfg.FeishuEmailSuffix
	} else {
		user.Email = user.Username + system_setting.FeishuEmailSuffix()
	}
	user.Role = common.RoleCommonUser
	user.Status = common.UserStatusEnabled

	if err := user.Insert(0); err != nil {
		return nil, err
	}

	autoSubscribeUserAfterCreate(user.Id, user.Company, "ldap_register_auto")

	// 注册成功后同步飞书字段（avatar_url/open_id/display_name/departments/job_number 等）
	// 使用同步调用确保登录响应中包含飞书头像等信息，失败仅记日志不影响注册。
	if err := service.SyncFeishuUser(user); err != nil {
		common.SysError(fmt.Sprintf("飞书字段同步失败 user=%s: %s", user.Username, err.Error()))
	}

	return user, nil
}

// LDAPBind 供已登录用户绑定 LDAP 账号。
func LDAPBind(c *gin.Context) {
	if !system_setting.GetLDAPSettings().Enabled {
		common.ApiErrorI18n(c, i18n.MsgLDAPNotEnabled)
		return
	}

	session := sessions.Default(c)
	id := session.Get("id")
	if id == nil {
		common.ApiErrorI18n(c, i18n.MsgLDAPNotEnabled)
		return
	}
	user := model.User{Id: id.(int)}
	if err := user.FillUserById(); err != nil || user.Id == 0 {
		common.ApiErrorMsg(c, "user not found")
		return
	}

	var req LDAPBindRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}
	if req.Username == "" || req.Password == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	ldapUser, err := service.AuthenticateLDAP(req.Username, req.Password)
	if err != nil {
		common.SysError("LDAP 绑定认证失败: " + err.Error())
		common.ApiErrorI18n(c, i18n.MsgLDAPAuthFailed)
		return
	}

	// 以 username 唯一关联：若 LDAP 用户名已被其他账号占用则拒绝
	if ldapUser.Username != "" && ldapUser.Username != user.Username {
		var other model.User
		err := model.DB.Unscoped().Where("username = ?", ldapUser.Username).First(&other).Error
		if err == nil && other.Id != user.Id {
			common.ApiErrorI18n(c, i18n.MsgLDAPBindConflict)
			return
		}
		// 将当前用户的 username 改为 LDAP 用户名，使其与 LDAP 账号关联
		user.Username = ldapUser.Username
	}

	if ldapUser.DisplayName != "" {
		user.DisplayName = ldapUser.DisplayName
	}
	if ldapUser.Company != "" {
		user.Company = model.NormalizeCompany(ldapUser.Company)
	}

	if err := user.Edit(false); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	// 绑定时也尝试同步一次飞书字段
	service.SyncFeishuUserAsync(&user)

	common.ApiSuccess(c, nil)
}

// TestLDAPConnection 供管理员测试 LDAP 连通性。
func TestLDAPConnection(c *gin.Context) {
	if err := service.TestLDAPConnection(); err != nil {
		common.SysError("LDAP 连接测试失败: " + err.Error())
		common.ApiErrorI18n(c, i18n.MsgLDAPTestFailed)
		return
	}
	common.ApiSuccessI18n(c, i18n.MsgLDAPTestSuccess, nil)
}

// LDAPRegistrationDisabledError 表示注册未开启时尝试通过 LDAP 创建新用户。
type LDAPRegistrationDisabledError struct{}

func (e *LDAPRegistrationDisabledError) Error() string {
	return "ldap registration is disabled"
}

// LDAPUserDeletedError 表示匹配到的 LDAP 用户已被软删除。
type LDAPUserDeletedError struct{}

func (e *LDAPUserDeletedError) Error() string {
	return "ldap user has been deleted"
}
