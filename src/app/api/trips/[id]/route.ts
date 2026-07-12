import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromRequest, getUserRoleFromRequest } from "@/lib/auth";

const FUEL_RATE_PER_LITER = 95;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trip = await db.trip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
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

    const trip = await db.trip.findUnique({
      where: { id },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // DISPATCH action
    if (action === "dispatch") {
      if (trip.status !== "Draft") {
        return NextResponse.json({ error: `Cannot dispatch a trip with status "${trip.status}". Only "Draft" trips can be dispatched.` }, { status: 400 });
      }

      // Re-validate vehicle and driver status at dispatch time
      if (trip.vehicle.status !== "Available") {
        return NextResponse.json({ error: `Vehicle ${trip.vehicle.regNumber} is no longer available (status: ${trip.vehicle.status})` }, { status: 400 });
      }
      if (trip.driver.status !== "Available") {
        return NextResponse.json({ error: `Driver ${trip.driver.name} is no longer available (status: ${trip.driver.status})` }, { status: 400 });
      }
      if (new Date(trip.driver.licenseExpiry) <= new Date()) {
        return NextResponse.json({ error: `Driver ${trip.driver.name}'s license has expired` }, { status: 400 });
      }

      const [updatedTrip] = await db.$transaction([
        db.trip.update({
          where: { id },
          data: {
            status: "Dispatched",
            dispatchedAt: new Date(),
          },
          include: {
            vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
            driver: { select: { id: true, name: true, contact: true } },
          },
        }),
        db.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: "On Trip" },
        }),
        db.driver.update({
          where: { id: trip.driverId },
          data: { status: "On Trip" },
        }),
      ]);

      return NextResponse.json(updatedTrip);
    }

    // COMPLETE action
    if (action === "complete") {
      if (trip.status !== "Dispatched") {
        return NextResponse.json({ error: `Cannot complete a trip with status "${trip.status}". Only "Dispatched" trips can be completed.` }, { status: 400 });
      }

      const { actualDistance, fuelConsumed, finalOdometer } = body;

      if (actualDistance === undefined || fuelConsumed === undefined || finalOdometer === undefined) {
        return NextResponse.json(
          { error: "actualDistance, fuelConsumed, and finalOdometer are required to complete a trip" },
          { status: 400 }
        );
      }

      const fuelCost = parseFloat(fuelConsumed) * FUEL_RATE_PER_LITER;

      const [updatedTrip] = await db.$transaction([
        db.trip.update({
          where: { id },
          data: {
            status: "Completed",
            actualDistance: parseFloat(actualDistance),
            fuelConsumed: parseFloat(fuelConsumed),
            finalOdometer: parseFloat(finalOdometer),
            completedAt: new Date(),
          },
          include: {
            vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
            driver: { select: { id: true, name: true, contact: true } },
          },
        }),
        db.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: "Available", odometer: parseFloat(finalOdometer) },
        }),
        db.driver.update({
          where: { id: trip.driverId },
          data: { status: "Available" },
        }),
        db.fuelLog.create({
          data: {
            vehicleId: trip.vehicleId,
            liters: parseFloat(fuelConsumed),
            cost: fuelCost,
            date: new Date(),
          },
        }),
      ]);

      return NextResponse.json(updatedTrip);
    }

    // CANCEL action
    if (action === "cancel") {
      if (trip.status !== "Draft" && trip.status !== "Dispatched") {
        return NextResponse.json({ error: `Cannot cancel a trip with status "${trip.status}". Only "Draft" or "Dispatched" trips can be cancelled.` }, { status: 400 });
      }

      const transactionOps: unknown[] = [
        db.trip.update({
          where: { id },
          data: {
            status: "Cancelled",
            cancelledAt: new Date(),
          },
          include: {
            vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
            driver: { select: { id: true, name: true, contact: true } },
          },
        }),
      ];

      // If dispatched, restore vehicle and driver status
      if (trip.status === "Dispatched") {
        transactionOps.push(
          db.vehicle.update({
            where: { id: trip.vehicleId },
            data: { status: "Available" },
          }),
          db.driver.update({
            where: { id: trip.driverId },
            data: { status: "Available" },
          })
        );
      }

      const [updatedTrip] = await db.$transaction(transactionOps as [typeof transactionOps[0]]);

      return NextResponse.json(updatedTrip);
    }

    // UPDATE action (edit draft trip fields)
    if (action === "update") {
      if (trip.status !== "Draft") {
        return NextResponse.json({ error: `Cannot update a trip with status "${trip.status}". Only "Draft" trips can be updated.` }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {};
      if (body.source !== undefined) updateData.source = body.source;
      if (body.destination !== undefined) updateData.destination = body.destination;
      if (body.vehicleId !== undefined) {
        // Validate new vehicle
        if (body.vehicleId !== trip.vehicleId) {
          const newVehicle = await db.vehicle.findUnique({ where: { id: body.vehicleId } });
          if (!newVehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
          }
          if (newVehicle.status !== "Available") {
            return NextResponse.json({ error: `Vehicle ${newVehicle.regNumber} is not available (status: ${newVehicle.status})` }, { status: 400 });
          }
          updateData.vehicleId = body.vehicleId;
        }
      }
      if (body.driverId !== undefined) {
        // Validate new driver
        if (body.driverId !== trip.driverId) {
          const newDriver = await db.driver.findUnique({ where: { id: body.driverId } });
          if (!newDriver) {
            return NextResponse.json({ error: "Driver not found" }, { status: 404 });
          }
          if (newDriver.status === "On Trip" || newDriver.status === "Suspended") {
            return NextResponse.json({ error: `Driver ${newDriver.name} is not available (status: ${newDriver.status})` }, { status: 400 });
          }
          if (new Date(newDriver.licenseExpiry) <= new Date()) {
            return NextResponse.json({ error: `Driver ${newDriver.name}'s license has expired` }, { status: 400 });
          }
          updateData.driverId = body.driverId;
        }
      }
      if (body.cargoWeight !== undefined) {
        const weight = parseFloat(body.cargoWeight);
        // Re-validate cargo weight against the trip's vehicle (or new vehicle if changed)
        const vehicleId = (updateData.vehicleId as string) || trip.vehicleId;
        const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
        if (vehicle && weight > vehicle.maxCapacity) {
          return NextResponse.json(
            { error: `Cargo weight (${weight}kg) exceeds vehicle ${vehicle.regNumber}'s maximum capacity (${vehicle.maxCapacity}kg)` },
            { status: 400 }
          );
        }
        updateData.cargoWeight = weight;
      }
      if (body.plannedDistance !== undefined) {
        updateData.plannedDistance = parseFloat(body.plannedDistance);
      }

      const updatedTrip = await db.trip.update({
        where: { id },
        data: updateData,
        include: {
          vehicle: { select: { id: true, regNumber: true, model: true, type: true } },
          driver: { select: { id: true, name: true, contact: true } },
        },
      });

      return NextResponse.json(updatedTrip);
    }

    return NextResponse.json({ error: "Invalid action. Supported actions: dispatch, complete, cancel, update" }, { status: 400 });
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}