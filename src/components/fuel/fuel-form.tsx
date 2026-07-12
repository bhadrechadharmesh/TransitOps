"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import type { Vehicle } from "@/lib/types";
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

interface FuelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function FuelForm({
  open,
  onOpenChange,
  onSuccess,
}: FuelFormProps) {
  const { token } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [liters, setLiters] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!open) return;
    setVehicleId("");
    setLiters("");
    setCost("");
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
    if (!liters || isNaN(parseFloat(liters)) || parseFloat(liters) <= 0) {
      toast.error("Liters must be a positive number");
      return false;
    }
    if (!cost || isNaN(parseFloat(cost)) || parseFloat(cost) <= 0) {
      toast.error("Cost must be a positive number");
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
      const res = await fetch("/api/fuel-logs", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          liters: parseFloat(liters),
          cost: parseFloat(cost),
          date,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create fuel log");
      }
      toast.success("Fuel log added");
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
          <DialogTitle>Add Fuel Log</DialogTitle>
          <DialogDescription>
            Record a fueling event for a vehicle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="f-vehicle">Vehicle *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger id="f-vehicle" className="w-full">
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
            <Label htmlFor="f-liters">Liters *</Label>
            <Input
              id="f-liters"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="e.g. 50"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-cost">Cost (KES) *</Label>
            <Input
              id="f-cost"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 7500"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-date">Date *</Label>
            <Input
              id="f-date"
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
              Add Fuel Log
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}