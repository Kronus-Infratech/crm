"use client";

import { useEffect, useState, use } from "react";
import api from "@/src/services/api";
import { toast } from "react-hot-toast";
import {
    HiCurrencyRupee,
    HiDocumentDuplicate,
    HiCheckCircle,
    HiXCircle,
    HiClock,
    HiChevronLeft,
    HiPlus,
    HiPencil,
    HiExternalLink,
    HiLockClosed
} from "react-icons/hi";
import Button from "@/src/components/ui/Button";
import Input from "@/src/components/ui/Input";
import { uploadFile } from "@/src/services/r2";
import { formatDate } from "@/src/utils/formatters";
import Link from "next/link";
import { useAuth } from "@/src/contexts/AuthContext";

export default function LedgerPage({ params }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;
    const { user } = useAuth();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSales, setIsSales] = useState(false);
    const [isFinance, setIsFinance] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Edit states
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [ledgerInfo, setLedgerInfo] = useState({ totalAmountToCredit: 0, paymentTimeline: "" });

    // Modals/Forms
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showDocForm, setShowDocForm] = useState(false);
    const [newEntry, setNewEntry] = useState({ amount: "", note: "", attachment: null });
    const [uploading, setUploading] = useState(false);

    // Verification state
    const [verificationData, setVerificationData] = useState({
        status: null, // 'APPROVED' or 'REJECTED'
        note: "",
        role: null // 'SALES' or 'FINANCE'
    });

    useEffect(() => {
        fetchLedger();
        if (user) {
            setIsSales(user.roles.includes('SALESMAN'));
            setIsFinance(user.roles.includes('FINANCE'));
            setIsAdmin(user.roles.includes('ADMIN'));
        }
    }, [id, user]);

    const fetchLedger = async () => {
        try {
            const res = await api.get(`/ledger/${id}`);
            setLead(res.data.data);
            setLedgerInfo({
                totalAmountToCredit: res.data.data.totalAmountToCredit || 0,
                paymentTimeline: res.data.data.paymentTimeline || ""
            });
            setLoading(false);
        } catch (error) {
            toast.error("Failed to load ledger");
            setLoading(false);
        }
    };

    const handleUpdateInfo = async () => {
        try {
            await api.patch(`/ledger/${id}/info`, ledgerInfo);
            toast.success("Ledger info updated");
            setIsEditingInfo(false);
            fetchLedger();
        } catch (error) {
            toast.error("Update failed");
        }
    };

    const handleAddPayment = async () => {
        if (!newEntry.note || !newEntry.amount) return toast.error("Amount and Note are required");
        setUploading(true);
        try {
            let attachmentUrl = null;
            let attachmentType = null;
            if (newEntry.attachment) {
                const uploaded = await uploadFile(newEntry.attachment);
                attachmentUrl = uploaded.url;
                attachmentType = uploaded.type;
            }

            await api.post(`/ledger/${id}/payment`, {
                ...newEntry,
                attachmentUrl,
                attachmentType
            });

            toast.success("Payment entry added");
            setShowPaymentForm(false);
            setNewEntry({ amount: "", note: "", attachment: null });
            fetchLedger();
        } catch (error) {
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleAddDocument = async () => {
        if (!newEntry.note || !newEntry.attachment) return toast.error("Note and Attachment are required");
        setUploading(true);
        try {
            const uploaded = await uploadFile(newEntry.attachment);
            await api.post(`/ledger/${id}/document`, {
                note: newEntry.note,
                attachmentUrl: uploaded.url,
                attachmentType: uploaded.type
            });

            toast.success("Document record added");
            setShowDocForm(false);
            setNewEntry({ amount: "", note: "", attachment: null });
            fetchLedger();
        } catch (error) {
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleVerifyPayment = async () => {
        const { entryId, status, note } = verificationData;
        if (status === 'REJECTED' && !note.trim()) {
            return toast.error("Rejection note is mandatory");
        }

        try {
            await api.patch(`/ledger/payment/${entryId}/verify`, {
                status,
                financeNotes: note
            });
            toast.success(`Payment ${status.toLowerCase()}`);
            setVerificationData({ show: false, type: null, entryId: null, status: null, note: "" });
            fetchLedger();
        } catch (error) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    const handleVerifyDoc = async () => {
        const { entryId, status, note, role } = verificationData;
        if (status === 'REJECTED' && !note.trim()) {
            return toast.error("Rejection note is mandatory");
        }

        try {
            await api.patch(`/ledger/document/${entryId}/approve`, {
                status,
                notes: note,
                role
            });
            toast.success(`Document ${status.toLowerCase()}`);
            setVerificationData({ show: false, type: null, entryId: null, status: null, note: "", role: null });
            fetchLedger();
        } catch (error) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    const handleClosure = async (type) => {
        try {
            await api.patch(`/ledger/${id}/close`, { type, notes: "Finalizing ledger" });
            toast.success(`${type} Ledger closure step completed`);
            fetchLedger();
        } catch (error) {
            toast.error(error.response?.data?.message || "Closure failed");
        }
    };

    if (loading) return <div className="p-8 text-center text-black">Loading Running Ledger...</div>;

    const isClosed = lead.ledgerStatus === 'CLOSED';
    const canEditInfo = (isSales || isAdmin) && !isClosed;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Link
                    href="/leads"
                    className="group flex items-center text-brand-spanish-gray hover:text-[#009688] transition-all font-bold uppercase text-xs tracking-[0.2em]"
                >
                    <div className="w-8 h-8 rounded-lg border border-brand-spanish-gray/20 flex items-center justify-center mr-3 group-hover:border-[#009688]/30 group-hover:bg-[#009688]/5">
                        <HiChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    </div>
                    Back to Pipeline
                </Link>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest ${lead.ledgerStatus === 'CLOSED'
                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                        : 'bg-[#8DC63F]/10 text-[#8DC63F] border-[#8DC63F]/20'
                        }`}>
                        {lead.ledgerStatus === 'CLOSED' ? <HiLockClosed className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-[#8DC63F] animate-pulse" />}
                        {lead.ledgerStatus === 'CLOSED' ? 'Securely Closed' : 'Running Ledger: High Activity'}
                    </div>
                </div>
            </div>

            {/* Main Summary Card */}
            <div className="bg-white border border-brand-spanish-gray/10 rounded-lg shadow-2xl shadow-brand-dark-gray/5 overflow-hidden">
                <div className="bg-linear-to-r from-brand-dark-gray to-brand-dark-gray/95 p-8 md:p-12 relative">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-[#009688]/10 to-transparent rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="bg-[#009688]/20 text-[#009688] text-[9px] font-black uppercase px-3 py-1 rounded-lg tracking-[0.3em] border border-[#009688]/30">Financial Ledger</span>
                                <span className="text-white/20 font-black">•</span>
                                <span className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">ID: {lead.id}</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                                {lead.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-3 text-brand-spanish-gray">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#009688]">
                                        <HiDocumentDuplicate size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#009688]">Project Value</p>
                                        <p className="text-sm font-bold text-white leading-tight">{lead.property}</p>
                                    </div>
                                </div>
                                <div className="w-px h-8 bg-white/10 hidden md:block" />
                                <div className="flex items-center gap-3 text-brand-spanish-gray">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#8DC63F]">
                                        <HiCurrencyRupee size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#8DC63F]">Verified Credit</p>
                                        <p className="text-xl font-black text-white leading-tight">₹{lead.totalAmountToCredit?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {canEditInfo && !isEditingInfo && (
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => setIsEditingInfo(true)}
                                className="shadow-2xl shadow-[#8DC63F]/30 px-8 py-4 font-black uppercase tracking-widest text-xs"
                                icon={<HiPencil />}
                            >
                                Modify Timeline
                            </Button>
                        )}
                    </div>
                </div>

                <div className="p-8 md:p-12 bg-gray-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-brand-dark-gray uppercase tracking-[0.3em] flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-[#009688] rounded-full" />
                                    Payment Architecture & Strategy
                                </h3>
                            </div>

                            {isEditingInfo ? (
                                <div className="space-y-4">
                                    <textarea
                                        className="w-full text-black bg-white border border-brand-spanish-gray/20 rounded-lg p-6 text-sm focus:ring-4 focus:ring-[#009688]/10 focus:border-[#009688] outline-none h-48 transition-all shadow-sm font-medium"
                                        value={ledgerInfo.paymentTimeline}
                                        onChange={e => setLedgerInfo({ ...ledgerInfo, paymentTimeline: e.target.value })}
                                        placeholder="Outline the payment structure, critical milestones, and expected dates..."
                                    />
                                    <div className="flex justify-end gap-3">
                                        <Button variant="ghost" className="font-bold text-xs uppercase tracking-widest" onClick={() => setIsEditingInfo(false)}>Discard</Button>
                                        <Button onClick={handleUpdateInfo} className="bg-[#009688] px-8 font-black text-xs uppercase tracking-widest">Commit Changes</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 bg-white border border-brand-spanish-gray/10 rounded-lg text-sm leading-relaxed min-h-32 shadow-sm font-medium text-brand-dark-gray whitespace-pre-wrap relative group">
                                    {lead.paymentTimeline || 'Strategic payment timeline has not been defined yet.'}
                                    {!lead.paymentTimeline && canEditInfo && (
                                        <button onClick={() => setIsEditingInfo(true)} className="absolute inset-0 flex items-center justify-center bg-gray-50/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="bg-brand-dark-gray text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl">
                                                <HiPlus /> Define Timeline
                                            </span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            <h3 className="text-xs font-black text-brand-dark-gray uppercase tracking-[0.3em] flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-[#FBB03B] rounded-full" />
                                Account Summary
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-5 bg-white border border-brand-spanish-gray/10 rounded-lg shadow-sm">
                                    <p className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest mb-2">Total Deal Volume</p>
                                    <p className="text-2xl font-black text-brand-dark-gray">₹{lead.totalAmountToCredit?.toLocaleString() || '0'}</p>
                                    <div className="mt-3 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-[#8DC63F] h-full transition-all duration-1000" style={{ width: '100%' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Payment Ledger Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-spanish-gray/10 pb-2">
                        <h2 className="text-xl font-semibold flex items-center text-[#009688]">
                            <HiCurrencyRupee className="mr-2" /> Payment Ledger
                        </h2>
                        {(isSales || isAdmin) && !lead.paymentLedgerClosedAt && (
                            <Button size="sm" variant="ghost" onClick={() => setShowPaymentForm(true)} className="text-xs bg-gray-200">
                                <HiPlus className="mr-1" /> Add Entry
                            </Button>
                        )}
                    </div>

                    <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-8 before:w-px before:bg-brand-spanish-gray/10">
                        {lead.paymentLedgerEntries?.map((entry, index) => (
                            <div key={entry.id} className="relative pl-16 group">
                                <div className={`absolute left-6 top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm ring-2 ${entry.status === 'APPROVED' ? 'ring-[#8DC63F]' : entry.status === 'REJECTED' ? 'ring-red-500' : 'ring-[#FBB03B]'} bg-white z-10 transition-transform group-hover:scale-125`} />
                                <div className="bg-white border border-brand-spanish-gray/10 rounded-lg p-6 transition-all hover:shadow-xl hover:shadow-brand-dark-gray/5 hover:-translate-y-1">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-4">
                                                <div className="text-2xl font-black text-brand-dark-gray flex items-center">
                                                    <span className="text-sm font-bold text-brand-spanish-gray mr-1">₹</span>
                                                    {entry.amount?.toLocaleString()}
                                                </div>
                                                <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${entry.status === 'APPROVED' ? 'bg-[#8DC63F]/10 text-[#8DC63F] border-[#8DC63F]/20' : entry.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-[#FBB03B]/10 text-[#FBB03B] border-[#FBB03B]/20'
                                                    }`}>
                                                    {entry.status}
                                                </div>
                                            </div>
                                            <p className="text-sm text-brand-dark-gray/80 font-medium leading-relaxed">{entry.note}</p>
                                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-brand-spanish-gray/10 flex items-center justify-center text-[10px] font-bold text-brand-spanish-gray">
                                                        {entry.uploader.name[0]}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase text-brand-spanish-gray tracking-wider">{entry.uploader.name}</span>
                                                </div>
                                                <span className="text-white/20">•</span>
                                                <span className="text-[10px] font-bold text-brand-spanish-gray uppercase tracking-wider">{formatDate(entry.createdAt)}</span>
                                                {entry.attachmentUrl && (
                                                    <>
                                                        <span className="text-white/20">•</span>
                                                        <a href={entry.attachmentUrl} target="_blank" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#009688] hover:underline decoration-2">
                                                            <HiExternalLink size={14} /> Receipt
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                            {entry.financeNotes && (
                                                <div className="mt-4 p-4 bg-red-500/5 rounded-lg border border-red-500/10 border-l-4 border-l-red-500">
                                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Finance Response</p>
                                                    <p className="text-xs text-brand-dark-gray font-medium italic">"{entry.financeNotes}"</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {entry.status === 'PENDING' && (isFinance || isAdmin) && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setVerificationData({ show: true, type: 'PAYMENT', entryId: entry.id, status: 'REJECTED', note: "" })}
                                                        className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-500 border border-red-500/20 hover:bg-red-500/5 transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => setVerificationData({ show: true, type: 'PAYMENT', entryId: entry.id, status: 'APPROVED', note: "" })}
                                                        className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[#8DC63F] text-white shadow-lg shadow-[#8DC63F]/20 hover:bg-[#7AB336] transition-colors"
                                                    >
                                                        Verify
                                                    </button>
                                                </div>
                                            )}
                                            {entry.status !== 'PENDING' && (
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-brand-spanish-gray uppercase tracking-widest mb-1">Verified By</p>
                                                    <p className="text-[10px] font-black text-brand-dark-gray truncate uppercase">{entry.verifiedBy?.name || 'Automated'}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {lead.paymentLedgerEntries?.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">No payment entries yet</div>}
                    </div>

                    {!isClosed && (
                        <div className="pt-4 flex items-center justify-between bg-white p-6 rounded-lg border border-dashed border-brand-spanish-gray/30 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-spanish-gray/10 flex items-center justify-center text-brand-spanish-gray">
                                    <HiLockClosed size={16} />
                                </div>
                                <span className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest">Payment Lifecycle</span>
                            </div>
                            {!lead.paymentLedgerClosedBySalesId ? (
                                (isSales || isAdmin) && (
                                    <Button size="sm" onClick={() => handleClosure('PAYMENT')} className="bg-[#009688] shadow-lg shadow-[#009688]/20 font-black text-[10px] uppercase tracking-widest px-6">Sales: Request Closure</Button>
                                )
                            ) : !lead.paymentLedgerClosedByFinanceId ? (
                                (isFinance || isAdmin) ? (
                                    <Button size="sm" onClick={() => handleClosure('PAYMENT')} className="bg-[#8DC63F] shadow-lg shadow-[#8DC63F]/20 font-black text-[10px] uppercase tracking-widest px-6">Finance: Authorize Closure</Button>
                                ) : (
                                    <span className="text-[10px] text-[#009688] font-black uppercase tracking-widest flex items-center bg-[#009688]/10 px-4 py-2 rounded-lg border border-[#009688]/20 animate-pulse"><HiCheckCircle className="mr-2 w-4 h-4" /> Closure Requested</span>
                                )
                            ) : (
                                <span className="text-[10px] text-[#8DC63F] font-black uppercase tracking-widest flex items-center bg-[#8DC63F]/10 px-4 py-2 rounded-lg border border-[#8DC63F]/20"><HiCheckCircle className="mr-2 w-4 h-4" /> Ledger Verified</span>
                            )}
                        </div>
                    )}
                </section>

                {/* Document Ledger Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-brand-spanish-gray/10 pb-2">
                        <h2 className="text-xl font-semibold flex items-center text-[#8DC63F]">
                            <HiDocumentDuplicate className="mr-2" /> Document Ledger
                        </h2>
                        {!lead.documentLedgerClosedAt && (
                            <Button size="sm" variant="ghost" onClick={() => setShowDocForm(true)} className="text-xs bg-gray-200">
                                <HiPlus className="mr-1" /> Add Record
                            </Button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {lead.documentLedgerEntries?.map(entry => (
                            <div key={entry.id} className="bg-white border border-brand-spanish-gray/10 rounded-lg overflow-hidden transition-all hover:shadow-xl hover:shadow-brand-dark-gray/5">
                                <div className="p-6 border-b border-brand-spanish-gray/5">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-bold text-brand-dark-gray leading-snug">{entry.note}</h4>
                                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                                <span className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest">Shared by {entry.uploader.name}</span>
                                                <span className="text-black/10">•</span>
                                                <span className="text-[10px] font-bold text-brand-spanish-gray uppercase tracking-wider">{formatDate(entry.createdAt)}</span>
                                            </div>
                                        </div>
                                        <a
                                            href={entry.attachmentUrl}
                                            target="_blank"
                                            className="group flex flex-col items-center gap-1 p-3 rounded-lg border border-brand-spanish-gray/10 hover:border-[#8DC63F]/30 hover:bg-[#8DC63F]/5 transition-all"
                                        >
                                            <HiExternalLink className="text-brand-spanish-gray group-hover:text-[#8DC63F]" size={20} />
                                            <span className="text-[8px] font-black uppercase text-brand-spanish-gray group-hover:text-[#8DC63F]">{entry.attachmentType || 'DOC'}</span>
                                        </a>
                                    </div>

                                    {(entry.salesNotes || entry.financeNotes) && (
                                        <div className="mt-4 grid grid-cols-1 gap-2">
                                            {entry.salesNotes && (
                                                <div className="text-[10px] text-brand-dark-gray/60 bg-gray-50 p-3 rounded-lg flex items-start gap-2">
                                                    <span className="font-black text-[#8DC63F] shrink-0">SALES:</span>
                                                    <span className="italic">"{entry.salesNotes}"</span>
                                                </div>
                                            )}
                                            {entry.financeNotes && (
                                                <div className="text-[10px] text-brand-dark-gray/60 bg-gray-50 p-3 rounded-lg flex items-start gap-2">
                                                    <span className="font-black text-[#009688] shrink-0">FINANCE:</span>
                                                    <span className="italic">"{entry.financeNotes}"</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2">
                                    {/* Sales Verification Pillar */}
                                    <div className={`p-4 flex items-center justify-between transition-colors border-r border-brand-spanish-gray/5 ${entry.salesApproved ? 'bg-[#8DC63F]/5' : 'bg-gray-50/50'}`}>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-spanish-gray">Sales Review</span>
                                        {entry.salesApproved ? (
                                            <div className="flex items-center gap-1.5 text-[#8DC63F] font-black text-[10px] uppercase">
                                                <HiCheckCircle size={16} /> Verified
                                            </div>
                                        ) : (
                                            (isSales || isAdmin) ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setVerificationData({ show: true, type: 'DOCUMENT', entryId: entry.id, status: 'REJECTED', note: "", role: 'SALES' })} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 border border-red-500/20"><HiXCircle size={18} /></button>
                                                    <button onClick={() => setVerificationData({ show: true, type: 'DOCUMENT', entryId: entry.id, status: 'APPROVED', note: "", role: 'SALES' })} className="px-3 py-1 bg-[#8DC63F] text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">Approve</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-brand-spanish-gray/50 font-black text-[9px] uppercase"><HiClock /> In Stream</div>
                                            )
                                        )}
                                    </div>

                                    {/* Finance Verification Pillar */}
                                    <div className={`p-4 flex items-center justify-between transition-colors ${entry.financeApproved ? 'bg-[#009688]/5' : 'bg-gray-50/50'}`}>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-spanish-gray">Finance Review</span>
                                        {entry.financeApproved ? (
                                            <div className="flex items-center gap-1.5 text-[#009688] font-black text-[10px] uppercase">
                                                <HiCheckCircle size={16} /> Audited
                                            </div>
                                        ) : (
                                            (isFinance || isAdmin) ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setVerificationData({ show: true, type: 'DOCUMENT', entryId: entry.id, status: 'REJECTED', note: "", role: 'FINANCE' })} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 border border-red-500/20"><HiXCircle size={18} /></button>
                                                    <button onClick={() => setVerificationData({ show: true, type: 'DOCUMENT', entryId: entry.id, status: 'APPROVED', note: "", role: 'FINANCE' })} className="px-3 py-1 bg-[#009688] text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">Approve</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-brand-spanish-gray/50 font-black text-[9px] uppercase"><HiClock /> In Stream</div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {lead.documentLedgerEntries?.length === 0 && (
                            <div className="text-center py-20 bg-white border border-dashed border-brand-spanish-gray/10 rounded-lg">
                                <HiDocumentDuplicate className="mx-auto text-brand-spanish-gray/20 mb-4" size={48} />
                                <p className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-[0.2em]">No documentation has been finalized</p>
                            </div>
                        )}
                    </div>

                    {!isClosed && (
                        <div className="pt-4 flex items-center justify-between bg-white p-6 rounded-lg border border-dashed border-brand-spanish-gray/30 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-spanish-gray/10 flex items-center justify-center text-brand-spanish-gray">
                                    <HiLockClosed size={16} />
                                </div>
                                <span className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest">Document Lifecycle</span>
                            </div>
                            {!lead.documentLedgerClosedBySalesId ? (
                                (isSales || isAdmin) && (
                                    <Button size="sm" onClick={() => handleClosure('DOCUMENT')} className="bg-[#8DC63F] shadow-lg shadow-[#8DC63F]/20 font-black text-[10px] uppercase tracking-widest px-6">Sales: Request Closure</Button>
                                )
                            ) : !lead.documentLedgerClosedByFinanceId ? (
                                (isFinance || isAdmin) ? (
                                    <Button size="sm" onClick={() => handleClosure('DOCUMENT')} className="bg-[#009688] shadow-lg shadow-[#009688]/20 font-black text-[10px] uppercase tracking-widest px-6">Finance: Authorize Closure</Button>
                                ) : (
                                    <span className="text-[10px] text-[#009688] font-black uppercase tracking-widest flex items-center bg-[#009688]/10 px-4 py-2 rounded-lg border border-[#009688]/20 animate-pulse"><HiCheckCircle className="mr-2 w-4 h-4" /> Closure Requested</span>
                                )
                            ) : (
                                <span className="text-[10px] text-[#8DC63F] font-black uppercase tracking-widest flex items-center bg-[#8DC63F]/10 px-4 py-2 rounded-lg border border-[#8DC63F]/20"><HiCheckCircle className="mr-2 w-4 h-4" /> All Transferred</span>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* Forms Overlay */}
            {(showPaymentForm || showDocForm) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark-gray/90 backdrop-blur-md p-4">
                    <div className="bg-white border border-brand-spanish-gray/20 rounded-lg p-10 w-full max-w-xl space-y-8 shadow-2xl relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-2 ${showPaymentForm ? 'bg-[#009688]' : 'bg-[#8DC63F]'}`}></div>
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-3xl font-black text-brand-dark-gray tracking-tighter">{showPaymentForm ? 'Financial Deposit' : 'Documentation Sync'}</h3>
                                <p className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest mt-1">Transmitting to {showPaymentForm ? 'Finance' : 'Records'} Department</p>
                            </div>
                            <button
                                onClick={() => { setShowPaymentForm(false); setShowDocForm(false); }}
                                className="w-10 h-10 rounded-full border border-brand-spanish-gray/10 flex items-center justify-center text-brand-spanish-gray hover:text-red-500 hover:border-red-500/20 transition-all shadow-sm bg-white"
                            >
                                <HiPlus className="rotate-45" size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {showPaymentForm && (
                                <Input
                                    label="Transaction Amount (INR)"
                                    type="number"
                                    placeholder="e.g. 100,000"
                                    className="text-2xl font-black text-brand-dark-gray!"
                                    value={newEntry.amount}
                                    onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })}
                                />
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest">Formal Description</label>
                                <textarea
                                    className="w-full bg-gray-50 border border-brand-spanish-gray/20 rounded-lg p-4 text-sm focus:ring-4 focus:ring-[#009688]/10 focus:border-[#009688] outline-none h-32 transition-all text-brand-dark-gray font-medium shadow-inner"
                                    placeholder={showPaymentForm ? "Detail the source and purpose of this credit..." : "Identify the document and its relevance to this transaction..."}
                                    value={newEntry.note}
                                    onChange={e => setNewEntry({ ...newEntry, note: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest">Technical Support Attachment ({showDocForm ? 'Strictly Required' : 'Critical for Audit'})</label>
                                <div className="relative group border-2 border-dashed border-brand-spanish-gray/30 rounded-lg p-10 text-center hover:border-[#009688] hover:bg-[#009688]/5 transition-all cursor-pointer overflow-hidden">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={e => setNewEntry({ ...newEntry, attachment: e.target.files[0] })}
                                    />
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-white border border-brand-spanish-gray/10 rounded-xl shadow-xl flex items-center justify-center text-[#009688] group-hover:scale-110 transition-transform">
                                            {newEntry.attachment ? <HiCheckCircle size={32} className="text-[#8DC63F]" /> : <HiExternalLink size={32} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-brand-dark-gray uppercase tracking-widest">{newEntry.attachment ? newEntry.attachment.name : 'Select or Drop File'}</p>
                                            <p className="text-[9px] text-brand-spanish-gray font-bold uppercase tracking-[0.2em] mt-2">Max Payload: 10MB (PDF/IMG)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            fullWidth
                            onClick={showPaymentForm ? handleAddPayment : handleAddDocument}
                            disabled={uploading}
                            className={`py-6 font-black uppercase tracking-[0.3em] text-xs shadow-2xl ${showPaymentForm ? 'bg-[#009688] shadow-[#009688]/30' : 'bg-[#8DC63F] shadow-[#8DC63F]/30'}`}
                        >
                            {uploading ? 'ENCRYPTING & TRANSMITTING...' : 'FINALIZE RECORD'}
                        </Button>
                    </div>
                </div>
            )}
            {/* Verification Note Modal */}
            {verificationData.show && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-brand-dark-gray/90 backdrop-blur-md p-4">
                    <div className="bg-white border border-brand-spanish-gray/20 rounded-lg p-10 w-full max-w-lg space-y-8 shadow-2xl relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-2 ${verificationData.status === 'APPROVED' ? 'bg-[#8DC63F]' : 'bg-red-500'}`}></div>
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-brand-dark-gray tracking-tighter uppercase">
                                    {verificationData.status} {verificationData.role || (verificationData.type === 'PAYMENT' ? 'FINANCE' : '')}
                                </h3>
                                <p className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest mt-1">Audit Log Entry Required</p>
                            </div>
                            <button
                                onClick={() => setVerificationData({ ...verificationData, show: false })}
                                className="w-10 h-10 rounded-full border border-brand-spanish-gray/10 flex items-center justify-center text-brand-spanish-gray hover:text-red-500 transition-all shadow-sm"
                            >
                                <HiPlus className="rotate-45" size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest flex justify-between">
                                    <span>Notes / Feedback</span>
                                    {verificationData.status === 'REJECTED' && <span className="text-red-500">[Required]</span>}
                                </label>
                                <textarea
                                    className="w-full bg-gray-50 border border-brand-spanish-gray/20 rounded-lg p-4 text-sm focus:ring-4 focus:ring-[#009688]/10 focus:border-[#009688] outline-none h-32 transition-all text-brand-dark-gray font-medium shadow-inner"
                                    placeholder={verificationData.status === 'REJECTED' ? "Specify reason for transaction rejection..." : "Official audit comments..."}
                                    value={verificationData.note}
                                    onChange={e => setVerificationData({ ...verificationData, note: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                fullWidth
                                variant="ghost"
                                className="font-black text-xs uppercase tracking-[0.2em] py-6"
                                onClick={() => setVerificationData({ ...verificationData, show: false })}
                            >
                                Discard
                            </Button>
                            <Button
                                fullWidth
                                onClick={verificationData.type === 'PAYMENT' ? handleVerifyPayment : handleVerifyDoc}
                                className={`py-6 font-black uppercase tracking-[0.2em] text-xs shadow-xl ${verificationData.status === 'APPROVED' ? 'bg-[#8DC63F] shadow-[#8DC63F]/20' : 'bg-red-500 shadow-red-500/20'}`}
                            >
                                Confirm {verificationData.status.slice(0, 3)}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
