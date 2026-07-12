import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserRoleFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driver = await db.driver.findUnique({
      where: { id },
      include: {
        _count: {
          select: { trips: true },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(driver);
  } catch (error) {
    console.error("Error fetching driver:", error);
    return NextResponse.json({ error: "Failed to fetch driver" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getUserRoleFromRequest(request);
    if (!role) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.driver.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Safety Officers can only edit safety scores
    if (role === "Safety Officer") {
      if (body.safetyScore === undefined) {
        return NextResponse.json(
          { error: "Safety Officers can only edit safety scores" },
          { status: 403 }
        );
      }
      updateData.safetyScore = parseFloat(body.safetyScore);
    } else if (role === "Fleet Manager") {
      // Fleet Managers can edit everything
      if (body.name !== undefined) updateData.name = body.name;
      if (body.licenseNumber !== undefined) {
        if (body.licenseNumber !== existing.licenseNumber) {
          const duplicate = await db.driver.findUnique({ where: { licenseNumber: body.licenseNumber } });
          if (duplicate) {
            return NextResponse.json({ error: "A driver with this license number already exists" }, { status: 400 });
          }
        }
        updateData.licenseNumber = body.licenseNumber;
      }
      if (body.licenseCategory !== undefined) updateData.licenseCategory = body.licenseCategory;
      if (body.licenseExpiry !== undefined) updateData.licenseExpiry = new Date(body.licenseExpiry);
      if (body.contact !== undefined) updateData.contact = body.contact;
      if (body.safetyScore !== undefined) updateData.safetyScore = parseFloat(body.safetyScore);
      if (body.status !== undefined) updateData.status = body.status;
    } else {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const driver = await db.driver.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(driver);
  } catch (error) {
    console.error("Error updating driver:", error);
    return NextResponse.json({ error: "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getUserRoleFromRequest(request);
    if (role !== "Fleet Manager") {
      return NextResponse.json({ error: "Only Fleet Managers can delete drivers" }, { status: 403 });
    }

    const { id } = await params;
    const driver = await db.driver.findUnique({
      where: { id },
      include: {
        trips: {
          where: { status: { in: ["Draft", "Dispatched"] } },
          select: { id: true },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (driver.status !== "Available") {
      return NextResponse.json(
        { error: `Cannot delete driver with status "${driver.status}". Only "Available" drivers can be deleted.` },
        { status: 400 }
      );
    }

    if (driver.trips.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete driver that is on active trips (Draft or Dispatched)" },
        { status: 400 }
      );
    }

    await db.driver.delete({ where: { id } });

    return NextResponse.json({ message: "Driver deleted successfully" });
  } catch (error) {
    console.error("Error deleting driver:", error);
    return NextResponse.json({ error: "Failed to delete driver" }, { status: 500 });
  }
}