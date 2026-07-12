import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserRoleFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        _count: {
          select: { trips: true, maintenance: true, fuelLogs: true, expenses: true },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return NextResponse.json({ error: "Failed to fetch vehicle" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getUserRoleFromRequest(request);
    if (role !== "Fleet Manager") {
      return NextResponse.json({ error: "Only Fleet Managers can update vehicles" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { regNumber, model, type, maxCapacity, odometer, acquisitionCost, status } = body;

    const existing = await db.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (regNumber && regNumber !== existing.regNumber) {
      const duplicate = await db.vehicle.findUnique({ where: { regNumber } });
      if (duplicate) {
        return NextResponse.json({ error: "A vehicle with this registration number already exists" }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (regNumber !== undefined) updateData.regNumber = regNumber;
    if (model !== undefined) updateData.model = model;
    if (type !== undefined) updateData.type = type;
    if (maxCapacity !== undefined) updateData.maxCapacity = parseFloat(maxCapacity);
    if (odometer !== undefined) updateData.odometer = parseFloat(odometer);
    if (acquisitionCost !== undefined) updateData.acquisitionCost = parseFloat(acquisitionCost);
    if (status !== undefined) updateData.status = status;

    const vehicle = await db.vehicle.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getUserRoleFromRequest(request);
    if (role !== "Fleet Manager") {
      return NextResponse.json({ error: "Only Fleet Managers can delete vehicles" }, { status: 403 });
    }

    const { id } = await params;
    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        trips: {
          where: { status: { in: ["Draft", "Dispatched"] } },
          select: { id: true },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (vehicle.status !== "Available") {
      return NextResponse.json(
        { error: `Cannot delete vehicle with status "${vehicle.status}". Only "Available" vehicles can be deleted.` },
        { status: 400 }
      );
    }

    if (vehicle.trips.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete vehicle that is on active trips (Draft or Dispatched)" },
        { status: 400 }
      );
    }

    await db.vehicle.delete({ where: { id } });

    return NextResponse.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 });
  }
}