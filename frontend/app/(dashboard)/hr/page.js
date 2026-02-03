"use client"

import { useState, useEffect } from "react";
import api from "@/src/services/api";
import { toast } from "react-hot-toast";
import Heading from "@/src/components/ui/Heading";
import Card from "@/src/components/ui/Card";
import Button from "@/src/components/ui/Button";
import Input from "@/src/components/ui/Input";
import { HiCheck, HiX, HiChartBar, HiClipboardList, HiClock, HiUserGroup } from "react-icons/hi";
import { formatDate } from "@/src/utils/formatters";
import clsx from "clsx";
import { motion } from "framer-motion";

export default function HRPage() {
    const [activeTab, setActiveTab] = useState("pending");
    const [leaves, setLeaves] = useState([]);
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectInput, setShowRejectInput] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [leavesRes, reportsRes] = await Promise.all([
                api.get("/leaves"),
                api.get("/leaves/reports")
            ]);
            setLeaves(leavesRes.data.data);
            setReports(reportsRes.data.data);
        } catch (error) {
            console.error("Failed to fetch HR data", error);
            toast.error("Failed to load HR data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (id, status) => {
        if (status === 'REJECTED' && !rejectionReason && showRejectInput !== id) {
            setShowRejectInput(id);
            return;
        }

        setProcessingId(id);
        try {
            await api.put(`/leaves/${id}/status`, {
                status,
                rejectionReason: status === 'REJECTED' ? rejectionReason : null
            });
            toast.success(`Leave request ${status.toLowerCase()} successfully`);
            setRejectionReason("");
            setShowRejectInput(null);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update leave status");
        } finally {
            setProcessingId(null);
        }
    };

    const pendingLeaves = leaves.filter(l => l.status === "PENDING");
    const allLeaves = leaves;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Heading level={2}>Human Resources</Heading>
                    <p className="text-gray-500 mt-1">Manage employee leave requests and attendance reports.</p>
                </div>
            </div>

            {/* Quick Stats */}
            {reports && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Pending Review"
                        value={pendingLeaves.length}
                        icon={<HiClock className="text-[#FBB03B]" />}
                        color="sunshade"
                    />
                    <StatCard
                        title="Total Approved"
                        value={reports.summary.find(s => s.status === 'APPROVED')?._count || 0}
                        icon={<HiCheck className="text-[#8DC63F]" />}
                        color="yellowgreen"
                    />
                    <StatCard
                        title="Total Employees"
                        value={reports.employeeReports.length}
                        icon={<HiUserGroup className="text-[#009688]" />}
                        color="teal"
                    />
                    <StatCard
                        title="Today on Leave"
                        value={leaves.filter(l => {
                            const today = new Date();
                            const start = new Date(l.startDate);
                            const end = new Date(l.endDate);
                            return l.status === 'APPROVED' && today >= start && today <= end;
                        }).length}
                        icon={<HiClipboardList className="text-red-500" />}
                        color="palliser"
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-brand-spanish-gray/20">
                <button
                    onClick={() => setActiveTab("pending")}
                    className={clsx(
                        "px-6 py-3 text-sm font-bold border-b-2 transition-all",
                        activeTab === "pending" ? "border-[#009688] text-[#009688]" : "border-transparent text-brand-spanish-gray hover:text-brand-dark-gray"
                    )}
                >
                    Pending Requests ({pendingLeaves.length})
                </button>
                <button
                    onClick={() => setActiveTab("all")}
                    className={clsx(
                        "px-6 py-3 text-sm font-bold border-b-2 transition-all",
                        activeTab === "all" ? "border-[#009688] text-[#009688]" : "border-transparent text-brand-spanish-gray hover:text-brand-dark-gray"
                    )}
                >
                    All Requests
                </button>
                <button
                    onClick={() => setActiveTab("reports")}
                    className={clsx(
                        "px-6 py-3 text-sm font-bold border-b-2 transition-all",
                        activeTab === "reports" ? "border-[#009688] text-[#009688]" : "border-transparent text-brand-spanish-gray hover:text-brand-dark-gray"
                    )}
                >
                    Employee Reports
                </button>
            </div>

            <div className="mt-6">
                {activeTab === "pending" && (
                    <div className="space-y-4">
                        {pendingLeaves.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <HiCheck className="mx-auto h-12 w-12 text-emerald-400 mb-4" />
                                <p className="text-gray-500 font-medium">All clear! No pending leave requests.</p>
                            </div>
                        ) : (
                            pendingLeaves.map(leave => (
                                <LeaveRequestCard
                                    key={leave.id}
                                    leave={leave}
                                    onAction={handleAction}
                                    processing={processingId === leave.id}
                                    showReject={showRejectInput === leave.id}
                                    rejectionReason={rejectionReason}
                                    setRejectionReason={setRejectionReason}
                                />
                            ))
                        )}
                    </div>
                )}

                {activeTab === "all" && (
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Employee</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Dates</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {leaves.map(leave => (
                                        <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{leave.user.name}</div>
                                                <div className="text-[10px] text-gray-400">{leave.user.department || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-600">{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-600">{leave.type}</td>
                                            <td className="px-6 py-4">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider",
                                                    leave.status === 'APPROVED' ? "bg-[#8DC63F]/10 text-[#8DC63F]" :
                                                        leave.status === 'REJECTED' ? "bg-red-500/10 text-red-500" : "bg-[#FBB03B]/10 text-[#FBB03B]"
                                                )}>
                                                    {leave.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{leave.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {activeTab === "reports" && reports && (
                    <div className="grid grid-cols-1 gap-6">
                        <Card className="p-0 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-black text-gray-900 uppercase tracking-tighter">Employee Attendance Summary</h3>
                                <div className="text-xs text-gray-400 font-bold">CURRENT YEAR</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Employee</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Approved Requests</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Approved Days</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Pending</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reports.employeeReports.map(emp => (
                                            <tr key={emp.id} className="hover:bg-[#009688]/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-brand-dark-gray">{emp.name}</div>
                                                    <div className="text-[10px] text-brand-spanish-gray uppercase font-black">{emp.designation || "Staff"} • {emp.department || "General"}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-[#8DC63F] font-satoshi">{emp.approvedRequests}</td>
                                                <td className="px-6 py-4 text-center font-black text-[#009688] font-satoshi">{emp.totalApprovedDays} days</td>
                                                <td className="px-6 py-4 text-center font-black text-[#FBB03B] font-satoshi">{emp.pendingRequests}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="w-24 bg-gray-100 h-1.5 rounded-full ml-auto overflow-hidden">
                                                        <div
                                                            className="bg-[#009688] h-full"
                                                            style={{ width: `${Math.min((emp.totalApprovedDays / 30) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    const colors = {
        sunshade: "bg-[#FBB03B]/5 text-[#FBB03B] border-[#FBB03B]/20",
        yellowgreen: "bg-[#8DC63F]/5 text-[#8DC63F] border-[#8DC63F]/20",
        teal: "bg-[#009688]/5 text-[#009688] border-[#009688]/20",
        palliser: "bg-red-500/5 text-red-500 border-red-500/20",
    };

    return (
        <Card className={clsx("p-6 bg-linear-to-br border-2", colors[color])}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
                    <h4 className="text-3xl font-black">{value}</h4>
                </div>
                <div className="p-3 bg-white/80 rounded-xl shadow-sm border border-white/50">
                    {icon}
                </div>
            </div>
        </Card>
    );
}

function LeaveRequestCard({ leave, onAction, processing, showReject, rejectionReason, setRejectionReason }) {
    return (
        <Card className="p-6 border-l-4 border-l-[#FBB03B] hover:shadow-lg transition-all group rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#009688]/10 flex items-center justify-center text-[#009688] font-black text-xl">
                        {leave.user.name[0]}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h4 className="text-lg font-black text-gray-900">{leave.user.name}</h4>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-black uppercase tracking-wider">{leave.type}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Requested <span className="font-bold text-gray-900">{formatDate(leave.startDate)}</span> to <span className="font-bold text-gray-900">{formatDate(leave.endDate)}</span>
                            <span className="ml-2 text-[#009688] font-bold">({Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} days)</span>
                        </p>
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-brand-spanish-gray/20 text-sm italic text-brand-dark-gray max-w-lg">
                            "{leave.reason}"
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    {showReject ? (
                        <div className="flex flex-col gap-2 w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Reason for rejection..."
                                className="w-full text-black px-3 py-2 text-sm border border-brand-spanish-gray/30 rounded-lg focus:outline-none focus:border-red-500"
                                required
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="w-full bg-red-500 hover:bg-[#8B654B] text-white"
                                    onClick={() => onAction(leave.id, 'REJECTED')}
                                    disabled={processing}
                                >
                                    Confirm Reject
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setRejectionReason("")}
                                    disabled={processing}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-500/30 hover:bg-red-500/5 gap-2"
                                onClick={() => onAction(leave.id, 'REJECTED')}
                                disabled={processing}
                            >
                                <HiX /> Reject
                            </Button>
                            <Button
                                size="sm"
                                className="bg-[#8DC63F] hover:bg-[#7AB336] gap-2 text-white"
                                onClick={() => onAction(leave.id, 'APPROVED')}
                                disabled={processing}
                            >
                                <HiCheck /> Approve
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
