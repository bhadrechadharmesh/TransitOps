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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Info } from "lucide-react";

interface MaintenanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function MaintenanceForm({
  open,
  onOpenChange,
  onSuccess,
}: MaintenanceFormProps) {
  const { token } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");

  useEffect(() => {
    if (!open) return;
    setVehicleId("");
    setDescription("");
    setCost("");
  }, [open]);

  useEffect(() => {
    if (!open || !token) return;
    async function fetchVehicles() {
      setLoading(true);
      try {
        const res = await fetch("/api/vehicles?status=Available&limit=100", {
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
    if (!description.trim()) {
      toast.error("Description is required");
      return false;
    }
    if (cost && isNaN(parseFloat(cost))) {
      toast.error("Cost must be a valid number");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !token) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          description: description.trim(),
          cost: cost ? parseFloat(cost) : 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create maintenance record");
      }
      toast.success("Maintenance record created");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Maintenance Record</DialogTitle>
          <DialogDescription>
            Record a maintenance activity for a vehicle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <Info className="size-4 shrink-0" />
            Vehicle will be marked as <strong>In Shop</strong>.
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-vehicle">Vehicle *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger id="m-vehicle" className="w-full">
                <SelectValue
                  placeholder={
                    loading
                      ? "Loading..."
                      : vehicles.length === 0
                        ? "No available vehicles"
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
            <Label htmlFor="m-desc">Description *</Label>
            <Textarea
              id="m-desc"
              placeholder="Describe the maintenance work..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-cost">Cost (optional)</Label>
            <Input
              id="m-cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 5000"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
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
              Add Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}