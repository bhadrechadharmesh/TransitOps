"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import type { Vehicle, ExpenseType } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const EXPENSE_TYPES: { value: ExpenseType; label: string }[] = [
  { value: "Toll", label: "Toll" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Insurance", label: "Insurance" },
  { value: "Fine", label: "Fine" },
  { value: "Other", label: "Other" },
];

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ExpenseForm({
  open,
  onOpenChange,
  onSuccess,
}: ExpenseFormProps) {
  const { token } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [type, setType] = useState<ExpenseType | "">("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!open) return;
    setVehicleId("");
    setType("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
  }, [open]);

  useEffect(() => {
    if (!open || !token) return;
    async function fetchVehicles() {
      setLoading(true);
      try {
        const res = await fetch("/api/vehicles?limit=100", {
          headers: { Authorization: "Bearer " + token },
        });
        if (res.ok) {
          const data = await res.json();
          setVehicles(data.data ?? data.vehicles ?? []);
        }
      } catch {
        toast.error("Failed to load vehicles");
      } finally {
        setLoading(false);
      }
    }
    fetchVehicles();
  }, [open, token]);

  function validate(): boolean {
    if (!vehicleId) {
      toast.error("Please select a vehicle");
      return false;
    }
    if (!type) {
      toast.error("Please select an expense type");
      return false;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Amount must be a positive number");
      return false;
    }
    if (!date) {
      toast.error("Date is required");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !token) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          type: type as ExpenseType,
          amount: parseFloat(amount),
          date,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create expense");
      }
      toast.success("Expense added");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Record an expense for a vehicle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-vehicle">Vehicle *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger id="e-vehicle" className="w-full">
                <SelectValue
                  placeholder={
                    loading
                      ? "Loading..."
                      : vehicles.length === 0
                        ? "No vehicles"
                        : "Select vehicle"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.regNumber} &middot; {v.model} &middot; {v.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-type">Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as ExpenseType)}>
              <SelectTrigger id="e-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-amount">Amount (KES) *</Label>
            <Input
              id="e-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 2000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-date">Date *</Label>
            <Input
              id="e-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loading}>
              {submitting && <Loader2 className="animate-spin" />}
              Add Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}