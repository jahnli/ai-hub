/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { ColumnDef } from "@tanstack/react-table";
import {
  CircleAlert,
  GitBranch,
  Globe,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { LongText } from "@/components/long-text";
import { StatusBadge, type StatusBadgeProps } from "@/components/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserProfileHoverCard } from "@/features/users/components/user-profile-hover-card";
import type { UserColumnRow } from "@/features/users/types";
import { getUserAvatarFallback, getUserAvatarStyle } from "@/lib/avatar";
import { stringToColor } from "@/lib/colors";
import { formatBillingCurrencyFromUSD } from "@/lib/currency";
import {
  formatLogQuota,
  formatTimestampToDate,
  formatUseTime,
} from "@/lib/format";
import { buildFeishuUserChatUrl, cn } from "@/lib/utils";
import { ROLE } from "@/lib/roles";
import { useAuthStore } from "@/stores/auth-store";

import { getUserInfo } from "../../api";
import { LOG_TYPE_ALL_VALUE, LOG_TYPE_ENUM } from "../../constants";
import type { UsageLog } from "../../data/schema";
import {
  formatModelName,
  getFirstResponseTimeColor,
  getResponseTimeColor,
  getTieredBillingSummary,
  hasAnyCacheTokens,
  isViolationFeeLog,
  parseLogOther,
  renderAuditContent,
} from "../../lib/format";
import {
  getLogTypeConfig,
  isDisplayableLogType,
  isPerCallBilling,
  isTimingLogType,
} from "../../lib/utils";
import type { LogOtherData } from "../../types";
import { DetailsDialog } from "../dialogs/details-dialog";
import { RequestContentDialog } from "../dialogs/request-content-dialog";
import { ModelBadge } from "../model-badge";
import {
  parseUserMessages,
  useRequestMessage,
} from "../request-messages-provider";
import { useUsageLogsContext } from "../usage-logs-provider";

interface DetailSegment {
  text: string;
  muted?: boolean;
  danger?: boolean;
}

function formatRatioCompact(ratio: number | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return "-";
  return ratio % 1 === 0
    ? String(ratio)
    : ratio.toFixed(4).replace(/\.?0+$/, "");
}

function getGroupRatioText(other: LogOtherData | null): string | null {
  const userGroupRatio = other?.user_group_ratio;
  if (
    userGroupRatio != null &&
    userGroupRatio !== -1 &&
    Number.isFinite(userGroupRatio)
  ) {
    return `${formatRatioCompact(userGroupRatio)}x`;
  }

  const groupRatio = other?.group_ratio;
  if (groupRatio != null && groupRatio !== 1 && Number.isFinite(groupRatio)) {
    return `${formatRatioCompact(groupRatio)}x`;
  }

  return null;
}

function getChannelBadgeVariant(
  channelId: string,
): StatusBadgeProps["variant"] {
  const generatedColor = stringToColor(channelId);
  if (generatedColor === "red") return "orange";
  if (generatedColor === "slate") return "neutral";
  return generatedColor;
}

function splitQuotaDisplay(value: string): { prefix: string; amount: string } {
  const match = value.match(/^([^0-9+\-.,\s]+)(.+)$/);
  if (!match) return { prefix: "", amount: value };
  return { prefix: match[1], amount: match[2] };
}

function buildDetailSegments(
  log: UsageLog,
  other: LogOtherData | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
  isAdmin = false,
): DetailSegment[] {
  const segments = buildTypeDetailSegments(log, other, t);
  if (isAdmin && other?.admin_info?.quota_saturation) {
    return [{ text: t("Quota clamped"), danger: true }, ...segments];
  }
  return segments;
}

function buildTypeDetailSegments(
  log: UsageLog,
  other: LogOtherData | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): DetailSegment[] {
  // Audit (type=3) and login (type=7) logs: render localized content from the
  // structured op descriptor instead of the raw (English-fallback) content.
  if (log.type === 3 || log.type === 7) {
    const text = renderAuditContent(other, t);
    return text ? [{ text }] : [];
  }

  if (log.type === 6) {
    return [{ text: t("Async task refund") }];
  }

  if (log.type !== 2) return [];

  const isViolation = isViolationFeeLog(other);
  if (isViolation) {
    const segments: DetailSegment[] = [];
    segments.push({ text: t("Violation Fee"), danger: true });
    if (other?.violation_fee_code) {
      segments.push({
        text: other.violation_fee_code,
        muted: true,
      });
    }
    segments.push({
      text: `${t("Fee")}: ${formatLogQuota(other?.fee_quota ?? log.quota)}`,
      muted: true,
    });
    return segments;
  }

  if (!other) return [];

  const segments: DetailSegment[] = [];

  const priceOpts = { digitsLarge: 4, digitsSmall: 6, abbreviate: false };
  const formatPrice = (price: number) =>
    `${formatBillingCurrencyFromUSD(price, priceOpts)}/M`;
  const formatPriceCompact = (price: number) =>
    formatBillingCurrencyFromUSD(price, priceOpts);
  const formatPriceList = (prices: string[], showUnit: boolean) => {
    const text = prices.join(" / ");
    return showUnit ? `${text}/M` : text;
  };
  const isTieredExpr = other.billing_mode === "tiered_expr";
  const tieredSummary = getTieredBillingSummary(other);
  if (isTieredExpr) {
    if (tieredSummary) {
      const baseEntries = tieredSummary.priceEntries
        .filter((entry) => ["inputPrice", "outputPrice"].includes(entry.field))
        .map((entry) => formatPriceCompact(entry.price));
      if (baseEntries.length > 0) {
        const tierLabel = tieredSummary.tier.label || t("Default");
        segments.push({
          text: `${tierLabel} · ${formatPriceList(baseEntries, true)}`,
        });
      }

      const cacheEntries = tieredSummary.priceEntries
        .filter((entry) =>
          ["cacheReadPrice", "cacheCreatePrice", "cacheCreate1hPrice"].includes(
            entry.field,
          ),
        )
        .map((entry) => {
          return formatPriceCompact(entry.price);
        });
      if (cacheEntries.length > 0) {
        segments.push({
          text: `${t("Cache")} ${formatPriceList(cacheEntries, false)}`,
          muted: true,
        });
      }

      const otherEntries = tieredSummary.priceEntries
        .filter(
          (entry) =>
            ![
              "inputPrice",
              "outputPrice",
              "cacheReadPrice",
              "cacheCreatePrice",
              "cacheCreate1hPrice",
            ].includes(entry.field),
        )
        .map((entry) => `${t(entry.shortLabel)} ${formatPrice(entry.price)}`);
      if (otherEntries.length > 0) {
        segments.push({
          text: otherEntries.join(" · "),
          muted: true,
        });
      }
    } else {
      segments.push({
        text: `${t("Dynamic Pricing")} · ${t("No matching results")}`,
        muted: true,
      });
    }
  } else {
    const isPerCall = isPerCallBilling(other.model_price);
    if (isPerCall) {
      const modelPrice = other.model_price ?? 0;
      segments.push({
        text: `${t("Per-call")} · ${formatBillingCurrencyFromUSD(modelPrice, priceOpts)}`,
      });
    } else if (other.model_ratio != null) {
      const inputPriceUSD = other.model_ratio * 2.0;
      const baseEntries = [formatPriceCompact(inputPriceUSD)];
      if (other.completion_ratio != null) {
        baseEntries.push(
          formatPriceCompact(inputPriceUSD * other.completion_ratio),
        );
      }
      segments.push({
        text: `${t("Standard")} · ${formatPriceList(baseEntries, true)}`,
      });

      if (hasAnyCacheTokens(other)) {
        const cacheEntries = [
          other.cache_ratio != null && other.cache_ratio !== 1
            ? formatPriceCompact(inputPriceUSD * other.cache_ratio)
            : null,
          other.cache_creation_ratio != null && other.cache_creation_ratio !== 1
            ? formatPriceCompact(inputPriceUSD * other.cache_creation_ratio)
            : null,
          other.cache_creation_ratio_1h != null &&
          other.cache_creation_ratio_1h !== 0
            ? formatPriceCompact(inputPriceUSD * other.cache_creation_ratio_1h)
            : null,
        ].filter(Boolean) as string[];

        if (cacheEntries.length > 0) {
          segments.push({
            text: `${t("Cache")} ${formatPriceList(cacheEntries, false)}`,
            muted: true,
          });
        }
      }
    } else {
      const userGroupRatio = other.user_group_ratio;
      const groupRatio = other.group_ratio;
      const isUserGroup =
        userGroupRatio != null &&
        Number.isFinite(userGroupRatio) &&
        userGroupRatio !== -1;
      const effectiveRatio = isUserGroup ? userGroupRatio : groupRatio;
      const ratioLabel = isUserGroup
        ? t("User Exclusive Ratio")
        : t("Group Ratio");

      if (effectiveRatio != null && Number.isFinite(effectiveRatio)) {
        segments.push({
          text: `${ratioLabel} ${formatRatioCompact(effectiveRatio)}x`,
        });
      }
    }
  }

  if (other.is_system_prompt_overwritten) {
    segments.push({
      text: t("System Prompt Override"),
      danger: true,
    });
  }

  return segments;
}

interface UseCommonLogsColumnsOptions {
  canFetchUserDetails?: boolean;
}

export function useCommonLogsColumns(
  isAdmin: boolean,
  options: UseCommonLogsColumnsOptions = {},
): ColumnDef<UsageLog>[] {
  const { t } = useTranslation();
  const currentUserRole = useAuthStore((state) => state.auth.user?.role);
  const isSuperAdmin = (currentUserRole ?? 0) >= ROLE.SUPER_ADMIN;
  const canFetchUserDetails = options.canFetchUserDetails ?? isAdmin;
  const columns: ColumnDef<UsageLog>[] = [
    {
      accessorKey: "created_at",
      header: t("Time"),
      cell: ({ row }) => {
        const log = row.original;
        const timestamp = row.getValue("created_at") as number;
        const config = getLogTypeConfig(log.type);

        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-mono text-xs tabular-nums">
              {formatTimestampToDate(timestamp)}
            </span>
            <StatusBadge
              label={t(config.label)}
              variant={config.color as StatusBadgeProps["variant"]}
              size="sm"
              copyable={false}
              className="!text-xs [&_span]:!text-xs"
            />
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        if (!Array.isArray(value) || value.length === 0) return true;
        if (value.includes(LOG_TYPE_ALL_VALUE)) return true;
        return value.includes(String(row.original.type));
      },
      enableHiding: false,
      size: 155,
    },
  ];

  if (isAdmin) {
    columns.push({
      id: "user",
      header: t("User"),
      accessorFn: (row) => row.username,
      cell: function UserCell({ row }) {
        const { sensitiveVisible } = useUsageLogsContext();
        const log = row.original;
        const [userData, setUserData] = useState<UserColumnRow | null>(null);
        const fetchedRef = useRef(false);

        const handleFetchUser = useCallback(() => {
          if (
            !canFetchUserDetails ||
            fetchedRef.current ||
            !sensitiveVisible
          ) {
            return;
          }
          fetchedRef.current = true;
          void getUserInfo(log.user_id).then((res) => {
            if (res.success && res.data) {
              const info = res.data;
              setUserData({
                id: info.id,
                username: info.username,
                display_name: info.display_name || info.username,
                email: info.email,
                avatar_url: info.avatar_url,
                remark: info.remark,
                quota: info.quota,
                used_quota: info.used_quota,
                sub_quota_used: 0,
                sub_quota_total: 0,
                request_count: info.request_count,
                group: info.group || "",
                status: info.status ?? 1,
                role: info.role ?? 1,
                department_name: info.department_name,
                custom_field_values: info.custom_field_values,
                join_date: info.join_date,
                job_number: info.job_number,
                job_title: info.job_title,
                description: info.description,
                background_image: info.background_image,
                mobile: info.mobile,
                open_id: info.open_id,
                gender: info.gender,
              });
            }
          });
        }, [log.user_id, sensitiveVisible]);

        if (!log.username) return null;

        if (!sensitiveVisible) {
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                  •
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <LongText className="max-w-full font-medium">••••</LongText>
              </div>
            </div>
          );
        }

        const primaryName = log.display_name || log.username;
        const avatarFallback = getUserAvatarFallback(primaryName);
        const avatarFallbackStyle = getUserAvatarStyle(primaryName);
        const feishuChatUrl = buildFeishuUserChatUrl(
          userData?.open_id ?? log.open_id,
        );

        const baseUser: UserColumnRow = userData ?? {
          id: log.user_id,
          username: log.username,
          display_name: log.display_name || log.username,
          avatar_url: log.avatar_url || undefined,
          quota: 0,
          used_quota: 0,
          sub_quota_used: 0,
          sub_quota_total: 0,
          request_count: 0,
          group: "",
          status: 1,
          role: 1,
          open_id: log.open_id || undefined,
          gender: log.gender,
        };

        const avatarEl = feishuChatUrl ? (
          <a
            href={feishuChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            <Avatar size="sm" className="shrink-0">
              {log.avatar_url && (
                <AvatarImage src={log.avatar_url} alt={primaryName} />
              )}
              <AvatarFallback
                className="text-xs font-medium text-white"
                style={avatarFallbackStyle}
              >
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          </a>
        ) : (
          <Avatar size="sm" className="shrink-0">
            {log.avatar_url && (
              <AvatarImage src={log.avatar_url} alt={primaryName} />
            )}
            <AvatarFallback
              className="text-xs font-medium text-white"
              style={avatarFallbackStyle}
            >
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        );

        const userAvatar = canFetchUserDetails ? (
          <UserProfileHoverCard user={baseUser}>{avatarEl}</UserProfileHoverCard>
        ) : (
          avatarEl
        );

        return (
          <div
            className="flex w-[120px] min-w-0 items-center gap-2"
            onMouseEnter={handleFetchUser}
          >
            {userAvatar}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <LongText className="max-w-full font-medium">
                {primaryName}
              </LongText>
              {log.display_name && log.display_name !== log.username ? (
                <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                  <LongText className="min-w-0 flex-1">{log.username}</LongText>
                </div>
              ) : null}
            </div>
          </div>
        );
      },
    });
  }

  columns.push(
    {
      accessorKey: "model_name",
      header: t("Model"),
      cell: function ModelCell({ row }) {
        const log = row.original;
        if (!isDisplayableLogType(log.type)) return null;

        const modelInfo = formatModelName(log);

        return (
          <div className="flex w-fit flex-col gap-0.5">
            <ModelBadge
              modelName={modelInfo.name}
              actualModel={modelInfo.actualModel}
              className="font-normal"
            />
          </div>
        );
      },
      meta: { mobileTitle: true },
      size: 180,
    },
    {
      accessorKey: "use_time",
      header: t("Timing / First Token"),
      cell: ({ row }) => {
        const log = row.original;
        if (!isTimingLogType(log.type)) return null;

        const useTime = row.getValue("use_time") as number;
        const other = parseLogOther(log.other);
        const frt = other?.frt;
        const tokensPerSecond =
          useTime > 0 && log.completion_tokens > 0
            ? log.completion_tokens / useTime
            : null;
        const timeVariant = getResponseTimeColor(
          useTime,
          log.completion_tokens,
        );
        const frtVariant = frt
          ? getFirstResponseTimeColor(frt / 1000)
          : "neutral";

        const timingBgMap: Record<string, string> = {
          success:
            "border border-emerald-200/40 bg-emerald-50/35 !text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/15 dark:!text-emerald-400",
          warning:
            "border border-amber-200/45 bg-amber-50/35 !text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/15 dark:!text-amber-400",
          danger:
            "border border-rose-200/50 bg-rose-50/35 !text-red-600 dark:border-rose-900/40 dark:bg-rose-950/15 dark:!text-red-400",
          neutral:
            "border border-border/60 bg-muted/30 dark:border-border/40 dark:bg-muted/20",
        };

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <StatusBadge
                label={formatUseTime(useTime)}
                variant={timeVariant as StatusBadgeProps["variant"]}
                size="sm"
                copyable={false}
                className={cn("rounded-md font-mono", timingBgMap[timeVariant])}
              />
              {log.is_stream &&
                (frt != null && frt > 0 ? (
                  <StatusBadge
                    label={formatUseTime(frt / 1000)}
                    variant={frtVariant as StatusBadgeProps["variant"]}
                    size="sm"
                    showDot={false}
                    copyable={false}
                    className={cn(
                      "rounded-md font-mono",
                      timingBgMap[frtVariant],
                    )}
                  />
                ) : (
                  <StatusBadge
                    label="N/A"
                    variant="neutral"
                    size="sm"
                    showDot={false}
                    copyable={false}
                    className={cn("rounded-md font-mono", timingBgMap.neutral)}
                  />
                ))}
            </div>
            <div className="flex items-center gap-1 [font-family:var(--font-body)] !text-xs leading-none">
              <span className="text-muted-foreground/60 [font-family:var(--font-body)] !text-xs leading-none">
                {log.is_stream ? t("Stream") : t("Non-stream")}
                {tokensPerSecond != null && (
                  <>
                    {" · "}
                    <span className="tabular-nums">
                      {Math.round(tokensPerSecond)}
                    </span>
                    {" t/s"}
                  </>
                )}
              </span>
              {log.is_stream &&
                other?.stream_status &&
                other.stream_status.status !== "ok" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={<CircleAlert className="size-3 text-red-500" />}
                      />
                      <TooltipContent>
                        <div className="space-y-0.5 text-xs">
                          <p>
                            {t("Stream Status")}: {t("Error")}
                          </p>
                          <p>{other.stream_status.end_reason || "unknown"}</p>
                          {(other.stream_status.error_count ?? 0) > 0 && (
                            <p>
                              {t("Soft Errors")}:{" "}
                              {other.stream_status.error_count}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
            </div>
          </div>
        );
      },
    },

    {
      accessorKey: "prompt_tokens",
      header: "Tokens",
      cell: ({ row }) => {
        const log = row.original;
        if (!isDisplayableLogType(log.type)) return null;

        const other = parseLogOther(log.other);

        const promptTokens = log.prompt_tokens || 0;
        const completionTokens = log.completion_tokens || 0;
        if (promptTokens === 0 && completionTokens === 0) {
          return <span className="text-muted-foreground text-xs">-</span>;
        }

        const cacheReadTokens = other?.cache_tokens || 0;
        const cacheWrite5m = other?.cache_creation_tokens_5m || 0;
        const cacheWrite1h = other?.cache_creation_tokens_1h || 0;
        const hasSplitCache = cacheWrite5m > 0 || cacheWrite1h > 0;
        const cacheWriteTokens = hasSplitCache
          ? cacheWrite5m + cacheWrite1h
          : other?.cache_creation_tokens || 0;

        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-medium tabular-nums">
              {promptTokens.toLocaleString()} /{" "}
              {completionTokens.toLocaleString()}
            </span>
            {(cacheReadTokens > 0 || cacheWriteTokens > 0) && (
              <div className="flex items-center gap-1 text-[11px]">
                {cacheReadTokens > 0 && (
                  <span className="text-muted-foreground/60">
                    {t("Cache")}↓ {cacheReadTokens.toLocaleString()}
                  </span>
                )}
                {cacheWriteTokens > 0 && (
                  <span className="text-muted-foreground/60">
                    ↑ {cacheWriteTokens.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },

    {
      accessorKey: "quota",
      header: t("Cost"),
      cell: ({ row }) => {
        const log = row.original;
        if (!isDisplayableLogType(log.type)) return null;

        const quota = row.getValue("quota") as number;
        const other = parseLogOther(log.other);
        const isSubscription = other?.billing_source === "subscription";

        const quotaStr = formatLogQuota(quota);
        const quotaDisplay = splitQuotaDisplay(quotaStr);
        const quotaNode = (
          <span className="border-border/80 bg-muted/60 inline-flex h-6 w-fit items-center rounded-md border px-2 [font-family:var(--font-body)] text-sm leading-none font-normal tabular-nums">
            {quotaDisplay.prefix && (
              <span className="mr-1">{quotaDisplay.prefix}</span>
            )}
            <span>{quotaDisplay.amount}</span>
          </span>
        );

        if (isSubscription) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<div className="w-fit cursor-help" />}>
                  {quotaNode}
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t("Subscription")}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return <div className="flex flex-col gap-0.5">{quotaNode}</div>;
      },
      size: 115,
      maxSize: 130,
    },
  );

  if (isAdmin) {
    columns.push({
      id: "channel",
      header: t("Channel"),
      accessorFn: (row) => row.channel,
      cell: function ChannelCell({ row }) {
        const { sensitiveVisible, setAffinityTarget, setAffinityDialogOpen } =
          useUsageLogsContext();
        const log = row.original;
        if (!isDisplayableLogType(log.type)) return null;
        const other = parseLogOther(log.other);
        const affinity = other?.admin_info?.channel_affinity;
        const rawUseChannel = other?.admin_info?.use_channel ?? [];
        const useChannel = Array.isArray(rawUseChannel)
          ? rawUseChannel.map(String).filter(Boolean)
          : [];
        const hasRetryChain = useChannel.length > 1;
        const channelChain = hasRetryChain ? useChannel.join(" → ") : undefined;
        const channelDisplay = log.channel_name
          ? `${log.channel_name} #${log.channel}`
          : `#${log.channel}`;
        const channelIdDisplay = `#${log.channel}`;
        const channelName = sensitiveVisible ? log.channel_name : "••••";
        const multiKeyIndex = other?.admin_info?.multi_key_index;
        const showMultiKeyIndex =
          other?.admin_info?.is_multi_key === true &&
          typeof multiKeyIndex === "number" &&
          Number.isFinite(multiKeyIndex);
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={<div className="flex max-w-[105px] flex-col gap-0.5" />}
              >
                <div className="relative inline-flex w-fit items-center gap-1">
                  <StatusBadge
                    label={channelIdDisplay}
                    variant={getChannelBadgeVariant(String(log.channel))}
                    copyText={String(log.channel)}
                    size="sm"
                    showDot={false}
                    className="font-mono"
                  />
                  {showMultiKeyIndex && (
                    <StatusBadge
                      label={String(multiKeyIndex)}
                      size="sm"
                      showDot={false}
                      copyable={false}
                      variant="neutral"
                      className="h-5 min-w-5 justify-center rounded-full px-1 font-mono text-xs"
                      aria-label={`${t("Key")} ${multiKeyIndex}`}
                    />
                  )}
                  {hasRetryChain && (
                    <Popover>
                      <PopoverTrigger
                        render={
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            aria-label={t("Retry Chain")}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                      >
                        <GitBranch
                          className="size-3.5 text-amber-500"
                          aria-hidden="true"
                        />
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="start"
                        className="w-64 text-xs"
                      >
                        <div className="flex flex-col gap-1">
                          <p className="font-medium">{t("Retry Chain")}</p>
                          <p className="text-muted-foreground font-mono break-all">
                            {channelChain}
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  {affinity && (
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 leading-none text-amber-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAffinityTarget({
                          rule_name: affinity.rule_name || "",
                          using_group:
                            affinity.using_group ||
                            affinity.selected_group ||
                            "",
                          key_hint: affinity.key_hint || "",
                          key_fp: affinity.key_fp || "",
                        });
                        setAffinityDialogOpen(true);
                      }}
                    >
                      <Sparkles className="size-3 fill-current" />
                    </button>
                  )}
                </div>
                {log.channel_name && (
                  <span className="text-muted-foreground/70 truncate [font-family:var(--font-body)] !text-xs">
                    {channelName}
                  </span>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p>{sensitiveVisible ? channelDisplay : channelIdDisplay}</p>
                  {channelChain && (
                    <p className="text-muted-foreground text-xs">
                      {t("Chain")}: {channelChain}
                    </p>
                  )}
                  {showMultiKeyIndex && (
                    <p className="text-muted-foreground text-xs">
                      {t("Key")}: {multiKeyIndex}
                    </p>
                  )}
                  {affinity && (
                    <div className="border-t pt-1 text-xs">
                      <p className="font-medium">{t("Channel Affinity")}</p>
                      <p>
                        {t("Rule")}: {affinity.rule_name || "-"}
                      </p>
                      <p>
                        {t("Group")}:{" "}
                        {sensitiveVisible
                          ? affinity.using_group ||
                            affinity.selected_group ||
                            "-"
                          : "••••"}
                      </p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 115,
      maxSize: 115,
    });
  }

  if (isSuperAdmin) {
    columns.push({
      id: "request_content",
      accessorFn: (row) => row.request_id,
      header: t("Request Content"),
      cell: function RequestContentCell({ row }) {
        const [dialogOpen, setDialogOpen] = useState(false);
        const { sensitiveVisible } = useUsageLogsContext();
        const log = row.original;
        const requestMessage = useRequestMessage(log.request_id);
        if (!sensitiveVisible) {
          return <span className="text-muted-foreground/40">••••</span>;
        }
        if (!requestMessage) {
          return <span className="text-muted-foreground/40">—</span>;
        }

        const userAgent = parseLogOther(log.other)?.user_agent;
        const messages = parseUserMessages(requestMessage.user_content);
        const latestMessage = messages.at(-1) ?? "";

        return (
          <>
            <button
              type="button"
              className="group flex max-w-[190px] min-w-0 items-center gap-1 text-left text-xs"
              onClick={() => setDialogOpen(true)}
              title={t("Click to view the full conversation")}
            >
              <span className="text-muted-foreground min-w-0 flex-1 truncate hover:underline">
                {latestMessage}
              </span>
              {messages.length > 1 && (
                <span className="text-muted-foreground/40 shrink-0">
                  +{messages.length - 1}
                </span>
              )}
            </button>
            <RequestContentDialog
              requestMessage={requestMessage}
              userAgent={userAgent ? String(userAgent) : undefined}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />
          </>
        );
      },
      size: 200,
      maxSize: 220,
    });

  }

  columns.push({
    id: "user_agent",
    accessorFn: (row) => parseLogOther(row.other)?.user_agent ?? "",
    header: t("User-Agent"),
    cell: function UserAgentCell({ row }) {
      const log = row.original;
      if (!isDisplayableLogType(log.type)) return null;

      const other = parseLogOther(log.other);
      const userAgent = other?.user_agent;
      if (!userAgent) {
        return <span className="text-muted-foreground/40">—</span>;
      }

      return (
        <TooltipProvider delay={300}>
          <Tooltip>
            <TooltipTrigger render={<div className="max-w-[180px]" />}>
              <span className="text-muted-foreground block truncate font-mono text-xs">
                {userAgent}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-md break-all font-mono text-xs"
            >
              {userAgent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    size: 180,
    maxSize: 220,
  });

  columns.push(
    {
      accessorKey: "ip",
      header: t("IP Address"),
      cell: function IpAddressCell({ row }) {
        const { sensitiveVisible } = useUsageLogsContext();
        const log = row.original;
        const ipAddress = log.ip;
        if (!ipAddress) return null;

        const displayIpAddress = sensitiveVisible ? ipAddress : "••••";

        return (
          <div className="flex max-w-[140px] flex-col gap-0.5">
            <TooltipProvider delay={300}>
              <Tooltip>
                <TooltipTrigger render={<div className="max-w-full" />}>
                  <StatusBadge
                    label={displayIpAddress}
                    icon={Globe}
                    copyText={sensitiveVisible ? ipAddress : undefined}
                    size="sm"
                    showDot={false}
                    className="border-border/60 bg-muted/30 text-foreground h-6 max-w-full gap-1.5 overflow-hidden rounded-md border px-2 py-0.5 font-mono"
                  />
                </TooltipTrigger>
                {sensitiveVisible && ipAddress.length > 15 && (
                  <TooltipContent side="top" className="max-w-xs break-all">
                    {ipAddress}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
      size: 130,
    },
    {
      accessorKey: "token_name",
      header: t("Token"),
      cell: function TokenNameCell({ row }) {
        const { sensitiveVisible } = useUsageLogsContext();
        const log = row.original;
        if (!isDisplayableLogType(log.type)) return null;
        const tokenName = log.token_name;
        if (!tokenName) return null;
        const other = parseLogOther(log.other);
        const displayName = sensitiveVisible ? tokenName : "••••";
        let group = log.group;
        if (!group) group = other?.group || "";
        const metaParts: string[] = [];
        const groupRatioText = getGroupRatioText(other);
        if (group) {
          metaParts.push(sensitiveVisible ? group : "••••");
        }
        if (groupRatioText) metaParts.push(groupRatioText);
        return (
          <div className="flex max-w-[105px] min-w-0 flex-col gap-0.5">
            <TooltipProvider delay={300}>
              <Tooltip>
                <TooltipTrigger render={<div className="max-w-full" />}>
                  <StatusBadge
                    label={displayName}
                    icon={KeyRound}
                    copyText={sensitiveVisible ? tokenName : undefined}
                    size="sm"
                    showDot={false}
                    className="border-border/60 bg-muted/30 text-foreground h-6 max-w-full gap-1.5 overflow-hidden rounded-md border px-2 py-0.5 [font-family:var(--font-body)] [&>span]:truncate"
                  />
                </TooltipTrigger>
                {sensitiveVisible && tokenName.length > 16 && (
                  <TooltipContent side="top" className="max-w-xs break-all">
                    {tokenName}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {metaParts.length > 0 && (
              <span className="text-muted-foreground/60 truncate [font-family:var(--font-body)] !text-xs">
                {metaParts.join(" · ")}
              </span>
            )}
          </div>
        );
      },
      size: 105,
      maxSize: 105,
    },
    {
      accessorKey: "content",
      header: t("Details"),
      cell: function DetailsCell({ row }) {
        const [dialogOpen, setDialogOpen] = useState(false);
        const log = row.original;
        const other = parseLogOther(log.other);

        const segments = buildDetailSegments(log, other, t);
        const primary = segments[0];
        const hasMore = segments.length > 1;
        const isErrorLog = log.type === LOG_TYPE_ENUM.ERROR;

        let primaryTextClassName = "text-foreground";
        if (primary?.muted) {
          primaryTextClassName = "text-muted-foreground/60";
        } else if (primary?.danger || isErrorLog) {
          primaryTextClassName = "text-red-600 dark:text-red-400";
        }
        let contentTextClassName = "text-muted-foreground";
        if (isErrorLog) {
          contentTextClassName = "text-red-600 dark:text-red-400";
        }
        let detailContent = <span className="text-muted-foreground/40">—</span>;
        if (log.content) {
          detailContent = (
            <span
              className={cn(
                "truncate hover:underline",
                contentTextClassName,
              )}
            >
              {log.content}
            </span>
          );
        }
        if (primary) {
          detailContent = (
            <span
              className={cn(
                "truncate leading-snug hover:underline",
                primaryTextClassName,
              )}
            >
              {primary.text}
              {hasMore && (
                <span className="text-muted-foreground/40 ml-0.5">
                  +{segments.length - 1}
                </span>
              )}
            </span>
          );
        }

        return (
          <>
            <button
              type="button"
              className="group flex max-w-[150px] items-center gap-1 text-left text-xs"
              onClick={() => setDialogOpen(true)}
              title={t("Click to view full details")}
            >
              {detailContent}
            </button>
            <DetailsDialog
              log={log}
              isAdmin={isAdmin}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />
          </>
        );
      },
      size: 155,
      maxSize: 175,
      meta: { pinned: "right" as const },
    },
  );

  return columns;
}
