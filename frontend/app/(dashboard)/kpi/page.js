"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HiChartBar, HiTrendingUp, HiCurrencyRupee, HiSparkles } from "react-icons/hi";
import api from "@/src/services/api";
import Card from "@/src/components/ui/Card";
import { useAuth } from "@/src/contexts/AuthContext";

const canManageTargets = (roles = []) => roles.some((r) => ["ADMIN", "EXECUTIVE", "DIRECTOR"].includes(r));
const canViewAdminSummary = (roles = []) => roles.some((r) => ["ADMIN", "EXECUTIVE", "DIRECTOR", "MANAGER"].includes(r));

const fmtInr = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const fmtPct = (n, d) => `${d > 0 ? ((n / d) * 100).toFixed(1) : "0.0"}%`;

export default function KPIPage() {
    const { user } = useAuth();
    const roles = user?.roles || [];

    const [loading, setLoading] = useState(true);
    const [quarter, setQuarter] = useState(null);
    const [myKpi, setMyKpi] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [adminSummary, setAdminSummary] = useState(null);
    const [targets, setTargets] = useState([]);
    const [savingTargets, setSavingTargets] = useState(false);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const qRes = await api.get("/kpi/quarter");
            const quarterKey = qRes.data?.data?.quarterKey;
            setQuarter(qRes.data?.data);

            const tasks = [
                api.get("/kpi/quarterly", { params: { quarterKey } }),
                api.get("/kpi/leaderboard", { params: { quarterKey, limit: 50 } })
            ];

            if (canViewAdminSummary(roles)) {
                tasks.push(api.get("/kpi/admin-summary", { params: { quarterKey } }));
            }
            if (canManageTargets(roles)) {
                tasks.push(api.get("/kpi/targets", { params: { quarterKey } }));
            }

            const results = await Promise.all(tasks);
            setMyKpi(results[0]?.data?.data || null);
            setLeaderboard(results[1]?.data?.data || []);

            let idx = 2;
            if (canViewAdminSummary(roles)) {
                setAdminSummary(results[idx]?.data?.data || null);
                idx += 1;
            }
            if (canManageTargets(roles)) {
                setTargets(results[idx]?.data?.data || []);
            }
        } catch (error) {
            console.error("Failed to load KPI data", error);
            toast.error(error?.response?.data?.message || "Failed to load KPI data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const myRank = useMemo(() => {
        if (!user?.id || leaderboard.length === 0) return null;
        const idx = leaderboard.findIndex((row) => row.userId === user.id || row.user?.id === user.id);
        return idx >= 0 ? idx + 1 : null;
    }, [leaderboard, user?.id]);

    const updateTarget = (userId, value) => {
        setTargets((prev) => prev.map((t) => (t.userId === userId ? { ...t, targetRevenue: value } : t)));
    };

    const saveTargets = async () => {
        if (!quarter?.quarterKey) return;
        try {
            setSavingTargets(true);
            await api.put("/kpi/targets", {
                quarterKey: quarter.quarterKey,
                targets: targets.map((t) => ({ userId: t.userId, targetRevenue: Number(t.targetRevenue || 0) }))
            });
            toast.success("Quarterly targets saved");
            fetchAll();
        } catch (error) {
            console.error("Failed to save KPI targets", error);
            toast.error(error?.response?.data?.message || "Failed to save targets");
        } finally {
            setSavingTargets(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center font-semibold text-gray-500">Loading KPI dashboard...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-brand-dark-gray">Quarterly Sales KPI</h1>
                    <p className="text-sm text-brand-spanish-gray mt-1">Quarter: {quarter?.quarterKey || "-"}</p>
                </div>
                <button
                    onClick={fetchAll}
                    className="px-4 py-2 rounded-lg bg-[#009688] text-white font-semibold hover:bg-[#007f74] transition"
                >
                    Refresh
                </button>
            </div>

            {myKpi && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-5 border border-brand-spanish-gray/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-widest text-brand-spanish-gray font-bold">KPI Score</p>
                            <HiSparkles className="text-[#009688]" size={20} />
                        </div>
                        <p className="text-3xl font-black mt-2 text-brand-dark-gray">{Number(myKpi.finalScore || 0).toFixed(1)} / 100</p>
                        <p className="text-xs mt-1 text-brand-spanish-gray">Rank: {myRank || "-"}</p>
                    </Card>

                    <Card className="p-5 border border-brand-spanish-gray/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-widest text-brand-spanish-gray font-bold">Revenue Closed</p>
                            <HiCurrencyRupee className="text-[#8DC63F]" size={20} />
                        </div>
                        <p className="text-2xl font-black mt-2 text-brand-dark-gray">{fmtInr(myKpi.revenueClosed)}</p>
                        <p className="text-xs mt-1 text-brand-spanish-gray">Target: {fmtInr(myKpi.targetRevenue)}</p>
                    </Card>

                    <Card className="p-5 border border-brand-spanish-gray/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-widest text-brand-spanish-gray font-bold">Visit Conversion</p>
                            <HiTrendingUp className="text-[#FBB03B]" size={20} />
                        </div>
                        <p className="text-2xl font-black mt-2 text-brand-dark-gray">{fmtPct(myKpi.dealsClosed, myKpi.siteVisits)}</p>
                        <p className="text-xs mt-1 text-brand-spanish-gray">Deals: {myKpi.dealsClosed} / Visits: {myKpi.siteVisits}</p>
                    </Card>

                    <Card className="p-5 border border-brand-spanish-gray/20">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-widest text-brand-spanish-gray font-bold">Penalties</p>
                            <HiChartBar className="text-red-500" size={20} />
                        </div>
                        <p className="text-2xl font-black mt-2 text-brand-dark-gray">-{Number(myKpi.totalPenalties || 0).toFixed(1)}</p>
                        <p className="text-xs mt-1 text-brand-spanish-gray">Missed follow-ups + lead aging</p>
                    </Card>
                </div>
            )}

            {myKpi && (
                <Card className="p-6 border border-brand-spanish-gray/20 overflow-x-auto">
                    <h2 className="text-lg font-black text-brand-dark-gray mb-4">Metric Breakdown</h2>
                    <table className="min-w-full text-sm text-black">
                        <thead>
                            <tr className="border-b border-brand-spanish-gray/20 text-left">
                                <th className="py-2">Metric</th>
                                <th className="py-2">Value</th>
                                <th className="py-2">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-brand-spanish-gray/10"><td className="py-2">Deal Closures</td><td>{fmtInr(myKpi.revenueClosed)} / {fmtInr(myKpi.targetRevenue)}</td><td>{Number(myKpi.closureScore || 0).toFixed(1)} + {Number(myKpi.closureBonus || 0).toFixed(1)}</td></tr>
                            <tr className="border-b border-brand-spanish-gray/10"><td className="py-2">Site Visit Conversion</td><td>{myKpi.dealsClosed} deals / {myKpi.siteVisits} visits</td><td>{Number(myKpi.siteVisitScore || 0).toFixed(1)}</td></tr>
                            <tr className="border-b border-brand-spanish-gray/10"><td className="py-2">Lead Response &lt;24h</td><td>{myKpi.leadsContacted24h} / {myKpi.leadsAssigned} ({fmtPct(myKpi.leadsContacted24h, myKpi.leadsAssigned)})</td><td>{Number(myKpi.leadResponseScore || 0).toFixed(1)}</td></tr>
                            <tr className="border-b border-brand-spanish-gray/10"><td className="py-2">Follow-up Compliance</td><td>{myKpi.completedFollowUps} / {myKpi.scheduledFollowUps} ({fmtPct(myKpi.completedFollowUps, myKpi.scheduledFollowUps)})</td><td>{Number(myKpi.followUpComplianceScore || 0).toFixed(1)}</td></tr>
                            <tr><td className="py-2">Penalties</td><td>Missed: {myKpi.missedFollowUps}, Lead aging: {myKpi.leadsAged48h}</td><td>-{Number(myKpi.totalPenalties || 0).toFixed(1)}</td></tr>
                        </tbody>
                    </table>
                </Card>
            )}

            <Card className="p-6 border border-brand-spanish-gray/20 overflow-x-auto">
                <h2 className="text-lg font-black text-brand-dark-gray mb-4">Sales Leaderboard</h2>
                <table className="min-w-full text-sm text-black">
                    <thead>
                        <tr className="border-b border-brand-spanish-gray/20 text-left">
                            <th className="py-2">Rank</th>
                            <th className="py-2">Sales Executive</th>
                            <th className="py-2">KPI Score</th>
                            <th className="py-2">Revenue Closed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((row, idx) => (
                            <tr key={`${row.userId}-${idx}`} className="border-b border-brand-spanish-gray/10">
                                <td className="py-2">#{idx + 1}</td>
                                <td>{row.user?.name || "-"}</td>
                                <td>{Number(row.finalScore || 0).toFixed(1)}</td>
                                <td>{fmtInr(row.revenueClosed)}</td>
                            </tr>
                        ))}
                        {leaderboard.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-6 text-center text-brand-spanish-gray">No KPI records yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {canViewAdminSummary(roles) && adminSummary && (
                <Card className="p-6 border border-brand-spanish-gray/20">
                    <h2 className="text-lg font-black text-brand-dark-gray mb-4">Admin Dashboard Metrics</h2>
                    <p className="text-sm text-brand-spanish-gray mb-4">Average Sales KPI Score: <span className="font-black text-brand-dark-gray">{Number(adminSummary.averageSalesKPIScore || 0).toFixed(2)}</span></p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-bold text-green-700 mb-2">Top 3 Sales Executives</p>
                            <ul className="space-y-1 text-black">
                                {(adminSummary.top3 || []).map((row, i) => (
                                    <li key={`top-${row.id || i}`}>#{i + 1} {row.user?.name || "-"} - {Number(row.finalScore || 0).toFixed(1)}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold text-red-700 mb-2">Bottom 3 Sales Executives</p>
                            <ul className="space-y-1 text-black">
                                {(adminSummary.bottom3 || []).map((row, i) => (
                                    <li key={`bottom-${row.id || i}`}>#{i + 1} {row.user?.name || "-"} - {Number(row.finalScore || 0).toFixed(1)}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            {canManageTargets(roles) && (
                <Card className="p-6 border border-brand-spanish-gray/20 overflow-x-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-black text-brand-dark-gray">Quarterly Target Revenue Input</h2>
                        <button
                            onClick={saveTargets}
                            disabled={savingTargets}
                            className="px-4 py-2 rounded-lg bg-[#8DC63F] text-white font-semibold disabled:opacity-60"
                        >
                            {savingTargets ? "Saving..." : "Save Targets"}
                        </button>
                    </div>

                    <table className="min-w-full text-sm text-black">
                        <thead>
                            <tr className="border-b border-brand-spanish-gray/20 text-left">
                                <th className="py-2">Sales Executive</th>
                                <th className="py-2">Email</th>
                                <th className="py-2">Quarterly Target Revenue (INR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {targets.map((row) => (
                                <tr key={row.userId} className="border-b border-brand-spanish-gray/10">
                                    <td className="py-2">{row.name}</td>
                                    <td>{row.email}</td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-48 px-3 py-2 border border-brand-spanish-gray/30 rounded-lg"
                                            value={row.targetRevenue}
                                            onChange={(e) => updateTarget(row.userId, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {targets.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-6 text-center text-brand-spanish-gray">No sales executives found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}
