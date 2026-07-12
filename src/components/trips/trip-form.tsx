"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import type { Trip, Vehicle, Driver } from "@/lib/types";
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

interface TripFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: Trip | null;
  onSuccess: () => void;
}

export default function TripForm({
  open,
  onOpenChange,
  trip,
  onSuccess,
}: TripFormProps) {
  const { token } = useAuthStore();
  const isEdit = !!trip;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [plannedDistance, setPlannedDistance] = useState("");

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const maxCapacity = selectedVehicle?.maxCapacity ?? 0;

  useEffect(() => {
    if (!open) return;
    if (isEdit && trip) {
      setSource(trip.source);
      setDestination(trip.destination);
      setVehicleId(trip.vehicleId);
      setDriverId(trip.driverId);
      setCargoWeight(String(trip.cargoWeight));
      setPlannedDistance(String(trip.plannedDistance));
    } else {
      setSource("");
      setDestination("");
      setVehicleId("");
      setDriverId("");
      setCargoWeight("");
      setPlannedDistance("");
    }
  }, [open, isEdit, trip]);

  useEffect(() => {
    if (!open || !token) return;
    async function fetchOptions() {
      setLoading(true);
      try {
        const headers = { Authorization: "Bearer " + token };
        const [vRes, dRes] = await Promise.all([
          fetch("/api/vehicles?status=Available&limit=100", { headers }),
          fetch("/api/drivers?status=Available&limit=100", { headers }),
        ]);
        if (vRes.ok) {
          const vData = await vRes.json();
          setVehicles(vData.data ?? vData.vehicles ?? []);
        }
        if (dRes.ok) {
          const dData = await dRes.json();
          setDrivers(dData.data ?? dData.drivers ?? []);
        }
      } catch {
        toast.error("Failed to load vehicles/drivers");
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
  }, [open, token]);

  function validate(): boolean {
    if (!source.trim()) {
      toast.error("Source is required");
      return false;
    }
    if (!destination.trim()) {
      toast.error("Destination is required");
      return false;
    }
    if (!vehicleId) {
      toast.error("Please select a vehicle");
      return false;
    }
    if (!driverId) {
      toast.error("Please select a driver");
      return false;
    }
    const weight = parseFloat(cargoWeight);
    if (!cargoWeight || isNaN(weight) || weight <= 0) {
      toast.error("Cargo weight must be a positive number");
      return false;
    }
    if (maxCapacity > 0 && weight > maxCapacity) {
      toast.error(
        `Cargo weight (${weight} kg) exceeds vehicle capacity (${maxCapacity} kg)`
      );
      return false;
    }
    const dist = parseFloat(plannedDistance);
    if (!plannedDistance || isNaN(dist) || dist <= 0) {
      toast.error("Planned distance must be a positive number");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !token) return;

    setSubmitting(true);
    try {
      const headers = {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      };

      if (isEdit && trip) {
        const res = await fetch(`/api/trips/${trip.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            action: "update",
            source: source.trim(),
            destination: destination.trim(),
            vehicleId,
            driverId,
            cargoWeight: parseFloat(cargoWeight),
            plannedDistance: parseFloat(plannedDistance),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update trip");
        }
        toast.success("Trip updated successfully");
      } else {
        const res = await fetch("/api/trips", {
          method: "POST",
          headers,
          body: JSON.stringify({
            source: source.trim(),
            destination: destination.trim(),
            vehicleId,
            driverId,
            cargoWeight: parseFloat(cargoWeight),
            plannedDistance: parseFloat(plannedDistance),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create trip");
        }
        toast.success("Trip created successfully");
      }
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Trip" : "New Trip"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the trip details below."
              : "Create a new trip by filling in the details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source">Source *</Label>
            <Input
              id="source"
              placeholder="e.g. Nairobi"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination">Destination *</Label>
            <Input
              id="destination"
              placeholder="e.g. Mombasa"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger id="vehicle" className="w-full">
                <SelectValue
                  placeholder={
                    loading
                      ? "Loading vehicles..."
                      : vehicles.length === 0
                        ? "No available vehicles"
                        : "Select vehicle"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.regNumber} &middot; {v.model} &middot; {v.type} &middot;{" "}
                    {v.maxCapacity} kg
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver">Driver *</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger id="driver" className="w-full">
                <SelectValue
                  placeholder={
                    loading
                      ? "Loading drivers..."
                      : drivers.length === 0
                        ? "No available drivers"
                        : "Select driver"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} &middot; {d.licenseCategory} &middot; Exp:{" "}
                    {new Date(d.licenseExpiry).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargoWeight">Cargo Weight (kg) *</Label>
            <div className="flex items-center gap-3">
              <Input
                id="cargoWeight"
                type="number"
                min="1"
                step="1"
                placeholder="Enter weight"
                className="flex-1"
                value={cargoWeight}
                onChange={(e) => setCargoWeight(e.target.value)}
              />
              {maxCapacity > 0 && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Max: {maxCapacity.toLocaleString()} kg
                </span>
              )}
            </div>
            {maxCapacity > 0 &&
              cargoWeight &&
              parseFloat(cargoWeight) > maxCapacity && (
                <p className="text-sm text-destructive">
                  Exceeds vehicle capacity by{" "}
                  {(parseFloat(cargoWeight) - maxCapacity).toLocaleString()} kg
                </p>
              )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plannedDistance">Planned Distance (km) *</Label>
            <Input
              id="plannedDistance"
              type="number"
              min="1"
              step="1"
              placeholder="Enter distance in km"
              value={plannedDistance}
              onChange={(e) => setPlannedDistance(e.target.value)}
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
              {isEdit ? "Update Trip" : "Create Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}