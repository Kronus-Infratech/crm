"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import Button from "@/src/components/ui/Button";

const schema = z.object({
    projectId: z.string().min(1, "Project/Area is required"),
    plotNumber: z.string().min(1, "Plot Number is required"),
    block: z.string().optional(),
    size: z.string().optional(),

    ratePerSqYard: z.number().min(0).optional().nullable(),
    totalPrice: z.number().min(0).optional().nullable(),

    facing: z.string().optional(),
    roadWidth: z.string().optional(),

    paymentTime: z.string().optional(),
    paymentCondition: z.string().optional(),
    circleRate: z.number().min(0).optional().nullable(),

    status: z.enum(["AVAILABLE", "SOLD", "BLOCKED"]),

    ownerName: z.string().optional(),
    ownerContact: z.string().optional(),

    askingPrice: z.number().min(0).optional().nullable(),
    reference: z.string().optional(),

    amenities: z.string().optional(),
    maintenanceCharges: z.number().min(0).optional().nullable(),
    clubCharges: z.number().min(0).optional().nullable(),
    cannesCharges: z.number().min(0).optional().nullable(), // Specific user request

    description: z.string().optional(),

    // Sold details if status is SOLD
    soldTo: z.string().optional(),
    soldDate: z.string().optional()
});

export default function InventoryForm({ initialData, onSubmit, loading, selectedProject, projects = [] }) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            status: "AVAILABLE",
            ratePerSqYard: 0,
            totalPrice: 0,
            projectId: selectedProject || ""
        }
    });

    const status = watch("status");

    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                soldDate: initialData.soldDate ? new Date(initialData.soldDate).toISOString().split('T')[0] : ""
            });
        } else {
            // Reset to clean state if adding new
            reset({
                status: "AVAILABLE",
                projectId: selectedProject || ""
            });
        }
    }, [initialData, reset, selectedProject]);

    // Auto-calc total price if rate and size (numeric) are present
    // This is a bit tricky as size is a string "200 sqyd". 
    // We'll leave it manual for now unless user asks.

    const handleFormSubmit = (data) => {
        onSubmit(data);
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 text-black p-1 max-h-[70vh] overflow-y-auto pr-2">

            {/* Basic Details */}
            <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 border-b border-gray-100 pb-1">Property Details</h4>

                {(!selectedProject || initialData) && (
                    <Select
                        label="Property Area"
                        options={projects.map(p => ({ label: p.name, value: p.id }))}
                        error={errors.projectId?.message}
                        disabled={!!initialData} // Don't allow changing project for existing items
                        {...register("projectId")}
                    />
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Plot Number"
                        placeholder="e.g. 12B"
                        error={errors.plotNumber?.message}
                        {...register("plotNumber")}
                    />
                    <Input
                        label="Block / Sector"
                        placeholder="e.g. A"
                        {...register("block")}
                    />
                    <Input
                        label="Size (sq.yd)"
                        placeholder="e.g. 200"
                        {...register("size")}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Facing"
                        placeholder="e.g. North-East"
                        {...register("facing")}
                    />
                    <Input
                        label="Road Width (ft)"
                        placeholder="e.g. 30"
                        {...register("roadWidth")}
                    />
                    <Select
                        label="Status"
                        options={[
                            { label: "Available", value: "AVAILABLE" },
                            { label: "Sold", value: "SOLD" },
                            { label: "Blocked", value: "BLOCKED" },
                        ]}
                        error={errors.status?.message}
                        {...register("status")}
                    />
                </div>
            </section>

            {/* Pricing */}
            <section className="space-y-4 pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 border-b border-gray-100 pb-1">Pricing & Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Rate per Sq.Yd (₹)"
                        type="number"
                        {...register("ratePerSqYard", { valueAsNumber: true })}
                    />
                    <Input
                        label="Total Price (₹)"
                        type="number"
                        {...register("totalPrice", { valueAsNumber: true })}
                    />
                    <Input
                        label="Asking Price (₹)"
                        type="number"
                        {...register("askingPrice", { valueAsNumber: true })}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Circle Rate"
                        type="number"
                        {...register("circleRate", { valueAsNumber: true })}
                    />
                    <Input
                        label="Payment Time"
                        placeholder="e.g. 45 Days"
                        {...register("paymentTime")}
                    />
                    <Input
                        label="Payment Condition"
                        placeholder="e.g. Down Payment"
                        {...register("paymentCondition")}
                    />
                </div>
            </section>

            {/* Ownership */}
            <section className="space-y-4 pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 border-b border-gray-100 pb-1">Ownership & Reference</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Owner Name"
                        placeholder="Name of the owner"
                        {...register("ownerName")}
                    />
                    <Input
                        label="Contact Number"
                        placeholder="Phone number"
                        {...register("ownerContact")}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Reference"
                        placeholder="Who referred this?"
                        {...register("reference")}
                    />
                    <Input
                        label="Amenities / Remarks"
                        placeholder="Park facing, Corner etc."
                        {...register("amenities")}
                    />
                </div>
            </section>

            {/* Other Charges */}
            <section className="space-y-4 pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 border-b border-gray-100 pb-1">Additional Charges</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Maintenance Charges"
                        type="number"
                        {...register("maintenanceCharges", { valueAsNumber: true })}
                    />
                    <Input
                        label="Club Charges"
                        type="number"
                        {...register("clubCharges", { valueAsNumber: true })}
                    />
                    <Input
                        label="Cannes Charges"
                        type="number"
                        {...register("cannesCharges", { valueAsNumber: true })}
                    />
                </div>
            </section>

            {/* Sold Info - Only if Status is SOLD */}
            {status === 'SOLD' && (
                <section className="space-y-4 pt-2 bg-red-50 p-4 rounded-lg">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2 border-b border-red-100 pb-1">Sale Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Sold To"
                            placeholder="Buyer Name"
                            {...register("soldTo")}
                        />
                        <Input
                            label="Sold Date"
                            type="date"
                            {...register("soldDate")}
                        />
                    </div>
                </section>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600! hover:bg-indigo-700! w-full md:w-auto"
                >
                    {loading ? "Processing..." : initialData ? "Update Inventory" : "Add Inventory"}
                </Button>
            </div>
        </form>
    );
}
