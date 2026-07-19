package model

import (
	"fmt"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateOffHoursWindows(t *testing.T) {
	loc := time.FixedZone("CST", 8*3600)
	dayAt := func(day int, hour, minute, sec int) time.Time {
		return time.Date(2026, 7, day, hour, minute, sec, 0, loc)
	}

	t.Run("regular window 3-7", func(t *testing.T) {
		windows, err := GenerateOffHoursWindows(dayAt(1, 0, 0, 0).Unix(), dayAt(3, 23, 59, 59).Unix(), 3, 7, loc)
		require.NoError(t, err)
		require.Len(t, windows, 3)
		for i, w := range windows {
			day := i + 1
			assert.Equal(t, fmt.Sprintf("2026-07-0%d", day), w.Date)
			assert.Equal(t, dayAt(day, 3, 0, 0).Unix(), w.Start)
			assert.Equal(t, dayAt(day, 3, 0, 0).Unix(), w.BucketStart)
			assert.Equal(t, dayAt(day, 7, 0, 0).Unix(), w.End)
		}
	})

	t.Run("overnight window 22-6 attributes to start day", func(t *testing.T) {
		windows, err := GenerateOffHoursWindows(dayAt(1, 0, 0, 0).Unix(), dayAt(2, 23, 59, 59).Unix(), 22, 6, loc)
		require.NoError(t, err)
		require.Len(t, windows, 3)

		// 前一天(06-30)窗口的尾部落入筛选范围,被裁剪保留
		assert.Equal(t, "2026-06-30", windows[0].Date)
		assert.Equal(t, dayAt(1, 0, 0, 0).Unix(), windows[0].Start)
		assert.Equal(t, time.Date(2026, 6, 30, 22, 0, 0, 0, loc).Unix(), windows[0].BucketStart)
		assert.Equal(t, dayAt(1, 6, 0, 0).Unix(), windows[0].End)

		assert.Equal(t, "2026-07-01", windows[1].Date)
		assert.Equal(t, dayAt(1, 22, 0, 0).Unix(), windows[1].Start)
		assert.Equal(t, dayAt(2, 6, 0, 0).Unix(), windows[1].End)

		// 末日窗口右侧被筛选范围截断
		assert.Equal(t, "2026-07-02", windows[2].Date)
		assert.Equal(t, dayAt(2, 22, 0, 0).Unix(), windows[2].Start)
		assert.Equal(t, dayAt(2, 23, 59, 59).Unix()+1, windows[2].End)
	})

	t.Run("range narrower than window clips both sides", func(t *testing.T) {
		windows, err := GenerateOffHoursWindows(dayAt(1, 5, 0, 0).Unix(), dayAt(1, 23, 0, 0).Unix(), 3, 7, loc)
		require.NoError(t, err)
		require.Len(t, windows, 1)
		assert.Equal(t, "2026-07-01", windows[0].Date)
		assert.Equal(t, dayAt(1, 5, 0, 0).Unix(), windows[0].Start)
		assert.Equal(t, dayAt(1, 3, 0, 0).Unix(), windows[0].BucketStart)
		assert.Equal(t, dayAt(1, 7, 0, 0).Unix(), windows[0].End)
	})

	t.Run("invalid arguments", func(t *testing.T) {
		start := dayAt(1, 0, 0, 0).Unix()
		end := dayAt(2, 0, 0, 0).Unix()

		_, err := GenerateOffHoursWindows(end, start, 3, 7, loc)
		assert.Error(t, err)

		_, err = GenerateOffHoursWindows(start, end, 3, 3, loc)
		assert.Error(t, err)

		_, err = GenerateOffHoursWindows(start, end, -1, 7, loc)
		assert.Error(t, err)

		_, err = GenerateOffHoursWindows(start, end, 3, 24, loc)
		assert.Error(t, err)

		_, err = GenerateOffHoursWindows(start, start+367*86400, 3, 7, loc)
		assert.Error(t, err)
	})
}

func TestOffHoursDayBucketExpr(t *testing.T) {
	defer common.SetLogDatabaseType(common.DatabaseTypeSQLite)
	cases := []struct {
		dbType common.DatabaseType
		expr   string
	}{
		{common.DatabaseTypeMySQL, "((created_at - ?) DIV 86400)"},
		{common.DatabaseTypePostgreSQL, "((created_at - ?) / 86400)"},
		{common.DatabaseTypeSQLite, "((created_at - ?) / 86400)"},
		{common.DatabaseTypeClickHouse, "intDiv(created_at - ?, 86400)"},
	}
	for _, c := range cases {
		common.SetLogDatabaseType(c.dbType)
		assert.Equal(t, c.expr, offHoursDayBucketExpr(), string(c.dbType))
	}
}

func TestGetOffHoursUsage(t *testing.T) {
	// GetOffHoursUsage 内部以 time.Local 划分天窗口,种子时间戳同样用 time.Local
	// 生成,保证断言与测试机时区无关。
	loc := time.Local
	ts := func(day, hour, minute, sec int) int64 {
		return time.Date(2026, 7, day, hour, minute, sec, 0, loc).Unix()
	}
	rangeStart := ts(1, 0, 0, 0)
	rangeEnd := ts(2, 23, 59, 59)

	users := []*User{
		{Id: 98001, Username: "audit_alice", Password: "test12345678", DisplayName: "Alice Audit"},
		{Id: 98003, Username: "audit_carol", Password: "test12345678", DisplayName: "Carol Audit"},
	}
	for _, u := range users {
		require.NoError(t, DB.Create(u).Error)
	}
	logs := []*Log{
		// alice 07-01 窗口内:两种模型、两个 IP
		{UserId: 98001, Username: "audit_alice", Type: LogTypeConsume, CreatedAt: ts(1, 3, 30, 0), ModelName: "gpt-4o", Quota: 100, Ip: "1.1.1.1"},
		{UserId: 98001, Username: "audit_alice", Type: LogTypeConsume, CreatedAt: ts(1, 4, 0, 0), ModelName: "gpt-4o", Quota: 50, Ip: "1.1.1.1"},
		{UserId: 98001, Username: "audit_alice", Type: LogTypeConsume, CreatedAt: ts(1, 5, 0, 0), ModelName: "claude-3", Quota: 200, Ip: "2.2.2.2"},
		// alice 07-02 窗口内:空 IP,右开边界前最后一秒
		{UserId: 98001, Username: "audit_alice", Type: LogTypeConsume, CreatedAt: ts(2, 6, 59, 59), ModelName: "gpt-4o", Quota: 30, Ip: ""},
		// 窗口外与非消费类型,均不应计入
		{UserId: 98001, Username: "audit_alice", Type: LogTypeConsume, CreatedAt: ts(1, 2, 59, 59), ModelName: "gpt-4o", Quota: 999, Ip: "1.1.1.1"},
		{UserId: 98001, Username: "audit_alice", Type: LogTypeConsume, CreatedAt: ts(1, 7, 0, 0), ModelName: "gpt-4o", Quota: 999, Ip: "1.1.1.1"},
		{UserId: 98001, Username: "audit_alice", Type: LogTypeTopup, CreatedAt: ts(1, 4, 30, 0), ModelName: "", Quota: 999, Ip: "1.1.1.1"},
		{UserId: 98002, Username: "audit_bob", Type: LogTypeConsume, CreatedAt: ts(1, 8, 0, 0), ModelName: "gpt-4o", Quota: 999, Ip: "4.4.4.4"},
		// carol 07-02 窗口内:单笔大额
		{UserId: 98003, Username: "audit_carol", Type: LogTypeConsume, CreatedAt: ts(2, 3, 10, 0), ModelName: "gpt-4o", Quota: 500, Ip: "3.3.3.3"},
	}
	for _, l := range logs {
		require.NoError(t, LOG_DB.Create(l).Error)
	}
	t.Cleanup(func() {
		LOG_DB.Where("user_id IN ?", []int{98001, 98002, 98003}).Delete(&Log{})
		DB.Unscoped().Where("id IN ?", []int{98001, 98003}).Delete(&User{})
	})

	t.Run("aggregates by user and day", func(t *testing.T) {
		rows, total, err := GetOffHoursUsage(rangeStart, rangeEnd, 3, 7, "", 0, 100)
		require.NoError(t, err)
		require.EqualValues(t, 2, total)
		require.Len(t, rows, 2)

		// 排序:quota 降序 → carol(500) 在 alice(380) 前
		carol, alice := rows[0], rows[1]
		require.Equal(t, 98003, carol.UserId)
		require.Equal(t, 98001, alice.UserId)

		assert.Equal(t, "Carol Audit", carol.DisplayName)
		assert.Equal(t, 1, carol.Days)
		assert.EqualValues(t, 1, carol.Count)
		assert.EqualValues(t, 500, carol.Quota)
		assert.Equal(t, []string{"gpt-4o"}, carol.Models)
		assert.Equal(t, []string{"3.3.3.3"}, carol.Ips)

		assert.Equal(t, "Alice Audit", alice.DisplayName)
		assert.Equal(t, 2, alice.Days)
		assert.EqualValues(t, 4, alice.Count)
		assert.EqualValues(t, 380, alice.Quota)
		assert.Equal(t, []string{"claude-3", "gpt-4o"}, alice.Models)
		assert.Equal(t, []string{"1.1.1.1", "2.2.2.2"}, alice.Ips)

		// 子行按天倒序
		require.Len(t, alice.DayRows, 2)
		day2, day1 := alice.DayRows[0], alice.DayRows[1]

		assert.Equal(t, "2026-07-02", day2.Date)
		assert.EqualValues(t, 1, day2.Count)
		assert.EqualValues(t, 30, day2.Quota)
		assert.Empty(t, day2.Ips)
		assert.Equal(t, ts(2, 3, 0, 0), day2.WindowStart)
		assert.Equal(t, ts(2, 7, 0, 0), day2.WindowEnd)

		assert.Equal(t, "2026-07-01", day1.Date)
		assert.EqualValues(t, 3, day1.Count)
		assert.EqualValues(t, 350, day1.Quota)
		assert.Equal(t, ts(1, 3, 30, 0), day1.StartTime)
		assert.Equal(t, ts(1, 5, 0, 0), day1.EndTime)
		assert.Equal(t, []string{"claude-3", "gpt-4o"}, day1.Models)
		assert.Equal(t, []string{"1.1.1.1", "2.2.2.2"}, day1.Ips)
	})

	t.Run("username filter", func(t *testing.T) {
		rows, total, err := GetOffHoursUsage(rangeStart, rangeEnd, 3, 7, "audit_alice", 0, 100)
		require.NoError(t, err)
		assert.EqualValues(t, 1, total)
		require.Len(t, rows, 1)
		assert.Equal(t, 98001, rows[0].UserId)
	})

	t.Run("pagination slices users", func(t *testing.T) {
		rows, total, err := GetOffHoursUsage(rangeStart, rangeEnd, 3, 7, "", 0, 1)
		require.NoError(t, err)
		assert.EqualValues(t, 2, total)
		require.Len(t, rows, 1)
		assert.Equal(t, 98003, rows[0].UserId)

		rows, total, err = GetOffHoursUsage(rangeStart, rangeEnd, 3, 7, "", 1, 1)
		require.NoError(t, err)
		assert.EqualValues(t, 2, total)
		require.Len(t, rows, 1)
		assert.Equal(t, 98001, rows[0].UserId)
	})

	t.Run("empty result outside audited hours", func(t *testing.T) {
		rows, total, err := GetOffHoursUsage(ts(1, 10, 0, 0), ts(1, 12, 0, 0), 3, 7, "", 0, 100)
		require.NoError(t, err)
		assert.EqualValues(t, 0, total)
		assert.Empty(t, rows)
	})
}
