import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { 
  Megaphone, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Clock, 
  X,
  FileText,
  BadgeAlert
} from "lucide-react";

interface Notice {
  _id: string;
  title: string;
  description: string;
  type: "General" | "Maintenance" | "Security" | "Emergency";
  status: "Draft" | "Published";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const NoticeBoard: React.FC = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"General" | "Maintenance" | "Security" | "Emergency">("General");
  const [formStatus, setFormStatus] = useState<"Draft" | "Published">("Draft");
  const [submitting, setSubmitting] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    emergency: 0,
    active: 0
  });

  const isAdmin = user?.role === "Admin" || user?.role === "SuperAdmin";

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("nl_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/notices`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices || []);
        calculateStats(data.notices || []);
      } else {
        setError(data.error || "Failed to load notices.");
      }
    } catch (err: any) {
      console.error("Fetch notices error:", err);
      setError("Failed to fetch notices due to a network connection issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const calculateStats = (list: Notice[]) => {
    const total = list.length;
    const emergency = list.filter(n => n.type === "Emergency" && n.status === "Published").length;
    const active = list.filter(n => n.status === "Published").length;
    setStats({ total, emergency, active });
  };

  const openCreateModal = () => {
    setEditingNotice(null);
    setFormTitle("");
    setFormDescription("");
    setFormType("General");
    setFormStatus("Published"); // Default to Published for fast flow
    setIsModalOpen(true);
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setFormTitle(notice.title);
    setFormDescription(notice.description);
    setFormType(notice.type);
    setFormStatus(notice.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("nl_token");
      const url = editingNotice 
        ? `/api/v1/society-management/notices/${editingNotice._id}`
        : "/api/v1/society-management/notices";
      const method = editingNotice ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          type: formType,
          status: formStatus
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchNotices();
      } else {
        alert(data.error || "Failed to save notice.");
      }
    } catch (err) {
      console.error("Save notice error:", err);
      alert("Something went wrong while saving the notice.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this announcement?")) return;

    try {
      const token = localStorage.getItem("nl_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/notices/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchNotices();
      } else {
        alert(data.error || "Failed to delete notice.");
      }
    } catch (err) {
      console.error("Delete notice error:", err);
      alert("Failed to delete announcement.");
    }
  };

  const togglePublishStatus = async (notice: Notice) => {
    try {
      const token = localStorage.getItem("nl_token");
      const newStatus = notice.status === "Published" ? "Draft" : "Published";
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/notices/${notice._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchNotices();
      } else {
        alert(data.error || "Failed to update notice status.");
      }
    } catch (err) {
      console.error("Toggle publish error:", err);
      alert("Failed to update announcement status.");
    }
  };

  // Filter and Search Logic
  const filteredNotices = notices.filter(notice => {
    const matchesSearch = 
      notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "All" || notice.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getNoticeBadgeColors = (type: string) => {
    switch (type) {
      case "Emergency":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Maintenance":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Security":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div id="society-notice-board-wrapper" className="space-y-6">
      {/* Upper Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 id="notice-board-title" className="text-2xl font-bold font-sans tracking-tight text-gray-900">
            Society Notice Board
          </h1>
          <p id="notice-board-subtitle" className="text-sm text-gray-500 font-sans mt-0.5">
            Important announcements, emergency alerts, and circulars for the residents.
          </p>
        </div>
        {isAdmin && (
          <button
            id="create-notice-btn"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Notice</span>
          </button>
        )}
      </div>

      {/* KPI Stats Widgets */}
      <div id="notice-stats-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-150 rounded-xl shadow-sm">
          <div className="p-3 rounded-lg bg-slate-100 text-slate-800">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-sans font-medium uppercase tracking-wider">Total Notices</span>
            <span className="text-xl font-bold font-sans text-gray-900 leading-tight">{stats.total}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white border border-gray-150 rounded-xl shadow-sm">
          <div className="p-3 rounded-lg bg-rose-50 text-rose-600">
            <BadgeAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-rose-500 block font-sans font-medium uppercase tracking-wider">Emergency Alerts</span>
            <span className="text-xl font-bold font-sans text-rose-700 leading-tight">{stats.emergency}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white border border-gray-150 rounded-xl shadow-sm">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-emerald-500 block font-sans font-medium uppercase tracking-wider">Active Published</span>
            <span className="text-xl font-bold font-sans text-emerald-700 leading-tight">{stats.active}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Section */}
      <div id="notices-filter-panel" className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
          <input
            id="notices-search-input"
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-250 hover:border-gray-300 focus:bg-white focus:outline-none rounded-lg font-sans transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {["All", "Emergency", "Maintenance", "Security", "General"].map((type) => (
            <button
              key={type}
              id={`filter-tab-${type.toLowerCase()}`}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                selectedType === type
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Loader/Empty States */}
      {loading ? (
        <div id="notice-loading-state" className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-xl">
          <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500 mt-4 font-sans font-medium">Fetching announcements, please wait...</span>
        </div>
      ) : error ? (
        <div id="notice-error-state" className="flex flex-col items-center justify-center p-12 bg-rose-50 border border-rose-200 rounded-xl text-center">
          <AlertTriangle className="w-8 h-8 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-rose-800 font-sans">Error Loading Notice Board</h3>
          <p className="text-xs text-rose-600 mt-1 font-sans">{error}</p>
          <button
            onClick={fetchNotices}
            className="mt-4 px-4 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition-colors cursor-pointer"
          >
            Retry Fetching
          </button>
        </div>
      ) : filteredNotices.length === 0 ? (
        <div id="notice-empty-state" className="flex flex-col items-center justify-center p-16 bg-white border border-gray-150 rounded-xl text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800 font-sans">No Announcements Found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm font-sans">
            There are currently no active circulars or notifications matching your filter selection.
          </p>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 text-xs font-bold text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Raise First Announcement
            </button>
          )}
        </div>
      ) : (
        /* Notices List Grid */
        <div id="notices-items-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNotices.map((notice) => {
            const isEmergency = notice.type === "Emergency";
            return (
              <div
                key={notice._id}
                id={`notice-card-${notice._id}`}
                className={`flex flex-col justify-between p-5 bg-white border rounded-2xl shadow-sm transition-all ${
                  isEmergency 
                    ? "border-rose-300 ring-1 ring-rose-200/50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  {/* Top line: Badges & Info */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getNoticeBadgeColors(notice.type)}`}>
                        {notice.type}
                      </span>
                      {isAdmin && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          notice.status === "Published" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {notice.status}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(notice.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>

                  {/* Title & Body Description */}
                  <h3 className={`text-base font-bold font-sans tracking-tight mb-2 ${
                    isEmergency ? "text-rose-900" : "text-gray-900"
                  }`}>
                    {notice.title}
                  </h3>
                  <p className="text-sm text-gray-600 font-sans leading-relaxed whitespace-pre-wrap">
                    {notice.description}
                  </p>
                </div>

                {/* Card Footer controls */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium font-sans">
                    <User className="w-3.5 h-3.5" />
                    <span>Posted by: <span className="font-semibold text-gray-600">{notice.createdBy}</span></span>
                  </div>

                  {/* Admin specific trigger actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-toggle-publish-${notice._id}`}
                        onClick={() => togglePublishStatus(notice)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-all cursor-pointer"
                        title={notice.status === "Published" ? "Revoke Publication" : "Publish Live"}
                      >
                        {notice.status === "Published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        id={`btn-edit-notice-${notice._id}`}
                        onClick={() => openEditModal(notice)}
                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-md transition-all cursor-pointer"
                        title="Edit Notice"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-notice-${notice._id}`}
                        onClick={() => handleDelete(notice._id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Elegant Overlay Form Modal Dialog */}
      {isModalOpen && (
        <div id="notice-form-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150">
              <h2 className="text-base font-bold font-sans text-gray-900">
                {editingNotice ? "Edit Announcement" : "Create New Notice"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Announcement Title</label>
                <input
                  id="form-notice-title"
                  type="text"
                  required
                  placeholder="e.g., Scheduled Water Supply Interruption"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-250 hover:border-gray-300 focus:bg-white focus:outline-none rounded-lg font-sans transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category Type</label>
                  <select
                    id="form-notice-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-250 hover:border-gray-300 focus:bg-white focus:outline-none rounded-lg font-sans transition-all cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Security">Security</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Publish Status</label>
                  <select
                    id="form-notice-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-250 hover:border-gray-300 focus:bg-white focus:outline-none rounded-lg font-sans transition-all cursor-pointer"
                  >
                    <option value="Published">Publish Immediately</option>
                    <option value="Draft">Save as Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description & Circular Details</label>
                <textarea
                  id="form-notice-description"
                  required
                  rows={5}
                  placeholder="Provide precise details, dates, contact persons, guidelines, etc."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-250 hover:border-gray-300 focus:bg-white focus:outline-none rounded-lg font-sans transition-all"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  <span>{editingNotice ? "Update Notice" : "Create Notice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
