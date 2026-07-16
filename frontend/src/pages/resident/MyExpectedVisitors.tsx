import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { toast } from "react-hot-toast";
import {
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  User,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Share2,
  Car,
  Users,
  ShieldCheck,
  MessageSquare,
  Sparkles
} from "lucide-react";

export const MyExpectedVisitors: React.FC = () => {
  const { token, user: currentUser } = useAuth();

  const [visitors, setVisitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedPasscode, setCopiedPasscode] = useState<string | null>(null);

  // Form Fields
  const [visitorName, setVisitorName] = useState<string>("");
  const [mobile, setMobile] = useState<string>("");
  const [visitorType, setVisitorType] = useState<string>("Guest");
  const [purpose, setPurpose] = useState<string>("");
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [expectedTime, setExpectedTime] = useState<string>("");
  const [expectedVehicleNumber, setExpectedVehicleNumber] = useState<string>("");
  const [visitorCount, setVisitorCount] = useState<number>(1);

  const fetchMyVisitors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/visitors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setVisitors(data.visitors || []);
      } else {
        toast.error(data.error || "Failed to load your expected visitors list.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyVisitors();
    }
  }, [token]);

  const handleOpenAddModal = () => {
    setVisitorName("");
    setMobile("");
    setVisitorType("Guest");
    setPurpose("");
    
    // Set default date to today
    const today = new Date().toISOString().split("T")[0];
    setExpectedDate(today);
    
    // Set default time to current hour
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setExpectedTime(`${hours}:${minutes}`);

    setExpectedVehicleNumber("");
    setVisitorCount(1);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !mobile.trim() || !expectedDate || !expectedTime) {
      toast.error("Please fill in all required fields (Name, Mobile, Date, and Time).");
      return;
    }

    setIsSubmitLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/visitors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          visitorName: visitorName.trim(),
          mobile: mobile.trim(),
          visitorType,
          purpose: purpose.trim(),
          expectedDate,
          expectedTime,
          expectedVehicleNumber: expectedVehicleNumber.toUpperCase().trim(),
          visitorCount
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Guest pre-registered successfully!");
        setIsModalOpen(false);
        fetchMyVisitors();
      } else {
        toast.error(data.error || "Failed to pre-register expected guest.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating visitor pre-approval entry.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleCancelVisitor = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this visitor's pre-approval? This will deactivate their gate passcode.")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/visitors/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "Cancelled" })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Visitor pre-approval cancelled successfully.");
        fetchMyVisitors();
      } else {
        toast.error(data.error || "Failed to cancel visitor.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error cancelling visitor pre-approval.");
    }
  };

  const handleCopyPasscode = (passcode: string) => {
    navigator.clipboard.writeText(passcode);
    setCopiedPasscode(passcode);
    toast.success(`Passcode ${passcode} copied to clipboard!`);
    setTimeout(() => {
      setCopiedPasscode(null);
    }, 2000);
  };

  const handleShareOnWhatsApp = (visitor: any) => {
    const text = `Hi ${visitor.visitorName}, I have pre-registered your entry at NeighbourLink Society. Please show this secure 6-digit gate passcode to the Security Guard for seamless check-in:\n🔑 Passcode: ${visitor.passcode}\n📅 Date: ${visitor.expectedDate}\n🕒 Time: ${visitor.expectedTime}\nLooking forward to seeing you!`;
    
    // Copy message to clipboard as a fallback for iframe environments
    try {
      navigator.clipboard.writeText(text);
      toast.success("Invite message copied to clipboard! Ready to paste in WhatsApp.");
    } catch (err) {
      console.warn("Could not copy to clipboard", err);
    }

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    try {
      window.open(url, "_blank");
    } catch (e) {
      console.warn("Popup blocked inside iframe", e);
    }
  };

  // Filters State
  const filteredVisitors = visitors.filter(v => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      v.visitorName.toLowerCase().includes(query) ||
      v.visitorNumber.toLowerCase().includes(query) ||
      (v.passcode && v.passcode.includes(query)) ||
      v.mobile.includes(query) ||
      (v.expectedVehicleNumber && v.expectedVehicleNumber.toLowerCase().includes(query));

    const matchesType = filterType === "All" || v.visitorType === filterType;
    const matchesStatus = filterStatus === "All" || v.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Expected":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Checked In":
      case "Inside Society":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse";
      case "Checked Out":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "Cancelled":
        return "bg-rose-50 text-rose-600 border-rose-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <div id="expected-visitors-container" className="space-y-6 max-w-7xl mx-auto px-4 py-2">
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-slate-800" />
            My Expected Visitors
          </h1>
          <p className="text-sm text-gray-500 font-sans">
            Pre-approve guests, food deliveries, and repairs. Generate secure gate passcodes for automated check-in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMyVisitors}
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
            Pre-register Guest
          </button>
        </div>
      </div>

      {/* Info Warning banner */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-600">
        <Sparkles className="w-5 h-5 text-slate-800 shrink-0" />
        <p className="font-sans font-medium">
          <strong>Security Protocol:</strong> Gate passes generated here are valid only for the selected date. Share the 6-digit passcode with your visitors via WhatsApp, Email, or SMS. When they arrive at the security gate, the guard can verify the passcode directly without calling you.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Main search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by visitor name, mobile, invite code, plate number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-sans"
            />
          </div>

          {/* Quick Filter Selects */}
          <div className="flex flex-wrap gap-2">
            {/* Visitor Type */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Visitor Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="All">All Types</option>
                <option value="Guest">Social Guest</option>
                <option value="Delivery">Delivery / Courier</option>
                <option value="ServiceProvider">Service Provider</option>
                <option value="Domestic Staff">Daily Domestic Staff</option>
                <option value="Other">Other Category</option>
              </select>
            </div>

            {/* Entry Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Entry Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="All">All Logs</option>
                <option value="Expected">Awaiting Arrival (Expected)</option>
                <option value="Checked In">Inside (Checked In)</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Cancelled">Cancelled Invite</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid of Pre-registrations */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-150 p-20 flex flex-col items-center justify-center gap-4">
          <RefreshCw className="w-8 h-8 text-slate-900 animate-spin" />
          <p className="text-sm text-gray-500 font-semibold font-sans">Loading guest pre-approvals...</p>
        </div>
      ) : filteredVisitors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-150 p-16 text-center space-y-4">
          <div className="p-4 bg-slate-50 rounded-full text-slate-400 inline-block">
            <Users className="w-10 h-10" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-sans font-bold text-slate-800">No Pre-registrations Registered</h3>
            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              {searchQuery || filterType !== "All" || filterStatus !== "All"
                ? "No pre-approvals match your filters. Try widening your criteria."
                : "You have no upcoming expected visitors. Pre-register your guests, deliveries, or staff to grant them instant entry!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVisitors.map(v => (
            <div
              key={v._id}
              className={`bg-white rounded-2xl border border-gray-150 shadow-sm p-5 space-y-4 relative flex flex-col justify-between hover:shadow-md transition-all ${
                v.status === "Checked In" ? "ring-2 ring-emerald-500/30" : ""
              }`}
            >
              {/* Card top */}
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {v.visitorType}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 font-sans">
                      {v.visitorName}
                    </h3>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(v.status)}`}>
                    {v.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 font-sans">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Expected: <strong>{v.expectedDate}</strong> @ <strong>{v.expectedTime}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Mobile: <strong className="text-slate-800">{v.mobile}</strong></span>
                  </div>
                  {v.expectedVehicleNumber && (
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Vehicle Number: <strong className="font-mono text-slate-800">{v.expectedVehicleNumber}</strong></span>
                    </div>
                  )}
                  {v.purpose && (
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">Purpose: <strong className="text-slate-800">{v.purpose}</strong></span>
                    </div>
                  )}
                  {v.visitorCount > 1 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Group Size: <strong className="text-slate-800">{v.visitorCount} Persons</strong></span>
                    </div>
                  )}

                  {/* Real-time gate stamps */}
                  {v.checkInTime && (
                    <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg text-emerald-800 space-y-0.5 text-[10px] mt-2">
                      <span className="block font-bold">Checked In:</span>
                      <span>{new Date(v.checkInTime).toLocaleString()}</span>
                    </div>
                  )}
                  {v.checkOutTime && (
                    <div className="bg-gray-100 border border-gray-150 p-2 rounded-lg text-gray-600 space-y-0.5 text-[10px] mt-1">
                      <span className="block font-bold">Checked Out:</span>
                      <span>{new Date(v.checkOutTime).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Secure Passcode Widget */}
              {v.status === "Expected" && v.passcode && (
                <div className="bg-slate-50 border border-dashed border-gray-200 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                      Gate Passcode (Pre-approved)
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 font-bold">
                      {v.visitorNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                    <span className="font-mono text-lg font-extrabold tracking-widest text-slate-900">
                      {v.passcode}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleCopyPasscode(v.passcode)}
                        className="p-1 rounded-md text-gray-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Copy Code"
                      >
                        {copiedPasscode === v.passcode ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleShareOnWhatsApp(v)}
                        className="p-1 rounded-md text-gray-400 hover:text-green-600 hover:bg-slate-100 transition-colors"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions panel */}
              {v.status === "Expected" && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleCancelVisitor(v._id)}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Cancel Approval
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Pre-registered Visitor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-1.5">
                <UserCheck className="w-5 h-5 text-slate-600" />
                Pre-register Visitor
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
                {/* Visitor Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Guest Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800 font-bold"
                  />
                </div>

                {/* Mobile */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Guest Mobile Number <span className="text-red-500">*</span>
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
                {/* Visitor Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Visitor Category
                  </label>
                  <select
                    value={visitorType}
                    onChange={(e) => setVisitorType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white font-semibold text-slate-800"
                  >
                    <option value="Guest">Social Guest</option>
                    <option value="Delivery">Delivery / Courier</option>
                    <option value="ServiceProvider">Service Provider (Plumber, etc.)</option>
                    <option value="Domestic Staff">Domestic Staff (Maid, Cook)</option>
                    <option value="Other">Other Category</option>
                  </select>
                </div>

                {/* Visitor Count */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Visitor Group Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={visitorCount}
                    onChange={(e) => setVisitorCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Expected Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Expected Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800 font-semibold"
                  />
                </div>

                {/* Expected Time */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Arrival Time Window <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={expectedTime}
                    onChange={(e) => setExpectedTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Expected Vehicle Plate */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Expected Vehicle license plate number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH-12-XX-1234"
                    value={expectedVehicleNumber}
                    onChange={(e) => setExpectedVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-slate-800 uppercase font-bold"
                  />
                </div>

                {/* Purpose of visit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                    Purpose / Notes for Security Guard (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Lunch guest, Amazon package delivery, AC maintenance work"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans text-slate-800 resize-none"
                  />
                </div>
              </div>

              {/* Form Action panel */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md"
                >
                  {isSubmitLoading ? "Pre-registering..." : "Generate Passcode Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
