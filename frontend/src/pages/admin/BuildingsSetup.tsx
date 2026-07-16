import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { Building2, Plus, Edit3, Trash2, Search, X, Check, RefreshCw, AlertCircle, LayoutGrid } from "lucide-react";
import toast from "react-hot-toast";
import { Building, BuildingType } from "../../types/index.ts";

export const BuildingsSetup: React.FC = () => {
  const { token } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    buildingName: "",
    buildingCode: "",
    buildingType: "Residential" as BuildingType,
    floors: 1,
    totalFlats: 4,
    status: "Active" as "Active" | "Inactive"
  });

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/society-management/buildings", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setBuildings(data.buildings || []);
      } else {
        toast.error("Failed to fetch buildings.");
      }
    } catch (err) {
      toast.error("Error connecting to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "floors" || name === "totalFlats" ? Number(value) : value
    }));
  };

  const openAddForm = () => {
    setEditingBuildingId(null);
    setFormData({
      buildingName: "",
      buildingCode: "",
      buildingType: "Residential",
      floors: 1,
      totalFlats: 4,
      status: "Active"
    });
    setIsFormOpen(true);
  };

  const openEditForm = (building: Building) => {
    setEditingBuildingId(building._id);
    setFormData({
      buildingName: building.buildingName,
      buildingCode: building.buildingCode,
      buildingType: building.buildingType,
      floors: building.floors,
      totalFlats: building.totalFlats,
      status: building.status
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buildingName.trim()) return toast.error("Building Name is required.");
    if (!formData.buildingCode.trim()) return toast.error("Building Code is required.");
    if (formData.floors <= 0) return toast.error("Floors must be greater than zero.");
    if (formData.totalFlats < 0) return toast.error("Flats count cannot be negative.");

    setIsSubmitting(true);
    try {
      const url = editingBuildingId
        ? `/api/v1/society-management/buildings/${editingBuildingId}`
        : "/api/v1/society-management/buildings";
      
      const method = editingBuildingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Building configuration saved successfully!");
        setIsFormOpen(false);
        fetchBuildings();
      } else {
        toast.error(data.error || "Failed to save building.");
      }
    } catch (err: any) {
      toast.error("Network request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete building "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/society-management/buildings/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Building deleted successfully!");
        fetchBuildings();
      } else {
        toast.error(data.error || "Failed to delete building.");
      }
    } catch (err) {
      toast.error("An error occurred during deletion.");
    }
  };

  // Filtered list
  const filteredBuildings = buildings.filter(b => {
    const matchesSearch =
      b.buildingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.buildingCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "" || b.buildingType === typeFilter;
    const matchesStatus = statusFilter === "" || b.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div id="buildings-setup-view" className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buildings & Blocks Setup</h1>
          <p className="text-sm text-slate-300 mt-1">
            Register individual residential blocks, commercial towers, or mixed-use facilities inside your gated community.
          </p>
        </div>
        <button
          id="btn-add-building-trigger"
          onClick={openAddForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Building</span>
        </button>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-150 rounded-xl">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Buildings</span>
          <span className="text-xl font-bold text-gray-900 font-mono">{buildings.length}</span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Residential wings</span>
          <span className="text-xl font-bold text-slate-700 font-mono">
            {buildings.filter(b => b.buildingType === "Residential").length}
          </span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Cap. (Flats)</span>
          <span className="text-xl font-bold text-emerald-600 font-mono">
            {buildings.reduce((sum, b) => sum + b.totalFlats, 0)}
          </span>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-xl">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Units</span>
          <span className="text-xl font-bold text-blue-600 font-mono">
            {buildings.filter(b => b.status === "Active").length} Active
          </span>
        </div>
      </div>

      {/* Sliding Form / Overlay Panel */}
      {isFormOpen && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              <span>{editingBuildingId ? "Edit Building Properties" : "Register New Building"}</span>
            </h2>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-150"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Building / Wing Name *</label>
              <input
                id="bld-form-name"
                type="text"
                name="buildingName"
                value={formData.buildingName}
                onChange={handleInputChange}
                placeholder="e.g. Wing A, Signature Tower"
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Short Code *</label>
              <input
                id="bld-form-code"
                type="text"
                name="buildingCode"
                value={formData.buildingCode}
                onChange={handleInputChange}
                placeholder="e.g. WA, BLK1"
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white uppercase font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Building Category *</label>
              <select
                id="bld-form-type"
                name="buildingType"
                value={formData.buildingType}
                onChange={handleInputChange}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                <option value="Residential">Residential Block</option>
                <option value="Commercial">Commercial Block</option>
                <option value="Mixed Use">Mixed-Use Facility</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Total Floors *</label>
              <input
                id="bld-form-floors"
                type="number"
                name="floors"
                value={formData.floors}
                onChange={handleInputChange}
                min={1}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Est. Flats Capacity *</label>
              <input
                id="bld-form-capacity"
                type="number"
                name="totalFlats"
                value={formData.totalFlats}
                onChange={handleInputChange}
                min={0}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Operational Status</label>
              <select
                id="bld-form-status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                <option value="Active">Active / Occupied</option>
                <option value="Inactive">Inactive / Suspended</option>
              </select>
            </div>

            <div className="md:col-span-3 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="bld-form-submit"
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow cursor-pointer disabled:bg-slate-500"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Building Block</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Table list */}
      <div className="bg-white border border-gray-150 rounded-xl shadow-sm overflow-hidden">
        {/* Search controls */}
        <div className="p-4 bg-gray-50 border-b border-gray-150 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              id="bld-filter-search"
              type="text"
              placeholder="Search by Name or Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-250 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              id="bld-filter-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-1.5 text-xs bg-white border border-gray-250 rounded-lg focus:outline-none w-full sm:w-auto"
            >
              <option value="">All Categories</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Mixed Use">Mixed Use</option>
            </select>

            <select
              id="bld-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 text-xs bg-white border border-gray-250 rounded-lg focus:outline-none w-full sm:w-auto"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Data List or table */}
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-800" />
            <span className="text-xs">Loading registered building blocks...</span>
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <h3 className="text-sm font-bold text-gray-700">No Building Records</h3>
            <p className="text-xs max-w-sm mx-auto mt-1">
              {buildings.length === 0 
                ? "No buildings have been configured yet. Start setup by clicking Add New Building."
                : "No buildings match your chosen search terms or filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">
                  <th className="px-6 py-3">Building Details</th>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 text-right">Floors</th>
                  <th className="px-6 py-3 text-right">Flat Capacity</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm text-gray-700">
                {filteredBuildings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 text-slate-800 font-bold rounded flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{b.buildingName}</h4>
                          <span className="text-[10px] text-gray-400 block font-mono">ID: {b._id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-xs uppercase text-slate-900">
                      {b.buildingCode}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        b.buildingType === "Residential" 
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : b.buildingType === "Commercial"
                          ? "bg-purple-50 text-purple-700 border border-purple-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {b.buildingType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-gray-900">
                      {b.floors}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600">
                      {b.totalFlats}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                        b.status === "Active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${b.status === "Active" ? "bg-green-600" : "bg-gray-400"}`}></span>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          id={`btn-edit-building-${b._id}`}
                          onClick={() => openEditForm(b)}
                          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg hover:text-slate-900 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-building-${b._id}`}
                          onClick={() => handleDelete(b._id, b.buildingName)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg hover:text-red-700 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
