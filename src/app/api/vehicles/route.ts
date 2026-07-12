import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, getUserRoleFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10")));

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { regNumber: { contains: search } },
        { model: { contains: search } },
      ];
    }
    if (type) where.type = type;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      db.vehicle.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.vehicle.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = getUserRoleFromRequest(request);
    if (role !== "Fleet Manager") {
      return NextResponse.json({ error: "Only Fleet Managers can create vehicles" }, { status: 403 });
    }

    const body = await request.json();
    const { regNumber, model, type, maxCapacity, odometer, acquisitionCost } = body;

    if (!regNumber || !model || !type || maxCapacity === undefined) {
      return NextResponse.json({ error: "regNumber, model, type, and maxCapacity are required" }, { status: 400 });
    }

    const existing = await db.vehicle.findUnique({ where: { regNumber } });
    if (existing) {
      return NextResponse.json({ error: "A vehicle with this registration number already exists" }, { status: 400 });
    }

    const vehicle = await db.vehicle.create({
      data: {
        regNumber,
        model,
        type,
        maxCapacity: parseFloat(maxCapacity),
        odometer: odometer ? parseFloat(odometer) : 0,
        acquisitionCost: acquisitionCost ? parseFloat(acquisitionCost) : 0,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
  }
}