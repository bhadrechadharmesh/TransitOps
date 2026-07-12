"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import type { MaintenanceRecord, MaintenanceStatus, Vehicle } from "@/lib/types";
import { Plus, Wrench, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MaintenanceForm from "./maintenance-form";

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  switch (status) {
    case "Active":
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
          Active
        </Badge>
      );
    case "Closed":
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
          Closed
        </Badge>
      );
  }
}

export default function MaintenancePage() {
  const { token } = useAuthStore();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const [formOpen, setFormOpen] = useState(false);

  // Close confirm
  const [closeOpen, setCloseOpen] = useState(false);
  const [closingRecord, setClosingRecord] = useState<MaintenanceRecord | null>(null);
  const [closing, setClosing] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (vehicleFilter !== "All") params.set("vehicleId", vehicleFilter);

      const res = await fetch(`/api/maintenance?${params}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to fetch maintenance records");
      const data = await res.json();
      setRecords(data.data ?? data.maintenance ?? []);
      setTotal(data.total ?? 0);

      // Fetch counts
      const [activeRes, closedRes] = await Promise.all([
        fetch("/api/maintenance?status=Active&limit=1", {
          headers: { Authorization: "Bearer " + token },
        }),
        fetch("/api/maintenance?status=Closed&limit=1", {
          headers: { Authorization: "Bearer " + token },
        }),
      ]);
      if (activeRes.ok) {
        const ad = await activeRes.json();
        setActiveCount(ad.total ?? 0);
      }
      if (closedRes.ok) {
        const cd = await closedRes.json();
        setClosedCount(cd.total ?? 0);
      }
    } catch {
      toast.error("Failed to load maintenance records");
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, vehicleFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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

  function openClose(record: MaintenanceRecord) {
    setClosingRecord(record);
    setCloseOpen(true);
  }

  async function confirmClose() {
    if (!closingRecord || !token) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/maintenance/${closingRecord.id}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "close" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to close maintenance record");
      }
      toast.success("Maintenance closed. Vehicle is now Available.");
      setCloseOpen(false);
      fetchRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close");
    } finally {
      setClosing(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Records</h1>
          <p className="text-muted-foreground">
            Track vehicle servicing and repairs
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Add Record
        </Button>
      </div>

      {/* Summary */}
      <div data-tour="maintenance-summary" className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Wrench className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <Wrench className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{closedCount}</p>
              <p className="text-sm text-muted-foreground">Closed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={vehicleFilter}
              onValueChange={(v) => {
                setVehicleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-52">
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
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${total} Record${total !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Closed At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No maintenance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">
                        {rec.vehicle?.regNumber ?? rec.vehicleId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {rec.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {rec.cost > 0
                          ? `KES ${rec.cost.toLocaleString()}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={rec.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {rec.closedAt
                          ? new Date(rec.closedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {rec.status === "Active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openClose(rec)}
                          >
                            Close
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
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
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-24" />
                </Card>
              ))
            ) : records.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No maintenance records found.
              </div>
            ) : (
              records.map((rec) => (
                <Card key={rec.id} className="p-4 gap-3">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">
                      {rec.vehicle?.regNumber ?? rec.vehicleId.slice(0, 8)}
                    </p>
                    <StatusBadge status={rec.status} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {rec.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {rec.cost > 0 ? `KES ${rec.cost.toLocaleString()}` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {rec.status === "Active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openClose(rec)}
                    >
                      Close Maintenance
                    </Button>
                  )}
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
      <MaintenanceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchRecords}
      />

      {/* Close Confirm */}
      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Maintenance Record?</AlertDialogTitle>
            <AlertDialogDescription>
              {closingRecord && (
                <>
                  Vehicle{" "}
                  <strong>
                    {closingRecord.vehicle?.regNumber ??
                      closingRecord.vehicleId.slice(0, 8)}
                  </strong>{" "}
                  will be restored to <strong>Available</strong> status.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClose}
              disabled={closing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {closing && <Loader2 className="animate-spin" />}
              Close Maintenance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}