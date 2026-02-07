"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import BgLayout from "@/src/components/layout/BgLayout";
import Card from "@/src/components/ui/Card";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";
import Heading from "@/src/components/ui/Heading";
import api from "@/src/services/api";
import { HiArrowLeft, HiCheckCircle, HiFingerPrint } from "react-icons/hi";

const schema = z.object({
    email: z.string().email("Invalid email address"),
});

export default function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);

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
            const response = await api.post("/auth/forgot-password", data);
            if (response.data.success) {
                setSubmitted(true);
            }
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to process request. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <BgLayout showFooter={false}>
            <div className="flex items-center justify-center min-h-[calc(100vh-140px)] px-4 bg-gray-50/50">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full max-w-lg"
                >
                    <Card glass className="bg-white/95 p-12 border border-brand-spanish-gray/10 shadow-3xl relative overflow-hidden rounded-4xl">
                        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-brand-teal via-brand-yellow-green to-brand-sunshade"></div>
                        
                        {!submitted ? (
                            <>
                                <div className="text-center mb-10">
                                    <Heading level={2} className="text-4xl font-black text-brand-dark-gray tracking-tighter uppercase mb-3">Forgot Password</Heading>
                                    <p className="text-brand-spanish-gray font-medium text-sm max-w-[280px] mx-auto leading-relaxed">
                                        Reset your password by providing your registered email address.
                                    </p>
                                </div>

                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }} 
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-red-50 text-red-600 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest mb-10 border border-red-100 flex items-center gap-4 shadow-sm"
                                    >
                                        <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shrink-0">!</div>
                                        {error}
                                    </motion.div>
                                )}

                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 group">
                                    <div className="space-y-2">
                                        <Input
                                            label="Registered Email Address"
                                            type="email"
                                            placeholder="user@kronusinfra.org"
                                            className="py-5! px-6! bg-gray-50/50 border-brand-spanish-gray/20 focus:border-brand-teal focus:ring-8 focus:ring-brand-teal/5 transition-all font-bold text-brand-dark-gray placeholder:text-brand-spanish-gray/50 rounded-xl"
                                            error={errors.email?.message}
                                            {...register("email")}
                                        />
                                    </div>

                                    <div className="space-y-6 pt-4">
                                        <Button 
                                            type="submit" 
                                            fullWidth 
                                            disabled={loading}
                                            className="py-6 font-black uppercase tracking-[0.25em] text-xs shadow-2xl shadow-brand-teal/30 bg-brand-teal hover:bg-brand-dark-gray transform active:scale-[0.97] transition-all duration-300 rounded-xl border-none"
                                        >
                                            {loading ? "Sending Link..." : "Send Reset Link"}
                                        </Button>
                                        
                                        <Link 
                                            href="/login" 
                                            className="flex items-center justify-center gap-2 text-brand-spanish-gray hover:text-brand-teal font-black uppercase text-[10px] tracking-[0.2em] transition-all group/back py-2"
                                        >
                                            <HiArrowLeft size={16} className="group-hover/back:-translate-x-1 transition-transform" />
                                            Cancel and Return to Login
                                        </Link>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8"
                            >
                                <div className="w-24 h-24 bg-brand-yellow-green/10 text-brand-yellow-green rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner relative">
                                    <HiCheckCircle size={56} className="animate-in zoom-in duration-700 fade-in" />
                                    <div className="absolute inset-0 rounded-full border-4 border-brand-yellow-green/20 animate-ping"></div>
                                </div>
                                <Heading level={2} className="text-4xl font-black text-brand-dark-gray tracking-tighter uppercase mb-4">Password Reset Successful</Heading>
                                <p className="text-brand-spanish-gray font-medium text-sm leading-relaxed mb-12 max-w-[320px] mx-auto">
                                    Check your email for further instructions.
                                </p>
                                <Link href="/login" className="block w-full">
                                    <Button fullWidth className="py-6 font-black uppercase tracking-[0.25em] text-xs bg-brand-dark-gray hover:bg-black transition-all shadow-xl rounded-xl">
                                        Back to Login
                                    </Button>
                                </Link>
                                <div className="mt-12 pt-8 border-t border-brand-spanish-gray/10">
                                    <p className="text-[10px] font-black text-brand-spanish-gray uppercase tracking-widest leading-loose">
                                        Didn't receive the email? <br />
                                        <button onClick={() => setSubmitted(false)} className="text-brand-teal hover:text-brand-yellow-green transition-colors mt-2 underline-offset-4 underline">Send Reset Link Again</button>
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </Card>
                </motion.div>
            </div>
        </BgLayout>
    );
}
