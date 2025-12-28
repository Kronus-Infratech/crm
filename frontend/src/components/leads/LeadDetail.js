"use client";

import { useState, useEffect } from "react";
import api from "@/src/services/api";
import Heading from "@/src/components/ui/Heading";
import { HiMail, HiPhone, HiOfficeBuilding, HiCalendar, HiCurrencyDollar } from "react-icons/hi";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Cookies from "js-cookie";

export default function LeadDetail({ lead: initialLead, onLeadDeleted }) {
    const [lead, setLead] = useState(initialLead);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [previewImage, setPreviewImage] = useState(null); // For image modal
    const [deletingDoc, setDeletingDoc] = useState(null); // For delete confirmation
    const [deletingLead, setDeletingLead] = useState(false); // For lead delete confirmation
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userData = Cookies.get("user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const fetchFullDetails = async () => {
        if (!initialLead?.id) return;
        try {
            // Fetch full details to get activities
            const response = await api.get(`/leads/${initialLead.id}`);
            setLead(response.data.data);
        } catch (error) {
            console.error("Failed to fetch lead details", error);
            // toast.error("Failed to load lead details"); // Suppressed to avoid duplicate toasts on mount
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
            fetchFullDetails(); // Refresh activities
            toast.success("Note added");
        } catch (error) {
            console.error("Failed to add note", error);
            toast.error(error.response?.data?.message || "Failed to add note");
        } finally {
            setSavingNote(false);
        }
    };

    const handleDocumentClick = (doc) => {
        if (doc.type === 'IMAGE') {
            setPreviewImage(doc);
        } else {
            // For PDFs, open in new tab
            window.open(doc.url, '_blank');
        }
    };

    const confirmDeleteDocument = async () => {
        if (!deletingDoc) return;
        try {
            await api.delete(`/leads/documents/${deletingDoc.id}`);
            setDeletingDoc(null);
            fetchFullDetails(); // Refresh to update document list
            toast.success("Attachment deleted successfully");
        } catch (error) {
            console.error("Failed to delete document", error);
            toast.error(error.response?.data?.message || "Failed to delete attachment");
        }
    };

    const confirmDeleteLead = async () => {
        if (!lead) return;
        try {
            await api.delete(`/leads/${lead.id}`);
            setDeletingLead(false);
            toast.success("Lead deleted successfully");
            // Call parent callback to close modal and refresh list
            if (onLeadDeleted) {
                onLeadDeleted();
            }
        } catch (error) {
            console.error("Failed to delete lead", error);
            toast.error(error.response?.data?.message || "Failed to delete lead");
        }
    };

    const isAdmin = user && (user.roles || []).includes('ADMIN');

    if (!lead) return null;

    return (
        <div className="space-y-8">
            {/* Header Info */}
            <div className="flex items-start justify-between">
                <div>
                    <Heading level={2} className="text-3xl! mb-1">{lead.name}</Heading>
                    <div className="flex items-center gap-4 text-gray-500">
                        {lead.property && (
                            <div className="flex items-center gap-1">
                                <HiOfficeBuilding /> {lead.property}
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <HiCalendar /> Added on {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div className="text-right flex flex-col gap-2">
                    <div>
                        <div className="text-sm text-gray-500 mb-1">Estimated Value</div>
                        <div className="text-2xl font-bold text-brand-primary">
                            ₹{(lead.value || 0).toLocaleString()}
                        </div>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setDeletingLead(true)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Lead
                        </button>
                    )}
                </div>
            </div>

            {/* Grid Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DetailItem label="Email" value={lead.email || "Not provided"} icon={<HiMail />} isLink={!!lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
                <DetailItem label="Phone" value={lead.phone} icon={<HiPhone />} isLink href={`tel:${lead.phone}`} />
                <DetailItem label="Status" value={lead.status} badge />
                <DetailItem label="Priority" value={lead.priority} badge color={lead.priority === 'URGENT' ? 'red' : 'blue'} />
                <DetailItem label="Source" value={lead.source || "Not specified"} />
                <DetailItem label="Assigned To" value={lead.assignedTo ? `${lead.assignedTo.name}` : "Unassigned"} />
                {lead.followUpDate && (
                    <DetailItem label="Follow-up Date" value={new Date(lead.followUpDate).toLocaleDateString()} icon={<HiCalendar />} />
                )}
            </div>

            {/* Attachments Section */}
            {lead.documents && lead.documents.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 p-1 rounded-md text-xs">FILES</span> Attachments
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lead.documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group relative"
                            >
                                <div
                                    className="flex items-center gap-4 flex-1 cursor-pointer"
                                    onClick={() => handleDocumentClick(doc)}
                                >
                                    {doc.type === 'IMAGE' ? (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                            <img
                                                src={doc.url}
                                                alt={doc.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-lg group-hover:bg-red-200 transition-all shrink-0">
                                            <span className="text-red-600 font-bold text-xs">PDF</span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 ">{doc.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {(doc.size / 1024).toFixed(0)} KB • {new Date(doc.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                                        {doc.type === 'IMAGE' ? 'Preview' : 'Download'}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingDoc(doc);
                                    }}
                                    className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                    title="Delete attachment"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Note Section */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-4">Add Note</h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Type a note about this lead..."
                        className="flex-1 text-black px-2 rounded-lg bg-white border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    />
                    <button
                        onClick={handleAddNote}
                        disabled={savingNote || !newNote.trim()}
                        className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 font-medium"
                    >
                        {savingNote ? 'Saving...' : 'Add Note'}
                    </button>
                </div>
            </div>

            {/* Filtered Notes History */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="bg-yellow-100 text-yellow-800 p-1 rounded-md text-xs">NOTE</span> Notes History
                </h4>
                {loadingActivities ? (
                    <div className="flex items-center gap-2 text-gray-500 italic">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-primary rounded-full animate-spin"></div>
                        Loading notes...
                    </div>
                ) : lead.activities && lead.activities.filter(a => a.title === 'Note Added').length > 0 ? (
                    <div className="space-y-4">
                        {lead.activities.filter(a => a.title === 'Note Added').map((activity) => (
                            <div key={activity.id} className="p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                                <p className="text-gray-800 whitespace-pre-wrap font-medium">
                                    {activity.description}
                                </p>
                                <div className="flex gap-2 items-center mt-2">
                                    <p className="text-xs text-gray-500">
                                        {new Date(activity.createdAt).toLocaleString()}
                                    </p>
                                    <span className="text-xs text-gray-300">•</span>
                                    <p className="text-xs font-semibold text-gray-600">
                                        {activity.user ? `${activity.user.name}` : 'System'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 italic text-sm">No notes added yet.</p>
                )}
            </div>

            {/* Recent Activity (Excluding Notes) */}
            <div>
                <h4 className="font-bold text-gray-900 mb-4 border-b pb-2">System Activity Log</h4>
                {loadingActivities ? (
                    <div className="flex items-center gap-2 text-gray-500 italic">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-primary rounded-full animate-spin"></div>
                        Loading activities...
                    </div>
                ) : lead.activities && lead.activities.filter(a => a.title !== 'Note Added').length > 0 ? (
                    <div className="space-y-4">
                        {lead.activities.filter(a => a.title !== 'Note Added').map((activity) => (
                            <div key={activity.id} className="flex gap-3">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-300 shrink-0" />
                                <div>
                                    <p className="text-sm text-gray-600">{activity.description}</p>
                                    <p className="text-xs text-green-600 mt-0.5">
                                        {new Date(activity.createdAt).toLocaleString()} • <span className="font-semibold text-blue-500">{activity.user ? `${activity.user.name}` : 'System'}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No system activities recorded.</p>
                )}
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-5xl w-full flex flex-col items-center gap-4">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl font-bold bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
                        >
                            ✕
                        </button>
                        <img
                            src={previewImage.url}
                            alt={previewImage.name}
                            className="max-w-full max-h-[70vh] w-auto h-auto rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="bg-black/60 text-white p-4 rounded-lg flex items-center justify-between w-full max-w-2xl">
                            <div>
                                <p className="font-medium">{previewImage.name}</p>
                                <p className="text-sm text-gray-300">
                                    {(previewImage.size / 1024).toFixed(0)} KB
                                </p>
                            </div>
                            <a
                                href={previewImage.url}
                                download={previewImage.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Download
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingDoc && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setDeletingDoc(null)}
                >
                    <div
                        className="bg-white rounded-lg p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Attachment</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete <span className="font-semibold">{deletingDoc.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeletingDoc(null)}
                                className="px-4 py-2 text-black border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteDocument}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lead Delete Confirmation Modal */}
            {deletingLead && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setDeletingLead(false)}
                >
                    <div
                        className="bg-white rounded-lg p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Delete Lead
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete the lead for <span className="font-semibold">{lead.name}</span>? This will permanently delete:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1 text-sm">
                            <li>All lead information</li>
                            <li>All activities and notes</li>
                            <li>All attached documents</li>
                        </ul>
                        <p className="text-red-600 font-semibold text-sm mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeletingLead(false)}
                                className="px-4 py-2 text-black border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteLead}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
                            >
                                Delete Permanently
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
        <div className="p-4 rounded-xl border border-gray-100 bg-white">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                {icon} {label}
            </div>
            {isLink ? (
                <a href={href} className="text-brand-primary hover:underline font-medium truncate block">
                    {value}
                </a>
            ) : badge ? (
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-${color}-100 text-${color}-700`}>
                    {value}
                </span>
            ) : (
                <div className="font-medium text-gray-900">{value}</div>
            )}
        </div>
    )
}
