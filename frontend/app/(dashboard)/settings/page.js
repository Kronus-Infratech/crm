"use client";

import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { HiUser, HiShieldCheck, HiBell, HiKey } from "react-icons/hi";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { useAuth } from "@/src/contexts/AuthContext";

import Heading from "@/src/components/ui/Heading";
import Card from "@/src/components/ui/Card";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";
import api from "@/src/services/api";
import LeavesTab from "@/src/components/settings/LeavesTab";
import { HiBriefcase as HiBriefcaseIcon } from "react-icons/hi";

const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
    phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number"),
    department: z.string().min(1, "Department is required"),
    designation: z.string().min(1, "Designation is required"),
});

const securitySchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");

    const tabs = [
        { id: "profile", label: "Profile", icon: <HiUser /> },
        { id: "security", label: "Security", icon: <HiShieldCheck /> },
        { id: "leaves", label: "Leaves", icon: <HiBriefcaseIcon /> },
        // { id: "notifications", label: "Notifications", icon: <HiBell /> }, // Future
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <Heading level={2}>Account Settings</Heading>
                <p className="text-gray-500 mt-1">Manage your personal information and security preferences.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                    ? "bg-[#009688]/10 text-[#009688]"
                                    : "text-brand-spanish-gray hover:bg-gray-50 hover:text-brand-dark-gray"
                                    }`}
                            >
                                <span className="text-lg">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === "profile" && <ProfileForm />}
                        {activeTab === "security" && <SecurityForm />}
                        {activeTab === "leaves" && <LeavesTab />}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function ProfileForm() {
    const { user: authUser, refreshUser } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(profileSchema)
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get("/users/profile");
                const data = response.data.data;
                setUser(data);
                setValue("name", data.name);
                setValue("email", data.email);
                setValue("phone", data.phone);
                setValue("department", data.department);
                setValue("designation", data.designation);
            } catch (error) {
                console.error("Failed to load profile", error);
            }
        };
        fetchProfile();
    }, [setValue]);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            await api.put("/users/profile", data);
            toast.success("Profile updated successfully!");

            // Sync local state
            setUser({ ...user, ...data });
            setIsEditing(false);

            // Refresh global auth state
            refreshUser();

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    const isUserOnline = (lastLoginAt) => {
        if (!lastLoginAt) return false;
        const lastLogin = new Date(lastLoginAt);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return lastLogin > oneHourAgo;
    };

    if (!user) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

    return (
        <Card className="p-6 md:p-8">
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Public Profile</h3>
                    <p className="text-sm text-gray-500">Manage your personal information.</p>
                </div>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
                        Edit Profile
                    </Button>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <ProfileField
                    label="Full Name"
                    name="name"
                    register={register}
                    isEditing={isEditing}
                    value={user.name}
                    error={errors.name?.message}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileField
                        label="Email Address"
                        name="email"
                        register={register}
                        isEditing={false} // Always read-only
                        value={user.email}
                        note={isEditing ? "Contact admin to change email." : ""}
                        disabled
                    />
                    <ProfileField
                        label="Phone Number"
                        name="phone"
                        register={register}
                        isEditing={isEditing}
                        value={user.phone}
                        error={errors.phone?.message}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileField
                        label="Department"
                        name="department"
                        register={register}
                        isEditing={isEditing}
                        value={user.department}
                        placeholder="e.g. Sales"
                        error={errors.department?.message}
                    />
                    <ProfileField
                        label="Designation"
                        name="designation"
                        register={register}
                        isEditing={isEditing}
                        value={user.designation}
                        placeholder="e.g. Senior Manager"
                        error={errors.designation?.message}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Roles</label>
                        <div className="flex flex-wrap gap-1">
                            {(user.roles || []).map(role => (
                                <span key={role} className="inline-block px-2 py-1 bg-[#009688]/10 text-[#009688] rounded text-[10px] font-bold ring-1 ring-[#009688]/20">
                                    {role}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Status</label>
                        <div className={`font-medium flex items-center gap-2 ${isUserOnline(user.lastLoginAt) ? "text-[#8DC63F]" : "text-brand-spanish-gray"}`}>
                            <span className={`w-2 h-2 rounded-full ${isUserOnline(user.lastLoginAt) ? "bg-[#8DC63F] animate-pulse" : "bg-brand-spanish-gray/30"}`}></span>
                            {isUserOnline(user.lastLoginAt) ? "Online" : "Away"}
                        </div>
                    </div>
                </div>



                {isEditing && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                )}
            </form>
        </Card>
    );
}

function ProfileField({ label, name, register, isEditing, value, disabled, note, placeholder, error }) {
    if (!isEditing) {
        return (
            <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
                <div className="text-gray-900 font-medium py-2 border-b border-gray-100 min-h-10">
                    {value || <span className="text-gray-400 italic">Not set</span>}
                </div>
            </div>
        );
    }

    return (
        <Input
            label={label}
            {...register(name)}
            disabled={disabled}
            className={disabled ? "bg-gray-50 cursor-not-allowed" : ""}
            note={note}
            placeholder={placeholder}
            error={error}
        />
    );
}

function SecurityForm() {
    const [loading, setLoading] = useState(false);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(securitySchema)
    });

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            await api.put("/auth/change-password", {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });
            toast.success("Password changed successfully!");
            reset();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to change password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-6 md:p-8">
            <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Password & Security</h3>
                <p className="text-sm text-gray-500">Ensure your account is using a long, random password to stay secure.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
                <Input
                    label="Current Password"
                    type="password"
                    error={errors.currentPassword?.message}
                    {...register("currentPassword")}
                />

                <div className="space-y-4 pt-2">
                    <Input
                        label="New Password"
                        type="password"
                        error={errors.newPassword?.message}
                        {...register("newPassword")}
                        note="Min 8 chars, 1 Upper, 1 Lower, 1 Number, 1 Special"
                    />
                    <Input
                        label="Confirm New Password"
                        type="password"
                        error={errors.confirmPassword?.message}
                        {...register("confirmPassword")}
                    />
                </div>



                <div className="pt-4">
                    <Button type="submit" variant="outline" disabled={loading} className="w-full sm:w-auto">
                        {loading ? "Updating..." : "Update Password"}
                    </Button>
                </div>
            </form>
        </Card>
    )
}
