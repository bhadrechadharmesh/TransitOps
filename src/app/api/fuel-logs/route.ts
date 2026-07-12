import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10")));

    const where: Record<string, unknown> = {};
    if (vehicleId) where.vehicleId = vehicleId;

    const [data, total] = await Promise.all([
      db.fuelLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
        },
      }),
      db.fuelLog.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error("Error fetching fuel logs:", error);
    return NextResponse.json({ error: "Failed to fetch fuel logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleId, liters, cost, date } = body;

    if (!vehicleId || liters === undefined || cost === undefined) {
      return NextResponse.json({ error: "vehicleId, liters, and cost are required" }, { status: 400 });
    }

    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const fuelLog = await db.fuelLog.create({
      data: {
        vehicleId,
        liters: parseFloat(liters),
        cost: parseFloat(cost),
        date: date ? new Date(date) : new Date(),
      },
      include: {
        vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
      },
    });

    return NextResponse.json(fuelLog, { status: 201 });
  } catch (error) {
    console.error("Error creating fuel log:", error);
    return NextResponse.json({ error: "Failed to create fuel log" }, { status: 500 });
  }
}