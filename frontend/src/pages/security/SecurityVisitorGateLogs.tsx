import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { toast } from "react-hot-toast";
import {
  Search,
  Plus,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserPlus,
  UserMinus,
  Filter,
  RefreshCw,
  Building,
  KeyRound,
  ShieldCheck,
  MessageSquare,
  Users,
  Car,
  FileText,
  ScanFace
} from "lucide-react";

export const SecurityVisitorGateLogs: React.FC = () => {
  const { token } = useAuth();

  const [visitors, setVisitors] = useState<any[]>([]);
  const [flats, setFlats] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // Tab State: "check-in" or "logs"
  const [activeTab, setActiveTab] = useState<"check-in" | "logs">("check-in");

  // Passcode verification state
  const [passcode, setPasscode] = useState<string>("");
  const [verifiedVisitor, setVerifiedVisitor] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Walk-in Guest Form State
  const [visitorName, setVisitorName] = useState<string>("");
  const [mobile, setMobile] = useState<string>("");
  const [visitorType, setVisitorType] = useState<string>("Guest");
  const [purpose, setPurpose] = useState<string>("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedFlatId, setSelectedFlatId] = useState<string>("");
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [visitorCount, setVisitorCount] = useState<number>(1);

  const fetchGateData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [visitorRes, flatRes, buildingRes] = await Promise.all([
        fetch("/api/v1/society-management/visitors", { headers }),
        fetch("/api/v1/society-management/flats", { headers }),
        fetch("/api/v1/society-management/buildings", { headers })
      ]);

      const visitorData = await visitorRes.json();
      const flatData = await flatRes.json();
      const buildingData = await buildingRes.json();

      if (visitorData.success) {
        setVisitors(visitorData.visitors || []);
      }
      if (flatData.success) {
        setFlats(flatData.flats || []);
      }
      if (buildingData.success) {
        setBuildings(buildingData.buildings || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading gate registers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchGateData();
    }
  }, [token]);

  // Passcode validation
  const handleValidatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || passcode.length < 5) {
      toast.error("Please enter a valid 6-digit passcode.");
      return;
    }

    setIsValidating(true);
    try {
      const res = await fetch("/api/v1/society-management/gate-logs/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ passcode: passcode.trim() })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Passcode verified and guest checked in!");
        setPasscode("");
        setVerifiedVisitor(data.visitor);
        fetchGateData();
      } else {
        toast.error(data.error || "Verification failed. Invalid or expired passcode.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error during passcode validation.");
    } finally {
      setIsValidating(false);
    }
  };

  // Manual Walk-in check-in
  const handleWalkInCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !mobile.trim() || !selectedBuildingId || !selectedFlatId) {
      toast.error("Please fill in all required fields (Name, Mobile, Building, and Flat).");
      return;
    }

    setIsSubmitLoading(true);
    try {
      const res = await fetch("/api/v1/society-management/gate-logs/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isWalkIn: true,
          visitorName: visitorName.trim(),
          mobile: mobile.trim(),
          visitorType,
          purpose: purpose.trim() || "Walk-In Guest",
          buildingId: selectedBuildingId,
          flatId: selectedFlatId,
          vehicleNumber: vehicleNumber.toUpperCase().trim(),
          visitorCount
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Walk-In guest successfully checked-in!");
        // Reset form
        setVisitorName("");
        setMobile("");
        setVisitorType("Guest");
        setPurpose("");
        setSelectedFlatId("");
        setVehicleNumber("");
        setVisitorCount(1);
        fetchGateData();
      } else {
        toast.error(data.error || "Failed to log ad-hoc guest entry.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error during manual check-in.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Check out action
  const handleCheckOut = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/society-management/gate-logs/${id}/check-out`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Visitor Checked Out Successfully!");
        fetchGateData();
      } else {
        toast.error(data.error || "Failed to process check-out.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error during check-out.");
    }
  };

  // Filter flats by selected building
  const filteredFlats = flats.filter(f => f.buildingId === selectedBuildingId);

  // Filter visitors for the lists
  const filteredVisitors = visitors.filter(v => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      v.visitorName.toLowerCase().includes(query) ||
      v.visitorNumber.toLowerCase().includes(query) ||
      v.mobile.includes(query) ||
      (v.passcode && v.passcode.includes(query)) ||
      (v.expectedVehicleNumber && v.expectedVehicleNumber.toLowerCase().includes(query)) ||
      (v.flat && v.flat.flatNumber.toLowerCase().includes(query));

    const matchesStatus =
      filterStatus === "All" ||
      (filterStatus === "Inside" && (v.status === "Checked In" || v.status === "Inside Society")) ||
      (filterStatus === "Checked Out" && v.status === "Checked Out") ||
      (filterStatus === "Expected" && v.status === "Expected");

    return matchesSearch && matchesStatus;
  });

  const insideCount = visitors.filter(v => v.status === "Checked In" || v.status === "Inside Society").length;
  const expectedCount = visitors.filter(v => v.status === "Expected").length;

  return (
    <div id="gate-keeper-desk" className="space-y-6 max-w-7xl mx-auto px-4 py-2">
      {/* Header Widget */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ScanFace className="w-6 h-6 text-slate-800" />
            Security Visitor Desk
          </h1>
          <p className="text-sm text-gray-500 font-sans">
            Validate guest passcodes, register new walk-in arrivals, and monitor vehicles currently inside the society.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchGateData}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("check-in")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "check-in"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Arrival Desk
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "logs"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Gate Logs ({filteredVisitors.length})
            </button>
          </div>
        </div>
      </div>

      {/* Security Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">Guests Inside Society</span>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{insideCount}</p>
          </div>
          <span className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 animate-pulse">
            <UserCheck className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">Awaiting Pre-registered Arrivals</span>
            <p className="text-2xl font-black text-sky-600 font-mono mt-1">{expectedCount}</p>
          </div>
          <span className="p-2.5 bg-sky-50 rounded-xl text-sky-600">
            <Clock className="w-5 h-5" />
          </span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-slate-900 text-white p-5 rounded-2xl border border-slate-950 shadow-md flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Active Status</span>
            <p className="text-sm font-sans font-bold">Main Entrance Security Node 1</p>
          </div>
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500 text-white animate-pulse">
            ● Guard Active
          </span>
        </div>
      </div>

      {activeTab === "check-in" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Passcode validation and Walk-in Check-in */}
          <div className="lg:col-span-7 space-y-6">
            {/* Quick passcode check-in card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-slate-800" />
                Pre-registered Passcode Verification
              </h2>
              <form onSubmit={handleValidatePasscode} className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter visitor's 6-digit gate passcode..."
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-gray-200 rounded-xl font-mono text-base font-extrabold tracking-widest text-slate-900 placeholder:text-gray-400 placeholder:tracking-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isValidating}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5"
                >
                  {isValidating ? "Validating..." : "Verify & Check-In"}
                </button>
              </form>

              {verifiedVisitor && (
                <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Passcode Verified Successfully!
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs font-sans text-slate-700">
                    <div>
                      <span className="block text-gray-400 font-semibold uppercase text-[9px]">Guest Name</span>
                      <strong className="text-slate-900">{verifiedVisitor.visitorName}</strong>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-semibold uppercase text-[9px]">Visitor Mobile</span>
                      <strong>{verifiedVisitor.mobile}</strong>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-semibold uppercase text-[9px]">Visitor Type</span>
                      <strong>{verifiedVisitor.visitorType}</strong>
                    </div>
                    {verifiedVisitor.expectedVehicleNumber && (
                      <div>
                        <span className="block text-gray-400 font-semibold uppercase text-[9px]">Expected Vehicle Number</span>
                        <strong className="font-mono text-slate-950">{verifiedVisitor.expectedVehicleNumber}</strong>
                      </div>
                    )}
                    <div className="col-span-2 border-t border-emerald-100 pt-2">
                      <span className="block text-gray-400 font-semibold uppercase text-[9px]">Host Residence</span>
                      <strong>
                        {verifiedVisitor.flat ? `Flat ${verifiedVisitor.flat.flatNumber}` : "Registered Flat"}
                        {verifiedVisitor.building ? ` (${verifiedVisitor.building.buildingName})` : ""}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Walk-in Form card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-800" />
                Manual Walk-In Entry Registry
              </h2>
              <form onSubmit={handleWalkInCheckIn} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                      Visitor Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Courier Person"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                      Category
                    </label>
                    <select
                      value={visitorType}
                      onChange={(e) => setVisitorType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-semibold text-slate-800"
                    >
                      <option value="Guest">Social Guest</option>
                      <option value="Delivery">Delivery / Courier</option>
                      <option value="ServiceProvider">Service Provider (Plumber, etc.)</option>
                      <option value="Domestic Staff">Domestic Staff (Maid, Guard)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                      Visitor Group Size
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={visitorCount}
                      onChange={(e) => setVisitorCount(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                {/* Building / Flat selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                      Destination Building <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={selectedBuildingId}
                      onChange={(e) => {
                        setSelectedBuildingId(e.target.value);
                        setSelectedFlatId("");
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-sans text-slate-800"
                    >
                      <option value="">Select Building Wing</option>
                      {buildings.map(b => (
                        <option key={b._id} value={b._id}>{b.buildingName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                      Destination Flat <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!selectedBuildingId}
                      value={selectedFlatId}
                      onChange={(e) => setSelectedFlatId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-sans text-slate-800 disabled:opacity-50"
                    >
                      <option value="">Select Flat Number</option>
                      {filteredFlats.map(f => (
                        <option key={f._id} value={f._id}>Flat {f.flatNumber}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Vehicle Number */}
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                      Vehicle License Plate (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MH-12-XX-1234"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-slate-800 uppercase font-bold"
                    />
                  </div>

                  {/* Purpose */}
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                      Purpose of Entry
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Swiggy delivery, Guest visit"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  {isSubmitLoading ? "Logging Guest..." : "Log Manual Check-In"}
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Active visitors currently inside the society */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-sans flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-800" />
                Active Visitors Inside ({insideCount})
              </span>
            </h2>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 text-slate-900 animate-spin" />
                <p className="text-xs text-gray-400">Updating roster...</p>
              </div>
            ) : visitors.filter(v => v.status === "Checked In" || v.status === "Inside Society").length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400 italic">
                No active visitors inside. All checked in logs have cleared out.
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {visitors
                  .filter(v => v.status === "Checked In" || v.status === "Inside Society")
                  .map(v => (
                    <div
                      key={v._id}
                      className="bg-slate-50 border border-gray-200 p-4 rounded-xl flex items-start justify-between gap-3 hover:border-gray-300 transition-all"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-900 text-xs font-sans">{v.visitorName}</strong>
                          <span className="text-[9px] px-1.5 py-0.5 bg-white border border-gray-200 rounded font-semibold uppercase text-slate-500">
                            {v.visitorType}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 space-y-0.5 font-sans">
                          <p>📱 Mobile: <strong>{v.mobile}</strong></p>
                          <p>📍 Flat: <strong>{v.flat ? `Flat ${v.flat.flatNumber}` : "N/A"} ({v.building ? v.building.buildingName : "Common Area"})</strong></p>
                          {v.expectedVehicleNumber && (
                            <p>🚙 Plate: <strong className="font-mono text-slate-900">{v.expectedVehicleNumber}</strong></p>
                          )}
                          <p className="text-emerald-700">🕒 In: <strong>{v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}</strong></p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCheckOut(v._id)}
                        className="flex items-center gap-1 text-[10px] font-extrabold text-red-600 bg-white hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg shadow-sm transition-all shrink-0"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Check-Out
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Logs view */
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden space-y-4 p-5">
          {/* Internal search and filter */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs by guest name, mobile, passcode, or license plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
              />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl self-start">
              <button
                onClick={() => setFilterStatus("All")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === "All" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setFilterStatus("Inside")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === "Inside" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Currently Inside ({insideCount})
              </button>
              <button
                onClick={() => setFilterStatus("Checked Out")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === "Checked Out" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Checked Out
              </button>
              <button
                onClick={() => setFilterStatus("Expected")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === "Expected" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Awaiting Arrivals ({expectedCount})
              </button>
            </div>
          </div>

          {/* Logs Table */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-8 h-8 text-slate-900 animate-spin" />
              <p className="text-xs text-gray-400">Loading historical gate logs...</p>
            </div>
          ) : filteredVisitors.length === 0 ? (
            <div className="py-20 text-center text-xs text-gray-400">
              No matching visitor registry found.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                    <th className="px-5 py-3">Log ID</th>
                    <th className="px-5 py-3">Visitor Info</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Host Residence</th>
                    <th className="px-5 py-3">Plate Number</th>
                    <th className="px-5 py-3">Security Pass</th>
                    <th className="px-5 py-3">Check-In / Out Stamps</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs font-sans text-slate-700">
                  {filteredVisitors.map(v => (
                    <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-[10px] text-gray-400">{v.visitorNumber}</td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-900">{v.visitorName}</div>
                        <div className="text-gray-400 mt-0.5">{v.mobile}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-slate-50 border rounded font-semibold text-[10px] text-slate-600">
                          {v.visitorType}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-800">
                        {v.flat ? `Flat ${v.flat.flatNumber}` : "N/A"}
                        <span className="block text-[10px] text-gray-400 font-normal">{v.building ? v.building.buildingName : "Common"}</span>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900 uppercase">
                        {v.expectedVehicleNumber || v.vehicleNumber || "-"}
                      </td>
                      <td className="px-5 py-3">
                        {v.passcode ? (
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 border rounded">
                            {v.passcode}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Walk-In Log</span>
                        )}
                      </td>
                      <td className="px-5 py-3 space-y-1">
                        {v.checkInTime ? (
                          <div className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            In: {new Date(v.checkInTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        ) : (
                          <div className="text-gray-400 italic">No entry logged</div>
                        )}
                        {v.checkOutTime ? (
                          <div className="text-slate-500 font-semibold flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Out: {new Date(v.checkOutTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        ) : v.status === "Checked In" ? (
                          <div className="text-rose-600 font-bold italic">Still Inside</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          v.status === "Expected"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : v.status === "Checked In"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : v.status === "Checked Out"
                            ? "bg-gray-100 text-gray-600 border-gray-200"
                            : "bg-red-50 text-red-600 border-red-200"
                        }`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
