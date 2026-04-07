"use client";

import { RankRow } from "@/types";
import Badge from "./ui/Badge";
import DataTable, { Column } from "./ui/DataTable";

interface HeatRisersTableProps {
  rows: RankRow[];
}

export default function HeatRisersTable({ rows }: HeatRisersTableProps) {
  const shortMarketId = (marketId?: string) => (marketId ? `${marketId.slice(0, 8)}...` : "-");
  const marketDisplay = (row: RankRow) =>
    row.market_question ?? row.event_title ?? shortMarketId(row.market_id);

  const formatHeat = (value: unknown) => {
    const num = Number(value);
    if (isNaN(num)) return "-";
    return num.toFixed(2);
  };

  const getHeatLevel = (heat: number): "destructive" | "warning" | "info" | "muted" => {
    if (heat >= 3) return "destructive";
    if (heat >= 2) return "warning";
    if (heat >= 1) return "info";
    return "muted";
  };

  const columns: Column<RankRow>[] = [
    {
      key: "market_id",
      header: "Market",
      render: (_, row) => (
        <div className="leading-tight">
          <div className="text-sm font-medium truncate max-w-[300px]">{marketDisplay(row)}</div>
          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
            {row.event_title ?? "-"}
            {row.market_id ? ` · ${shortMarketId(row.market_id)}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "heat_rise",
      header: "Heat Rise",
      width: "140px",
      align: "right",
      render: (value) => {
        const heat = Number(value);
        const level = getHeatLevel(heat);
        const maxWidth = Math.min(heat * 25, 100);
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  level === "destructive"
                    ? "bg-destructive"
                    : level === "warning"
                    ? "bg-warning"
                    : level === "info"
                    ? "bg-info"
                    : "bg-muted-foreground"
                }`}
                style={{ width: `${maxWidth}%` }}
              />
            </div>
            <span className="font-mono text-sm w-10 text-right">{formatHeat(value)}</span>
          </div>
        );
      },
    },
    {
      key: "alert",
      header: "Alert",
      width: "80px",
      align: "center",
      render: (_, row) => {
        const heat = Number(row.heat_rise || 0);
        if (heat >= 2) {
          return (
            <Badge variant="warning" size="sm">
              z&gt;2
            </Badge>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      },
    },
  ];

  return (
    <div className="card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Heat Risers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Markets with unusual activity spikes
          </p>
        </div>
        <Badge variant="muted">{rows.length} markets</Badge>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        showIndex
        maxHeight="280px"
        emptyMessage="No heat risers detected"
      />
    </div>
  );
}
