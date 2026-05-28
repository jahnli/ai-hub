package controller

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LDAPLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func LDAPLogin(c *gin.Context) {
	settings := system_setting.GetLDAPSettings()
	if !settings.Enabled {
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
		common.ApiErrorI18n(c, i18n.MsgLDAPAuthFailed)
		return
	}

	user, err := findOrCreateLDAPUser(c, ldapUser)
	if err != nil {
		switch err.(type) {
		case *LDAPRegistrationDisabledError:
			common.ApiErrorI18n(c, i18n.MsgUserRegisterDisabled)
		default:
			common.ApiError(c, err)
		}
		return
	}

	if user.Status != common.UserStatusEnabled {
		common.ApiErrorI18n(c, i18n.MsgOAuthUserBanned)
		return
	}

	setupLogin(user, c)
}

func findOrCreateLDAPUser(c *gin.Context, ldapUser *service.LDAPUserInfo) (*model.User, error) {
	user := &model.User{}

	ldapId := strings.TrimSpace(ldapUser.DN)
	if ldapId == "" {
		return nil, fmt.Errorf("LDAP DN is empty")
	}
	ldapUsername := strings.TrimSpace(ldapUser.Username)

	if model.IsLdapIdAlreadyTaken(ldapId) {
		user.LdapId = ldapId
		if err := user.FillUserByLdapId(); err != nil {
			return nil, err
		}
		if user.Id == 0 {
			return nil, fmt.Errorf("user has been deleted")
		}
		return user, nil
	}

	if ldapUsername != "" {
		if err := model.DB.Unscoped().Where("username = ?", ldapUsername).First(user).Error; err == nil {
			if user.DeletedAt.Valid {
				return nil, fmt.Errorf("user has been deleted")
			}
			if user.LdapId != ldapId {
				if err := model.DB.Model(user).Update("ldap_id", ldapId).Error; err != nil {
					return nil, err
				}
				user.LdapId = ldapId
			}
			return user, nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	if !common.RegisterEnabled {
		return nil, &LDAPRegistrationDisabledError{}
	}

	if ldapUsername == "" {
		return nil, fmt.Errorf("LDAP username is empty")
	}
	if len(ldapUsername) > model.UserNameMaxLength {
		return nil, fmt.Errorf("LDAP username exceeds max length %d", model.UserNameMaxLength)
	}
	user.Username = ldapUsername
	user.LdapId = ldapId

	if ldapUser.DisplayName != "" {
		user.DisplayName = ldapUser.DisplayName
	} else if ldapUser.Username != "" {
		user.DisplayName = ldapUser.Username
	} else {
		user.DisplayName = "LDAP User"
	}
	if ldapUser.Email != "" {
		user.Email = ldapUser.Email
	}
	user.Role = common.RoleCommonUser
	user.Status = common.UserStatusEnabled

	session := sessions.Default(c)
	affCode := session.Get("aff")
	inviterId := 0
	if affCode != nil {
		inviterId, _ = model.GetUserIdByAffCode(affCode.(string))
	}

	err := model.DB.Transaction(func(tx *gorm.DB) error {
		if err := user.InsertWithTx(tx, inviterId); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	user.FinalizeOAuthUserCreation(inviterId)

	ldapSettings := system_setting.GetLDAPSettings()
	planId := ldapSettings.AutoSubscribePlanId
	common.SysLog(fmt.Sprintf("[LDAP DEBUG] new user %d created, AutoSubscribePlanId=%d", user.Id, planId))
	if planId > 0 {
		msg, bindErr := model.AdminBindSubscription(user.Id, planId, "ldap_auto")
		if bindErr != nil {
			common.SysError(fmt.Sprintf("[LDAP DEBUG] auto-subscribe FAILED for user %d plan %d: %v", user.Id, planId, bindErr))
		} else {
			common.SysLog(fmt.Sprintf("[LDAP DEBUG] auto-subscribe OK for user %d plan %d, msg=%s", user.Id, planId, msg))
		}
	} else {
		common.SysLog("[LDAP DEBUG] AutoSubscribePlanId is 0, skipping auto-subscribe")
	}

	return user, nil
}

type LDAPRegistrationDisabledError struct{}

func (e *LDAPRegistrationDisabledError) Error() string {
	return "registration is disabled"
}

func LDAPBind(c *gin.Context) {
	settings := system_setting.GetLDAPSettings()
	if !settings.Enabled {
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
		common.ApiErrorI18n(c, i18n.MsgLDAPAuthFailed)
		return
	}

	ldapId := strings.TrimSpace(ldapUser.DN)
	if ldapId == "" {
		common.ApiError(c, fmt.Errorf("LDAP DN is empty"))
		return
	}
	ldapUsername := strings.TrimSpace(ldapUser.Username)

	if model.IsLdapIdAlreadyTaken(ldapId) {
		common.ApiErrorI18n(c, i18n.MsgLDAPAlreadyBound)
		return
	}

	session := sessions.Default(c)
	id := session.Get("id")
	if id == nil {
		common.ApiErrorI18n(c, i18n.MsgAuthNotLoggedIn)
		return
	}

	user := model.User{Id: id.(int)}
	if err := user.FillUserById(); err != nil {
		common.ApiError(c, err)
		return
	}

	var usernameOwner model.User
	if ldapUsername != "" {
		if err := model.DB.Unscoped().Where("username = ?", ldapUsername).First(&usernameOwner).Error; err == nil && usernameOwner.Id != user.Id {
			common.ApiErrorI18n(c, i18n.MsgLDAPAlreadyBound)
			return
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiError(c, err)
			return
		}
	}

	user.LdapId = ldapId
	if err := user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccessI18n(c, i18n.MsgLDAPBindSuccess, gin.H{
		"action": "bind",
	})
}

func TestLDAPConnection(c *gin.Context) {
	if err := service.TestLDAPConnection(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "LDAP connection successful",
	})
}
