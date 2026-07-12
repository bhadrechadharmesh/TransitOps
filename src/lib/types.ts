export type UserRole = "Fleet Manager" | "Driver" | "Safety Officer" | "Financial Analyst";

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type VehicleStatus = "Available" | "On Trip" | "In Shop" | "Retired";
export type VehicleType = "Truck" | "Van" | "Bus" | "Pickup" | "Tanker";
export type DriverStatus = "Available" | "On Trip" | "Off Duty" | "Suspended";
export type TripStatus = "Draft" | "Dispatched" | "Completed" | "Cancelled";
export type MaintenanceStatus = "Active" | "Closed";
export type ExpenseType = "Toll" | "Maintenance" | "Insurance" | "Fine" | "Other";

export interface Vehicle {
  id: string;
  regNumber: string;
  model: string;
  type: VehicleType;
  maxCapacity: number;
  odometer: number;
  acquisitionCost: number;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string;
  contact: string;
  safetyScore: number;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  plannedDistance: number;
  actualDistance: number | null;
  fuelConsumed: number | null;
  finalOdometer: number | null;
  status: TripStatus;
  dispatchedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
  driver?: Driver;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  status: MaintenanceStatus;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  liters: number;
  cost: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
}

export interface Expense {
  id: string;
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
}

export interface DashboardKPIs {
  totalVehicles: number;
  availableVehicles: number;
  onTripVehicles: number;
  inShopVehicles: number;
  retiredVehicles: number;
  activeTrips: number;
  pendingTrips: number;
  completedTrips: number;
  driversOnDuty: number;
  driversAvailable: number;
  fleetUtilization: number;
}

export type AppPage = "dashboard" | "vehicles" | "drivers" | "trips" | "maintenance" | "fuel" | "expenses" | "reports";