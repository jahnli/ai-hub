package model

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

// retiredUserColumns contains columns removed by local product decisions:
// invitation fields (#019), the legacy name field (#025), and retired OAuth
// provider bindings (#029). They must not remain part of wallet schema checks.
var retiredUserColumns = []string{
	"name",
	"aff_code",
	"aff_count",
	"aff_quota",
	"aff_history",
	"inviter_id",
	"github_id",
	"discord_id",
	"telegram_id",
	"linux_do_id",
}

// retiredUserColumnSchema gives GORM stable field-to-column mappings after
// the fields have been removed from User itself.
type retiredUserColumnSchema struct {
	Name       string `gorm:"column:name"`
	AffCode    string `gorm:"column:aff_code"`
	AffCount   int    `gorm:"column:aff_count"`
	AffQuota   int    `gorm:"column:aff_quota"`
	AffHistory int    `gorm:"column:aff_history"`
	InviterID  int    `gorm:"column:inviter_id"`
	GitHubID   string `gorm:"column:github_id"`
	DiscordID  string `gorm:"column:discord_id"`
	TelegramID string `gorm:"column:telegram_id"`
	LinuxDOID  string `gorm:"column:linux_do_id"`
}

func (retiredUserColumnSchema) TableName() string {
	return "users"
}

// migrateRetiredUserColumns removes server-database columns that no longer
// have any application owner. SQLite is intentionally skipped: its GORM
// migrator rebuilds the table for every dropped column and does not recreate
// standalone indexes, so deleting inert legacy columns there would risk
// damaging current user indexes. MySQL and PostgreSQL can drop the columns and
// their dependent indexes directly.
func migrateRetiredUserColumns(db *gorm.DB, dbType common.DatabaseType) error {
	if db == nil {
		return fmt.Errorf("migrate retired user columns: database is nil")
	}
	if dbType != common.DatabaseTypeMySQL && dbType != common.DatabaseTypePostgreSQL {
		return nil
	}

	migrator := db.Migrator()
	legacySchema := &retiredUserColumnSchema{}
	if !migrator.HasTable(legacySchema) {
		return nil
	}

	for _, column := range retiredUserColumns {
		if !migrator.HasColumn(legacySchema, column) {
			continue
		}
		if err := migrator.DropColumn(legacySchema, column); err != nil {
			return fmt.Errorf("drop retired users column %q: %w", column, err)
		}
	}
	return nil
}
