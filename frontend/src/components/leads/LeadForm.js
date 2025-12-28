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
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  property: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  estimatedValue: z.number().min(0).optional(),
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
      estimatedValue: 0,
      assignedToId: ""
    }
  });

  useEffect(() => {
    // Fetch users for assignment dropdown
    const fetchUsers = async () => {
        try {
            const res = await api.get('/users?limit=100'); // Simple fetch for dropdown
            if(res.data.success) {
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
            estimatedValue: 0,
            assignedToId: ""
        });
    }
  }, [initialData, reset, users]);

  const userOptions = users.map(u => ({
      label: `${u.firstName} ${u.lastName} (${u.role})`,
      value: u.id
  }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          placeholder="John"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <Input
          label="Last Name"
          placeholder="Doe"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="john@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone"
          placeholder="+91..."
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Property Name/Area"
            placeholder="Green Valley Plot 4B"
            error={errors.property?.message}
            {...register("property")}
          />
           <Select 
            label="Assign To"
            options={userOptions}
            error={errors.assignedToId?.message}
            {...register("assignedToId")}
          />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Status"
          options={[
            { label: "New", value: "NEW" },
            { label: "Contacted", value: "CONTACTED" },
            { label: "Qualified", value: "QUALIFIED" },
            { label: "Proposal", value: "PROPOSAL" },
            { label: "Negotiation", value: "NEGOTIATION" },
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
        <Input
          label="Value (₹)"
          type="number"
          error={errors.estimatedValue?.message}
          {...register("estimatedValue", { valueAsNumber: true })}
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
