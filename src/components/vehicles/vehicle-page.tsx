"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Vehicle, VehicleType, VehicleStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import VehicleForm from "./vehicle-form";

const ITEMS_PER_PAGE = 10;

const typeOptions: ("All" | VehicleType)[] = [
  "All",
  "Truck",
  "Van",
  "Bus",
  "Pickup",
  "Tanker",
];

const statusOptions: ("All" | VehicleStatus)[] = [
  "All",
  "Available",
  "On Trip",
  "In Shop",
  "Retired",
];

function statusBadge(status: VehicleStatus) {
  const styles: Record<VehicleStatus, string> = {
    Available:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    "On Trip":
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    "In Shop":
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
    Retired:
      "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {status}
    </Badge>
  );
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  );
}

export default function VehiclesPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isFleetManager = user?.role === "Fleet Manager";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchRef = useRef(search);

  const fetchVehicles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      if (searchRef.current) params.set("search", searchRef.current);
      if (typeFilter !== "All") params.set("type", typeFilter);
      if (statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`/api/vehicles?${params}`, {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      if (res.ok) {
        setVehicles(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, token, toast]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchRef.current = val;
      setPage(1);
    }, 300);
  }

  function handleTypeChange(val: string) {
    setTypeFilter(val);
    setPage(1);
  }

  function handleStatusChange(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  function openEdit(v: Vehicle) {
    setEditVehicle(v);
    setFormOpen(true);
  }

  function openAdd() {
    setEditVehicle(null);
    setFormOpen(true);
  }

  function handleFormSuccess() {
    setEditVehicle(null);
    fetchVehicles();
  }

  async function handleDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vehicles/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) {
        const data = await res.json();
        toast({
          title: "Delete Failed",
          description: data.error || "Could not delete vehicle",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Vehicle Deleted",
          description: `${deleteTarget.regNumber} has been removed.`,
        });
        fetchVehicles();
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicle Registry</h1>
          <p className="text-sm text-muted-foreground">
            Manage your fleet vehicles
          </p>
        </div>
        {isFleetManager && (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by registration number or model..."
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        isMobile ? (
          <SkeletonCards />
        ) : (
          <Card>
            <CardContent className="p-0">
              <SkeletonTable />
            </CardContent>
          </Card>
        )
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Truck className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">No vehicles found</p>
            <p className="text-sm text-muted-foreground/70">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Mobile card layout */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {vehicles.map((v) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {v.regNumber}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {v.model}
                        </p>
                      </div>
                      {statusBadge(v.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type</span>
                        <p className="font-medium">{v.type}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Capacity</span>
                        <p className="font-medium">{formatNumber(v.maxCapacity)} kg</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Odometer</span>
                        <p className="font-medium">{formatNumber(v.odometer)} km</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost</span>
                        <p className="font-medium">UGX {formatNumber(v.acquisitionCost)}</p>
                      </div>
                    </div>
                    {isFleetManager && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => openEdit(v)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(v)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Desktop table layout */
        <Card data-tour="vehicle-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reg Number</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Capacity (kg)</TableHead>
                    <TableHead className="text-right">Odometer (km)</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                    {isFleetManager && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {vehicles.map((v) => (
                      <motion.tr
                        key={v.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <TableCell className="font-medium">
                          {v.regNumber}
                        </TableCell>
                        <TableCell>{v.model}</TableCell>
                        <TableCell>{v.type}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(v.maxCapacity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(v.odometer)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          UGX {formatNumber(v.acquisitionCost)}
                        </TableCell>
                        <TableCell>{statusBadge(v.status)}</TableCell>
                        {isFleetManager && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(v)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteTarget(v)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <p>
            Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}–
            {Math.min(page * ITEMS_PER_PAGE, total)} of {total} vehicles
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - page) <= 1) return true;
                return false;
              })
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0) {
                  const prev = arr[idx - 1];
                  if (p - prev > 1) acc.push("...");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span
                    key={`dots-${idx}`}
                    className="px-2 text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={page === item ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(item as number)}
                  >
                    {item}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Vehicle Form Dialog */}
      <VehicleForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditVehicle(null);
        }}
        vehicle={editVehicle}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.regNumber}
              </span>
              ? This action cannot be undone. Only vehicles with &quot;Available&quot;
              status and no active trips can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}