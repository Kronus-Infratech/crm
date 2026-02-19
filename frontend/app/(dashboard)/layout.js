"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HiHome, HiUsers, HiBriefcase, HiCurrencyRupee, HiCog, HiLogout, HiMenuAlt2, HiOfficeBuilding, HiChip, HiCalendar, HiUserAdd, HiChartBar, HiMap, HiGlobe } from "react-icons/hi";
import clsx from "clsx";
import { useAuth } from "@/src/contexts/AuthContext";

export default function DashboardLayout({ children }) {
    const { user, logout, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
    };

    const menuItems = [
        { name: "Dashboard", href: "/dashboard", icon: HiHome },
        { name: "Leads", href: "/leads", icon: HiBriefcase },
        { name: "Inventory", href: "/inventory", icon: HiOfficeBuilding },
        { name: "Map", href: "/map", icon: HiMap },
        { name: "Google Map", href: "/google-map", icon: HiGlobe },
        { name: "Finance", href: "/finance", icon: HiCurrencyRupee, allowedRoles: ["ADMIN", "EXECUTIVE", "DIRECTOR", "FINANCE"] },
        { name: "HR", href: "/hr", icon: HiUsers, allowedRoles: ["ADMIN", "HR"] },
        { name: "Calendar", href: "/calendar", icon: HiCalendar },
        { name: "AI Insights", href: "/ai", icon: HiChip },
        { name: "Reports", href: "/reports", icon: HiChartBar, allowedRoles: ["ADMIN", "EXECUTIVE", "DIRECTOR"] },
        { name: "Users", href: "/users", icon: HiUserAdd, allowedRoles: ["ADMIN", "DIRECTOR", "EXECUTIVE"] },
        { name: "Settings", href: "/settings", icon: HiCog },
    ];

    if (loading || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-10 h-10 border-4 border-[#009688] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    width: isSidebarOpen ? 280 : 80,
                    x: isSidebarOpen ? 0 : 0
                }}
                className={clsx(
                    "fixed md:relative z-50 h-screen bg-brand-dark-gray border-r border-brand-spanish-gray/20 flex flex-col transition-all duration-300",
                    // Mobile: Fixed position, slide in/out
                    "fixed inset-y-0 left-0",
                    !isSidebarOpen && "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-brand-spanish-gray/20">
                    {isSidebarOpen ? (
                        // <span className="text-2xl font-bold text-[#8DC63F]">Kronus</span>
                        <img src="/logo.png" alt="Logo" className="w-44 pt-2 brightness-0 invert" />
                    ) : (
                        <span className="text-2xl font-bold text-[#8DC63F]"></span>
                        // <img src="/logo_circular.png" alt="Logo" className="w-44"/>
                    )}
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-brand-spanish-gray hover:text-[#8DC63F] transition-colors">
                        <HiMenuAlt2 size={24} />
                    </button>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-2">
                    {menuItems.map((item) => {
                        const userRoles = user.roles || [];
                        const hasPermission = !item.allowedRoles || item.allowedRoles.some(role => userRoles.includes(role));

                        if (!hasPermission) return null;

                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.name} href={item.href} onClick={() => setTimeout(() => setSidebarOpen(false), 200)}>
                                <div className={clsx(
                                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-medium",
                                    isActive ? "bg-[#8DC63F] text-white shadow-md shadow-[#8DC63F]/30" : "text-gray-300 hover:bg-[#009688]/20 hover:text-white",
                                    !isSidebarOpen && "justify-center"
                                )}>
                                    <item.icon size={24} />
                                    {isSidebarOpen && <span>{item.name}</span>}
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-brand-spanish-gray/20">
                    <button
                        onClick={handleLogout}
                        className={clsx(
                            "flex items-center gap-3 w-full px-3 py-3 rounded-lg text-red-500 hover:bg-red-500/20 hover:text-red-500 transition-all font-medium",
                            !isSidebarOpen && "justify-center"
                        )}
                    >
                        <HiLogout size={24} />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className={clsx(
                "flex-1 transition-all duration-300 max-h-screen overflow-y-auto",
                // isSidebarOpen ? "md:ml-[280px]" : "md:ml-[80px]"
            )}>
                {/* Mobile Header */}
                <div className="md:hidden h-16 bg-white border-b border-brand-spanish-gray/20 flex items-center justify-between px-4 sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        {/* <span className="text-xl font-bold text-[#009688]">Kronus</span> */}
                        <img src="/logo.png" alt="Logo" className="w-28 pt-2" />
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-brand-dark-gray hover:text-[#009688] transition-colors">
                            <HiMenuAlt2 size={24} />
                        </button>
                    </div>
                    <button onClick={handleLogout} className="text-red-500 hover:bg-red-500/20 hover:text-red-500 transition-colors"><HiLogout size={24} /></button>
                </div>

                <div className="p-6 md:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
