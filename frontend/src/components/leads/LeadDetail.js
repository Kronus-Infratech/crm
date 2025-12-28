"use client";

import { useState, useEffect } from "react";
import api from "@/src/services/api";
import Heading from "@/src/components/ui/Heading";
import { HiMail, HiPhone, HiOfficeBuilding, HiCalendar, HiCurrencyDollar } from "react-icons/hi";

export default function LeadDetail({ lead: initialLead }) {
    const [lead, setLead] = useState(initialLead);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    const fetchFullDetails = async () => {
        if (!initialLead?.id) return;
        try {
            // Fetch full details to get activities
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
            fetchFullDetails(); // Refresh activities
        } catch (error) {
            console.error("Failed to add note", error);
        } finally {
            setSavingNote(false);
        }
    };

    if (!lead) return null;

    return (
        <div className="space-y-8">
            {/* Header Info */}
            <div className="flex items-start justify-between">
                <div>
                    <Heading level={2} className="text-3xl! mb-1">{lead.firstName} {lead.lastName}</Heading>
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
                <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Estimated Value</div>
                    <div className="text-2xl font-bold text-brand-primary">
                        ₹{(lead.estimatedValue || 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Grid Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DetailItem label="Email" value={lead.email} icon={<HiMail />} isLink href={`mailto:${lead.email}`} />
                <DetailItem label="Phone" value={lead.phone} icon={<HiPhone />} isLink href={`tel:${lead.phone}`} />
                <DetailItem label="Status" value={lead.status} badge />
                <DetailItem label="Priority" value={lead.priority} badge color={lead.priority === 'URGENT' ? 'red' : 'blue'} />
                <DetailItem label="Source" value={lead.source} />
                <DetailItem label="Assigned To" value={lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : "Unassigned"} />
            </div>

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
                {lead.activities && lead.activities.filter(a => a.title === 'Note Added').length > 0 ? (
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
                                        {activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'System'}
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
                                        {new Date(activity.createdAt).toLocaleString()} • <span className="font-semibold text-blue-500">{activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'System'}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No system activities recorded.</p>
                )}
            </div>
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
