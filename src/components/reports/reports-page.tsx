"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Fuel,
  DollarSign,
  BarChart3,
  ArrowUpDown,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

/* ── Types ── */

interface FuelEfficiencyItem {
  tripId: string;
  vehicleRegNumber: string;
  vehicleModel: string;
  vehicleType: string;
  actualDistance: number;
  fuelConsumed: number;
  efficiency: number;
}

interface OperationalCostItem {
  vehicleId: string;
  regNumber: string;
  model: string;
  type: string;
  fuelCost: number;
  maintenanceCost: number;
  expenseCost: number;
  totalCost: number;
}

interface VehicleROIItem {
  vehicleId: string;
  regNumber: string;
  model: string;
  type: string;
  acquisitionCost: number;
  totalRevenue: number;
  totalMaintenanceCost: number;
  totalFuelCost: number;
  totalExpenses: number;
  netProfit: number;
  roi: number;
}

interface ReportsData {
  fuelEfficiency: FuelEfficiencyItem[];
  operationalCosts: OperationalCostItem[];
  vehicleROI: VehicleROIItem[];
  monthlyTrips: { month: string; count: number }[];
  monthlyFuelCost: { month: string; cost: number }[];
}

/* ── Chart tooltip style ── */

function ChartTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
  valueLabel = "Value",
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  valueSuffix?: string;
  valueLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      {label && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          {valueSuffix}
        </p>
      ))}
    </div>
  );
}

/* ── Skeleton ── */

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>

      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── CSV Export ── */

function exportOperationalCostsCSV(costs: OperationalCostItem[]) {
  const headers = [
    "Vehicle Reg",
    "Model",
    "Type",
    "Fuel Cost (TZS)",
    "Maintenance Cost (TZS)",
    "Other Expenses (TZS)",
    "Total Cost (TZS)",
  ];
  const rows = costs.map((c) =>
    [
      c.regNumber,
      c.model,
      c.type,
      c.fuelCost,
      c.maintenanceCost,
      c.expenseCost,
      c.totalCost,
    ]
      .map((v) => `"${v}"`)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `operational-costs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Sort helpers for ROI ── */

type SortDir = "asc" | "desc";

/* ── Main Reports Page ── */

export default function ReportsPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roiSortDir, setRoiSortDir] = useState<SortDir>("desc");

  const fetchReports = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/reports", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load reports");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) return <ReportsSkeleton />;

  if (error || !data) {
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive font-medium">{error || "No data available"}</p>
        <Button variant="outline" className="mt-4" onClick={fetchReports}>
          Retry
        </Button>
      </Card>
    );
  }

  // ── Derived data ──

  const totalOperationalCost = data.operationalCosts.reduce(
    (sum, c) => sum + c.totalCost,
    0
  );
  const avgFuelEfficiency =
    data.fuelEfficiency.length > 0
      ? data.fuelEfficiency.reduce((sum, f) => sum + f.efficiency, 0) /
        data.fuelEfficiency.length
      : 0;
  const totalRevenue = data.vehicleROI.reduce(
    (sum, v) => sum + v.totalRevenue,
    0
  );
  const avgROI =
    data.vehicleROI.length > 0
      ? data.vehicleROI.reduce((sum, v) => sum + v.roi, 0) /
        data.vehicleROI.length
      : 0;

  // Fuel efficiency chart data
  const fuelEffChartData = data.fuelEfficiency.map((f) => ({
    name: `${f.vehicleRegNumber} — ${f.vehicleModel}`,
    efficiency: Math.round(f.efficiency * 100) / 100,
    fill:
      f.efficiency > 8
        ? "#10b981"
        : f.efficiency >= 5
          ? "#f59e0b"
          : "#ef4444",
  }));

  // Operational costs chart data
  const opCostChartData = data.operationalCosts.map((c) => ({
    name: c.regNumber,
    "Fuel Cost": c.fuelCost,
    "Maintenance Cost": c.maintenanceCost,
    "Other Expenses": c.expenseCost,
  }));

  // ROI sorted data
  const sortedROI = [...data.vehicleROI].sort((a, b) =>
    roiSortDir === "desc" ? b.roi - a.roi : a.roi - b.roi
  );

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Fleet performance insights and operational analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportOperationalCostsCSV(data.operationalCosts);
              toast.success("CSV exported successfully");
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("PDF export coming soon")}
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* ── Section 1 & 2: Monthly Trip Trends + Monthly Fuel Cost ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trips Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                Monthly Trip Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthlyTrips}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    content={<ChartTooltip valueSuffix=" trips" />}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  />
                  <Bar
                    dataKey="count"
                    name="Trips"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Fuel Cost Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fuel className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                Monthly Fuel Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.monthlyFuelCost}>
                  <defs>
                    <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(v: number) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(1)}M`
                        : v >= 1000
                          ? `${(v / 1000).toFixed(0)}K`
                          : v
                    }
                  />
                  <Tooltip
                    content={<ChartTooltip valueSuffix=" TZS" />}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    name="Fuel Cost"
                    stroke="#10b981"
                    fill="url(#fuelGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Section 3: Fuel Efficiency (Horizontal Bar Chart) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              Fuel Efficiency (km/L)
              <span className="ml-2 flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> &gt;8 km/L
                <span className="ml-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" /> 5–8 km/L
                <span className="ml-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-500" /> &lt;5 km/L
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fuelEffChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No completed trip data available for fuel efficiency analysis.
              </p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <ResponsiveContainer width="100%" height={Math.max(300, fuelEffChartData.length * 45)}>
                  <BarChart
                    data={fuelEffChartData}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={200}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={<ChartTooltip valueSuffix=" km/L" />}
                    />
                    <Bar
                      dataKey="efficiency"
                      name="Efficiency (km/L)"
                      radius={[0, 4, 4, 0]}
                    >
                      {fuelEffChartData.map((entry, index) => (
                        <rect key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Section 4: Operational Costs (Grouped/Stacked Bar) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              Operational Costs by Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={opCostChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(v: number) =>
                    v >= 1000000
                      ? `${(v / 1000000).toFixed(1)}M`
                      : v >= 1000
                        ? `${(v / 1000).toFixed(0)}K`
                        : v
                  }
                />
                <Tooltip
                  content={<ChartTooltip valueSuffix=" TZS" />}
                />
                <Legend />
                <Bar
                  dataKey="Fuel Cost"
                  stackId="costs"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Maintenance Cost"
                  stackId="costs"
                  fill="#f59e0b"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Other Expenses"
                  stackId="costs"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Section 5: Vehicle ROI Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              Vehicle Return on Investment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedROI.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No ROI data available.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Maintenance</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Fuel</TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-7 gap-1 text-xs font-medium"
                          onClick={() =>
                            setRoiSortDir((d) => (d === "desc" ? "asc" : "desc"))
                          }
                        >
                          ROI %
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedROI.map((v) => (
                      <TableRow key={v.vehicleId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{v.regNumber}</p>
                            <p className="text-xs text-muted-foreground">{v.model}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {v.type}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {v.totalRevenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                          {v.totalMaintenanceCost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell text-muted-foreground">
                          {v.totalFuelCost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                              v.roi >= 0
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                            }`}
                          >
                            {v.roi >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {v.roi.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Section 6: Summary Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Operational Cost</p>
              <p className="mt-1 text-2xl font-bold">
                {totalOperationalCost >= 1000000
                  ? `${(totalOperationalCost / 1000000).toFixed(1)}M`
                  : totalOperationalCost >= 1000
                    ? `${(totalOperationalCost / 1000).toFixed(0)}K`
                    : totalOperationalCost.toLocaleString()}
                <span className="ml-1 text-sm font-normal text-muted-foreground">TZS</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Avg Fuel Efficiency</p>
              <p className="mt-1 text-2xl font-bold">
                {avgFuelEfficiency.toFixed(2)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">km/L</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold">
                {totalRevenue >= 1000000
                  ? `${(totalRevenue / 1000000).toFixed(1)}M`
                  : totalRevenue >= 1000
                    ? `${(totalRevenue / 1000).toFixed(0)}K`
                    : totalRevenue.toLocaleString()}
                <span className="ml-1 text-sm font-normal text-muted-foreground">TZS</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Average ROI</p>
              <p className="mt-1 flex items-center gap-1.5">
                <span className="text-2xl font-bold">{avgROI.toFixed(1)}%</span>
                {avgROI >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}