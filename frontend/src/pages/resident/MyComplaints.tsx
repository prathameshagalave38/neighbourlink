import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus } from "../../types/index.ts";
import { toast } from "react-hot-toast";
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  MessageSquare, 
  Calendar, 
  User, 
  ArrowLeft, 
  X,
  RefreshCw,
  Eye,
  Activity,
  FileText
} from "lucide-react";

export const MyComplaints: React.FC = () => {
  const { token, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");

  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  // New complaint form state
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<ComplaintCategory>("Electrical");
  const [priority, setPriority] = useState<ComplaintPriority>("Medium");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Interaction notes (for close / reopen)
  const [interactionNotes, setInteractionNotes] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

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

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/society-management/complaints/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setComplaints(data.complaints || []);
      } else {
        toast.error(data.error || "Failed to load complaints.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchComplaints();
    }
  }, [token]);

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/society-management/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          category,
          priority
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Complaint raised successfully!");
        setTitle("");
        setDescription("");
        setCategory("Electrical");
        setPriority("Medium");
        setIsNewModalOpen(false);
        fetchComplaints();
      } else {
        toast.error(data.error || "Failed to submit complaint.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: ComplaintStatus) => {
    if (!selectedComplaint) return;
    
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/v1/society-management/complaints/${selectedComplaint._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          notes: interactionNotes.trim() || `Status updated to ${newStatus} by resident.`
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Complaint marked as ${newStatus}!`);
        setInteractionNotes("");
        setIsDetailsModalOpen(false);
        setSelectedComplaint(null);
        fetchComplaints();
      } else {
        toast.error(data.error || "Failed to update complaint status.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating ticket status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filter complaints based on user search and filters
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complaintNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || c.status === selectedStatus;
    const matchesPriority = selectedPriority === "All" || c.priority === selectedPriority;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  // Calculate quick stats
  const totalCount = complaints.length;
  const openCount = complaints.filter(c => c.status === "Open" || c.status === "Reopened" || c.status === "In Progress" || c.status === "Assigned").length;
  const resolvedCount = complaints.filter(c => c.status === "Resolved").length;
  const closedCount = complaints.filter(c => c.status === "Closed").length;

  const getPriorityBadgeColor = (p: ComplaintPriority) => {
    switch (p) {
      case "Low": return "bg-green-50 text-green-700 border-green-100";
      case "Medium": return "bg-blue-50 text-blue-700 border-blue-100";
      case "High": return "bg-orange-50 text-orange-700 border-orange-100";
      case "Emergency": return "bg-red-50 text-red-700 border-red-100 animate-pulse";
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
    <div id="my-complaints-container" className="space-y-6 max-w-7xl mx-auto px-4 py-2">
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-slate-700" />
            My Raised Complaints
          </h1>
          <p className="text-sm text-gray-500 font-sans">
            File maintenance requests, report common area issues, and track resolutions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchComplaints}
            className="p-2.5 text-gray-500 hover:text-slate-800 border border-gray-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            title="Refresh list"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Raise Complaint
          </button>
        </div>
      </div>

      {/* Quick Stats section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-400 font-sans tracking-wide uppercase">Total Raised</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-800 font-mono">{totalCount}</span>
            <span className="p-1.5 bg-slate-50 rounded-lg text-slate-600">
              <FileText className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-amber-500 font-sans tracking-wide uppercase">Active Tickets</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 font-mono">{openCount}</span>
            <span className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-emerald-500 font-sans tracking-wide uppercase">Resolved</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 font-mono">{resolvedCount}</span>
            <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-gray-500 font-sans tracking-wide uppercase">Closed</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-700 font-mono">{closedCount}</span>
            <span className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Actions section */}
      <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ticket number, title, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-sans"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
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
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
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
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
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

      {/* List / Table Section */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 font-semibold font-sans">Retrieving your complaint history...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
            <div className="p-4 bg-slate-50 rounded-full text-slate-400">
              <MessageSquare className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-base font-sans font-bold text-slate-800">No Complaints Found</h3>
              <p className="text-xs text-gray-500 font-sans leading-relaxed">
                {searchQuery || selectedCategory !== "All" || selectedStatus !== "All" || selectedPriority !== "All"
                  ? "We couldn't find any complaint matching your filters. Try clearing some selections."
                  : "You haven't registered any complaint tickets yet. If you have an issue with electricity, plumbing, water, or safety, click 'Raise Complaint' above."}
              </p>
            </div>
            {(searchQuery || selectedCategory !== "All" || selectedStatus !== "All" || selectedPriority !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedStatus("All");
                  setSelectedPriority("All");
                }}
                className="text-xs font-bold text-slate-900 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-150 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                  <th className="px-6 py-4">Ticket ID</th>
                  <th className="px-6 py-4">Category / Date</th>
                  <th className="px-6 py-4">Complaint Title</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm text-gray-700">
                {filteredComplaints.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-800">
                        {c.complaintNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">{c.category}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">{formatDate(c.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 text-sm truncate">{c.title}</span>
                        <span className="text-xs text-gray-400 truncate mt-0.5">{c.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadgeColor(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedComplaint(c);
                          setIsDetailsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:border-slate-800 hover:bg-slate-900 hover:text-white transition-all text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Complaint */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-700" />
                Raise New Complaint Ticket
              </h2>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 block uppercase font-sans">
                  Complaint Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Water leakage in kitchen sink, lift button not working"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 block uppercase font-sans">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition-all"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 block uppercase font-sans">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition-all"
                  >
                    <option value="Low">Low (General convenience)</option>
                    <option value="Medium">Medium (Affects daily tasks)</option>
                    <option value="High">High (Urgent attention required)</option>
                    <option value="Emergency">Emergency (Immediate hazard)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 block uppercase font-sans">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please describe the issue in detail, specifying the exact location, symptoms, and since when this issue is occurring. This will help our maintenance staff solve it faster."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all resize-none font-sans"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-150 mt-4">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>Submit Ticket</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Details and Timeline */}
      {isDetailsModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-200 px-2 py-1 rounded text-slate-800">
                  {selectedComplaint.complaintNumber}
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeColor(selectedComplaint.status)}`}>
                  {selectedComplaint.status}
                </span>
              </div>
              <button 
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedComplaint(null);
                  setInteractionNotes("");
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Ticket Summary Card */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-slate-900 font-sans">{selectedComplaint.title}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadgeColor(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority} Priority
                  </span>
                </div>
                <p className="text-sm text-gray-600 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line font-sans leading-relaxed">
                  {selectedComplaint.description}
                </p>

                <div className="grid grid-cols-2 gap-4 text-xs font-sans text-gray-500 pt-2 border-t border-gray-100">
                  <div>
                    <span className="font-bold text-gray-400 block uppercase">Category</span>
                    <span className="text-slate-800 font-medium mt-0.5 block">{selectedComplaint.category}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-400 block uppercase">Raised On</span>
                    <span className="text-slate-800 font-medium mt-0.5 block">{formatDate(selectedComplaint.createdAt)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-400 block uppercase">Flat & Building</span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {selectedComplaint.building?.name || "Building"} - Flat {selectedComplaint.flat?.flatNumber || "Flat"}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-400 block uppercase">Assigned Technician / Staff</span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {selectedComplaint.assignedToUser ? (
                        <span className="text-slate-900 font-semibold">{selectedComplaint.assignedToUser.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Not Assigned Yet</span>
                      )}
                    </span>
                  </div>
                </div>

                {selectedComplaint.resolutionNotes && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block font-sans">Official Resolution Notes:</span>
                    <p className="text-sm text-emerald-900 font-sans whitespace-pre-line">{selectedComplaint.resolutionNotes}</p>
                  </div>
                )}
              </div>

              {/* Dynamic Status Log / Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-2 border-b border-gray-150 pb-2">
                  <Activity className="w-4 h-4 text-slate-500" />
                  Ticket Activity History & Timeline
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-150">
                  {selectedComplaint.timeline?.map((item: any, idx: number) => (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[20px] top-1 w-3 h-3 rounded-full border-2 bg-white transition-all ${
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
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-sans">
                        <User className="w-3 h-3" />
                        <span>Action by: <strong className="text-gray-500">{item.updatedBy}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resident Actions (Satisfied / Reopen) */}
              {selectedComplaint.status === "Resolved" && (
                <div className="border-t border-gray-150 pt-4 space-y-3">
                  <span className="text-xs font-bold text-slate-700 block font-sans">Are you satisfied with the resolution? Update ticket status:</span>
                  <div className="space-y-3">
                    <textarea
                      placeholder="Add any feedback, notes, or remarks here before closing or reopening..."
                      value={interactionNotes}
                      onChange={(e) => setInteractionNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all resize-none font-sans"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus("Closed")}
                        disabled={isUpdatingStatus}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Yes, Close Ticket
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus("Reopened")}
                        disabled={isUpdatingStatus}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        No, Reopen Ticket
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Resident Close Open Ticket Option */}
              {(selectedComplaint.status === "Open" || selectedComplaint.status === "Reopened") && (
                <div className="border-t border-gray-150 pt-4 flex justify-end">
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel/close this complaint ticket?")) {
                        handleUpdateStatus("Closed");
                      }
                    }}
                    disabled={isUpdatingStatus}
                    className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel and Close Ticket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
