"use client";

import { useState, useEffect } from "react";
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
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";
import type { Vehicle, VehicleType } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle | null;
  onSuccess: () => void;
}

const vehicleTypes: VehicleType[] = ["Truck", "Van", "Bus", "Pickup", "Tanker"];

interface FormErrors {
  regNumber?: string;
  model?: string;
  type?: string;
  maxCapacity?: string;
}

export default function VehicleForm({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: VehicleFormProps) {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const isEdit = !!vehicle;

  const [regNumber, setRegNumber] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState<VehicleType | "">("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [odometer, setOdometer] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (vehicle) {
        setRegNumber(vehicle.regNumber);
        setModel(vehicle.model);
        setType(vehicle.type);
        setMaxCapacity(vehicle.maxCapacity.toString());
        setOdometer(vehicle.odometer?.toString() ?? "");
        setAcquisitionCost(vehicle.acquisitionCost?.toString() ?? "");
      } else {
        setRegNumber("");
        setModel("");
        setType("");
        setMaxCapacity("");
        setOdometer("");
        setAcquisitionCost("");
      }
      setErrors({});
    }
  }, [open, vehicle]);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!regNumber.trim()) newErrors.regNumber = "Registration number is required";
    if (!model.trim()) newErrors.model = "Model is required";
    if (!type) newErrors.type = "Vehicle type is required";
    if (!maxCapacity || Number(maxCapacity) <= 0) newErrors.maxCapacity = "Valid capacity is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        regNumber: regNumber.trim(),
        model: model.trim(),
        type,
        maxCapacity: Number(maxCapacity),
      };
      if (odometer) body.odometer = Number(odometer);
      if (acquisitionCost) body.acquisitionCost = Number(acquisitionCost);

      const url = isEdit ? `/api/vehicles/${vehicle!.id}` : "/api/vehicles";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: isEdit ? "Update Failed" : "Creation Failed",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isEdit ? "Vehicle Updated" : "Vehicle Added",
        description: isEdit
          ? `${regNumber} has been updated.`
          : `${regNumber} has been added to the registry.`,
      });
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update vehicle details. Registration number cannot be changed."
              : "Enter the details for the new vehicle."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="regNumber">Registration Number *</Label>
            <Input
              id="regNumber"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="e.g. KAB 123C"
              readOnly={isEdit}
              className={isEdit ? "bg-muted cursor-not-allowed" : ""}
              aria-invalid={!!errors.regNumber}
            />
            {errors.regNumber && (
              <p className="text-sm text-destructive">{errors.regNumber}</p>
            )}
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Toyota Hilux 2022"
              aria-invalid={!!errors.model}
            />
            {errors.model && (
              <p className="text-sm text-destructive">{errors.model}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Vehicle Type *</Label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as VehicleType)}
            >
              <SelectTrigger className="w-full" id="type">
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type}</p>
            )}
          </div>

          {/* Max Capacity */}
          <div className="space-y-2">
            <Label htmlFor="maxCapacity">Max Capacity (kg) *</Label>
            <Input
              id="maxCapacity"
              type="number"
              min="0"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              placeholder="e.g. 5000"
              aria-invalid={!!errors.maxCapacity}
            />
            {errors.maxCapacity && (
              <p className="text-sm text-destructive">{errors.maxCapacity}</p>
            )}
          </div>

          {/* Odometer */}
          <div className="space-y-2">
            <Label htmlFor="odometer">Odometer (km)</Label>
            <Input
              id="odometer"
              type="number"
              min="0"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="e.g. 45000"
            />
          </div>

          {/* Acquisition Cost */}
          <div className="space-y-2">
            <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
            <Input
              id="acquisitionCost"
              type="number"
              min="0"
              value={acquisitionCost}
              onChange={(e) => setAcquisitionCost(e.target.value)}
              placeholder="e.g. 15000000"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}