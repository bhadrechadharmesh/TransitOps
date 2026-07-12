import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const maintenance = await db.maintenance.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!maintenance) {
      return NextResponse.json({ error: "Maintenance record not found" }, { status: 404 });
    }

    return NextResponse.json(maintenance);
  } catch (error) {
    console.error("Error fetching maintenance record:", error);
    return NextResponse.json({ error: "Failed to fetch maintenance record" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== "close") {
      return NextResponse.json({ error: "Invalid action. Supported action: close" }, { status: 400 });
    }

    const maintenance = await db.maintenance.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!maintenance) {
      return NextResponse.json({ error: "Maintenance record not found" }, { status: 404 });
    }

    if (maintenance.status === "Closed") {
      return NextResponse.json({ error: "Maintenance record is already closed" }, { status: 400 });
    }

    const transactionOps = [
      db.maintenance.update({
        where: { id },
        data: {
          status: "Closed",
          closedAt: new Date(),
        },
        include: { vehicle: true },
      }),
    ];

    // Set vehicle status to Available only if not Retired
    if (maintenance.vehicle.status !== "Retired") {
      transactionOps.push(
        db.vehicle.update({
          where: { id: maintenance.vehicleId },
          data: { status: "Available" },
        })
      );
    }

    const [updatedMaintenance] = await db.$transaction(transactionOps);

    return NextResponse.json(updatedMaintenance);
  } catch (error) {
    console.error("Error updating maintenance record:", error);
    return NextResponse.json({ error: "Failed to update maintenance record" }, { status: 500 });
  }
}