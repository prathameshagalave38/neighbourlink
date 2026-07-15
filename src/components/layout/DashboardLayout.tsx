import React from "react";
import { Navbar } from "./Navbar.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { motion } from "motion/react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div id="dashboard-layout-container" className="min-h-screen bg-gray-50 font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Layout Body */}
      <div className="flex pt-16">
        {/* Responsive Left Sidebar */}
        <Sidebar />

        {/* Content Container Area */}
        <main 
          id="main-viewport" 
          className="flex-1 min-h-[calc(100vh-4rem)] p-6 transition-all duration-300 lg:pl-64"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mx-auto max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
