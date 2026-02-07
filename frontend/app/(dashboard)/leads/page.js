"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HiPlus, HiSearch, HiLockClosed, HiChevronLeft, HiChevronRight, HiCurrencyRupee } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/src/services/api";
import { toast } from "react-hot-toast";
import Heading from "@/src/components/ui/Heading";
import Button from "@/src/components/ui/Button";
import Card from "@/src/components/ui/Card";
import Input from "@/src/components/ui/Input";
import Modal from "@/src/components/ui/Modal";
import Select from "@/src/components/ui/Select";
import LeadForm from "@/src/components/leads/LeadForm";
import LeadDetail from "@/src/components/leads/LeadDetail";
import { formatNumber, formatDate } from "@/src/utils/formatters";
import Link from "next/link";
import ExportModal from "@/src/components/leads/ExportModal";
import { HiDownload } from "react-icons/hi";

// Debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sourceFilter, setSourceFilter] = useState("");

    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [assignedToFilter, setAssignedToFilter] = useState("");
    const [salesmen, setSalesmen] = useState([]);

    // Debounced search term
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [closingLead, setClosingLead] = useState(null);
    const [closeReason, setCloseReason] = useState("");
    const [editingLead, setEditingLead] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const [isReopening, setIsReopening] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);

    // ... (existing handlers)

    const [reopeningLead, setReopeningLead] = useState(null);
    const [reopenReason, setReopenReason] = useState("");

    const handleCloseLead = async (status) => {
        if (!closingLead) return;
        setIsClosing(true);
        try {
            await api.put(`/leads/${closingLead.id}`, {
                status,
                activityNote: closeReason ? `Closed as ${status}. Reason: ${closeReason}` : `Closed as ${status}`
            });
            setClosingLead(null);
            setCloseReason("");
            fetchLeads();
            toast.success(`Lead marked as ${status}`);
        } catch (error) {
            console.error("Failed to close lead", error);
            toast.error(error.response?.data?.message || "Failed to close lead");
        } finally {
            setIsClosing(false);
        }
    };

    const handleReopenLead = (lead) => {
        setReopeningLead(lead);
        setReopenReason("");
    };

    const confirmReopenLead = async () => {
        if (!reopeningLead || !reopenReason.trim()) return;
        setIsReopening(true);
        try {
            await api.put(`/leads/${reopeningLead.id}`, {
                status: "NEW", // Default to NEW when reopening
                activityNote: `Lead Reopened. Reason: ${reopenReason}`
            });
            setReopeningLead(null);
            setReopenReason("");
            fetchLeads();
            toast.success("Lead reopened successfully");
        } catch (error) {
            console.error("Failed to reopen lead", error);
            toast.error(error.response?.data?.message || "Failed to reopen lead");
        } finally {
            setIsReopening(false);
        }
    };

    // Helper to check if lead is closed
    const isLeadClosed = (status) => ['CONVERTED', 'NOT_CONVERTED'].includes(status);

    const fetchSalesmen = useCallback(async () => {
        try {
            const response = await api.get("/users");
            setSalesmen(response.data.data.users);
        } catch (error) {
            console.error("Failed to fetch salesmen", error);
        }
    }, []);

    useEffect(() => {
        fetchSalesmen();
    }, [fetchSalesmen]);


    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                search: debouncedSearch,
                status: statusFilter || undefined,
                source: sourceFilter || undefined,
                assignedToId: assignedToFilter || undefined,
                sortBy: sortBy,
                sortOrder: sortOrder
            };

            const response = await api.get("/leads", { params });
            setLeads(response.data.data.leads);
            setStats(response.data.data.pagination);
            setTotalPages(response.data.data.pagination.totalPages);
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, statusFilter, sourceFilter, assignedToFilter, sortBy, sortOrder]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter, sourceFilter, assignedToFilter]);

    // Handlers
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    const handleCreate = async (data) => {
        setIsCreating(true);
        try {
            await api.post("/leads", data);
            setIsCreateOpen(false);
            fetchLeads();
            toast.success("Lead created successfully");
        } catch (error) {
            console.error("Create failed", error);
            toast.error(error.response?.data?.message || "Failed to create lead");
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async (data) => {
        setIsUpdating(true);
        try {
            await api.put(`/leads/${editingLead.id}`, data);
            setEditingLead(null);
            fetchLeads(); // Refetch to prevent stale data
            toast.success("Lead updated successfully");
        } catch (error) {
            console.error("Update failed", error);
            toast.error(error.response?.data?.message || "Failed to update lead");
        } finally {
            setIsUpdating(false);
        }
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <span className="w-4 inline-block">-</span>;
        return sortOrder === "asc" ? <span className="inline-block ml-1">▲</span> : <span className="inline-block ml-1">▼</span>;
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <Heading level={2}>Leads</Heading>
                    <p className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">Active Operations Pipeline</p>
                </div>
                <div className="flex gap-4">
                    <Button 
                        variant="ghost" 
                        icon={<HiDownload />} 
                        onClick={() => setIsExportOpen(true)}
                        className="font-black uppercase tracking-widest text-xs border-2 border-brand-teal/20 text-brand-teal hover:bg-brand-teal/5"
                    >
                        Export
                    </Button>
                    <Button 
                        icon={<HiPlus />} 
                        onClick={() => setIsCreateOpen(true)}
                        className="font-black uppercase tracking-widest text-xs px-6 shadow-xl shadow-brand-teal/20"
                    >
                        Add New Lead
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/4 relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search leads..."
                        className="pl-10 py-2.5!"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-1/4">
                    <Select
                        placeholder="Filter by Status"
                        className="py-2.5!"
                        options={[
                            { label: "New", value: "NEW" },
                            { label: "Contacted", value: "CONTACTED" },
                            { label: "Interested", value: "INTERESTED" },
                            { label: "Not Interested", value: "NOT_INTERESTED" },
                            { label: "Site Visit", value: "SITE_VISIT" },
                            { label: "Negotiation", value: "NEGOTIATION" },
                            { label: "Documentation", value: "DOCUMENTATION" },
                            { label: "Converted", value: "CONVERTED" },
                            { label: "Not Converted", value: "NOT_CONVERTED" },
                        ]}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-1/4">
                    <Select
                        placeholder="Filter by Source"
                        className="py-2.5!"
                        options={[
                            { label: "Website", value: "WEBSITE" },
                            { label: "Referral", value: "REFERRAL" },
                            { label: "Instagram", value: "INSTAGRAM" },
                            { label: "Youtube", value: "YOUTUBE" },
                            { label: "Email", value: "EMAIL" },
                            { label: "WhatsApp", value: "WHATSAPP" },
                            { label: "99 Acres", value: "NINETY_NINE_ACRES" },
                            { label: "MagicBricks", value: "MAGICBRICKS" },
                            { label: "OLX", value: "OLX" },
                            { label: "Cold Outreach", value: "COLD_OUTREACH" },
                            { label: "Walk In", value: "WALK_IN" },
                        ]}
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-1/4">
                    <Select
                        placeholder="Filter by Salesman"
                        className="py-2.5!"
                        options={salesmen.map(s => ({ label: s.name, value: s.id }))}
                        value={assignedToFilter}
                        onChange={(e) => setAssignedToFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden p-0 border border-gray-200 shadow-sm relative min-h-[330px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                                    Name <SortIcon field="name" />
                                </th>
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('property')}>
                                    Property <SortIcon field="property" />
                                </th>
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('source')}>
                                    Source <SortIcon field="source" />
                                </th>
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                                    Status <SortIcon field="status" />
                                </th>
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('value')}>
                                    Value <SortIcon field="value" />
                                </th>
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('followUpDate')}>
                                    Follow-up <SortIcon field="followUpDate" />
                                </th>
                                <th className="px-4 py-4">Assigned To</th>
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                                    Created On <SortIcon field="createdAt" />
                                </th>
                                <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* Loading Overlay */}
                            <AnimatePresence>
                                {loading && (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"
                                    >
                                        <td colSpan="9" className="w-full h-full flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-[#009688] border-t-transparent rounded-full animate-spin"></div>
                                        </td>
                                    </motion.tr>
                                )}
                            </AnimatePresence>

                            {!loading && leads.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <HiSearch size={24} className="text-gray-300" />
                                            <p>No leads found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <motion.tr
                                        key={lead.id}
                                        layoutId={lead.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer text-sm"
                                        onClick={() => setSelectedLead(lead)}
                                    >
                                        <td className="px-4 py-4 font-medium text-gray-900">
                                            {lead.name}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600">{lead.property || "-"}</td>
                                        <td className="px-4 py-4 text-gray-600 text-xs">{lead.source?.replace(/_/g, ' ') || "-"}</td>
                                        <td className="px-4 py-4">
                                            <StatusBadge status={lead.status} ledgerStatus={lead.ledgerStatus} />
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-gray-900 whitespace-nowrap">
                                            ₹{formatNumber(lead.budgetFrom)} - ₹{formatNumber(lead.budgetTo)}
                                        </td>
                                        <td className="px-4 py-4 text-brand-spanish-gray">
                                            {lead.followUpDate ? (
                                                <div className="flex flex-col">
                                                    <span>{formatDate(lead.followUpDate)}</span>
                                                    {new Date(lead.followUpDate) < new Date() && lead.status !== 'CONVERTED' && lead.status !== 'NOT_CONVERTED' && (
                                                        <span className="text-[10px] text-red-500 font-bold uppercase">Overdue</span>
                                                    )}
                                                </div>
                                            ) : "-"}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600">
                                            {lead.assignedTo ? lead.assignedTo.name : <span className="text-gray-400 italic">Unassigned</span>}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600">
                                            {formatDate(lead.createdAt)}
                                        </td>
                                        <td className="px-4 py-4 text-right flex justify-end gap-2">
                                            {lead.status === 'CONVERTED' && (
                                                <Link href={`/leads/${lead.id}/ledger`} onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        className="border-[#8DC63F] text-[#8DC63F] hover:bg-[#8DC63F]/10 px-2 py-1 text-xs"
                                                        icon={<HiCurrencyRupee />}
                                                    >
                                                        Ledger
                                                    </Button>
                                                </Link>
                                            )}
                                            {isLeadClosed(lead.status) ? (
                                                <Button
                                                    variant="primary"
                                                    size="xs"
                                                    className={`px-2 py-1 text-xs font-bold rounded-lg ${lead.ledgerStatus === 'CLOSED' ? 'bg-brand-spanish-gray/30 text-brand-spanish-gray cursor-not-allowed' : 'bg-[#8DC63F] text-white hover:bg-[#7AB336]'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (lead.ledgerStatus !== 'CLOSED') {
                                                            handleReopenLead(lead);
                                                        }
                                                    }}
                                                    disabled={lead.ledgerStatus === 'CLOSED'}
                                                >
                                                    Reopen
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="primary"
                                                    size="xs"
                                                    className="bg-red-500 text-white hover:bg-[#8D644A] px-2 py-1 text-xs font-bold rounded-lg"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setClosingLead(lead);
                                                    }}
                                                >
                                                    Close
                                                </Button>
                                            )}
                                            <Button
                                                variant="primary"
                                                size="xs"
                                                className="px-2 py-1 text-xs bg-[#009688] hover:bg-[#00796B] font-bold rounded-lg"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingLead(lead);
                                                }}
                                            >
                                                Edit
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-sm text-gray-500 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <span>
                        Page {stats.currentPage || 1} of {Math.max(1, totalPages)} <span className="text-gray-400 mx-1">|</span> {stats.totalItems || 0} items
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            <HiChevronLeft /> Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === totalPages || loading}
                            onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))}
                        >
                            Next <HiChevronRight />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Create Lead Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create New Lead"
            >
                <LeadForm onSubmit={handleCreate} loading={isCreating} />
            </Modal>

            {/* Edit Lead Modal */}
            <Modal
                isOpen={!!editingLead}
                onClose={() => setEditingLead(null)}
                title="Edit Lead"
            >
                {editingLead && (
                    <LeadForm
                        initialData={editingLead}
                        onSubmit={handleUpdate}
                        loading={isUpdating}
                    />
                )}
            </Modal>

            {/* Detail View Modal */}
            <Modal
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
                title="Lead Details"
                size="lg"
            >
                {/* 
                  Pass a key to force re-mounting when selectedLead changes, 
                  ensuring fresh state and eliminating duplicate calls from old instances 
                */}
                <LeadDetail
                    key={selectedLead?.id}
                    lead={selectedLead}
                    onLeadDeleted={() => {
                        setSelectedLead(null);
                        fetchLeads();
                    }}
                />
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                    <Button variant="outline" onClick={() => setSelectedLead(null)}>Close</Button>
                    <Button
                        className="ml-3"
                        onClick={() => {
                            setEditingLead(selectedLead);
                            setSelectedLead(null);
                        }}
                    >
                        Edit Lead
                    </Button>
                </div>
            </Modal>

            {/* Close Lead Modal */}
            <Modal
                isOpen={!!closingLead}
                onClose={() => {
                    setClosingLead(null);
                    setCloseReason("");
                }}
                title={`Close Lead: ${closingLead?.name}`}
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Please select the final status for this lead. You can optionally provide a reason or note.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Note (Optional)</label>
                        <textarea
                            className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary min-h-[80px]"
                            placeholder="e.g. Price was too high..."
                            value={closeReason}
                            onChange={(e) => setCloseReason(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <Button
                            className="bg-red-500 text-white hover:bg-[#8D644A] border-none font-bold rounded-lg"
                            onClick={() => handleCloseLead('NOT_CONVERTED')}
                            disabled={isClosing}
                        >
                            {isClosing ? "Processing..." : "Not Converted"}
                        </Button>
                        <Button
                            className="bg-[#8DC63F] text-white hover:bg-[#7AB336] focus:ring-[#8DC63F]/30 border-none font-bold rounded-lg"
                            onClick={() => handleCloseLead('CONVERTED')}
                            disabled={isClosing}
                        >
                            {isClosing ? "Processing..." : "Mark Converted"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Reopen Lead Modal */}
            <Modal
                isOpen={!!reopeningLead}
                onClose={() => {
                    setReopeningLead(null);
                    setReopenReason("");
                }}
                title={`Reopen Lead: ${reopeningLead?.name}`}
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Are you sure you want to reopen this lead? Please provide a reason.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Required)</label>
                        <textarea
                            className="w-full text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary min-h-[80px]"
                            placeholder="e.g. Client contacted us again..."
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <Button variant="outline" onClick={() => setReopeningLead(null)} disabled={isReopening}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={confirmReopenLead}
                            disabled={!reopenReason.trim() || isReopening}
                        >
                            {isReopening ? "Reopening..." : "Confirm Reopen"}
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Export Modal */}
            <ExportModal 
                isOpen={isExportOpen} 
                onClose={() => setIsExportOpen(false)} 
                currentData={leads}
                filters={{
                    search: debouncedSearch,
                    status: statusFilter || undefined,
                    source: sourceFilter || undefined,
                    assignedToId: assignedToFilter || undefined,
                    sortBy,
                    sortOrder
                }}
            />
        </div>
    );
}

function StatusBadge({ status, ledgerStatus }) {
    const styles = {
        NEW: "bg-[#009688]/10 text-[#009688] border-[#009688]/20",
        CONTACTED: "bg-cyan-100 text-cyan-700 border-cyan-200",
        INTERESTED: "bg-green-100 text-green-700 border-green-200",
        NOT_INTERESTED: "bg-brand-dark-gray/10 text-brand-dark-gray border-brand-dark-gray/20",
        SITE_VISIT: "bg-purple-100 text-purple-700 border-purple-200",
        NEGOTIATION: "bg-red-500/10 text-red-500 border-red-500/20",
        DOCUMENTATION: "bg-brand-spanish-gray/10 text-brand-spanish-gray border-brand-spanish-gray/20",
        CONVERTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
        NOT_CONVERTED: "bg-red-500/10 text-red-500 border-red-500/20"
    };

    return (
        <div className="flex flex-col gap-1">
            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-lg border w-fit ${styles[status] || "bg-gray-100 text-gray-700"}`}>
                {status.replace('_', ' ')}
            </span>
            {status === 'CONVERTED' && (
                ledgerStatus === 'CLOSED' ? (
                    <span className="text-[9px] text-red-600 font-extrabold uppercase tracking-tighter flex items-center">
                        <HiLockClosed className="mr-0.5" /> Ledger Closed
                    </span>
                ) : (
                    <span className="text-[9px] text-[#8DC63F] font-extrabold uppercase tracking-tighter flex items-center">
                        <HiCurrencyRupee className="mr-0.5" /> Running Ledger Active
                    </span>
                )
            )}
        </div>
    );
}
