package main

import (
	"context"
	"database/sql"
	"encoding/json"
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
	tierVersionPrefixPattern     = regexp.MustCompile(`^v\d+:`)
	tierExpressionPattern        = regexp.MustCompile(`tier\("[^"]*",\s*([^)]*)\)`)
	tierCoefficientPattern       = regexp.MustCompile(`\b(p|c|cr|cc)\s*\*\s*([\d.eE+-]+)`)
	// Keep this list and its order aligned with weekly_stats.py's BUILTIN_MODEL_MAPPING.
	builtinModelMappings = []modelMapping{
		{Category: "Kimi-K2.5", Aliases: []string{"kimi-k2.5"}},
		{Category: "Kimi-K2.6", Aliases: []string{"kimi-k2.6"}},
		{Category: "Kimi-K2.7", Aliases: []string{"kimi-k2.7-code"}},
		{Category: "Qwen3-Reranker-8B", Aliases: []string{"Qwen3-Reranker-8B"}},
		{Category: "Qwen3-Embedding-8B", Aliases: []string{"Qwen3-Embedding-8B"}},
		{Category: "Claude Haiku 4.5", Aliases: []string{"claude-haiku-4-5-20251001", "claude-haiku-4-5", "claude-haiku-4.5"}},
		{Category: "Claude Sonnet 4.6", Aliases: []string{"claude-sonnet-4-6", "claude-sonnet-4.6", "anthropic/claude-sonnet-4.6"}},
		{Category: "Claude Opus 4.6", Aliases: []string{"claude-opus-4-6", "claude-opus-4.6", "anthropic/claude-opus-4.6"}},
		{Category: "Claude Opus 4.7", Aliases: []string{"claude-opus-4-7", "claude-opus-4.7", "anthropic/claude-opus-4.7"}},
		{Category: "Claude Opus 4.8", Aliases: []string{"claude-opus-4-8", "claude-opus-4.8", "anthropic/claude-opus-4.8"}},
		{Category: "Deepseek-v4-flash", Aliases: []string{"deepseek-v4-flash"}},
		{Category: "Deepseek-v4-pro", Aliases: []string{"deepseek-v4-pro"}},
		{Category: "GLM-4.7", Aliases: []string{"glm-4.7"}},
		{Category: "GLM-5", Aliases: []string{"glm-5"}},
		{Category: "GLM-5-Turbo", Aliases: []string{"glm-5-turbo"}},
		{Category: "GLM-5.1", Aliases: []string{"glm-5.1"}},
		{Category: "GLM-5.2", Aliases: []string{"glm-5.2"}},
		{Category: "GPT-5.4-mini", Aliases: []string{"gpt-5.4-mini"}},
		{Category: "GPT-5.4", Aliases: []string{"gpt-5.4"}},
		{Category: "GPT-5.5", Aliases: []string{"gpt-5.5"}},
		{Category: "GPT-5.6-luna", Aliases: []string{"gpt-5.6-luna"}},
		{Category: "GPT-5.6-terra", Aliases: []string{"gpt-5.6-terra"}},
		{Category: "GPT-5.6-sol", Aliases: []string{"gpt-5.6-sol"}},
		{Category: "Codex Auto Review", Aliases: []string{"codex-auto-review"}},
	}
	builtinModelMappingLookup = buildModelMappingLookup(builtinModelMappings)
	// Report-only prices copied from weekly_stats.py. Unit: CNY per million tokens.
	specialModelPricesCNYPerM = map[string]modelPrices{
		"glm-5.2": {Input: 8, Output: 28, CacheInput: 2, CacheOutput: 0},
	}
)

type modelMapping struct {
	Category string
	Aliases  []string
}

type modelMappingMatch struct {
	Category string
	Mapped   bool
}

type modelPrices struct {
	Input       float64
	Output      float64
	CacheInput  float64
	CacheOutput float64
}

type priceConfig struct {
	ModelPrice        map[string]float64
	ModelRatio        map[string]float64
	CompletionRatio   map[string]float64
	CacheRatio        map[string]float64
	CreateCacheRatio  map[string]float64
	GroupRatio        map[string]float64
	BillingMode       map[string]string
	BillingExpr       map[string]string
	MarketplaceGroups map[string][]string
}

type marketplacePrice struct {
	Prices       modelPrices
	RequestPrice float64
	QuotaType    string
	Source       string
}

type optionEntry struct {
	Key   string
	Value string
}

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
	ModelPrices        modelPrices
	priceSums          modelPrices
	priceSampleCount   int64
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
	priceDatabaseDSN := strings.TrimSpace(os.Getenv("SQL_DSN"))
	if priceDatabaseDSN == "" {
		priceDatabaseDSN = logDatabaseDSN
	}
	if !strings.HasPrefix(priceDatabaseDSN, "postgres://") && !strings.HasPrefix(priceDatabaseDSN, "postgresql://") {
		return errors.New("请通过 SQL_DSN 提供模型广场 PostgreSQL 连接串")
	}
	fmt.Println("[1/4] 已读取 .env，正在连接 PostgreSQL……")

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

	priceDatabase := database
	if priceDatabaseDSN != logDatabaseDSN {
		priceDatabase, err = sql.Open("pgx", priceDatabaseDSN)
		if err != nil {
			return fmt.Errorf("初始化模型广场数据库连接失败: %w", err)
		}
		defer priceDatabase.Close()
		priceDatabase.SetMaxOpenConns(2)
		priceDatabase.SetMaxIdleConns(1)
		pricePingContext, cancelPricePing := context.WithTimeout(context.Background(), 15*time.Second)
		if err := priceDatabase.PingContext(pricePingContext); err != nil {
			cancelPricePing()
			return fmt.Errorf("连接模型广场 PostgreSQL 失败: %w", err)
		}
		cancelPricePing()
	}

	configContext, cancelConfig := context.WithTimeout(context.Background(), 30*time.Second)
	options, marketplaceConfig, err := loadMarketplacePriceConfig(configContext, priceDatabase)
	cancelConfig()
	if err != nil {
		return err
	}
	usdToCNYRate, err := getEnvironmentOrOptionPositiveFloat("REPORT_USD_TO_CNY_RATE", options, []string{"Price", "USDExchangeRate", "usd_exchange_rate", "price"}, defaultUSDToCNYRate)
	if err != nil {
		return err
	}
	fmt.Printf("[2/4] PostgreSQL 连接成功，统计区间：%s 至 %s\n", startTime.Format("2006-01-02 15:04:05"), endTime.Format("2006-01-02 15:04:05"))

	queryContext, cancelQuery := context.WithTimeout(context.Background(), queryTimeout)
	defer cancelQuery()
	statistics, err := collectStatistics(queryContext, database, startTime.Unix(), endTime.Unix(), usdToCNYRate, marketplaceConfig)
	if err != nil {
		return err
	}
	fmt.Printf("[3/4] 日志统计完成，共发现 %d 个模型，正在写入 Excel……\n", len(statistics))

	outputPath := fmt.Sprintf("log-model-cost-%s.xlsx", periodName)
	if err := writeExcel(outputPath, statistics); err != nil {
		return err
	}

	fmt.Printf("\n统计区间：%s 至 %s（含起止时刻，%s）\n", startTime.Format(reportTimeLayout), endTime.Format(reportTimeLayout), location)
	fmt.Printf("汇率：1 USD = %.4f 元\n", usdToCNYRate)
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

func collectStatistics(queryContext context.Context, database *sql.DB, startTimestamp int64, endTimestamp int64, usdToCNYRate float64, marketplaceConfig priceConfig) ([]modelStatistics, error) {
	fmt.Println("[3/4] 正在向 PostgreSQL 提交日志查询……")
	queryStartedAt := time.Now()
	categoryPrices := buildCategoryMarketplacePrices(builtinModelMappings, marketplaceConfig, usdToCNYRate)
	rows, err := database.QueryContext(queryContext, `
		SELECT model_name, prompt_tokens, completion_tokens, other
		FROM logs
		WHERE type = $1 AND created_at >= $2 AND created_at <= $3`, consumeLogType, startTimestamp, endTimestamp)
	if err != nil {
		return nil, fmt.Errorf("查询 logs 表失败: %w", err)
	}
	defer rows.Close()

	statisticsByModel := make(map[string]*modelStatistics)
	processedRows := int64(0)
	lastProgressAt := time.Now()
	for rows.Next() {
		var modelName string
		var promptTokens int64
		var completionTokens int64
		var otherJSON string
		if err := rows.Scan(&modelName, &promptTokens, &completionTokens, &otherJSON); err != nil {
			return nil, fmt.Errorf("读取日志记录失败: %w", err)
		}
		modelLookupName := normalizeModelLookupName(modelName)
		mappingMatch := findModelMapping(modelLookupName)
		if !mappingMatch.Mapped {
			continue
		}
		statisticsKey := mappingMatch.Category

		statistics := statisticsByModel[statisticsKey]
		if statistics == nil {
			statistics = &modelStatistics{ModelName: statisticsKey}
			statisticsByModel[statisticsKey] = statistics
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
		processedRows++
		if time.Since(lastProgressAt) >= 5*time.Second {
			fmt.Printf("[3/4] 已处理 %s 条日志，发现 %d 个模型，已耗时 %s……\n", formatInteger(processedRows), len(statisticsByModel), time.Since(queryStartedAt).Round(time.Second))
			lastProgressAt = time.Now()
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历日志记录失败: %w", err)
	}

	statistics := make([]modelStatistics, 0, len(statisticsByModel))
	for _, mapping := range builtinModelMappings {
		item := statisticsByModel[mapping.Category]
		if item == nil {
			continue
		}
		finalizeMappedModelStatistics(item, categoryPrices[mapping.Category])
		statistics = append(statistics, *item)
	}
	return statistics, nil
}

func normalizeModelLookupName(modelName string) string {
	return strings.ToLower(strings.TrimSpace(modelName))
}

func findModelMapping(modelLookupName string) modelMappingMatch {
	if match, exists := builtinModelMappingLookup[modelLookupName]; exists {
		return match
	}
	return modelMappingMatch{}
}

func buildModelMappingLookup(mappings []modelMapping) map[string]modelMappingMatch {
	lookup := make(map[string]modelMappingMatch)
	for _, mapping := range mappings {
		lookup[normalizeModelLookupName(mapping.Category)] = modelMappingMatch{
			Category: mapping.Category,
			Mapped:   true,
		}
		for _, alias := range mapping.Aliases {
			lookup[normalizeModelLookupName(alias)] = modelMappingMatch{
				Category: mapping.Category,
				Mapped:   true,
			}
		}
	}
	return lookup
}

func loadMarketplacePriceConfig(queryContext context.Context, database *sql.DB) (map[string]string, priceConfig, error) {
	config := priceConfig{
		ModelPrice:        make(map[string]float64),
		ModelRatio:        make(map[string]float64),
		CompletionRatio:   make(map[string]float64),
		CacheRatio:        make(map[string]float64),
		CreateCacheRatio:  make(map[string]float64),
		GroupRatio:        make(map[string]float64),
		BillingMode:       make(map[string]string),
		BillingExpr:       make(map[string]string),
		MarketplaceGroups: make(map[string][]string),
	}
	options := make(map[string]string)
	optionEntries := make([]optionEntry, 0)
	optionRows, err := database.QueryContext(queryContext, `SELECT "key", value FROM options`)
	if err != nil {
		return nil, priceConfig{}, fmt.Errorf("读取模型广场 options 失败: %w", err)
	}
	for optionRows.Next() {
		var key string
		var value sql.NullString
		if err := optionRows.Scan(&key, &value); err != nil {
			optionRows.Close()
			return nil, priceConfig{}, fmt.Errorf("读取模型广场 option 失败: %w", err)
		}
		if value.Valid {
			options[key] = value.String
			optionEntries = append(optionEntries, optionEntry{Key: key, Value: value.String})
		}
	}
	if err := optionRows.Err(); err != nil {
		optionRows.Close()
		return nil, priceConfig{}, fmt.Errorf("遍历模型广场 options 失败: %w", err)
	}
	optionRows.Close()

	for _, option := range optionEntries {
		normalizedKey := strings.ToLower(strings.ReplaceAll(option.Key, "_", ""))
		if strings.Contains(normalizedKey, "billingmode") {
			mergeStringMap(config.BillingMode, parseJSONStringMap(option.Value))
			continue
		}
		if strings.Contains(normalizedKey, "billingexpr") {
			mergeStringMap(config.BillingExpr, parseJSONStringMap(option.Value))
			continue
		}
		parsedValues := parseJSONFloatMap(option.Value)
		switch {
		case strings.Contains(normalizedKey, "modelprice"):
			mergeFloatMap(config.ModelPrice, parsedValues)
		case strings.Contains(normalizedKey, "modelratio"):
			mergeFloatMap(config.ModelRatio, parsedValues)
		case strings.Contains(normalizedKey, "completionratio"):
			mergeFloatMap(config.CompletionRatio, parsedValues)
		case strings.Contains(normalizedKey, "createcache") && strings.Contains(normalizedKey, "ratio"):
			mergeFloatMap(config.CreateCacheRatio, parsedValues)
		case normalizedKey == "groupratio":
			mergeFloatMap(config.GroupRatio, parsedValues)
		case strings.Contains(normalizedKey, "cache") && strings.Contains(normalizedKey, "ratio"):
			mergeFloatMap(config.CacheRatio, parsedValues)
		}
	}

	modelRows, err := database.QueryContext(queryContext, `SELECT row_to_json(model_row)::text FROM models AS model_row`)
	if err != nil {
		return nil, priceConfig{}, fmt.Errorf("读取模型广场 models 失败: %w", err)
	}
	for modelRows.Next() {
		var rowJSON string
		if err := modelRows.Scan(&rowJSON); err != nil {
			modelRows.Close()
			return nil, priceConfig{}, fmt.Errorf("读取模型广场 model 失败: %w", err)
		}
		var row map[string]any
		decoder := json.NewDecoder(strings.NewReader(rowJSON))
		decoder.UseNumber()
		if err := decoder.Decode(&row); err != nil {
			modelRows.Close()
			return nil, priceConfig{}, fmt.Errorf("解析模型广场 model 失败: %w", err)
		}
		modelName := firstMapString(row, []string{"model_name", "name", "id"})
		if modelName == "" {
			continue
		}
		modelKey := normalizeModelLookupName(modelName)
		setFirstMapFloat(row, []string{"model_ratio", "ratio"}, config.ModelRatio, modelKey)
		setFirstMapFloat(row, []string{"completion_ratio", "output_ratio"}, config.CompletionRatio, modelKey)
		setFirstMapFloat(row, []string{"cache_ratio", "cached_ratio", "cache_token_ratio", "cached_token_ratio"}, config.CacheRatio, modelKey)
		setFirstMapFloat(row, []string{"create_cache_ratio", "cache_creation_ratio", "cache_write_ratio", "cache_output_ratio"}, config.CreateCacheRatio, modelKey)
	}
	if err := modelRows.Err(); err != nil {
		modelRows.Close()
		return nil, priceConfig{}, fmt.Errorf("遍历模型广场 models 失败: %w", err)
	}
	modelRows.Close()

	abilityRows, err := database.QueryContext(queryContext, `SELECT model, "group" FROM abilities WHERE enabled = TRUE`)
	if err != nil {
		return nil, priceConfig{}, fmt.Errorf("读取模型广场 abilities 失败: %w", err)
	}
	for abilityRows.Next() {
		var modelName string
		var groupName sql.NullString
		if err := abilityRows.Scan(&modelName, &groupName); err != nil {
			abilityRows.Close()
			return nil, priceConfig{}, fmt.Errorf("读取模型广场 ability 失败: %w", err)
		}
		trimmedGroupName := strings.TrimSpace(groupName.String)
		if groupName.Valid && trimmedGroupName != "" {
			modelKey := normalizeModelLookupName(modelName)
			if !containsString(config.MarketplaceGroups[modelKey], trimmedGroupName) {
				config.MarketplaceGroups[modelKey] = append(config.MarketplaceGroups[modelKey], trimmedGroupName)
			}
		}
	}
	if err := abilityRows.Err(); err != nil {
		abilityRows.Close()
		return nil, priceConfig{}, fmt.Errorf("遍历模型广场 abilities 失败: %w", err)
	}
	abilityRows.Close()
	return options, config, nil
}

func getMarketplacePrice(modelName string, config priceConfig, exchangeRate float64) marketplacePrice {
	modelKey := normalizeModelLookupName(modelName)
	if prices, exists := specialModelPricesCNYPerM[modelKey]; exists {
		return marketplacePrice{Prices: prices, QuotaType: "token", Source: "报表特殊定价：" + modelName}
	}
	if _, exists := config.MarketplaceGroups[modelKey]; !exists {
		return marketplacePrice{QuotaType: "missing", Source: "模型广场未找到"}
	}
	groupRatio := getMarketplaceGroupRatio(modelKey, config)
	if requestPrice, exists := config.ModelPrice[modelKey]; exists {
		return marketplacePrice{
			RequestPrice: requestPrice * groupRatio * exchangeRate,
			QuotaType:    "request",
			Source:       "模型广场：" + modelName,
		}
	}
	if strings.EqualFold(config.BillingMode[modelKey], "tiered_expr") {
		if prices, exists := parseLowestTierPrices(config.BillingExpr[modelKey]); exists {
			prices.Input *= groupRatio * exchangeRate
			prices.Output *= groupRatio * exchangeRate
			prices.CacheInput *= groupRatio * exchangeRate
			prices.CacheOutput *= groupRatio * exchangeRate
			return marketplacePrice{Prices: prices, QuotaType: "token", Source: "模型广场：" + modelName}
		}
	}
	modelRatio, exists := config.ModelRatio[modelKey]
	if !exists {
		return marketplacePrice{QuotaType: "token", Source: "模型广场：" + modelName}
	}
	inputPrice := modelRatio * 2 * groupRatio * exchangeRate
	completionRatio := 1.0
	if configuredRatio, exists := config.CompletionRatio[modelKey]; exists {
		completionRatio = configuredRatio
	}
	prices := modelPrices{Input: inputPrice, Output: inputPrice * completionRatio}
	if cacheRatio, exists := config.CacheRatio[modelKey]; exists {
		prices.CacheInput = inputPrice * cacheRatio
	}
	if cacheOutputRatio, exists := config.CreateCacheRatio[modelKey]; exists {
		prices.CacheOutput = inputPrice * cacheOutputRatio
	}
	return marketplacePrice{Prices: prices, QuotaType: "token", Source: "模型广场：" + modelName}
}

func buildCategoryMarketplacePrices(mappings []modelMapping, config priceConfig, exchangeRate float64) map[string]marketplacePrice {
	categoryPrices := make(map[string]marketplacePrice, len(mappings))
	for _, mapping := range mappings {
		categoryPrices[mapping.Category] = getMarketplacePrice(mapping.Aliases[0], config, exchangeRate)
	}
	return categoryPrices
}

func getMarketplaceGroupRatio(modelKey string, config priceConfig) float64 {
	groupRatio := 1.0
	found := false
	for _, groupName := range config.MarketplaceGroups[modelKey] {
		if ratio, exists := config.GroupRatio[groupName]; exists && (!found || ratio < groupRatio) {
			groupRatio = ratio
			found = true
		}
	}
	return groupRatio
}

func parseLowestTierPrices(expression string) (modelPrices, bool) {
	body := tierVersionPrefixPattern.ReplaceAllString(strings.TrimSpace(expression), "")
	tierMatch := tierExpressionPattern.FindStringSubmatch(body)
	if len(tierMatch) < 2 {
		return modelPrices{}, false
	}
	prices := modelPrices{}
	for _, coefficientMatch := range tierCoefficientPattern.FindAllStringSubmatch(tierMatch[1], -1) {
		coefficient, err := strconv.ParseFloat(coefficientMatch[2], 64)
		if err != nil {
			continue
		}
		switch coefficientMatch[1] {
		case "p":
			prices.Input = coefficient
		case "c":
			prices.Output = coefficient
		case "cr":
			prices.CacheInput = coefficient
		case "cc":
			prices.CacheOutput = coefficient
		}
	}
	return prices, true
}

func parseJSONFloatMap(value string) map[string]float64 {
	data := parseJSONObject(value)
	result := make(map[string]float64)
	for key, rawValue := range data {
		if parsedValue, exists := anyToFloat(rawValue); exists {
			result[normalizeModelLookupName(key)] = parsedValue
		}
	}
	return result
}

func parseJSONStringMap(value string) map[string]string {
	data := parseJSONObject(value)
	result := make(map[string]string)
	for key, rawValue := range data {
		if rawValue != nil {
			result[normalizeModelLookupName(key)] = fmt.Sprint(rawValue)
		}
	}
	return result
}

func parseJSONObject(value string) map[string]any {
	decoder := json.NewDecoder(strings.NewReader(strings.TrimSpace(value)))
	decoder.UseNumber()
	var data map[string]any
	if err := decoder.Decode(&data); err != nil {
		return map[string]any{}
	}
	return data
}

func anyToFloat(value any) (float64, bool) {
	switch typedValue := value.(type) {
	case json.Number:
		parsedValue, err := typedValue.Float64()
		return parsedValue, err == nil
	case float64:
		return typedValue, true
	case string:
		parsedValue, err := strconv.ParseFloat(strings.TrimSpace(typedValue), 64)
		return parsedValue, err == nil
	default:
		return 0, false
	}
}

func firstMapString(row map[string]any, keys []string) string {
	for _, key := range keys {
		for realKey, value := range row {
			if strings.EqualFold(realKey, key) && value != nil {
				text := strings.TrimSpace(fmt.Sprint(value))
				if text != "" {
					return text
				}
			}
		}
	}
	return ""
}

func setFirstMapFloat(row map[string]any, keys []string, destination map[string]float64, destinationKey string) {
	for _, key := range keys {
		for realKey, value := range row {
			if strings.EqualFold(realKey, key) {
				if parsedValue, exists := anyToFloat(value); exists {
					destination[destinationKey] = parsedValue
					return
				}
			}
		}
	}
}

func mergeFloatMap(destination map[string]float64, source map[string]float64) {
	for key, value := range source {
		destination[key] = value
	}
}

func mergeStringMap(destination map[string]string, source map[string]string) {
	for key, value := range source {
		destination[key] = value
	}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func addModelPriceSample(statistics *modelStatistics, prices modelPrices) {
	statistics.priceSums.Input += prices.Input
	statistics.priceSums.Output += prices.Output
	statistics.priceSums.CacheInput += prices.CacheInput
	statistics.priceSums.CacheOutput += prices.CacheOutput
	statistics.priceSampleCount++
}

func finalizeModelPrices(statistics *modelStatistics) {
	if statistics.priceSampleCount <= 0 {
		return
	}
	sampleCount := float64(statistics.priceSampleCount)
	statistics.ModelPrices = modelPrices{
		Input:       statistics.priceSums.Input / sampleCount,
		Output:      statistics.priceSums.Output / sampleCount,
		CacheInput:  statistics.priceSums.CacheInput / sampleCount,
		CacheOutput: statistics.priceSums.CacheOutput / sampleCount,
	}
}

func finalizeMappedModelStatistics(statistics *modelStatistics, price marketplacePrice) {
	statistics.ModelPrices = price.Prices
	statistics.InputCostCNY = float64(statistics.InputTokens) / tokensPerMillion * statistics.ModelPrices.Input
	statistics.OutputCostCNY = float64(statistics.OutputTokens) / tokensPerMillion * statistics.ModelPrices.Output
	statistics.CacheInputCostCNY = float64(statistics.CacheInputTokens) / tokensPerMillion * statistics.ModelPrices.CacheInput
	statistics.CacheOutputCostCNY = float64(statistics.CacheOutputTokens) / tokensPerMillion * statistics.ModelPrices.CacheOutput
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

func getCacheOutputPriceCNY(other logOther, baseInputPriceUSD float64, groupRatio float64, usdToCNYRate float64) float64 {
	cacheOutputTokens := getCacheOutputTokens(other)
	if cacheOutputTokens > 0 {
		cacheOutputCostCNY := getCacheOutputCostCNY(other, baseInputPriceUSD, groupRatio, usdToCNYRate)
		if cacheOutputCostCNY > 0 {
			return cacheOutputCostCNY / float64(cacheOutputTokens) * tokensPerMillion
		}
	}
	return baseInputPriceUSD * other.CacheCreationRatio * groupRatio * usdToCNYRate
}

func writeExcel(outputPath string, statistics []modelStatistics) error {
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
		totalCostCNY := getTotalCostCNY(item)
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
			item.ModelPrices.Input,
			item.ModelPrices.Output,
			item.ModelPrices.CacheInput,
			item.ModelPrices.CacheOutput,
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

func getTotalCostCNY(statistics modelStatistics) float64 {
	return statistics.InputCostCNY + statistics.OutputCostCNY + statistics.CacheInputCostCNY + statistics.CacheOutputCostCNY
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

func getEnvironmentOrOptionPositiveFloat(name string, options map[string]string, optionKeys []string, defaultValue float64) (float64, error) {
	rawValue := strings.TrimSpace(os.Getenv(name))
	if rawValue != "" {
		parsedValue, err := strconv.ParseFloat(rawValue, 64)
		if err != nil || parsedValue <= 0 {
			return 0, fmt.Errorf("环境变量 %s 必须是正数", name)
		}
		return parsedValue, nil
	}
	for _, optionKey := range optionKeys {
		if optionValue, exists := options[optionKey]; exists {
			parsedValue, err := strconv.ParseFloat(strings.TrimSpace(optionValue), 64)
			if err == nil && parsedValue > 0 {
				return parsedValue, nil
			}
		}
	}
	return defaultValue, nil
}

func getEnvironmentValue(name string, defaultValue string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return defaultValue
	}
	return value
}
