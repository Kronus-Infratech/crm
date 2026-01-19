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
        show: false,
        type: null, // 'PAYMENT' or 'DOCUMENT'
        entryId: null,
        status: null, // 'APPROVED' or 'REJECTED'
        note: ""
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
        const { entryId, status, note } = verificationData;
        if (status === 'REJECTED' && !note.trim()) {
            return toast.error("Rejection note is mandatory");
        }

        try {
            await api.patch(`/ledger/document/${entryId}/approve`, {
                status,
                notes: note
            });
            toast.success(`Document ${status.toLowerCase()}`);
            setVerificationData({ show: false, type: null, entryId: null, status: null, note: "" });
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
            <div className="flex items-center justify-between">
                <Link href="/leads" className="flex items-center text-gray-600 hover:text-gray-400  transition-colors">
                    <HiChevronLeft className="w-5 h-5 mr-1" />
                    Back to Leads
                </Link>
                <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${lead.ledgerStatus === 'CLOSED' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-600'
                        }`}>
                        {lead.ledgerStatus === 'CLOSED' ? <HiLockClosed className="inline mr-1" /> : null}
                        {lead.ledgerStatus === 'CLOSED' ? 'Ledger Closed' : 'Running Ledger Active'}
                    </span>
                </div>
            </div>

            {/* Main Title & Editable Ledger Info */}
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-200/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-blue-500/5 to-transparent rounded-full -mr-20 -mt-20"></div>
                <div className="relative flex justify-between items-start mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-sm tracking-widest">Running Ledger</span>
                            <span className="text-gray-300">/</span>
                            <span className="text-gray-400 text-xs font-bold uppercase">{lead.id.slice(-8)}</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-3">
                            {lead.name}
                        </h1>
                        <p className="text-lg text-gray-500 font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {lead.property}
                        </p>
                    </div>
                    {canEditInfo && !isEditingInfo && (
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => setIsEditingInfo(true)}
                            className="shadow-lg shadow-blue-200"
                            icon={<HiPencil />}
                        >
                            Edit Timeline
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest">Total Credit Amount (Sum of Payments)</label>
                        <div className="text-3xl font-black text-emerald-500 flex items-center bg-emerald-500/5 w-fit px-4 py-2 rounded-xl border border-emerald-500/20">
                            <HiCurrencyRupee className="mr-1" /> {lead.totalAmountToCredit?.toLocaleString() || '0'}
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium italic">* This field is automatically updated upon payment approval.</p>
                    </div>
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest">Payment Timeline & Notes</label>
                        {isEditingInfo ? (
                            <textarea
                                className="w-full text-black bg-white border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 transition-all shadow-inner"
                                value={ledgerInfo.paymentTimeline}
                                onChange={e => setLedgerInfo({ ...ledgerInfo, paymentTimeline: e.target.value })}
                                placeholder="Enter payment structure, dates, and milestones..."
                            />
                        ) : (
                            <div className="p-5 bg-gray-50 text-gray-700 rounded-2xl text-sm leading-relaxed min-h-32 border border-gray-100 shadow-sm whitespace-pre-wrap">
                                {lead.paymentTimeline || 'No timeline defined'}
                            </div>
                        )}
                    </div>
                </div>

                {isEditingInfo && (
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setIsEditingInfo(false)}>Cancel</Button>
                        <Button onClick={handleUpdateInfo}>Save Changes</Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Payment Ledger Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h2 className="text-xl font-semibold flex items-center text-blue-400">
                            <HiCurrencyRupee className="mr-2" /> Payment Ledger
                        </h2>
                        {(isSales || isAdmin) && !lead.paymentLedgerClosedAt && (
                            <Button size="sm" variant="ghost" onClick={() => setShowPaymentForm(true)} className="text-xs bg-gray-200">
                                <HiPlus className="mr-1" /> Add Entry
                            </Button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {lead.paymentLedgerEntries?.map(entry => (
                            <div key={entry.id} className="bg-white/5 border border-white/10 rounded-xl p-4 transition-all hover:bg-white/[0.07]">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center text-lg font-semibold text-black">
                                            <HiCurrencyRupee className="mr-1 text-emerald-400" /> {entry.amount?.toLocaleString()}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                                        <div className="flex items-center mt-3 space-x-3 text-sm text-gray-500 uppercase tracking-widest">
                                            <span>{entry.uploader.name}</span>
                                            <span>{formatDate(entry.createdAt)}</span>
                                            {entry.attachmentUrl && (
                                                <a href={entry.attachmentUrl} target="_blank" className="flex items-center text-blue-400 hover:underline">
                                                    <HiExternalLink className="mr-1" /> {entry.attachmentType}
                                                </a>
                                            )}
                                        </div>
                                        {entry.financeNotes && (
                                            <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 italic">
                                                Finance Note: {entry.financeNotes}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end space-y-2">
                                        {entry.status === 'PENDING' ? (
                                            (isFinance || isAdmin) ? (
                                                <div className="flex space-x-2">
                                                    <Button size="xs" variant="ghost" onClick={() => setVerificationData({ show: true, type: 'PAYMENT', entryId: entry.id, status: 'REJECTED', note: "" })} className="text-red-400 hover:bg-red-400/10">Reject</Button>
                                                    <Button size="xs" onClick={() => setVerificationData({ show: true, type: 'PAYMENT', entryId: entry.id, status: 'APPROVED', note: "" })} className="bg-emerald-600 hover:bg-emerald-500">Approve</Button>
                                                </div>
                                            ) : (
                                                <span className="flex items-center text-[10px] font-bold text-yellow-500/80 uppercase tracking-tighter">
                                                    <HiClock className="mr-1" /> Verification Pending
                                                </span>
                                            )
                                        ) : (
                                            <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${entry.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'
                                                }`}>
                                                {entry.status === 'APPROVED' ? 'Approved by Finance Dept' : 'Rejected'}
                                                <div className="text-[10px] opacity-60 normal-case font-normal">
                                                    {entry.verifiedBy?.name} on {formatDate(entry.verifiedAt)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {lead.paymentLedgerEntries?.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">No payment entries yet</div>}
                    </div>

                    {!isClosed && (
                        <div className="pt-4 flex items-center justify-between bg-white/2 p-4 rounded-xl border border-dashed border-white/20">
                            <span className="text-sm text-gray-400 capitalize">Payment Ledger Closure</span>
                            {!lead.paymentLedgerClosedBySalesId ? (
                                (isSales || isAdmin) && (
                                    <Button size="sm" onClick={() => handleClosure('PAYMENT')} className="bg-blue-600">Sales: Request Closure</Button>
                                )
                            ) : !lead.paymentLedgerClosedByFinanceId ? (
                                (isFinance || isAdmin) ? (
                                    <Button size="sm" onClick={() => handleClosure('PAYMENT')} className="bg-emerald-600">Finance: Authorize Closure</Button>
                                ) : (
                                    <span className="text-xs text-blue-400 flex items-center"><HiCheckCircle className="mr-1" /> Closure Requested by Sales</span>
                                )
                            ) : (
                                <span className="text-xs text-emerald-400 flex items-center"><HiCheckCircle className="mr-1" /> Ledger Closed & Verified</span>
                            )}
                        </div>
                    )}
                </section>

                {/* Document Ledger Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h2 className="text-xl font-semibold flex items-center text-emerald-400">
                            <HiDocumentDuplicate className="mr-2" /> Document Ledger
                        </h2>
                        {!lead.documentLedgerClosedAt && (
                            <Button size="sm" variant="ghost" onClick={() => setShowDocForm(true)} className="text-xs bg-gray-200">
                                <HiPlus className="mr-1" /> Add Record
                            </Button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {lead.documentLedgerEntries?.map(entry => (
                            <div key={entry.id} className="bg-white/5 border border-white/10 rounded-xl p-4 transition-all hover:bg-white/[0.07]">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="text-sm text-white font-medium">{entry.note}</p>
                                        <div className="flex items-center mt-3 space-x-3 text-sm text-gray-500 uppercase tracking-widest">
                                            <span>By: {entry.uploader.name}</span>
                                            <span>{formatDate(entry.createdAt)}</span>
                                            <a href={entry.attachmentUrl} target="_blank" className="flex items-center text-emerald-400 hover:underline">
                                                <HiExternalLink className="mr-1" /> View {entry.attachmentType}
                                            </a>
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2">
                                            {entry.salesNotes && (
                                                <div className="text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded-lg italic">
                                                    Sales feedback: {entry.salesNotes}
                                                </div>
                                            )}
                                            {entry.financeNotes && (
                                                <div className="text-[10px] text-blue-700 bg-blue-50 p-2 rounded-lg italic">
                                                    Finance feedback: {entry.financeNotes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    {/* Sales Approval Status */}
                                    <div className={`p-2 rounded-lg border ${entry.salesApproved ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                        <div className="text-[8px] uppercase font-bold text-center">Sales Approval</div>
                                        <div className="mt-1 flex items-center justify-center gap-2">
                                            {entry.salesApproved ? (
                                                <HiCheckCircle className="w-4 h-4" />
                                            ) : (
                                                (isSales || isAdmin) ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setVerificationData({ show: true, type: 'DOCUMENT', entryId: entry.id, status: 'APPROVED', note: "" })} className="text-[10px] text-emerald-600 hover:underline font-bold">Approve</button>
                                                        <button onClick={() => setVerificationData({ show: true, type: 'DOCUMENT', entryId: entry.id, status: 'REJECTED', note: "" })} className="text-[10px] text-red-600 hover:underline font-bold">Reject</button>
                                                    </div>
                                                ) : (
                                                    <HiClock className="w-4 h-4 opacity-40" />
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Finance Approval Status */}
                                    <div className={`p-2 rounded-lg border ${entry.financeApproved ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                        <div className="text-[8px] uppercase font-bold text-center">Finance Approval</div>
                                        <div className="mt-1 flex items-center justify-center gap-2">
                                            {entry.financeApproved ? (
                                                <HiCheckCircle className="w-4 h-4" />
                                            ) : (
                                                (isFinance || isAdmin) ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setVerificationData({ show: true, type: 'DOCUMENT', entryId: entry.id, status: 'APPROVED', note: "" })} className="text-[10px] text-blue-600 hover:underline font-bold">Approve</button>
                                                        <button onClick={() => setVerificationData({ show: true, type: 'DOCUMENT', entryId: entry.id, status: 'REJECTED', note: "" })} className="text-[10px] text-red-600 hover:underline font-bold">Reject</button>
                                                    </div>
                                                ) : (
                                                    <HiClock className="w-4 h-4 opacity-40" />
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {lead.documentLedgerEntries?.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">No document transfers recorded</div>}
                    </div>

                    {!isClosed && (
                        <div className="pt-4 flex items-center justify-between bg-white/2 p-4 rounded-xl border border-dashed border-white/20">
                            <span className="text-sm text-gray-400 capitalize">Document Ledger Closure</span>
                            {!lead.documentLedgerClosedBySalesId ? (
                                (isSales || isAdmin) && (
                                    <Button size="sm" onClick={() => handleClosure('DOCUMENT')} className="bg-emerald-600">Sales: Request Closure</Button>
                                )
                            ) : !lead.documentLedgerClosedByFinanceId ? (
                                (isFinance || isAdmin) ? (
                                    <Button size="sm" onClick={() => handleClosure('DOCUMENT')} className="bg-blue-600">Finance: Authorize Closure</Button>
                                ) : (
                                    <span className="text-xs text-blue-400 flex items-center"><HiCheckCircle className="mr-1" /> Closure Requested by Sales</span>
                                )
                            ) : (
                                <span className="text-xs text-emerald-400 flex items-center"><HiCheckCircle className="mr-1" /> All documents transferred</span>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {/* Forms Overlay (Simplified for brevity) */}
            {(showPaymentForm || showDocForm) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold">{showPaymentForm ? 'New Payment Entry' : 'New Document Record'}</h3>
                            <button onClick={() => { setShowPaymentForm(false); setShowDocForm(false); }}><HiXCircle className="w-6 h-6 text-gray-500" /></button>
                        </div>

                        <div className="space-y-4">
                            {showPaymentForm && (
                                <Input
                                    label="Amount Credited"
                                    type="number"
                                    placeholder="e.g. 50000"
                                    value={newEntry.amount}
                                    onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })}
                                />
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Note / Description</label>
                                <textarea
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none h-24"
                                    placeholder={showPaymentForm ? "Part payment for plot registration..." : "GST invoice hand-over completed..."}
                                    value={newEntry.note}
                                    onChange={e => setNewEntry({ ...newEntry, note: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Attachment ({showDocForm ? 'Mandatory' : 'Optional'})</label>
                                <input
                                    type="file"
                                    className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                    onChange={e => setNewEntry({ ...newEntry, attachment: e.target.files[0] })}
                                />
                            </div>
                        </div>

                        <Button
                            fullWidth
                            onClick={showPaymentForm ? handleAddPayment : handleAddDocument}
                            disabled={uploading}
                        >
                            {uploading ? 'Processing File...' : 'Save Entry'}
                        </Button>
                    </div>
                </div>
            )}
            {/* Verification Note Modal */}
            {verificationData.show && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg space-y-6 shadow-2xl relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-2 ${verificationData.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-gray-900 capitalize">
                                {verificationData.status.toLowerCase()} {verificationData.type === 'PAYMENT' ? 'Payment' : 'Document'}
                            </h3>
                            <button onClick={() => setVerificationData({ ...verificationData, show: false })}><HiXCircle className="w-8 h-8 text-gray-300 hover:text-gray-500 transition-colors" /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    Notes / Feedback {verificationData.status === 'REJECTED' && <span className="text-red-500">*Mandatory</span>}
                                </label>
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 transition-all text-black"
                                    placeholder={verificationData.status === 'REJECTED' ? "Reason for rejection..." : "Any additional comments (optional)..."}
                                    value={verificationData.note}
                                    onChange={e => setVerificationData({ ...verificationData, note: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                fullWidth
                                variant="ghost"
                                onClick={() => setVerificationData({ ...verificationData, show: false })}
                            >
                                Cancel
                            </Button>
                            <Button
                                fullWidth
                                onClick={verificationData.type === 'PAYMENT' ? handleVerifyPayment : handleVerifyDoc}
                                className={verificationData.status === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                            >
                                Confirm {verificationData.status.toLowerCase()}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
