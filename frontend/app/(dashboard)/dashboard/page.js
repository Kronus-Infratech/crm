"use client";

import { useEffect, useState } from "react";
import { HiUserGroup, HiTrendingUp, HiCurrencyRupee, HiChartPie, HiLightningBolt } from "react-icons/hi";
import { motion } from "framer-motion";
import api from "@/src/services/api";
import Heading from "@/src/components/ui/Heading";
import Card from "@/src/components/ui/Card";
import { StatusChart, SourceChart, TrendLineChart, PerformanceRadar } from "@/src/components/dashboard/DashboardCharts";
import RecentLeads from "@/src/components/dashboard/RecentLeads";
import EmployeePerformance from "@/src/components/dashboard/EmployeePerformance";
import { formatNumber } from "@/src/utils/formatters";
import { useAuth } from "@/src/contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeUsers: 0,
    pipelineValue: 0,
    conversionRate: 0,
    leadsByStatus: {},
    leadsBySource: {},
    performance: [],
    monthlyTrends: [],
    valueBreakdown: { won: 0, lost: 0, pipeline: 0 }
  });
  const [recentLeads, setRecentLeads] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const userRoles = user?.roles || [];
        const isManager = userRoles.includes('ADMIN') || userRoles.includes('MANAGER') || userRoles.includes('DIRECTOR') || userRoles.includes('EXECUTIVE');

        // Fetch stats concurrently with safety
        const [userStatsRes, leadStatsRes, recentLeadsRes] = await Promise.allSettled([
          isManager ? api.get("/users/stats") : Promise.resolve({ data: { data: { activeUsers: 0 } } }),
          api.get("/leads/stats"),
          api.get("/leads", { params: { limit: 5, sortOrder: "desc", sortBy: "createdAt" } })
        ]);

        const userStats = userStatsRes.status === 'fulfilled' ? userStatsRes.value.data.data : { activeUsers: 0 };
        const leadStats = leadStatsRes.status === 'fulfilled' ? leadStatsRes.value.data.data : { totalLeads: 0, totalValue: 0, leadsByStatus: {}, leadsBySource: {}, performance: [], monthlyTrends: [], valueBreakdown: { won: 0, lost: 0, pipeline: 0 } };
        const recentLeadsData = recentLeadsRes.status === 'fulfilled' ? recentLeadsRes.value.data.data.leads : [];

        const wonLeads = leadStats.leadsByStatus?.CONVERTED || 0;
        const totalLeads = leadStats.totalLeads || 1;
        const conversionRate = ((wonLeads / totalLeads) * 100).toFixed(1);

        setStats({
          totalLeads: leadStats.totalLeads,
          activeUsers: userStats.activeUsers,
          pipelineValue: leadStats.totalValue,
          conversionRate: conversionRate,
          leadsByStatus: leadStats.leadsByStatus,
          leadsBySource: leadStats.leadsBySource,
          performance: leadStats.performance || [],
          monthlyTrends: leadStats.monthlyTrends || [],
          valueBreakdown: leadStats.valueBreakdown || { won: 0, lost: 0, pipeline: 0 }
        });

        setRecentLeads(recentLeadsData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const userRoles = user?.roles || [];
  const isManagerOrAdmin = userRoles.includes('ADMIN') || userRoles.includes('MANAGER') || userRoles.includes('DIRECTOR') || userRoles.includes('EXECUTIVE');

  const statCards = [
    { label: "Total Leads", value: stats.totalLeads, icon: <HiLightningBolt />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Pipeline Value", value: `₹${formatNumber(stats.pipelineValue)}`, icon: <HiCurrencyRupee />, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Avg. Conversion", value: `${stats.conversionRate}%`, icon: <HiChartPie />, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Active Agents", value: stats.activeUsers, icon: <HiUserGroup />, color: "text-purple-600", bg: "bg-purple-50" }
  ];

  if (loading) {
    return <div className="p-8 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em]">Loading Kronus CRM Dashboard...</div>;
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Kronus CRM Dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px] leading-none">Security Protocol: {userRoles[0]} Level Access</p>
          </div>
        </div>
        <div className="bg-white px-6 py-4 rounded-lg border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Global Revenue</p>
            <p className="text-xl font-black text-gray-900 mt-1">₹{formatNumber(stats.valueBreakdown.won)}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <HiTrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="p-8 border-none shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:scale-[1.02] transition-all group overflow-hidden relative">
              <div className={`w-14 h-14 rounded-lg ${stat.bg} ${stat.color} text-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <p className="text-base font-black text-gray-400 uppercase tracking-[0.15em] mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Analytics Core Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Trend Analysis */}
        <Card className="lg:col-span-8 p-10 border-none shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Lead Growth Vectors</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monthly Acquisition Trends</p>
            </div>
            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg">HISTORICAL DATA</span>
          </div>
          <TrendLineChart data={stats.monthlyTrends} />
        </Card>

        {/* Distribution Ring */}
        <Card className="lg:col-span-4 p-10 border-none shadow-xl shadow-gray-200/50">
          <div className="text-center mb-8">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Status Weights</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Pipeline Distribution</p>
          </div>
          <StatusChart data={stats.leadsByStatus} />
        </Card>
      </div>

      {/* Deep Performance Layer */}
      {isManagerOrAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Performance Radar */}
          <Card className="lg:col-span-4 p-10 border-none shadow-xl shadow-gray-200/50">
            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Agent Competency</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Top Performer Radar</p>
            </div>
            <PerformanceRadar performanceData={stats.performance} />
          </Card>

          {/* Matrix Table */}
          <div className="lg:col-span-8 space-y-8">
            <EmployeePerformance data={stats.performance} />
          </div>
        </div>
      )}

      {/* Operations Layer */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <Card className="p-10 border-none shadow-xl shadow-gray-200/50 rounded-[3rem] h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Channel Reach</h3>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full">SOURCE ANALYTICS</span>
            </div>
            <SourceChart data={stats.leadsBySource} />
          </Card>
        </div>
        <div className="lg:col-span-7">
          <RecentLeads leads={recentLeads} />
        </div>
      </div> */}

      <div className="space-y-10">
        <div>
          <Card className="p-10 border-none shadow-xl shadow-gray-200/50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                Channel Reach
              </h3>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg">
                SOURCE ANALYTICS
              </span>
            </div>
            <SourceChart data={stats.leadsBySource} />
          </Card>
        </div>

        {/* <RecentLeads leads={recentLeads} /> */}
      </div>

    </div>
  );
}
