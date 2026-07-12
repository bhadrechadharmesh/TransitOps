import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, getUserRoleFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const vehicleId = searchParams.get("vehicleId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10")));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;

    const [data, total] = await Promise.all([
      db.maintenance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
        },
      }),
      db.maintenance.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error("Error fetching maintenance records:", error);
    return NextResponse.json({ error: "Failed to fetch maintenance records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleId, description, cost } = body;

    if (!vehicleId || !description) {
      return NextResponse.json({ error: "vehicleId and description are required" }, { status: 400 });
    }

    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (vehicle.status !== "Available") {
      return NextResponse.json(
        { error: `Vehicle ${vehicle.regNumber} is not Available (status: ${vehicle.status}). Only Available vehicles can be sent for maintenance.` },
        { status: 400 }
      );
    }

    const [maintenance] = await db.$transaction([
      db.maintenance.create({
        data: {
          vehicleId,
          description,
          cost: cost ? parseFloat(cost) : 0,
          status: "Active",
        },
        include: {
          vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
        },
      }),
      db.vehicle.update({
        where: { id: vehicleId },
        data: { status: "In Shop" },
      }),
    ]);

    return NextResponse.json(maintenance, { status: 201 });
  } catch (error) {
    console.error("Error creating maintenance record:", error);
    return NextResponse.json({ error: "Failed to create maintenance record" }, { status: 500 });
  }
}