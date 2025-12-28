"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HiHome, HiUsers, HiCurrencyRupee, HiCog, HiLogout, HiMenuAlt2 } from "react-icons/hi";
import Cookies from "js-cookie";
import clsx from "clsx";

export default function DashboardLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Check auth
        const token = Cookies.get("token");
        const userData = Cookies.get("user");

        if (!token) {
            router.push("/login");
            return;
        }

        if (userData) {
            setUser(JSON.parse(userData));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    const handleLogout = () => {
        Cookies.remove("token");
        Cookies.remove("user");
        router.push("/login");
    };

    const menuItems = [
        { name: "Dashboard", href: "/dashboard", icon: HiHome },
        { name: "Leads", href: "/leads", icon: HiCurrencyRupee },
        { name: "Users", href: "/users", icon: HiUsers, role: "ADMIN" }, // Only for admins
        { name: "Settings", href: "/settings", icon: HiCog },
    ];

    if (!user) return null; // Or loading spinner

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
                    "fixed md:relative z-50 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
                    // Mobile: Fixed position, slide in/out
                    "fixed inset-y-0 left-0",
                    !isSidebarOpen && "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
                    {isSidebarOpen ? (
                        // <span className="text-2xl font-bold text-brand-primary">Kronus</span>
                        <img src="/logo.png" alt="Logo" className="w-44 pt-2" />
                    ) : (
                        <span className="text-2xl font-bold text-brand-primary"></span>
                        // <img src="/logo_circular.png" alt="Logo" className="w-44"/>
                    )}
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-brand-primary">
                        <HiMenuAlt2 size={24} />
                    </button>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-2">
                    {menuItems.map((item) => {
                        const userRoles = user.roles || [];
                        if (item.role && !userRoles.includes(item.role) && !userRoles.includes('ADMIN')) return null;

                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.name} href={item.href}>
                                <div className={clsx(
                                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                                    isActive ? "bg-brand-primary/10 text-brand-primary font-medium" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                                    !isSidebarOpen && "justify-center"
                                )}>
                                    <item.icon size={24} />
                                    {isSidebarOpen && <span>{item.name}</span>}
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className={clsx(
                            "flex items-center gap-3 w-full px-3 py-3 rounded-lg  text-red-500 hover:bg-red-50 transition-colors",
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
                <div className="md:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        {/* <span className="text-xl font-bold text-brand-primary">Kronus</span> */}
                        <img src="/logo.png" alt="Logo" className="w-28 pt-2" />
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-brand-primary">
                            <HiMenuAlt2 size={24} />
                        </button>
                    </div>
                    <button onClick={handleLogout} className="text-gray-500"><HiLogout size={24} /></button>
                </div>

                <div className="p-6 md:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
