import express, { Request, Response } from "express";
import { getDb } from "../db/client.ts";
import { authenticateToken } from "./authRoutes.ts";
import { Society, Building, Flat, BuildingType, FlatType, OccupancyStatus, Resident, ResidentType, Complaint, ComplaintStatus, ComplaintPriority, ComplaintCategory, ComplaintTimelineEntry } from "../types.ts";

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

/* ==========================================================================
   PHASE 5: COMPLAINTS / TICKETING ENDPOINTS
   ========================================================================== */

/**
 * @route   GET /api/v1/society-management/complaints
 * @desc    Get all complaints in the society (Admin/Staff only)
 */
societyRouter.get("/complaints", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const complaints = await db.collection("complaints").find({});
    
    // Fetch all residents, buildings, flats, and users to map info
    const residents = await db.collection("residents").find({});
    const buildings = await db.collection("buildings").find({});
    const flats = await db.collection("flats").find({});
    const users = await db.collection("users").find({});

    const residentsMap = new Map(residents.map(r => [r._id, r]));
    const buildingsMap = new Map(buildings.map(b => [b._id, b]));
    const flatsMap = new Map(flats.map(f => [f._id, f]));
    const usersMap = new Map(users.map(u => [u._id, u]));

    const populated = complaints.map(c => {
      let residentInfo = residentsMap.get(c.residentId) || null;
      if (!residentInfo) {
        // Try mapping by user ID
        const userObj = usersMap.get(c.residentId);
        if (userObj) {
          residentInfo = {
            _id: userObj._id,
            firstName: userObj.name.split(" ")[0] || userObj.name,
            lastName: userObj.name.split(" ").slice(1).join(" ") || "",
            email: userObj.email,
            mobile: userObj.phone || "",
            residentType: "Resident",
            relationshipToOwner: "Self"
          };
        }
      }

      return {
        ...c,
        resident: residentInfo,
        building: buildingsMap.get(c.buildingId) || null,
        flat: flatsMap.get(c.flatId) || null,
        assignedToUser: c.assignedTo ? usersMap.get(c.assignedTo) : null
      };
    });

    // Sort by newest created first
    populated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, complaints: populated });
  } catch (err: any) {
    console.error("GET Complaints Error:", err);
    return res.status(500).json({ success: false, error: "Failed to load complaints list." });
  }
});

/**
 * @route   GET /api/v1/society-management/complaints/me
 * @desc    Get currently logged in resident's complaints
 */
societyRouter.get("/complaints/me", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const currentUser = (req as any).user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const email = currentUser.email.toLowerCase().trim();
    let residentProfile = await db.collection("residents").findOne({ email });
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
        residentProfile = { _id: "synthesized-" + currentUser._id };
      }
    }

    if (!flatDoc) {
      // User is not linked to any flat yet, so they have no complaints
      return res.json({ success: true, complaints: [] });
    }

    // Retrieve complaints linked to this resident profile ID, or user's account ID, or this flat ID
    const residentIds = [currentUser._id, flatDoc.ownerId, flatDoc.tenantId];
    if (residentProfile) residentIds.push(residentProfile._id);

    // Filter out nulls/undefined
    const validResidentIds = residentIds.filter(id => !!id);

    const complaints = await db.collection("complaints").find({
      $or: [
        { residentId: { $in: validResidentIds } },
        { flatId: flatDoc._id }
      ]
    });

    const buildingDoc = await db.collection("buildings").findOne({ _id: flatDoc.buildingId });
    const users = await db.collection("users").find({});
    const usersMap = new Map(users.map(u => [u._id, u]));

    const populated = complaints.map(c => ({
      ...c,
      flat: flatDoc,
      building: buildingDoc || null,
      assignedToUser: c.assignedTo ? usersMap.get(c.assignedTo) : null
    }));

    // Sort by newest created first
    populated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, complaints: populated });
  } catch (err: any) {
    console.error("GET My Complaints Error:", err);
    return res.status(500).json({ success: false, error: "Failed to load your complaints list." });
  }
});

/**
 * @route   POST /api/v1/society-management/complaints
 * @desc    Submit a new complaint ticket (Resident/User)
 */
societyRouter.post("/complaints", async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description, category, priority, attachments } = req.body;

    if (!title || !description || !category || !priority) {
      return res.status(400).json({ success: false, error: "Please provide all required fields: title, description, category, priority." });
    }

    const db = await getDb();
    const currentUser = (req as any).user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const email = currentUser.email.toLowerCase().trim();
    let residentProfile = await db.collection("residents").findOne({ email });
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
        residentProfile = {
          _id: "synthesized-" + currentUser._id,
          flatId: flatDoc._id,
          buildingId: flatDoc.buildingId,
          societyId: ""
        };
      }
    }

    if (!flatDoc) {
      return res.status(400).json({
        success: false,
        error: "You must be associated with an active flat registry to raise a complaint ticket."
      });
    }

    const buildingDoc = await db.collection("buildings").findOne({ _id: flatDoc.buildingId });
    const societyId = buildingDoc ? buildingDoc.societyId : "";

    // Generate unique complaint ticket number: CMP-YYYY-XXXXXX
    const year = new Date().getFullYear();
    let isUnique = false;
    let ticketNumber = "";

    while (!isUnique) {
      const randomSixDigit = Math.floor(100000 + Math.random() * 900000);
      ticketNumber = `CMP-${year}-${randomSixDigit}`;
      const existing = await db.collection("complaints").findOne({ complaintNumber: ticketNumber });
      if (!existing) {
        isUnique = true;
      }
    }

    const residentId = residentProfile ? residentProfile._id : currentUser._id;

    const newComplaint: Omit<Complaint, "_id"> = {
      complaintNumber: ticketNumber,
      residentId,
      flatId: flatDoc._id,
      buildingId: flatDoc.buildingId,
      societyId,
      title: title.trim(),
      description: description.trim(),
      category: category as ComplaintCategory,
      priority: priority as ComplaintPriority,
      status: "Open" as ComplaintStatus,
      assignedTo: null,
      attachments: attachments || [],
      timeline: [
        {
          status: "Open",
          date: new Date().toISOString(),
          notes: "Complaint registered successfully in the system database.",
          updatedBy: currentUser.name || "Resident"
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection("complaints").insertOne(newComplaint);

    return res.status(201).json({
      success: true,
      message: "Your complaint ticket was submitted successfully!",
      complaintId: result.insertedId,
      complaintNumber: ticketNumber
    });
  } catch (err: any) {
    console.error("POST Complaint Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to submit complaint ticket." });
  }
});

/**
 * @route   PUT /api/v1/society-management/complaints/:id/status
 * @desc    Update complaint ticket status or assign it
 */
societyRouter.put("/complaints/:id/status", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status, notes, assignedTo, resolutionNotes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: "Status field is required." });
    }

    const db = await getDb();
    const currentUser = (req as any).user;

    if (!currentUser) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const complaint = await db.collection("complaints").findOne({ _id: id });
    if (!complaint) {
      return res.status(404).json({ success: false, error: "Complaint ticket not found." });
    }

    const isAdmin = currentUser.role === "Admin" || currentUser.role === "SuperAdmin";

    // Authorization: If not admin, verify they own the ticket and only allow valid transitions
    if (!isAdmin) {
      const email = currentUser.email.toLowerCase().trim();
      let residentProfile = await db.collection("residents").findOne({ email });
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
          residentProfile = { _id: "synthesized-" + currentUser._id };
        }
      }

      const residentId = residentProfile ? residentProfile._id : currentUser._id;
      const isComplainant = complaint.residentId === residentId || (flatDoc && complaint.flatId === flatDoc._id);

      if (!isComplainant) {
        return res.status(403).json({ success: false, error: "You are not authorized to update this complaint ticket." });
      }

      // Valid resident-initiated transitions:
      // - Close ticket: "Open" -> "Closed" or "Resolved" -> "Closed"
      // - Reopen ticket: "Resolved" -> "Reopened"
      const currentStatus = complaint.status;
      const allowedTransitions = [
        { from: "Open", to: "Closed" },
        { from: "Resolved", to: "Closed" },
        { from: "Resolved", to: "Reopened" }
      ];

      const isValidTransition = allowedTransitions.some(t => t.from === currentStatus && t.to === status);
      if (!isValidTransition) {
        return res.status(400).json({
          success: false,
          error: `As a resident, you are not allowed to transition status from '${currentStatus}' to '${status}'.`
        });
      }
    }

    // Build updates
    const updates: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (isAdmin) {
      if (assignedTo !== undefined) {
        updates.assignedTo = assignedTo || null;
      }
      if (resolutionNotes !== undefined) {
        updates.resolutionNotes = resolutionNotes;
      }
    }

    // Construct new timeline entry
    const newTimelineEntry: ComplaintTimelineEntry = {
      status: status as ComplaintStatus,
      date: new Date().toISOString(),
      notes: notes || `Ticket status transitioned to '${status}'.`,
      updatedBy: currentUser.name || "User"
    };

    await db.collection("complaints").updateOne(
      { _id: id },
      {
        $set: updates,
        $push: { timeline: newTimelineEntry }
      }
    );

    return res.json({
      success: true,
      message: `Complaint ticket status successfully updated to '${status}'.`
    });
  } catch (err: any) {
    console.error("PUT Complaint Status Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to update complaint ticket status." });
  }
});

/* ==========================================================================
   PHASE 6: PARKING, VISITORS, GATE LOGS & VEHICLE VERIFICATION ENDPOINTS
   ========================================================================== */

/**
 * @route   GET /api/v1/society-management/parking
 * @desc    Get all parking slots with flat, building, and resident details populated
 */
societyRouter.get("/parking", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const slots = await db.collection("parking_slots").find({});
    const flats = await db.collection("flats").find({});
    const residents = await db.collection("residents").find({});
    const buildings = await db.collection("buildings").find({});

    const flatMap = new Map(flats.map(f => [f._id, f]));
    const residentMap = new Map(residents.map(r => [r._id, r]));
    const buildingMap = new Map(buildings.map(b => [b._id, b]));

    const populated = slots.map(slot => {
      let assignedFlat = null;
      let assignedResident = null;
      let assignedBuilding = null;

      if (slot.assignedResidentId) {
        assignedResident = residentMap.get(slot.assignedResidentId) || null;
        if (assignedResident) {
          assignedFlat = flatMap.get(assignedResident.flatId) || null;
        }
      }

      // Fallback or explicit mapping if flat is assigned directly or through resident
      if (!assignedFlat && slot.assignedFlatId) {
        assignedFlat = flatMap.get(slot.assignedFlatId) || null;
      }

      if (assignedFlat) {
        assignedBuilding = buildingMap.get(assignedFlat.buildingId) || null;
      }

      return {
        ...slot,
        flat: assignedFlat,
        resident: assignedResident,
        building: assignedBuilding
      };
    });

    return res.json({ success: true, parkingSlots: populated });
  } catch (err: any) {
    console.error("GET Parking slots error:", err);
    return res.status(500).json({ success: false, error: "Failed to load parking slots." });
  }
});

/**
 * @route   POST /api/v1/society-management/parking
 * @desc    Add a new parking slot (Admin / SuperAdmin)
 */
societyRouter.post("/parking", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { slotNumber, parkingType, floor, parkingArea, status, coveredParking, evCharging, assignedFlatId, assignedResidentId, vehicleNumber } = req.body;

    if (!slotNumber || !parkingType || !floor || !parkingArea) {
      return res.status(400).json({ success: false, error: "Please provide all required fields: slotNumber, parkingType, floor, parkingArea." });
    }

    const db = await getDb();

    // Check if slot number already exists
    const existing = await db.collection("parking_slots").findOne({ slotNumber: slotNumber.trim() });
    if (existing) {
      return res.status(400).json({ success: false, error: `Parking slot '${slotNumber}' already exists.` });
    }

    const newSlot = {
      slotNumber: slotNumber.trim(),
      parkingType,
      floor: floor.trim(),
      parkingArea: parkingArea.trim(),
      status: status || "Available",
      assignedFlatId: assignedFlatId || null,
      assignedResidentId: assignedResidentId || null,
      coveredParking: !!coveredParking,
      evCharging: !!evCharging,
      vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection("parking_slots").insertOne(newSlot);

    return res.json({ success: true, message: "Parking slot successfully added!", slotId: result.insertedId });
  } catch (err: any) {
    console.error("POST Parking slot error:", err);
    return res.status(500).json({ success: false, error: "Failed to create parking slot." });
  }
});

/**
 * @route   PUT /api/v1/society-management/parking/:id
 * @desc    Update/Assign a parking slot (Admin / SuperAdmin)
 */
societyRouter.put("/parking/:id", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { slotNumber, parkingType, floor, parkingArea, status, coveredParking, evCharging, assignedFlatId, assignedResidentId, vehicleNumber } = req.body;

    const db = await getDb();
    const existingSlot = await db.collection("parking_slots").findOne({ _id: id });
    if (!existingSlot) {
      return res.status(444).json({ success: false, error: "Parking slot not found." });
    }

    // Check if slot number changed and conflicts
    if (slotNumber && slotNumber.trim() !== existingSlot.slotNumber) {
      const duplicate = await db.collection("parking_slots").findOne({ slotNumber: slotNumber.trim() });
      if (duplicate) {
        return res.status(400).json({ success: false, error: `Parking slot '${slotNumber}' already exists.` });
      }
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (slotNumber !== undefined) updates.slotNumber = slotNumber.trim();
    if (parkingType !== undefined) updates.parkingType = parkingType;
    if (floor !== undefined) updates.floor = floor.trim();
    if (parkingArea !== undefined) updates.parkingArea = parkingArea.trim();
    if (status !== undefined) updates.status = status;
    if (coveredParking !== undefined) updates.coveredParking = !!coveredParking;
    if (evCharging !== undefined) updates.evCharging = !!evCharging;
    if (assignedFlatId !== undefined) updates.assignedFlatId = assignedFlatId || null;
    if (assignedResidentId !== undefined) updates.assignedResidentId = assignedResidentId || null;
    if (vehicleNumber !== undefined) updates.vehicleNumber = vehicleNumber ? vehicleNumber.trim().toUpperCase() : "";

    await db.collection("parking_slots").updateOne({ _id: id }, { $set: updates });

    return res.json({ success: true, message: "Parking slot updated successfully!" });
  } catch (err: any) {
    console.error("PUT Parking slot error:", err);
    return res.status(500).json({ success: false, error: "Failed to update parking slot." });
  }
});

/**
 * @route   DELETE /api/v1/society-management/parking/:id
 * @desc    Delete a parking slot (Admin / SuperAdmin)
 */
societyRouter.delete("/parking/:id", requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const result = await db.collection("parking_slots").deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Parking slot not found." });
    }

    return res.json({ success: true, message: "Parking slot deleted successfully." });
  } catch (err: any) {
    console.error("DELETE Parking slot error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete parking slot." });
  }
});

/**
 * @route   GET /api/v1/society-management/visitors
 * @desc    Get expected visitors.
 *          For Residents: Returns only their registered expected visitors.
 *          For Admins/Security: Returns all visitors.
 */
societyRouter.get("/visitors", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const currentUser = (req as any).user;

    const isAdminOrSecurity = currentUser.role === "Admin" || currentUser.role === "SuperAdmin" || currentUser.role === "Security";

    let query: any = {};

    if (!isAdminOrSecurity) {
      // It's a resident. Filter by flat ownerId / tenantId / residentId
      const email = currentUser.email.toLowerCase().trim();
      let residentProfile = await db.collection("residents").findOne({ email });
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
          residentProfile = { _id: "synthesized-" + currentUser._id };
        }
      }

      if (!flatDoc) {
        return res.json({ success: true, visitors: [] });
      }

      const residentIds = [currentUser._id, flatDoc.ownerId, flatDoc.tenantId];
      if (residentProfile) residentIds.push(residentProfile._id);
      const validResidentIds = residentIds.filter(id => !!id);

      query = {
        $or: [
          { residentId: { $in: validResidentIds } },
          { flatId: flatDoc._id }
        ]
      };
    }

    const visitors = await db.collection("visitors").find(query);
    const flats = await db.collection("flats").find({});
    const buildings = await db.collection("buildings").find({});
    const users = await db.collection("users").find({});

    const flatMap = new Map(flats.map(f => [f._id, f]));
    const buildingMap = new Map(buildings.map(b => [b._id, b]));
    const userMap = new Map(users.map(u => [u._id, u]));

    const populated = visitors.map(v => {
      const flat = flatMap.get(v.flatId) || null;
      const building = flat ? buildingMap.get(flat.buildingId) : null;
      const hostUser = userMap.get(v.residentId) || null;

      return {
        ...v,
        flat,
        building,
        hostUser
      };
    });

    // Sort newest first
    populated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, visitors: populated });
  } catch (err: any) {
    console.error("GET Visitors error:", err);
    return res.status(500).json({ success: false, error: "Failed to load visitors list." });
  }
});

/**
 * @route   POST /api/v1/society-management/visitors
 * @desc    Submit a pre-registered/expected visitor (Resident/Admin)
 */
societyRouter.post("/visitors", async (req: Request, res: Response): Promise<any> => {
  try {
    const { visitorName, mobile, visitorType, purpose, expectedDate, expectedTime, expectedVehicleNumber, visitorCount } = req.body;

    if (!visitorName || !mobile || !expectedDate || !expectedTime) {
      return res.status(400).json({ success: false, error: "Please provide all required fields: visitorName, mobile, expectedDate, expectedTime." });
    }

    const db = await getDb();
    const currentUser = (req as any).user;

    // Resolve Resident's Flat details
    const email = currentUser.email.toLowerCase().trim();
    let residentProfile = await db.collection("residents").findOne({ email });
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
        residentProfile = {
          _id: "synthesized-" + currentUser._id,
          flatId: flatDoc._id,
          buildingId: flatDoc.buildingId,
          societyId: ""
        };
      }
    }

    if (!flatDoc) {
      return res.status(400).json({
        success: false,
        error: "You must be associated with an active flat to register expected visitors."
      });
    }

    const buildingDoc = await db.collection("buildings").findOne({ _id: flatDoc.buildingId });
    const societyId = buildingDoc ? buildingDoc.societyId : "";

    // Generate VIS-YYYY-XXXXXX number
    const year = new Date().getFullYear();
    let isUnique = false;
    let visitorNumber = "";
    while (!isUnique) {
      const randomSixDigit = Math.floor(100000 + Math.random() * 900000);
      visitorNumber = `VIS-${year}-${randomSixDigit}`;
      const existing = await db.collection("visitors").findOne({ visitorNumber });
      if (!existing) isUnique = true;
    }

    // Generate 6-digit numeric passcode
    const passcode = Math.floor(100000 + Math.random() * 900000).toString();

    const newVisitor: any = {
      visitorNumber,
      residentId: residentProfile ? residentProfile._id : currentUser._id,
      flatId: flatDoc._id,
      buildingId: flatDoc.buildingId,
      societyId,
      visitorName: visitorName.trim(),
      mobile: mobile.trim(),
      visitorType: visitorType || "Guest",
      purpose: purpose ? purpose.trim() : "",
      status: "Expected",
      expectedDate,
      expectedTime,
      expectedVehicleNumber: expectedVehicleNumber ? expectedVehicleNumber.trim().toUpperCase() : "",
      visitorCount: parseInt(visitorCount) || 1,
      passcode,
      checkInTime: null,
      checkOutTime: null,
      approvedBy: residentProfile ? residentProfile._id : currentUser._id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection("visitors").insertOne(newVisitor);

    return res.json({
      success: true,
      message: "Expected visitor successfully pre-registered!",
      visitor: {
        _id: result.insertedId,
        visitorNumber,
        passcode,
        visitorName
      }
    });
  } catch (err: any) {
    console.error("POST Visitor error:", err);
    return res.status(500).json({ success: false, error: "Failed to register expected visitor." });
  }
});

/**
 * @route   PUT /api/v1/society-management/visitors/:id
 * @desc    Update / Cancel a visitor (Resident / Admin)
 */
societyRouter.put("/visitors/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { visitorName, mobile, visitorType, purpose, expectedDate, expectedTime, expectedVehicleNumber, visitorCount, status } = req.body;

    const db = await getDb();
    const existing = await db.collection("visitors").findOne({ _id: id });
    if (!existing) {
      return res.status(444).json({ success: false, error: "Visitor record not found." });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (visitorName !== undefined) updates.visitorName = visitorName.trim();
    if (mobile !== undefined) updates.mobile = mobile.trim();
    if (visitorType !== undefined) updates.visitorType = visitorType;
    if (purpose !== undefined) updates.purpose = purpose.trim();
    if (expectedDate !== undefined) updates.expectedDate = expectedDate;
    if (expectedTime !== undefined) updates.expectedTime = expectedTime;
    if (expectedVehicleNumber !== undefined) updates.expectedVehicleNumber = expectedVehicleNumber ? expectedVehicleNumber.trim().toUpperCase() : "";
    if (visitorCount !== undefined) updates.visitorCount = parseInt(visitorCount) || 1;
    if (status !== undefined) updates.status = status;

    await db.collection("visitors").updateOne({ _id: id }, { $set: updates });

    return res.json({ success: true, message: "Visitor reservation updated successfully!" });
  } catch (err: any) {
    console.error("PUT Visitor error:", err);
    return res.status(500).json({ success: false, error: "Failed to update visitor." });
  }
});

/**
 * @route   DELETE /api/v1/society-management/visitors/:id
 * @desc    Delete a visitor (Resident / Admin)
 */
societyRouter.delete("/visitors/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const result = await db.collection("visitors").deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Visitor not found." });
    }

    return res.json({ success: true, message: "Visitor record deleted successfully." });
  } catch (err: any) {
    console.error("DELETE Visitor error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete visitor." });
  }
});

/**
 * @route   POST /api/v1/society-management/gate-logs/check-in
 * @desc    Security Guard check-in action. Supports passcode validation or ad-hoc entry.
 */
societyRouter.post("/gate-logs/check-in", async (req: Request, res: Response): Promise<any> => {
  try {
    const { passcode, isWalkIn, visitorName, mobile, visitorType, purpose, flatId, buildingId, vehicleNumber, visitorCount } = req.body;
    const db = await getDb();

    if (passcode) {
      // Pre-approved entry via 6-digit passcode
      const visitor = await db.collection("visitors").findOne({ passcode: passcode.trim(), status: "Expected" });
      if (!visitor) {
        return res.status(400).json({ success: false, error: "Invalid passcode or guest has already checked in/expired." });
      }

      await db.collection("visitors").updateOne(
        { _id: visitor._id },
        {
          $set: {
            status: "Checked In",
            checkInTime: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      );

      return res.json({
        success: true,
        message: `Verified and Checked In Pre-registered Guest: ${visitor.visitorName}!`,
        visitor: {
          ...visitor,
          status: "Checked In",
          checkInTime: new Date().toISOString()
        }
      });
    }

    if (isWalkIn) {
      // Manual walk-in entry logged by Guard
      if (!visitorName || !mobile || !flatId || !buildingId) {
        return res.status(400).json({ success: false, error: "Please provide Visitor Name, Mobile, Building, and Flat for walk-in entry." });
      }

      const flatDoc = await db.collection("flats").findOne({ _id: flatId });
      const buildingDoc = await db.collection("buildings").findOne({ _id: buildingId });
      const societyId = buildingDoc ? buildingDoc.societyId : "";

      const year = new Date().getFullYear();
      let isUnique = false;
      let visitorNumber = "";
      while (!isUnique) {
        const randomSixDigit = Math.floor(100000 + Math.random() * 900000);
        visitorNumber = `VIS-${year}-${randomSixDigit}`;
        const existing = await db.collection("visitors").findOne({ visitorNumber });
        if (!existing) isUnique = true;
      }

      const newWalkIn = {
        visitorNumber,
        residentId: flatDoc ? (flatDoc.tenantId || flatDoc.ownerId || "Walk-In") : "Walk-In",
        flatId,
        buildingId,
        societyId,
        visitorName: visitorName.trim(),
        mobile: mobile.trim(),
        visitorType: visitorType || "Guest",
        purpose: purpose ? purpose.trim() : "Walk-In Guest",
        status: "Checked In",
        expectedDate: new Date().toISOString().split("T")[0],
        expectedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        expectedVehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : "",
        visitorCount: parseInt(visitorCount) || 1,
        passcode: "",
        checkInTime: new Date().toISOString(),
        checkOutTime: null,
        approvedBy: "Security Guard",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await db.collection("visitors").insertOne(newWalkIn);

      return res.json({
        success: true,
        message: `Walk-In visitor successfully Checked In!`,
        visitorId: result.insertedId
      });
    }

    return res.status(400).json({ success: false, error: "Please provide either a verification passcode or walk-in visitor details." });
  } catch (err: any) {
    console.error("Gate Check-in error:", err);
    return res.status(500).json({ success: false, error: "Failed to process visitor check-in." });
  }
});

/**
 * @route   PUT /api/v1/society-management/gate-logs/:id/check-out
 * @desc    Security Guard check-out action
 */
societyRouter.put("/gate-logs/:id/check-out", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const existing = await db.collection("visitors").findOne({ _id: id });
    if (!existing) {
      return res.status(404).json({ success: false, error: "Visitor log entry not found." });
    }

    await db.collection("visitors").updateOne(
      { _id: id },
      {
        $set: {
          status: "Checked Out",
          checkOutTime: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    );

    return res.json({ success: true, message: "Visitor successfully Checked Out!" });
  } catch (err: any) {
    console.error("Gate Check-out error:", err);
    return res.status(500).json({ success: false, error: "Failed to process visitor check-out." });
  }
});

/**
 * @route   GET /api/v1/society-management/vehicles/verify
 * @desc    Gate lookup/verification of a vehicle by license plate number.
 *          Checks registered residents' vehicles, active visitors, parking spots, or blocklist.
 */
societyRouter.get("/vehicles/verify", async (req: Request, res: Response): Promise<any> => {
  try {
    const { vehicleNumber } = req.query;
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, error: "Vehicle plate number query is required." });
    }

    const plate = (vehicleNumber as string).trim().toUpperCase();
    const db = await getDb();

    // 1. Check Flagged / Blacklist
    const blacklistMatch = await db.collection("flagged_vehicles").findOne({ vehicleNumber: plate, isBlacklisted: true });
    if (blacklistMatch) {
      return res.json({
        success: true,
        vehicleNumber: plate,
        classification: "Blacklisted",
        status: "Denied Entry",
        isBlacklisted: true,
        reason: blacklistMatch.reason || "Flagged security hazard",
        details: {
          flaggedBy: blacklistMatch.flaggedBy || "Admin",
          dateFlagged: blacklistMatch.createdAt
        }
      });
    }

    // 2. Check registered Resident vehicles
    const residentVehicles = await db.collection("vehicles").find({ vehicleNumber: plate, status: "Active" });
    if (residentVehicles.length > 0) {
      const v = residentVehicles[0];
      const flat = await db.collection("flats").findOne({ _id: v.flatId });
      const building = flat ? await db.collection("buildings").findOne({ _id: flat.buildingId }) : null;
      const resident = await db.collection("residents").findOne({ _id: v.residentId });

      return res.json({
        success: true,
        vehicleNumber: plate,
        classification: "Resident",
        status: "Authorized Entry",
        isBlacklisted: false,
        details: {
          ownerName: resident ? `${resident.firstName} ${resident.lastName}` : "Registered Resident",
          buildingName: building ? building.buildingName : "",
          flatNumber: flat ? flat.flatNumber : "",
          vehicleInfo: `${v.brand || ""} ${v.model || ""} (${v.color || ""})`,
          parkingSlot: v.parkingSlotId || "Allocated Slot"
        }
      });
    }

    // 3. Check active/allocated parking slots as backup
    const parkingSlotMatch = await db.collection("parking_slots").findOne({ vehicleNumber: plate });
    if (parkingSlotMatch) {
      const flat = await db.collection("flats").findOne({ _id: parkingSlotMatch.assignedFlatId });
      const building = flat ? await db.collection("buildings").findOne({ _id: flat.buildingId }) : null;
      const resident = parkingSlotMatch.assignedResidentId ? await db.collection("residents").findOne({ _id: parkingSlotMatch.assignedResidentId }) : null;

      return res.json({
        success: true,
        vehicleNumber: plate,
        classification: "Resident",
        status: "Authorized Entry",
        isBlacklisted: false,
        details: {
          ownerName: resident ? `${resident.firstName} ${resident.lastName}` : "Registered Resident",
          buildingName: building ? building.buildingName : "",
          flatNumber: flat ? flat.flatNumber : "",
          vehicleInfo: `Allocated to slot ${parkingSlotMatch.slotNumber}`,
          parkingSlot: parkingSlotMatch.slotNumber
        }
      });
    }

    // 4. Check Expected / Inside Visitor Pre-registrations
    const visitorMatch = await db.collection("visitors").findOne({
      $or: [
        { expectedVehicleNumber: plate },
        { vehicleNumber: plate }
      ],
      status: { $in: ["Expected", "Checked In"] }
    });

    if (visitorMatch) {
      const flat = await db.collection("flats").findOne({ _id: visitorMatch.flatId });
      const building = flat ? await db.collection("buildings").findOne({ _id: flat.buildingId }) : null;

      return res.json({
        success: true,
        vehicleNumber: plate,
        classification: "Expected Visitor",
        status: visitorMatch.status === "Expected" ? "Authorized Entry" : "Inside Society",
        isBlacklisted: false,
        details: {
          ownerName: visitorMatch.visitorName,
          purpose: visitorMatch.purpose,
          buildingName: building ? building.buildingName : "",
          flatNumber: flat ? flat.flatNumber : "",
          vehicleInfo: `Visitor Mobile: ${visitorMatch.mobile}`,
          passcode: visitorMatch.passcode
        }
      });
    }

    // 5. Unknown/Ad-hoc Vehicle
    return res.json({
      success: true,
      vehicleNumber: plate,
      classification: "Unregistered",
      status: "Ad-hoc Log Required",
      isBlacklisted: false,
      details: null
    });
  } catch (err: any) {
    console.error("Vehicle verification error:", err);
    return res.status(500).json({ success: false, error: "Failed to perform vehicle gate verification check." });
  }
});

/**
 * @route   GET /api/v1/society-management/vehicles/blacklist
 * @desc    Get all blacklisted/flagged vehicles
 */
societyRouter.get("/vehicles/blacklist", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const list = await db.collection("flagged_vehicles").find({});
    return res.json({ success: true, list });
  } catch (err: any) {
    console.error("GET Vehicle blacklist error:", err);
    return res.status(500).json({ success: false, error: "Failed to load flagged vehicles." });
  }
});

/**
 * @route   POST /api/v1/society-management/vehicles/blacklist
 * @desc    Flag / Blacklist a vehicle plate (Admin/Security)
 */
societyRouter.post("/vehicles/blacklist", async (req: Request, res: Response): Promise<any> => {
  try {
    const { vehicleNumber, reason, isBlacklisted } = req.body;
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, error: "Please provide a vehicle number." });
    }

    const db = await getDb();
    const currentUser = (req as any).user;
    const plate = vehicleNumber.trim().toUpperCase();

    // Check if already in blacklist
    const existing = await db.collection("flagged_vehicles").findOne({ vehicleNumber: plate });
    if (existing) {
      await db.collection("flagged_vehicles").updateOne(
        { vehicleNumber: plate },
        {
          $set: {
            reason: reason ? reason.trim() : "Flagged security block",
            isBlacklisted: isBlacklisted !== undefined ? !!isBlacklisted : true,
            updatedAt: new Date().toISOString()
          }
        }
      );
    } else {
      await db.collection("flagged_vehicles").insertOne({
        vehicleNumber: plate,
        reason: reason ? reason.trim() : "Flagged security block",
        isBlacklisted: isBlacklisted !== undefined ? !!isBlacklisted : true,
        flaggedBy: currentUser.name || "Security Guard",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return res.json({ success: true, message: `Vehicle plate '${plate}' has been flagged in security records.` });
  } catch (err: any) {
    console.error("POST Vehicle blacklist error:", err);
    return res.status(500).json({ success: false, error: "Failed to flag vehicle plate." });
  }
});

/**
 * @route   DELETE /api/v1/society-management/vehicles/blacklist/:id
 * @desc    Remove plate from flagged records / blacklist
 */
societyRouter.delete("/vehicles/blacklist/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const result = await db.collection("flagged_vehicles").deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Flagged record not found." });
    }

    return res.json({ success: true, message: "Vehicle plate successfully cleared from blacklist records." });
  } catch (err: any) {
    console.error("DELETE blacklist item error:", err);
    return res.status(500).json({ success: false, error: "Failed to clear vehicle blacklist record." });
  }
});

/**
 * @route   GET /api/v1/society-management/vehicles
 * @desc    Get all vehicles (Residents / Admins)
 */
societyRouter.get("/vehicles", async (req: Request, res: Response): Promise<any> => {
  try {
    const db = await getDb();
    const vehicles = await db.collection("vehicles").find({});
    const residents = await db.collection("residents").find({});
    const flats = await db.collection("flats").find({});

    const residentMap = new Map(residents.map(r => [r._id, r]));
    const flatMap = new Map(flats.map(f => [f._id, f]));

    const populated = vehicles.map(v => ({
      ...v,
      resident: residentMap.get(v.residentId) || null,
      flat: flatMap.get(v.flatId) || null
    }));

    return res.json({ success: true, vehicles: populated });
  } catch (err: any) {
    console.error("GET Vehicles list error:", err);
    return res.status(500).json({ success: false, error: "Failed to load vehicles list." });
  }
});

/**
 * @route   POST /api/v1/society-management/vehicles
 * @desc    Add a registered vehicle (Resident / Admin)
 */
societyRouter.post("/vehicles", async (req: Request, res: Response): Promise<any> => {
  try {
    const { residentId, flatId, buildingId, vehicleNumber, vehicleType, brand, model, color, parkingSlotId } = req.body;

    if (!vehicleNumber || !vehicleType) {
      return res.status(400).json({ success: false, error: "Please provide all required fields: vehicleNumber, vehicleType." });
    }

    const db = await getDb();
    const plate = vehicleNumber.trim().toUpperCase();

    // Check if vehicle already registered
    const existing = await db.collection("vehicles").findOne({ vehicleNumber: plate, status: "Active" });
    if (existing) {
      return res.status(400).json({ success: false, error: `Vehicle with plate number '${plate}' is already registered.` });
    }

    const newVehicle = {
      residentId: residentId || null,
      flatId: flatId || null,
      buildingId: buildingId || null,
      societyId: "",
      vehicleNumber: plate,
      vehicleType,
      brand: brand ? brand.trim() : "",
      model: model ? model.trim() : "",
      color: color ? color.trim() : "",
      parkingSlotId: parkingSlotId || null,
      status: "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection("vehicles").insertOne(newVehicle);

    return res.json({ success: true, message: "Vehicle registered successfully!", vehicleId: result.insertedId });
  } catch (err: any) {
    console.error("POST vehicle error:", err);
    return res.status(500).json({ success: false, error: "Failed to register vehicle." });
  }
});

/**
 * @route   PUT /api/v1/society-management/vehicles/:id
 * @desc    Update registered vehicle
 */
societyRouter.put("/vehicles/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { vehicleNumber, vehicleType, brand, model, color, parkingSlotId, status } = req.body;

    const db = await getDb();
    const existing = await db.collection("vehicles").findOne({ _id: id });
    if (!existing) {
      return res.status(404).json({ success: false, error: "Registered vehicle not found." });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (vehicleNumber !== undefined) updates.vehicleNumber = vehicleNumber.trim().toUpperCase();
    if (vehicleType !== undefined) updates.vehicleType = vehicleType;
    if (brand !== undefined) updates.brand = brand.trim();
    if (model !== undefined) updates.model = model.trim();
    if (color !== undefined) updates.color = color.trim();
    if (parkingSlotId !== undefined) updates.parkingSlotId = parkingSlotId || null;
    if (status !== undefined) updates.status = status;

    await db.collection("vehicles").updateOne({ _id: id }, { $set: updates });

    return res.json({ success: true, message: "Vehicle details updated successfully!" });
  } catch (err: any) {
    console.error("PUT vehicle error:", err);
    return res.status(500).json({ success: false, error: "Failed to update vehicle." });
  }
});

/**
 * @route   DELETE /api/v1/society-management/vehicles/:id
 * @desc    De-register/delete a vehicle
 */
societyRouter.delete("/vehicles/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const result = await db.collection("vehicles").deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }

    return res.json({ success: true, message: "Vehicle record removed successfully." });
  } catch (err: any) {
    console.error("DELETE vehicle error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete vehicle record." });
  }
});

