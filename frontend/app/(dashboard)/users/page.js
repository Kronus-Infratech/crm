"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HiPlus, HiSearch, HiChevronLeft, HiChevronRight, HiTrash } from "react-icons/hi";
import { useAuth } from "@/src/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/src/services/api";
import Heading from "@/src/components/ui/Heading";
import Button from "@/src/components/ui/Button";
import Card from "@/src/components/ui/Card";
import Modal from "@/src/components/ui/Modal";
import Input from "@/src/components/ui/Input";
import Select from "@/src/components/ui/Select";
import UserForm from "@/src/components/users/UserForm";
import { formatDateTime } from "@/src/utils/formatters";

// Debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({});

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, roleFilter]);

    useEffect(() => {
        if (!currentUser || !currentUser.roles.includes("ADMIN")) {
            router.push("/dashboard");
            return;
        }

        const fetchUsers = async () => {
            setLoading(true);
            try {
                const params = {
                    page,
                    limit: 10,
                    search: debouncedSearch,
                    role: roleFilter || undefined,
                    sortBy: 'createdAt',
                    sortOrder: 'desc'
                };

                const response = await api.get("/users", { params });
                setUsers(response.data.data.users);
                setStats(response.data.data.pagination);
                setTotalPages(response.data.data.pagination.totalPages);
            } catch (error) {
                console.error("Failed to load users", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [router, page, debouncedSearch, roleFilter]);

    const handleCreate = async (data) => {
        try {
            await api.post("/users", data);
            setIsCreateOpen(false);
            // Refetch triggers via dependency array if we were to lift state, 
            // but here we can just reload the current view logic or rely on router refresh
            // For now, simpler to toggle a refresh trigger or just call fetch manually if extracted.
            // Since effect depends on other vars, let's just cheat and toggle page or reload
            window.location.reload();
        } catch (error) {
            console.error("Create failed", error);
            alert(error.response?.data?.message || "Failed to create user");
        }
    };

    const handleUpdate = async (data) => {
        try {
            await api.put(`/users/${editingUser.id}`, data);
            setEditingUser(null);
            window.location.reload();
        } catch (error) {
            console.error("Update failed", error);
            alert(error.response?.data?.message || "Failed to update user");
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        setIsDeleting(true);
        try {
            await api.delete(`/users/${deletingUser.id}`);
            setDeletingUser(null);
            window.location.reload();
        } catch (error) {
            console.error("Delete failed", error);
            alert(error.response?.data?.message || "Failed to delete user");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <Heading level={2}>User Management</Heading>
                    <p className="text-gray-600">Manage system access and roles</p>
                </div>
                <div>
                    <Button icon={<HiPlus />} onClick={() => setIsCreateOpen(true)}>Add User</Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/3 relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Search users..."
                        className="pl-10 py-2.5!"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-1/4">
                    <Select
                        placeholder="Filter by Role"
                        className="py-2.5!"
                        options={[
                            // { label: "Admin", value: "ADMIN" },
                            { label: "Executive", value: "EXECUTIVE" },
                            { label: "Director", value: "DIRECTOR" },
                            { label: "Manager", value: "MANAGER" },
                            { label: "Sales Executive", value: "SALESMAN" }
                        ]}
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    />
                </div>
            </div>

            <Card className="p-0 overflow-hidden min-h-61 relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-200">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* Loading Overlay */}
                            <AnimatePresence>
                                {loading && (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"
                                    >
                                        <td colSpan="5" className="w-full h-full flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-[#009688] border-t-transparent rounded-full animate-spin"></div>
                                        </td>
                                    </motion.tr>
                                )}
                            </AnimatePresence>

                            {!loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <HiSearch size={24} className="text-gray-300" />
                                            <p>No users found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-2">
                                                {user.name}
                                                <OnlineDot lastLoginAt={user.lastLoginAt} />
                                            </div>
                                            <div className="text-xs text-gray-400 font-normal">{user.designation || "No Designation"}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                        <td className="px-6 py-4 text-gray-600">{user.phone}</td>
                                        <td className="px-6 py-4 text-gray-600">{user.department || "No Department"}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(user.roles || []).map(role => (
                                                    <RoleBadge key={role} role={role.replace("SALESMAN", "SALES EXECUTIVE")} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${user.isActive ? "bg-[#8DC63F]/10 text-[#8DC63F]" : "bg-red-500/10 text-red-500"
                                                }`}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingUser(user)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setDeletingUser(user)}
                                                >
                                                    <HiTrash size={18} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-sm text-gray-500 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <span>
                        Page {stats.currentPage || 1} of {Math.max(1, totalPages)} <span className="text-gray-400 mx-1">|</span> {stats.totalItems || 0} users
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            <HiChevronLeft /> Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === totalPages || loading}
                            onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))}
                        >
                            Next <HiChevronRight />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Create User Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add New User">
                <UserForm onSubmit={handleCreate} loading={loading} />
            </Modal>

            {/* Edit User Modal */}
            <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
                {editingUser && (
                    <UserForm
                        initialData={editingUser}
                        onSubmit={handleUpdate}
                        loading={loading}
                    />
                )}
            </Modal>
            {/* Deletion Confirmation Modal */}
            <Modal
                isOpen={!!deletingUser}
                onClose={() => setDeletingUser(null)}
                title="Delete User"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Are you sure you want to delete <span className="font-bold text-gray-900">{deletingUser?.name} ({deletingUser?.email})</span>?
                        This will deactivate their access to the system.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingUser(null)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteUser}
                            loading={isDeleting}
                        >
                            Confirm Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function RoleBadge({ role }) {
    const styles = {
        ADMIN: "bg-[#009688]/10 text-[#009688] ring-[#009688]/20",
        DIRECTOR: "bg-[#FBB03B]/10 text-[#FBB03B] ring-[#FBB03B]/20",
        MANAGER: "bg-[#8DC63F]/10 text-[#8DC63F] ring-[#8DC63F]/20",
        EXECUTIVE: "bg-red-500/10 text-red-500 ring-red-500/20",
        SALESMAN: "bg-[#9E9E9E]/10 text-[#9E9E9E] ring-[#9E9E9E]/20",
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ring-1 ring-inset ${styles[role] || styles.SALESMAN}`}>
            {role.replace("_", " ")}
        </span>
    );
}

function OnlineDot({ lastLoginAt }) {
    if (!lastLoginAt) return <span className="w-2 h-2 rounded-full bg-gray-300" title="Never logged in"></span>;

    const lastLogin = new Date(lastLoginAt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isOnline = lastLogin > oneHourAgo;

    return (
        <span
            className={`w-2 h-2 rounded-full ${isOnline ? "bg-[#8DC63F] animate-pulse" : "bg-brand-spanish-gray/30"}`}
            title={isOnline ? "Online" : `Last seen: ${formatDateTime(lastLogin)}`}
        ></span>
    );
}
