import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { Plus, Edit3, Trash2, Search, X, Check, RefreshCw, AlertCircle, Building, User, Mail, Phone, Calendar, Heart, Briefcase, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { Building as BuildingTypeModel, Flat, Resident, ResidentType } from "../../types/index.ts";

export const ResidentsSetup: React.FC = () => {
  const { token } = useAuth();
  const [residents, setResidents] = useState<(Resident & { building: BuildingTypeModel | null; flat: Flat | null })[]>([]);
  const [buildings, setBuildings] = useState<BuildingTypeModel[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [buildingFilter, setBuildingFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingResidentId, setEditingResidentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form inputs
  const [formData, setFormData] = useState({
    buildingId: "",
    flatId: "",
    residentType: "Owner" as ResidentType,
    relationshipToOwner: "Self",
    firstName: "",
    lastName: "",
    gender: "Male" as "Male" | "Female" | "Other",
    dob: "",
    mobile: "",
    email: "",
    bloodGroup: "",
    occupation: "",
    companyName: "",
    emergencyContactName: "",
    emergencyContactMobile: "",
    status: "Active" as "Active" | "Inactive" | "Shifted" | "Deceased"
  });

  // Dynamic flat list for the current selected building in form
  const [filteredFormFlats, setFilteredFormFlats] = useState<Flat[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Update dynamic flats whenever buildingId changes in form
  useEffect(() => {
    if (formData.buildingId) {
      const filtered = flats.filter(f => f.buildingId === formData.buildingId);
      setFilteredFormFlats(filtered);
      // Autofill flatId if currently empty or not in the new building
      if (filtered.length > 0) {
        const hasCurrentFlat = filtered.some(f => f._id === formData.flatId);
        if (!hasCurrentFlat) {
          setFormData(prev => ({ ...prev, flatId: filtered[0]._id }));
        }
      } else {
        setFormData(prev => ({ ...prev, flatId: "" }));
      }
    } else {
      setFilteredFormFlats([]);
      setFormData(prev => ({ ...prev, flatId: "" }));
    }
  }, [formData.buildingId, flats]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };

      // Parallel fetch for residents, buildings, and flats
      const [residentsRes, buildingsRes, flatsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/residents`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/buildings`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/flats`, { headers })
      ]);

      const residentsData = await residentsRes.json();
      const buildingsData = await buildingsRes.json();
      const flatsData = await flatsRes.json();

      if (residentsData.success) setResidents(residentsData.residents || []);
      if (buildingsData.success) setBuildings(buildingsData.buildings || []);
      if (flatsData.success) setFlats(flatsData.flats || []);

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
      [name]: value
    }));
  };

  const openAddForm = () => {
    setEditingResidentId(null);
    setFormData({
      buildingId: buildings[0]?._id || "",
      flatId: "",
      residentType: "Owner",
      relationshipToOwner: "Self",
      firstName: "",
      lastName: "",
      gender: "Male",
      dob: "",
      mobile: "",
      email: "",
      bloodGroup: "",
      occupation: "",
      companyName: "",
      emergencyContactName: "",
      emergencyContactMobile: "",
      status: "Active"
    });
    setIsFormOpen(true);
  };

  const openEditForm = (res: Resident) => {
    setEditingResidentId(res._id);
    setFormData({
      buildingId: res.buildingId,
      flatId: res.flatId,
      residentType: res.residentType,
      relationshipToOwner: res.relationshipToOwner || "Self",
      firstName: res.firstName,
      lastName: res.lastName,
      gender: res.gender || "Male",
      dob: res.dob ? res.dob.substring(0, 10) : "",
      mobile: res.mobile || "",
      email: res.email || "",
      bloodGroup: res.bloodGroup || "",
      occupation: res.occupation || "",
      companyName: res.companyName || "",
      emergencyContactName: res.emergencyContact?.name || "",
      emergencyContactMobile: res.emergencyContact?.mobile || "",
      status: res.status || "Active"
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resident's profile? This will also remove them from their assigned flat's register.")) {
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/residents/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Resident profile deleted successfully!");
        fetchInitialData();
      } else {
        toast.error(data.error || "Failed to delete resident profile.");
      }
    } catch (err) {
      toast.error("Error during deletion.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.buildingId) return toast.error("Please assign a building.");
    if (!formData.flatId) return toast.error("Please assign a flat.");
    if (!formData.firstName.trim()) return toast.error("Please enter first name.");
    if (!formData.lastName.trim()) return toast.error("Please enter last name.");
    if (!formData.dob) return toast.error("Please enter date of birth.");
    if (!formData.mobile.trim()) return toast.error("Please enter a mobile phone number.");
    if (!formData.email.trim()) return toast.error("Please enter an email address.");

    setIsSubmitting(true);

    const payload = {
      buildingId: formData.buildingId,
      flatId: formData.flatId,
      residentType: formData.residentType,
      relationshipToOwner: formData.relationshipToOwner,
      firstName: formData.firstName,
      lastName: formData.lastName,
      gender: formData.gender,
      dob: formData.dob,
      mobile: formData.mobile,
      email: formData.email,
      bloodGroup: formData.bloodGroup || undefined,
      occupation: formData.occupation || undefined,
      companyName: formData.companyName || undefined,
      emergencyContact: {
        name: formData.emergencyContactName,
        mobile: formData.emergencyContactMobile
      },
      status: formData.status
    };

    try {
      const url = editingResidentId 
        ? `${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/residents/${editingResidentId}`
        : `${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/residents`;

      const method = editingResidentId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Resident details saved successfully!");
        setIsFormOpen(false);
        fetchInitialData();
      } else {
        toast.error(data.error || "Failed to save resident details.");
      }
    } catch (err) {
      toast.error("Network communication error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Perform client-side filter
  const filteredResidents = residents.filter(res => {
    const nameMatch = `${res.firstName} ${res.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (res.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const mobileMatch = (res.mobile || "").includes(searchTerm);
    const flatMatch = res.flat?.flatNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false;

    const matchesSearch = nameMatch || emailMatch || mobileMatch || flatMatch;
    const matchesBuilding = buildingFilter === "" || res.buildingId === buildingFilter;
    const matchesType = typeFilter === "" || res.residentType === typeFilter;
    const matchesStatus = statusFilter === "" || res.status === statusFilter;

    return matchesSearch && matchesBuilding && matchesType && matchesStatus;
  });

  return (
    <div id="residents-setup-view" className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Residents Management</h1>
          <p className="text-sm text-gray-500 mt-1">Map, register, and update resident logs, flat owners, tenants, and household families.</p>
        </div>
        <button
          id="btn-add-resident"
          onClick={openAddForm}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Add Resident</span>
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="p-4 bg-white border border-gray-150 rounded-xl shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
          <input
            id="search-residents-input"
            type="text"
            placeholder="Search by name, email, phone or flat number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-gray-50"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            id="filter-building-select"
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">All Buildings</option>
            {buildings.map(b => (
              <option key={b._id} value={b._id}>{b.buildingName}</option>
            ))}
          </select>

          <select
            id="filter-type-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">All Resident Types</option>
            <option value="Owner">Owner</option>
            <option value="Tenant">Tenant</option>
            <option value="FamilyMember">Family Member</option>
            <option value="Child">Child</option>
            <option value="SeniorCitizen">Senior Citizen</option>
          </select>

          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Shifted">Shifted</option>
            <option value="Deceased">Deceased</option>
          </select>

          {(searchTerm || buildingFilter || typeFilter || statusFilter) && (
            <button
              id="btn-reset-filters"
              onClick={() => {
                setSearchTerm("");
                setBuildingFilter("");
                setTypeFilter("");
                setStatusFilter("");
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-slate-900 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table view */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-2xl shadow-sm gap-3">
          <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
          <span className="text-sm font-medium text-gray-500">Loading residents list...</span>
        </div>
      ) : filteredResidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-2xl shadow-sm text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No Residents Found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md">No resident accounts match your search parameters. Use the button in the top right to register a new resident in the society database.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-150 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Resident</th>
                  <th className="px-6 py-4">Flat Location</th>
                  <th className="px-6 py-4">Resident Type</th>
                  <th className="px-6 py-4">Contact Details</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredResidents.map((res) => {
                  const initials = `${res.firstName?.charAt(0) || ""}${res.lastName?.charAt(0) || ""}`.toUpperCase();
                  
                  // Status badge styles
                  let statusBg = "bg-green-50 text-green-700 border-green-200";
                  if (res.status === "Inactive") statusBg = "bg-yellow-50 text-yellow-700 border-yellow-200";
                  if (res.status === "Shifted") statusBg = "bg-gray-50 text-gray-700 border-gray-200";
                  if (res.status === "Deceased") statusBg = "bg-red-50 text-red-700 border-red-200";

                  // Type colors
                  let typeBadge = "bg-slate-100 text-slate-800";
                  if (res.residentType === "Owner") typeBadge = "bg-indigo-50 text-indigo-700 border-indigo-150";
                  if (res.residentType === "Tenant") typeBadge = "bg-teal-50 text-teal-700 border-teal-150";

                  return (
                    <tr key={res._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wide">
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block">{res.firstName} {res.lastName}</span>
                            <span className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                              Relationship: {res.relationshipToOwner}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="font-semibold text-gray-800 font-mono block">Flat {res.flat?.flatNumber || "N/A"}</span>
                            <span className="text-xs text-gray-400 block">{res.building?.buildingName || "Unknown Building"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${typeBadge}`}>
                          {res.residentType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span>{res.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{res.mobile}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBg}`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`btn-edit-resident-${res._id}`}
                            onClick={() => openEditForm(res)}
                            className="p-1.5 text-gray-500 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                            title="Edit Resident"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-resident-${res._id}`}
                            onClick={() => handleDelete(res._id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Delete Resident"
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
          <div className="px-6 py-3 border-t border-gray-150 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
            <span>Showing {filteredResidents.length} of {residents.length} residents in active rosters.</span>
          </div>
        </div>
      )}

      {/* Slide-over or modal for Add/Edit Resident */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300">
          <div className="w-full max-w-2xl bg-white h-screen flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-350">
            {/* Form Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-150">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingResidentId ? "Modify Resident Record" : "Register New Resident"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update personal details, flat bindings, emergency contacts, and active status.
                </p>
              </div>
              <button
                id="btn-close-form-modal"
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Section 1: Flat bindings */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span>Flat Assignment Bindings</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Building</label>
                    <select
                      id="form-resident-buildingId"
                      name="buildingId"
                      value={formData.buildingId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                      required
                    >
                      <option value="">-- Choose Building --</option>
                      {buildings.map(b => (
                        <option key={b._id} value={b._id}>{b.buildingName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Flat Number</label>
                    <select
                      id="form-resident-flatId"
                      name="flatId"
                      value={formData.flatId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                      required
                      disabled={!formData.buildingId}
                    >
                      <option value="">-- Select Flat --</option>
                      {filteredFormFlats.map(f => (
                        <option key={f._id} value={f._id}>Flat {f.flatNumber} (Floor {f.floor})</option>
                      ))}
                    </select>
                    {!formData.buildingId && (
                      <span className="text-[11px] text-gray-400 mt-1 block">Please select building first.</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Resident Type</label>
                    <select
                      id="form-resident-residentType"
                      name="residentType"
                      value={formData.residentType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                    >
                      <option value="Owner">Owner (Primary)</option>
                      <option value="Tenant">Tenant (Primary)</option>
                      <option value="FamilyMember">Family Member</option>
                      <option value="Child">Child</option>
                      <option value="SeniorCitizen">Senior Citizen</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Relationship to Owner</label>
                    <input
                      id="form-resident-relationshipToOwner"
                      type="text"
                      name="relationshipToOwner"
                      placeholder="e.g. Self, Spouse, Son, Father"
                      value={formData.relationshipToOwner}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Personal details */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>Personal Details</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">First Name</label>
                    <input
                      id="form-resident-firstName"
                      type="text"
                      name="firstName"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Last Name</label>
                    <input
                      id="form-resident-lastName"
                      type="text"
                      name="lastName"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Gender</label>
                    <select
                      id="form-resident-gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date of Birth</label>
                    <input
                      id="form-resident-dob"
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Contact info */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>Contact Information</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                    <input
                      id="form-resident-email"
                      type="email"
                      name="email"
                      placeholder="e.g. resident@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Phone</label>
                    <input
                      id="form-resident-mobile"
                      type="tel"
                      name="mobile"
                      placeholder="e.g. +91 9876543210"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Blood Group (Optional)</label>
                    <select
                      id="form-resident-bloodGroup"
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                    >
                      <option value="">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Roster Activity Status</label>
                    <select
                      id="form-resident-status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                    >
                      <option value="Active">Active Resident</option>
                      <option value="Inactive">Inactive / Away</option>
                      <option value="Shifted">Shifted Out</option>
                      <option value="Deceased">Deceased</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Professional Info (Optional) */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>Professional Details (Optional)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Occupation</label>
                    <input
                      id="form-resident-occupation"
                      type="text"
                      name="occupation"
                      placeholder="e.g. Software Engineer, Architect"
                      value={formData.occupation}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Company Name</label>
                    <input
                      id="form-resident-companyName"
                      type="text"
                      name="companyName"
                      placeholder="e.g. Google, Hospital"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Emergency Contact */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-gray-400" />
                  <span>Emergency SOS Contact</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">SOS Contact Person</label>
                    <input
                      id="form-resident-emergencyContactName"
                      type="text"
                      name="emergencyContactName"
                      placeholder="Name of friend, relative, etc."
                      value={formData.emergencyContactName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">SOS Phone Mobile</label>
                    <input
                      id="form-resident-emergencyContactMobile"
                      type="tel"
                      name="emergencyContactMobile"
                      placeholder="SOS telephone number"
                      value={formData.emergencyContactMobile}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

            </form>

            {/* Form Footer */}
            <div className="p-6 border-t border-gray-150 bg-gray-50 flex items-center justify-end gap-3">
              <button
                id="btn-cancel-resident"
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-gray-200 hover:border-gray-400 text-gray-700 hover:text-gray-950 bg-white rounded-lg text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-save-resident"
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4.5 h-4.5" />
                    <span>Save Resident</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
