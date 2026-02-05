"use client";

import { useState } from "react";
import { HiX, HiDownload, HiCheck } from "react-icons/hi";
import Modal from "@/src/components/ui/Modal";
import Button from "@/src/components/ui/Button";

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

export default function ExportModal({ isOpen, onClose, data }) {
    const [selectedFields, setSelectedFields] = useState(AVAILABLE_FIELDS.map(f => f.id));

    const toggleField = (id) => {
        setSelectedFields(prev =>
            prev.includes(id)
                ? prev.filter(f => f !== id)
                : [...prev, id]
        );
    };

    const handleDownload = () => {
        if (selectedFields.length === 0) return;

        // 1. Prepare CSV Header
        const headers = AVAILABLE_FIELDS
            .filter(f => selectedFields.includes(f.id))
            .map(f => f.label);

        // 2. Prepare Data Rows
        const rows = data.map(lead => {
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
        link.setAttribute("download", `kronus_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export Leads Pipeline">
            <div className="p-1">
                <p className="text-sm font-bold text-brand-spanish-gray uppercase tracking-widest mb-6">
                    Select Data Columns for CSV Generation
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
                    {AVAILABLE_FIELDS.map((field) => (
                        <button
                            key={field.id}
                            onClick={() => toggleField(field.id)}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all group ${selectedFields.includes(field.id)
                                    ? "border-brand-teal/30 bg-brand-teal/5 text-brand-teal"
                                    : "border-gray-100 bg-white text-brand-spanish-gray hover:border-gray-200"
                                }`}
                        >
                            <span className={`text-[11px] font-black uppercase tracking-widest ${selectedFields.includes(field.id) ? "opacity-100" : "opacity-60"}`}>
                                {field.label}
                            </span>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${selectedFields.includes(field.id)
                                    ? "bg-brand-teal text-white rotate-0"
                                    : "bg-gray-100 text-transparent -rotate-45"
                                }`}>
                                <HiCheck size={14} />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 py-4 font-black uppercase tracking-[0.2em] text-[10px]"
                    >
                        De-escalate
                    </Button>
                    <Button
                        onClick={handleDownload}
                        disabled={selectedFields.length === 0}
                        className="flex-1 py-4 font-black uppercase tracking-[0.2em] text-[10px] bg-brand-dark-gray hover:bg-black text-white shadow-xl flex items-center justify-center gap-2"
                    >
                        <HiDownload size={18} />
                        Generate CSV Output
                    </Button>
                </div>

                <p className="mt-8 text-[9px] font-black text-brand-spanish-gray uppercase tracking-[0.3em] text-center opacity-40">
                    Security Protocol: Data Export is Monitored
                </p>
            </div>
        </Modal>
    );
}
