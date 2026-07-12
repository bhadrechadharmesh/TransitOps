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
import type { Driver } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface DriverFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver | null;
  onSuccess: () => void;
}

const licenseCategories = ["A", "B", "C", "D", "E"];

interface FormErrors {
  name?: string;
  licenseNumber?: string;
  licenseCategory?: string;
  licenseExpiry?: string;
  contact?: string;
  safetyScore?: string;
}

export default function DriverForm({
  open,
  onOpenChange,
  driver,
  onSuccess,
}: DriverFormProps) {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const isEdit = !!driver;

  const [name, setName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseCategory, setLicenseCategory] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [contact, setContact] = useState("");
  const [safetyScore, setSafetyScore] = useState("100");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (driver) {
        setName(driver.name);
        setLicenseNumber(driver.licenseNumber);
        setLicenseCategory(driver.licenseCategory);
        // Format date for input[type=date] (YYYY-MM-DD)
        const d = driver.licenseExpiry ? driver.licenseExpiry.slice(0, 10) : "";
        setLicenseExpiry(d);
        setContact(driver.contact);
        setSafetyScore(driver.safetyScore?.toString() ?? "100");
      } else {
        setName("");
        setLicenseNumber("");
        setLicenseCategory("");
        setLicenseExpiry("");
        setContact("");
        setSafetyScore("100");
      }
      setErrors({});
    }
  }, [open, driver]);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!licenseNumber.trim()) newErrors.licenseNumber = "License number is required";
    if (!licenseCategory) newErrors.licenseCategory = "License category is required";
    if (!licenseExpiry) {
      newErrors.licenseExpiry = "License expiry date is required";
    } else {
      const expiryDate = new Date(licenseExpiry + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        newErrors.licenseExpiry = "Expiry date must be in the future";
      }
    }
    if (!contact.trim()) newErrors.contact = "Contact is required";
    const score = Number(safetyScore);
    if (safetyScore !== "" && (isNaN(score) || score < 0 || score > 100)) {
      newErrors.safetyScore = "Score must be between 0 and 100";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        licenseNumber: licenseNumber.trim(),
        licenseCategory,
        licenseExpiry: licenseExpiry,
        contact: contact.trim(),
        safetyScore: Number(safetyScore) || 100,
      };

      const url = isEdit ? `/api/drivers/${driver!.id}` : "/api/drivers";
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
        title: isEdit ? "Driver Updated" : "Driver Added",
        description: isEdit
          ? `${name.trim()}'s record has been updated.`
          : `${name.trim()} has been added to the system.`,
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
          <DialogTitle>{isEdit ? "Edit Driver" : "Add New Driver"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update driver details. License number cannot be changed."
              : "Enter the details for the new driver."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="driverName">Full Name *</Label>
            <Input
              id="driverName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Mukasa"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* License Number */}
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number *</Label>
            <Input
              id="licenseNumber"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. DL-2024-00123"
              readOnly={isEdit}
              className={isEdit ? "bg-muted cursor-not-allowed" : ""}
              aria-invalid={!!errors.licenseNumber}
            />
            {errors.licenseNumber && (
              <p className="text-sm text-destructive">{errors.licenseNumber}</p>
            )}
          </div>

          {/* License Category */}
          <div className="space-y-2">
            <Label htmlFor="licenseCategory">License Category *</Label>
            <Select
              value={licenseCategory}
              onValueChange={setLicenseCategory}
            >
              <SelectTrigger className="w-full" id="licenseCategory">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {licenseCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    Category {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.licenseCategory && (
              <p className="text-sm text-destructive">{errors.licenseCategory}</p>
            )}
          </div>

          {/* License Expiry */}
          <div className="space-y-2">
            <Label htmlFor="licenseExpiry">License Expiry Date *</Label>
            <Input
              id="licenseExpiry"
              type="date"
              value={licenseExpiry}
              onChange={(e) => setLicenseExpiry(e.target.value)}
              aria-invalid={!!errors.licenseExpiry}
            />
            {errors.licenseExpiry && (
              <p className="text-sm text-destructive">{errors.licenseExpiry}</p>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label htmlFor="contact">Contact *</Label>
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. +256 700 123 456"
              aria-invalid={!!errors.contact}
            />
            {errors.contact && (
              <p className="text-sm text-destructive">{errors.contact}</p>
            )}
          </div>

          {/* Safety Score */}
          <div className="space-y-2">
            <Label htmlFor="safetyScore">Safety Score (0–100)</Label>
            <Input
              id="safetyScore"
              type="number"
              min="0"
              max="100"
              value={safetyScore}
              onChange={(e) => setSafetyScore(e.target.value)}
              placeholder="100"
              aria-invalid={!!errors.safetyScore}
            />
            {errors.safetyScore && (
              <p className="text-sm text-destructive">{errors.safetyScore}</p>
            )}
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
              {isEdit ? "Save Changes" : "Add Driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}