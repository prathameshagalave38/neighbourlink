import React from "react";
import { Link } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  phaseNeeded: number;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, phaseNeeded }) => {
  return (
    <div id="placeholder-page" className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white border border-gray-150 rounded-xl">
      <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
        <Construction className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">{title} Module</h2>
      <p className="text-sm text-gray-500 max-w-md mt-2">
        This structural view has been safely registered in <span className="font-semibold text-gray-800">Phase 1: Project Foundation</span>. Detailed form controls and API integrations will be fully completed in <span className="font-semibold text-gray-800">Phase {phaseNeeded}</span> of the roadmap.
      </p>
      
      <Link 
        to="/" 
        className="flex items-center gap-2 mt-6 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>
    </div>
  );
};
