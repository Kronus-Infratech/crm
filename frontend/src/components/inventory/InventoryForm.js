"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import Button from "@/src/components/ui/Button";
import { useState } from "react";
import { uploadFile } from "@/src/services/r2";
import { HiCloudUpload, HiX, HiPhotograph } from "react-icons/hi";
import { toast } from "react-hot-toast";

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

    transactionType: z.enum(["SALE", "RENT", "LEASE"]),
    propertyType: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "INSTITUTIONAL", "AGRICULTURAL", "OTHER"]),
    openSides: z.number().min(0).optional().nullable(),
    construction: z.boolean().optional(),
    boundaryWalls: z.boolean().optional(),
    gatedColony: z.boolean().optional(),
    corner: z.boolean().optional(),
    condition: z.enum(["NEW", "RESALE"]),

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
    soldDate: z.string().optional(),
    images: z.array(z.string()).optional()
});

export default function InventoryForm({ initialData, onSubmit, loading, selectedProject, projects = [] }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

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
            projectId: selectedProject || "",
            transactionType: "SALE",
            propertyType: "RESIDENTIAL",
            openSides: 1,
            construction: false,
            boundaryWalls: false,
            gatedColony: false,
            corner: false,
            condition: "NEW"
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

    const handleFileSelect = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFormSubmit = async (data) => {
        try {
            let uploadedImages = initialData?.images || [];
            
            if (selectedFiles.length > 0) {
                setUploading(true);
                const uploadPromises = selectedFiles.map(file => uploadFile(file));
                const newImages = await Promise.all(uploadPromises);
                uploadedImages = [...uploadedImages, ...newImages];
                setUploading(false);
            }

            onSubmit({ ...data, images: uploadedImages });
            setSelectedFiles([]);
        } catch (error) {
            console.error("Upload failed", error);
            setUploading(false);
            toast.error("Failed to upload images. Please try again.");
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 text-black p-1 max-h-[70vh] overflow-y-auto pr-2">

            {/* Basic Details */}
            <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#009688] mb-2 border-b border-brand-spanish-gray/20 pb-1">Property Details</h4>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Transaction Type"
                        options={[
                            { label: "Sale", value: "SALE" },
                            { label: "Rent", value: "RENT" },
                            { label: "Lease", value: "LEASE" },
                        ]}
                        error={errors.transactionType?.message}
                        {...register("transactionType")}
                    />
                    <Select
                        label="Property Type"
                        options={[
                            { label: "Residential", value: "RESIDENTIAL" },
                            { label: "Commercial", value: "COMMERCIAL" },
                            { label: "Industrial", value: "INDUSTRIAL" },
                            { label: "Institutional", value: "INSTITUTIONAL" },
                            { label: "Agricultural", value: "AGRICULTURAL" },
                            { label: "Other", value: "OTHER" },
                        ]}
                        error={errors.propertyType?.message}
                        {...register("propertyType")}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        label="Condition"
                        options={[
                            { label: "New", value: "NEW" },
                            { label: "Resale", value: "RESALE" },
                        ]}
                        error={errors.condition?.message}
                        {...register("condition")}
                    />
                    <Input
                        label="No. of Open Sides"
                        type="number"
                        {...register("openSides", { valueAsNumber: true })}
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="construction" {...register("construction")} className="w-4 h-4 text-[#009688] border-gray-300 rounded-lg focus:ring-[#009688]" />
                        <label htmlFor="construction" className="text-sm font-medium text-brand-dark-gray">Construction</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="boundaryWalls" {...register("boundaryWalls")} className="w-4 h-4 text-[#009688] border-gray-300 rounded-lg focus:ring-[#009688]" />
                        <label htmlFor="boundaryWalls" className="text-sm font-medium text-brand-dark-gray">Boundary Walls</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="gatedColony" {...register("gatedColony")} className="w-4 h-4 text-[#009688] border-gray-300 rounded-lg focus:ring-[#009688]" />
                        <label htmlFor="gatedColony" className="text-sm font-medium text-brand-dark-gray">Gated Colony</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="corner" {...register("corner")} className="w-4 h-4 text-[#009688] border-gray-300 rounded-lg focus:ring-[#009688]" />
                        <label htmlFor="corner" className="text-sm font-medium text-brand-dark-gray">Corner</label>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="space-y-4 pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#009688] mb-2 border-b border-brand-spanish-gray/20 pb-1">Pricing & Payment</h4>
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
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#009688] mb-2 border-b border-brand-spanish-gray/20 pb-1">Ownership & Reference</h4>
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
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#009688] mb-2 border-b border-brand-spanish-gray/20 pb-1">Additional Charges</h4>
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
                <section className="space-y-4 pt-2 bg-red-500/10 p-4 rounded-lg">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2 border-b border-red-500/20 pb-1">Sale Details</h4>
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

            {/* Media Section */}
            <section className="space-y-4 pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#009688] mb-2 border-b border-brand-spanish-gray/20 pb-1">Property Media</h4>
                
                {/* Existing Images Previews */}
                {initialData?.images && initialData.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {initialData.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 group">
                                <img src={img} alt="Property" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newImages = initialData.images.filter((_, i) => i !== idx);
                                        setValue("images", newImages);
                                    }}
                                    className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                >
                                    <HiX size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative group border-2 border-dashed border-brand-spanish-gray/30 rounded-lg p-6 text-center hover:border-[#009688] hover:bg-[#009688]/5 transition-all cursor-pointer overflow-hidden">
                    <input
                        type="file"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleFileSelect}
                        accept="image/*"
                    />
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-[#009688] group-hover:scale-110 transition-transform">
                            <HiCloudUpload size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-900">Upload property photos</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Drag & drop or click to browse</p>
                        </div>
                    </div>
                </div>

                {selectedFiles.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded-lg shadow-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <HiPhotograph size={18} className="text-[#009688]" />
                                    <p className="text-[10px] font-bold text-gray-900 truncate">{file.name}</p>
                                </div>
                                <button type="button" onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500">
                                    <HiX size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {uploading && (
                    <div className="flex items-center justify-center gap-2 py-2 text-[#009688] animate-pulse">
                        <div className="w-3 h-3 border-2 border-[#009688] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Uploading Media...</span>
                    </div>
                )}
            </section>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <Button
                    type="submit"
                    disabled={loading || uploading}
                    className="bg-[#009688]! hover:bg-[#00796B]! w-full md:w-auto"
                >
                    {loading || uploading ? "Processing..." : initialData ? "Update Inventory" : "Add Inventory"}
                </Button>
            </div>
        </form>
    );
}
