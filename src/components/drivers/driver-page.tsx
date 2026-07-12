"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Driver, DriverStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  AlertTriangle,
} from "lucide-react";
import DriverForm from "./driver-form";

const ITEMS_PER_PAGE = 10;

const statusOptions: ("All" | DriverStatus)[] = [
  "All",
  "Available",
  "On Trip",
  "Off Duty",
  "Suspended",
];

function statusBadge(status: DriverStatus) {
  const styles: Record<DriverStatus, string> = {
    Available:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    "On Trip":
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    "Off Duty":
      "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    Suspended:
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {status}
    </Badge>
  );
}

function safetyScoreDisplay(score: number) {
  const color =
    score >= 80
      ? "text-emerald-700 dark:text-emerald-300"
      : score >= 50
        ? "text-amber-700 dark:text-amber-300"
        : "text-red-700 dark:text-red-300";
  const barColor =
    score >= 80
      ? "[&>div]:bg-emerald-500"
      : score >= 50
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <Progress value={score} className={`h-2 w-16 ${barColor}`} />
      <span className={`text-sm font-medium tabular-nums ${color}`}>
        {score}
      </span>
    </div>
  );
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const s = dateStr.includes("T") ? dateStr : dateStr + "T00:00:00";
  return new Date(s);
}

function isExpiringSoon(dateStr: string): boolean {
  const expiry = parseDate(dateStr);
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiry <= new Date(now.getTime() + thirtyDays);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
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
        <Skeleton key={i} className="h-52 rounded-lg" />
      ))}
    </div>
  );
}

export default function DriversPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isFleetManager = user?.role === "Fleet Manager";
  const isSafetyOfficer = user?.role === "Safety Officer";

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Safety score dialog
  const [scoreDriver, setScoreDriver] = useState<Driver | null>(null);
  const [safetyScore, setSafetyScore] = useState("");
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchRef = useRef(search);

  const fetchDrivers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      if (searchRef.current) params.set("search", searchRef.current);
      if (statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`/api/drivers?${params}`, {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      if (res.ok) {
        setDrivers(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load drivers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, token, toast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchRef.current = val;
      setPage(1);
    }, 300);
  }

  function handleStatusChange(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  function openEdit(d: Driver) {
    setEditDriver(d);
    setFormOpen(true);
  }

  function openAdd() {
    setEditDriver(null);
    setFormOpen(true);
  }

  function handleFormSuccess() {
    setEditDriver(null);
    fetchDrivers();
  }

  function openScoreDialog(d: Driver) {
    setScoreDriver(d);
    setSafetyScore(d.safetyScore?.toString() ?? "100");
  }

  async function handleScoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scoreDriver || !token) return;
    const score = Number(safetyScore);
    if (isNaN(score) || score < 0 || score > 100) {
      toast({
        title: "Invalid Score",
        description: "Score must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setScoreSubmitting(true);
    try {
      const res = await fetch(`/api/drivers/${scoreDriver.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ safetyScore: score }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Update Failed",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Score Updated",
          description: `${scoreDriver.name}'s safety score is now ${score}.`,
        });
        setScoreDriver(null);
        fetchDrivers();
      }
    } catch {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setScoreSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drivers/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) {
        const data = await res.json();
        toast({
          title: "Delete Failed",
          description: data.error || "Could not delete driver",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Driver Deleted",
          description: `${deleteTarget.name} has been removed.`,
        });
        fetchDrivers();
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
  const canManage = isFleetManager || isSafetyOfficer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Driver Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage driver records and license information
          </p>
        </div>
        {isFleetManager && (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Driver
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
                placeholder="Search by name or license number..."
                className="pl-9"
              />
            </div>
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
      ) : drivers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserCircle className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">No drivers found</p>
            <p className="text-sm text-muted-foreground/70">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Mobile card layout */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {drivers.map((d) => {
              const expiring = isExpiringSoon(d.licenseExpiry);
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{d.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {d.licenseNumber}
                          </p>
                        </div>
                        {statusBadge(d.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Category
                          </span>
                          <p className="font-medium">{d.licenseCategory}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Contact
                          </span>
                          <p className="font-medium truncate">{d.contact}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            License Expiry
                          </span>
                          <p
                            className={`font-medium ${expiring ? "text-destructive" : ""}`}
                          >
                            {formatDate(d.licenseExpiry)}
                            {expiring && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5">
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Safety Score
                          </span>
                          <div className="mt-1">
                            {safetyScoreDisplay(d.safetyScore)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {(isFleetManager || isSafetyOfficer) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => openEdit(d)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                        {isSafetyOfficer && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => openScoreDialog(d)}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Score
                          </Button>
                        )}
                        {isFleetManager && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(d)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Desktop table layout */
        <Card data-tour="driver-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>License Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>License Expiry</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Safety Score</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {drivers.map((d) => {
                      const expiring = isExpiringSoon(d.licenseExpiry);
                      return (
                        <motion.tr
                          key={d.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <TableCell className="font-medium">
                            {d.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {d.licenseNumber}
                          </TableCell>
                          <TableCell>{d.licenseCategory}</TableCell>
                          <TableCell>
                            <span
                              className={
                                expiring
                                  ? "text-destructive font-medium"
                                  : ""
                              }
                            >
                              {formatDate(d.licenseExpiry)}
                            </span>
                            {expiring && (
                              <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell>{d.contact}</TableCell>
                          <TableCell>
                            {safetyScoreDisplay(d.safetyScore)}
                          </TableCell>
                          <TableCell>{statusBadge(d.status)}</TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEdit(d)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                {isSafetyOfficer && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                                    onClick={() => openScoreDialog(d)}
                                    title="Edit Safety Score"
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Score
                                  </Button>
                                )}
                                {isFleetManager && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeleteTarget(d)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </motion.tr>
                      );
                    })}
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
            {Math.min(page * ITEMS_PER_PAGE, total)} of {total} drivers
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

      {/* Driver Form Dialog */}
      <DriverForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditDriver(null);
        }}
        driver={editDriver}
        onSuccess={handleFormSuccess}
      />

      {/* Safety Score Dialog (for Safety Officer) */}
      <Dialog
        open={!!scoreDriver}
        onOpenChange={(open) => !open && setScoreDriver(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Safety Score</DialogTitle>
            <DialogDescription>
              Update the safety score for{" "}
              <span className="font-semibold text-foreground">
                {scoreDriver?.name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScoreSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editSafetyScore">Safety Score (0–100)</Label>
              <Input
                id="editSafetyScore"
                type="number"
                min="0"
                max="100"
                value={safetyScore}
                onChange={(e) => setSafetyScore(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScoreDriver(null)}
                disabled={scoreSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={scoreSubmitting}>
                {scoreSubmitting ? "Saving..." : "Update Score"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Driver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone. Only drivers with &quot;Available&quot;
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