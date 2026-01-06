"use client";

import { useState, useEffect } from "react";
import api from "@/src/services/api";
import Heading from "@/src/components/ui/Heading";
import {
    HiMail, HiPhone, HiCalendar, HiCurrencyRupee, HiLocationMarker,
    HiUserCircle, HiTag, HiClock, HiPaperClip, HiTrash, HiX, HiExternalLink,
    HiIdentification, HiChartBar, HiDownload
} from "react-icons/hi";
import { toast } from "react-hot-toast";
import { useAuth } from "@/src/contexts/AuthContext";
import { formatNumber, formatDate, formatDateTime } from "@/src/utils/formatters";

export default function LeadDetail({ lead: initialLead, onLeadDeleted }) {
    const { user } = useAuth();
    const [lead, setLead] = useState(initialLead);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [deletingDoc, setDeletingDoc] = useState(null);
    const [isDeletingDoc, setIsDeletingDoc] = useState(false);
    const [deletingLead, setDeletingLead] = useState(false);
    const [isDeletingLead, setIsDeletingLead] = useState(false);

    const fetchFullDetails = async () => {
        if (!initialLead?.id) return;
        try {
            const response = await api.get(`/leads/${initialLead.id}`);
            setLead(response.data.data);
        } catch (error) {
            console.error("Failed to fetch lead details", error);
        } finally {
            setLoadingActivities(false);
        }
    };

    useEffect(() => {
        fetchFullDetails();
    }, [initialLead]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setSavingNote(true);
        try {
            await api.put(`/leads/${lead.id}`, { activityNote: newNote });
            setNewNote("");
            fetchFullDetails();
            toast.success("Note added successfully");
        } catch (error) {
            console.error("Failed to add note", error);
            toast.error(error.response?.data?.message || "Failed to add note");
        } finally {
            setSavingNote(false);
        }
    };

    const handleDocumentClick = (doc) => {
        if (doc.type === 'IMAGE') setPreviewImage(doc);
        else window.open(doc.url, '_blank');
    };

    const confirmDeleteDocument = async () => {
        if (!deletingDoc) return;
        setIsDeletingDoc(true);
        try {
            await api.delete(`/leads/documents/${deletingDoc.id}`);
            setDeletingDoc(null);
            fetchFullDetails();
            toast.success("Attachment removed");
        } catch (error) {
            console.error("Failed to delete document", error);
            toast.error(error.response?.data?.message || "Failed to delete attachment");
        } finally {
            setIsDeletingDoc(false);
        }
    };

    const confirmDeleteLead = async () => {
        if (!lead) return;
        setIsDeletingLead(true);
        try {
            await api.delete(`/leads/${lead.id}`);
            setDeletingLead(false);
            toast.success("Lead permanentely deleted");
            if (onLeadDeleted) onLeadDeleted();
        } catch (error) {
            console.error("Failed to delete lead", error);
            toast.error(error.response?.data?.message || "Failed to delete lead");
        } finally {
            setIsDeletingLead(false);
        }
    };

    const isAdmin = user && (user.roles.includes('ADMIN') || user.roles.includes('EXECUTIVE') || user.roles.includes('DIRECTOR'));

    if (!lead) return null;

    const statusColors = {
        'NEW': 'bg-blue-100 text-blue-700',
        'CONTACTED': 'bg-indigo-100 text-indigo-700',
        'INTERESTED': 'bg-purple-100 text-purple-700',
        'WON': 'bg-green-100 text-green-700',
        'LOST': 'bg-red-100 text-red-700',
        'SITE_VISIT': 'bg-amber-100 text-amber-700',
        'NEGOTIATION': 'bg-orange-100 text-orange-700',
    };

    const priorityColors = {
        'LOW': 'bg-gray-100 text-gray-700 border-gray-200',
        'MEDIUM': 'bg-blue-50 text-blue-700 border-blue-200',
        'HIGH': 'bg-orange-50 text-orange-700 border-orange-200',
        'URGENT': 'bg-red-50 text-red-700 border-red-200 animate-pulse',
    };

    return (
        <div className="flex flex-col gap-6 text-black">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 mb-1">
                        <Heading level={2} className="text-3xl! font-extrabold tracking-tight text-gray-900">{lead.name}</Heading>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${priorityColors[lead.priority] || 'bg-gray-100 text-gray-700'}`}>
                            {lead.priority} Priority
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-gray-500 text-sm">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-200 rounded-lg">
                            <HiTag className="text-gray-400" />
                            <span className={`font-semibold ${statusColors[lead.status]?.split(' ')[1] || 'text-gray-700'}`}>{lead.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <HiCalendar className="text-gray-400" />
                            Added {formatDate(lead.createdAt)}
                        </div>
                        {lead.source && (
                            <div className="flex items-center gap-1.5">
                                <HiChartBar className="text-gray-400" />
                                via {lead.source}
                            </div>
                        )}
                    </div>
                </div>

                {lead.feedbackSubmitted && (
                    <div className="flex items-center gap-2 mt-4 md:mt-0 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex text-amber-500">
                            {[...Array(5)].map((_, i) => (
                                <svg key={i} className={`w-5 h-5 ${i < lead.feedbackRating ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                        <span className="font-bold text-amber-900 text-sm">{lead.feedbackRating}.0 Customer Rating</span>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <button
                            onClick={() => setDeletingLead(true)}
                            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                            title="Delete Lead"
                        >
                            <HiTrash size={22} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Core Info & Timeline */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-linear-to-br from-indigo-500 to-indigo-600 p-5 rounded-lg text-white shadow-lg shadow-indigo-100">
                            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Deal Value</p>
                            <div className="flex items-center gap-2">
                                <HiCurrencyRupee size={24} className="text-indigo-200" />
                                <span className="text-2xl font-black">₹{formatNumber(lead.value)}</span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Property Interest</p>
                                <div className="flex items-center gap-2 text-gray-900">
                                    <HiLocationMarker size={20} className="text-indigo-500" />
                                    <span className="text-lg font-bold">{lead.property || "No Property Assigned"}</span>
                                </div>
                            </div>
                        </div>
                        {lead.followUpDate && (
                            <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="text-right">
                                    <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Next Follow-up</p>
                                    <div className="text-indigo-600 font-bold text-sm bg-indigo-50 px-2 py-1 rounded-lg">
                                        {formatDate(lead.followUpDate)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                            <HiIdentification className="text-indigo-500" />
                            <h3 className="font-bold text-gray-900">Contact Details</h3>
                        </div>
                        <div className="grid grid-cols-1">
                            <div className="p-6 flex items-center gap-4 group">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                                    <HiPhone size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-0.5">Primary Phone</p>
                                    <a href={`tel:${lead.phone}`} className="text-base font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                                        {lead.phone}
                                    </a>
                                </div>
                            </div>
                            <div className="p-6 flex items-center gap-4 group">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                                    <HiMail size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-0.5">Email Address</p>
                                    {lead.email ? (
                                        <a href={`mailto:${lead.email}`} className="text-base font-bold text-gray-900 hover:text-indigo-600 transition-colors truncate block max-w-[220px]">
                                            {lead.email}
                                        </a>
                                    ) : (
                                        <span className="text-gray-300 font-medium lowercase">no email available</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Feedback Logic */}
                    {lead.feedbackSubmitted && lead.feedbackComment && (
                        <div className="mt-8 bg-amber-50/50 rounded-lg border border-amber-100 overflow-hidden">
                            <div className="px-6 py-4 bg-amber-100/50 border-b border-amber-100 flex items-center gap-2">
                                <span className="text-amber-500">★</span>
                                <h3 className="font-bold text-amber-900">Customer Feedback</h3>
                            </div>
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl text-amber-400 opacity-20 font-serif">"</div>
                                    <p className="text-gray-700 italic flex-1 pt-1">{lead.feedbackComment}</p>
                                    <div className="text-4xl text-amber-400 opacity-20 font-serif rotate-180">"</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs / Content Sections */}
                    <div className="space-y-6">
                        {/* Timeline Header */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <HiClock className="text-indigo-500" size={20} />
                                <h3 className="text-lg font-bold text-gray-900">Activity Timeline</h3>
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Latest 10 Interactions</span>
                        </div>

                        {/* Add Note Input Area */}
                        <div className="relative">
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Write an update or call summary..."
                                className="w-full h-24 p-4 pb-12 text-black rounded-lg border-2 border-gray-100 focus:border-indigo-500 focus:ring-0 transition-all text-sm resize-none bg-gray-50/30"
                            />
                            <div className="absolute bottom-3 right-3">
                                <button
                                    onClick={handleAddNote}
                                    disabled={savingNote || !newNote.trim()}
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-bold text-sm shadow-md shadow-indigo-100 transition-all active:scale-95"
                                >
                                    {savingNote ? 'Posting...' : 'Post Note'}
                                </button>
                            </div>
                        </div>

                        {/* Timeline Visualization */}
                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                            {loadingActivities ? (
                                <div className="py-12 flex flex-col items-center gap-4">
                                    <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-sm text-gray-400 font-medium">Syncing timeline...</p>
                                </div>
                            ) : lead.activities && lead.activities.length > 0 ? (
                                lead.activities.map((activity) => (
                                    <div key={activity.id} className="relative">
                                        {/* Dot */}
                                        <div className={`absolute -left-[29px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ring-4 ring-white ${activity.title !== 'Note Added' ? 'bg-indigo-500' : 'bg-amber-500'}`} />

                                        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-black uppercase tracking-wider text-indigo-600">{activity.title}</p>
                                                <p className="text-[10px] font-bold text-gray-400">{formatDateTime(activity.createdAt)}</p>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                                {activity.description}
                                            </p>
                                            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                                                {/* <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                    <HiUserCircle className="text-gray-400" />
                                                </div> */}
                                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">By {activity.user?.name || 'Automated System'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
                                    <HiClock size={32} className="mb-2 opacity-20" />
                                    <p className="text-sm font-bold">No activity history yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Sidebar */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Assignment Block */}
                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <HiUserCircle className="text-indigo-500" size={20} />
                            Responsibility
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                {/* <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                    {(lead.assignedTo?.name || "U")[0].toUpperCase()}
                                </div> */}
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Assigned Agent</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{lead.assignedTo?.name || "Unassigned"}</p>
                                    {lead.assignedTo?.email && <p className="text-xs text-indigo-500 font-medium truncate">{lead.assignedTo.email}</p>}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-50">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Created By</p>
                                <p className="text-xs font-bold text-gray-600">{lead.createdBy?.name || "System"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Attachments Sidebar */}
                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <HiPaperClip className="text-indigo-500" size={20} />
                                Documents
                            </h3>
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                {lead.documents?.length || 0}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {lead.documents && lead.documents.length > 0 ? (
                                lead.documents.map((doc) => (
                                    <div key={doc.id} className="group relative bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-100 p-3 rounded-xl transition-all cursor-pointer flex items-center gap-3">
                                        <div onClick={() => handleDocumentClick(doc)} className="flex items-center gap-3 flex-1 min-w-0">
                                            {doc.type === 'IMAGE' ? (
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                                                    <img src={doc.url} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-lg shrink-0 font-black text-[10px]">PDF</div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate pr-4">{doc.name}</p>
                                                <p className="text-[10px] font-medium text-gray-400 uppercase">{(doc.size / 1024).toFixed(0)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setDeletingDoc(doc)}
                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1.5 transition-all"
                                        >
                                            <HiTrash size={16} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center bg-gray-50 border-2 border-dashed border-gray-100 rounded-lg">
                                    <HiPaperClip size={24} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">No file attachments</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals & Overlays */}
            {/* Image Preview */}
            {previewImage && (
                <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-5xl w-full flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"><HiX size={32} /></button>
                        <div className="bg-white p-2 rounded-lg shadow-2xl overflow-hidden max-h-[70vh] flex">
                            <img src={previewImage.url} alt={previewImage.name} className="object-contain max-h-full" />
                        </div>
                        <div className="flex items-center justify-between w-full max-w-2xl bg-white/10 p-5 rounded-lg backdrop-blur-md border border-white/10 text-white">
                            <div>
                                <p className="font-bold text-lg">{previewImage.name}</p>
                                <p className="text-sm text-white/60">Uploaded on {formatDate(previewImage.createdAt)}</p>
                            </div>
                            <a href={previewImage.url} download={previewImage.name} target="_blank" className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-xl shadow-black/20">
                                <HiDownload /> Download
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Doc */}
            {deletingDoc && (
                <div className="fixed inset-0 bg-black/40 z-70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDeletingDoc(null)}>
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-lg flex items-center justify-center mb-6 mx-auto">
                            <HiTrash size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 text-center mb-2">Remove Attachment?</h3>
                        <p className="text-gray-500 text-center mb-8 text-sm leading-relaxed">
                            Deleting <span className="font-bold text-gray-900">{deletingDoc.name}</span> will remove it permanently from this lead record.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setDeletingDoc(null)} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-all" disabled={isDeletingDoc}>Cancel</button>
                            <button onClick={confirmDeleteDocument} className="flex-1 py-4 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-2" disabled={isDeletingDoc}>
                                {isDeletingDoc ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Deleting...
                                    </>
                                ) : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Lead */}
            {deletingLead && (
                <div className="fixed inset-0 bg-black/60 z-70 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setDeletingLead(false)}>
                    <div className="bg-white rounded-lg p-10 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-8 mx-auto ring-8 ring-red-50">
                            <HiTrash size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 text-center mb-4">Delete Lead?</h3>
                        <p className="text-gray-500 text-center mb-6 leading-relaxed">
                            You are about to permanently delete <span className="font-bold text-gray-900">{lead.name}</span>. This will destroy all associated records, activities, and documents.
                        </p>
                        <div className="bg-red-50 p-4 rounded-lg mb-8 border border-red-100">
                            <p className="text-red-700 text-xs font-bold border-l-4 border-red-500 pl-3">This action is irreversible and will be logged.</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setDeletingLead(false)} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-all" disabled={isDeletingLead}>Go Back</button>
                            <button onClick={confirmDeleteLead} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-xl shadow-red-200 transition-all flex items-center justify-center gap-2" disabled={isDeletingLead}>
                                {isDeletingLead ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Destroying...
                                    </>
                                ) : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailItem({ label, value, icon, isLink, href, badge, color = 'gray' }) {
    if (!value) return null;

    return (
        <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5">
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="text-indigo-500 opacity-70">{icon}</span> {label}
            </div>
            {isLink ? (
                <a href={href} className="text-sm text-indigo-600 hover:text-indigo-800 font-bold truncate block transition-colors">
                    {value}
                </a>
            ) : badge ? (
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${color === 'red' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {value}
                </span>
            ) : (
                <div className="text-sm font-bold text-gray-900">{value}</div>
            )}
        </div>
    )
}
