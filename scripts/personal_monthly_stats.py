#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按个人和月份生成 AI 中转站用量总览。

通过 users.username 精确匹配用户，Token 和 quota 均直接汇总 quota_data。

用法：
    python personal_monthly_stats.py zhangsan 6 --year 2027
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import psycopg2

if __package__:
    from . import secondary_department_stats as stats
else:
    import secondary_department_stats as stats


@dataclass(frozen=True)
class ReportUser:
    id: int
    username: str
    display_name: str
    job_title: str
    department_name: str
    created_at: int
    last_login_at: int


@dataclass(frozen=True)
class MonthlyOverview:
    total_tokens: int
    total_quota: int
    top_model: str
    top_model_tokens: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="按 users.username 统计个人指定月份的用量",
    )
    parser.add_argument(
        "username",
        help="用户名（精确匹配）",
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


def fetch_report_user(conn: Any, username: str) -> ReportUser:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, username, display_name, job_title, department_name,
                   created_at, last_login_at
            FROM users
            WHERE username = %s
            """,
            (username,),
        )
        row = cur.fetchone()

    if row is None:
        raise SystemExit(f"未找到用户名：{username}")

    return ReportUser(
        id=int(row[0]),
        username=str(row[1] or ""),
        display_name=str(row[2] or ""),
        job_title=str(row[3] or ""),
        department_name=str(row[4] or ""),
        created_at=int(row[5] or 0),
        last_login_at=int(row[6] or 0),
    )


def format_token_amount(tokens: int) -> str:
    return f"{tokens / stats.TOKENS_PER_HUNDRED_MILLION:.2f} 亿"


def format_login_time(timestamp: int) -> str:
    if timestamp <= 0:
        return "从未登录"
    return datetime.fromtimestamp(timestamp, stats.CHINA_TIMEZONE).strftime(
        "%Y-%m-%d %H:%M:%S"
    )


def fetch_monthly_overview(
    conn: Any,
    username: str,
    start_ts: int,
    end_ts: int,
) -> MonthlyOverview:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COALESCE(SUM(token_used), 0), COALESCE(SUM(quota), 0)
            FROM quota_data
            WHERE username = %s
              AND created_at >= %s
              AND created_at <= %s
            """,
            (username, start_ts, end_ts),
        )
        totals = cur.fetchone()

        cur.execute(
            """
            SELECT model_name, SUM(token_used) AS total_tokens
            FROM quota_data
            WHERE username = %s
              AND created_at >= %s
              AND created_at <= %s
              AND model_name <> ''
            GROUP BY model_name
            ORDER BY total_tokens DESC, model_name ASC
            LIMIT 1
            """,
            (username, start_ts, end_ts),
        )
        top_model = cur.fetchone()

    return MonthlyOverview(
        total_tokens=int(totals[0] or 0),
        total_quota=int(totals[1] or 0),
        top_model=str(top_model[0]) if top_model else "无",
        top_model_tokens=int(top_model[1] or 0) if top_model else 0,
    )


def main() -> int:
    args = parse_args()
    username = args.username.strip()
    if not username:
        raise SystemExit("用户名不能为空。")

    start, end = stats.resolve_period(args.year, args.month)
    start_ts = int(start.timestamp())
    end_ts = int(end.timestamp())

    conn = psycopg2.connect(stats.DEFAULT_DSN)
    try:
        user = fetch_report_user(conn, username)
        if user.created_at > end_ts:
            raise SystemExit(
                f"用户 {user.username} 在统计周期结束后注册，本月无可统计数据。"
            )

        overview = fetch_monthly_overview(conn, user.username, start_ts, end_ts)
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
    finally:
        conn.close()

    total_cost = overview.total_quota / quota_per_unit * exchange_rate
    unit_price = (
        total_cost / overview.total_tokens * stats.TOKENS_PER_MILLION
        if overview.total_tokens > 0
        else 0.0
    )
    print(f"""AI 中转站个人月报｜{args.year} 年 {args.month} 月

姓名：{user.display_name or user.username}（ID：{user.id}）
岗位职级：{user.job_title or '-'}
部门：{user.department_name or '-'}
最后登录：{format_login_time(user.last_login_at)}
统计周期：{start.strftime('%Y-%m-%d')} 至 {end.strftime('%Y-%m-%d')}

Token 总量：{format_token_amount(overview.total_tokens)}
总费用：{total_cost:,.2f} 元
单价：{unit_price:,.2f} 元/百万 Token
最常用模型：{overview.top_model}（{format_token_amount(overview.top_model_tokens)} Token）""")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
