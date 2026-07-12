"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Truck,
  LayoutDashboard,
  UserCircle,
  MapPin,
  Wrench,
  Fuel,
  Receipt,
  BarChart3,
  Menu,
  Moon,
  Sun,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { useTourStore } from "@/store/tour-store";
import PlatformTour, { useAutoStartTour } from "@/components/tour/platform-tour";
import { useAuthStore, useAppStore } from "@/store";
import type { AppPage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface NavItem {
  label: string;
  page: AppPage;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", page: "dashboard", icon: LayoutDashboard },
  { label: "Vehicles", page: "vehicles", icon: Truck },
  { label: "Drivers", page: "drivers", icon: UserCircle },
  { label: "Trips", page: "trips", icon: MapPin },
  { label: "Maintenance", page: "maintenance", icon: Wrench },
  { label: "Fuel Logs", page: "fuel", icon: Fuel },
  { label: "Expenses", page: "expenses", icon: Receipt },
  { label: "Reports", page: "reports", icon: BarChart3 },
];

const pageTitles: Record<AppPage, string> = {
  dashboard: "Dashboard",
  vehicles: "Vehicles",
  drivers: "Drivers",
  trips: "Trips",
  maintenance: "Maintenance",
  fuel: "Fuel Logs",
  expenses: "Expenses",
  reports: "Reports",
};

function SidebarNav({
  collapsed,
  currentPage,
  onNavigate,
  onCloseMobile,
  darkMode,
  onToggleDarkMode,
  user,
  onLogout,
}: {
  collapsed: boolean;
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onCloseMobile?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  user: { name: string; role: string };
  onLogout: () => void;
}) {
  return (
    <div data-tour="sidebar" className="flex h-full flex-col bg-[#0f1a14] text-gray-200 dark:bg-[#0a1210]">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
          <Truck className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-lg font-bold tracking-tight text-white"
          >
            TransitOps
          </motion.span>
        )}
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            const Icon = item.icon;

            const button = (
              <button
                onClick={() => {
                  onNavigate(item.page);
                  onCloseMobile?.();
                }}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-emerald-600/20 text-emerald-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-500"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );

            if (collapsed) {
              return (
                <li key={item.page}>
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return <li key={item.page}>{button}</li>;
          })}
        </ul>
      </nav>

      <Separator className="bg-white/10" />

      {/* Footer */}
      <div className="shrink-0 space-y-3 px-3 py-4">
        {/* Dark mode toggle */}
        <div data-tour="dark-mode" className="flex items-center justify-between rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {!collapsed && (darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />)}
            {!collapsed && <span>{darkMode ? "Dark" : "Light"}</span>}
            {collapsed && (
              <button
                onClick={onToggleDarkMode}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
              >
                {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            )}
          </div>
          {!collapsed && (
            <Switch
              checked={darkMode}
              onCheckedChange={onToggleDarkMode}
              className="data-[state=checked]:bg-emerald-600"
            />
          )}
        </div>

        <Separator className="bg-white/10" />

        {/* User info + logout */}
        <div data-tour="user-profile" className="flex items-center gap-3 px-2">
          <Avatar className="h-8 w-8 border border-emerald-500/30">
            <AvatarFallback className="bg-emerald-600/20 text-xs font-medium text-emerald-400">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-200">
                {user.name}
              </p>
              <p className="truncate text-xs text-gray-500">{user.role}</p>
            </div>
          )}
          {!collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-gray-500 hover:bg-white/5 hover:text-red-400"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Log out</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Log out</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onLogout}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/5 hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Log out</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Log out
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } =
    useAppStore();
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  const handleNavigate = (page: AppPage) => {
    setCurrentPage(page);
  };

  const handleLogout = () => {
    logout();
  };

  const toggleDarkMode = () => {
    setTheme(isDark ? "light" : "dark");
  };

  // Sync sidebar open state for mobile sheet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  const [desktopCollapsed, setDesktopCollapsed] = useDesktopCollapse();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <TourWrapper />
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r border-border transition-all duration-300 ${
          desktopCollapsed ? "w-[68px]" : "w-64"
        }`}
      >
        <SidebarNav
          collapsed={desktopCollapsed}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          darkMode={isDark}
          onToggleDarkMode={toggleDarkMode}
          user={{ name: user?.name ?? "", role: user?.role ?? "" }}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarNav
            collapsed={false}
            currentPage={currentPage}
            onNavigate={handleNavigate}
            onCloseMobile={() => setSidebarOpen(false)}
            darkMode={isDark}
            onToggleDarkMode={toggleDarkMode}
            user={{ name: user?.name ?? "", role: user?.role ?? "" }}
            onLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>

          {/* Desktop collapse toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex"
                onClick={() => setDesktopCollapsed((prev: boolean) => !prev)}
              >
                {desktopCollapsed ? (
                  <PanelLeft className="h-5 w-5" />
                ) : (
                  <PanelLeftClose className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>

          {/* Breadcrumb */}
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate("dashboard");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  TransitOps
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitles[currentPage]}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Page title (mobile) */}
          <h1 className="text-lg font-semibold lg:hidden">
            {pageTitles[currentPage]}
          </h1>

          {/* Help / Tour restart button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                onClick={() => useTourStore.getState().startTour()}
              >
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Start tour</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Platform Tour</TooltipContent>
          </Tooltip>
          <div className="ml-auto" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ── Tour auto-start wrapper ── */
function TourWrapper() {
  useAutoStartTour();
  const { active } = useTourStore();
  return active ? <PlatformTour /> : null;
}

/** Custom hook to persist sidebar collapsed state */
function useDesktopCollapse(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [collapsed, setCollapsed] = useState(false);

  return [collapsed, setCollapsed];
}