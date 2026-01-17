"use client";

import Link from "next/link";
import { HiArrowRight } from "react-icons/hi";
import Card from "@/src/components/ui/Card";
import { formatNumber } from "@/src/utils/formatters";

export default function RecentLeads({ leads }) {
    if (!leads || leads.length === 0) {
        return (
            <Card className="h-full min-h-[200px] flex items-center justify-center text-gray-400 border-none shadow-xl shadow-gray-200/50 rounded-3xl">
                <p className="italic font-medium">No recent leads found.</p>
            </Card>
        );
    }

    return (
        <Card className="h-full p-8 border-none shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <HiArrowRight className="-rotate-45" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Recent Activity</h3>
                </div>
                <Link href="/leads" className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-2 transition-colors bg-indigo-50 px-4 py-2 rounded-lg">
                    Full Pipeline <HiArrowRight />
                </Link>
            </div>

            <div className="overflow-x-auto -mx-8">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-100/50 text-gray-400">
                            <th className="px-8 pb-4 text-[10px] font-black uppercase tracking-widest">Lead Name</th>
                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Property Interested</th>
                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Pipeline Status</th>
                            <th className="px-8 pb-4 text-[10px] font-black uppercase tracking-widest text-right">Estimated Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50/50">
                        {leads.map((lead) => (
                            <tr key={lead.id} className="group hover:bg-gray-50/50 transition-all cursor-pointer">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            {lead.name[0].toUpperCase()}
                                        </div>
                                        <span className="font-bold text-gray-900">{lead.name}</span>
                                    </div>
                                </td>
                                <td className="py-5 text-sm font-bold text-gray-500">{lead.property || <span className="text-gray-300 italic">No Selection</span>}</td>
                                <td className="py-5">
                                    <StatusBadge status={lead.status} />
                                </td>
                                <td className="px-8 py-5 text-right font-black text-gray-900 tabular-nums">
                                    ₹{formatNumber(lead.budgetTo || lead.budgetFrom || 0)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function StatusBadge({ status }) {
    const styles = {
        NEW: "bg-blue-100 text-blue-700",
        CONTACTED: "bg-cyan-100 text-cyan-700",
        INTERESTED: "bg-green-100 text-green-700",
        NOT_INTERESTED: "bg-gray-100 text-gray-700",
        SITE_VISIT: "bg-purple-100 text-purple-700",
        NEGOTIATION: "bg-orange-100 text-orange-700",
        DOCUMENTATION: "bg-indigo-100 text-indigo-700",
        WON: "bg-emerald-100 text-emerald-700",
        LOST: "bg-red-100 text-red-700"
    };

    return (
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${styles[status] || "bg-gray-50 text-gray-700"}`}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
}
