"use client";

import { useEffect } from "react";
import { useAuthStore, useAppStore } from "@/store";
import LoginForm from "@/components/login-form";
import AppShell from "@/components/app-shell";
import DashboardPage from "@/components/dashboard/dashboard-page";
import VehiclesPage from "@/components/vehicles/vehicle-page";
import DriversPage from "@/components/drivers/driver-page";
import ReportsPage from "@/components/reports/reports-page";
import TripsPage from "@/components/trips/trip-page";
import MaintenancePage from "@/components/maintenance/maintenance-page";
import FuelPage from "@/components/fuel/fuel-page";
import ExpensesPage from "@/components/expenses/expense-page";
import type { AppPage } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Page Components ── */

// DashboardPage imported from @/components/dashboard/dashboard-page
// VehiclesPage imported from @/components/vehicles/vehicle-page
// DriversPage imported from @/components/drivers/driver-page
// TripsPage imported from @/components/trips/trip-page
// MaintenancePage imported from @/components/maintenance/maintenance-page
// FuelPage imported from @/components/fuel/fuel-page
// ExpensesPage imported from @/components/expenses/expense-page
// ReportsPage imported from @/components/reports/reports-page

const pageComponents: Record<AppPage, React.FC> = {
  dashboard: DashboardPage,
  vehicles: VehiclesPage as React.FC,
  drivers: DriversPage as React.FC,
  trips: TripsPage as React.FC,
  maintenance: MaintenancePage as React.FC,
  fuel: FuelPage as React.FC,
  expenses: ExpensesPage as React.FC,
  reports: ReportsPage,
};

export default function Home() {
  const { user, token, hydrated } = useAuthStore();
  const { currentPage } = useAppStore();

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("transitops_token");
      const storedUser = localStorage.getItem("transitops_user");
      if (storedToken && storedUser) {
        useAuthStore.setState({
          user: JSON.parse(storedUser),
          token: storedToken,
          hydrated: true,
        });
      } else {
        useAuthStore.setState({ hydrated: true });
      }
    } catch {
      localStorage.removeItem("transitops_token");
      localStorage.removeItem("transitops_user");
      useAuthStore.setState({ hydrated: true });
    }
  }, []);

  // Show a brief loading skeleton while hydrating
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-xl" />
          <Skeleton className="mx-auto h-5 w-32" />
          <Skeleton className="mx-auto h-4 w-48" />
        </div>
      </div>
    );
  }

  // Not authenticated → show login
  if (!token || !user) {
    return <LoginForm />;
  }

  // Authenticated → show app shell with current page
  const PageComponent = pageComponents[currentPage];

  return (
    <AppShell>
      <PageComponent />
    </AppShell>
  );
}