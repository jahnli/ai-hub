#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AI 中转站周统计脚本"""

import sys
import io
import psycopg2
from datetime import datetime, timedelta, timezone

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DSN = "postgresql://admin:semitech@10.16.7.77:5432/postgres"

tz = timezone(timedelta(hours=8))
now = datetime.now(tz)

print("请选择统计周期：")
print("  1. 上周（上周一 ~ 上周日）")
print("  2. 本周（本周一 ~ 本周日）")
choice = input("请输入 1 或 2：").strip()

if choice == "2":
    monday = now - timedelta(days=now.weekday())
    label = "本周"
else:
    monday = now - timedelta(days=now.weekday() + 7)
    label = "上周"

week_start = monday.replace(hour=0, minute=0, second=0, microsecond=0)
week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)

start_ts = int(week_start.timestamp())
end_ts = int(week_end.timestamp())

conn = psycopg2.connect(DSN)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM users")
total_users = cur.fetchone()[0]

cur.execute("""
    SELECT
        COALESCE(SUM(prompt_tokens), 0) AS total_prompt,
        COALESCE(SUM(completion_tokens), 0) AS total_completion,
        COALESCE(SUM(quota), 0) AS total_quota,
        COUNT(*) AS total_requests,
        COALESCE(SUM(
            CASE
                WHEN other IS NOT NULL AND other != ''
                     AND (other::jsonb ? 'cache_tokens')
                THEN COALESCE((other::jsonb->>'cache_tokens')::bigint, 0)
                ELSE 0
            END
        ), 0) AS total_cache_tokens
    FROM logs
    WHERE type = 2
      AND created_at >= %s
      AND created_at <= %s
""", (start_ts, end_ts))

row = cur.fetchone()
total_prompt = int(row[0])
total_completion = int(row[1])
total_quota = int(row[2])
total_requests = int(row[3])
total_cache_tokens = int(row[4])

cur.close()
conn.close()

total_input_all = total_prompt + total_cache_tokens
total_tokens = total_prompt + total_completion

QUOTA_PER_UNIT = 500000.0
USD_RATE = 7.3
total_cost_usd = total_quota / QUOTA_PER_UNIT
total_cost_cny = total_cost_usd * USD_RATE

cost_per_m_token = (total_cost_cny / (total_tokens / 1_000_000)) if total_tokens > 0 else 0

cache_hit_rate = (total_cache_tokens / total_input_all * 100) if total_input_all > 0 else 0

def fmt_token(n):
    n = abs(n)
    if n >= 1_0000_0000:
        return f"{n / 1_0000_0000:.2f} 亿"
    elif n >= 1_0000:
        return f"{n / 1_0000:.2f} 万"
    else:
        return str(n)

def fmt_num(n):
    if n >= 1_0000:
        return f"{n / 1_0000:.2f} 万"
    else:
        return f"{n:,}"

print(f"""
AI 中转站{label}统计：
统计周期：{week_start.strftime('%Y-%m-%d %H:%M:%S')} － {week_end.strftime('%Y-%m-%d %H:%M:%S')}
总注册人数：{total_users} 人
总 Token 消耗：{fmt_token(total_tokens)}
总费用：{total_cost_cny:.2f} 元
平台请求：{fmt_num(total_requests)} 次
平均每百万 Token 成本约为 ￥{cost_per_m_token:.2f} / M Token

Token 明细：
  输入 Token：{fmt_token(total_prompt)}
  输出 Token：{fmt_token(total_completion)}
  缓存命中：{fmt_token(total_cache_tokens)}
  缓存命中率：{cache_hit_rate:.1f}%""")
