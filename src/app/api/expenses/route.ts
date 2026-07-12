import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId") || "";
    const type = searchParams.get("type") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10")));

    const where: Record<string, unknown> = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      db.expense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
        },
      }),
      db.expense.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { vehicleId, type, amount, date } = body;

    if (!vehicleId || !type || amount === undefined) {
      return NextResponse.json({ error: "vehicleId, type, and amount are required" }, { status: 400 });
    }

    const validTypes = ["Toll", "Maintenance", "Insurance", "Fine", "Other"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid expense type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const expense = await db.expense.create({
      data: {
        vehicleId,
        type,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
      },
      include: {
        vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}