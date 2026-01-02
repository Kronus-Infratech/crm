"use client";

import Card from "@/src/components/ui/Card";
import { HiTrendingUp, HiTrendingDown, HiUsers, HiCurrencyRupee, HiXCircle, HiCheckCircle } from "react-icons/hi";
import { formatNumber } from "@/src/utils/formatters";

export default function EmployeePerformance({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Agent Performance Matrix</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Tracking real-time conversion and loss efficiency</p>
        </div>
        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">Team Analytics</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.map((user, index) => (
          <Card key={user.userId} className="overflow-hidden hover:shadow-2xl hover:bg-gray-50/30 transition-all border-gray-100 group relative">
            <div className="flex flex-col lg:flex-row items-stretch">
              {/* User Identity Section */}
              <div className="w-full lg:w-1/3 p-6 bg-gray-50/50 border-b lg:border-b-0 lg:border-r border-gray-100 flex items-center gap-4">
                {/* <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">
                  {user.name[0].toUpperCase()}
                </div> */}
                <div className="min-w-0">
                  <p className="font-black text-gray-900 text-2xl truncate leading-tight">{user.name}</p>
                  {/* <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">{user.designation}</p> */}
                </div>
              </div>

              {/* Metrics Section */}
              <div className="w-full lg:w-3/4 p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 items-center">
                <div className="space-y-1">
                  <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    {/* <HiUsers className="text-gray-400" /> assigned */}
                    Assigned
                  </p>
                  <p className="text-xl font-black text-gray-900">{user.totalLeads}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-1.5 text-emerald-600">
                    {/* <HiCheckCircle /> Win Rate */}
                    Win Rate
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-black text-gray-900">{user.closeRate}%</p>
                    {parseFloat(user.closeRate) > 20 && <HiTrendingUp className="text-emerald-500" />}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-1.5 text-red-500">
                    {/* <HiXCircle /> Lose Rate */}
                    Lose Rate
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-black text-gray-900">{user.loseRate}%</p>
                    {parseFloat(user.loseRate) > 30 && <HiTrendingDown className="text-red-500" />}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    {/* <HiCurrencyRupee className="text-indigo-500" /> */} 
                    Pipeline
                  </p>
                  <p className="text-xl font-black text-gray-900 leading-none">₹{formatNumber(user.pipelineValue)}</p>
                </div>

                {/* <div className="space-y-1 hidden md:block">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth</p>
                  <div className="flex gap-1 h-3 items-end">
                      <div className="w-1.5 bg-gray-100 h-1/3 rounded-full"/>
                      <div className="w-1.5 bg-gray-100 h-2/3 rounded-full"/>
                      <div className="w-1.5 bg-indigo-500 h-full rounded-full"/>
                      <div className="w-1.5 bg-indigo-500 h-1/2 rounded-full"/>
                  </div>
                </div> */}
              </div>
            </div>
            
            {/* Efficiency Visualizer */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-50 overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${parseFloat(user.closeRate) > parseFloat(user.loseRate) ? 'bg-emerald-500' : 'bg-red-500 '}`} 
                style={{ width: `${Math.max(10, Math.min(100, (parseFloat(user.closeRate) / (parseFloat(user.closeRate) + parseFloat(user.loseRate) + 1)) * 100))}%` }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
