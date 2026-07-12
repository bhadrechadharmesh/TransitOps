import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, getUserRoleFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10")));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { source: { contains: search } },
        { destination: { contains: search } },
        { vehicle: { regNumber: { contains: search } } },
        { driver: { name: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      db.trip.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
          driver: { select: { id: true, name: true, contact: true } },
        },
      }),
      db.trip.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance } = body;

    if (!source || !destination || !vehicleId || !driverId || cargoWeight === undefined || plannedDistance === undefined) {
      return NextResponse.json(
        { error: "source, destination, vehicleId, driverId, cargoWeight, and plannedDistance are required" },
        { status: 400 }
      );
    }

    // Validate vehicle
    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (vehicle.status === "In Shop") {
      return NextResponse.json({ error: `Vehicle ${vehicle.regNumber} is currently In Shop and cannot be assigned to a trip` }, { status: 400 });
    }
    if (vehicle.status === "Retired") {
      return NextResponse.json({ error: `Vehicle ${vehicle.regNumber} is Retired and cannot be assigned to a trip` }, { status: 400 });
    }
    if (vehicle.status === "On Trip") {
      return NextResponse.json({ error: `Vehicle ${vehicle.regNumber} is already On Trip` }, { status: 400 });
    }

    // Validate driver
    const driver = await db.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    if (driver.status === "On Trip") {
      return NextResponse.json({ error: `Driver ${driver.name} is already On Trip` }, { status: 400 });
    }
    if (driver.status === "Suspended") {
      return NextResponse.json({ error: `Driver ${driver.name} is Suspended and cannot be assigned to a trip` }, { status: 400 });
    }

    // Validate license expiry
    if (new Date(driver.licenseExpiry) <= new Date()) {
      return NextResponse.json(
        { error: `Driver ${driver.name}'s license expired on ${driver.licenseExpiry.toISOString().split("T")[0]} and cannot be assigned` },
        { status: 400 }
      );
    }

    // Validate cargo weight vs capacity
    const weight = parseFloat(cargoWeight);
    if (weight > vehicle.maxCapacity) {
      return NextResponse.json(
        { error: `Cargo weight (${weight}kg) exceeds vehicle ${vehicle.regNumber}'s maximum capacity (${vehicle.maxCapacity}kg)` },
        { status: 400 }
      );
    }

    const trip = await db.trip.create({
      data: {
        source,
        destination,
        vehicleId,
        driverId,
        cargoWeight: weight,
        plannedDistance: parseFloat(plannedDistance),
        status: "Draft",
      },
      include: {
        vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
        driver: { select: { id: true, name: true, contact: true } },
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}