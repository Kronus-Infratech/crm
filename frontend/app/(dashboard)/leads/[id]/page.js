"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LeadDetail from "@/src/components/leads/LeadDetail";
import Button from "@/src/components/ui/Button";
import { HiArrowLeft, HiPencil } from "react-icons/hi";
import api from "@/src/services/api";
import Modal from "@/src/components/ui/Modal";
import LeadForm from "@/src/components/leads/LeadForm";
import { toast } from "react-hot-toast";

export default function LeadPage() {
    const { id } = useParams();
    const router = useRouter();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchLead = async () => {
        try {
            const response = await api.get(`/leads/${id}`);
            setLead(response.data.data);
        } catch (error) {
            console.error("Failed to fetch lead", error);
            toast.error("Lead not found");
            router.push("/leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchLead();
    }, [id]);

    const handleUpdate = async (data) => {
        setIsUpdating(true);
        try {
            await api.put(`/leads/${id}`, data);
            setIsEditing(false);
            fetchLead();
            toast.success("Lead updated successfully");
        } catch (error) {
            console.error("Update failed", error);
            toast.error(error.response?.data?.message || "Failed to update lead");
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!lead) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <Button
                    variant="ghost"
                    icon={<HiArrowLeft />}
                    onClick={() => router.push("/leads")}
                    className="font-bold uppercase tracking-widest text-xs"
                >
                    Back to Leads
                </Button>
                <Button
                    icon={<HiPencil />}
                    onClick={() => setIsEditing(true)}
                    className="font-bold uppercase tracking-widest text-xs shadow-lg shadow-brand-teal/20"
                >
                    Edit Lead
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <LeadDetail
                    lead={lead}
                    onLeadDeleted={() => router.push("/leads")}
                />
            </div>

            <Modal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                title="Edit Lead"
            >
                <LeadForm
                    initialData={lead}
                    onSubmit={handleUpdate}
                    loading={isUpdating}
                />
            </Modal>
        </div>
    );
}
