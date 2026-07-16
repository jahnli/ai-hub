#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按 main.go 的模型映射和计费口径生成 AI 中转站周报。"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg2


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


DEFAULT_DSN = "postgresql://admin:semitech@10.16.7.77:5432/ai-gateway"
DEFAULT_USD_TO_CNY_RATE = 6.8
DEFAULT_QUOTA_PER_UNIT = 500_000.0
TOKENS_PER_MILLION = 1_000_000.0
TOKENS_PER_HUNDRED_MILLION = 100_000_000.0

# 每项可在第三个位置配置四类价格：输入、输出、缓存输入、缓存输出（元/百万 Token）。
# 没有第三项时，使用第一个别名查询模型广场价格。
ModelMapping = tuple[str, list[str]] | tuple[str, list[str], tuple[float, float, float, float]]
BUILTIN_MODEL_MAPPING: list[ModelMapping] = [
    ("Kimi-K2.5", ["kimi-k2.5"], (4.0, 21.0, 0.7, 0.0)),
    ("Kimi-K2.6", ["kimi-k2.6"]),
    ("Kimi-K2.7", ["kimi-k2.7-code"]),
    ("Qwen3-Reranker-8B", ["Qwen3-Reranker-8B"]),
    ("Qwen3-Embedding-8B", ["Qwen3-Embedding-8B"]),
    ("Claude Haiku 4.5", ["claude-haiku-4-5-20251001", "claude-haiku-4-5", "claude-haiku-4.5"], (1.0, 5.0, 0.1, 1.25)),
    ("Claude Sonnet 5", ["claude-sonnet-5"], (2.0, 10.0, 0.2, 2.5)),
    ("Claude Sonnet 4.6", ["claude-sonnet-4-6", "claude-sonnet-4.6", "anthropic/claude-sonnet-4.6"]),
    ("Claude Opus 4.6", ["claude-opus-4-6", "claude-opus-4.6", "anthropic/claude-opus-4.6"]),
    ("Claude Opus 4.7", ["claude-opus-4-7", "claude-opus-4.7", "anthropic/claude-opus-4.7"], (5.0, 25.0, 0.5, 6.25)),
    ("Claude Opus 4.8", ["claude-opus-4-8", "claude-opus-4.8", "anthropic/claude-opus-4.8"]),
    ("Deepseek-v4-flash", ["deepseek-v4-flash"]),
    ("Deepseek-v4-pro", ["deepseek-v4-pro"]),
    ("GLM-4.7", ["glm-4.7"], (2.0, 8.0, 0.4, 0.0)),
    ("GLM-5", ["glm-5"], (4.0, 18.0, 1.0, 0.0)),
    ("GLM-5-Turbo", ["glm-5-turbo"], (5.0, 22.0, 1.2, 0.0)),
    ("GLM-5.1", ["glm-5.1"], (5.5, 25.0, 1.3, 0.0)),
    ("GLM-5.2", ["glm-5.2"]),
    ("GPT-5.4-mini", ["gpt-5.4-mini"]),
    ("GPT-5.4", ["gpt-5.4"], (0.5, 2.7, 0.05, 0.05)),
    ("GPT-5.5", ["gpt-5.5"]),
    ("GPT-5.6-luna", ["gpt-5.6-luna"]),
    ("GPT-5.6-terra", ["gpt-5.6-terra"]),
    ("GPT-5.6-sol", ["gpt-5.6-sol"]),
    ("Codex Auto Review", ["codex-auto-review"]),
]

MODEL_LOOKUP = {
    name.strip().lower(): mapping[0]
    for mapping in BUILTIN_MODEL_MAPPING
    for name in (mapping[0], *mapping[1])
}


@dataclass
class ModelPrices:
    input: float = 0.0
    output: float = 0.0
    cache_input: float = 0.0
    cache_output: float = 0.0


@dataclass
class ModelStats:
    name: str
    input_tokens: int = 0
    output_tokens: int = 0
    cache_input_tokens: int = 0
    cache_output_tokens: int = 0
    quota: int = 0
    quota_cost_cny: float = 0.0
    # 对应 main.go 最终表格的四个费用列。
    input_cost_cny: float = 0.0
    output_cost_cny: float = 0.0
    cache_input_cost_cny: float = 0.0
    cache_output_cost_cny: float = 0.0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens + self.cache_input_tokens + self.cache_output_tokens

@dataclass
class PriceConfig:
    model_price: dict[str, float] = field(default_factory=dict)
    model_ratio: dict[str, float] = field(default_factory=dict)
    completion_ratio: dict[str, float] = field(default_factory=dict)
    cache_ratio: dict[str, float] = field(default_factory=dict)
    create_cache_ratio: dict[str, float] = field(default_factory=dict)
    group_ratio: dict[str, float] = field(default_factory=dict)
    billing_mode: dict[str, str] = field(default_factory=dict)
    billing_expr: dict[str, str] = field(default_factory=dict)
    marketplace_groups: dict[str, list[str]] = field(default_factory=dict)


def normalize_model_name(value: Any) -> str:
    return str(value or "").strip().lower()


def parse_float_map(value: Any) -> dict[str, float]:
    result: dict[str, float] = {}
    try:
        data = value if isinstance(value, dict) else json.loads(str(value or "{}"))
    except (TypeError, ValueError):
        return result
    if not isinstance(data, dict):
        return result
    for key, raw_value in data.items():
        try:
            result[normalize_model_name(key)] = float(raw_value)
        except (TypeError, ValueError):
            continue
    return result


def parse_text_map(value: Any) -> dict[str, str]:
    try:
        data = value if isinstance(value, dict) else json.loads(str(value or "{}"))
    except (TypeError, ValueError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {
        normalize_model_name(key): str(raw_value)
        for key, raw_value in data.items()
        if raw_value is not None
    }


def first_row_value(row: dict[str, Any], keys: tuple[str, ...]) -> Any:
    lowered = {str(key).lower(): value for key, value in row.items()}
    return next((lowered[key.lower()] for key in keys if lowered.get(key.lower()) not in (None, "")), None)


def load_price_config(conn: Any) -> tuple[dict[str, Any], PriceConfig]:
    with conn.cursor() as cur:
        cur.execute('SELECT "key", value FROM options')
        options = {str(key): value for key, value in cur.fetchall() if value is not None}
        config = PriceConfig()
        for key, value in options.items():
            normalized_key = key.replace("_", "").lower()
            if "billingmode" in normalized_key:
                config.billing_mode.update(parse_text_map(value))
                continue
            if "billingexpr" in normalized_key:
                config.billing_expr.update(parse_text_map(value))
                continue
            parsed = parse_float_map(value)
            if "modelprice" in normalized_key:
                config.model_price.update(parsed)
            elif "modelratio" in normalized_key:
                config.model_ratio.update(parsed)
            elif "completionratio" in normalized_key:
                config.completion_ratio.update(parsed)
            elif "createcache" in normalized_key and "ratio" in normalized_key:
                config.create_cache_ratio.update(parsed)
            elif normalized_key == "groupratio":
                config.group_ratio.update(parsed)
            elif "cache" in normalized_key and "ratio" in normalized_key:
                config.cache_ratio.update(parsed)

        cur.execute("SELECT row_to_json(model_row)::text FROM models AS model_row")
        for (row_json,) in cur.fetchall():
            row = json.loads(row_json)
            model_name = first_row_value(row, ("model_name", "name", "id"))
            if not model_name:
                continue
            model_key = normalize_model_name(model_name)
            for fields, destination in (
                (("model_ratio", "ratio"), config.model_ratio),
                (("completion_ratio", "output_ratio"), config.completion_ratio),
                (("cache_ratio", "cached_ratio", "cache_token_ratio", "cached_token_ratio"), config.cache_ratio),
                (("create_cache_ratio", "cache_creation_ratio", "cache_write_ratio", "cache_output_ratio"), config.create_cache_ratio),
            ):
                raw_value = first_row_value(row, fields)
                if raw_value is not None:
                    try:
                        destination[model_key] = float(raw_value)
                    except (TypeError, ValueError):
                        pass

        cur.execute('SELECT model, "group" FROM abilities WHERE enabled = TRUE')
        for model_name, group_name in cur.fetchall():
            group_name = str(group_name or "").strip()
            if not group_name:
                continue
            model_key = normalize_model_name(model_name)
            groups = config.marketplace_groups.setdefault(model_key, [])
            if group_name not in groups:
                groups.append(group_name)

    return options, config


def parse_lowest_tier_prices(expression: str) -> ModelPrices | None:
    body = re.sub(r"^v\d+:", "", str(expression or "").strip(), count=1)
    match = re.search(r'tier\("[^"]*",\s*([^)]*)\)', body)
    if not match:
        return None
    values = {"p": 0.0, "c": 0.0, "cr": 0.0, "cc": 0.0}
    for key, raw_value in re.findall(r"\b(p|c|cr|cc)\s*\*\s*([\d.eE+-]+)", match.group(1)):
        try:
            values[key] = float(raw_value)
        except ValueError:
            continue
    return ModelPrices(values["p"], values["c"], values["cr"], values["cc"])


def get_marketplace_price(model_name: str, config: PriceConfig, exchange_rate: float) -> ModelPrices:
    model_key = normalize_model_name(model_name)
    if model_key not in config.marketplace_groups:
        return ModelPrices()

    groups = config.marketplace_groups[model_key]
    group_ratios = [config.group_ratio[group] for group in groups if group in config.group_ratio]
    group_ratio = min(group_ratios) if group_ratios else 1.0

    # main.go 对按次计费模型只返回请求单价，四类 Token 单价为 0。
    if model_key in config.model_price:
        return ModelPrices()

    if config.billing_mode.get(model_key, "").lower() == "tiered_expr":
        prices = parse_lowest_tier_prices(config.billing_expr.get(model_key, ""))
        if prices is not None:
            factor = group_ratio * exchange_rate
            return ModelPrices(
                prices.input * factor,
                prices.output * factor,
                prices.cache_input * factor,
                prices.cache_output * factor,
            )

    model_ratio = config.model_ratio.get(model_key)
    if model_ratio is None:
        return ModelPrices()
    input_price = model_ratio * 2 * group_ratio * exchange_rate
    return ModelPrices(
        input=input_price,
        output=input_price * config.completion_ratio.get(model_key, 1.0),
        cache_input=input_price * config.cache_ratio.get(model_key, 0.0),
        cache_output=input_price * config.create_cache_ratio.get(model_key, 0.0),
    )


def collect_statistics(conn: Any, start_ts: int, end_ts: int, prices: dict[str, ModelPrices]) -> list[ModelStats]:
    statistics = {mapping[0]: ModelStats(mapping[0]) for mapping in BUILTIN_MODEL_MAPPING}

    # 在 PostgreSQL 内按 main.go 的公式完成拆分和聚合，避免向 Python 搬运整周明细日志。
    with conn.cursor() as cur:
        cur.execute(
            """
            WITH normalized AS MATERIALIZED (
                SELECT
                    log.model_name,
                    COALESCE(log.prompt_tokens, 0) AS prompt_tokens,
                    COALESCE(log.completion_tokens, 0) AS completion_tokens,
                    COALESCE(log.quota, 0) AS quota,
                    COALESCE(other.usage_semantic, '') AS usage_semantic,
                    COALESCE(other.cache_tokens, 0) AS cache_input_tokens,
                    COALESCE(other.cache_write_tokens, 0) AS cache_write_tokens,
                    COALESCE(other.cache_creation_tokens, 0) AS cache_creation_tokens,
                    COALESCE(other.cache_creation_tokens_5m, 0) AS cache_creation_tokens_5m,
                    COALESCE(other.cache_creation_tokens_1h, 0) AS cache_creation_tokens_1h
                FROM logs AS log
                CROSS JOIN LATERAL jsonb_to_record(
                    CASE WHEN BTRIM(COALESCE(log.other, '')) <> ''
                         THEN log.other::jsonb ELSE '{}'::jsonb END
                ) AS other(
                    usage_semantic text,
                    cache_tokens bigint,
                    cache_write_tokens bigint,
                    cache_creation_tokens bigint,
                    cache_creation_tokens_5m bigint,
                    cache_creation_tokens_1h bigint
                )
                WHERE log.type = %s
                  AND log.created_at >= %s
                  AND log.created_at <= %s
                  AND LOWER(BTRIM(log.model_name)) = ANY(%s)
            ), classified AS (
                SELECT
                    *,
                    CASE
                        WHEN cache_write_tokens > 0 THEN cache_write_tokens
                        WHEN cache_creation_tokens_5m + cache_creation_tokens_1h > 0
                            THEN GREATEST(
                                cache_creation_tokens_5m + cache_creation_tokens_1h,
                                cache_creation_tokens
                            )
                        ELSE cache_creation_tokens
                    END AS cache_output_tokens
                FROM normalized
            )
            SELECT
                model_name,
                COALESCE(SUM(
                    CASE
                        WHEN usage_semantic = 'anthropic' THEN GREATEST(prompt_tokens, 0)
                        ELSE GREATEST(prompt_tokens - cache_input_tokens - cache_output_tokens, 0)
                    END
                ), 0) AS input_tokens,
                COALESCE(SUM(completion_tokens), 0) AS output_tokens,
                COALESCE(SUM(cache_input_tokens), 0) AS cache_input_tokens,
                COALESCE(SUM(cache_output_tokens), 0) AS cache_output_tokens,
                COALESCE(SUM(quota), 0) AS quota
            FROM classified
            GROUP BY model_name
            """,
            (2, start_ts, end_ts, list(MODEL_LOOKUP)),
        )
        for model_name, input_tokens, output_tokens, cache_input_tokens, cache_output_tokens, quota in cur.fetchall():
            category = MODEL_LOOKUP.get(normalize_model_name(model_name))
            if category is None:
                continue
            stat = statistics[category]
            stat.input_tokens += int(input_tokens)
            stat.output_tokens += int(output_tokens)
            stat.cache_input_tokens += int(cache_input_tokens)
            stat.cache_output_tokens += int(cache_output_tokens)
            stat.quota += int(quota)

    result = [statistics[mapping[0]] for mapping in BUILTIN_MODEL_MAPPING if statistics[mapping[0]].total_tokens > 0]
    for stat in result:
        price = prices[stat.name]
        stat.input_cost_cny = stat.input_tokens / TOKENS_PER_MILLION * price.input
        stat.output_cost_cny = stat.output_tokens / TOKENS_PER_MILLION * price.output
        stat.cache_input_cost_cny = stat.cache_input_tokens / TOKENS_PER_MILLION * price.cache_input
        stat.cache_output_cost_cny = stat.cache_output_tokens / TOKENS_PER_MILLION * price.cache_output
    return result


def get_positive_option(options: dict[str, Any], keys: tuple[str, ...], default: float) -> float:
    for key in keys:
        try:
            value = float(options[key])
            if value > 0:
                return value
        except (KeyError, TypeError, ValueError):
            continue
    return default


def fetch_totals(conn: Any, start_ts: int, end_ts: int) -> tuple[int, int]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM users),
                (SELECT COALESCE(SUM(quota), 0)
                 FROM logs
                 WHERE type = %s AND created_at >= %s AND created_at <= %s)
            """,
            (2, start_ts, end_ts),
        )
        total_users, total_quota = cur.fetchone()
        return int(total_users), int(total_quota)


def format_token_amount(tokens: int) -> str:
    text = f"{tokens / TOKENS_PER_HUNDRED_MILLION:.2f}".rstrip("0").rstrip(".")
    return f"{text} 亿"


def format_cost(cost: float) -> str:
    return f"{cost:,.0f}"


def unit_price(cost: float, tokens: int) -> float:
    return cost / tokens * TOKENS_PER_MILLION if tokens > 0 else 0.0


def print_report(
    label: str,
    start: datetime,
    end: datetime,
    total_users: int,
    stats: list[ModelStats],
    quota_total_cost: float,
) -> None:
    input_tokens = sum(item.input_tokens for item in stats)
    output_tokens = sum(item.output_tokens for item in stats)
    cache_input_tokens = sum(item.cache_input_tokens for item in stats)
    cache_output_tokens = sum(item.cache_output_tokens for item in stats)
    # 四项费用严格等于 main.go 最终表格四个费用列各自的合计。
    input_cost = sum(item.input_cost_cny for item in stats)
    output_cost = sum(item.output_cost_cny for item in stats)
    cache_input_cost = sum(item.cache_input_cost_cny for item in stats)
    cache_output_cost = sum(item.cache_output_cost_cny for item in stats)
    total_tokens = input_tokens + output_tokens + cache_input_tokens + cache_output_tokens
    total_input_tokens = input_tokens + cache_input_tokens
    total_output_tokens = output_tokens + cache_output_tokens
    input_output_ratio = total_input_tokens / total_output_tokens if total_output_tokens else 0.0
    cache_hit_rate = cache_input_tokens / total_input_tokens * 100 if total_input_tokens else 0.0

    print(f"""Hi 各位领导：
AI 中转站{label}统计
统计周期：{start.strftime('%Y-%m-%d %H:%M:%S')} － {end.strftime('%Y-%m-%d %H:%M')}
总注册人数：{total_users:,} 人

非缓存输入，Token 量 {format_token_amount(input_tokens)}，费用 {format_cost(input_cost)} 元，单价 {unit_price(input_cost, input_tokens):.2f} 元
非缓存输出，Token 量 {format_token_amount(output_tokens)}，费用 {format_cost(output_cost)} 元，单价 {unit_price(output_cost, output_tokens):.2f} 元
缓存输入，Token 量 {format_token_amount(cache_input_tokens)}，费用 {format_cost(cache_input_cost)} 元，单价 {unit_price(cache_input_cost, cache_input_tokens):.2f} 元
缓存输出，Token 量 {format_token_amount(cache_output_tokens)}，费用 {format_cost(cache_output_cost)} 元，单价 {unit_price(cache_output_cost, cache_output_tokens):.2f} 元

Token 总量 {format_token_amount(total_tokens)}，总费用 {format_cost(quota_total_cost)} 元，均价 {unit_price(quota_total_cost, total_tokens):.2f} 元
输入输出倍数：{input_output_ratio:.1f} 倍，综合缓存命中率：{cache_hit_rate:.0f}%

Top 5 费用的模型：""")
    for index, item in enumerate(sorted(stats, key=lambda value: value.quota_cost_cny, reverse=True)[:5], start=1):
        print(
            f"{index}. {item.name}，费用 {format_cost(item.quota_cost_cny)} 元，"
            f"Token 量 {format_token_amount(item.total_tokens)}，"
            f"单价 {unit_price(item.quota_cost_cny, item.total_tokens):.2f} 元"
        )


def resolve_period() -> tuple[str, datetime, datetime]:
    tz = timezone(timedelta(hours=8))
    now = datetime.now(tz)
    print("请选择统计周期：")
    print("  1. 上周（上周一 ~ 上周五 18:30）")
    print("  2. 本周（本周一 ~ 本周五 18:30）")
    choice = input("请输入 1 或 2：").strip()
    if choice == "2":
        monday = now - timedelta(days=now.weekday())
        label = "本周"
    else:
        monday = now - timedelta(days=now.weekday() + 7)
        label = "上周"
    start = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=4, hours=18, minutes=30)
    return label, start, end


def main() -> int:
    label, start, end = resolve_period()
    start_ts = int(start.timestamp())
    end_ts = int(end.timestamp())
    conn = psycopg2.connect(DEFAULT_DSN)
    try:
        total_users, total_quota = fetch_totals(conn, start_ts, end_ts)
        options, price_config = load_price_config(conn)
        exchange_rate = get_positive_option(
            options,
            ("Price", "USDExchangeRate", "usd_exchange_rate", "price"),
            DEFAULT_USD_TO_CNY_RATE,
        )
        quota_per_unit = get_positive_option(
            options,
            ("QuotaPerUnit", "quota_per_unit"),
            DEFAULT_QUOTA_PER_UNIT,
        )
        quota_total_cost = total_quota / quota_per_unit * exchange_rate
        category_prices: dict[str, ModelPrices] = {}
        for mapping in BUILTIN_MODEL_MAPPING:
            category, aliases, *configured_price = mapping
            category_prices[category] = (
                ModelPrices(*configured_price[0])
                if configured_price
                else get_marketplace_price(aliases[0], price_config, exchange_rate)
            )
        stats = collect_statistics(conn, start_ts, end_ts, category_prices)
        for stat in stats:
            stat.quota_cost_cny = stat.quota / quota_per_unit * exchange_rate
    finally:
        conn.close()

    print_report(label, start, end, total_users, stats, quota_total_cost)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
