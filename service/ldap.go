package service

import (
	"crypto/tls"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/setting/system_setting"
	ldapv3 "github.com/go-ldap/ldap/v3"
)

type LDAPUserInfo struct {
	DN          string
	Username    string
	Email       string
	DisplayName string
}

func dialLDAP(settings *system_setting.LDAPSettings) (*ldapv3.Conn, error) {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: settings.SkipTLSVerify,
	}

	var conn *ldapv3.Conn
	var err error

	if strings.HasPrefix(settings.ServerURL, "ldaps://") {
		conn, err = ldapv3.DialURL(settings.ServerURL, ldapv3.DialWithTLSConfig(tlsConfig))
	} else {
		conn, err = ldapv3.DialURL(settings.ServerURL)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to connect to LDAP server: %w", err)
	}

	conn.SetTimeout(10 * time.Second)

	if settings.StartTLS && !strings.HasPrefix(settings.ServerURL, "ldaps://") {
		if err := conn.StartTLS(tlsConfig); err != nil {
			conn.Close()
			return nil, fmt.Errorf("failed to start TLS: %w", err)
		}
	}

	return conn, nil
}

func buildSearchFilter(template, username string) string {
	return strings.ReplaceAll(template, "{{username}}", ldapv3.EscapeFilter(username))
}

func AuthenticateLDAP(username, password string) (*LDAPUserInfo, error) {
	settings := system_setting.GetLDAPSettings()
	if !settings.Enabled {
		return nil, fmt.Errorf("LDAP is not enabled")
	}

	if username == "" || password == "" {
		return nil, fmt.Errorf("username and password are required")
	}

	conn, err := dialLDAP(settings)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	// Bind with service account to search for the user
	if err := conn.Bind(settings.BindDN, settings.BindPassword); err != nil {
		return nil, fmt.Errorf("service account bind failed: %w", err)
	}

	filter := buildSearchFilter(settings.SearchFilter, username)
	attrs := []string{"dn"}
	if settings.UsernameAttribute != "" {
		attrs = append(attrs, settings.UsernameAttribute)
	}
	if settings.EmailAttribute != "" {
		attrs = append(attrs, settings.EmailAttribute)
	}
	if settings.DisplayNameAttribute != "" {
		attrs = append(attrs, settings.DisplayNameAttribute)
	}

	searchReq := ldapv3.NewSearchRequest(
		settings.SearchBase,
		ldapv3.ScopeWholeSubtree,
		ldapv3.NeverDerefAliases,
		1, // SizeLimit: only need one result
		10,
		false,
		filter,
		attrs,
		nil,
	)

	sr, err := conn.Search(searchReq)
	if err != nil {
		return nil, fmt.Errorf("LDAP search failed: %w", err)
	}

	if len(sr.Entries) == 0 {
		return nil, fmt.Errorf("user not found in LDAP")
	}

	entry := sr.Entries[0]

	// Authenticate by binding with the user's DN and password
	if err := conn.Bind(entry.DN, password); err != nil {
		return nil, fmt.Errorf("LDAP authentication failed")
	}

	info := &LDAPUserInfo{
		DN: entry.DN,
	}

	if settings.UsernameAttribute != "" {
		info.Username = entry.GetAttributeValue(settings.UsernameAttribute)
	}
	if settings.EmailAttribute != "" {
		info.Email = entry.GetAttributeValue(settings.EmailAttribute)
	}
	if settings.DisplayNameAttribute != "" {
		info.DisplayName = entry.GetAttributeValue(settings.DisplayNameAttribute)
	}

	if info.Username == "" {
		info.Username = username
	}

	return info, nil
}

func TestLDAPConnection() error {
	settings := system_setting.GetLDAPSettings()

	if settings.ServerURL == "" {
		return fmt.Errorf("LDAP server URL is not configured")
	}

	conn, err := dialLDAP(settings)
	if err != nil {
		return err
	}
	defer conn.Close()

	if settings.BindDN != "" {
		if err := conn.Bind(settings.BindDN, settings.BindPassword); err != nil {
			return fmt.Errorf("bind failed: %w", err)
		}
	}

	if settings.SearchBase != "" {
		searchReq := ldapv3.NewSearchRequest(
			settings.SearchBase,
			ldapv3.ScopeBaseObject,
			ldapv3.NeverDerefAliases,
			1,
			5,
			false,
			"(objectClass=*)",
			[]string{"dn"},
			nil,
		)
		_, err = conn.Search(searchReq)
		if err != nil {
			return fmt.Errorf("search base test failed: %w", err)
		}
	}

	return nil
}
