"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import type { Expense, ExpenseType, Vehicle } from "@/lib/types";
import { Plus, Receipt, DollarSign } from "lucide-react";
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
import ExpenseForm from "./expense-form";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All Types" },
  { value: "Toll", label: "Toll" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Insurance", label: "Insurance" },
  { value: "Fine", label: "Fine" },
  { value: "Other", label: "Other" },
];

function TypeBadge({ type }: { type: ExpenseType }) {
  const styles: Record<ExpenseType, string> = {
    Toll: "bg-blue-100 text-blue-700 border-blue-200",
    Maintenance: "bg-amber-100 text-amber-700 border-amber-200",
    Insurance: "bg-purple-100 text-purple-700 border-purple-200",
    Fine: "bg-red-100 text-red-700 border-red-200",
    Other: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <Badge variant="secondary" className={styles[type]}>
      {type}
    </Badge>
  );
}

export default function ExpensesPage() {
  const { token } = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const [formOpen, setFormOpen] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (vehicleFilter !== "All") params.set("vehicleId", vehicleFilter);
      if (typeFilter !== "All") params.set("type", typeFilter);

      const res = await fetch(`/api/expenses?${params}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const data = await res.json();
      setExpenses(data.data ?? data.expenses ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [token, page, vehicleFilter, typeFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

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

  // Breakdown by type from displayed data
  const typeBreakdown = expenses.reduce<Record<string, number>>((acc, exp) => {
    acc[exp.type] = (acc[exp.type] || 0) + exp.amount;
    return acc;
  }, {});
  const pageTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track all vehicle-related expenses
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Add Expense
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <DollarSign className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                KES {pageTotal.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Page Total ({expenses.length} items)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium">Breakdown by Type</p>
            </div>
            {Object.keys(typeBreakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeBreakdown).map(([type, amount]) => (
                  <div
                    key={type}
                    className="flex items-center gap-1.5 text-sm"
                  >
                    <TypeBadge type={type as ExpenseType} />
                    <span className="font-medium">
                      KES {amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
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
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
            {loading
              ? "Loading..."
              : `${total} Expense${total !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount (KES)</TableHead>
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
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No expenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">
                        {exp.vehicle?.regNumber ?? exp.vehicleId.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={exp.type} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {exp.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(exp.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(exp.createdAt).toLocaleDateString()}
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
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))
            ) : expenses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No expenses found.
              </div>
            ) : (
              expenses.map((exp) => (
                <Card key={exp.id} className="p-4 gap-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {exp.vehicle?.regNumber ?? exp.vehicleId.slice(0, 8)}
                    </p>
                    <p className="font-semibold">
                      KES {exp.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <TypeBadge type={exp.type} />
                    <span className="text-sm text-muted-foreground">
                      {new Date(exp.date).toLocaleDateString()}
                    </span>
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
      <ExpenseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchExpenses}
      />
    </div>
  );
}