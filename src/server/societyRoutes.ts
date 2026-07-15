import express, { Request, Response } from "express";
import { getDb } from "../db/client.ts";
import { authenticateToken } from "./authRoutes.ts";
import { Society, Building, Flat, BuildingType, FlatType, OccupancyStatus, Resident, ResidentType } from "../types.ts";

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

    // Check duplicate building code or name in this society (robust cross-driver check)
    const buildingsList = await db.collection("buildings").find({});
    const normalizedCode = buildingCode.toUpperCase().trim();
    const normalizedName = buildingName.trim().toLowerCase();

    const duplicate = buildingsList.find(b => 
      b.buildingCode.toUpperCase().trim() === normalizedCode ||
      b.buildingName.trim().toLowerCase() === normalizedName
    );

    if (duplicate) {
      return res.status(400).json({ 
        success: false, 
        error: duplicate.buildingCode.toUpperCase().trim() === normalizedCode
          ? `A building with code '${buildingCode}' already exists.`
          : `A building with name '${buildingName}' already exists.`
      });
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

    // Check duplicate building code or name (excluding itself) - robust cross-driver check
    const buildingsList = await db.collection("buildings").find({});
    const normalizedCode = buildingCode.toUpperCase().trim();
    const normalizedName = buildingName.trim().toLowerCase();

    const duplicate = buildingsList.find(b => 
      b._id !== id && (
        b.buildingCode.toUpperCase().trim() === normalizedCode ||
        b.buildingName.trim().toLowerCase() === normalizedName
      )
    );

    if (duplicate) {
      return res.status(400).json({ 
        success: false, 
        error: duplicate.buildingCode.toUpperCase().trim() === normalizedCode
          ? `A building with code '${buildingCode}' already exists.`
          : `A building with name '${buildingName}' already exists.`
      });
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

    // Verify duplicate flat number within same building (case-insensitive & trimmed)
    const flatsList = await db.collection("flats").find({ buildingId });
    const normalizedFlatNo = flatNumber.trim().toLowerCase();
    const existingFlat = flatsList.find(f => f.flatNumber.trim().toLowerCase() === normalizedFlatNo);
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

    // Verify duplicate flat number within same building (case-insensitive & trimmed, excluding itself)
    const flatsList = await db.collection("flats").find({ buildingId });
    const normalizedFlatNo = flatNumber.trim().toLowerCase();
    const existingFlat = flatsList.find(f => f._id !== id && f.flatNumber.trim().toLowerCase() === normalizedFlatNo);
    if (existingFlat) {
      return res.status(400).json({ success: false, error: `Flat '${flatNumber}' is already configured in building '${building.buildingName}'.` });
    }

    const updateFields = {
      buildingId,
      flatNumber: flatNumber.trim(),
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

/**
 * @route   GET /api/v1/society-management/residents
 * @desc    Get all residents with populated buildings and flats
 */
societyRouter.get("/residents", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const residents = await db.collection("residents").find({});
    const buildings = await db.collection("buildings").find({});
    const flats = await db.collection("flats").find({});

    const buildingsMap = new Map(buildings.map(b => [b._id, b]));
    const flatsMap = new Map(flats.map(f => [f._id, f]));

    const populated = residents.map(r => ({
      ...r,
      building: buildingsMap.get(r.buildingId) || null,
      flat: flatsMap.get(r.flatId) || null
    }));

    return res.json({ success: true, residents: populated });
  } catch (err: any) {
    console.error("GET Residents Error:", err);
    return res.status(500).json({ success: false, error: "Failed to load residents list." });
  }
});

/**
 * @route   GET /api/v1/society-management/residents/me
 * @desc    Get currently logged in resident's flat, building, and household members
 */
societyRouter.get("/residents/me", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const currentUser = (req as any).user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    // Find resident profile matching current user email
    const email = currentUser.email.toLowerCase().trim();
    let residentProfile = await db.collection("residents").findOne({ email });

    // If not found by email, see if any flat has ownerId or tenantId as user ID or email match
    let flatDoc = null;
    if (residentProfile) {
      flatDoc = await db.collection("flats").findOne({ _id: residentProfile.flatId });
    } else {
      flatDoc = await db.collection("flats").findOne({
        $or: [
          { ownerId: currentUser._id },
          { tenantId: currentUser._id }
        ]
      });

      if (flatDoc) {
        // Synthesize a resident profile for this user as Self
        const isOwner = flatDoc.ownerId === currentUser._id;
        residentProfile = {
          _id: "synthesized-" + currentUser._id,
          flatId: flatDoc._id,
          buildingId: flatDoc.buildingId,
          societyId: "", 
          residentType: isOwner ? "Owner" : "Tenant",
          relationshipToOwner: "Self",
          firstName: currentUser.name.split(" ")[0] || currentUser.name,
          lastName: currentUser.name.split(" ").slice(1).join(" ") || "",
          gender: "Male",
          dob: "1990-01-01",
          mobile: currentUser.phone || "",
          email: currentUser.email,
          status: "Active",
          createdAt: currentUser.createdAt,
          updatedAt: currentUser.updatedAt
        };
      }
    }

    if (!flatDoc) {
      return res.json({
        success: true,
        resident: null,
        flat: null,
        building: null,
        members: []
      });
    }

    // Fetch building and members
    const buildingDoc = await db.collection("buildings").findOne({ _id: flatDoc.buildingId });
    const membersList = await db.collection("residents").find({ flatId: flatDoc._id });

    // Populate building name on flat for convenience
    const flatWithBuilding = {
      ...flatDoc,
      building: buildingDoc || null
    };

    return res.json({
      success: true,
      resident: residentProfile,
      flat: flatWithBuilding,
      building: buildingDoc,
      members: membersList
    });
  } catch (err: any) {
    console.error("GET My Flat Info Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to load your flat info." });
  }
});

/**
 * @route   POST /api/v1/society-management/residents
 * @desc    Add a new resident
 */
societyRouter.post("/residents", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      flatId,
      buildingId,
      residentType,
      relationshipToOwner,
      firstName,
      lastName,
      gender,
      dob,
      mobile,
      email,
      bloodGroup,
      occupation,
      companyName,
      emergencyContact,
      status
    } = req.body;

    if (!flatId || !buildingId || !residentType || !firstName || !lastName || !gender || !dob || !mobile || !email) {
      return res.status(400).json({ success: false, error: "Please provide all required fields." });
    }

    const db = await getDb();

    // Verify building and flat exist
    const building = await db.collection("buildings").findOne({ _id: buildingId });
    if (!building) {
      return res.status(400).json({ success: false, error: "Assigned Building does not exist." });
    }

    const flat = await db.collection("flats").findOne({ _id: flatId });
    if (!flat) {
      return res.status(400).json({ success: false, error: "Assigned Flat does not exist." });
    }

    // Check duplicate email in residents (case-insensitive & trimmed)
    const normalizedEmail = email.toLowerCase().trim();
    const residentsList = await db.collection("residents").find({});
    const existingResident = residentsList.find(r => r.email.toLowerCase().trim() === normalizedEmail);
    if (existingResident) {
      return res.status(400).json({ success: false, error: `A resident with email '${email}' is already registered.` });
    }

    const newResident: Omit<Resident, "_id"> = {
      flatId,
      buildingId,
      societyId: building.societyId,
      residentType,
      relationshipToOwner: relationshipToOwner || "Self",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      dob,
      mobile: mobile.trim(),
      email: normalizedEmail,
      bloodGroup: bloodGroup ? bloodGroup.trim() : undefined,
      occupation: occupation ? occupation.trim() : undefined,
      companyName: companyName ? companyName.trim() : undefined,
      emergencyContact: emergencyContact || { name: "", mobile: "" },
      status: status || "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection("residents").insertOne(newResident);
    const insertedId = result.insertedId;

    // Update the flat's residentIds array
    await db.collection("flats").updateOne(
      { _id: flatId },
      { $addToSet: { residentIds: insertedId } }
    );

    // If the resident is Owner or Tenant, we should also update the Flat's ownerId / tenantId appropriately!
    if (residentType === "Owner") {
      await db.collection("flats").updateOne(
        { _id: flatId },
        { $set: { ownerId: insertedId, occupancyStatus: "Owner Occupied" } }
      );
    } else if (residentType === "Tenant") {
      await db.collection("flats").updateOne(
        { _id: flatId },
        { $set: { tenantId: insertedId, occupancyStatus: "Tenant Occupied" } }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Resident registered successfully!",
      residentId: insertedId
    });
  } catch (err: any) {
    console.error("POST Resident Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to register resident." });
  }
});

/**
 * @route   PUT /api/v1/society-management/residents/:id
 * @desc    Update a resident
 */
societyRouter.put("/residents/:id", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      flatId,
      buildingId,
      residentType,
      relationshipToOwner,
      firstName,
      lastName,
      gender,
      dob,
      mobile,
      email,
      bloodGroup,
      occupation,
      companyName,
      emergencyContact,
      status
    } = req.body;

    if (!flatId || !buildingId || !residentType || !firstName || !lastName || !gender || !dob || !mobile || !email) {
      return res.status(400).json({ success: false, error: "Please provide all required fields." });
    }

    const db = await getDb();

    // Verify resident exists
    const resident = await db.collection("residents").findOne({ _id: id });
    if (!resident) {
      return res.status(404).json({ success: false, error: "Resident not found." });
    }

    // Verify building and flat exist
    const building = await db.collection("buildings").findOne({ _id: buildingId });
    if (!building) {
      return res.status(400).json({ success: false, error: "Assigned Building does not exist." });
    }

    const flat = await db.collection("flats").findOne({ _id: flatId });
    if (!flat) {
      return res.status(400).json({ success: false, error: "Assigned Flat does not exist." });
    }

    // Check duplicate email (excluding itself)
    const normalizedEmail = email.toLowerCase().trim();
    const residentsList = await db.collection("residents").find({});
    const existingResident = residentsList.find(r => r._id !== id && r.email.toLowerCase().trim() === normalizedEmail);
    if (existingResident) {
      return res.status(400).json({ success: false, error: `A resident with email '${email}' is already registered.` });
    }

    const oldFlatId = resident.flatId;

    const updateFields = {
      flatId,
      buildingId,
      residentType,
      relationshipToOwner: relationshipToOwner || "Self",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      dob,
      mobile: mobile.trim(),
      email: normalizedEmail,
      bloodGroup: bloodGroup ? bloodGroup.trim() : undefined,
      occupation: occupation ? occupation.trim() : undefined,
      companyName: companyName ? companyName.trim() : undefined,
      emergencyContact: emergencyContact || { name: "", mobile: "" },
      status: status || "Active",
      updatedAt: new Date().toISOString()
    };

    await db.collection("residents").updateOne({ _id: id }, { $set: updateFields });

    // Handle flat transition if flatId changed
    if (oldFlatId !== flatId) {
      // Remove from old flat's residentIds
      await db.collection("flats").updateOne(
        { _id: oldFlatId },
        { $pull: { residentIds: id } }
      );
      // Clean owner/tenant reference if they were owner/tenant in old flat
      const oldFlat = await db.collection("flats").findOne({ _id: oldFlatId });
      if (oldFlat) {
        const resetFields: any = {};
        if (oldFlat.ownerId === id) resetFields.ownerId = null;
        if (oldFlat.tenantId === id) resetFields.tenantId = null;
        if (Object.keys(resetFields).length > 0) {
          await db.collection("flats").updateOne({ _id: oldFlatId }, { $set: resetFields });
        }
      }

      // Add to new flat's residentIds
      await db.collection("flats").updateOne(
        { _id: flatId },
        { $addToSet: { residentIds: id } }
      );
    }

    // Update flat's ownerId / tenantId appropriately!
    if (residentType === "Owner") {
      await db.collection("flats").updateOne(
        { _id: flatId },
        { $set: { ownerId: id, occupancyStatus: "Owner Occupied" } }
      );
    } else if (residentType === "Tenant") {
      await db.collection("flats").updateOne(
        { _id: flatId },
        { $set: { tenantId: id, occupancyStatus: "Tenant Occupied" } }
      );
    }

    return res.json({
      success: true,
      message: "Resident profile updated successfully!"
    });
  } catch (err: any) {
    console.error("PUT Resident Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to update resident." });
  }
});

/**
 * @route   DELETE /api/v1/society-management/residents/:id
 * @desc    Delete a resident
 */
societyRouter.delete("/residents/:id", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();

    // Verify resident exists
    const resident = await db.collection("residents").findOne({ _id: id });
    if (!resident) {
      return res.status(404).json({ success: false, error: "Resident not found." });
    }

    // Remove from flat's residentIds and ownerId / tenantId
    await db.collection("flats").updateOne(
      { _id: resident.flatId },
      { $pull: { residentIds: id } }
    );

    const flat = await db.collection("flats").findOne({ _id: resident.flatId });
    if (flat) {
      const resetFields: any = {};
      if (flat.ownerId === id) resetFields.ownerId = null;
      if (flat.tenantId === id) resetFields.tenantId = null;
      if (Object.keys(resetFields).length > 0) {
        await db.collection("flats").updateOne({ _id: resident.flatId }, { $set: resetFields });
      }
    }

    // Delete the resident
    await db.collection("residents").deleteOne({ _id: id });

    return res.json({ success: true, message: "Resident deleted successfully!" });
  } catch (err: any) {
    console.error("DELETE Resident Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to delete resident." });
  }
});
