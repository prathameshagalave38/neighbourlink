import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { Home, Users, Building, Mail, Phone, Calendar, Heart, Briefcase, ShieldAlert, RefreshCw, UserCheck, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Building as BuildingType, Flat, Resident } from "../../types.ts";

export const MyFlatInfo: React.FC = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<Resident | null>(null);
  const [flat, setFlat] = useState<(Flat & { building: BuildingType | null }) | null>(null);
  const [building, setBuilding] = useState<BuildingType | null>(null);
  const [members, setMembers] = useState<Resident[]>([]);

  useEffect(() => {
    fetchMyFlatInfo();
  }, []);

  const fetchMyFlatInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/society-management/residents/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setProfile(data.resident);
        setFlat(data.flat);
        setBuilding(data.building);
        setMembers(data.members || []);
      } else {
        toast.error(data.error || "Failed to load flat information.");
      }
    } catch (err) {
      toast.error("Error communicating with server.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-2xl shadow-sm gap-3">
        <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
        <span className="text-sm font-medium text-gray-500">Retrieving flat configurations and profiles...</span>
      </div>
    );
  }

  if (!flat) {
    return (
      <div className="p-8 bg-white border border-gray-150 rounded-2xl shadow-sm max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto">
          <Building className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Flat Information Pending Association</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your resident account (<span className="font-semibold font-mono text-xs">{user?.email}</span>) is active, but you have not been bound to an active flat registry by the administrator yet.
        </p>
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-xs text-left space-y-2 text-slate-600">
          <p className="font-semibold text-slate-800">What to do next:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Contact your society's Admin or SuperAdmin team.</li>
            <li>Request them to add you to the **Residents Roster** with your official email address: <span className="underline font-medium">{user?.email}</span>.</li>
            <li>Once they map you to a building and flat number, your full household roster and notices will synchronize instantly here.</li>
          </ul>
        </div>
      </div>
    );
  }

  // Format date helper
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div id="my-flat-info-view" className="space-y-6">
      {/* Dynamic welcome header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Flat Info & Roster</h1>
          <p className="text-sm text-slate-300 mt-1">
            Review your registered flat information, building details, household family list, and emergency contacts.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-xs font-mono rounded-lg border border-slate-700">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>Assigned: Flat {flat.flatNumber}, {building?.buildingName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Flat & Building summary card */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Home className="w-4.5 h-4.5 text-gray-400" />
              <span>Assigned Flat Specs</span>
            </h3>
            
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-xs text-gray-500">Flat Number</span>
                <span className="text-sm font-bold text-slate-900 font-mono">Flat {flat.flatNumber}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-xs text-gray-500">Floor Level</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{flat.floor} Floor</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-xs text-gray-500">Flat Type</span>
                <span className="text-sm font-semibold text-slate-800">{flat.flatType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Occupancy Type</span>
                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150">
                  {flat.occupancyStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4.5 h-4.5 text-gray-400" />
              <span>Building Information</span>
            </h3>
            
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-xs text-gray-500">Building Name</span>
                <span className="text-sm font-bold text-slate-900">{building?.buildingName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-xs text-gray-500">Building Code</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{building?.buildingCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Total Floors</span>
                <span className="text-sm font-semibold text-slate-800">{building?.floors} Floors</span>
              </div>
            </div>
          </div>

          {/* SOS Emergency contacts card */}
          {profile?.emergencyContact && (
            <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 text-amber-800">
                <ShieldAlert className="w-4.5 h-4.5 text-amber-500" />
                <span>My SOS Emergency Contact</span>
              </h3>
              
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-amber-100">
                  <span className="text-xs text-amber-800">SOS Person</span>
                  <span className="text-sm font-bold text-gray-900">{profile.emergencyContact.name || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-amber-800">SOS Mobile</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{profile.emergencyContact.mobile || "N/A"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Columns: Personal Profile & Household members */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Profile Details Card */}
          <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4.5 h-4.5 text-slate-900" />
              <span>My Registered Resident Details</span>
            </h3>

            {profile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Full Registered Name</span>
                  <span className="font-semibold text-gray-900 mt-1 block">{profile.firstName} {profile.lastName}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Resident Classification</span>
                  <span className="font-semibold text-gray-900 mt-1 block">{profile.residentType} ({profile.relationshipToOwner || "Self"})</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Official Email Address</span>
                  <span className="font-semibold text-gray-900 mt-1 block flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {profile.email}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Mobile Phone Number</span>
                  <span className="font-semibold text-gray-900 mt-1 block flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {profile.mobile}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Date of Birth</span>
                  <span className="font-semibold text-gray-900 mt-1 block flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(profile.dob)}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Blood Group Type</span>
                  <span className="font-semibold text-red-600 mt-1 block flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-red-400" />
                    {profile.bloodGroup || "Not Declared"}
                  </span>
                </div>

                {profile.occupation && (
                  <div className="p-3 bg-gray-50 rounded-lg col-span-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Professional Occupation</span>
                    <span className="font-semibold text-gray-900 mt-1 block flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      {profile.occupation} {profile.companyName ? `at ${profile.companyName}` : ""}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                No personal profile sheet linked. If you are registering under a family flat, ask the primary flat owner or society admin to add you to the database using email: <span className="font-bold underline">{user?.email}</span>.
              </div>
            )}
          </div>

          {/* Household Family Members Card */}
          <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-slate-900" />
              <span>Co-Residents & Household Family ({members.length})</span>
            </h3>

            {members.length <= 1 ? (
              <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-400">
                No other family members are registered in this flat yet. Ask the admin to register your family.
              </div>
            ) : (
              <div className="border border-gray-150 rounded-lg overflow-hidden divide-y divide-gray-100">
                {members.map(mb => {
                  const initials = `${mb.firstName?.charAt(0) || ""}${mb.lastName?.charAt(0) || ""}`.toUpperCase();
                  const isMe = mb.email.toLowerCase().trim() === user?.email?.toLowerCase()?.trim();
                  
                  return (
                    <div key={mb._id} className={`p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors ${isMe ? "bg-slate-50/50" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                          {initials}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 text-sm">
                            {mb.firstName} {mb.lastName} {isMe && <span className="text-xs text-slate-500 font-normal font-sans">(You)</span>}
                          </span>
                          <span className="text-xs text-gray-500 block">
                            {mb.residentType} {mb.relationshipToOwner ? `• ${mb.relationshipToOwner}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono text-gray-600 block">{mb.mobile}</span>
                        <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-150 mt-1">
                          {mb.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
