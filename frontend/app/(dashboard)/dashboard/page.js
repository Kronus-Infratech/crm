"use client";

import { useEffect, useState } from "react";
import { HiUserGroup, HiCurrencyRupee, HiChartPie, HiLightningBolt } from "react-icons/hi";
import { motion } from "framer-motion";
import api from "@/src/services/api";
import Heading from "@/src/components/ui/Heading";
import Card from "@/src/components/ui/Card";
import { StatusChart, SourceChart } from "@/src/components/dashboard/DashboardCharts";
import RecentLeads from "@/src/components/dashboard/RecentLeads";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeUsers: 0,
    pipelineValue: 0,
    conversionRate: 0,
    leadsByStatus: {},
    leadsBySource: {},
  });
  const [recentLeads, setRecentLeads] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch stats concurrently
        const [userStatsRes, leadStatsRes, recentLeadsRes] = await Promise.all([
          api.get("/users/stats"),
          api.get("/leads/stats"),
          api.get("/leads", { params: { limit: 5, sortOrder: "desc", sortBy: "createdAt" } })
        ]);

        const userStats = userStatsRes.data.data;
        const leadStats = leadStatsRes.data.data;
        const recentLeadsData = recentLeadsRes.data.data.leads;

        // Calculate Conversion Rate (Won Leads / Total Leads * 100)
        const wonLeads = leadStats.leadsByStatus?.WON || 0;
        const totalLeads = leadStats.totalLeads || 1; // Avoid division by zero
        const conversionRate = ((wonLeads / totalLeads) * 100).toFixed(1);

        setStats({
          totalLeads: leadStats.totalLeads,
          activeUsers: userStats.activeUsers,
          pipelineValue: leadStats.totalValue,
          conversionRate: conversionRate,
          leadsByStatus: leadStats.leadsByStatus,
          leadsBySource: leadStats.leadsBySource,
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

  const statCards = [
    {
      label: "Total Leads",
      value: stats.totalLeads,
      icon: <HiUserGroup />,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Active Users",
      value: stats.activeUsers,
      icon: <HiLightningBolt />,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      label: "Pipeline Value",
      value: `₹${stats.pipelineValue.toLocaleString()}`,
      icon: <HiCurrencyRupee />,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      label: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      icon: <HiChartPie />,
      color: "text-orange-600",
      bg: "bg-orange-50"
    }
  ];

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <Heading level={2}>Dashboard</Heading>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="flex items-center gap-4 p-6 hover:shadow-md transition-shadow">
              <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} text-xl`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Chart */}
        <Card className="lg:col-span-1">
          <h3 className="text-lg font-bold text-gray-900">Lead Status</h3>
          <StatusChart data={stats.leadsByStatus} />
        </Card>

        {/* Source Chart */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Lead Sources</h3>
          <SourceChart data={stats.leadsBySource} />
        </Card>
      </div>

      {/* Recent Leads */}
      <div className="grid grid-cols-1">
        <RecentLeads leads={recentLeads} />
      </div>
    </div>
  );
}
