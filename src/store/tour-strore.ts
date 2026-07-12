import { create } from "zustand";
import type { AppPage } from "@/lib/types";

export interface TourStep {
  id: string;
  target?: string; // CSS selector for spotlight target
  title: string;
  description: string;
  /** If set, the tour navigates to this page before showing the step */
  navigateTo?: AppPage;
  /** Position of tooltip relative to target: 'bottom' | 'top' | 'left' | 'right' | 'center' */
  position?: "bottom" | "top" | "left" | "right" | "center";
  /** Icon name from lucide */
  icon?: string;
}

export interface TourState {
  active: boolean;
  currentStep: number;
  steps: TourStep[];
  completed: boolean;
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  setSteps: (steps: TourStep[]) => void;
  markCompleted: () => void;
  isTourCompleted: () => boolean;
}

export const useTourStore = create<TourState>((set, get) => ({
  active: false,
  currentStep: 0,
  steps: [],
  completed: false,

  startTour: () => {
    const isDone = typeof window !== "undefined" && localStorage.getItem("transitops_tour_done");
    if (isDone) {
      set({ steps: getDefaultSteps(), active: true, currentStep: 0 });
    } else {
      set({ steps: getDefaultSteps(), active: true, currentStep: 0 });
    }
  },

  stopTour: () => set({ active: false }),

  nextStep: () => {
    const { currentStep, steps } = get();
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      get().markCompleted();
      set({ active: false });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  goToStep: (index: number) => set({ currentStep: index }),

  setSteps: (steps) => set({ steps }),

  markCompleted: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("transitops_tour_done", "true");
    }
    set({ completed: true });
  },

  isTourCompleted: () => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("transitops_tour_done");
  },
}));

/* ── Default Tour Steps ── */

function getDefaultSteps(): TourStep[] {
  return [
    {
      id: "welcome",
      title: "Welcome to TransitOps!",
      description:
        "Your smart transport operations platform. This quick tour will walk you through the key features to help you manage your fleet efficiently. Let's get started!",
      position: "center",
    },
    {
      id: "sidebar",
      target: "[data-tour='sidebar']",
      title: "Navigation Sidebar",
      description:
        "Use the sidebar to navigate between all major sections — Dashboard, Vehicles, Drivers, Trips, Maintenance, Fuel Logs, Expenses, and Reports. You can collapse it for more space using the button in the top bar.",
      position: "right",
      navigateTo: "dashboard",
    },
    {
      id: "kpi-cards",
      target: "[data-tour='kpi-cards']",
      title: "Dashboard KPIs",
      description:
        "Get an instant overview of your fleet with Key Performance Indicators. See total vehicles, availability status, active trips, drivers on duty, and fleet utilization at a glance.",
      position: "bottom",
      navigateTo: "dashboard",
    },
    {
      id: "fleet-utilization",
      target: "[data-tour='fleet-utilization']",
      title: "Fleet Utilization Gauge",
      description:
        "This gauge shows what percentage of your fleet is currently operational. It helps you quickly identify if you have idle assets or if your fleet is over-utilized.",
      position: "bottom",
      navigateTo: "dashboard",
    },
    {
      id: "recent-trips",
      target: "[data-tour='recent-trips']",
      title: "Recent Trips",
      description:
        "View the latest trips at a glance with their route, assigned vehicle and driver, and current status. Color-coded badges make it easy to spot dispatched, completed, or draft trips.",
      position: "top",
      navigateTo: "dashboard",
    },
    {
      id: "upcoming-maintenance",
      target: "[data-tour='upcoming-maintenance']",
      title: "Upcoming Maintenance",
      description:
        "Never miss a service window. This panel shows all active maintenance records so you can track which vehicles are in the shop and what work is being done.",
      position: "top",
      navigateTo: "dashboard",
    },
    {
      id: "quick-actions",
      target: "[data-tour='quick-actions']",
      title: "Quick Actions",
      description:
        "Common tasks are just one click away. Quickly create a new trip, register a vehicle, or jump to reports from anywhere.",
      position: "top",
      navigateTo: "dashboard",
    },
    {
      id: "vehicles-page",
      target: "[data-tour='vehicle-table']",
      title: "Vehicle Registry",
      description:
        "Your master list of all fleet vehicles. Search by registration number or model, filter by type and status, and manage the full vehicle lifecycle. Only Fleet Managers can add, edit, or retire vehicles.",
      position: "bottom",
      navigateTo: "vehicles",
    },
    {
      id: "drivers-page",
      target: "[data-tour='driver-table']",
      title: "Driver Management",
      description:
        "Track all your drivers, their license details, and safety scores. Red warnings appear when a license is expired or expiring within 30 days. Safety Officers can update safety scores directly.",
      position: "bottom",
      navigateTo: "drivers",
    },
    {
      id: "trips-page",
      target: "[data-tour='trip-new-btn']",
      title: "Trip Management",
      description:
        "The heart of TransitOps. Create trips by selecting a source, destination, available vehicle, and driver. The system enforces all business rules — cargo weight limits, license validity, and status availability — automatically.",
      position: "right",
      navigateTo: "trips",
    },
    {
      id: "trip-workflow",
      target: "[data-tour='trip-workflow']",
      title: "Trip Lifecycle",
      description:
        "Every trip follows a clear workflow: Draft → Dispatched → Completed (or Cancelled). Dispatching auto-marks the vehicle and driver as 'On Trip'. Completing restores them to 'Available'. All status transitions are automatic!",
      position: "top",
      navigateTo: "trips",
    },
    {
      id: "maintenance-page",
      target: "[data-tour='maintenance-summary']",
      title: "Maintenance Tracking",
      description:
        "Log maintenance records for any vehicle. When you create a record, the vehicle is automatically marked 'In Shop' and removed from trip assignments. Closing the record restores it to 'Available'.",
      position: "bottom",
      navigateTo: "maintenance",
    },
    {
      id: "fuel-page",
      target: "[data-tour='fuel-summary']",
      title: "Fuel & Expense Tracking",
      description:
        "Keep tabs on fuel consumption and all operational expenses. Log fuel fills with liters and cost, and track tolls, insurance, fines, and other expenses per vehicle.",
      position: "bottom",
      navigateTo: "fuel",
    },
    {
      id: "reports-page",
      target: "[data-tour='reports-charts']",
      title: "Reports & Analytics",
      description:
        "Gain insights with interactive charts — monthly trip trends, fuel costs, fuel efficiency per trip, and operational cost breakdowns. Export data as CSV for external analysis or sharing with stakeholders.",
      position: "bottom",
      navigateTo: "reports",
    },
    {
      id: "dark-mode",
      target: "[data-tour='dark-mode']",
      title: "Dark Mode",
      description:
        "Prefer a darker interface? Toggle between light and dark themes anytime. Your preference is remembered across sessions.",
      position: "right",
      navigateTo: "dashboard",
    },
    {
      id: "user-profile",
      target: "[data-tour='user-profile']",
      title: "Your Profile",
      description:
        "See your name and role at a glance. Different roles have different permissions — Fleet Managers have full access, Safety Officers manage compliance, and Financial Analysts focus on reports.",
      position: "right",
      navigateTo: "dashboard",
    },
    {
      id: "tour-done",
      title: "You're All Set! 🎉",
      description:
        "You've completed the tour. You can always restart it from the help (?) button in the top bar. Start by exploring the Dashboard, or jump straight to creating a trip. Happy dispatching!",
      position: "center",
    },
  ];
}