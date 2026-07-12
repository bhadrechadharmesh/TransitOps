import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserRoleFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10")));

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { licenseNumber: { contains: search } },
        { contact: { contains: search } },
      ];
    }
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      db.driver.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.driver.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = getUserRoleFromRequest(request);
    if (role !== "Fleet Manager" && role !== "Safety Officer") {
      return NextResponse.json(
        { error: "Only Fleet Managers or Safety Officers can create drivers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, licenseNumber, licenseCategory, licenseExpiry, contact, safetyScore } = body;

    if (!name || !licenseNumber || !licenseCategory || !licenseExpiry || !contact) {
      return NextResponse.json(
        { error: "name, licenseNumber, licenseCategory, licenseExpiry, and contact are required" },
        { status: 400 }
      );
    }

    const existing = await db.driver.findUnique({ where: { licenseNumber } });
    if (existing) {
      return NextResponse.json({ error: "A driver with this license number already exists" }, { status: 400 });
    }

    const driver = await db.driver.create({
      data: {
        name,
        licenseNumber,
        licenseCategory,
        licenseExpiry: new Date(licenseExpiry),
        contact,
        safetyScore: safetyScore !== undefined ? parseFloat(safetyScore) : 100,
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    console.error("Error creating driver:", error);
    return NextResponse.json({ error: "Failed to create driver" }, { status: 500 });
  }
}