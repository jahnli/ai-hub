package model

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func openUserMigrationTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	return db
}

func TestUserWalletColumnsUseBigintSchema(t *testing.T) {
	db := openUserMigrationTestDB(t)
	require.NoError(t, db.AutoMigrate(&User{}))
	const quotaAboveInt32 = 3_000_000_000
	require.NoError(t, db.Create(&User{
		Username:  "bigint-wallet",
		Password:  "hashed-password",
		Quota:     quotaAboveInt32,
		UsedQuota: quotaAboveInt32 - 1,
	}).Error)
	require.NoError(t, db.AutoMigrate(&User{}))

	columnTypes, err := db.Migrator().ColumnTypes(&User{})
	require.NoError(t, err)
	databaseTypes := make(map[string]string, len(columnTypes))
	for _, columnType := range columnTypes {
		databaseTypes[columnType.Name()] = columnType.DatabaseTypeName()
	}

	assert.True(t, strings.EqualFold(databaseTypes["quota"], "bigint"))
	assert.True(t, strings.EqualFold(databaseTypes["used_quota"], "bigint"))
	assert.ElementsMatch(t, []string{"quota", "used_quota"}, userQuotaColumns)
	var user User
	require.NoError(t, db.Where("username = ?", "bigint-wallet").First(&user).Error)
	assert.Equal(t, quotaAboveInt32, user.Quota)
	assert.Equal(t, quotaAboveInt32-1, user.UsedQuota)
}

func TestRetiredUserColumnsMigrationRemovesServerColumnsIdempotently(t *testing.T) {
	t.Setenv("SKIP_64BIT_QUOTA_SCHEMA_CHECK", "false")
	db := openUserMigrationTestDB(t)
	require.NoError(t, db.Exec(`
CREATE TABLE users (
    `+"`id`"+` integer PRIMARY KEY,
    `+"`name`"+` text,
    `+"`aff_code`"+` text,
    `+"`aff_count`"+` integer,
    `+"`aff_quota`"+` integer,
    `+"`aff_history`"+` integer,
    `+"`inviter_id`"+` integer,
    `+"`github_id`"+` text,
    `+"`discord_id`"+` text,
    `+"`telegram_id`"+` text,
    `+"`linux_do_id`"+` text,
    `+"`username`"+` text,
    `+"`quota`"+` bigint DEFAULT 0,
    `+"`used_quota`"+` bigint DEFAULT 0
)`).Error)
	require.NoError(t, db.Exec(`
INSERT INTO users (id, name, username, quota, used_quota)
VALUES (1, 'Legacy Name', 'retained-user', 123, 45)`).Error)

	// The SQLite test database exercises the dialect-neutral migration loop;
	// production invocation is restricted to MySQL and PostgreSQL.
	legacySchema := &retiredUserColumnSchema{}
	for _, column := range retiredUserColumns {
		require.True(t, db.Migrator().HasColumn(legacySchema, column), column)
	}
	require.NoError(t, ensureUserQuotaColumns(db, common.DatabaseTypeMySQL))
	require.NoError(t, migrateRetiredUserColumns(db, common.DatabaseTypeMySQL))
	require.NoError(t, migrateRetiredUserColumns(db, common.DatabaseTypeMySQL))

	for _, column := range retiredUserColumns {
		assert.False(t, db.Migrator().HasColumn(legacySchema, column), column)
	}
	var retained struct {
		Username  string
		Quota     int
		UsedQuota int `gorm:"column:used_quota"`
	}
	require.NoError(t, db.Table("users").Where("id = ?", 1).Take(&retained).Error)
	assert.Equal(t, "retained-user", retained.Username)
	assert.Equal(t, 123, retained.Quota)
	assert.Equal(t, 45, retained.UsedQuota)
}

func TestEnsureUserQuotaColumnsRejectsCoreInt(t *testing.T) {
	t.Setenv("SKIP_64BIT_QUOTA_SCHEMA_CHECK", "false")
	db := openUserMigrationTestDB(t)
	require.NoError(t, db.Exec(`CREATE TABLE users (
        id integer PRIMARY KEY,
        quota integer DEFAULT 0,
        used_quota integer DEFAULT 0
    )`).Error)

	err := ensureUserQuotaColumns(db, common.DatabaseTypeMySQL)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "users.quota uses integer")
}

func TestRetiredUserColumnsMigrationSkipsSQLite(t *testing.T) {
	db := openUserMigrationTestDB(t)
	require.NoError(t, db.Exec(`CREATE TABLE users (id integer PRIMARY KEY, aff_code text)`).Error)

	require.NoError(t, migrateRetiredUserColumns(db, common.DatabaseTypeSQLite))
	assert.True(t, db.Migrator().HasColumn(&retiredUserColumnSchema{}, "aff_code"))
}

func TestIs64BitIntegerType(t *testing.T) {
	tests := []struct {
		name     string
		dbType   common.DatabaseType
		dataType string
		want     bool
	}{
		{name: "mysql bigint", dbType: common.DatabaseTypeMySQL, dataType: "BIGINT", want: true},
		{name: "mysql int", dbType: common.DatabaseTypeMySQL, dataType: "INT", want: false},
		{name: "postgres bigint", dbType: common.DatabaseTypePostgreSQL, dataType: "bigint", want: true},
		{name: "postgres int8", dbType: common.DatabaseTypePostgreSQL, dataType: "int8", want: true},
		{name: "postgres integer", dbType: common.DatabaseTypePostgreSQL, dataType: "integer", want: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			assert.Equal(t, test.want, is64BitIntegerType(test.dbType, test.dataType))
		})
	}
}
