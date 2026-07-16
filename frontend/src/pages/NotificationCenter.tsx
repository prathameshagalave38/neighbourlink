import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { useNavigate } from "react-router-dom";
import { 
  BellRing, 
  Trash2, 
  CheckCircle, 
  Check, 
  ShieldAlert, 
  UserCheck, 
  CreditCard, 
  AlertTriangle, 
  ArrowRight,
  Clock,
  X,
  MailOpen
} from "lucide-react";

interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: "Notice" | "Visitor" | "Complaint" | "Maintenance";
  priority: "Low" | "Medium" | "High" | "Emergency";
  status: "Unread" | "Read";
  relatedModule: string;
  relatedId: string;
  createdAt: string;
  readAt: string | null;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | "Unread" | "Read">("All");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("nl_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        setError(data.error || "Failed to load notifications.");
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
      setError("Failed to reach server. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("nl_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        // Update state locally for instant feedback
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, status: "Read" as const, readAt: new Date().toISOString() } : n)
        );
      }
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("nl_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/notifications/read-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, status: "Read" as const, readAt: new Date().toISOString() })));
      }
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const token = localStorage.getItem("nl_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm("Are you sure you want to clear your entire notification inbox?")) return;

    try {
      const token = localStorage.getItem("nl_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/v1/society-management/notifications`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Clear notifications error:", err);
    }
  };

  const handleActionNavigation = (notification: Notification) => {
    // Contextually navigate based on role and related module
    const role = user?.role;
    
    // Mark as read first if unread
    if (notification.status === "Unread") {
      markAsRead(notification._id);
    }

    if (notification.relatedModule === "Notice") {
      navigate("/notices");
      return;
    }

    if (notification.relatedModule === "Visitor") {
      if (role === "Resident") {
        navigate("/resident/visitors");
      } else if (role === "Security") {
        navigate("/security/visitors");
      }
      return;
    }

    if (notification.relatedModule === "Complaint") {
      if (role === "Admin" || role === "SuperAdmin") {
        navigate("/admin/complaints");
      } else {
        navigate("/resident/complaints");
      }
      return;
    }

    if (notification.relatedModule === "MaintenanceBill") {
      if (role === "Admin" || role === "SuperAdmin") {
        navigate("/admin/billing");
      } else {
        navigate("/resident/bills");
      }
      return;
    }
  };

  // Helper for type icons
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "Notice":
        return <BellRing className="w-5 h-5 text-indigo-600" />;
      case "Visitor":
        return <UserCheck className="w-5 h-5 text-emerald-600" />;
      case "Complaint":
        return <ShieldAlert className="w-5 h-5 text-amber-600" />;
      case "Maintenance":
        return <CreditCard className="w-5 h-5 text-rose-600" />;
      default:
        return <BellRing className="w-5 h-5 text-gray-500" />;
    }
  };

  // Helper for priority color borders
  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case "Emergency":
        return "border-l-4 border-l-rose-500 bg-rose-50/20";
      case "High":
        return "border-l-4 border-l-amber-500";
      case "Medium":
        return "border-l-4 border-l-indigo-400";
      default:
        return "border-l-4 border-l-gray-300";
    }
  };

  // Dynamic relative time formatter
  const getRelativeTime = (isoString: string) => {
    try {
      const past = new Date(isoString).getTime();
      const now = new Date().getTime();
      const diffMs = now - past;
      
      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60) return "just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days === 1) return "yesterday";
      return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) {
      return "some time ago";
    }
  };

  // Filter logic
  const filteredNotifications = notifications.filter(notif => {
    if (statusFilter === "Unread") return notif.status === "Unread";
    if (statusFilter === "Read") return notif.status === "Read";
    return true;
  });

  const unreadCount = notifications.filter(n => n.status === "Unread").length;

  return (
    <div id="notification-center-wrapper" className="space-y-6">
      {/* Title & Action Buttons Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="notification-center-title" className="text-2xl font-bold font-sans tracking-tight text-gray-900 flex items-center gap-2">
            <span>Notification Center</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800 animate-pulse">
                {unreadCount} New
              </span>
            )}
          </h1>
          <p id="notification-center-subtitle" className="text-sm text-gray-500 font-sans mt-0.5">
            View real-time alerts, check-in updates, ticket assignments, and billing invoices.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              id="mark-all-read-btn"
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-gray-250 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              id="clear-all-notif-btn"
              onClick={clearAllNotifications}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Inbox</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Filter Row */}
      <div id="notification-tabs-bar" className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg max-w-sm">
        {(["All", "Unread", "Read"] as const).map((filter) => {
          const isActive = statusFilter === filter;
          return (
            <button
              key={filter}
              id={`tab-notif-${filter.toLowerCase()}`}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Main Inbox content */}
      {loading ? (
        <div id="notifications-loading" className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-xl">
          <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500 mt-4 font-sans font-medium">Synchronizing notifications...</span>
        </div>
      ) : error ? (
        <div id="notifications-error" className="flex flex-col items-center justify-center p-12 bg-rose-50 border border-rose-100 rounded-xl text-center">
          <AlertTriangle className="w-8 h-8 text-rose-600 mb-2" />
          <h3 className="text-sm font-bold text-rose-800 font-sans">Sync Error</h3>
          <p className="text-xs text-rose-600 mt-1 font-sans">{error}</p>
          <button
            onClick={fetchNotifications}
            className="mt-4 px-4 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition-colors cursor-pointer"
          >
            Reconnect
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div id="notifications-empty" className="flex flex-col items-center justify-center p-16 bg-white border border-gray-150 rounded-xl text-center">
          <MailOpen className="w-10 h-10 text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800 font-sans">Your Inbox is Clear</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs font-sans">
            {statusFilter === "All" 
              ? "You do not have any notification alerts in your account feed at the moment."
              : `You do not have any ${statusFilter.toLowerCase()} alerts.`}
          </p>
        </div>
      ) : (
        /* Alerts Stack List */
        <div id="notifications-alerts-stack" className="space-y-3">
          {filteredNotifications.map((notif) => {
            const isUnread = notif.status === "Unread";
            return (
              <div
                key={notif._id}
                id={`notification-card-${notif._id}`}
                className={`group flex flex-col sm:flex-row items-start justify-between p-4 bg-white border border-gray-200 rounded-xl transition-all hover:bg-gray-50/50 ${
                  isUnread ? "bg-slate-50/40 ring-1 ring-slate-100" : ""
                } ${getPriorityColors(notif.priority)}`}
              >
                <div className="flex gap-3.5 items-start">
                  {/* Round icon indicator representing the Category */}
                  <div className={`p-2.5 rounded-xl bg-white border border-gray-150 shadow-xs flex-shrink-0`}>
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Informational elements */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h4 className={`text-sm font-bold font-sans tracking-tight text-gray-900 ${
                        isUnread ? "font-extrabold" : ""
                      }`}>
                        {notif.title}
                      </h4>
                      {isUnread && (
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                      )}
                      
                      {notif.priority === "Emergency" && (
                        <span className="px-1.5 py-0.5 text-[8px] font-extrabold text-white bg-rose-600 uppercase tracking-wider rounded">
                          Emergency
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 font-sans leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-2.5 text-[10px] text-gray-400 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{getRelativeTime(notif.createdAt)}</span>
                      </span>
                      <span>•</span>
                      <span className="uppercase tracking-wider text-[9px]">{notif.type} Category</span>
                    </div>
                  </div>
                </div>

                {/* Right hand Side action triggers */}
                <div className="flex items-center gap-2.5 mt-3 sm:mt-0 self-end sm:self-center">
                  {/* Dynamic Module Nav Link */}
                  {notif.relatedModule && (
                    <button
                      id={`btn-nav-related-${notif._id}`}
                      onClick={() => handleActionNavigation(notif)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-800 hover:text-white bg-slate-100 hover:bg-slate-900 border border-slate-200 hover:border-slate-900 rounded-md transition-all cursor-pointer"
                    >
                      <span>Action Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {isUnread && (
                    <button
                      id={`btn-read-${notif._id}`}
                      onClick={() => markAsRead(notif._id)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-lg transition-all cursor-pointer"
                      title="Mark as Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    id={`btn-delete-${notif._id}`}
                    onClick={() => deleteNotification(notif._id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all cursor-pointer"
                    title="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
