import express, { Request, Response } from "express";
import { getDb } from "../db/client.ts";
import { authenticateToken } from "./authRoutes.ts";
import { Society, Building, Flat, BuildingType, FlatType, OccupancyStatus } from "../types.ts";

export const societyRouter = express.Router();

/**
 * Helper middleware to restrict access to Admins or SuperAdmins
 */
function requireAdmin(req: Request, res: Response, next: any) {
  const user = (req as any).user;
  if (!user || (user.role !== "Admin" && user.role !== "SuperAdmin")) {
    return res.status(403).json({ success: false, error: "Access denied. Admin privileges required." });
  }
  next();
}

// Apply authentication token to all society routes
societyRouter.use(authenticateToken);

/**
 * @route   GET /api/v1/society-management/users
 * @desc    Get all users (potential residents, owners, tenants)
 */
societyRouter.get("/users", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const users = await db.collection("users").find({});
    // Remove sensitive data
    const safeUsers = users.map(({ passwordHash, ...rest }) => rest);
    return res.json({ success: true, users: safeUsers });
  } catch (err: any) {
    console.error("GET Users Error:", err);
    return res.status(500).json({ success: false, error: "Failed to load users list." });
  }
});

/* ==========================================================================
   SOCIETY MANAGEMENT ENDPOINTS
   ========================================================================== */

/**
 * @route   GET /api/v1/society
 * @desc    Get the details of the active society. If none exists, return empty or seed a default.
 */
societyRouter.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const societies = await db.collection("societies").find({});
    
    if (societies.length === 0) {
      // If there are absolutely no societies, return null or return a standard default placeholder so the UI is happy
      return res.json({ success: true, society: null });
    }

    // Always assume single-society mode for version 1
    return res.json({ success: true, society: societies[0] });
  } catch (err: any) {
    console.error("GET Society Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to retrieve society data." });
  }
});

/**
 * @route   POST /api/v1/society
 * @desc    Create or update the single active society configuration
 */
societyRouter.post("/", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      name,
      registrationNumber,
      societyCode,
      description,
      address,
      city,
      state,
      country,
      pincode,
      email,
      phone,
      emergencyContact,
      status
    } = req.body;

    if (!name || !societyCode || !address || !city || !state || !pincode || !email || !phone) {
      return res.status(400).json({ success: false, error: "Please enter all required fields for the society configuration." });
    }

    const db = await getDb();
    const societies = await db.collection("societies").find({});

    const societyData = {
      name: name.trim(),
      registrationNumber: (registrationNumber || "").trim(),
      societyCode: societyCode.toUpperCase().trim(),
      description: (description || "").trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country: (country || "India").trim(),
      pincode: pincode.trim(),
      email: email.trim(),
      phone: phone.trim(),
      emergencyContact: (emergencyContact || "").trim(),
      status: status || "Active",
      updatedAt: new Date().toISOString()
    };

    if (societies.length > 0) {
      // Update existing single society
      const activeSociety = societies[0];
      await db.collection("societies").updateOne(
        { _id: activeSociety._id },
        { $set: societyData }
      );
      
      const updated = await db.collection("societies").findOne({ _id: activeSociety._id });
      return res.json({ success: true, message: "Society details updated successfully!", society: updated });
    } else {
      // Insert new society
      const newSociety = {
        ...societyData,
        createdAt: new Date().toISOString()
      };
      const result = await db.collection("societies").insertOne(newSociety);
      const created = await db.collection("societies").findOne({ _id: result.insertedId });
      return res.status(201).json({ success: true, message: "Society details configured successfully!", society: created });
    }
  } catch (err: any) {
    console.error("POST Society Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to save society details." });
  }
});


/* ==========================================================================
   BUILDINGS SETUP ENDPOINTS
   ========================================================================== */

/**
 * @route   GET /api/v1/society/buildings
 * @desc    Get all buildings configured in the active society
 */
societyRouter.get("/buildings", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const buildings = await db.collection("buildings").find({});
    return res.json({ success: true, buildings });
  } catch (err: any) {
    console.error("GET Buildings Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to retrieve buildings." });
  }
});

/**
 * @route   POST /api/v1/society/buildings
 * @desc    Add a new building to the active society
 */
societyRouter.post("/buildings", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { buildingName, buildingCode, buildingType, floors, totalFlats, status } = req.body;

    if (!buildingName || !buildingCode || !buildingType || floors === undefined || totalFlats === undefined) {
      return res.status(400).json({ success: false, error: "Please enter all required building fields." });
    }

    const floorsNum = Number(floors);
    const totalFlatsNum = Number(totalFlats);

    if (isNaN(floorsNum) || floorsNum <= 0) {
      return res.status(400).json({ success: false, error: "Floors count must be a positive number." });
    }

    if (isNaN(totalFlatsNum) || totalFlatsNum < 0) {
      return res.status(400).json({ success: false, error: "Total flats count must be a non-negative number." });
    }

    const db = await getDb();
    
    // Ensure society exists, or get the active one
    const societies = await db.collection("societies").find({});
    if (societies.length === 0) {
      return res.status(400).json({ success: false, error: "Please configure your Society details first before adding buildings." });
    }
    const societyId = societies[0]._id;

    // Check duplicate building code or name in this society
    const existingCode = await db.collection("buildings").findOne({ buildingCode: buildingCode.toUpperCase().trim() });
    if (existingCode) {
      return res.status(400).json({ success: false, error: `A building with code '${buildingCode}' already exists.` });
    }

    const newBuilding: Omit<Building, "_id"> = {
      societyId,
      buildingName: buildingName.trim(),
      buildingCode: buildingCode.toUpperCase().trim(),
      buildingType: buildingType as BuildingType,
      floors: floorsNum,
      totalFlats: totalFlatsNum,
      status: status || "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection("buildings").insertOne(newBuilding);
    const createdBuilding = await db.collection("buildings").findOne({ _id: result.insertedId });

    return res.status(201).json({ success: true, message: "Building added successfully!", building: createdBuilding });
  } catch (err: any) {
    console.error("POST Building Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to create building." });
  }
});

/**
 * @route   PUT /api/v1/society/buildings/:id
 * @desc    Update building details
 */
societyRouter.put("/buildings/:id", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { buildingName, buildingCode, buildingType, floors, totalFlats, status } = req.body;

    if (!buildingName || !buildingCode || !buildingType || floors === undefined || totalFlats === undefined) {
      return res.status(400).json({ success: false, error: "Please enter all required building fields." });
    }

    const floorsNum = Number(floors);
    const totalFlatsNum = Number(totalFlats);

    if (isNaN(floorsNum) || floorsNum <= 0) {
      return res.status(400).json({ success: false, error: "Floors count must be a positive number." });
    }

    if (isNaN(totalFlatsNum) || totalFlatsNum < 0) {
      return res.status(400).json({ success: false, error: "Total flats count must be a non-negative number." });
    }

    const db = await getDb();

    // Check building existence
    const building = await db.collection("buildings").findOne({ _id: id });
    if (!building) {
      return res.status(404).json({ success: false, error: "Building not found." });
    }

    // Check duplicate building code (excluding itself)
    const normalizedCode = buildingCode.toUpperCase().trim();
    const existingCode = await db.collection("buildings").findOne({ buildingCode: normalizedCode });
    if (existingCode && existingCode._id !== id) {
      return res.status(400).json({ success: false, error: `A building with code '${buildingCode}' already exists.` });
    }

    const updateFields = {
      buildingName: buildingName.trim(),
      buildingCode: normalizedCode,
      buildingType: buildingType as BuildingType,
      floors: floorsNum,
      totalFlats: totalFlatsNum,
      status: status || "Active",
      updatedAt: new Date().toISOString()
    };

    await db.collection("buildings").updateOne({ _id: id }, { $set: updateFields });
    const updatedBuilding = await db.collection("buildings").findOne({ _id: id });

    return res.json({ success: true, message: "Building updated successfully!", building: updatedBuilding });
  } catch (err: any) {
    console.error("PUT Building Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to update building." });
  }
});

/**
 * @route   DELETE /api/v1/society/buildings/:id
 * @desc    Delete building & verify if any flat is associated
 */
societyRouter.delete("/buildings/:id", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();

    // Verify if there are flats registered under this building
    const flatsCount = await db.collection("flats").countDocuments({ buildingId: id });
    if (flatsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete building. There are ${flatsCount} flats configured in this building. Delete or re-assign them first.`
      });
    }

    const result = await db.collection("buildings").deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Building not found or already deleted." });
    }

    return res.json({ success: true, message: "Building deleted successfully!" });
  } catch (err: any) {
    console.error("DELETE Building Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to delete building." });
  }
});


/* ==========================================================================
   FLATS CONFIGURATION ENDPOINTS
   ========================================================================== */

/**
 * @route   GET /api/v1/society/flats
 * @desc    Get all flats with details
 */
societyRouter.get("/flats", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const flats = await db.collection("flats").find({});
    const buildings = await db.collection("buildings").find({});

    // Map building details to flats for quick rendering convenience
    const buildingsMap = new Map(buildings.map(b => [b._id, b]));
    const hydratedFlats = flats.map(flat => ({
      ...flat,
      building: buildingsMap.get(flat.buildingId) || null
    }));

    return res.json({ success: true, flats: hydratedFlats });
  } catch (err: any) {
    console.error("GET Flats Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to retrieve flats list." });
  }
});

/**
 * @route   POST /api/v1/society/flats
 * @desc    Configure/Add a new flat under a building
 */
societyRouter.post("/flats", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { buildingId, flatNumber, floor, flatType, occupancyStatus, ownerId, tenantId, parkingIds } = req.body;

    if (!buildingId || !flatNumber || floor === undefined || !flatType || !occupancyStatus) {
      return res.status(400).json({ success: false, error: "Please enter all required flat fields." });
    }

    const floorNum = Number(floor);
    if (isNaN(floorNum)) {
      return res.status(400).json({ success: false, error: "Floor must be a valid number." });
    }

    const db = await getDb();

    // Verify building exists
    const building = await db.collection("buildings").findOne({ _id: buildingId });
    if (!building) {
      return res.status(400).json({ success: false, error: "Assigned Building does not exist." });
    }

    // Verify duplicate flat number within same building
    const existingFlat = await db.collection("flats").findOne({
      buildingId,
      flatNumber: flatNumber.trim()
    });
    if (existingFlat) {
      return res.status(400).json({ success: false, error: `Flat '${flatNumber}' is already configured in building '${building.buildingName}'.` });
    }

    const newFlat: Omit<Flat, "_id"> = {
      buildingId,
      flatNumber: flatNumber.trim(),
      floor: floorNum,
      flatType: flatType as FlatType,
      occupancyStatus: occupancyStatus as OccupancyStatus,
      ownerId: ownerId || null,
      tenantId: tenantId || null,
      residentIds: [],
      parkingIds: parkingIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection("flats").insertOne(newFlat);
    const createdFlat = await db.collection("flats").findOne({ _id: result.insertedId });

    return res.status(201).json({
      success: true,
      message: "Flat configured successfully!",
      flat: { ...createdFlat, building }
    });
  } catch (err: any) {
    console.error("POST Flat Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to configure flat." });
  }
});

/**
 * @route   PUT /api/v1/society/flats/:id
 * @desc    Update flat details
 */
societyRouter.put("/flats/:id", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { buildingId, flatNumber, floor, flatType, occupancyStatus, ownerId, tenantId, parkingIds } = req.body;

    if (!buildingId || !flatNumber || floor === undefined || !flatType || !occupancyStatus) {
      return res.status(400).json({ success: false, error: "Please enter all required flat fields." });
    }

    const floorNum = Number(floor);
    if (isNaN(floorNum)) {
      return res.status(400).json({ success: false, error: "Floor must be a valid number." });
    }

    const db = await getDb();

    // Verify flat exists
    const flat = await db.collection("flats").findOne({ _id: id });
    if (!flat) {
      return res.status(404).json({ success: false, error: "Flat not found." });
    }

    // Verify building exists
    const building = await db.collection("buildings").findOne({ _id: buildingId });
    if (!building) {
      return res.status(400).json({ success: false, error: "Assigned Building does not exist." });
    }

    // Verify duplicate flat number within same building (excluding itself)
    const trimmedFlatNo = flatNumber.trim();
    const existingFlat = await db.collection("flats").findOne({
      buildingId,
      flatNumber: trimmedFlatNo
    });
    if (existingFlat && existingFlat._id !== id) {
      return res.status(400).json({ success: false, error: `Flat '${flatNumber}' is already configured in building '${building.buildingName}'.` });
    }

    const updateFields = {
      buildingId,
      flatNumber: trimmedFlatNo,
      floor: floorNum,
      flatType: flatType as FlatType,
      occupancyStatus: occupancyStatus as OccupancyStatus,
      ownerId: ownerId || null,
      tenantId: tenantId || null,
      parkingIds: parkingIds || [],
      updatedAt: new Date().toISOString()
    };

    await db.collection("flats").updateOne({ _id: id }, { $set: updateFields });
    const updatedFlat = await db.collection("flats").findOne({ _id: id });

    return res.json({
      success: true,
      message: "Flat configurations updated successfully!",
      flat: { ...updatedFlat, building }
    });
  } catch (err: any) {
    console.error("PUT Flat Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to update flat configuration." });
  }
});

/**
 * @route   DELETE /api/v1/society/flats/:id
 * @desc    Delete a flat configuration
 */
societyRouter.delete("/flats/:id", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const result = await db.collection("flats").deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Flat not found or already deleted." });
    }

    return res.json({ success: true, message: "Flat configuration deleted successfully!" });
  } catch (err: any) {
    console.error("DELETE Flat Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to delete flat configuration." });
  }
});
