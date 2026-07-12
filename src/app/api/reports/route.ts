import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // --- Fuel Efficiency ---
    const completedTrips = await db.trip.findMany({
      where: {
        status: "Completed",
        actualDistance: { gt: 0 },
        fuelConsumed: { gt: 0 },
      },
      select: {
        id: true,
        actualDistance: true,
        fuelConsumed: true,
        vehicleId: true,
        vehicle: { select: { regNumber: true, model: true, type: true } },
      },
    });

    const fuelEfficiency = completedTrips.map((trip) => ({
      tripId: trip.id,
      vehicleRegNumber: trip.vehicle.regNumber,
      vehicleModel: trip.vehicle.model,
      vehicleType: trip.vehicle.type,
      actualDistance: trip.actualDistance,
      fuelConsumed: trip.fuelConsumed,
      efficiency: Math.round((trip.actualDistance! / trip.fuelConsumed!) * 100) / 100, // km per liter
    }));

    // --- Operational Costs per Vehicle ---
    const vehicles = await db.vehicle.findMany({
      include: {
        fuelLogs: { select: { cost: true } },
        maintenance: { select: { cost: true } },
        expenses: { select: { amount: true } },
      },
    });

    const operationalCosts = vehicles.map((v) => {
      const totalFuelCost = v.fuelLogs.reduce((sum, f) => sum + f.cost, 0);
      const totalMaintenanceCost = v.maintenance.reduce((sum, m) => sum + m.cost, 0);
      const totalExpenseCost = v.expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalCost = totalFuelCost + totalMaintenanceCost + totalExpenseCost;

      return {
        vehicleId: v.id,
        regNumber: v.regNumber,
        model: v.model,
        type: v.type,
        fuelCost: Math.round(totalFuelCost * 100) / 100,
        maintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
        expenseCost: Math.round(totalExpenseCost * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
      };
    });

    // --- Vehicle ROI ---
    const REVENUE_RATE_PER_KM = 15;

    const vehicleROI = await Promise.all(
      vehicles.map(async (v) => {
        const completedTripsForVehicle = await db.trip.findMany({
          where: { vehicleId: v.id, status: "Completed" },
          select: { plannedDistance: true },
        });

        const totalRevenue = completedTripsForVehicle.reduce(
          (sum, t) => sum + t.plannedDistance * REVENUE_RATE_PER_KM,
          0
        );
        const totalMaintenanceCost = v.maintenance.reduce((sum, m) => sum + m.cost, 0);
        const totalFuelCost = v.fuelLogs.reduce((sum, f) => sum + f.cost, 0);
        const totalExpenses = v.expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalRevenue - totalMaintenanceCost - totalFuelCost - totalExpenses;
        const roi = v.acquisitionCost > 0 ? (netProfit / v.acquisitionCost) * 100 : 0;

        return {
          vehicleId: v.id,
          regNumber: v.regNumber,
          model: v.model,
          type: v.type,
          acquisitionCost: v.acquisitionCost,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
          totalFuelCost: Math.round(totalFuelCost * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          roi: Math.round(roi * 100) / 100,
        };
      })
    );

    // --- Monthly Trips (last 6 months) ---
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const allTrips = await db.trip.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const monthlyTrips: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = monthStart.toLocaleString("default", { month: "short", year: "2-digit" });

      const count = allTrips.filter(
        (t) => t.createdAt >= monthStart && t.createdAt < monthEnd
      ).length;

      monthlyTrips.push({ month: monthLabel, count });
    }

    // --- Monthly Fuel Cost (last 6 months) ---
    const allFuelLogs = await db.fuelLog.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { date: true, cost: true },
    });

    const monthlyFuelCost: { month: string; cost: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = monthStart.toLocaleString("default", { month: "short", year: "2-digit" });

      const cost = allFuelLogs
        .filter((f) => f.date >= monthStart && f.date < monthEnd)
        .reduce((sum, f) => sum + f.cost, 0);

      monthlyFuelCost.push({ month: monthLabel, cost: Math.round(cost * 100) / 100 });
    }

    return NextResponse.json({
      fuelEfficiency,
      operationalCosts,
      vehicleROI,
      monthlyTrips,
      monthlyFuelCost,
    });
  } catch (error) {
    console.error("Error fetching reports data:", error);
    return NextResponse.json({ error: "Failed to fetch reports data" }, { status: 500 });
  }
}