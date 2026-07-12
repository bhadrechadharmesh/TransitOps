"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import type { Trip, TripStatus } from "@/lib/types";
import { Plus, Search, Pencil, Play, CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import TripForm from "./trip-form";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All Statuses" },
  { value: "Draft", label: "Draft" },
  { value: "Dispatched", label: "Dispatched" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

function StatusBadge({ status }: { status: TripStatus }) {
  switch (status) {
    case "Draft":
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">
          Draft
        </Badge>
      );
    case "Dispatched":
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
          Dispatched
        </Badge>
      );
    case "Completed":
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
          Completed
        </Badge>
      );
    case "Cancelled":
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
          Cancelled
        </Badge>
      );
  }
}

export default function TripsPage() {
  const { token } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 10;

  // Form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Complete dialog
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState<Trip | null>(null);
  const [actualDistance, setActualDistance] = useState("");
  const [fuelConsumed, setFuelConsumed] = useState("");
  const [finalOdometer, setFinalOdometer] = useState("");
  const [completing, setCompleting] = useState(false);

  // Dispatch confirm
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchingTrip, setDispatchingTrip] = useState<Trip | null>(null);
  const [dispatching, setDispatching] = useState(false);

  // Cancel confirm
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancellingTrip, setCancellingTrip] = useState<Trip | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchTrips = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/trips?${params}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to fetch trips");
      const data = await res.json();
      setTrips(data.data ?? data.trips ?? []);
      setTotal(data.total ?? data.data?.length ?? 0);
    } catch {
      toast.error("Failed to load trips");
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, search]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  function resetFilters() {
    setStatusFilter("All");
    setSearch("");
    setPage(1);
  }

  // ── Dispatch ──
  function openDispatch(trip: Trip) {
    setDispatchingTrip(trip);
    setDispatchOpen(true);
  }

  async function confirmDispatch() {
    if (!dispatchingTrip || !token) return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/trips/${dispatchingTrip.id}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "dispatch" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to dispatch trip");
      }
      toast.success("Trip dispatched successfully");
      setDispatchOpen(false);
      fetchTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dispatch failed");
    } finally {
      setDispatching(false);
    }
  }

  // ── Complete ──
  function openComplete(trip: Trip) {
    setCompletingTrip(trip);
    setActualDistance(String(trip.plannedDistance));
    setFuelConsumed("");
    setFinalOdometer(trip.vehicle?.odometer ? String(trip.vehicle.odometer + trip.plannedDistance) : "");
    setCompleteOpen(true);
  }

  async function confirmComplete() {
    if (!completingTrip || !token) return;
    const dist = parseFloat(actualDistance);
    const fuel = parseFloat(fuelConsumed);
    const odo = parseFloat(finalOdometer);
    if (isNaN(dist) || dist <= 0) {
      toast.error("Actual distance is required");
      return;
    }
    if (isNaN(fuel) || fuel <= 0) {
      toast.error("Fuel consumed is required");
      return;
    }
    if (isNaN(odo) || odo <= 0) {
      toast.error("Final odometer is required");
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch(`/api/trips/${completingTrip.id}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "complete",
          actualDistance: dist,
          fuelConsumed: fuel,
          finalOdometer: odo,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to complete trip");
      }
      toast.success("Trip completed successfully");
      setCompleteOpen(false);
      fetchTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete trip");
    } finally {
      setCompleting(false);
    }
  }

  // ── Cancel ──
  function openCancel(trip: Trip) {
    setCancellingTrip(trip);
    setCancelOpen(true);
  }

  async function confirmCancel() {
    if (!cancellingTrip || !token) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/trips/${cancellingTrip.id}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to cancel trip");
      }
      toast.success("Trip cancelled");
      setCancelOpen(false);
      fetchTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  // ── Edit ──
  function openEdit(trip: Trip) {
    setEditingTrip(trip);
    setFormOpen(true);
  }

  function openNew() {
    setEditingTrip(null);
    setFormOpen(true);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trip Management</h1>
          <p className="text-muted-foreground">
            Plan, dispatch, and track fleet trips
          </p>
        </div>
        <Button data-tour="trip-new-btn" onClick={openNew}>
          <Plus className="size-4" />
          New Trip
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by source, destination, ID..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(statusFilter !== "All" || search.trim()) && (
              <Button variant="ghost" onClick={resetFilters}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card data-tour="trip-workflow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${total} Trip${total !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Cargo (kg)</TableHead>
                  <TableHead className="text-right">Distance (km)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : trips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No trips found.
                    </TableCell>
                  </TableRow>
                ) : (
                  trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-mono text-xs">
                        {trip.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{trip.source}</span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span className="font-medium">{trip.destination}</span>
                      </TableCell>
                      <TableCell>
                        {trip.vehicle?.regNumber ?? trip.vehicleId.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {trip.driver?.name ?? trip.driverId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-right">
                        {trip.cargoWeight.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {trip.plannedDistance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={trip.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(trip.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {trip.status === "Draft" && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => openEdit(trip)} title="Edit">
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openDispatch(trip)} title="Dispatch">
                                <Play className="size-3.5 text-amber-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openCancel(trip)} title="Cancel">
                                <XCircle className="size-3.5 text-red-500" />
                              </Button>
                            </>
                          )}
                          {trip.status === "Dispatched" && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => openComplete(trip)} title="Complete">
                                <CheckCircle className="size-3.5 text-emerald-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openCancel(trip)} title="Cancel">
                                <XCircle className="size-3.5 text-red-500" />
                              </Button>
                            </>
                          )}
                          {(trip.status === "Completed" || trip.status === "Cancelled") && (
                            <Button size="sm" variant="ghost" title="View details">
                              <Eye className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden p-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4 gap-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </Card>
              ))
            ) : trips.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No trips found.
              </div>
            ) : (
              trips.map((trip) => (
                <Card key={trip.id} className="p-4 gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {trip.source} → {trip.destination}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {trip.id.slice(0, 8)}
                      </p>
                    </div>
                    <StatusBadge status={trip.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Vehicle: </span>
                      {trip.vehicle?.regNumber ?? trip.vehicleId.slice(0, 8)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Driver: </span>
                      {trip.driver?.name ?? trip.driverId.slice(0, 8)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cargo: </span>
                      {trip.cargoWeight.toLocaleString()} kg
                    </div>
                    <div>
                      <span className="text-muted-foreground">Distance: </span>
                      {trip.plannedDistance.toLocaleString()} km
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {trip.status === "Draft" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEdit(trip)}>
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openDispatch(trip)}>
                          <Play className="size-3.5" /> Dispatch
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openCancel(trip)}>
                          <XCircle className="size-3.5 text-red-500" />
                        </Button>
                      </>
                    )}
                    {trip.status === "Dispatched" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openComplete(trip)}>
                          <CheckCircle className="size-3.5" /> Complete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openCancel(trip)}>
                          <XCircle className="size-3.5 text-red-500" />
                        </Button>
                      </>
                    )}
                    {(trip.status === "Completed" || trip.status === "Cancelled") && (
                      <Button size="sm" variant="ghost">
                        <Eye className="size-3.5" /> View
                      </Button>
                    )}
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

      {/* Trip Form Dialog */}
      <TripForm
        open={formOpen}
        onOpenChange={setFormOpen}
        trip={editingTrip}
        onSuccess={fetchTrips}
      />

      {/* Dispatch Confirm */}
      <AlertDialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispatch this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              {dispatchingTrip && (
                <>
                  Trip <span className="font-mono">{dispatchingTrip.id.slice(0, 8)}</span>:{" "}
                  <strong>{dispatchingTrip.source} → {dispatchingTrip.destination}</strong>
                  <br />
                  Vehicle{" "}
                  <strong>
                    {dispatchingTrip.vehicle?.regNumber}
                  </strong>{" "}
                  and driver{" "}
                  <strong>
                    {dispatchingTrip.driver?.name}
                  </strong>{" "}
                  will be marked as <strong>On Trip</strong>.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dispatching}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDispatch}
              disabled={dispatching}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {dispatching && <Loader2 className="animate-spin" />}
              Dispatch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Trip</DialogTitle>
            <DialogDescription>
              {completingTrip && (
                <>
                  <span className="font-mono">{completingTrip.id.slice(0, 8)}</span>:{" "}
                  {completingTrip.source} → {completingTrip.destination}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="actualDistance">Actual Distance (km) *</Label>
              <Input
                id="actualDistance"
                type="number"
                min="1"
                step="1"
                value={actualDistance}
                onChange={(e) => setActualDistance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuelConsumed">Fuel Consumed (liters) *</Label>
              <Input
                id="fuelConsumed"
                type="number"
                min="0.1"
                step="0.1"
                value={fuelConsumed}
                onChange={(e) => setFuelConsumed(e.target.value)}
                placeholder="e.g. 45.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalOdometer">Final Odometer (km) *</Label>
              <Input
                id="finalOdometer"
                type="number"
                min="1"
                step="1"
                value={finalOdometer}
                onChange={(e) => setFinalOdometer(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={completing}>
              Cancel
            </Button>
            <Button onClick={confirmComplete} disabled={completing}>
              {completing && <Loader2 className="animate-spin" />}
              Complete Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellingTrip && (
                <>
                  Trip <span className="font-mono">{cancellingTrip.id.slice(0, 8)}</span>:{" "}
                  <strong>{cancellingTrip.source} → {cancellingTrip.destination}</strong>
                  {cancellingTrip.status === "Dispatched" && (
                    <>
                      <br />
                      The vehicle and driver will be restored to{" "}
                      <strong>Available</strong> status.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Trip</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelling && <Loader2 className="animate-spin" />}
              Cancel Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}