import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { toast } from "react-hot-toast";
import {
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  ShieldAlert,
  Car,
  User,
  Building,
  Info,
  Layers,
  Sparkles,
  ShieldCheck,
  Ban
} from "lucide-react";

export const GateVehicleVerification: React.FC = () => {
  const { token, user: currentUser } = useAuth();

  const [queryPlate, setQueryPlate] = useState<string>("");
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Blacklist state
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [isBlacklistLoading, setIsBlacklistLoading] = useState<boolean>(false);
  const [isBlacklistSubmitLoading, setIsBlacklistSubmitLoading] = useState<boolean>(false);

  // Blacklist Form fields
  const [blacklistPlate, setBlacklistPlate] = useState<string>("");
  const [blacklistReason, setBlacklistReason] = useState<string>("");

  const fetchBlacklist = async () => {
    setIsBlacklistLoading(true);
    try {
      const res = await fetch("/api/v1/society-management/vehicles/blacklist", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBlacklist(data.list || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBlacklistLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBlacklist();
    }
  }, [token]);

  // Main plate lookup verification
  const handleVerifyPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryPlate.trim()) {
      toast.error("Please enter a vehicle license plate number.");
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const plate = queryPlate.trim().toUpperCase();
      const res = await fetch(`/api/v1/society-management/vehicles/verify?vehicleNumber=${encodeURIComponent(plate)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setVerificationResult(data);
        if (data.classification === "Blacklisted") {
          toast.error(`⚠️ WARNING: Vehicle plate ${plate} is blacklisted! DENY ENTRY!`, { duration: 5000 });
        } else if (data.classification === "Resident" || data.classification === "Expected Visitor") {
          toast.success(`Verified: ${data.classification}`);
        } else {
          toast.loading("Unknown vehicle. Register details if entry is permitted.", { duration: 3000 });
        }
      } else {
        toast.error(data.error || "Lookup failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server communication error.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Blacklist a new plate
  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistPlate.trim() || !blacklistReason.trim()) {
      toast.error("Please provide both a vehicle plate number and a security reason.");
      return;
    }

    setIsBlacklistSubmitLoading(true);
    try {
      const res = await fetch("/api/v1/society-management/vehicles/blacklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleNumber: blacklistPlate.trim().toUpperCase(),
          reason: blacklistReason.trim(),
          isBlacklisted: true
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Plate successfully blacklisted!");
        setBlacklistPlate("");
        setBlacklistReason("");
        fetchBlacklist();
      } else {
        toast.error(data.error || "Failed to flag plate.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server.");
    } finally {
      setIsBlacklistSubmitLoading(false);
    }
  };

  // Remove plate from blacklist
  const handleRemoveBlacklist = async (id: string) => {
    if (!window.confirm("Are you sure you want to clear this vehicle from blacklist files?")) return;

    try {
      const res = await fetch(`/api/v1/society-management/vehicles/blacklist/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vehicle cleared from blacklist records.");
        fetchBlacklist();
      } else {
        toast.error(data.error || "Failed to clear record.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error clearing blacklist record.");
    }
  };

  return (
    <div id="vehicle-verification-hub" className="space-y-6 max-w-7xl mx-auto px-4 py-2">
      {/* Header Widget */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Car className="w-6 h-6 text-slate-800" />
            Gate Vehicle Verification
          </h1>
          <p className="text-sm text-gray-500 font-sans">
            Scan or query license plates to check residency status, expected visitor passes, or security flags.
          </p>
        </div>
        <button
          onClick={fetchBlacklist}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isBlacklistLoading ? "animate-spin" : ""}`} />
          Refresh Registry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vehicle Plate verification check */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main lookup card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
              <Search className="w-5 h-5 text-slate-800" />
              Live License Plate Lookup
            </h2>

            <form onSubmit={handleVerifyPlate} className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. MH12PQ9876, KA03MJ4500..."
                value={queryPlate}
                onChange={(e) => setQueryPlate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl font-mono text-sm font-bold tracking-widest text-slate-900 uppercase placeholder:text-gray-400 placeholder:tracking-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5"
              >
                {isVerifying ? "Verifying..." : "Verify Plate"}
              </button>
            </form>

            <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
              Verify license plates against society records before opening the boom barrier. Ensure to cross-verify physical plates against the screen output.
            </p>
          </div>

          {/* Verification Results Panel */}
          {verificationResult && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-200">
              {verificationResult.classification === "Blacklisted" && (
                <div className="bg-red-50 border border-red-200 p-6 rounded-2xl space-y-4 text-red-800 ring-4 ring-red-500/20">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-10 h-10 text-red-600 animate-bounce" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-500 font-sans">Security Threat Block</span>
                      <h3 className="text-lg font-black font-mono tracking-widest text-red-900 mt-0.5">
                        {verificationResult.vehicleNumber}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-red-200 rounded-xl space-y-2 text-xs font-sans text-red-700">
                    <p className="font-extrabold flex items-center gap-1.5 text-red-800">
                      <Ban className="w-4 h-4 text-red-600" />
                      ENTRY DENIED / DO NOT OPEN BOOM BARRIER
                    </p>
                    <p><strong>Reason Flagged:</strong> {verificationResult.reason}</p>
                    <p><strong>Flagged By:</strong> {verificationResult.details?.flaggedBy}</p>
                    <p><strong>Flagged Date:</strong> {new Date(verificationResult.details?.dateFlagged).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {verificationResult.classification === "Resident" && (
                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl space-y-4 text-emerald-800">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-10 h-10 text-emerald-600" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 font-sans">Authorized Resident Vehicle</span>
                      <h3 className="text-lg font-black font-mono tracking-widest text-emerald-950 mt-0.5">
                        {verificationResult.vehicleNumber}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-emerald-150 rounded-xl space-y-2 text-xs font-sans text-slate-700">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ENTRY AUTHORIZED
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Registered Owner</span>
                        <strong className="text-slate-900">{verificationResult.details.ownerName}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Residence flat</span>
                        <strong className="text-slate-900">
                          {verificationResult.details.buildingName} - {verificationResult.details.flatNumber}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Parking Slot</span>
                        <strong className="text-slate-900 font-mono">{verificationResult.details.parkingSlot}</strong>
                      </div>
                      {verificationResult.details.vehicleInfo && (
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-400 block">Vehicle specs</span>
                          <strong className="text-slate-900">{verificationResult.details.vehicleInfo}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {verificationResult.classification === "Expected Visitor" && (
                <div className="bg-sky-50 border border-sky-200 p-6 rounded-2xl space-y-4 text-sky-800">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-10 h-10 text-sky-600" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-sky-500 font-sans">Expected pre-approved guest</span>
                      <h3 className="text-lg font-black font-mono tracking-widest text-sky-950 mt-0.5">
                        {verificationResult.vehicleNumber}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-sky-150 rounded-xl space-y-2 text-xs font-sans text-slate-700">
                    <p className="font-bold flex items-center gap-1.5 text-sky-700">
                      <CheckCircle className="w-4 h-4 text-sky-500" />
                      ENTRY PRE-APPROVED
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Guest Name</span>
                        <strong className="text-slate-900">{verificationResult.details.ownerName}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Destination Resident</span>
                        <strong className="text-slate-900">
                          {verificationResult.details.buildingName} - {verificationResult.details.flatNumber}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Purpose / Specs</span>
                        <strong className="text-slate-900">{verificationResult.details.purpose}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Guest Code Pass</span>
                        <strong className="text-slate-900 font-mono text-sm tracking-wider">{verificationResult.details.passcode}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {verificationResult.classification === "Unregistered" && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl space-y-4 text-amber-800">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-10 h-10 text-amber-500" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 font-sans">Unregistered / Unknown Vehicle</span>
                      <h3 className="text-lg font-black font-mono tracking-widest text-amber-950 mt-0.5">
                        {verificationResult.vehicleNumber}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-amber-150 rounded-xl space-y-3 text-xs font-sans text-slate-700">
                    <p className="font-semibold text-amber-800">
                      ⚠️ No existing matching records found.
                    </p>
                    <p className="text-[11px] text-gray-500">
                      This vehicle is not registered to any resident or pre-approved visitor. Manual security inspection and ad-hoc log register is required before entry is permitted.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Manage Blacklist / Flags */}
        <div className="lg:col-span-5 space-y-6">
          {/* Form to Flag vehicle */}
          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-3.5">
            <h2 className="text-xs font-bold text-slate-900 font-sans uppercase tracking-wider flex items-center gap-1.5 text-red-600">
              <Ban className="w-4 h-4 text-red-500" />
              Flag Vehicle in Security Blacklist
            </h2>

            <form onSubmit={handleAddBlacklist} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                  Vehicle license plate number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-XX-9999"
                  value={blacklistPlate}
                  onChange={(e) => setBlacklistPlate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-mono font-bold text-slate-800 uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                  Reason for flag / Ban details
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Speeding, unauthorized parking, blocklist hazard"
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-sans text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isBlacklistSubmitLoading}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {isBlacklistSubmitLoading ? "Flagging..." : "Add to Security Blacklist"}
              </button>
            </form>
          </div>

          {/* Active Blacklist Panel */}
          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-900 font-sans uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-600" />
              Flagged Blacklisted plates ({blacklist.length})
            </h2>

            {isBlacklistLoading ? (
              <div className="py-8 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-slate-800 animate-spin" />
              </div>
            ) : blacklist.length === 0 ? (
              <div className="py-12 text-center text-[11px] text-gray-400 italic">
                Excellent! No plates are currently blacklisted.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {blacklist.map(item => (
                  <div
                    key={item._id}
                    className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between gap-3 hover:bg-red-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <strong className="font-mono text-xs font-black tracking-widest text-red-900 uppercase">
                        {item.vehicleNumber}
                      </strong>
                      <span className="block text-[10px] text-red-700 font-sans">
                        ⚠️ {item.reason}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveBlacklist(item._id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded border border-transparent hover:border-red-200 transition-all shadow-xs"
                      title="Clear flag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
