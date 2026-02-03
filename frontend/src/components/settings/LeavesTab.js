"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/src/services/api";
import { toast } from "react-hot-toast";
import Card from "@/src/components/ui/Card";
import Button from "@/src/components/ui/Button";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import { HiPlus, HiClock, HiCheckCircle, HiXCircle } from "react-icons/hi";
import { formatDate } from "@/src/utils/formatters";
import clsx from "clsx";

const leaveSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  type: z.enum(["SICK", "CASUAL", "EARNED", "PATERNITY", "MATERNITY", "OTHER"]),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

export default function LeavesTab() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      type: "CASUAL",
    },
  });

  const fetchMyLeaves = async () => {
    try {
      const response = await api.get("/leaves/my");
      setLeaves(response.data.data);
    } catch (error) {
      console.error("Failed to fetch leaves", error);
      toast.error("Failed to load your leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await api.post("/leaves", data);
      toast.success("Leave application submitted successfully!");
      setShowForm(false);
      reset();
      fetchMyLeaves();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to submit leave application");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "APPROVED": return "bg-[#8DC63F]/10 text-[#8DC63F] ring-1 ring-[#8DC63F]/30";
      case "REJECTED": return "bg-red-500/10 text-red-500 ring-1 ring-red-500/30";
      default: return "bg-[#FBB03B]/10 text-[#FBB03B] ring-1 ring-[#FBB03B]/30";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROVED": return <HiCheckCircle className="w-4 h-4" />;
      case "REJECTED": return <HiXCircle className="w-4 h-4" />;
      default: return <HiClock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Leave Management</h3>
          <p className="text-sm text-gray-500">Track and apply for your leaves.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "primary"}
          className="gap-2"
        >
          {showForm ? "Cancel" : <><HiPlus /> Apply for Leave</>}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-brand-primary/20 bg-brand-primary/2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Start Date"
                type="date"
                {...register("startDate")}
                error={errors.startDate?.message}
              />
              <Input
                label="End Date"
                type="date"
                {...register("endDate")}
                error={errors.endDate?.message}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Leave Type"
                {...register("type")}
                error={errors.type?.message}
                options={[
                  { value: "SICK", label: "Sick Leave" },
                  { value: "CASUAL", label: "Casual Leave" },
                  { value: "EARNED", label: "Earned Leave" },
                  { value: "PATERNITY", label: "Paternity Leave" },
                  { value: "MATERNITY", label: "Maternity Leave" },
                  { value: "OTHER", label: "Other" },
                ]}
              />
            </div>

            <Input
              label="Reason for Leave"
              placeholder="Please provide a brief reason for your leave request"
              {...register("reason")}
              error={errors.reason?.message}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Dates</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-400">Loading leaves...</td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic">No leave requests found.</td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase mt-0.5">
                        {Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} day(s)
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {leave.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        getStatusStyle(leave.status)
                      )}>
                        {getStatusIcon(leave.status)}
                        {leave.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[10vw] truncate">
                      {leave.reason}
                      {leave.rejectionReason && (
                        <div className="text-[10px] text-red-500 mt-1 font-medium max-w-[10vw] truncate">
                          Note: {leave.rejectionReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
