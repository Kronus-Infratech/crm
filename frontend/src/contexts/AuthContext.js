"use client";

import { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import api from "@/src/services/api";
import { useRouter, usePathname } from "next/navigation";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchProfile = async () => {
        try {
            const response = await api.get("/auth/me");
            if (response.data.success) {
                setUser(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch user profile", error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = Cookies.get("token");
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = Cookies.get("token");
        const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
        const isPublicPage = isAuthPage || pathname.startsWith("/feedback");

        if (!loading && !token && !isPublicPage) {
            router.push("/login");
        }

        if (!loading && token && isAuthPage) {
            router.push("/dashboard");
        }
    }, [loading, pathname, router]);

    const login = (userData, token) => {
        // Session cookie: no 'expires' specified
        Cookies.set("token", token, { secure: true, sameSite: "strict" });
        setUser(userData);
        router.push("/dashboard");
    };

    const logout = () => {
        Cookies.remove("token");
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchProfile, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
