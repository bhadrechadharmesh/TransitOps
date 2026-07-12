"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import type { FuelLog, Vehicle } from "@/lib/types";
import { Plus, Fuel, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FuelForm from "./fuel-form";

export default function FuelPage() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [page, setPage] = useState(1);
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const [formOpen, setFormOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (vehicleFilter !== "All") params.set("vehicleId", vehicleFilter);

      const res = await fetch(`/api/fuel-logs?${params}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to fetch fuel logs");
      const data = await res.json();
      setLogs(data.data ?? data.fuelLogs ?? data.logs ?? []);
      setTotal(data.total ?? 0);
      setTotalCost(data.totalCost ?? 0);
    } catch {
      toast.error("Failed to load fuel logs");
    } finally {
      setLoading(false);
    }
  }, [token, page, vehicleFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!token) return;
    async function fetchVehicles() {
      try {
        const res = await fetch("/api/vehicles?limit=100", {
          headers: { Authorization: "Bearer " + token },
        });
        if (res.ok) {
          const data = await res.json();
          setVehicles(data.data ?? data.vehicles ?? []);
        }
      } catch {
        // ignore
      }
    }
    fetchVehicles();
  }, [token]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Calculate displayed total
  const displayedTotal = logs.reduce((sum, log) => sum + log.cost, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fuel Logs</h1>
          <p className="text-muted-foreground">
            Track fuel consumption and costs
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Add Fuel Log
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card data-tour="fuel-summary">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Fuel className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                KES {totalCost > 0 ? totalCost.toLocaleString() : displayedTotal.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Fuel Cost</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <TrendingUp className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <Select
            value={vehicleFilter}
            onValueChange={(v) => {
              setVehicleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="All">All Vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.regNumber} &middot; {v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${total} Log${total !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Liters</TableHead>
                  <TableHead className="text-right">Cost (KES)</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No fuel logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.vehicle?.regNumber ?? log.vehicleId.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-right">
                          {log.liters.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {log.cost.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {new Date(log.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length > 0 && (
                      <TableRow className="font-semibold bg-muted/30">
                        <TableCell colSpan={2} className="text-right">
                          Page Total:
                        </TableCell>
                        <TableCell className="text-right">
                          KES {displayedTotal.toLocaleString()}
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden p-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4 gap-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No fuel logs found.
              </div>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="p-4 gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {log.vehicle?.regNumber ?? log.vehicleId.slice(0, 8)}
                    </p>
                    <p className="font-semibold">
                      KES {log.cost.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{log.liters.toFixed(1)} liters</span>
                    <span>{new Date(log.date).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form */}
      <FuelForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchLogs}
      />
    </div>
  );
}