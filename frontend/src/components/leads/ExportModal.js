"use client";

import { useState } from "react";
import { HiX, HiDownload, HiCheck, HiTable, HiCollection } from "react-icons/hi";
import Modal from "@/src/components/ui/Modal";
import Button from "@/src/components/ui/Button";
import api from "@/src/services/api";
import { toast } from "react-hot-toast";

const AVAILABLE_FIELDS = [
    { id: "name", label: "Name" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Phone" },
    { id: "status", label: "Status" },
    { id: "source", label: "Source" },
    { id: "priority", label: "Priority" },
    { id: "budgetFrom", label: "Min Budget" },
    { id: "budgetTo", label: "Max Budget" },
    { id: "property", label: "Property" },
    { id: "assignedTo", label: "Assigned To" },
    { id: "createdBy", label: "Created By" },
    { id: "createdAt", label: "Created Date" },
    { id: "followUpDate", label: "Follow-up Date" },
];

export default function ExportModal({ isOpen, onClose, currentData, filters }) {
    const [selectedFields, setSelectedFields] = useState(AVAILABLE_FIELDS.map(f => f.id));
    const [exportScope, setExportScope] = useState("current"); // "current" or "all"
    const [exporting, setExporting] = useState(false);

    const toggleField = (id) => {
        setSelectedFields(prev =>
            prev.includes(id)
                ? prev.filter(f => f !== id)
                : [...prev, id]
        );
    };

    const handleDownload = async () => {
        if (selectedFields.length === 0) return;
        setExporting(true);

        try {
            let dataToExport = currentData;

            if (exportScope === "all") {
                toast.loading("Fetching all leads for export...", { id: "export-fetch" });
                // Fetch all leads matching filters, but without pagination limit
                const res = await api.get("/leads", {
                    params: {
                        ...filters,
                        limit: 10000, // Large enough to get all
                        page: 1
                    }
                });
                if (res.data.success) {
                    dataToExport = res.data.data.leads;
                    toast.success("Data fetched successfully", { id: "export-fetch" });
                } else {
                    throw new Error("Failed to fetch all leads");
                }
            }

            // 1. Prepare CSV Header
            const headers = AVAILABLE_FIELDS
                .filter(f => selectedFields.includes(f.id))
                .map(f => f.label);

            // 2. Prepare Data Rows
            const rows = dataToExport.map(lead => {
                return AVAILABLE_FIELDS
                    .filter(f => selectedFields.includes(f.id))
                    .map(f => {
                        let val = lead[f.id];

                        // Format nested objects or special types
                        if (f.id === 'assignedTo' || f.id === 'createdBy') {
                            val = lead[f.id]?.name || 'N/A';
                        } else if (f.id === 'createdAt' || f.id === 'followUpDate') {
                            val = val ? new Date(val).toLocaleDateString() : 'N/A';
                        } else if (val === null || val === undefined) {
                            val = '';
                        }

                        // Escape commas for CSV
                        const stringVal = String(val).replace(/"/g, '""');
                        return `"${stringVal}"`;
                    })
                    .join(",");
            });

            const csvContent = [headers.join(","), ...rows].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `kronus_leads_${exportScope}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            onClose();
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Export failed. Please try again.", { id: "export-fetch" });
        } finally {
            setExporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Lead Export Intelligence">
            <div className="p-1 max-h-[80vh] overflow-y-auto pr-2">

                {/* Export Scope Selector */}
                <div className="mb-8">
                    <p className="text-[10px] font-black text-[#009688] uppercase tracking-widest mb-4">Export Scope</p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setExportScope("current")}
                            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${exportScope === "current"
                                    ? "border-[#009688] bg-[#009688]/5 text-[#009688]"
                                    : "border-gray-100 text-gray-400 hover:border-gray-200"
                                }`}
                        >
                            <HiTable size={24} />
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase">Current View</p>
                                <p className="text-[9px] font-bold opacity-60">Visible 10 records</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setExportScope("all")}
                            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${exportScope === "all"
                                    ? "border-[#009688] bg-[#009688]/5 text-[#009688]"
                                    : "border-gray-100 text-gray-400 hover:border-gray-200"
                                }`}
                        >
                            <HiCollection size={24} />
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase">Full Pipeline</p>
                                <p className="text-[9px] font-bold opacity-60">All matching leads</p>
                            </div>
                        </button>
                    </div>
                </div>

                <p className="text-[10px] font-black text-[#009688] uppercase tracking-widest mb-4">Select Data Columns</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-10">
                    {AVAILABLE_FIELDS.map((field) => (
                        <button
                            key={field.id}
                            onClick={() => toggleField(field.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selectedFields.includes(field.id)
                                    ? "border-[#009688]/30 bg-[#009688]/5 text-[#009688]"
                                    : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
                                }`}
                        >
                            <span className={`text-[10px] font-black uppercase tracking-widest ${selectedFields.includes(field.id) ? "opacity-100" : "opacity-60"}`}>
                                {field.label}
                            </span>
                            {selectedFields.includes(field.id) && <HiCheck size={14} />}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 py-4 font-black uppercase tracking-widest text-[10px]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDownload}
                        disabled={selectedFields.length === 0 || exporting}
                        className="flex-1 py-4 font-black uppercase tracking-widest text-[10px] bg-brand-dark-gray hover:bg-black text-white shadow-xl flex items-center justify-center gap-2"
                    >
                        <HiDownload size={18} />
                        {exporting ? "Exporting..." : "Export Data"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
