import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus } from "../../types/index.ts";
import { toast } from "react-hot-toast";
import { 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  User, 
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  X,
  RefreshCw,
  Eye,
  Activity,
  FileText,
  UserCheck,
  Building2,
  Calendar,
  MessageSquare
} from "lucide-react";

export const ComplaintsReview: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  
  const [complaints, setComplaints] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterBuilding, setFilterBuilding] = useState<string>("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");

  // Selected Complaint Modal State
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Management State (Inside Modal)
  const [statusUpdate, setStatusUpdate] = useState<ComplaintStatus>("Open");
  const [assignedToUpdate, setAssignedToUpdate] = useState<string>("");
  const [timelineNotes, setTimelineNotes] = useState<string>("");
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const categories: ComplaintCategory[] = [
    "Electrical",
    "Plumbing",
    "Cleaning",
    "Security",
    "Lift",
    "Parking",
    "Water Supply",
    "Noise",
    "Common Area",
    "Other"
  ];

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [complaintsRes, usersRes, buildingsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/complaints`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/users`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/buildings`, { headers })
      ]);

      const complaintsData = await complaintsRes.json();
      const usersData = await usersRes.json();
      const buildingsData = await buildingsRes.json();

      if (complaintsData.success) {
        setComplaints(complaintsData.complaints || []);
      } else {
        toast.error(complaintsData.error || "Failed to load complaints.");
      }

      if (usersData.success) {
        setUsers(usersData.users || []);
      }

      if (buildingsData.success) {
        setBuildings(buildingsData.buildings || []);
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
      fetchAllData();
    }
  }, [token]);

  const handleOpenModal = (complaint: any) => {
    setSelectedComplaint(complaint);
    setStatusUpdate(complaint.status);
    setAssignedToUpdate(complaint.assignedTo || "");
    setTimelineNotes("");
    setResolutionNotes(complaint.resolutionNotes || "");
    setIsModalOpen(true);
  };

  const handleSaveManagementChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setIsUpdating(true);
    try {
      const isStatusChanged = statusUpdate !== selectedComplaint.status;
      const isAssignedChanged = assignedToUpdate !== (selectedComplaint.assignedTo || "");
      const isResolutionNotesChanged = resolutionNotes !== (selectedComplaint.resolutionNotes || "");

      let notes = timelineNotes.trim();
      if (!notes) {
        // Synthesize standard log note
        const notesParts = [];
        if (isStatusChanged) notesParts.push(`Status updated from '${selectedComplaint.status}' to '${statusUpdate}'`);
        if (isAssignedChanged) {
          const staffUser = users.find(u => u._id === assignedToUpdate);
          notesParts.push(staffUser ? `Ticket assigned to ${staffUser.name}` : "Ticket unassigned");
        }
        if (isResolutionNotesChanged && statusUpdate === "Resolved") notesParts.push("Resolution notes added");
        notes = notesParts.join(", ") || "Ticket reviewed by admin.";
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/complaints/${selectedComplaint._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: statusUpdate,
          assignedTo: assignedToUpdate || null,
          resolutionNotes: statusUpdate === "Resolved" ? resolutionNotes.trim() : undefined,
          notes: notes
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Complaint ticket successfully updated!");
        setIsModalOpen(false);
        setSelectedComplaint(null);
        setTimelineNotes("");
        setResolutionNotes("");
        fetchAllData();
      } else {
        toast.error(data.error || "Failed to update complaint ticket.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating complaint ticket.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignToMe = async (complaint: any) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/complaints/${complaint._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: complaint.status === "Open" ? "Assigned" : complaint.status,
          assignedTo: currentUser._id,
          notes: `Ticket claimed by Admin: ${currentUser.name}.`
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Ticket successfully assigned to you!");
        fetchAllData();
      } else {
        toast.error(data.error || "Failed to assign ticket.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign ticket.");
    }
  };

  // Filter Logic
  const filteredComplaints = complaints.filter(c => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      c.title.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.complaintNumber.toLowerCase().includes(query) ||
      (c.resident?.firstName && c.resident.firstName.toLowerCase().includes(query)) ||
      (c.resident?.lastName && c.resident.lastName.toLowerCase().includes(query)) ||
      (c.resident?.email && c.resident.email.toLowerCase().includes(query));

    const matchesBuilding = filterBuilding === "All" || c.buildingId === filterBuilding;
    const matchesCategory = filterCategory === "All" || c.category === filterCategory;
    const matchesStatus = filterStatus === "All" || c.status === filterStatus;
    const matchesPriority = filterPriority === "All" || c.priority === filterPriority;

    return matchesSearch && matchesBuilding && matchesCategory && matchesStatus && matchesPriority;
  });

  // Calculations for stats widgets
  const totalTickets = complaints.length;
  const activeTickets = complaints.filter(c => c.status !== "Closed" && c.status !== "Resolved").length;
  const unresolvedEmergency = complaints.filter(c => c.priority === "Emergency" && c.status !== "Resolved" && c.status !== "Closed").length;
  const resolvedTickets = complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length;

  const getPriorityBadgeColor = (p: ComplaintPriority) => {
    switch (p) {
      case "Low": return "bg-green-50 text-green-700 border-green-100";
      case "Medium": return "bg-blue-50 text-blue-700 border-blue-100";
      case "High": return "bg-orange-50 text-orange-700 border-orange-100";
      case "Emergency": return "bg-red-50 text-red-700 border-red-150 animate-pulse";
      default: return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  const getStatusBadgeColor = (s: ComplaintStatus) => {
    switch (s) {
      case "Open": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Assigned": return "bg-blue-50 text-blue-700 border-blue-200";
      case "In Progress": return "bg-sky-50 text-sky-700 border-sky-200";
      case "Resolved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Closed": return "bg-gray-100 text-gray-600 border-gray-200";
      case "Reopened": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div id="complaints-review-container" className="space-y-6 max-w-7xl mx-auto px-4 py-2">
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-slate-800" />
            Complaint Tickets Review
          </h1>
          <p className="text-sm text-gray-500 font-sans">
            Oversee, assign, escalate, and resolve citizen and resident complaints.
          </p>
        </div>
        <button
          onClick={fetchAllData}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Registry
        </button>
      </div>

      {/* Admin stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">Total Tickets Raised</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800 font-mono">{totalTickets}</span>
            <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
              <FileText className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider font-sans">Pending / Active</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 font-mono">{activeTickets}</span>
            <span className="p-1.5 bg-amber-50 rounded-lg text-amber-500">
              <Clock className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-red-500 uppercase tracking-wider font-sans">Unresolved Emergency</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600 font-mono">{unresolvedEmergency}</span>
            <span className={`p-1.5 bg-red-50 rounded-lg text-red-500 ${unresolvedEmergency > 0 ? "animate-pulse" : ""}`}>
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider font-sans">Resolved / Closed</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 font-mono">{resolvedTickets}</span>
            <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
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
              placeholder="Search by ID, title, description, or complainant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-sans"
            />
          </div>

          {/* Quick Filter Selects */}
          <div className="flex flex-wrap gap-2">
            {/* Building Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Building:</span>
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="All">All Buildings</option>
                {buildings.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Priority:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 font-semibold font-sans">Loading complaint registry database...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
            <div className="p-4 bg-slate-50 rounded-full text-slate-400">
              <MessageSquare className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-sans font-bold text-slate-800">No Complaints Registered</h3>
              <p className="text-xs text-gray-500 font-sans leading-relaxed">
                {searchQuery || filterBuilding !== "All" || filterCategory !== "All" || filterStatus !== "All" || filterPriority !== "All"
                  ? "No results matching your filters. Try widening your criteria."
                  : "Excellent! There are no complaints registered in this society currently."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-150 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Raised By (Resident)</th>
                  <th className="px-6 py-4">Issue details</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assignee</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm text-gray-700 font-sans">
                {filteredComplaints.map((c) => {
                  const complainantName = c.resident 
                    ? `${c.resident.firstName} ${c.resident.lastName}`
                    : "Unknown Resident";
                  
                  const buildingName = c.building?.name || "Bldg";
                  const flatNumber = c.flat?.flatNumber || "Flat";

                  return (
                    <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                      {/* Ticket id */}
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-800">
                          {c.complaintNumber}
                        </span>
                      </td>

                      {/* Complainant Info */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">{complainantName}</span>
                          <span className="text-[10px] text-gray-500 mt-0.5">{buildingName} - Flat {flatNumber}</span>
                          {c.resident?.mobile && (
                            <span className="text-[10px] text-gray-400 mt-0.5">{c.resident.mobile}</span>
                          )}
                        </div>
                      </td>

                      {/* Issue Details */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs truncate">{c.category}</span>
                          <span className="font-medium text-slate-900 text-xs truncate mt-0.5">{c.title}</span>
                          <span className="text-[10px] text-gray-400 truncate mt-0.5">{formatDate(c.createdAt)}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadgeColor(c.priority)}`}>
                          {c.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeColor(c.status)}`}>
                          {c.status}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="px-6 py-4">
                        {c.assignedToUser ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800">
                            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                            <span className="font-semibold">{c.assignedToUser.name}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAssignToMe(c)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-900 bg-slate-50 hover:bg-slate-200 border border-gray-250 px-2 py-1 rounded-lg transition-all"
                          >
                            <UserCheck className="w-3 h-3" />
                            Claim Ticket
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:border-slate-800 hover:bg-slate-900 hover:text-white transition-all text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Complaint Management Panel */}
      {isModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:flex-row max-h-[90vh]">
            {/* Left Column: Complaint Details (2/5 size) */}
            <div className="md:w-[45%] bg-slate-50 p-6 border-b md:border-b-0 md:border-r border-gray-150 overflow-y-auto space-y-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-200 px-2.5 py-1 rounded text-slate-800">
                  {selectedComplaint.complaintNumber}
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeColor(selectedComplaint.status)}`}>
                  {selectedComplaint.status}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-sans">{selectedComplaint.title}</h3>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadgeColor(selectedComplaint.priority)}`}>
                  {selectedComplaint.priority} Priority
                </span>
              </div>

              <div className="space-y-1 bg-white p-4 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Complainant Description</span>
                <p className="text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Resident details card */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Resident Information</span>
                <div className="space-y-2 text-xs font-sans">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <strong className="text-slate-800">
                      {selectedComplaint.resident 
                        ? `${selectedComplaint.resident.firstName} ${selectedComplaint.resident.lastName}`
                        : "Unknown Resident"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Location:</span>
                    <strong className="text-slate-800">
                      {selectedComplaint.building?.name || "Bldg"} - Flat {selectedComplaint.flat?.flatNumber || "Flat"}
                    </strong>
                  </div>
                  {selectedComplaint.resident?.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <strong className="text-slate-800">{selectedComplaint.resident.email}</strong>
                    </div>
                  )}
                  {selectedComplaint.resident?.mobile && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mobile:</span>
                      <strong className="text-slate-800">{selectedComplaint.resident.mobile}</strong>
                    </div>
                  )}
                </div>
              </div>

              {selectedComplaint.resolutionNotes && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block font-sans">Resolution notes logged:</span>
                  <p className="text-xs text-emerald-900 font-sans whitespace-pre-line">{selectedComplaint.resolutionNotes}</p>
                </div>
              )}
            </div>

            {/* Right Column: Interactive Admin Actions and Timeline (3/5 size) */}
            <div className="md:w-[55%] flex flex-col max-h-full">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-1.5">
                  <SlidersHorizontal className="w-5 h-5 text-slate-600" />
                  Ticket Management Desk
                </h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedComplaint(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Form & Timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Form */}
                <form onSubmit={handleSaveManagementChanges} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                        Update Ticket Status
                      </label>
                      <select
                        value={statusUpdate}
                        onChange={(e) => setStatusUpdate(e.target.value as ComplaintStatus)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition-all font-semibold text-slate-800"
                      >
                        <option value="Open">Open</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                        <option value="Reopened">Reopened</option>
                      </select>
                    </div>

                    {/* Staff Assignee Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                        Assign Staff / Technician
                      </label>
                      <select
                        value={assignedToUpdate}
                        onChange={(e) => setAssignedToUpdate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition-all font-semibold text-slate-800"
                      >
                        <option value="">Unassigned</option>
                        {users.filter(u => u.role === "Admin" || u.role === "SuperAdmin" || u.role === "Staff").map(u => (
                          <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resolution Notes (Conditionally visible when Resolved is selected) */}
                  {statusUpdate === "Resolved" && (
                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-150">
                      <label className="text-[10px] font-bold text-emerald-800 block uppercase tracking-wider">
                        Resolution Remarks <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Log detailed notes on how this issue was fixed (e.g., plumbing seal replaced, lift board repaired). These will be visible to the resident."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 transition-all resize-none font-sans"
                      />
                    </div>
                  )}

                  {/* Operational internal timeline note */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">
                      Add Progress Note / Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional. Add detailed timeline notes for this specific action (e.g., PLumber will visit on Friday between 10am-12pm). Left empty, a generic note will be generated."
                      value={timelineNotes}
                      onChange={(e) => setTimelineNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all resize-none font-sans"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                    >
                      {isUpdating ? "Saving updates..." : "Commit Action"}
                    </button>
                  </div>
                </form>

                {/* Vertical Interactive Timeline History */}
                <div className="border-t border-gray-150 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-slate-500" />
                    Interactive Ticket Timeline History Log
                  </h4>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-150">
                    {selectedComplaint.timeline?.map((item: any, idx: number) => (
                      <div key={idx} className="relative space-y-1">
                        {/* Timeline dot */}
                        <span className={`absolute -left-[20.5px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white transition-all ${
                          item.status === "Resolved" || item.status === "Closed"
                            ? "border-emerald-500"
                            : "border-slate-500"
                        }`} />
                        <div className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-0.5 rounded font-bold border ${getStatusBadgeColor(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="text-gray-400 font-sans font-medium">{formatDate(item.date)}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-sans mt-1">{item.notes}</p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-sans mt-1">
                          <User className="w-3 h-3" />
                          <span>Updated by: <strong className="text-gray-500">{item.updatedBy}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
