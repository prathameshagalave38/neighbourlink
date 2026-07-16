import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { Building2, Save, FileText, Phone, Mail, ShieldAlert, CheckCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Society } from "../../types/index.ts";

export const SocietySetup: React.FC = () => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [society, setSociety] = useState<Partial<Society>>({
    name: "",
    registrationNumber: "",
    societyCode: "",
    description: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    email: "",
    phone: "",
    emergencyContact: "",
    status: "Active"
  });

  // Fetch society on mount
  useEffect(() => {
    fetchSociety();
  }, []);

  const fetchSociety = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success && data.society) {
        setSociety(data.society);
      }
    } catch (err: any) {
      toast.error("Failed to load society configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSociety(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validations
    if (!society.name?.trim()) return toast.error("Society Name is required.");
    if (!society.societyCode?.trim()) return toast.error("Society Code is required.");
    if (society.societyCode.trim().length < 3) return toast.error("Society Code must be at least 3 characters.");
    if (!society.address?.trim()) return toast.error("Address is required.");
    if (!society.city?.trim()) return toast.error("City is required.");
    if (!society.state?.trim()) return toast.error("State is required.");
    if (!society.pincode?.trim()) return toast.error("Pincode is required.");
    if (!society.email?.trim()) return toast.error("Contact Email is required.");
    if (!society.phone?.trim()) return toast.error("Contact Phone is required.");

    setIsSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(society)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Society details saved successfully!");
        if (data.society) {
          setSociety(data.society);
        }
      } else {
        throw new Error(data.error || "Failed to update configurations.");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div id="society-loading" className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
          <span className="text-xs font-semibold text-gray-500 font-sans">Retrieving Society configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="society-setup-view" className="space-y-6">
      {/* Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Society Profile Configuration</h1>
          <p className="text-sm text-slate-300 mt-1">
            Establish legal records, society code identifiers, and primary contacts for your community gates.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-xs font-mono rounded-lg border border-slate-700">
          <Building2 className="w-4 h-4 text-slate-300" />
          <span>Code: {society.societyCode || "UNSET"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 bg-white border border-gray-150 rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">Primary Society Information</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Society Name <span className="text-red-500">*</span></label>
                <input
                  id="soc-input-name"
                  type="text"
                  name="name"
                  value={society.name || ""}
                  onChange={handleInputChange}
                  placeholder="e.g. Green Meadows Co-operative Society"
                  className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Society Code <span className="text-red-500">*</span></label>
                  <input
                    id="soc-input-code"
                    type="text"
                    name="societyCode"
                    value={society.societyCode || ""}
                    onChange={handleInputChange}
                    placeholder="e.g. GMCS"
                    className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
                    required
                  />
                  <span className="text-[10px] text-gray-400 block">Short code used for resident registration</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Reg. Number</label>
                  <input
                    id="soc-input-reg"
                    type="text"
                    name="registrationNumber"
                    value={society.registrationNumber || ""}
                    onChange={handleInputChange}
                    placeholder="e.g. REG-10293/2026"
                    className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Description / Tagline</label>
              <textarea
                id="soc-input-desc"
                name="description"
                value={society.description || ""}
                onChange={handleInputChange}
                placeholder="Brief welcome message or descriptive details for community notices..."
                rows={2}
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest pt-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Location Coordinates & Address</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Street Address <span className="text-red-500">*</span></label>
              <input
                id="soc-input-address"
                type="text"
                name="address"
                value={society.address || ""}
                onChange={handleInputChange}
                placeholder="101, Park Avenue, Opp. Central Gardens"
                className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">City <span className="text-red-500">*</span></label>
                <input
                  id="soc-input-city"
                  type="text"
                  name="city"
                  value={society.city || ""}
                  onChange={handleInputChange}
                  placeholder="Pune"
                  className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">State <span className="text-red-500">*</span></label>
                <input
                  id="soc-input-state"
                  type="text"
                  name="state"
                  value={society.state || ""}
                  onChange={handleInputChange}
                  placeholder="Maharashtra"
                  className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Pincode <span className="text-red-500">*</span></label>
                <input
                  id="soc-input-pincode"
                  type="text"
                  name="pincode"
                  value={society.pincode || ""}
                  onChange={handleInputChange}
                  placeholder="411001"
                  className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Country</label>
                <input
                  id="soc-input-country"
                  type="text"
                  name="country"
                  value={society.country || ""}
                  onChange={handleInputChange}
                  className="w-full text-sm border border-gray-250 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest pt-2 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>Contact Channels & Support</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Official Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    id="soc-input-email"
                    type="email"
                    name="email"
                    value={society.email || ""}
                    onChange={handleInputChange}
                    placeholder="office@greenmeadows.com"
                    className="w-full text-sm border border-gray-250 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Office Phone <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    id="soc-input-phone"
                    type="tel"
                    name="phone"
                    value={society.phone || ""}
                    onChange={handleInputChange}
                    placeholder="+91 20 1234 5678"
                    className="w-full text-sm border border-gray-250 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Emergency Contact</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-red-400" />
                  <input
                    id="soc-input-emergency"
                    type="tel"
                    name="emergencyContact"
                    value={society.emergencyContact || ""}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full text-sm border border-gray-250 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none text-red-600 placeholder-red-300 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Society Status</label>
                <select
                  id="soc-select-status"
                  name="status"
                  value={society.status || "Active"}
                  onChange={handleInputChange}
                  className="text-xs font-semibold bg-gray-50 border border-gray-250 rounded-lg p-1.5 focus:outline-none"
                >
                  <option value="Active">Active / Live Operations</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>

              <button
                id="soc-btn-save"
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Society Configuration</span>
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar help guidelines */}
        <div className="space-y-6">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Admin Instructions</span>
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              This society registration is the foundational cornerstone of NeighbourLink. Configuring the <strong>Society Code</strong> is vital.
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              When residents sign up, they must enter this exact code to request access and map themselves to flats in your registered buildings.
            </p>
            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Registration Code</span>
              {society.societyCode ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-900 font-mono font-bold text-sm rounded border border-slate-200 uppercase">
                    {society.societyCode}
                  </span>
                  <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Ready for Use
                  </span>
                </div>
              ) : (
                <span className="text-xs text-amber-600 font-semibold italic">Unconfigured. Set a code now!</span>
              )}
            </div>
          </div>

          <div className="p-5 bg-blue-50 border border-blue-150 rounded-xl">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide">Dynamic Local Storage fallback</h4>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
              Since you are on a real container cluster, society setups are safely synced to your persistent fallback data-store file immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
