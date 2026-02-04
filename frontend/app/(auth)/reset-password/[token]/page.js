"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

import BgLayout from "@/src/components/layout/BgLayout";
import Card from "@/src/components/ui/Card";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";
import Heading from "@/src/components/ui/Heading";
import api from "@/src/services/api";
import { HiLockClosed, HiCheckCircle, HiShieldCheck } from "react-icons/hi";

const schema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export default function ResetPassword({ params }) {
    const { token } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data) => {
        setLoading(true);
        setError("");
        try {
            const response = await api.put(`/auth/reset-password/${token}`, {
                password: data.password
            });
            if (response.data.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            }
        } catch (err) {
            setError(
                err.response?.data?.message || "Reset failed. The link may be invalid or expired."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <BgLayout showFooter={false}>
            <div className="flex items-center justify-center min-h-[calc(100vh-140px)] px-4 bg-gray-50/50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg"
                >
                    <Card glass className="bg-white/95 p-12 border border-brand-spanish-gray/10 shadow-3xl rounded-[2.5rem] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-brand-teal to-brand-yellow-green"></div>

                        {!success ? (
                            <>
                                <div className="text-center mb-10">
                                    <div className="w-20 h-20 bg-brand-yellow-green/10 text-brand-yellow-green rounded-3xl flex items-center justify-center mx-auto mb-8 transform rotate-6 hover:rotate-0 transition-all duration-500 shadow-lg">
                                        <HiShieldCheck size={44} />
                                    </div>
                                    <Heading level={2} className="text-4xl font-black text-brand-dark-gray tracking-tighter uppercase mb-4">Reset Credentials</Heading>
                                    <p className="text-brand-spanish-gray font-medium text-sm max-w-[300px] mx-auto leading-relaxed">
                                        Establish a new secure access pattern for your Nexus account.
                                    </p>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-red-50 text-red-600 p-5 rounded-2xl text-[10px] font-black uppercase tracking-wider mb-10 border border-red-100 flex items-center gap-4"
                                    >
                                        <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">!</div>
                                        {error}
                                    </motion.div>
                                )}

                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                                    <Input
                                        label="New Password"
                                        type="password"
                                        placeholder="••••••••••••"
                                        className="py-5! px-6! bg-gray-50/50 border-brand-spanish-gray/20 focus:border-brand-teal focus:ring-8 focus:ring-brand-teal/5 transition-all font-bold text-brand-dark-gray rounded-xl"
                                        error={errors.password?.message}
                                        {...register("password")}
                                    />

                                    <Input
                                        label="Confirm New Password"
                                        type="password"
                                        placeholder="••••••••••••"
                                        className="py-5! px-6! bg-gray-50/50 border-brand-spanish-gray/20 focus:border-brand-teal focus:ring-8 focus:ring-brand-teal/5 transition-all font-bold text-brand-dark-gray rounded-xl"
                                        error={errors.confirmPassword?.message}
                                        {...register("confirmPassword")}
                                    />

                                    <div className="pt-6">
                                        <Button
                                            type="submit"
                                            fullWidth
                                            disabled={loading}
                                            className="py-6 font-black uppercase tracking-[0.25em] text-xs shadow-2xl shadow-brand-teal/20 bg-brand-teal hover:bg-brand-dark-gray transition-all duration-300 rounded-xl"
                                        >
                                            {loading ? "Re-encrypting..." : "Update Credentials"}
                                        </Button>

                                        <div className="mt-8 text-center">
                                            <Link href="/login" className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest hover:text-brand-teal transition-colors">
                                                Return to Login Nexus
                                            </Link>
                                        </div>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-10"
                            >
                                <div className="w-24 h-24 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
                                    <HiCheckCircle size={60} className="animate-in zoom-in duration-500" />
                                </div>
                                <Heading level={2} className="text-4xl font-black text-brand-dark-gray tracking-tighter uppercase mb-6">Reset Complete</Heading>
                                <p className="text-brand-spanish-gray font-medium text-sm leading-relaxed mb-10 max-w-[320px] mx-auto">
                                    Your secure access pattern has been updated successfully. Redirecting you to the Nexus Login...
                                </p>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 3 }}
                                        className="h-full bg-brand-teal"
                                    ></motion.div>
                                </div>
                            </motion.div>
                        )}
                    </Card>
                </motion.div>
            </div>
        </BgLayout>
    );
}
