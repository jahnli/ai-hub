package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/xuri/excelize/v2"
)

const (
	defaultQuotaPerUnit = 500000.0
	defaultUSDToCNYRate = 6.8
	tokensPerHundredM   = 100000000.0
	tokensPerMillion    = 1000000.0
	consumeLogType      = 2
	queryTimeout        = 30 * time.Minute
	reportPeriodName    = "20260706-20260710"
	reportStartTime     = "2026-07-06 00:00:00"
	reportEndTime       = "2026-07-10 17:53:00"
	reportTimeLayout    = "2006-01-02 15:04:05"
)

var (
	modelSeparatorPattern        = regexp.MustCompile(`[-_.\s]+`)
	finalVersionSeparatorPattern = regexp.MustCompile(`([0-9])-([0-9]+)\z`)
)

type logOther struct {
	ModelRatio            float64  `json:"model_ratio"`
	CompletionRatio       float64  `json:"completion_ratio"`
	GroupRatio            float64  `json:"group_ratio"`
	UserGroupRatio        *float64 `json:"user_group_ratio"`
	CacheRatio            float64  `json:"cache_ratio"`
	CacheCreationRatio    float64  `json:"cache_creation_ratio"`
	CacheCreationRatio5m  float64  `json:"cache_creation_ratio_5m"`
	CacheCreationRatio1h  float64  `json:"cache_creation_ratio_1h"`
	CacheTokens           int64    `json:"cache_tokens"`
	CacheWriteTokens      int64    `json:"cache_write_tokens"`
	CacheCreationTokens   int64    `json:"cache_creation_tokens"`
	CacheCreationTokens5m int64    `json:"cache_creation_tokens_5m"`
	CacheCreationTokens1h int64    `json:"cache_creation_tokens_1h"`
	UsageSemantic         string   `json:"usage_semantic"`
	BillingMode           string   `json:"billing_mode"`
	ModelPrice            float64  `json:"model_price"`
}

type modelStatistics struct {
	ModelName          string
	InputTokens        int64
	OutputTokens       int64
	CacheInputTokens   int64
	CacheOutputTokens  int64
	InputCostCNY       float64
	OutputCostCNY      float64
	CacheInputCostCNY  float64
	CacheOutputCostCNY float64
	TotalQuota         int64
	HasNonTokenBilling bool
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "统计失败：%v\n", err)
		os.Exit(1)
	}
}

func run() error {
	if err := godotenv.Load(".env"); err != nil {
		return fmt.Errorf("读取项目根目录 .env 失败: %w", err)
	}

	location, err := time.LoadLocation(getEnvironmentValue("REPORT_TIMEZONE", "Asia/Shanghai"))
	if err != nil {
		return fmt.Errorf("REPORT_TIMEZONE 无效: %w", err)
	}

	periodName, startTime, endTime, err := getReportPeriod(location)
	if err != nil {
		return err
	}

	logDatabaseDSN := strings.TrimSpace(os.Getenv("LOG_SQL_DSN"))
	if logDatabaseDSN == "" {
		logDatabaseDSN = strings.TrimSpace(os.Getenv("SQL_DSN"))
	}
	if !strings.HasPrefix(logDatabaseDSN, "postgres://") && !strings.HasPrefix(logDatabaseDSN, "postgresql://") {
		return errors.New("请通过 LOG_SQL_DSN 或 SQL_DSN 提供 PostgreSQL 连接串")
	}
	fmt.Println("[1/4] 已读取 .env，正在连接 PostgreSQL……")

	quotaPerUnit, err := getPositiveEnvironmentFloat("REPORT_QUOTA_PER_UNIT", defaultQuotaPerUnit)
	if err != nil {
		return err
	}
	usdToCNYRate, err := getPositiveEnvironmentFloat("REPORT_USD_TO_CNY_RATE", defaultUSDToCNYRate)
	if err != nil {
		return err
	}

	database, err := sql.Open("pgx", logDatabaseDSN)
	if err != nil {
		return fmt.Errorf("初始化数据库连接失败: %w", err)
	}
	defer database.Close()
	database.SetMaxOpenConns(2)
	database.SetMaxIdleConns(1)

	pingContext, cancelPing := context.WithTimeout(context.Background(), 15*time.Second)
	if err := database.PingContext(pingContext); err != nil {
		cancelPing()
		return fmt.Errorf("连接 PostgreSQL 失败: %w", err)
	}
	cancelPing()
	fmt.Printf("[2/4] PostgreSQL 连接成功，统计区间：%s 至 %s\n", startTime.Format("2006-01-02 15:04:05"), endTime.Format("2006-01-02 15:04:05"))

	queryContext, cancelQuery := context.WithTimeout(context.Background(), queryTimeout)
	defer cancelQuery()
	statistics, err := collectStatistics(queryContext, database, startTime.Unix(), endTime.Unix(), usdToCNYRate)
	if err != nil {
		return err
	}
	fmt.Printf("[3/4] 日志统计完成，共发现 %d 个模型，正在写入 Excel……\n", len(statistics))

	outputPath := fmt.Sprintf("log-model-cost-%s.xlsx", periodName)
	if err := writeExcel(outputPath, statistics, quotaPerUnit, usdToCNYRate); err != nil {
		return err
	}

	fmt.Printf("\n统计区间：%s 至 %s（含起止时刻，%s）\n", startTime.Format(reportTimeLayout), endTime.Format(reportTimeLayout), location)
	fmt.Printf("汇率：1 USD = %.4f 元；QuotaPerUnit：%.4f\n", usdToCNYRate, quotaPerUnit)
	fmt.Printf("共统计 %d 个模型，结果已保存到 %s\n", len(statistics), outputPath)
	return nil
}

func getReportPeriod(location *time.Location) (string, time.Time, time.Time, error) {
	startTime, err := time.ParseInLocation(reportTimeLayout, reportStartTime, location)
	if err != nil {
		return "", time.Time{}, time.Time{}, fmt.Errorf("解析统计开始时间失败: %w", err)
	}
	endTime, err := time.ParseInLocation(reportTimeLayout, reportEndTime, location)
	if err != nil {
		return "", time.Time{}, time.Time{}, fmt.Errorf("解析统计结束时间失败: %w", err)
	}
	if !endTime.After(startTime) {
		return "", time.Time{}, time.Time{}, errors.New("统计结束时间必须晚于开始时间")
	}
	return reportPeriodName, startTime, endTime, nil
}

func collectStatistics(queryContext context.Context, database *sql.DB, startTimestamp int64, endTimestamp int64, usdToCNYRate float64) ([]modelStatistics, error) {
	fmt.Println("[3/4] 正在向 PostgreSQL 提交日志查询……")
	queryStartedAt := time.Now()
	rows, err := database.QueryContext(queryContext, `
		SELECT model_name, prompt_tokens, completion_tokens, quota, other
		FROM logs
		WHERE type = $1 AND created_at >= $2 AND created_at <= $3`, consumeLogType, startTimestamp, endTimestamp)
	if err != nil {
		return nil, fmt.Errorf("查询 logs 表失败: %w", err)
	}
	defer rows.Close()

	statisticsByModel := make(map[string]*modelStatistics)
	modelOrder := make([]string, 0)
	processedRows := int64(0)
	lastProgressAt := time.Now()
	for rows.Next() {
		var modelName string
		var promptTokens int64
		var completionTokens int64
		var quota int64
		var otherJSON string
		if err := rows.Scan(&modelName, &promptTokens, &completionTokens, &quota, &otherJSON); err != nil {
			return nil, fmt.Errorf("读取日志记录失败: %w", err)
		}
		modelName = normalizeModelName(modelName)

		statistics := statisticsByModel[modelName]
		if statistics == nil {
			statistics = &modelStatistics{ModelName: modelName}
			statisticsByModel[modelName] = statistics
			modelOrder = append(modelOrder, modelName)
		}

		var other logOther
		if strings.TrimSpace(otherJSON) != "" {
			if err := common.UnmarshalJsonStr(otherJSON, &other); err != nil {
				return nil, fmt.Errorf("模型 %s 的日志 other 字段不是有效 JSON: %w", modelName, err)
			}
		}

		cacheOutputTokens := getCacheOutputTokens(other)
		inputTokens := getUncachedInputTokens(promptTokens, other.CacheTokens, cacheOutputTokens, other.UsageSemantic)
		effectiveGroupRatio := other.GroupRatio
		if effectiveGroupRatio == 0 {
			effectiveGroupRatio = 1
		}
		if other.UserGroupRatio != nil && *other.UserGroupRatio >= 0 {
			effectiveGroupRatio = *other.UserGroupRatio
		}
		baseInputPriceUSD := other.ModelRatio * 2
		inputPriceCNY := baseInputPriceUSD * usdToCNYRate
		outputPriceCNY := baseInputPriceUSD * other.CompletionRatio * usdToCNYRate
		cacheInputPriceCNY := baseInputPriceUSD * other.CacheRatio * usdToCNYRate

		statistics.InputTokens += inputTokens
		statistics.OutputTokens += completionTokens
		statistics.CacheInputTokens += other.CacheTokens
		statistics.CacheOutputTokens += cacheOutputTokens
		statistics.InputCostCNY += float64(inputTokens) / tokensPerMillion * inputPriceCNY * effectiveGroupRatio
		statistics.OutputCostCNY += float64(completionTokens) / tokensPerMillion * outputPriceCNY * effectiveGroupRatio
		statistics.CacheInputCostCNY += float64(other.CacheTokens) / tokensPerMillion * cacheInputPriceCNY * effectiveGroupRatio
		statistics.CacheOutputCostCNY += getCacheOutputCostCNY(other, baseInputPriceUSD, effectiveGroupRatio, usdToCNYRate)
		statistics.TotalQuota += quota
		statistics.HasNonTokenBilling = statistics.HasNonTokenBilling || other.ModelPrice > 0 || other.BillingMode != ""

		processedRows++
		if time.Since(lastProgressAt) >= 5*time.Second {
			fmt.Printf("[3/4] 已处理 %s 条日志，发现 %d 个模型，已耗时 %s……\n", formatInteger(processedRows), len(statisticsByModel), time.Since(queryStartedAt).Round(time.Second))
			lastProgressAt = time.Now()
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历日志记录失败: %w", err)
	}

	statistics := make([]modelStatistics, 0, len(modelOrder))
	for _, modelName := range modelOrder {
		statistics = append(statistics, *statisticsByModel[modelName])
	}
	return statistics, nil
}

func normalizeModelName(modelName string) string {
	normalizedName := strings.ToLower(strings.TrimSpace(modelName))
	if normalizedName == "" {
		return "(未记录模型)"
	}

	if providerSeparatorPosition := strings.LastIndex(normalizedName, "/"); providerSeparatorPosition >= 0 {
		normalizedName = normalizedName[providerSeparatorPosition+1:]
	}
	normalizedName = modelSeparatorPattern.ReplaceAllString(normalizedName, "-")
	normalizedName = strings.Trim(normalizedName, "-")
	normalizedName = finalVersionSeparatorPattern.ReplaceAllString(normalizedName, "$1.$2")
	return normalizedName
}

func getUncachedInputTokens(promptTokens int64, cacheInputTokens int64, cacheOutputTokens int64, usageSemantic string) int64 {
	if usageSemantic == "anthropic" {
		return max(promptTokens, 0)
	}
	uncachedInputTokens := promptTokens - cacheInputTokens - cacheOutputTokens
	return max(uncachedInputTokens, 0)
}

func getCacheOutputTokens(other logOther) int64 {
	if other.CacheWriteTokens > 0 {
		return other.CacheWriteTokens
	}
	splitTokens := other.CacheCreationTokens5m + other.CacheCreationTokens1h
	if splitTokens > 0 {
		return max(splitTokens, other.CacheCreationTokens)
	}
	return other.CacheCreationTokens
}

func getCacheOutputCostCNY(other logOther, baseInputPriceUSD float64, groupRatio float64, usdToCNYRate float64) float64 {
	remainingTokens := max(other.CacheCreationTokens-other.CacheCreationTokens5m-other.CacheCreationTokens1h, 0)
	if other.CacheCreationTokens5m > 0 || other.CacheCreationTokens1h > 0 {
		costUSD := float64(remainingTokens) / tokensPerMillion * baseInputPriceUSD * other.CacheCreationRatio
		costUSD += float64(other.CacheCreationTokens5m) / tokensPerMillion * baseInputPriceUSD * other.CacheCreationRatio5m
		costUSD += float64(other.CacheCreationTokens1h) / tokensPerMillion * baseInputPriceUSD * other.CacheCreationRatio1h
		return costUSD * groupRatio * usdToCNYRate
	}
	return float64(other.CacheCreationTokens) / tokensPerMillion * baseInputPriceUSD * other.CacheCreationRatio * groupRatio * usdToCNYRate
}

func writeExcel(outputPath string, statistics []modelStatistics, quotaPerUnit float64, usdToCNYRate float64) error {
	const sheetName = "模型费用统计"
	header := []any{"大模型", "输入Token(亿)", "输入花费(元)", "输出Token(亿)", "输出花费(元)", "缓存输入Token(亿)", "缓存输入花费(元)", "缓存输出Token(亿)", "缓存输出花费(元)", "总Token(亿)", "总花费(元)", "单价/百万Token（不带缓存）", "单价/百万Token（带缓存）", "模型输入价格(元/MT)", "模型输出价格(元/MT)", "模型缓存输入价格(元/MT)", "模型缓存输出价格(元/MT)"}

	workbook := excelize.NewFile()
	defer workbook.Close()
	if err := workbook.SetSheetName("Sheet1", sheetName); err != nil {
		return fmt.Errorf("设置工作表名称失败: %w", err)
	}
	if err := workbook.SetSheetRow(sheetName, "A1", &header); err != nil {
		return fmt.Errorf("写入 Excel 表头失败: %w", err)
	}

	for itemIndex, item := range statistics {
		totalTokens := item.InputTokens + item.OutputTokens + item.CacheInputTokens + item.CacheOutputTokens
		nonCacheTokens := item.InputTokens + item.OutputTokens
		totalCostCNY := float64(item.TotalQuota) / quotaPerUnit * usdToCNYRate
		row := []any{
			item.ModelName,
			float64(item.InputTokens) / tokensPerHundredM,
			item.InputCostCNY,
			float64(item.OutputTokens) / tokensPerHundredM,
			item.OutputCostCNY,
			float64(item.CacheInputTokens) / tokensPerHundredM,
			item.CacheInputCostCNY,
			float64(item.CacheOutputTokens) / tokensPerHundredM,
			item.CacheOutputCostCNY,
			float64(totalTokens) / tokensPerHundredM,
			totalCostCNY,
			getUnitPrice(totalCostCNY, nonCacheTokens),
			getUnitPrice(totalCostCNY, totalTokens),
			getUnitPrice(item.InputCostCNY, item.InputTokens),
			getUnitPrice(item.OutputCostCNY, item.OutputTokens),
			getUnitPrice(item.CacheInputCostCNY, item.CacheInputTokens),
			getUnitPrice(item.CacheOutputCostCNY, item.CacheOutputTokens),
		}
		startCell, err := excelize.CoordinatesToCellName(1, itemIndex+2)
		if err != nil {
			return fmt.Errorf("计算模型 %s 的单元格位置失败: %w", item.ModelName, err)
		}
		if err := workbook.SetSheetRow(sheetName, startCell, &row); err != nil {
			return fmt.Errorf("写入模型 %s 的统计结果失败: %w", item.ModelName, err)
		}
	}

	headerStyle, err := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"4472C4"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	if err != nil {
		return fmt.Errorf("创建 Excel 表头样式失败: %w", err)
	}
	numberStyle, err := workbook.NewStyle(&excelize.Style{NumFmt: 2, Alignment: &excelize.Alignment{Horizontal: "right"}})
	if err != nil {
		return fmt.Errorf("创建 Excel 数值样式失败: %w", err)
	}
	lastRow := len(statistics) + 1
	if err := workbook.SetCellStyle(sheetName, "A1", "Q1", headerStyle); err != nil {
		return fmt.Errorf("设置 Excel 表头样式失败: %w", err)
	}
	if lastRow >= 2 {
		if err := workbook.SetCellStyle(sheetName, "B2", fmt.Sprintf("Q%d", lastRow), numberStyle); err != nil {
			return fmt.Errorf("设置 Excel 数值格式失败: %w", err)
		}
	}
	if err := workbook.SetColWidth(sheetName, "A", "A", 28); err != nil {
		return fmt.Errorf("设置模型名称列宽失败: %w", err)
	}
	if err := workbook.SetColWidth(sheetName, "B", "K", 18); err != nil {
		return fmt.Errorf("设置 Token 与金额列宽失败: %w", err)
	}
	if err := workbook.SetColWidth(sheetName, "L", "M", 28); err != nil {
		return fmt.Errorf("设置平均单价列宽失败: %w", err)
	}
	if err := workbook.SetColWidth(sheetName, "N", "Q", 25); err != nil {
		return fmt.Errorf("设置模型价格列宽失败: %w", err)
	}
	if err := workbook.SetRowHeight(sheetName, 1, 24); err != nil {
		return fmt.Errorf("设置 Excel 表头行高失败: %w", err)
	}
	if err := workbook.SetPanes(sheetName, &excelize.Panes{Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"}); err != nil {
		return fmt.Errorf("冻结 Excel 表头失败: %w", err)
	}
	if err := workbook.AutoFilter(sheetName, fmt.Sprintf("A1:Q%d", lastRow), []excelize.AutoFilterOptions{}); err != nil {
		return fmt.Errorf("设置 Excel 筛选失败: %w", err)
	}
	if err := workbook.SaveAs(outputPath); err != nil {
		return fmt.Errorf("保存 Excel 文件失败: %w", err)
	}
	return nil
}

func getUnitPrice(costCNY float64, tokenCount int64) float64 {
	if tokenCount <= 0 {
		return 0
	}
	return costCNY / float64(tokenCount) * tokensPerMillion
}

func formatInteger(value int64) string {
	digits := strconv.FormatInt(value, 10)
	for separatorPosition := len(digits) - 3; separatorPosition > 0; separatorPosition -= 3 {
		digits = digits[:separatorPosition] + "," + digits[separatorPosition:]
	}
	return digits
}

func getPositiveEnvironmentFloat(name string, defaultValue float64) (float64, error) {
	rawValue := strings.TrimSpace(os.Getenv(name))
	if rawValue == "" {
		return defaultValue, nil
	}
	parsedValue, err := strconv.ParseFloat(rawValue, 64)
	if err != nil || parsedValue <= 0 {
		return 0, fmt.Errorf("环境变量 %s 必须是正数", name)
	}
	return parsedValue, nil
}

func getEnvironmentValue(name string, defaultValue string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return defaultValue
	}
	return value
}
