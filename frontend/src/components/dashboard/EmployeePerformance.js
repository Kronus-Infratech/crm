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
          <h3 className="text-xl font-black text-brand-dark-gray uppercase tracking-tight">Agent Performance Matrix</h3>
          <p className="text-[10px] font-bold text-brand-spanish-gray uppercase tracking-widest border-l-2 border-[#009688] pl-2">Tracking real-time conversion and loss efficiency</p>
        </div>
        <span className="text-[10px] font-black text-[#009688] bg-[#009688]/10 px-3 py-1 rounded-lg border border-[#009688]/20">Team Analytics</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.map((user, index) => (
          <Card key={user.userId} className="overflow-hidden shadow-lg hover:shadow-2xl hover:bg-gray-50/30 transition-all border-gray-100 group relative p-2">
            <div className="flex flex-col lg:flex-row items-stretch">
              {/* User Identity Section */}
              <div className="w-full lg:w-1/5 p-4 bg-gray-50/50 border-b lg:border-b-0 lg:border-r border-gray-100 flex items-center gap-4">
                {/* <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">
                  {user.name[0].toUpperCase()}
                </div> */}
                <div className="min-w-0">
                  <p className="font-black text-brand-dark-gray text-lg leading-tight">{user.name}</p>
                </div>
              </div>

              {/* Metrics Section */}
              <div className="w-full lg:w-4/5 p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 items-center">
                <div className="space-y-1">
                  <p className="text-[12px] font-black text-brand-spanish-gray uppercase tracking-widest flex items-center gap-1.5">
                    Assigned
                  </p>
                  <p className="text-lg font-black text-brand-dark-gray">{user.totalLeads}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-1.5 text-[#8DC63F]">
                    Win Rate
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-brand-dark-gray">{user.closeRate}%</p>
                    {parseFloat(user.closeRate) > 20 && <HiTrendingUp className="text-[#8DC63F]" />}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-1.5 text-red-500">
                    Lose Rate
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-brand-dark-gray">{user.loseRate}%</p>
                    {parseFloat(user.loseRate) > 30 && <HiTrendingDown className="text-red-500" />}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-1.5 text-[#FBB03B]">
                    Rating
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-brand-dark-gray">{user.avgRating}</p>
                    <span className="text-lg text-[#FBB03B]">★</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[12px] font-black text-brand-spanish-gray uppercase tracking-widest flex items-center gap-1.5">
                    Pipeline
                  </p>
                  <p className="text-lg font-black text-brand-dark-gray leading-none">₹{formatNumber(user.pipelineValue)}</p>
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
                className={`h-full transition-all duration-1000 ${parseFloat(user.closeRate) > parseFloat(user.loseRate) ? 'bg-[#8DC63F]' : 'bg-red-500'}`}
                style={{ width: `${Math.max(10, Math.min(100, (parseFloat(user.closeRate) / (parseFloat(user.closeRate) + parseFloat(user.loseRate) + 1)) * 100))}%` }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
