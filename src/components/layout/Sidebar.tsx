import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { 
  Home, 
  Building2, 
  Users, 
  FileText, 
  UserCheck, 
  ShieldAlert, 
  CreditCard, 
  BellRing, 
  Megaphone, 
  Car, 
  Settings,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

interface SidebarItem {
  name: string;
  path: string;
  icon: any;
  roles: string[];
}

const navigationItems: SidebarItem[] = [
  // Admin & SuperAdmin items
  { name: "Admin Dashboard", path: "/admin/dashboard", icon: Home, roles: ["Admin", "SuperAdmin"] },
  { name: "Society Setup", path: "/admin/society", icon: Settings, roles: ["Admin", "SuperAdmin"] },
  { name: "Buildings Setup", path: "/admin/buildings", icon: Building2, roles: ["Admin", "SuperAdmin"] },
  { name: "Flats Setup", path: "/admin/flats", icon: ChevronRight, roles: ["Admin", "SuperAdmin"] },
  { name: "Residents Setup", path: "/admin/residents", icon: Users, roles: ["Admin", "SuperAdmin"] },
  { name: "Review Tickets", path: "/admin/complaints", icon: ShieldAlert, roles: ["Admin", "SuperAdmin"] },
  { name: "Maintenance Plans", path: "/admin/maintenance-plans", icon: FileText, roles: ["Admin", "SuperAdmin"] },
  { name: "Generate Billing", path: "/admin/billing", icon: CreditCard, roles: ["Admin", "SuperAdmin"] },
  { name: "Parking Allocations", path: "/admin/parking", icon: Car, roles: ["Admin", "SuperAdmin"] },
  
  // Resident items
  { name: "My Dashboard", path: "/resident/dashboard", icon: Home, roles: ["Resident"] },
  { name: "My Flat Info", path: "/resident/profile", icon: Users, roles: ["Resident"] },
  { name: "My Visitors", path: "/resident/visitors", icon: UserCheck, roles: ["Resident"] },
  { name: "My Complaints", path: "/resident/complaints", icon: ShieldAlert, roles: ["Resident"] },
  { name: "Maintenance Bills", path: "/resident/bills", icon: CreditCard, roles: ["Resident"] },
  
  // Security Guard items
  { name: "Gate Dashboard", path: "/security/dashboard", icon: ShieldCheck, roles: ["Security"] },
  { name: "Visitor Log", path: "/security/visitors", icon: UserCheck, roles: ["Security"] },
  { name: "Vehicle Verification", path: "/security/parking", icon: Car, roles: ["Security"] },
  
  // Shared features
  { name: "Notice Board", path: "/notices", icon: Megaphone, roles: ["Admin", "SuperAdmin", "Resident", "Security"] },
  { name: "In-App Alerts", path: "/notifications", icon: BellRing, roles: ["Admin", "SuperAdmin", "Resident", "Security"] }
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Filter items matching the current user role
  const allowedItems = navigationItems.filter(item => item.roles.includes(user.role));

  return (
    <aside id="app-sidebar" className="fixed inset-y-0 left-0 z-20 flex-col w-64 border-r border-gray-200 bg-white pt-16 lg:flex">
      <div className="flex flex-col flex-1 px-4 py-6 overflow-y-auto gap-1">
        {allowedItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              id={`nav-link-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-500"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-gray-150 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-xs font-semibold text-gray-900 truncate">{user.name}</h4>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{user.role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
