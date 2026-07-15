import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { ChevronRight, Plus, Edit3, Trash2, Search, X, Check, RefreshCw, AlertCircle, Building, User, Car } from "lucide-react";
import toast from "react-hot-toast";
import { Building as BuildingTypeModel, Flat, FlatType, OccupancyStatus } from "../../types.ts";

export const FlatsSetup: React.FC = () => {
  const { token } = useAuth();
  const [flats, setFlats] = useState<(Flat & { building: BuildingTypeModel | null })[]>([]);
  const [buildings, setBuildings] = useState<BuildingTypeModel[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [buildingFilter, setBuildingFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [occupancyFilter, setOccupancyFilter] = useState<string>("");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingFlatId, setEditingFlatId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form inputs
  const [formData, setFormData] = useState({
    buildingId: "",
    flatNumber: "",
    floor: 0,
    flatType: "2 BHK" as FlatType,
    occupancyStatus: "Vacant" as OccupancyStatus,
    ownerId: "",
    tenantId: "",
    parkingIdsInput: ""
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };

      // Parallel fetch for flats, buildings, users, and residents
      const [flatsRes, buildingsRes, usersRes, residentsRes] = await Promise.all([
        fetch("/api/v1/society-management/flats", { headers }),
        fetch("/api/v1/society-management/buildings", { headers }),
        fetch("/api/v1/society-management/users", { headers }),
        fetch("/api/v1/society-management/residents", { headers })
      ]);

      const flatsData = await flatsRes.json();
      const buildingsData = await buildingsRes.json();
      const usersData = await usersRes.json();
      const residentsData = await residentsRes.json();

      if (flatsData.success) setFlats(flatsData.flats || []);
      if (buildingsData.success) setBuildings(buildingsData.buildings || []);
      if (usersData.success) setUsers(usersData.users || []);
      if (residentsData.success) setResidents(residentsData.residents || []);

      // Autofill first building if available
      if (buildingsData.success && buildingsData.buildings?.length > 0) {
        setFormData(prev => ({
          ...prev,
          buildingId: buildingsData.buildings[0]._id
        }));
      }
    } catch (err) {
      toast.error("Failed to load initial data components.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "floor" ? Number(value) : value
    }));
  };

  const openAddForm = () => {
    setEditingFlatId(null);
    setFormData({
      buildingId: buildings[0]?._id || "",
      flatNumber: "",
      floor: 1,
      flatType: "2 BHK",
      occupancyStatus: "Vacant",
      ownerId: "",
      tenantId: "",
      parkingIdsInput: ""
    });
    setIsFormOpen(true);
  };

  const openEditForm = (flat: Flat) => {
    setEditingFlatId(flat._id);
    setFormData({
      buildingId: flat.buildingId,
      flatNumber: flat.flatNumber,
      floor: flat.floor,
      flatType: flat.flatType,
      occupancyStatus: flat.occupancyStatus,
      ownerId: flat.ownerId || "",
      tenantId: flat.tenantId || "",
      parkingIdsInput: flat.parkingIds ? flat.parkingIds.join(", ") : ""
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.buildingId) return toast.error("Please assign a building block.");
    if (!formData.flatNumber.trim()) return toast.error("Flat Number is required.");
    if (isNaN(formData.floor)) return toast.error("Floor index is required.");

    setIsSubmitting(true);
    try {
      // Parse parking slots input comma-separated to array
      const parkingIds = formData.parkingIdsInput
        ? formData.parkingIdsInput.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      const bodyPayload = {
        buildingId: formData.buildingId,
        flatNumber: formData.flatNumber,
        floor: formData.floor,
        flatType: formData.flatType,
        occupancyStatus: formData.occupancyStatus,
        ownerId: formData.ownerId || null,
        tenantId: formData.tenantId || null,
        parkingIds
      };

      const url = editingFlatId
        ? `/api/v1/society-management/flats/${editingFlatId}`
        : "/api/v1/society-management/flats";
      
      const method = editingFlatId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Flat configurations saved successfully!");
        setIsFormOpen(false);
        // Refresh flat records
        const headers = { "Authorization": `Bearer ${token}` };
        const flatsRes = await fetch("/api/v1/society-management/flats", { headers });
        const flatsData = await flatsRes.json();
        if (flatsData.success) setFlats(flatsData.flats || []);
      } else {
        toast.error(data.error || "Failed to configure flat.");
      }
    } catch (err) {
      toast.error("Failed to connect to the backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, flatNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete configuration for Flat ${flatNumber}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/society-management/flats/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Flat configuration deleted successfully.");
        // Refresh
        const headers = { "Authorization": `Bearer ${token}` };
        const flatsRes = await fetch("/api/v1/society-management/flats", { headers });
        const flatsData = await flatsRes.json();
        if (flatsData.success) setFlats(flatsData.flats || []);
      } else {
        toast.error(data.error || "Failed to delete flat.");
      }
    } catch (err) {
      toast.error("Request execution failed.");
    }
  };

  // Filtered Flats List
  const filteredFlats = flats.filter(f => {
    const matchesSearch = f.flatNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding = buildingFilter === "" || f.buildingId === buildingFilter;
    const matchesType = typeFilter === "" || f.flatType === typeFilter;
    const matchesOccupancy = occupancyFilter === "" || f.occupancyStatus === occupancyFilter;
    return matchesSearch && matchesBuilding && matchesType && matchesOccupancy;
  });

  return (
    <div id="flats-setup-view" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-sans">Flats Setup & Configuration</h1>
          <p className="text-sm text-slate-300 mt-1">
            Map precise apartment unit numbers to registered wings, assign layout configurations, and track real-time occupancy.
          </p>
        </div>
        {buildings.length > 0 && (
          <button
            id="btn-add-flat-trigger"
            onClick={openAddForm}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Configure New Flat</span>
          </button>
        )}
      </div>

      {buildings.length === 0 && !isLoading && (
        <div className="p-6 bg-amber-50 border border-amber-200 text-amber-850 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold">No Buildings Found!</h4>
            <p className="mt-1 leading-relaxed">
              You must register at least one <strong>Building or Wing Block</strong> in the system before you can configure individual apartment flat units.
            </p>
            <a href="/admin/buildings" className="inline-block mt-2 font-bold text-amber-900 hover:underline">
              Go to Buildings Setup &rarr;
            </a>
          </div>
        </div>
      )}

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-150 rounded-xl">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Mapped Flats</span>
          <span className="text-xl font-bold text-gray-900 font-mono">{flats.length}</span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Occupied Units</span>
          <span className="text-xl font-bold text-emerald-600 font-mono">
            {flats.filter(f => f.occupancyStatus === "Owner Occupied" || f.occupancyStatus === "Tenant Occupied").length}
          </span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vacant Apartments</span>
          <span className="text-xl font-bold text-blue-600 font-mono">
            {flats.filter(f => f.occupancyStatus === "Vacant").length}
          </span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Under Maintenance</span>
          <span className="text-xl font-bold text-amber-600 font-mono">
            {flats.filter(f => f.occupancyStatus === "Under Maintenance").length}
          </span>
        </div>
      </div>

      {/* Sliding Inline Form Panel */}
      {isFormOpen && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-slate-700" />
              <span>{editingFlatId ? "Edit Flat Configurations" : "Configure New Flat Unit"}</span>
            </h2>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-150"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Building Wing *</label>
              <select
                id="flat-form-building"
                name="buildingId"
                value={formData.buildingId}
                onChange={handleInputChange}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:outline-none"
                required
              >
                {buildings.map(b => (
                  <option key={b._id} value={b._id}>{b.buildingName} ({b.buildingCode})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Flat Number *</label>
              <input
                id="flat-form-number"
                type="text"
                name="flatNumber"
                value={formData.flatNumber}
                onChange={handleInputChange}
                placeholder="e.g. 101, A-502"
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:outline-none font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Floor Index *</label>
              <input
                id="flat-form-floor"
                type="number"
                name="floor"
                value={formData.floor}
                onChange={handleInputChange}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Layout Type *</label>
              <select
                id="flat-form-type"
                name="flatType"
                value={formData.flatType}
                onChange={handleInputChange}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:outline-none"
              >
                <option value="1 RK">1 RK Studio</option>
                <option value="1 BHK">1 BHK Apartment</option>
                <option value="2 BHK">2 BHK Apartment</option>
                <option value="3 BHK">3 BHK Apartment</option>
                <option value="4 BHK">4 BHK Apartment</option>
                <option value="Penthouse">Penthouse Suite</option>
                <option value="Commercial">Commercial Office</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Occupancy State *</label>
              <select
                id="flat-form-occupancy"
                name="occupancyStatus"
                value={formData.occupancyStatus}
                onChange={handleInputChange}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:outline-none font-semibold text-slate-800"
              >
                <option value="Vacant">Vacant</option>
                <option value="Owner Occupied">Owner Occupied</option>
                <option value="Tenant Occupied">Tenant Occupied</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Primary Owner Mapping</label>
              <select
                id="flat-form-owner"
                name="ownerId"
                value={formData.ownerId}
                onChange={handleInputChange}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:outline-none"
              >
                <option value="">-- Select Registered Resident --</option>
                {users.filter(u => u.role === "Resident").map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Primary Tenant Mapping</label>
              <select
                id="flat-form-tenant"
                name="tenantId"
                value={formData.tenantId}
                onChange={handleInputChange}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:outline-none"
              >
                <option value="">-- Select Registered Resident --</option>
                {users.filter(u => u.role === "Resident").map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-gray-450" />
                <span>Parking Slot Codes</span>
              </label>
              <input
                id="flat-form-parking"
                type="text"
                name="parkingIdsInput"
                value={formData.parkingIdsInput}
                onChange={handleInputChange}
                placeholder="e.g. P102, P103 (comma separated)"
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:outline-none font-mono"
              />
            </div>

            <div className="md:col-span-4 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="flat-form-submit"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow cursor-pointer disabled:bg-slate-500"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Flat Details</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Filters list */}
      <div className="bg-white border border-gray-150 rounded-xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 bg-gray-50 border-b border-gray-150 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              id="flat-filter-search"
              type="text"
              placeholder="Search by Flat No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-250 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              id="flat-filter-building"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="p-1.5 text-xs bg-white border border-gray-250 rounded-lg focus:outline-none w-full sm:w-auto"
            >
              <option value="">All Buildings</option>
              {buildings.map(b => (
                <option key={b._id} value={b._id}>{b.buildingName}</option>
              ))}
            </select>

            <select
              id="flat-filter-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-1.5 text-xs bg-white border border-gray-250 rounded-lg focus:outline-none w-full sm:w-auto"
            >
              <option value="">All Layout Types</option>
              <option value="1 RK">1 RK</option>
              <option value="1 BHK">1 BHK</option>
              <option value="2 BHK">2 BHK</option>
              <option value="3 BHK">3 BHK</option>
              <option value="4 BHK">4 BHK</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Commercial">Commercial</option>
            </select>

            <select
              id="flat-filter-occupancy"
              value={occupancyFilter}
              onChange={(e) => setOccupancyFilter(e.target.value)}
              className="p-1.5 text-xs bg-white border border-gray-250 rounded-lg focus:outline-none w-full sm:w-auto"
            >
              <option value="">All Occupancy</option>
              <option value="Vacant">Vacant</option>
              <option value="Owner Occupied">Owner Occupied</option>
              <option value="Tenant Occupied">Tenant Occupied</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>
          </div>
        </div>

        {/* Flat list */}
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-800" />
            <span className="text-xs">Loading flat profiles...</span>
          </div>
        ) : filteredFlats.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Building className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <h3 className="text-sm font-bold text-gray-700">No Flats Configured</h3>
            <p className="text-xs max-w-sm mx-auto mt-1">
              {flats.length === 0 
                ? "Setup individual flats and assign them floor numbers, occupancy, and parking slots."
                : "No flats match your chosen search terms or filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">
                  <th className="px-6 py-3">Flat No.</th>
                  <th className="px-6 py-3">Building Block</th>
                  <th className="px-6 py-3 text-right">Floor</th>
                  <th className="px-6 py-3">Layout</th>
                  <th className="px-6 py-3">Occupancy Status</th>
                  <th className="px-6 py-3">Allocated Parking</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm text-gray-700">
                {filteredFlats.map((f) => {
                  const flatOwner = users.find(u => u._id === f.ownerId) || residents.find(r => r._id === f.ownerId);
                  const flatTenant = users.find(u => u._id === f.tenantId) || residents.find(r => r._id === f.tenantId);
                  
                  const ownerName = flatOwner 
                    ? (flatOwner.name || `${flatOwner.firstName || ""} ${flatOwner.lastName || ""}`.trim())
                    : null;
                  
                  const tenantName = flatTenant 
                    ? (flatTenant.name || `${flatTenant.firstName || ""} ${flatTenant.lastName || ""}`.trim())
                    : null;

                  return (
                    <tr key={f._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 font-mono text-base">{f.flatNumber}</span>
                          <span className="text-[10px] text-gray-400 font-mono">ID: {f._id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-gray-800">{f.building ? f.building.buildingName : "Unknown Wing"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-gray-650">
                        {f.floor}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold font-mono text-gray-600">
                        {f.flatType}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono w-max ${
                            f.occupancyStatus === "Owner Occupied"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : f.occupancyStatus === "Tenant Occupied"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : f.occupancyStatus === "Under Maintenance"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-gray-100 text-gray-700 border border-gray-155"
                          }`}>
                            {f.occupancyStatus}
                          </span>
                          {/* Map names of Owner/Tenant */}
                          {ownerName && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> Owner: <strong className="text-gray-700">{ownerName}</strong>
                            </span>
                          )}
                          {tenantName && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> Tenant: <strong className="text-gray-700">{tenantName}</strong>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {f.parkingIds && f.parkingIds.length > 0 ? (
                            f.parkingIds.map(slot => (
                              <span key={slot} className="px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[10px] font-bold rounded">
                                {slot}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`btn-edit-flat-${f._id}`}
                            onClick={() => openEditForm(f)}
                            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg hover:text-slate-900 transition-colors cursor-pointer"
                            title="Edit Configurations"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-flat-${f._id}`}
                            onClick={() => handleDelete(f._id, f.flatNumber)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg hover:text-red-700 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
