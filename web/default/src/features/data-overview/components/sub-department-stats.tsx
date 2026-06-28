import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { VChart } from "@visactor/react-vchart";
import { Building2, PieChart, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataTableView, useDataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartTheme } from "@/lib/use-chart-theme";
import { VCHART_OPTION } from "@/lib/vchart";
import type { SubDepartmentStat } from "../types";

interface SubDepartmentStatsProps {
  data: SubDepartmentStat[];
}

function formatQuota(quota: number): string {
  if (quota === 0) return "¥0";
  return "¥" + (quota / 500000).toFixed(2);
}

function formatTokens(tokens: number): string {
  if (tokens === 0) return "0";
  return (tokens / 1_0000_0000).toFixed(2) + " 亿";
}

function formatRequests(count: number): string {
  if (count >= 1_0000) return (count / 1_0000).toFixed(2) + " 万";
  return count.toLocaleString();
}

function useSubDepartmentColumns(): ColumnDef<SubDepartmentStat>[] {
  const { t } = useTranslation();

  return useMemo(
    (): ColumnDef<SubDepartmentStat>[] => [
      {
        accessorKey: "department_name",
        header: t("Department"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.department_name}</span>
        ),
        size: 200,
      },
      {
        id: "users",
        accessorFn: (row) => row.registered_users,
        header: t("Registered/Total"),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <span className="font-medium">{row.original.registered_users}</span>
            <span className="text-muted-foreground mx-0.5">/</span>
            <span className="text-muted-foreground">
              {row.original.total_users}
            </span>
          </div>
        ),
        size: 140,
      },
      {
        accessorKey: "total_tokens",
        header: t("Tokens"),
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono">
            {formatTokens(row.original.total_tokens)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "total_quota",
        header: t("Total Cost"),
        cell: ({ row }) => (
          <span className="font-medium font-mono">
            {formatQuota(row.original.total_quota)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "total_requests",
        header: t("Request Count"),
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono">
            {formatRequests(row.original.total_requests)}
          </span>
        ),
        size: 120,
      },
    ],
    [t],
  );
}

export function SubDepartmentStats(props: SubDepartmentStatsProps) {
  const { t } = useTranslation();
  const { resolvedTheme, themeReady } = useChartTheme();
  const columns = useSubDepartmentColumns();

  const sortedData = useMemo(
    () => [...props.data].sort((a, b) => b.total_quota - a.total_quota),
    [props.data],
  );

  const { table } = useDataTable({
    data: sortedData,
    columns,
    initialSorting: [{ id: "total_quota", desc: true }],
    withPaginationRowModel: false,
    withFilteredRowModel: false,
    withFacetedRowModel: false,
  });

  const totalCost = useMemo(
    () => sortedData.reduce((sum, i) => sum + i.total_quota / 500000, 0),
    [sortedData],
  );

  const barSpec = useMemo(
    () => ({
      type: "bar" as const,
      data: [
        {
          values: sortedData.map((item) => ({
            name: item.department_name,
            tokens: item.total_tokens,
            cost: item.total_quota / 500000,
          })),
        },
      ],
      direction: "horizontal" as const,
      xField: "tokens",
      yField: "name",
      label: {
        visible: true,
        position: "outside",
        formatMethod: (value: number) => formatTokens(value),
      },
      bar: { style: { cornerRadius: [4, 4, 4, 4] } },
      axes: [
        {
          orient: "left",
          type: "band",
          label: {
            style: { fontSize: 11 },
            formatMethod: (v: string) =>
              v.length > 10 ? v.slice(0, 10) + "…" : v,
          },
        },
        {
          orient: "bottom",
          type: "linear",
          label: {
            formatMethod: (v: number) => {
              if (v === 0) return "0";
              if (v >= 1_0000_0000) return (v / 1_0000_0000).toFixed(0) + " 亿";
              if (v >= 1_0000) return (v / 1_0000).toFixed(0) + " 万";
              return v.toLocaleString();
            },
          },
        },
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: "Tokens",
              value: (d: { tokens?: number }) => formatTokens(d.tokens ?? 0),
            },
            {
              key: t("Cost"),
              value: (d: { cost?: number }) => {
                const v = d.cost ?? 0;
                return v === 0 ? "¥0" : "¥" + v.toFixed(2);
              },
            },
          ],
        },
      },
      theme: resolvedTheme === "dark" ? "dark" : "light",
      background: "transparent",
    }),
    [sortedData, resolvedTheme, t],
  );

  const pieSpec = useMemo(
    () => ({
      type: "pie" as const,
      data: [
        {
          values: sortedData
            .filter((i) => i.total_quota > 0)
            .map((i) => ({
              name: i.department_name,
              value: i.total_quota / 500000,
            })),
        },
      ],
      valueField: "value",
      categoryField: "name",
      outerRadius: 0.8,
      innerRadius: 0.5,
      pie: {
        state: {
          hover: {
            outerRadius: 0.88,
            stroke: "#fff",
            lineWidth: 2,
          },
        },
      },
      animationAppear: {
        duration: 800,
        easing: "cubicOut",
        preset: "growRadiusIn",
      },
      label: {
        visible: true,
        position: "outside",
        formatMethod: (_: unknown, d: { name?: string }) => d.name ?? "",
      },
      tooltip: {
        mark: {
          content: [
            {
              key: (d: { name?: string }) => d.name ?? "",
              value: (d: { value?: number }) => {
                const v = d.value ?? 0;
                return v === 0 ? "¥0" : "¥" + v.toFixed(2);
              },
            },
          ],
        },
      },
      legends: {
        visible: true,
        orient: "bottom",
        type: "discrete",
        item: {
          label: {
            style: { fontSize: 11 },
            formatMethod: (label: string) =>
              label.length > 14 ? label.slice(0, 14) + "…" : label,
          },
        },
        autoPage: true,
      },
      theme: resolvedTheme === "dark" ? "dark" : "light",
      background: "transparent",
    }),
    [sortedData, resolvedTheme],
  );

  if (props.data.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="text-primary size-5" />
          {t("Sub-department Statistics")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Table */}
        <div className="px-2 pb-4">
          <DataTableView
            table={table}
            containerClassName="border-0 shadow-none"
            applyHeaderSize
          />
        </div>

        {/* Charts side by side */}
        <div className="grid grid-cols-1 border-t md:grid-cols-2">
          {/* Bar chart - consumption ranking */}
          <div className="md:border-r">
            <div className="flex items-center gap-2 px-5 py-3">
              <BarChart3 className="text-muted-foreground/60 size-4" />
              <span className="text-sm font-semibold">
                {t("Token Usage by Department")}
              </span>
            </div>
            <div
              className="p-2"
              style={{ height: Math.max(200, sortedData.length * 34) }}
            >
              {themeReady && (
                <VChart
                  key={`bar-${resolvedTheme}`}
                  spec={barSpec}
                  option={VCHART_OPTION}
                />
              )}
            </div>
          </div>
          {/* Pie chart - consumption share */}
          <div>
            <div className="flex items-center gap-2 border-t px-5 py-3 md:border-t-0">
              <PieChart className="text-muted-foreground/60 size-4" />
              <span className="text-sm font-semibold">
                {t("Department Consumption Share")}
              </span>
              <span className="text-muted-foreground ml-auto text-xs">
                {t("Total")}:{" "}
                {totalCost === 0 ? "¥0" : "¥" + totalCost.toFixed(2)}
              </span>
            </div>
            <div className="p-2" style={{ height: Math.max(300, sortedData.length * 34) }}>
              {themeReady && (
                <VChart
                  key={`pie-${resolvedTheme}`}
                  spec={pieSpec}
                  option={VCHART_OPTION}
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
