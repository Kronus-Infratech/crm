"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { useAuth } from "@/src/contexts/AuthContext";

import BgLayout from "@/src/components/layout/BgLayout";
import Card from "@/src/components/ui/Card";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";
import Heading from "@/src/components/ui/Heading";
import api from "@/src/services/api";

const schema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
    const { login: authLogin } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
            const response = await api.post("/auth/login", data);
            if (response.data.success) {
                authLogin(response.data.data.user, response.data.data.token);
            }
        } catch (err) {
            setError(
                err.response?.data?.message || "Login failed. Please check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <BgLayout showFooter={false}>
            <div className="flex items-center justify-center min-h-[calc(100vh-140px)] px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <Card glass className="bg-white/80 p-6">
                        <div className="text-center mb-8">
                            <Heading level={2} className="text-brand-primary mb-2">Welcome Back</Heading>
                            <p className="text-gray-600">Sign in to your account to continue</p>
                        </div>

                        {error && (
                            <div className="bg-brand-red/10 text-brand-red p-3 rounded-lg text-sm mb-6 text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="you@company.com"
                                error={errors.email?.message}
                                {...register("email")}
                            />

                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                error={errors.password?.message}
                                {...register("password")}
                            />

                            <div className="flex items-center justify-end text-sm">
                                <Link href="/forgot-password" className="text-brand-primary hover:underline font-medium">
                                    Forgot Password?
                                </Link>
                            </div>

                            <Button type="submit" fullWidth disabled={loading}>
                                {loading ? "Signing In..." : "Sign In"}
                            </Button>
                        </form>

                    </Card>
                </motion.div>
            </div>
        </BgLayout>
    );
}
