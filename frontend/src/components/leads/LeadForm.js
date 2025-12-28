"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import Button from "@/src/components/ui/Button";
import api from "@/src/services/api";
import { toast } from "react-hot-toast";
import { uploadFile } from "@/src/services/supabase";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number"),
  property: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "NOT_INTERESTED", "SITE_VISIT", "NEGOTIATION", "DOCUMENTATION", "WON", "LOST"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  source: z.enum(["WEBSITE", "REFERRAL", "INSTAGRAM", "YOUTUBE", "EMAIL", "WHATSAPP", "NINETY_NINE_ACRES", "MAGICBRICKS", "OLX", "COLD_OUTREACH"]).optional(),
  value: z.number().min(0, "Value must be positive").optional(),
  followUpDate: z.string().optional(),
  assignedToId: z.string().optional(),
});

export default function LeadForm({ initialData, onSubmit, loading }) {
  const [users, setUsers] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // TODO: Add size validation if needed here (e.g. max 5MB)
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (data) => {
    try {
      let documents = [];

      if (selectedFiles.length > 0) {
        setUploading(true);
        const uploadPromises = selectedFiles.map(file => uploadFile(file));
        documents = await Promise.all(uploadPromises);
        setUploading(false);
      }

      // Pass documents to the parent onSubmit handler
      await onSubmit({ ...data, documents });

      // Clear files on success
      setSelectedFiles([]);

    } catch (error) {
      console.error("Upload failed", error);
      setUploading(false);
      toast.error("Failed to upload files. Please try again.");
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "NEW",
      priority: "MEDIUM",
      source: "WEBSITE",
      value: 0,
      assignedToId: ""
    }
  });

  useEffect(() => {
    // Fetch users for assignment dropdown
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users?limit=100'); // Simple fetch for dropdown
        if (res.data.success) {
          setUsers(res.data.data.users);
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    // Determine the assignedToId value
    let assignedId = "";
    if (initialData) {
      assignedId = initialData.assignedTo?.id || initialData.assignedToId || "";
    }

    if (initialData) {
      const formData = {
        ...initialData,
        assignedToId: assignedId
      };
      reset(formData);
    } else {
      // Reset to defaults for Create mode
      reset({
        status: "NEW",
        priority: "MEDIUM",
        source: "WEBSITE",
        value: 0,
        assignedToId: ""
      });
    }
  }, [initialData, reset, users]);

  const userOptions = users.map(u => ({
    label: `${u.name} (${u.role})`,
    value: u.id
  }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Full Name"
          placeholder="John Doe"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Phone"
          placeholder="+91 98765 43210"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Email (Optional)"
          type="email"
          placeholder="john@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Property Name/Area"
          placeholder="Green Valley Plot 4B"
          error={errors.property?.message}
          {...register("property")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Source"
          options={[
            { label: "Website", value: "WEBSITE" },
            { label: "Referral", value: "REFERRAL" },
            { label: "Instagram", value: "INSTAGRAM" },
            { label: "YouTube", value: "YOUTUBE" },
            { label: "Email", value: "EMAIL" },
            { label: "WhatsApp", value: "WHATSAPP" },
            { label: "99Acres", value: "NINETY_NINE_ACRES" },
            { label: "MagicBricks", value: "MAGICBRICKS" },
            { label: "OLX", value: "OLX" },
            { label: "Cold Outreach", value: "COLD_OUTREACH" },
          ]}
          error={errors.source?.message}
          {...register("source")}
        />
        <Select
          label="Status"
          options={[
            { label: "New", value: "NEW" },
            { label: "Contacted", value: "CONTACTED" },
            { label: "Interested", value: "INTERESTED" },
            { label: "Not Interested", value: "NOT_INTERESTED" },
            { label: "Site Visit", value: "SITE_VISIT" },
            { label: "Negotiation", value: "NEGOTIATION" },
            { label: "Documentation", value: "DOCUMENTATION" },
            { label: "Won", value: "WON" },
            { label: "Lost", value: "LOST" },
          ]}
          error={errors.status?.message}
          {...register("status")}
        />
        <Select
          label="Priority"
          options={[
            { label: "Low", value: "LOW" },
            { label: "Medium", value: "MEDIUM" },
            { label: "High", value: "HIGH" },
            { label: "Urgent", value: "URGENT" },
          ]}
          error={errors.priority?.message}
          {...register("priority")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Value (₹)"
          type="number"
          error={errors.value?.message}
          {...register("value", { valueAsNumber: true })}
        />
        <Input
          label="Follow-up Date (Optional)"
          type="date"
          error={errors.followUpDate?.message}
          {...register("followUpDate")}
        />
        <Select
          label="Assign To"
          options={userOptions}
          error={errors.assignedToId?.message}
          {...register("assignedToId")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <label className="block text-sm font-medium text-gray-700">Attachments (PDF / Images)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-primary transition-colors cursor-pointer relative bg-gray-50">
          <input
            type="file"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileSelect}
            accept="image/*,.pdf"
          />
          <div className="text-gray-500">
            <span className="text-brand-primary font-medium">Click to upload</span> or drag and drop
            <p className="text-xs mt-1">PDF, PNG, JPG up to 5MB</p>
          </div>
        </div>

        {/* File List */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2 mt-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-gray-500 text-xs font-bold">
                    {file.name.split('.').pop().toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Uploading Status */}
        {uploading && (
          <div className="text-sm text-brand-primary flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            Uploading files...
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={loading || uploading}>
          {loading || uploading ? "Processing..." : initialData ? "Update Lead" : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}
