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
import { HiCloudUpload, HiX, HiDocumentText, HiPhotograph } from "react-icons/hi";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).or(z.null()),
  phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number"),
  property: z.string().min(1, "Property is required"),
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "NOT_INTERESTED", "SITE_VISIT", "NEGOTIATION", "DOCUMENTATION", "WON", "LOST"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  source: z.enum(["WEBSITE", "REFERRAL", "INSTAGRAM", "YOUTUBE", "EMAIL", "WHATSAPP", "NINETY_NINE_ACRES", "MAGICBRICKS", "OLX", "COLD_OUTREACH", "WALK_IN"]).optional(),
  value: z.number().min(0, "Value must be positive").optional(),
  followUpDate: z.string().optional(),
  assignedToId: z.string().optional(),
  inventoryItemId: z.string().optional().or(z.literal("")).or(z.null()),
});

export default function LeadForm({ initialData, onSubmit, loading }) {
  const [users, setUsers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isCustomProperty, setIsCustomProperty] = useState(false);

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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

  const handleFormSubmit = async (data) => {
    try {
      let documents = [];

      if (selectedFiles.length > 0) {
        setUploading(true);
        const uploadPromises = selectedFiles.map(file => uploadFile(file));
        documents = await Promise.all(uploadPromises);
        setUploading(false);
      }

      await onSubmit({ ...data, documents });
      setSelectedFiles([]);
    } catch (error) {
      console.error("Upload failed", error);
      setUploading(false);
      toast.error("Failed to upload files. Please try again.");
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users?limit=100');
        if (res.data.success) {
          setUsers(res.data.data.users);
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    
    const fetchInventory = async () => {
      try {
        const res = await api.get('/inventory/items?status=AVAILABLE');
        if (res.data.success) {
          setInventoryItems(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch inventory", err);
      }
    };
    
    fetchUsers();
    fetchInventory();
  }, []);

  useEffect(() => {
    let assignedId = "";
    if (initialData) {
      assignedId = initialData.assignedTo?.id || initialData.assignedToId || "";
    }

    if (initialData) {
      const formData = {
        ...initialData,
        assignedToId: assignedId,
        followUpDate: initialData.followUpDate ? new Date(initialData.followUpDate).toISOString().split('T')[0] : ""
      };
      reset(formData);
      
      // Auto-detect if property is custom
      if (initialData.property && inventoryItems.length > 0) {
        const matchesInventory = inventoryItems.some(item => {
          const inventoryValue = `${item.project?.name || 'Unknown'} - Plot ${item.plotNumber}`;
          return inventoryValue === initialData.property;
        });
        if (!matchesInventory) {
          setIsCustomProperty(true);
        }
      }
    } else {
      reset({
        status: "NEW",
        priority: "MEDIUM",
        source: "WEBSITE",
        value: 0,
        assignedToId: "",
        inventoryItemId: ""
      });
      setIsCustomProperty(false);
    }
  }, [initialData, reset, inventoryItems]);

  const userOptions = users.map(u => ({
    label: `${u.name} (${u.roles[0]})`,
    value: u.id
  }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 text-black p-1">
      {/* Contact Info Group */}
      <section className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Lead Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Customer Name"
            placeholder="e.g. Rahul Sharma"
            className="text-black!"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Contact Number"
            placeholder="+91 99999 00000"
            className="text-black!"
            error={errors.phone?.message}
            {...register("phone")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Email Address"
            type="email"
            placeholder="rahul@example.com"
            className="text-black!"
            error={errors.email?.message}
            {...register("email")}
          />
          <div className="relative group">
            {isCustomProperty ? (
              <Input
                label="Interested Property"
                placeholder="e.g. Kronus Heights, 3BHK"
                className="text-black!"
                error={errors.property?.message}
                {...register("property")}
              />
            ) : (
              <Select
                label="Interested Property"
                className="text-black!"
                placeholder="-- Select from Inventory --"
                options={inventoryItems.map(item => ({
                  label: `${item.project?.name || 'Unknown'} - Plot ${item.plotNumber} (${item.size || 'N/A'})`,
                  value: item.id
                }))}
                error={errors.inventoryItemId?.message || errors.property?.message}
                onChange={(e) => {
                  const val = e.target.value;
                  setValue("inventoryItemId", val);
                  if (val) {
                    const selected = inventoryItems.find(i => i.id === val);
                    const propName = `${selected.project?.name || 'Unknown'} - Plot ${selected.plotNumber}`;
                    setValue("property", propName);
                  } else {
                    setValue("property", "");
                  }
                }}
                defaultValue={initialData?.inventoryItemId || ""}
              />
            )}
            <button
              type="button"
              onClick={() => setIsCustomProperty(!isCustomProperty)}
              className="absolute right-0 top-0 text-[10px] uppercase font-black tracking-widest text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded"
            >
              {isCustomProperty ? "Select from Inventory" : "Use Custom Text"}
            </button>
          </div>
        </div>
      </section>

      {/* Business Details Group */}
      <section className="space-y-4 pt-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Deal Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Select
            label="Source"
            className="text-black!"
            options={[
              { label: "Website", value: "WEBSITE" },
              { label: "Referral", value: "REFERRAL" },
              { label: "Instagram", value: "INSTAGRAM" },
              { label: "YouTube", value: "YOUTUBE" },
              { label: "WhatsApp", value: "WHATSAPP" },
              { label: "99Acres", value: "NINETY_NINE_ACRES" },
              { label: "MagicBricks", value: "MAGICBRICKS" },
              { label: "OLX", value: "OLX" },
              { label: "Cold Outreach", value: "COLD_OUTREACH" },
              { label: "Walk In", value: "WALK_IN" },
            ]}
            error={errors.source?.message}
            {...register("source")}
          />
          <Select
            label="Pipeline Status"
            className="text-black!"
            options={[
              { label: "New Lead", value: "NEW" },
              { label: "Contacted", value: "CONTACTED" },
              { label: "Interested", value: "INTERESTED" },
              { label: "Site Visit Scheduled", value: "SITE_VISIT" },
              { label: "Negotiation", value: "NEGOTIATION" },
              { label: "Documentation", value: "DOCUMENTATION" },
              { label: "Closed Won", value: "WON" },
              { label: "Closed Lost", value: "LOST" },
            ]}
            error={errors.status?.message}
            {...register("status")}
          />
          <Select
            label="Priority Level"
            className="text-black!"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input
            label="Property Value (₹)"
            type="number"
            className="text-black!"
            error={errors.value?.message}
            {...register("value", { valueAsNumber: true })}
          />
          <Input
            label="Next Follow-up"
            type="date"
            className="text-black!"
            error={errors.followUpDate?.message}
            {...register("followUpDate")}
          />
          <Select
            label="Assign Agent"
            className="text-black!"
            options={[{ label: "Unassigned", value: "" }, ...userOptions]}
            error={errors.assignedToId?.message}
            {...register("assignedToId")}
          />
        </div>
      </section>

      {/* Attachments Section */}
      <section className="space-y-4 pt-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Project Documents</h4>
        <div className="relative group border-2 border-dashed border-gray-100 rounded-lg p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer overflow-hidden">
          <input
            type="file"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={handleFileSelect}
            accept="image/*,.pdf"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
              <HiCloudUpload size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Upload property documents</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Images or PDF up to 10MB each</p>
            </div>
          </div>
        </div>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">
                    {file.type.includes('image') ? <HiPhotograph size={20} /> : <HiDocumentText size={20} />}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{file.name}</p>
                    <p className="text-[10px] font-bold text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <HiX size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="flex items-center justify-center gap-2 py-4 text-indigo-600 animate-pulse">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-black uppercase tracking-widest">Encrypting & Uploading...</span>
          </div>
        )}
      </section>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
        <Button
          type="submit"
          disabled={loading || uploading}
          className="bg-indigo-600! hover:bg-indigo-700! px-10! py-4! text-base font-black shadow-xl shadow-indigo-100 rounded-lg!"
        >
          {loading || uploading ? "Processing..." : initialData ? "Save Changes" : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}
