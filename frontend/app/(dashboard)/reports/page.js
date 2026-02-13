"use client";

import { useState, useEffect } from "react";
import { HiDownload, HiCalendar, HiFilter, HiDocumentText, HiCube, HiTrendingUp, HiStar, HiChartBar } from "react-icons/hi";
import { toast } from "react-hot-toast";
import axios from "@/src/services/api";
import clsx from "clsx";
import Button from "@/src/components/ui/Button";
import Heading from "@/src/components/ui/Heading";
import Card from "@/src/components/ui/Card";

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [salesmen, setSalesmen] = useState([]);
    const [selectedSalesman, setSelectedSalesman] = useState("all");
    const [vectors, setVectors] = useState({
        orgStats: true,
        rankings: true,
        agentMetrics: true,
        feedback: true
    });
    const [dateRange, setDateRange] = useState({
        startDate: "",
        endDate: ""
    });

    useEffect(() => {
        fetchSalesmen();
    }, []);

    const fetchSalesmen = async () => {
        try {
            const response = await axios.get("/users?limit=100");
            // Filter only salesmen
            const list = response.data.data.users.filter(u => u.roles.includes("SALESMAN"));
            setSalesmen(list);
        } catch (error) {
            console.error("Failed to fetch salesmen:", error);
        }
    };

    const handleDownload = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (dateRange.startDate) query.append("startDate", dateRange.startDate);
            if (dateRange.endDate) query.append("endDate", dateRange.endDate);
            if (selectedSalesman !== "all") query.append("salesmanId", selectedSalesman);

            // Add vectors as comma separated string
            const activeVectors = Object.keys(vectors).filter(v => vectors[v]).join(",");
            if (activeVectors) query.append("vectors", activeVectors);

            const response = await axios.get(`/reports/download?${query.toString()}`, {
                responseType: "blob"
            });

            // Extract filename from the backend response header
            const contentDisposition = response.headers['content-disposition'];
            let filename = `Kronus_Report_${new Date().toISOString().split("T")[0]}.pdf`;
            if (contentDisposition) {
                // Modified regex to explicitly exclude trailing quotes if they exist
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i) || contentDisposition.match(/filename=([^;]+)/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].trim();
                }
            }

            // Create a link to download the file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Report generated successfully!");
        } catch (error) {
            console.error("Download failed:", error);
            toast.error("Failed to generate report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const setPredefinedRange = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);

        setDateRange({
            startDate: start.toISOString().split("T")[0],
            endDate: end.toISOString().split("T")[0]
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <Heading>Business Growth Reports</Heading>
                    <p className="text-gray-500 mt-1">Generate and download comprehensive organization performance reports.</p>
                </div>
            </div>

            <div className="">
                {/* Configuration Panel */}
                <Card className="border-[#009688]/10">
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-2 text-[#009688] font-bold uppercase tracking-wider text-sm mb-4">
                            <HiFilter />
                            <span>Report Filters</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Quick Ranges</label>
                                <div className="grid grid-cols-2 gap-2 text-gray-600">
                                    <button
                                        onClick={() => setPredefinedRange(1)}
                                        className="py-2 px-3 text-xs font-bold rounded-lg border border-gray-200 hover:border-[#009688] hover:bg-[#009688]/5 transition-all uppercase"
                                    >
                                        Last 24 Hours
                                    </button>
                                    <button
                                        onClick={() => setPredefinedRange(7)}
                                        className="py-2 px-3 text-xs font-bold rounded-lg border border-gray-200 hover:border-[#009688] hover:bg-[#009688]/5 transition-all uppercase"
                                    >
                                        Last 7 Days
                                    </button>
                                    <button
                                        onClick={() => setPredefinedRange(30)}
                                        className="py-2 px-3 text-xs font-bold rounded-lg border border-gray-200 hover:border-[#009688] hover:bg-[#009688]/5 transition-all uppercase"
                                    >
                                        Last 30 Days
                                    </button>
                                    <button
                                        onClick={() => setDateRange({ startDate: "", endDate: "" })}
                                        className="py-2 px-3 text-xs font-bold rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50/50 transition-all uppercase"
                                    >
                                        Lifetime
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Report Modules</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'orgStats', label: 'Org Overview' },
                                        { id: 'rankings', label: 'Agent Rankings' },
                                        { id: 'agentMetrics', label: 'Agent Details' },
                                        { id: 'feedback', label: 'Customer Feedback' }
                                    ].map(v => (
                                        <label key={v.id} className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={vectors[v.id]}
                                                onChange={() => setVectors(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
                                                className="w-4 h-4 rounded border-gray-300 text-[#009688] focus:ring-[#009688]"
                                            />
                                            <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">{v.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Agent Focus</label>
                                <select
                                    value={selectedSalesman}
                                    onChange={(e) => setSelectedSalesman(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#009688]/20 focus:border-[#009688] transition-all text-sm font-bold text-gray-700 bg-white"
                                >
                                    <option value="all">ALL ORGANIZATION</option>
                                    {salesmen.map(s => (
                                        <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Custom Date Range</label>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">From Date</p>
                                        <input
                                            type="date"
                                            value={dateRange.startDate}
                                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#009688]/20 focus:border-[#009688] transition-all text-sm font-bold text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">To Date</p>
                                        <input
                                            type="date"
                                            value={dateRange.endDate}
                                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#009688]/20 focus:border-[#009688] transition-all text-sm font-bold text-gray-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <Button
                                    className="w-full h-14 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-[#009688]/20"
                                    onClick={handleDownload}
                                    isLoading={loading}
                                    disabled={!Object.values(vectors).some(Boolean)}
                                >
                                    <HiDownload className="inline mr-2" size={20} />
                                    Generate PDF Report
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
