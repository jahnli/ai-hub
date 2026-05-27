package common

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/constant"
)

var (
	Port         = flag.Int("port", 3000, "the listening port")
	PrintVersion = flag.Bool("version", false, "print version and exit")
	PrintHelp    = flag.Bool("help", false, "print help and exit")
	LogDir       = flag.String("log-dir", "./logs", "specify the log directory")
)

func printHelp() {
	fmt.Println("NewAPI(Based OneAPI) " + Version + " - The next-generation LLM gateway and AI asset management system supports multiple languages.")
	fmt.Println("Original Project: OneAPI by JustSong - https://github.com/songquanpeng/one-api")
	fmt.Println("Maintainer: QuantumNous - https://github.com/QuantumNous/new-api")
	fmt.Println("Usage: newapi [--port <port>] [--log-dir <log directory>] [--version] [--help]")
}

func InitEnv() {
	flag.Parse()

	envVersion := os.Getenv("VERSION")
	if envVersion != "" {
		Version = envVersion
	}

	if *PrintVersion {
		fmt.Println(Version)
		os.Exit(0)
	}

	if *PrintHelp {
		printHelp()
		os.Exit(0)
	}

	if os.Getenv("SESSION_SECRET") != "" {
		ss := os.Getenv("SESSION_SECRET")
		if ss == "random_string" {
			log.Println("WARNING: SESSION_SECRET is set to the default value 'random_string', please change it to a random string.")
			log.Println("警告：SESSION_SECRET被设置为默认值'random_string'，请修改为随机字符串。")
			log.Fatal("Please set SESSION_SECRET to a random string.")
		} else {
			SessionSecret = ss
		}
	}
	if os.Getenv("CRYPTO_SECRET") != "" {
		CryptoSecret = os.Getenv("CRYPTO_SECRET")
	} else {
		CryptoSecret = SessionSecret
	}
	if os.Getenv("SQLITE_PATH") != "" {
		SQLitePath = os.Getenv("SQLITE_PATH")
	}
	if *LogDir != "" {
		var err error
		*LogDir, err = filepath.Abs(*LogDir)
		if err != nil {
			log.Fatal(err)
		}
		if _, err := os.Stat(*LogDir); os.IsNotExist(err) {
			err = os.Mkdir(*LogDir, 0777)
			if err != nil {
				log.Fatal(err)
			}
		}
	}

	// Initialize variables from constants.go that were using environment variables
	DebugEnabled = os.Getenv("DEBUG") == "true"                 // DEBUG: 启用调试日志输出
	MemoryCacheEnabled = os.Getenv("MEMORY_CACHE_ENABLED") == "true" // MEMORY_CACHE_ENABLED: 启用内存缓存以减少数据库查询
	IsMasterNode = os.Getenv("NODE_TYPE") != "slave"            // NODE_TYPE: 节点角色，非 "slave" 即为主节点
	NodeName = os.Getenv("NODE_NAME")                           // NODE_NAME: 节点名称，用于审计日志中标识节点身份
	// TLS_INSECURE_SKIP_VERIFY: 跳过上游 TLS 证书验证（不安全，仅用于自签证书场景）
	TLSInsecureSkipVerify = GetEnvOrDefaultBool("TLS_INSECURE_SKIP_VERIFY", false)
	if TLSInsecureSkipVerify {
		if tr, ok := http.DefaultTransport.(*http.Transport); ok && tr != nil {
			if tr.TLSClientConfig != nil {
				tr.TLSClientConfig.InsecureSkipVerify = true
			} else {
				tr.TLSClientConfig = InsecureTLSConfig
			}
		}
	}

	// POLLING_INTERVAL: 任务轮询间隔（秒），用于定时拉取异步任务状态
	requestInterval, _ = strconv.Atoi(os.Getenv("POLLING_INTERVAL"))
	RequestInterval = time.Duration(requestInterval) * time.Second

	// SYNC_FREQUENCY: 内存缓存/Redis 缓存与数据库的同步频率（秒），决定配置变更最大生效延迟
	SyncFrequency = GetEnvOrDefault("SYNC_FREQUENCY", 60)
	// BATCH_UPDATE_INTERVAL: 批量更新（如额度扣减）的聚合写入间隔（秒）
	BatchUpdateInterval = GetEnvOrDefault("BATCH_UPDATE_INTERVAL", 5)
	// RELAY_TIMEOUT: 向上游 AI 提供商发起 HTTP 请求的超时时间（秒），0 表示无超时
	RelayTimeout = GetEnvOrDefault("RELAY_TIMEOUT", 0)
	// RELAY_MAX_IDLE_CONNS: HTTP 连接池最大空闲连接数
	RelayMaxIdleConns = GetEnvOrDefault("RELAY_MAX_IDLE_CONNS", 500)
	// RELAY_MAX_IDLE_CONNS_PER_HOST: 每个上游 host 的最大空闲连接数
	RelayMaxIdleConnsPerHost = GetEnvOrDefault("RELAY_MAX_IDLE_CONNS_PER_HOST", 100)

	// GEMINI_SAFETY_SETTING: Google Gemini 安全过滤级别
	GeminiSafetySetting = GetEnvOrDefaultString("GEMINI_SAFETY_SETTING", "BLOCK_NONE")
	// COHERE_SAFETY_SETTING: Cohere 安全模式 (NONE/CONTEXTUAL/STRICT)
	CohereSafetySetting = GetEnvOrDefaultString("COHERE_SAFETY_SETTING", "NONE")

	// 全局 API 限流：针对 /api 路径的请求频率限制
	GlobalApiRateLimitEnable = GetEnvOrDefaultBool("GLOBAL_API_RATE_LIMIT_ENABLE", false)
	GlobalApiRateLimitNum = GetEnvOrDefault("GLOBAL_API_RATE_LIMIT", 180)
	GlobalApiRateLimitDuration = int64(GetEnvOrDefault("GLOBAL_API_RATE_LIMIT_DURATION", 180))

	// 全局 Web 限流：针对前端页面请求的频率限制
	GlobalWebRateLimitEnable = GetEnvOrDefaultBool("GLOBAL_WEB_RATE_LIMIT_ENABLE", false)
	GlobalWebRateLimitNum = GetEnvOrDefault("GLOBAL_WEB_RATE_LIMIT", 60)
	GlobalWebRateLimitDuration = int64(GetEnvOrDefault("GLOBAL_WEB_RATE_LIMIT_DURATION", 180))

	// 关键操作限流：针对登录、注册等敏感操作的频率限制
	CriticalRateLimitEnable = GetEnvOrDefaultBool("CRITICAL_RATE_LIMIT_ENABLE", false)
	CriticalRateLimitNum = GetEnvOrDefault("CRITICAL_RATE_LIMIT", 20)
	CriticalRateLimitDuration = int64(GetEnvOrDefault("CRITICAL_RATE_LIMIT_DURATION", 20*60))

	// 搜索限流：按用户 ID 限制搜索请求频率
	SearchRateLimitEnable = GetEnvOrDefaultBool("SEARCH_RATE_LIMIT_ENABLE", true)
	SearchRateLimitNum = GetEnvOrDefault("SEARCH_RATE_LIMIT", 10)
	SearchRateLimitDuration = int64(GetEnvOrDefault("SEARCH_RATE_LIMIT_DURATION", 60))
	initConstantEnv()
}

func initConstantEnv() {
	// STREAMING_TIMEOUT: 流式响应中两次数据块之间的最大等待时间（秒），超时则断开连接
	constant.StreamingTimeout = GetEnvOrDefault("STREAMING_TIMEOUT", 300)
	// DIFY_DEBUG: 是否启用 Dify 渠道调试模式
	constant.DifyDebug = GetEnvOrDefaultBool("DIFY_DEBUG", true)
	// MAX_FILE_DOWNLOAD_MB: 单次文件下载的最大体积（MB）
	constant.MaxFileDownloadMB = GetEnvOrDefault("MAX_FILE_DOWNLOAD_MB", 64)
	// STREAM_SCANNER_MAX_BUFFER_MB: 流式扫描器的最大缓冲区大小（MB）
	constant.StreamScannerMaxBufferMB = GetEnvOrDefault("STREAM_SCANNER_MAX_BUFFER_MB", 128)
	// MaxRequestBodyMB 请求体最大大小（解压后），用于防止超大请求/zip bomb导致内存暴涨
	constant.MaxRequestBodyMB = GetEnvOrDefault("MAX_REQUEST_BODY_MB", 128)
	// ForceStreamOption 覆盖请求参数，强制返回usage信息
	constant.ForceStreamOption = GetEnvOrDefaultBool("FORCE_STREAM_OPTION", true)
	// CountToken: 是否启用本地 token 计数
	constant.CountToken = GetEnvOrDefaultBool("CountToken", true)
	// GET_MEDIA_TOKEN: 是否计算多模态（图片/音频/视频）的 token 消耗
	constant.GetMediaToken = GetEnvOrDefaultBool("GET_MEDIA_TOKEN", true)
	// GET_MEDIA_TOKEN_NOT_STREAM: 非流式请求是否也计算多模态 token
	constant.GetMediaTokenNotStream = GetEnvOrDefaultBool("GET_MEDIA_TOKEN_NOT_STREAM", false)
	// UPDATE_TASK: 是否启用异步任务状态轮询更新
	constant.UpdateTask = GetEnvOrDefaultBool("UPDATE_TASK", true)
	// AZURE_DEFAULT_API_VERSION: Azure OpenAI 的默认 API 版本
	constant.AzureDefaultAPIVersion = GetEnvOrDefaultString("AZURE_DEFAULT_API_VERSION", "2025-04-01-preview")
	// NOTIFY_LIMIT_COUNT: 同一事件的通知发送次数上限
	constant.NotifyLimitCount = GetEnvOrDefault("NOTIFY_LIMIT_COUNT", 2)
	// NOTIFICATION_LIMIT_DURATION_MINUTE: 通知去重窗口时长（分钟）
	constant.NotificationLimitDurationMinute = GetEnvOrDefault("NOTIFICATION_LIMIT_DURATION_MINUTE", 10)
	// GenerateDefaultToken 是否生成初始令牌，默认关闭。
	constant.GenerateDefaultToken = GetEnvOrDefaultBool("GENERATE_DEFAULT_TOKEN", false)
	// 是否启用错误日志
	constant.ErrorLogEnabled = GetEnvOrDefaultBool("ERROR_LOG_ENABLED", false)
	// 任务轮询时查询的最大数量
	constant.TaskQueryLimit = GetEnvOrDefault("TASK_QUERY_LIMIT", 1000)
	// 异步任务超时时间（分钟），超过此时间未完成的任务将被标记为失败并退款。0 表示禁用。
	constant.TaskTimeoutMinutes = GetEnvOrDefault("TASK_TIMEOUT_MINUTES", 1440)

	soraPatchStr := GetEnvOrDefaultString("TASK_PRICE_PATCH", "")
	if soraPatchStr != "" {
		var taskPricePatches []string
		soraPatches := strings.Split(soraPatchStr, ",")
		for _, patch := range soraPatches {
			trimmedPatch := strings.TrimSpace(patch)
			if trimmedPatch != "" {
				taskPricePatches = append(taskPricePatches, trimmedPatch)
			}
		}
		constant.TaskPricePatches = taskPricePatches
	}

	// Initialize trusted redirect domains for URL validation
	trustedDomainsStr := GetEnvOrDefaultString("TRUSTED_REDIRECT_DOMAINS", "")
	var trustedDomains []string
	domains := strings.Split(trustedDomainsStr, ",")
	for _, domain := range domains {
		trimmedDomain := strings.TrimSpace(domain)
		if trimmedDomain != "" {
			// Normalize domain to lowercase
			trustedDomains = append(trustedDomains, strings.ToLower(trimmedDomain))
		}
	}
	constant.TrustedRedirectDomains = trustedDomains
}
