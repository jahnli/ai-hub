package service

import (
	"testing"

	ldapv3 "github.com/go-ldap/ldap/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetLDAPUsernameNormalizesToLowercase(t *testing.T) {
	entry := ldapv3.NewEntry("uid=TestUser,ou=Users,dc=example,dc=com", map[string][]string{
		"sAMAccountName": {"  Test.User  "},
	})

	username, err := getLDAPUsername(entry, "samaccountname")

	require.NoError(t, err)
	assert.Equal(t, "test.user", username)
}
