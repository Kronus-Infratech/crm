"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { HiCurrencyRupee, HiCheck, HiX, HiClock, HiFilter, HiPlus } from "react-icons/hi";
import { toast } from "react-hot-toast";
import Heading from "@/src/components/ui/Heading";
import Button from "@/src/components/ui/Button";
import Modal from "@/src/components/ui/Modal";
import api from "@/src/services/api";
import { formatNumber, formatDate, formatDateTime } from "@/src/utils/formatters";
import LeadDetail from "@/src/components/leads/LeadDetail";

export default function FinancePage() {
    const [transactions, setTransactions] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("TRANSACTIONS"); // TRANSACTIONS or APPROVALS

    // Form States
    const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transactionForm, setTransactionForm] = useState({
        type: "CREDIT",
        amount: "",
        source: "",
        description: "",
        date: new Date().toISOString().split('T')[0]
    });

    const [selectedLead, setSelectedLead] = useState(null);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);

    // Approval Note State
    const [approvalNote, setApprovalNote] = useState("");

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            const [transRes, appRes] = await Promise.all([
                api.get("/finance/transactions"),
                api.get("/finance/approvals")
            ]);

            if (transRes.data.success) setTransactions(transRes.data.data.transactions);
            if (appRes.data.success) setApprovals(appRes.data.data);
        } catch (error) {
            console.error("Finance fetch error:", error);
            toast.error("Failed to load finance data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, []);

    const handleCreateTransaction = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await api.post("/finance/transactions", transactionForm);
            if (res.data.success) {
                toast.success("Transaction recorded");
                setTransactionModalOpen(false);
                setTransactionForm({
                    type: "CREDIT",
                    amount: "",
                    source: "",
                    description: "",
                    date: new Date().toISOString().split('T')[0]
                });
                fetchFinanceData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to record transaction");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprovalAction = async (leadId, status) => {
        try {
            const res = await api.patch(`/finance/approvals/${leadId}`, {
                status,
                financeNotes: approvalNote
            });
            if (res.data.success) {
                toast.success(`Lead sale ${status.toLowerCase()} successfully`);
                setApprovalNote("");
                fetchFinanceData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to ${status.toLowerCase()} lead`);
        }
    };

    // Calculate Stats
    const totalCredits = transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalCredits - totalDebits;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Heading level={2}>Finance & Accounting</Heading>
                    <p className="text-gray-500 mt-1 font-medium">Manage cashflow and approve sales transactions.</p>
                </div>
                <Button onClick={() => setTransactionModalOpen(true)}>
                    <HiPlus className="mr-2" size={20} /> New Entry
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <HiCurrencyRupee size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Credits</p>
                        <p className="text-2xl font-black text-emerald-600">₹{formatNumber(totalCredits)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                        <HiCurrencyRupee size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Debits</p>
                        <p className="text-2xl font-black text-red-600">₹{formatNumber(totalDebits)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <HiCurrencyRupee size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Net Balance</p>
                        <p className={clsx("text-2xl font-black", netBalance >= 0 ? "text-indigo-600" : "text-red-600")}>
                            ₹{formatNumber(netBalance)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="flex border-b border-gray-100 px-6 pt-4">
                    <button
                        onClick={() => setActiveTab("TRANSACTIONS")}
                        className={clsx(
                            "pb-4 px-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all",
                            activeTab === "TRANSACTIONS" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Transactions Log
                    </button>
                    <button
                        onClick={() => setActiveTab("APPROVALS")}
                        className={clsx(
                            "pb-4 px-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
                            activeTab === "APPROVALS" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Pending Approvals
                        {approvals.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                                {approvals.length}
                            </span>
                        )}
                    </button>
                </div>

                <div className="p-6 h-full flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 italic">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            Loading finance records...
                        </div>
                    ) : activeTab === "TRANSACTIONS" ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Source / Project</th>
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3">Handled By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 font-medium">
                                    {transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                                            <td className="px-4 py-4">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-[10px] uppercase font-bold border",
                                                    t.type === 'CREDIT' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                                                )}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-bold text-gray-900">{t.source}</td>
                                            <td className="px-4 py-4 text-gray-500 italic max-w-xs truncate" title={t.description}>
                                                {t.description || "-"}
                                            </td>
                                            <td className={clsx("px-4 py-4 text-right font-black text-base", t.type === 'CREDIT' ? "text-emerald-600" : "text-red-500")}>
                                                {t.type === 'DEBIT' ? '-' : ''}₹{formatNumber(t.amount)}
                                            </td>
                                            <td className="px-4 py-4 text-indigo-600 font-bold">{t.handledBy?.name}</td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-12 text-center text-gray-400 italic">No transactions found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {approvals.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                    <HiClock className="mx-auto mb-3 opacity-20" size={48} />
                                    No leads pending finance approval.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {approvals.map((lead) => (
                                        <div key={lead.id} className="bg-white border-2 border-indigo-50 rounded-xl p-6 shadow-sm hover:border-indigo-200 transition-all flex flex-col md:flex-row gap-6">
                                            <div className="flex-1 space-y-4 cursor-pointer" onClick={() => {
                                                setSelectedLead(lead);
                                                setDetailModalOpen(true);
                                            }}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-50 px-2 py-0.5 rounded">NEW SALE</span>
                                                        <h3 className="text-xl font-black text-gray-900 mt-1">{lead.name}</h3>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-gray-400 uppercase">Value</p>
                                                        <p className="text-2xl font-black text-emerald-600">₹{formatNumber(lead.value)}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-gray-50 text-sm">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase">Property Interest</p>
                                                        <p className="font-bold text-gray-800">{lead.property}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase">Assigned Area</p>
                                                        <p className="font-bold text-indigo-600">{lead.inventoryItem?.project?.name || "Multiple"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase">Linked Plot</p>
                                                        <p className="font-bold text-gray-800">{lead.inventoryItem?.plotNumber || "N/A"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase">Salesperson</p>
                                                        <p className="font-bold text-gray-800">{lead.assignedTo?.name || "System"}</p>
                                                    </div>
                                                </div>

                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Finance Notes (Optional)</label>
                                                    <textarea
                                                        className="w-full text-black bg-gray-50 border-gray-100 rounded-xl p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                        placeholder="Add instructions or payment details..."
                                                        rows="2"
                                                        value={approvalNote}
                                                        onChange={(e) => setApprovalNote(e.target.value)}
                                                    ></textarea>
                                                </div>
                                            </div>

                                            <div className="flex flex-row md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                                                <button
                                                    onClick={() => handleApprovalAction(lead.id, "APPROVED")}
                                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                                                >
                                                    <HiCheck size={20} /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleApprovalAction(lead.id, "REJECTED")}
                                                    className="flex-1 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-red-100 transition-all border border-red-100"
                                                >
                                                    <HiX size={20} /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Transaction Modal */}
            <Modal
                isOpen={isTransactionModalOpen}
                onClose={() => setTransactionModalOpen(false)}
                title="Record Finance Entry"
            >
                <form onSubmit={handleCreateTransaction} className="space-y-5">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setTransactionForm({ ...transactionForm, type: "CREDIT" })}
                            className={clsx(
                                "flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-lg transition-all",
                                transactionForm.type === "CREDIT" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"
                            )}
                        >
                            Credit (+)
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransactionForm({ ...transactionForm, type: "DEBIT" })}
                            className={clsx(
                                "flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-lg transition-all",
                                transactionForm.type === "DEBIT" ? "bg-white text-red-600 shadow-sm" : "text-gray-400"
                            )}
                        >
                            Debit (-)
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Amount (₹)</label>
                        <input
                            type="number"
                            required
                            className="w-full text-black bg-gray-50 border-gray-100 rounded-xl p-3 text-lg font-black focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0.00"
                            value={transactionForm.amount}
                            onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Source / Category</label>
                        <input
                            type="text"
                            required
                            className="w-full text-black bg-gray-50 border-gray-100 rounded-xl p-3 text-sm font-bold focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. Office Rent, Lead Sale, Marketing"
                            value={transactionForm.source}
                            onChange={(e) => setTransactionForm({ ...transactionForm, source: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Date</label>
                        <input
                            type="date"
                            className="w-full text-black bg-gray-50 border-gray-100 rounded-xl p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all"
                            value={transactionForm.date}
                            onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description (Optional)</label>
                        <textarea
                            className="w-full text-black bg-gray-50 border-gray-100 rounded-xl p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Internal details..."
                            rows="2"
                            value={transactionForm.description}
                            onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                        ></textarea>
                    </div>

                    <Button type="submit" className="w-full py-4 text-base" loading={isSubmitting}>
                        Confirm Entry
                    </Button>
                </form>
            </Modal>

            {/* Lead Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title="Lead Profile Review"
                size="4xl"
            >
                {selectedLead && (
                    <LeadDetail 
                        lead={selectedLead} 
                        onLeadDeleted={() => {
                            setDetailModalOpen(false);
                            fetchFinanceData();
                        }} 
                    />
                )}
            </Modal>
        </div>
    );
}
