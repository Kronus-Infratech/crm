"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { HiCurrencyRupee, HiTrendingUp, HiTrendingDown, HiCheck, HiX, HiClock, HiFilter, HiPlus, HiDocumentDuplicate } from "react-icons/hi";
import { toast } from "react-hot-toast";
import Link from "next/link";
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
                <div className="bg-white p-6 rounded-lg border border-brand-spanish-gray/20 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#8DC63F]/10 rounded-lg flex items-center justify-center text-[#8DC63F]">
                        <HiTrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-brand-spanish-gray uppercase tracking-wider">Total Credits</p>
                        <p className="text-2xl font-black text-[#8DC63F]">₹{formatNumber(totalCredits)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-brand-spanish-gray/20 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500">
                        <HiTrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-brand-spanish-gray uppercase tracking-wider">Total Debits</p>
                        <p className="text-2xl font-black text-red-500">₹{formatNumber(totalDebits)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-brand-spanish-gray/20 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#009688]/10 rounded-lg flex items-center justify-center text-[#009688]">
                        <HiCurrencyRupee size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-brand-spanish-gray uppercase tracking-wider">Net Balance</p>
                        <p className={clsx("text-2xl font-black", netBalance >= 0 ? "text-[#009688]" : "text-red-500")}>
                            ₹{formatNumber(netBalance)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-lg border border-brand-spanish-gray/20 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="flex border-b border-gray-100 px-6 pt-4">
                    <button
                        onClick={() => setActiveTab("TRANSACTIONS")}
                        className={clsx(
                            "pb-4 px-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all",
                            activeTab === "TRANSACTIONS" ? "border-[#009688] text-[#009688]" : "border-transparent text-brand-spanish-gray hover:text-brand-dark-gray"
                        )}
                    >
                        Transactions Log
                    </button>
                    <button
                        onClick={() => setActiveTab("APPROVALS")}
                        className={clsx(
                            "pb-4 px-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
                            activeTab === "APPROVALS" ? "border-[#009688] text-[#009688]" : "border-transparent text-brand-spanish-gray hover:text-brand-dark-gray"
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
                            <div className="w-10 h-10 border-4 border-[#009688] border-t-transparent rounded-full animate-spin"></div>
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
                                                    t.type === 'CREDIT' ? "bg-[#8DC63F]/10 text-[#8DC63F] border-[#8DC63F]/30" : "bg-red-500/10 text-red-500 border-red-500/30"
                                                )}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-bold text-gray-900">{t.source}</td>
                                            <td className="px-4 py-4 text-gray-500 italic max-w-xs truncate" title={t.description}>
                                                {t.description || "-"}
                                            </td>
                                            <td className={clsx("px-4 py-4 text-right font-black text-base", t.type === 'CREDIT' ? "text-[#8DC63F]" : "text-red-500")}>
                                                {t.type === 'DEBIT' ? '-' : ''}₹{formatNumber(t.amount)}
                                            </td>
                                            <td className="px-4 py-4 text-[#009688] font-bold">{t.handledBy?.name}</td>
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
                                        <div key={lead.id} className="bg-white border text-black border-brand-spanish-gray/20 rounded-lg p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-center">
                                            <div className="flex-1 space-y-3 cursor-pointer" onClick={() => {
                                                window.location.href = `/leads/${lead.id}/ledger`;
                                            }}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${lead.ledgerStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {lead.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-gray-900">{lead.name}</h3>
                                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">{lead.property}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-brand-spanish-gray uppercase">Credited So Far</p>
                                                        <p className="text-xl font-black text-[#8DC63F]">₹{formatNumber(lead.totalAmountToCredit || 0)}</p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-brand-spanish-gray/10">
                                                        <HiCurrencyRupee className="text-[#8DC63F]" />
                                                        <span className="text-xs font-bold text-brand-spanish-gray">
                                                            {lead.paymentLedgerEntries?.length || 0} Pending Payments
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-brand-spanish-gray/10">
                                                        < HiDocumentDuplicate className="text-[#009688]" />
                                                        <span className="text-xs font-bold text-brand-spanish-gray">
                                                            {lead.documentLedgerEntries?.length || 0} Pending Docs
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-fit">
                                                <Link href={`/leads/${lead.id}/ledger`}>
                                                    <Button className="w-full shadow-lg shadow-[#009688]/10 bg-[#009688] hover:bg-[#00796B]">
                                                        Review Running Ledger
                                                    </Button>
                                                </Link>
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
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setTransactionForm({ ...transactionForm, type: "CREDIT" })}
                            className={clsx(
                                "flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-lg transition-all",
                                transactionForm.type === "CREDIT" ? "bg-white text-[#8DC63F] shadow-sm" : "text-brand-spanish-gray"
                            )}
                        >
                            Credit (+)
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransactionForm({ ...transactionForm, type: "DEBIT" })}
                            className={clsx(
                                "flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-lg transition-all",
                                transactionForm.type === "DEBIT" ? "bg-white text-red-500 shadow-sm" : "text-brand-spanish-gray"
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
                            className="w-full text-black bg-gray-50 border-brand-spanish-gray/30 rounded-lg p-3 text-lg font-black focus:ring-[#009688]/20 focus:border-[#009688]"
                            placeholder="0.00"
                            value={transactionForm.amount}
                            onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-brand-spanish-gray uppercase tracking-widest">Source / Category</label>
                        <input
                            type="text"
                            required
                            className="w-full text-black bg-gray-50 border-brand-spanish-gray/30 rounded-lg p-3 text-sm font-bold focus:ring-[#009688]/20 focus:border-[#009688]"
                            placeholder="e.g. Office Rent, Lead Sale, Marketing"
                            value={transactionForm.source}
                            onChange={(e) => setTransactionForm({ ...transactionForm, source: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-brand-spanish-gray uppercase tracking-widest">Date</label>
                        <input
                            type="date"
                            className="w-full text-black bg-gray-50 border-brand-spanish-gray/30 rounded-lg p-3 text-sm focus:ring-[#009688]/20 focus:border-[#009688] shadow-sm transition-all"
                            value={transactionForm.date}
                            onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-brand-spanish-gray uppercase tracking-widest">Description (Optional)</label>
                        <textarea
                            className="w-full text-black bg-gray-50 border-brand-spanish-gray/30 rounded-lg p-3 text-sm focus:ring-[#009688]/20 focus:border-[#009688]"
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
