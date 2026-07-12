"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  CheckCircle,
  MapPin,
  Wrench,
  Navigation,
  Clock,
  Users,
  Activity,
  Plus,
  FileBarChart2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore, useAppStore } from "@/store";
import type { DashboardKPIs, TripStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";

/* ── Types ── */

interface RecentTrip {
  id: string;
  source: string;
  destination: string;
  status: TripStatus;
  createdAt: string;
  vehicle?: { regNumber: string; model: string; type: string };
  driver?: { name: string; contact: string };
}

interface MaintenanceItem {
  id: string;
  description: string;
  createdAt: string;
  vehicle?: { regNumber: string; model: string; type: string };
}

interface DashboardData {
  totalVehicles: number;
  availableVehicles: number;
  onTripVehicles: number;
  inShopVehicles: number;
  retiredVehicles: number;
  activeTrips: number;
  pendingTrips: number;
  completedTrips: number;
  driversOnDuty: number;
  driversAvailable: number;
  fleetUtilization: number;
  recentTrips: RecentTrip[];
  upcomingMaintenance: MaintenanceItem[];
}

/* ── Helpers ── */

function daysSince(dateStr: string): number {
  const created = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - created.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusColors: Record<TripStatus, string> = {
  Draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Dispatched:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

/* ── KPI Card ── */

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  iconBg: string;
  iconColor: string;
  suffix?: string;
}

function KPICard({ icon: Icon, label, value, iconBg, iconColor, suffix }: KPICardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight">
              {value}
              {suffix && (
                <span className="text-base font-medium text-muted-foreground">
                  {suffix}
                </span>
              )}
            </p>
            <p className="truncate text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Skeleton Grid ── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Skeletons */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-[88px]">
            <CardContent className="flex items-center gap-4 p-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fleet Utilization Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-3 w-full rounded-full" />
        </CardContent>
      </Card>

      {/* Table Skeletons */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Skeleton */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Circular Progress ── */

function CircularProgress({
  value,
  size = 80,
  strokeWidth = 7,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/40"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-emerald-500 transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

/* ── Main Dashboard ── */

export default function DashboardPage() {
  const { token } = useAuthStore();
  const { setCurrentPage } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive font-medium">{error || "No data available"}</p>
        <Button variant="outline" className="mt-4" onClick={fetchDashboard}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div data-tour="kpi-cards" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          icon={Truck}
          label="Total Vehicles"
          value={data.totalVehicles}
          iconBg="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-600 dark:text-slate-300"
        />
        <KPICard
          icon={CheckCircle}
          label="Available"
          value={data.availableVehicles}
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <KPICard
          icon={MapPin}
          label="On Trip"
          value={data.onTripVehicles}
          iconBg="bg-amber-100 dark:bg-amber-900/40"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <KPICard
          icon={Wrench}
          label="In Shop"
          value={data.inShopVehicles}
          iconBg="bg-red-100 dark:bg-red-900/40"
          iconColor="text-red-600 dark:text-red-400"
        />
        <KPICard
          icon={Navigation}
          label="Active Trips"
          value={data.activeTrips}
          iconBg="bg-teal-100 dark:bg-teal-900/40"
          iconColor="text-teal-600 dark:text-teal-400"
        />
        <KPICard
          icon={Clock}
          label="Pending Trips"
          value={data.pendingTrips}
          iconBg="bg-yellow-100 dark:bg-yellow-900/40"
          iconColor="text-yellow-600 dark:text-yellow-400"
        />
        <KPICard
          icon={Users}
          label="Drivers On Duty"
          value={data.driversOnDuty}
          iconBg="bg-cyan-100 dark:bg-cyan-900/40"
          iconColor="text-cyan-600 dark:text-cyan-400"
        />
        <KPICard
          icon={Activity}
          label="Fleet Utilization"
          value={data.fleetUtilization}
          suffix="%"
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* ── Fleet Utilization Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card data-tour="fleet-utilization">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Fleet Utilization</h3>
                <p className="text-sm text-muted-foreground">
                  {data.onTripVehicles} of {data.totalVehicles - data.retiredVehicles - data.inShopVehicles} operational vehicles active
                </p>
              </div>
              <div className="relative flex items-center justify-center">
                <CircularProgress value={data.fleetUtilization} />
                <span className="absolute text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {data.fleetUtilization}%
                </span>
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={data.fleetUtilization}
                className="h-3 [&>div]:bg-emerald-500"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recent Trips + Upcoming Maintenance ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Trips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card data-tour="recent-trips">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Recent Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentTrips.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No trips recorded yet.
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead className="hidden sm:table-cell">Vehicle</TableHead>
                        <TableHead className="hidden md:table-cell">Driver</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentTrips.map((trip) => (
                        <TableRow key={trip.id}>
                          <TableCell>
                            <span className="font-medium">
                              {trip.source}
                            </span>
                            <ArrowRight className="mx-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">
                              {trip.destination}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {trip.vehicle?.regNumber ?? "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {trip.driver?.name ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColors[trip.status]}
                            >
                              {trip.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {formatDate(trip.createdAt)}
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

        {/* Upcoming Maintenance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card data-tour="upcoming-maintenance">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Upcoming Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.upcomingMaintenance.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No active maintenance records.
                </p>
              ) : (
                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {data.upcomingMaintenance.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">
                          {m.vehicle?.regNumber ?? "Unknown Vehicle"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {m.description}
                        </p>
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                          {daysSince(m.createdAt)} day{daysSince(m.createdAt) !== 1 ? "s" : ""} since created
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card data-tour="quick-actions">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setCurrentPage("trips")}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Create Trip
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage("vehicles")}
              >
                <Truck className="h-4 w-4" />
                Add Vehicle
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage("reports")}
              >
                <FileBarChart2 className="h-4 w-4" />
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}