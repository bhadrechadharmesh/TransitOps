"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Truck,
  LayoutDashboard,
  UserCircle,
  MapPin,
  Wrench,
  Fuel,
  Receipt,
  BarChart3,
  Sun,
  User,
} from "lucide-react";
import { useTourStore } from "@/store/tour-store";
import { useAppStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/* ── Icon map for step icons ── */
const stepIcons: Record<string, React.ElementType> = {
  sidebar: LayoutDashboard,
  "kpi-cards": LayoutDashboard,
  "fleet-utilization": Truck,
  "recent-trips": MapPin,
  "upcoming-maintenance": Wrench,
  "quick-actions": Sparkles,
  "vehicles-page": Truck,
  "drivers-page": UserCircle,
  "trips-page": MapPin,
  "trip-workflow": MapPin,
  "maintenance-page": Wrench,
  "fuel-page": Fuel,
  "reports-page": BarChart3,
  "dark-mode": Sun,
  "user-profile": User,
};

/* ── Spotlight Overlay ── */

function SpotlightOverlay({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) {
    // Full overlay for center-positioned steps
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-[2px]"
      />
    );
  }

  const padding = 8;
  const top = targetRect.top - padding;
  const left = targetRect.left - padding;
  const width = targetRect.width + padding * 2;
  const height = targetRect.height + padding * 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9998]"
      style={{
        boxShadow: `
          0 0 0 9999px rgba(0, 0, 0, 0.6),
          0 0 0 9999px rgba(0, 0, 0, 0.05)`,
        borderRadius: "8px",
        clipPath: `polygon(
          0% 0%,
          0% 100%,
          ${left}px 100%,
          ${left}px ${top}px,
          ${left + width}px ${top}px,
          ${left + width}px ${top + height}px,
          ${left}px ${top + height}px,
          ${left}px 100%,
          100% 100%,
          100% 0%
        )`,
        WebkitClipPath: `polygon(
          0% 0%,
          0% 100%,
          ${left}px 100%,
          ${left}px ${top}px,
          ${left + width}px ${top}px,
          ${left + width}px ${top + height}px,
          ${left}px ${top + height}px,
          ${left}px 100%,
          100% 100%,
          100% 0%
        )`,
      }}
    />
  );
}

/* ── Spotlight ring animation around target ── */

function SpotlightRing({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) return null;

  const padding = 8;
  const style: React.CSSProperties = {
    position: "fixed",
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    borderRadius: "8px",
    zIndex: 9999,
    pointerEvents: "none",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
      className="ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent"
      style={style}
    />
  );
}

/* ── Tooltip / Card ── */

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}: {
  step: { id: string; title: string; description: string; position?: string };
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const position = step.position || "bottom";
  const StepIcon = stepIcons[step.id] || Sparkles;

  // Compute tooltip position
  const getStyle = (): React.CSSProperties => {
    if (!targetRect || position === "center") {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "480px",
        width: "calc(100% - 32px)",
        zIndex: 10000,
      };
    }

    const tooltipW = 380;
    const tooltipH = 200;
    const gap = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top: number;
    let left: number;

    switch (position) {
      case "bottom":
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
        break;
      case "top":
        top = targetRect.top - tooltipH - gap;
        left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
        left = targetRect.right + gap;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
        left = targetRect.left - tooltipW - gap;
        break;
      default:
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
    }

    // Clamp to viewport (account for fixed header = 64px)
    const headerH = 64;
    left = Math.max(16, Math.min(left, vw - tooltipW - 16));
    top = Math.max(headerH + 8, Math.min(top, vh - tooltipH - 16));

    return {
      position: "fixed" as const,
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipW}px`,
      maxWidth: "calc(100vw - 32px)",
      zIndex: 10000,
    };
  };

  // Compute arrow style for non-center positions
  const arrowStyle = (() => {
    if (!targetRect || position === "center") return null;
    const arrowSize = 10;
    const computedStyle = getStyle();

    if (position === "bottom") {
      return {
        position: "absolute" as const,
        top: `-${arrowSize + 2}px`,
        left: `${Math.min(targetRect.left + targetRect.width / 2 - (computedStyle.left as number), (computedStyle.width as number) - 24)}px`,
      };
    } else if (position === "top") {
      return {
        position: "absolute" as const,
        bottom: `-${arrowSize + 2}px`,
        left: `${Math.min(targetRect.left + targetRect.width / 2 - (computedStyle.left as number), (computedStyle.width as number) - 24)}px`,
      };
    } else if (position === "right") {
      return {
        position: "absolute" as const,
        left: `-${arrowSize + 2}px`,
        top: `${targetRect.top + targetRect.height / 2 - (computedStyle.top as number) - arrowSize / 2}px`,
        transform: "rotate(90deg)",
      };
    } else if (position === "left") {
      return {
        position: "absolute" as const,
        right: `-${arrowSize + 2}px`,
        top: `${targetRect.top + targetRect.height / 2 - (computedStyle.top as number) - arrowSize / 2}px`,
        transform: "rotate(-90deg)",
      };
    }
    return null;
  })();

  const progress = totalSteps > 1 ? ((stepIndex + 1) / totalSteps) * 100 : 100;

  return (
    <motion.div
      initial={position === "center" ? { opacity: 0, scale: 0.9 } : { opacity: 0, y: position === "top" ? 8 : -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: position === "top" ? 8 : -8 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
      className="rounded-xl border border-border bg-card shadow-2xl"
      style={getStyle()}
    >
      {/* Progress bar at top */}
      <div className="h-1 w-full overflow-hidden rounded-t-xl bg-muted">
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      <div className="p-5">
        {/* Header with icon and close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <StepIcon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Step {stepIndex + 1} of {totalSteps}
              </p>
              <h3 className="mt-0.5 text-base font-semibold leading-tight text-foreground">
                {step.title}
              </h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>

        {/* Navigation */}
        <div className="mt-5 flex items-center justify-between">
          <div>
            {stepIndex > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrev}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip tour
              </Button>
            )}
          </div>
          <Button
            size="sm"
            onClick={onNext}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {stepIndex === totalSteps - 1 ? "Finish" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {arrowStyle && (
        <div
          className="absolute h-[10px] w-[10px] rotate-45 border-l border-t border-emerald-300/50 bg-card"
          style={arrowStyle}
        />
      )}
    </motion.div>
  );
}

/* ── Step Dots (for center-positioned welcome/end) ── */

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current ? "w-5 bg-emerald-500" : "w-1.5 bg-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

/* ── Main Tour Overlay Component ── */

export default function PlatformTour() {
  const {
    active,
    currentStep,
    steps,
    nextStep,
    prevStep,
    stopTour,
    markCompleted,
  } = useTourStore();
  const { setCurrentPage } = useAppStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);

  const step = steps[currentStep];

  // Navigate to the correct page if needed
  useEffect(() => {
    if (!active || !step?.navigateTo) return;
    setCurrentPage(step.navigateTo);
  }, [active, currentStep, step?.navigateTo, setCurrentPage]);

  // Measure target element
  const measureTarget = useCallback(() => {
    if (!active || !step) return;

    if (!step.target || step.position === "center") {
      setTargetRect(null);
      setReady(true);
      return;
    }

    // Wait for the page content to render (longer delay for page navigation)
    const timer = setTimeout(() => {
      const el = document.querySelector(step.target!);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          setTargetRect(null);
        } else {
          setTargetRect(rect);
        }
      } else {
        // Target not found — fallback to center
        setTargetRect(null);
      }
      setReady(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [active, currentStep, step, steps]);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      const cleanup = measureTarget();
      // Cleanup is handled by the timeout inside measureTarget
      void cleanup;
    });
    return () => cancelAnimationFrame(timer);
  }, [measureTarget]);

  // Re-measure on resize
  useEffect(() => {
    if (!active) return;

    const handleResize = () => {
      if (step?.target && step.position !== "center") {
        const el = document.querySelector(step.target);
        if (el) setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener("resize", handleResize);

    // Also observe DOM changes (for dynamic content)
    observerRef.current = new MutationObserver(() => {
      handleResize();
    });
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      observerRef.current?.disconnect();
    };
  }, [active, step]);

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        markCompleted();
        stopTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, nextStep, prevStep, stopTour, markCompleted]);

  if (!active || !step || !ready) return null;

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Dark overlay with spotlight cutout */}
          <SpotlightOverlay targetRect={targetRect} />

          {/* Ring highlight around target */}
          <SpotlightRing targetRect={targetRect} />

          {/* Tooltip card */}
          <TourTooltip
            step={step}
            stepIndex={currentStep}
            totalSteps={steps.length}
            targetRect={targetRect}
            onNext={() => {
              if (currentStep === steps.length - 1) {
                markCompleted();
                stopTour();
              } else {
                nextStep();
              }
            }}
            onPrev={prevStep}
            onSkip={() => {
              markCompleted();
              stopTour();
            }}
          />

          {/* Step dots at bottom for center-positioned steps */}
          {step.position === "center" && (
            <div className="fixed bottom-8 left-1/2 z-[10001] -translate-x-1/2">
              <StepDots current={currentStep} total={steps.length} />
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Auto-start hook ── */
export function useAutoStartTour() {
  const { startTour, isTourCompleted } = useTourStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("transitops_tour_done");
    if (!done) {
      // Delay start slightly to let the page render
      const timer = setTimeout(() => {
        startTour();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [startTour]);
}