#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按公司和月份生成 AI 中转站用量汇报。

统计与计费口径复用 secondary_department_stats.py，用户范围按
users.company 字段精确匹配。

用法：
    python company_stats.py 华东公司 6
    python company_stats.py 华东公司 6 --year 2027
"""

from __future__ import annotations

import argparse
import sys
from typing import Any

import psycopg2

if __package__:
    from . import secondary_department_stats as stats
else:
    import secondary_department_stats as stats


COMPANY_SQL = "BTRIM(company) = %s"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="按 users.company 统计指定公司、指定月份的用量",
    )
    parser.add_argument(
        "company_name",
        help="公司名称，需与 users.company 字段一致",
    )
    parser.add_argument(
        "month",
        type=int,
        choices=range(1, 13),
        metavar="MONTH",
        help="统计月份，取值 1～12",
    )
    parser.add_argument(
        "--year",
        type=int,
        default=stats.DEFAULT_REPORT_YEAR,
        help=f"统计年份，默认 {stats.DEFAULT_REPORT_YEAR}",
    )
    return parser.parse_args()


def fetch_company_user_ids(
    conn: Any,
    company_name: str,
    registered_before_ts: int,
) -> list[int]:
    """返回公司内月末前已注册的全部用户 ID，包括禁用用户。"""
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT id
            FROM users
            WHERE {COMPANY_SQL}
              AND created_at <= %s
            ORDER BY id
            """,
            (company_name, registered_before_ts),
        )
        return [int(row[0]) for row in cur.fetchall()]


def main() -> int:
    args = parse_args()
    company_name = args.company_name.strip()
    if not company_name:
        raise SystemExit("请传入公司名称。")

    start, end = stats.resolve_period(args.year, args.month)
    start_ts = int(start.timestamp())
    end_ts = int(end.timestamp())

    conn = psycopg2.connect(stats.DEFAULT_DSN)
    try:
        user_ids = fetch_company_user_ids(conn, company_name, end_ts)
        if not user_ids:
            raise SystemExit(f"未找到公司用户：{company_name}")

        options = stats.load_options(conn)
        exchange_rate = stats.get_positive_option(
            options,
            ("Price", "USDExchangeRate", "usd_exchange_rate", "price"),
            stats.DEFAULT_USD_TO_CNY_RATE,
        )
        quota_per_unit = stats.get_positive_option(
            options,
            ("QuotaPerUnit", "quota_per_unit"),
            stats.DEFAULT_QUOTA_PER_UNIT,
        )
        model_stats, total_quota, fallback_rows = stats.collect_statistics(
            conn,
            start_ts,
            end_ts,
            user_ids=user_ids,
        )
        stats.apply_quota_costs(model_stats, quota_per_unit, exchange_rate)
        if sum(item.quota for item in model_stats) != total_quota:
            raise RuntimeError("模型汇总 quota 与日志总 quota 不一致")
    finally:
        conn.close()

    if fallback_rows:
        print(
            f"提示：{fallback_rows:,} 条日志因历史计费快照不完整或表达式无法线性拆分，"
            "已按该条日志的四类 Token 占比分配最终 quota。",
            file=sys.stderr,
        )

    total_tokens = sum(item.total_tokens for item in model_stats)
    per_capita_million_tokens = (
        total_tokens / len(user_ids) / stats.TOKENS_PER_MILLION
        if user_ids
        else 0.0
    )
    stats.print_report(
        f" {args.year} 年 {args.month} 月",
        start,
        end,
        len(user_ids),
        model_stats,
        department_name=company_name,
        department_label="公司",
        per_capita_million_tokens=per_capita_million_tokens,
        include_other_models=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
