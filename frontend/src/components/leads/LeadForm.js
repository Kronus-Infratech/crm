"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import Button from "@/src/components/ui/Button";
import api from "@/src/services/api";

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update Lead" : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}
