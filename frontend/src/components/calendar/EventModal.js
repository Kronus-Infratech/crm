"use client";

import { useState, useEffect } from "react";
import Modal from "@/src/components/ui/Modal";
import Button from "@/src/components/ui/Button";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import { HiOutlineCalendar, HiOutlineClock, HiOutlineDocumentText, HiOutlineTag } from "react-icons/hi";
import toast from "react-hot-toast";
import api from "@/src/services/api";

export default function EventModal({ isOpen, onClose, onEventSaved, event = null, initialDate = null }) {
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState([]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start: "",
        end: "",
        allDay: false,
        type: "EVENT",
        leadId: ""
    });

    useEffect(() => {
        if (isOpen) {
            fetchLeads();
            if (event) {
                setFormData({
                    title: event.title || "",
                    description: event.description || "",
                    start: event.start ? new Date(event.start).toISOString().slice(0, 16) : "",
                    end: event.end ? new Date(event.end).toISOString().slice(0, 16) : "",
                    allDay: event.allDay || false,
                    type: event.type || "EVENT",
                    leadId: event.leadId || ""
                });
            } else {
                const now = initialDate ? new Date(initialDate) : new Date();
                if (!initialDate) now.setMinutes(0);

                const startStr = now.toISOString().slice(0, 16);
                const end = new Date(now.getTime() + 60 * 60 * 1000);
                const endStr = end.toISOString().slice(0, 16);

                setFormData({
                    title: "",
                    description: "",
                    start: startStr,
                    end: endStr,
                    allDay: false,
                    type: "EVENT",
                    leadId: ""
                });
            }
        }
    }, [isOpen, event, initialDate]);

    const fetchLeads = async () => {
        try {
            const res = await api.get("/leads?limit=200");
            const leadData = res.data.data?.leads || res.data.data || res.data;
            setLeads(Array.isArray(leadData) ? leadData : []);
        } catch (error) {
            console.error("Failed to fetch leads:", error);
            setLeads([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (event?.id && !event.id.startsWith('followup-')) {
                await api.put(`/events/${event.id}`, formData);
                toast.success("Event updated successfully");
            } else {
                await api.post("/events", formData);
                toast.success("Event scheduled successfully");
            }
            onEventSaved();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save event");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!event?.id || event.id.startsWith('followup-')) return;
        if (!confirm("Are you sure you want to delete this event?")) return;

        setLoading(true);
        try {
            await api.delete(`/events/${event.id}`);
            toast.success("Event deleted");
            onEventSaved();
            onClose();
        } catch (error) {
            toast.error("Failed to delete event");
        } finally {
            setLoading(false);
        }
    };

    const isFollowUp = event?.id?.startsWith('followup-');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isFollowUp ? "Follow-up Details" : (event ? "Edit Event" : "Schedule New Event")}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                    label="Event Title"
                    icon={HiOutlineCalendar}
                    placeholder="e.g. Client Meeting, Site Visit"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    disabled={isFollowUp}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        type="datetime-local"
                        label="Start Time"
                        icon={HiOutlineClock}
                        value={formData.start}
                        onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                        required
                        disabled={isFollowUp}
                    />
                    <Input
                        type="datetime-local"
                        label="End Time"
                        icon={HiOutlineClock}
                        value={formData.end}
                        onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                        required
                        disabled={isFollowUp}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Event Type"
                        icon={HiOutlineTag}
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        options={[
                            { label: "General Event", value: "EVENT" },
                            { label: "Meeting", value: "MEETING" },
                            { label: "Site Visit", value: "SITE_VISIT" },
                            { label: "Follow-up", value: "FOLLOW_UP" },
                        ]}
                        disabled={isFollowUp}
                    />

                    <Select
                        label="Associate with Lead (Optional)"
                        icon={HiOutlineDocumentText}
                        value={formData.leadId}
                        onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                        options={[
                            { label: "None", value: "" },
                            ...(Array.isArray(leads) ? leads.map(lead => ({ label: lead.name, value: lead.id })) : [])
                        ]}
                        disabled={isFollowUp}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        className="w-full text-black px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all resize-none min-h-[100px]"
                        placeholder="Additional notes or meeting agenda..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        disabled={isFollowUp}
                    />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    {!isFollowUp && (
                        <>
                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                className="flex-1"
                            >
                                {event ? "Update Event" : "Save Event"}
                            </Button>
                            {event && (
                                <Button
                                    type="button"
                                    variant="danger-outline"
                                    onClick={handleDelete}
                                    loading={loading}
                                >
                                    Delete
                                </Button>
                            )}
                        </>
                    )}
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className={isFollowUp ? "w-full" : ""}
                    >
                        {isFollowUp ? "Close" : "Cancel"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
