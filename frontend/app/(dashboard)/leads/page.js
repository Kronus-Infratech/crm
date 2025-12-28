"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HiPlus, HiSearch, HiFilter, HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/src/services/api";
import Heading from "@/src/components/ui/Heading";
import Button from "@/src/components/ui/Button";
import Card from "@/src/components/ui/Card";
import Input from "@/src/components/ui/Input";
import Modal from "@/src/components/ui/Modal";
import Select from "@/src/components/ui/Select";
import LeadForm from "@/src/components/leads/LeadForm";
import LeadDetail from "@/src/components/leads/LeadDetail";

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

    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");

    // Debounced search term
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [closingLead, setClosingLead] = useState(null);
    const [closeReason, setCloseReason] = useState("");
    const [editingLead, setEditingLead] = useState(null);

    // ... (existing handlers)

    const [reopeningLead, setReopeningLead] = useState(null);
    const [reopenReason, setReopenReason] = useState("");

    const handleCloseLead = async (status) => {
        if (!closingLead) return;
        try {
            await api.put(`/leads/${closingLead.id}`, { 
                status,
                activityNote: closeReason ? `Closed as ${status}. Reason: ${closeReason}` : `Closed as ${status}`
            });
            setClosingLead(null);
            setCloseReason("");
            fetchLeads();
        } catch (error) {
            console.error("Failed to close lead", error);
        }
    };

    const handleReopenLead = (lead) => {
        setReopeningLead(lead);
        setReopenReason("");
    };

    const confirmReopenLead = async () => {
        if (!reopeningLead || !reopenReason.trim()) return;
        try {
            await api.put(`/leads/${reopeningLead.id}`, { 
                status: "NEW", // Default to NEW when reopening
                activityNote: `Lead Reopened. Reason: ${reopenReason}`
            });
            setReopeningLead(null);
            setReopenReason("");
            fetchLeads();
        } catch (error) {
            console.error("Failed to reopen lead", error);
        }
    };

    // Helper to check if lead is closed
    const isLeadClosed = (status) => ['WON', 'LOST'].includes(status);


    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 10,
                search: debouncedSearch,
                status: statusFilter || undefined,
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
    }, [page, debouncedSearch, statusFilter, sortBy, sortOrder]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

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
        try {
            await api.post("/leads", data);
            setIsCreateOpen(false);
            fetchLeads();
        } catch (error) {
            console.error("Create failed", error);
        }
    };

    const handleUpdate = async (data) => {
        try {
            await api.put(`/leads/${editingLead.id}`, data);
            setEditingLead(null);
            fetchLeads(); // Refetch to prevent stale data
        } catch (error) {
            console.error("Update failed", error);
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
                    <p className="text-gray-600">Manage your sales pipeline</p>
                </div>
                <div>
                    <Button icon={<HiPlus />} onClick={() => setIsCreateOpen(true)}>Add New Lead</Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/3 relative">
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
                            { label: "Qualified", value: "QUALIFIED" },
                            { label: "Proposal", value: "PROPOSAL" },
                            { label: "Won", value: "WON" },
                            { label: "Lost", value: "LOST" },
                        ]}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden p-0 border border-gray-200 shadow-sm relative min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('firstName')}>
                                    Name <SortIcon field="firstName" />
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
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('estimatedValue')}>
                                    Value <SortIcon field="estimatedValue" />
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
                                        <td colSpan="6" className="w-full h-full flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                                        </td>
                                    </motion.tr>
                                )}
                            </AnimatePresence>

                            {!loading && leads.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
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
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedLead(lead)}
                                    >
                                        <td className="px-4 py-4 font-medium text-gray-900">
                                            {lead.firstName} {lead.lastName}
                                        </td>
                                        <td className="px-4 py-4 text-gray-600">{lead.property || "-"}</td>
                                        <td className="px-4 py-4 text-gray-600">{lead.source || "-"}</td>
                                        <td className="px-4 py-4">
                                            <StatusBadge status={lead.status} />
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-red-500">
                                            ₹{(lead.estimatedValue || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : <span className="text-gray-400 italic">Unassigned</span>}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "-"}
                                        </td>
                                        <td className="px-4 py-4 text-right flex justify-end gap-2">
                                            {isLeadClosed(lead.status) ? (
                                                 <Button
                                                    variant="primary"
                                                    size="xs"
                                                    className="bg-green-500 text-white hover:bg-green-600 px-2 py-1 text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReopenLead(lead);
                                                    }}
                                                >
                                                    Reopen
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="primary"
                                                    size="xs"
                                                    className="bg-red-500 text-white hover:bg-red-600 px-2 py-1 text-xs"
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
                                                className="px-2 py-1 text-xs"
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
                <LeadForm onSubmit={handleCreate} loading={loading} />
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
                        loading={loading}
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
                <LeadDetail lead={selectedLead} />
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
                title={`Close Lead: ${closingLead?.firstName} ${closingLead?.lastName}`}
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
                            className="bg-red-500 text-white hover:bg-red-700 border-red-700"
                            onClick={() => handleCloseLead('LOST')}
                        >
                            Mark as LOST
                        </Button>
                        <Button 
                            className="bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                            onClick={() => handleCloseLead('WON')}
                        >
                            Mark as WON
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
                title={`Reopen Lead: ${reopeningLead?.firstName} ${reopeningLead?.lastName}`}
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
                        <Button variant="outline" onClick={() => setReopeningLead(null)}>
                            Cancel
                        </Button>
                        <Button 
                            className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={confirmReopenLead}
                            disabled={!reopenReason.trim()}
                        >
                            Confirm Reopen
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );

    // return (
    //     <div>
    //         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    //             <div>
    //                 <Heading level={2}>Leads</Heading>
    //                 <p className="text-gray-600">Manage your sales pipeline</p>
    //             </div>
    //             <div>
    //                 <Button icon={<HiPlus />} onClick={() => setIsCreateOpen(true)}>Add New Lead</Button>
    //             </div>
    //         </div>

    //         {/* Filters */}
    //         <div className="flex flex-col md:flex-row gap-4 mb-6">
    //             <div className="w-full md:w-1/3 relative">
    //                 <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    //                 <Input
    //                     placeholder="Search leads..."
    //                     className="pl-10 py-2.5!"
    //                     value={searchTerm}
    //                     onChange={(e) => setSearchTerm(e.target.value)}
    //                 />
    //             </div>
    //             <div className="w-full md:w-1/4">
    //                 <Select
    //                     placeholder="Filter by Status"
    //                     className="py-2.5!"
    //                     options={[
    //                         { label: "New", value: "NEW" },
    //                         { label: "Contacted", value: "CONTACTED" },
    //                         { label: "Qualified", value: "QUALIFIED" },
    //                         { label: "Proposal", value: "PROPOSAL" },
    //                         { label: "Won", value: "WON" },
    //                         { label: "Lost", value: "LOST" },
    //                     ]}
    //                     value={statusFilter}
    //                     onChange={(e) => setStatusFilter(e.target.value)}
    //                 />
    //             </div>
    //         </div>

    //         {/* Table */}
    //         <Card className="overflow-hidden p-0 border border-gray-200 shadow-sm relative min-h-[400px]">
    //             <div className="overflow-x-auto">
    //                 <table className="w-full text-left border-collapse min-w-[800px]">
    //                     <thead>
    //                         <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
    //                             <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('firstName')}>
    //                                 Name <SortIcon field="firstName" />
    //                             </th>
    //                             <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('property')}>
    //                                 Property <SortIcon field="property" />
    //                             </th>
    //                             <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('source')}>
    //                                 Source <SortIcon field="source" />
    //                             </th>
    //                             <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
    //                                 Status <SortIcon field="status" />
    //                             </th>
    //                             <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('estimatedValue')}>
    //                                 Value <SortIcon field="estimatedValue" />
    //                             </th>
    //                             <th className="px-4 py-4">Assigned To</th>
    //                             <th className="px-4 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
    //                                 Created On <SortIcon field="createdAt" />
    //                             </th>
    //                             <th className="px-4 py-4 text-right">Actions</th>
    //                         </tr>
    //                     </thead>
    //                     <tbody className="divide-y divide-gray-100">
    //                         {/* Loading Overlay */}
    //                         <AnimatePresence>
    //                             {loading && (
    //                                 <motion.tr
    //                                     initial={{ opacity: 0 }}
    //                                     animate={{ opacity: 1 }}
    //                                     exit={{ opacity: 0 }}
    //                                     className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"
    //                                 >
    //                                     <td colSpan="6" className="w-full h-full flex items-center justify-center">
    //                                         <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
    //                                     </td>
    //                                 </motion.tr>
    //                             )}
    //                         </AnimatePresence>

    //                         {!loading && leads.length === 0 ? (
    //                             <tr>
    //                                 <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
    //                                     <div className="flex flex-col items-center gap-2">
    //                                         <HiSearch size={24} className="text-gray-300" />
    //                                         <p>No leads found matching your criteria.</p>
    //                                     </div>
    //                                 </td>
    //                             </tr>
    //                         ) : (
    //                             leads.map((lead) => (
    //                                 <motion.tr
    //                                     key={lead.id}
    //                                     layoutId={lead.id}
    //                                     initial={{ opacity: 0 }}
    //                                     animate={{ opacity: 1 }}
    //                                     className="hover:bg-gray-50/50 transition-colors cursor-pointer"
    //                                     onClick={() => setSelectedLead(lead)}
    //                                 >
    //                                     <td className="px-4 py-4 font-medium text-gray-900">
    //                                         {lead.firstName} {lead.lastName}
    //                                     </td>
    //                                     <td className="px-4 py-4 text-gray-600">{lead.property || "-"}</td>
    //                                     <td className="px-4 py-4 text-gray-600">{lead.source || "-"}</td>
    //                                     <td className="px-4 py-4">
    //                                         <StatusBadge status={lead.status} />
    //                                     </td>
    //                                     <td className="px-4 py-4 font-semibold text-red-500">
    //                                         ₹{(lead.estimatedValue || 0).toLocaleString()}
    //                                     </td>
    //                                     <td className="px-4 py-4 text-sm text-gray-600">
    //                                         {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : <span className="text-gray-400 italic">Unassigned</span>}
    //                                     </td>
    //                                     <td className="px-4 py-4 text-sm text-gray-600">
    //                                         {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "-"}
    //                                     </td>
    //                                     <td className="px-4 py-4 text-right">
    //                                         <Button
    //                                             variant="primary"
    //                                             size="sm"
    //                                             onClick={(e) => {
    //                                                 e.stopPropagation();
    //                                                 setEditingLead(lead);
    //                                             }}
    //                                         >
    //                                             Edit
    //                                         </Button>
    //                                     </td>
    //                                 </motion.tr>
    //                             ))
    //                         )}
    //                     </tbody>
    //                 </table>
    //             </div>

    //             {/* Pagination */}
    //             <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-sm text-gray-500 flex flex-col sm:flex-row gap-4 justify-between items-center">
    //                 <span>
    //                     Page {stats.currentPage || 1} of {Math.max(1, totalPages)} <span className="text-gray-400 mx-1">|</span> {stats.totalItems || 0} items
    //                 </span>
    //                 <div className="flex gap-2">
    //                     <Button
    //                         variant="outline"
    //                         size="sm"
    //                         disabled={page === 1 || loading}
    //                         onClick={() => setPage(p => Math.max(1, p - 1))}
    //                     >
    //                         <HiChevronLeft /> Previous
    //                     </Button>
    //                     <Button
    //                         variant="outline"
    //                         size="sm"
    //                         disabled={page === totalPages || loading}
    //                         onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))}
    //                     >
    //                         Next <HiChevronRight />
    //                     </Button>
    //                 </div>
    //             </div>
    //         </Card>

    //         {/* Create Lead Modal */}
    //         <Modal
    //             isOpen={isCreateOpen}
    //             onClose={() => setIsCreateOpen(false)}
    //             title="Create New Lead"
    //         >
    //             <LeadForm onSubmit={handleCreate} loading={loading} />
    //         </Modal>

    //         {/* Edit Lead Modal */}
    //         <Modal
    //             isOpen={!!editingLead}
    //             onClose={() => setEditingLead(null)}
    //             title="Edit Lead"
    //         >
    //             {editingLead && (
    //                 <LeadForm
    //                     initialData={editingLead}
    //                     onSubmit={handleUpdate}
    //                     loading={loading}
    //                 />
    //             )}
    //         </Modal>

    //         {/* Detail View Modal */}
    //         <Modal
    //             isOpen={!!selectedLead}
    //             onClose={() => setSelectedLead(null)}
    //             title="Lead Details"
    //             size="lg"
    //         >
    //             <LeadDetail lead={selectedLead} />
    //             <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
    //                 <Button variant="outline" onClick={() => setSelectedLead(null)}>Close</Button>
    //                 <Button
    //                     className="ml-3"
    //                     onClick={() => {
    //                         setEditingLead(selectedLead);
    //                         setSelectedLead(null);
    //                     }}
    //                 >
    //                     Edit Lead
    //                 </Button>
    //             </div>
    //         </Modal>
    //     </div>
    // );
}

function StatusBadge({ status }) {
    const styles = {
        NEW: "bg-blue-100 text-blue-700",
        CONTACTED: "bg-purple-100 text-purple-700",
        QUALIFIED: "bg-green-100 text-green-700",
        LOST: "bg-red-100 text-red-700",
        WON: "bg-yellow-100 text-yellow-700"
    };

    return (
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${styles[status] || "bg-gray-100 text-gray-700"}`}>
            {status}
        </span>
    );
}
