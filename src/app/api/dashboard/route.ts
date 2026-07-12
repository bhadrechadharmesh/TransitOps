import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [
      totalVehicles,
      vehiclesByStatus,
      tripsByStatus,
      driversByStatus,
      recentTrips,
      upcomingMaintenance,
    ] = await Promise.all([
      db.vehicle.count(),
      db.vehicle.groupBy({ by: ["status"], _count: { status: true } }),
      db.trip.groupBy({ by: ["status"], _count: { status: true } }),
      db.driver.groupBy({ by: ["status"], _count: { status: true } }),
      db.trip.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
          driver: { select: { id: true, name: true, contact: true } },
        },
      }),
      db.maintenance.findMany({
        where: { status: "Active" },
        include: {
          vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Parse vehicle statuses
    const statusMap: Record<string, number> = {};
    for (const v of vehiclesByStatus) {
      statusMap[v.status] = v._count.status;
    }
    const availableVehicles = statusMap["Available"] || 0;
    const onTripVehicles = statusMap["On Trip"] || 0;
    const inShopVehicles = statusMap["In Shop"] || 0;
    const retiredVehicles = statusMap["Retired"] || 0;

    // Parse trip statuses
    const tripStatusMap: Record<string, number> = {};
    for (const t of tripsByStatus) {
      tripStatusMap[t.status] = t._count.status;
    }
    const activeTrips = tripStatusMap["Dispatched"] || 0;
    const pendingTrips = tripStatusMap["Draft"] || 0;
    const completedTrips = tripStatusMap["Completed"] || 0;

    // Parse driver statuses
    const driverStatusMap: Record<string, number> = {};
    for (const d of driversByStatus) {
      driverStatusMap[d.status] = d._count.status;
    }
    const driversOnDuty = driverStatusMap["On Trip"] || 0;
    const driversAvailable = driverStatusMap["Available"] || 0;

    // Fleet utilization: (vehicles not Retired and not In Shop) / totalVehicles * 100
    const operationalVehicles = totalVehicles > 0 ? totalVehicles - retiredVehicles - inShopVehicles : 0;
    const fleetUtilization = totalVehicles > 0 ? (operationalVehicles / totalVehicles) * 100 : 0;

    return NextResponse.json({
      totalVehicles,
      availableVehicles,
      onTripVehicles,
      inShopVehicles,
      retiredVehicles,
      activeTrips,
      pendingTrips,
      completedTrips,
      driversOnDuty,
      driversAvailable,
      fleetUtilization: Math.round(fleetUtilization * 100) / 100,
      recentTrips,
      upcomingMaintenance,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}