import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { Toaster } from "react-hot-toast";

// Layout components
import { DashboardLayout } from "./components/layout/DashboardLayout.tsx";
import { PlaceholderPage } from "./components/common/PlaceholderPage.tsx";

// Auth modules
import { Login } from "./modules/auth/Login.tsx";
import { Register } from "./modules/auth/Register.tsx";

// Dashboard modules
import { AdminDashboard } from "./modules/dashboard/AdminDashboard.tsx";
import { ResidentDashboard } from "./modules/dashboard/ResidentDashboard.tsx";
import { SecurityDashboard } from "./modules/dashboard/SecurityDashboard.tsx";

// Admin Phase 3 modules
import { SocietySetup } from "./modules/admin/SocietySetup.tsx";
import { BuildingsSetup } from "./modules/admin/BuildingsSetup.tsx";
import { FlatsSetup } from "./modules/admin/FlatsSetup.tsx";

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div id="route-loader" className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-gray-500 font-sans">Connecting to NeighbourLink...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard if role not allowed
    if (user.role === "Admin" || user.role === "SuperAdmin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === "Resident") {
      return <Navigate to="/resident/dashboard" replace />;
    } else {
      return <Navigate to="/security/dashboard" replace />;
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Root route dispatcher matching user roles to their dashboard
const RootDispatcher: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "Admin" || user.role === "SuperAdmin") {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user.role === "Resident") {
    return <Navigate to="/resident/dashboard" replace />;
  } else if (user.role === "Security") {
    return <Navigate to="/security/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global Notification Banners */}
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Root Dispatcher */}
          <Route path="/" element={<RootDispatcher />} />

          {/* Admin Protected Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/society" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <SocietySetup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/buildings" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <BuildingsSetup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/flats" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <FlatsSetup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/residents" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <PlaceholderPage title="Residents Setup" phaseNeeded={4} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/complaints" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <PlaceholderPage title="Complaint Tickets Review" phaseNeeded={5} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/maintenance-plans" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <PlaceholderPage title="Maintenance Plans" phaseNeeded={7} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/billing" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <PlaceholderPage title="Society Billing Generator" phaseNeeded={7} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/parking" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin"]}>
                <PlaceholderPage title="Parking Allocations" phaseNeeded={6} />
              </ProtectedRoute>
            } 
          />

          {/* Resident Protected Routes */}
          <Route 
            path="/resident/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <ResidentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resident/profile" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <PlaceholderPage title="My Flat Info" phaseNeeded={4} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resident/visitors" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <PlaceholderPage title="My Expected Visitors" phaseNeeded={6} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resident/complaints" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <PlaceholderPage title="My Raised Complaints" phaseNeeded={5} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resident/bills" 
            element={
              <ProtectedRoute allowedRoles={["Resident"]}>
                <PlaceholderPage title="My Maintenance Bills" phaseNeeded={7} />
              </ProtectedRoute>
            } 
          />

          {/* Security Guard Protected Routes */}
          <Route 
            path="/security/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["Security"]}>
                <SecurityDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/security/visitors" 
            element={
              <ProtectedRoute allowedRoles={["Security"]}>
                <PlaceholderPage title="Security Visitor Gate Logs" phaseNeeded={6} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/security/parking" 
            element={
              <ProtectedRoute allowedRoles={["Security"]}>
                <PlaceholderPage title="Gate Vehicle Verification" phaseNeeded={6} />
              </ProtectedRoute>
            } 
          />

          {/* Shared Protected Routes */}
          <Route 
            path="/notices" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Resident", "Security"]}>
                <PlaceholderPage title="Society Notice Board" phaseNeeded={8} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute allowedRoles={["Admin", "SuperAdmin", "Resident", "Security"]}>
                <PlaceholderPage title="In-App Notification Alerts" phaseNeeded={8} />
              </ProtectedRoute>
            } 
          />

          {/* Fallback Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
