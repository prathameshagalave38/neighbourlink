import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { toast } from "react-hot-toast";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  ShieldCheck,
  User,
  MapPin,
  Car,
  Filter,
  RefreshCw,
  Info,
  Layers,
  Sparkles,
  Zap
} from "lucide-react";

export const ParkingAllocations: React.FC = () => {
  const { token } = useAuth();

  const [parkingSlots, setParkingSlots] = useState<any[]>([]);
  const [flats, setFlats] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterEV, setFilterEV] = useState<string>("All");

  // Form / Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);

  // Form inputs
  const [slotNumber, setSlotNumber] = useState<string>("");
  const [parkingType, setParkingType] = useState<string>("Resident");
  const [floor, setFloor] = useState<string>("Ground Floor");
  const [parkingArea, setParkingArea] = useState<string>("A-Block Basement");
  const [status, setStatus] = useState<string>("Available");
  const [coveredParking, setCoveredParking] = useState<boolean>(true);
  const [evCharging, setEvCharging] = useState<boolean>(false);
  const [assignedFlatId, setAssignedFlatId] = useState<string>("");
  const [assignedResidentId, setAssignedResidentId] = useState<string>("");
  const [vehicleNumber, setVehicleNumber] = useState<string>("");

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [parkingRes, flatsRes, buildingsRes, residentsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/parking`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/flats`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/buildings`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/residents`, { headers })
      ]);

      const parkingData = await parkingRes.json();
      const flatsData = await flatsRes.json();
      const buildingsData = await buildingsRes.json();
      const residentsData = await residentsRes.json();

      if (parkingData.success) {
        setParkingSlots(parkingData.parkingSlots || []);
      }
      if (flatsData.success) {
        setFlats(flatsData.flats || []);
      }
      if (buildingsData.success) {
        setBuildings(buildingsData.buildings || []);
      }
      if (residentsData.success) {
        setResidents(residentsData.residents || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading parking allocation data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  const handleOpenAddModal = () => {
    setEditingSlot(null);
    setSlotNumber("");
    setParkingType("Resident");
    setFloor("Ground Floor");
    setParkingArea("A-Block Basement");
    setStatus("Available");
    setCoveredParking(true);
    setEvCharging(false);
    setAssignedFlatId("");
    setAssignedResidentId("");
    setVehicleNumber("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (slot: any) => {
    setEditingSlot(slot);
    setSlotNumber(slot.slotNumber);
    setParkingType(slot.parkingType);
    setFloor(slot.floor);
    setParkingArea(slot.parkingArea);
    setStatus(slot.status);
    setCoveredParking(slot.coveredParking);
    setEvCharging(slot.evCharging);
    setAssignedFlatId(slot.assignedFlatId || "");
    setAssignedResidentId(slot.assignedResidentId || "");
    setVehicleNumber(slot.vehicleNumber || "");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotNumber.trim()) {
      toast.error("Please provide a slot number.");
      return;
    }

    setIsSubmitLoading(true);
    try {
      const payload = {
        slotNumber: slotNumber.trim(),
        parkingType,
        floor: floor.trim(),
        parkingArea: parkingArea.trim(),
        status,
        coveredParking,
        evCharging,
        assignedFlatId: assignedFlatId || null,
        assignedResidentId: assignedResidentId || null,
        vehicleNumber: vehicleNumber.trim()
      };

      const url = editingSlot
        ? `${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/parking/${editingSlot._id}`
        : `${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/parking`;
      const method = editingSlot ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingSlot ? "Parking slot updated!" : "Parking slot registered successfully!");
        setIsModalOpen(false);
        fetchAllData();
      } else {
        toast.error(data.error || "Failed to save parking slot details.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error saving slot details.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this parking slot?")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/parking/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Parking slot deleted successfully.");
        fetchAllData();
      } else {
        toast.error(data.error || "Failed to delete slot.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error deleting slot.");
    }
  };

  // Filter Logic
  const filteredSlots = parkingSlots.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      s.slotNumber.toLowerCase().includes(query) ||
      (s.vehicleNumber && s.vehicleNumber.toLowerCase().includes(query)) ||
      (s.parkingArea && s.parkingArea.toLowerCase().includes(query)) ||
      (s.resident && `${s.resident.firstName} ${s.resident.lastName}`.toLowerCase().includes(query)) ||
      (s.flat && s.flat.flatNumber.toLowerCase().includes(query));

    const matchesType = filterType === "All" || s.parkingType === filterType;
    const matchesStatus = filterStatus === "All" || s.status === filterStatus;
    const matchesEV =
      filterEV === "All" ||
      (filterEV === "EV" && s.evCharging) ||
      (filterEV === "Covered" && s.coveredParking);

    return matchesSearch && matchesType && matchesStatus && matchesEV;
  });

  // Stats Counters
  const totalSlots = parkingSlots.length;
  const occupiedSlots = parkingSlots.filter(s => s.status === "Occupied").length;
  const availableSlots = parkingSlots.filter(s => s.status === "Available").length;
  const evSlots = parkingSlots.filter(s => s.evCharging).length;

  return (
    <div id="parking-allocations-panel" className="space-y-6 max-w-7xl mx-auto px-4 py-2">
      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Car className="w-6 h-6 text-slate-800" />
            Parking Allocations Hub
          </h1>
          <p className="text-sm text-gray-500 font-sans">
            Provision, assign, and audit physical parking slots, vehicle logs, and EV assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Register Slot
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">Total Parking Slots</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800 font-mono">{totalSlots}</span>
            <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-red-500 uppercase tracking-wider font-sans">Occupied / Claimed</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600 font-mono">{occupiedSlots}</span>
            <span className="p-1.5 bg-red-50 rounded-lg text-red-500">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider font-sans">Available Slots</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 font-mono">{availableSlots}</span>
            <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-500">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider font-sans">EV Enabled Infrastructure</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-600 font-mono">{evSlots}</span>
            <span className="p-1.5 bg-blue-50 rounded-lg text-blue-500">
              <Zap className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Main search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by slot number, vehicle plate, area, flat number, or resident name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-sans"
            />
          </div>

          {/* Quick Filter Selects */}
          <div className="flex flex-wrap gap-2">
            {/* Slot Type */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="All">All Types</option>
                <option value="Resident">Resident Only</option>
                <option value="Visitor">Visitor/Guest Only</option>
                <option value="Reserved">Reserved Area</option>
                <option value="Disabled">Disabled Accessibility</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Under Maintenance">Maintenance</option>
              </select>
            </div>

            {/* EV or Covered */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Features:</span>
              <select
                value={filterEV}
                onChange={(e) => setFilterEV(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="All">All Features</option>
                <option value="EV">EV Charging Built-in</option>
                <option value="Covered">Covered Parking Block</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Parking Registry Table */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
            <p className="text-sm text-gray-500 font-semibold font-sans">Loading society parking registers...</p>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
            <div className="p-4 bg-slate-50 rounded-full text-slate-400">
              <Car className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-sans font-bold text-slate-800">No Parking Slots Matched</h3>
              <p className="text-xs text-gray-500 font-sans leading-relaxed">
                {searchQuery || filterType !== "All" || filterStatus !== "All" || filterEV !== "All"
                  ? "No slots matched the criteria. Redefine your search parameters."
                  : "Excellent! You haven't registered any parking slot records. Click 'Register Slot' to seed one."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-150 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                  <th className="px-6 py-4">Slot Name</th>
                  <th className="px-6 py-4">Location & Wing</th>
                  <th className="px-6 py-4">Structure Type</th>
                  <th className="px-6 py-4">Infrastructure Assets</th>
                  <th className="px-6 py-4">Allocated Flat</th>
                  <th className="px-6 py-4">Assigned Resident</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm text-gray-700 font-sans">
                {filteredSlots.map(s => {
                  const residentName = s.resident
                    ? `${s.resident.firstName} ${s.resident.lastName}`
                    : "No Assigned Member";

                  const flatInfo = s.flat
                    ? `Flat ${s.flat.flatNumber}`
                    : "Unallocated";

                  return (
                    <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                      {/* Slot Name */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-800 border border-gray-200">
                          {s.slotNumber}
                        </span>
                      </td>

                      {/* Floor & Location */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs">{s.floor}</span>
                          <span className="text-[10px] text-gray-400 font-sans mt-0.5">{s.parkingArea}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 border border-slate-200 rounded text-xs font-semibold text-slate-700">
                          {s.parkingType}
                        </span>
                      </td>

                      {/* Capabilities */}
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {s.coveredParking && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 text-[10px] text-slate-600 border rounded font-semibold font-sans">
                              Covered
                            </span>
                          )}
                          {s.evCharging && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-bold font-sans animate-pulse">
                              <Zap className="w-3 h-3 text-blue-500 fill-blue-500" />
                              EV Charging
                            </span>
                          )}
                          {!s.coveredParking && !s.evCharging && (
                            <span className="text-[10px] text-gray-400">Open-air Spot</span>
                          )}
                        </div>
                      </td>

                      {/* Allocated Flat */}
                      <td className="px-6 py-4 font-sans text-xs">
                        {s.flat ? (
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            <span className="font-bold">{flatInfo}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Common Access</span>
                        )}
                      </td>

                      {/* Assigned Resident & Vehicle */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          {s.resident ? (
                            <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              {residentName}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">None</span>
                          )}
                          {s.vehicleNumber && (
                            <span className="text-[10px] font-mono font-bold text-slate-500 mt-1 uppercase">
                              🚙 {s.vehicleNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.status === "Available"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : s.status === "Occupied"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : s.status === "Reserved"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {s.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 border border-gray-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Space"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(s._id)}
                            className="p-1.5 border border-gray-200 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Space"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Admin Space Registry / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-1.5">
                <Car className="w-5 h-5 text-slate-600" />
                {editingSlot ? "Modify Parking Allocation" : "Register New Parking Space"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-slate-800 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Slot Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Slot Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PS-104"
                    value={slotNumber}
                    onChange={(e) => setSlotNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono font-bold text-slate-800"
                  />
                </div>

                {/* Slot Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Spot Allocation Type
                  </label>
                  <select
                    value={parkingType}
                    onChange={(e) => setParkingType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-semibold text-slate-800"
                  >
                    <option value="Resident">Resident Slot</option>
                    <option value="Visitor">Visitor Space</option>
                    <option value="Reserved">Reserved Area</option>
                    <option value="Disabled">Disabled Access</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Floor */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Floor Level
                  </label>
                  <input
                    type="text"
                    placeholder="Ground Floor, B1, etc."
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800"
                  />
                </div>

                {/* Parking Area */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Parking Area Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wing-B Basement, Open Ground"
                    value={parkingArea}
                    onChange={(e) => setParkingArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Availability Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-semibold text-slate-800"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                  </select>
                </div>

                {/* Vehicle Plate Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Vehicle License Plate Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH-12-PQ-9876"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono font-bold text-slate-800 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Associated Flat */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Link to Apartment Flat
                  </label>
                  <select
                    value={assignedFlatId}
                    onChange={(e) => setAssignedFlatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-sans text-slate-800"
                  >
                    <option value="">No flat linked (Common)</option>
                    {flats.map(f => {
                      const bld = buildings.find(b => b._id === f.buildingId);
                      return (
                        <option key={f._id} value={f._id}>
                          {bld ? `${bld.buildingName} - ` : ""}Flat {f.flatNumber}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Associated Resident */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Link to Primary Resident
                  </label>
                  <select
                    value={assignedResidentId}
                    onChange={(e) => setAssignedResidentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-sans text-slate-800"
                  >
                    <option value="">No resident assigned</option>
                    {residents.map(r => (
                      <option key={r._id} value={r._id}>
                        {r.firstName} {r.lastName} ({r.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Infrastructure Checklist Switches */}
              <div className="flex gap-4 p-3 bg-slate-50 border border-gray-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={coveredParking}
                    onChange={(e) => setCoveredParking(e.target.checked)}
                    className="w-4 h-4 text-slate-900 border-gray-300 rounded focus:ring-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-800">Covered Parking Bay</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={evCharging}
                    onChange={(e) => setEvCharging(e.target.checked)}
                    className="w-4 h-4 text-slate-900 border-gray-300 rounded focus:ring-slate-900"
                  />
                  <span className="text-xs font-semibold text-blue-700 flex items-center gap-0.5 font-sans">
                    <Zap className="w-3 h-3 text-blue-500 fill-blue-500 animate-pulse" />
                    Built-in EV Charger Point
                  </span>
                </label>
              </div>

              {/* Submit panel */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md"
                >
                  {isSubmitLoading ? "Saving Space..." : "Confirm Provisioning"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
