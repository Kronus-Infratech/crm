"use client";

import { useState, useEffect } from "react";
import { HiPlus, HiOfficeBuilding, HiSearch, HiPencil, HiTrash, HiDotsVertical } from "react-icons/hi";
import { toast } from "react-hot-toast";

import Heading from "@/src/components/ui/Heading";
import Button from "@/src/components/ui/Button";
import Modal from "@/src/components/ui/Modal";
import api from "@/src/services/api";

import InventoryTable from "@/src/components/inventory/InventoryTable";
import InventoryForm from "@/src/components/inventory/InventoryForm";
import InventoryDetail from "@/src/components/inventory/InventoryDetail";
import ProjectForm from "@/src/components/inventory/ProjectForm";
import CityForm from "@/src/components/inventory/CityForm";
import { HiChevronDown } from "react-icons/hi";

export default function InventoryPage() {
    const [cities, setCities] = useState([]);
    const [activeCityId, setActiveCityId] = useState("ALL");
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState("ALL");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projectsLoading, setProjectsLoading] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Sort State
    const [sortBy, setSortBy] = useState("plotNumber");
    const [sortOrder, setSortOrder] = useState("asc");

    // Pagination State
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    // Modals
    const [isCityModalOpen, setCityModalOpen] = useState(false);
    const [selectedCity, setSelectedCity] = useState(null);

    const [isProjectModalOpen, setProjectModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    const [isItemModalOpen, setItemModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);

    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Cities
    const fetchCities = async () => {
        try {
            const res = await api.get("/inventory/cities");
            if (res.data.success) {
                setCities(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch cities", error);
        }
    };

    // Fetch Projects (Areas)
    const fetchProjects = async () => {
        setProjectsLoading(true);
        try {
            const params = activeCityId !== "ALL" ? { cityId: activeCityId } : {};
            const res = await api.get("/inventory/projects", { params });
            if (res.data.success) {
                setProjects(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch projects", error);
            toast.error("Could not load property areas.");
        } finally {
            setProjectsLoading(false);
        }
    };

    // Fetch Inventory
    const fetchInventory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                projectId: activeProjectId,
                cityId: activeCityId,
                status: statusFilter,
                search: searchQuery,
                sortBy,
                sortOrder,
                page: pagination.page,
                limit: pagination.limit
            });

            const res = await api.get(`/inventory/items?${params.toString()}`);
            if (res.data.success) {
                setItems(res.data.data);
                setPagination(prev => ({
                    ...prev,
                    total: res.data.pagination.total,
                    totalPages: res.data.pagination.totalPages
                }));
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load inventory.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCities();
    }, []);

    useEffect(() => {
        fetchProjects();
        // Reset active project if city changes
        if (activeCityId === "ALL") {
            setActiveProjectId("ALL");
        }
    }, [activeCityId]);

    useEffect(() => {
        fetchInventory();
    }, [activeCityId, activeProjectId, searchQuery, statusFilter, sortBy, sortOrder, pagination.page, pagination.limit]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    // Handlers for Cities
    const handleCreateCity = async (data) => {
        setIsSubmitting(true);
        try {
            await api.post("/inventory/cities", data);
            toast.success("City created!");
            setCityModalOpen(false);
            fetchCities();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create city");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateCity = async (data) => {
        setIsSubmitting(true);
        try {
            await api.put(`/inventory/cities/${selectedCity.id}`, data);
            toast.success("City updated!");
            setCityModalOpen(false);
            setSelectedCity(null);
            fetchCities();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update city");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCity = async (city) => {
        if (!window.confirm(`Are you sure you want to delete "${city.name}"? This cannot be undone.`)) return;

        try {
            await api.delete(`/inventory/cities/${city.id}`);
            toast.success("City deleted.");
            if (activeCityId === city.id) {
                setActiveCityId("ALL");
            }
            fetchCities();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete city. Make sure it's empty.");
        }
    };


    // Handlers for Projects (Areas)
    const handleCreateProject = async (data) => {
        setIsSubmitting(true);
        try {
            await api.post("/inventory/projects", data);
            toast.success("Property Area created!");
            setProjectModalOpen(false);
            fetchProjects();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create area");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateProject = async (data) => {
        setIsSubmitting(true);
        try {
            await api.put(`/inventory/projects/${selectedProject.id}`, data);
            toast.success("Property Area updated!");
            setProjectModalOpen(false);
            setSelectedProject(null);
            fetchProjects();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update area");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProject = async (project) => {
        if (!window.confirm(`Are you sure you want to delete "${project.name}"? This cannot be undone.`)) return;

        try {
            await api.delete(`/inventory/projects/${project.id}`);
            toast.success("Area deleted.");
            if (activeProjectId === project.id) {
                setActiveProjectId("ALL");
            }
            fetchProjects();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete area. Make sure it's empty.");
        }
    };

    // Handlers for Inventory Items
    const handleCreateItem = async (data) => {
        setIsSubmitting(true);
        try {
            await api.post("/inventory/items", data);
            toast.success("Inventory item added!");
            setItemModalOpen(false);
            fetchInventory();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add item");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateItem = async (data) => {
        setIsSubmitting(true);
        try {
            await api.put(`/inventory/items/${selectedItem.id}`, data);
            toast.success("Inventory updated!");
            setItemModalOpen(false);
            setSelectedItem(null);
            fetchInventory();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update item");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (item) => {
        if (!window.confirm("Are you sure you want to delete this plot?")) return;

        try {
            await api.delete(`/inventory/items/${item.id}`);
            toast.success("Item deleted.");
            fetchInventory();
        } catch (error) {
            toast.error("Failed to delete item");
        }
    };

    // Modal Switchers
    const openCityEdit = (city) => {
        setSelectedCity(city);
        setCityModalOpen(true);
    };

    const openCityCreate = () => {
        setSelectedCity(null);
        setCityModalOpen(true);
    };

    const openProjectEdit = (project) => {
        setSelectedProject(project);
        setProjectModalOpen(true);
    };

    const openProjectCreate = () => {
        setSelectedProject(null);
        setProjectModalOpen(true);
    };

    const openItemEdit = (item) => {
        setSelectedItem(item);
        setItemModalOpen(true);
    };

    const openItemAdd = () => {
        if (activeProjectId === "ALL" && projects.length === 0) {
            toast.error("Please select a Property Area first.");
            return;
        }
        setSelectedItem(null);
        setItemModalOpen(true);
    };

    const openItemDetail = (item) => {
        setViewingItem(item);
        setDetailModalOpen(true);
    };

    const activeCity = cities.find(c => c.id === activeCityId);
    const activeProject = projects.find(p => p.id === activeProjectId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Heading level={2}>Inventory Management</Heading>
                    <p className="text-gray-500 mt-1 font-medium">Manage Cities, Areas and Property inventory.</p>
                </div>
                <div className="relative">
                    <Button
                        onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                        className="flex items-center gap-2"
                    >
                        <HiPlus size={20} /> New <HiChevronDown size={16} />
                    </Button>

                    {isNewMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsNewMenuOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-brand-spanish-gray/20 z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => { setIsNewMenuOpen(false); setCityModalOpen(true); }}
                                    className="w-full text-left px-4 py-2 text-sm text-brand-dark-gray hover:bg-[#009688]/10 hover:text-[#009688] flex items-center gap-2"
                                >
                                    <HiPlus className="text-brand-spanish-gray" /> New City
                                </button>
                                <button
                                    onClick={() => { setIsNewMenuOpen(false); setProjectModalOpen(true); }}
                                    className="w-full text-left px-4 py-2 text-sm text-brand-dark-gray hover:bg-[#009688]/10 hover:text-[#009688] flex items-center gap-2"
                                >
                                    <HiPlus className="text-brand-spanish-gray" /> New Area
                                </button>
                                <div className="h-px bg-brand-spanish-gray/20 my-1" />
                                <button
                                    onClick={() => { setIsNewMenuOpen(false); setItemModalOpen(true); }}
                                    className="w-full text-left px-4 py-2 text-sm text-brand-dark-gray hover:bg-[#009688]/10 hover:text-[#009688] flex items-center gap-2 font-medium"
                                >
                                    <HiPlus className="text-[#009688]" /> New Inventory
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* City Tabs */}
            <div className="space-y-4">
                <div className="flex items-center border-b border-gray-100 pr-4">
                    <div className="flex overflow-x-auto gap-6">
                        <button
                            onClick={() => {
                                setActiveCityId("ALL");
                                setActiveProjectId("ALL");
                            }}
                            className={`pb-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 px-1 ${activeCityId === "ALL"
                                ? "border-[#009688] text-[#009688]"
                                : "border-transparent text-brand-spanish-gray hover:text-brand-dark-gray hover:border-brand-spanish-gray/30"
                                }`}
                        >
                            All Cities
                        </button>
                        {cities.map(city => (
                            <button
                                key={city.id}
                                onClick={() => {
                                    setActiveCityId(city.id);
                                    setActiveProjectId("ALL");
                                    setPagination(p => ({ ...p, page: 1 }));
                                }}
                                className={`pb-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 px-1 ${activeCityId === city.id
                                    ? "border-[#009688] text-[#009688]"
                                    : "border-transparent text-brand-spanish-gray hover:text-brand-dark-gray hover:border-brand-spanish-gray/30"
                                    }`}
                            >
                                {city.name}
                            </button>
                        ))}
                    </div>

                    {activeCity && (
                        <div className="flex items-center gap-1 ml-4 mb-2">
                            <button
                                onClick={() => openCityEdit(activeCity)}
                                className="p-2 text-brand-spanish-gray hover:text-[#009688] hover:bg-[#009688]/10 rounded-lg transition-all"
                                title="Edit City"
                            >
                                <HiPencil size={18} />
                            </button>
                            <button
                                onClick={() => handleDeleteCity(activeCity)}
                                className="p-2 text-brand-spanish-gray hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete City"
                            >
                                <HiTrash size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Area Tabs - Only if a city is selected or if we want to show areas within "All Cities"? */}
                {/* User said City -> Area -> Inventory, so showing areas after a city is selected makes sense. */}
                {activeCityId !== "ALL" && (
                    <div className="flex items-center border-b border-gray-100 pr-4 bg-gray-50/50 rounded-lg p-2">
                        <div className="flex overflow-x-auto gap-4">
                            <button
                                onClick={() => setActiveProjectId("ALL")}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeProjectId === "ALL"
                                    ? "bg-[#009688] text-white shadow-md shadow-[#009688]/20"
                                    : "text-brand-spanish-gray hover:bg-gray-100"
                                    }`}
                            >
                                All Areas
                            </button>
                            {projectsLoading ? (
                                <div className="flex gap-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-24 h-8 bg-gray-100 animate-pulse rounded-lg"></div>
                                    ))}
                                </div>
                            ) : (
                                projects.map(project => (
                                    <button
                                        key={project.id}
                                        onClick={() => {
                                            setActiveProjectId(project.id);
                                            setPagination(p => ({ ...p, page: 1 }));
                                        }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeProjectId === project.id
                                            ? "bg-[#009688] text-white shadow-md shadow-[#009688]/20"
                                            : "text-brand-spanish-gray hover:bg-gray-100"
                                            }`}
                                    >
                                        {project.name}
                                    </button>
                                ))
                            )}
                        </div>

                        {activeProject && (
                            <div className="flex items-center gap-1 ml-4">
                                <button
                                    onClick={() => openProjectEdit(activeProject)}
                                    className="p-1.5 text-brand-spanish-gray hover:text-[#009688] hover:bg-white rounded-lg transition-all"
                                    title="Edit Area Details"
                                >
                                    <HiPencil size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeleteProject(activeProject)}
                                    className="p-1.5 text-brand-spanish-gray hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                    title="Delete Area"
                                >
                                    <HiTrash size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 w-full md:w-80">
                        <HiSearch className="text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search plots, owners..."
                            className="bg-transparent text-black border-none focus:ring-0 w-full text-sm font-medium"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPagination(p => ({ ...p, page: 1 }));
                            }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <select
                        className="text-sm font-bold bg-gray-50 border-brand-spanish-gray/30 rounded-lg text-brand-dark-gray focus:ring-[#009688]/20 focus:border-[#009688] py-2"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPagination(p => ({ ...p, page: 1 }));
                        }}
                    >
                        <option value="ALL">All Status</option>
                        <option value="AVAILABLE">Available</option>
                        <option value="SOLD">Sold</option>
                        <option value="BLOCKED">Blocked</option>
                    </select>

                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">
                        {pagination.total} Results
                    </div>
                </div>
            </div>

            {/* Inventory List */}
            <div className="space-y-4">
                <InventoryTable
                    items={items}
                    isAllView={activeProjectId === "ALL"}
                    onView={openItemDetail}
                    onEdit={openItemEdit}
                    onDelete={handleDeleteItem}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    isLoading={loading}
                />

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Page {pagination.page} of {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pagination.page <= 1}
                                onClick={() => handlePageChange(pagination.page - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => handlePageChange(pagination.page + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal
                isOpen={isCityModalOpen}
                onClose={() => setCityModalOpen(false)}
                title={selectedCity ? "Edit City" : "Add City"}
            >
                <CityForm
                    initialData={selectedCity}
                    onSubmit={selectedCity ? handleUpdateCity : handleCreateCity}
                    loading={isSubmitting}
                />
            </Modal>

            <Modal
                isOpen={isProjectModalOpen}
                onClose={() => setProjectModalOpen(false)}
                title={selectedProject ? "Edit Property Area" : "Add Property Area"}
            >
                <ProjectForm
                    initialData={selectedProject}
                    onSubmit={selectedProject ? handleUpdateProject : handleCreateProject}
                    loading={isSubmitting}
                    cities={cities}
                />
            </Modal>

            <Modal
                isOpen={isItemModalOpen}
                onClose={() => setItemModalOpen(false)}
                title={selectedItem ? "Edit Inventory" : "Add Inventory"}
            >
                <InventoryForm
                    initialData={selectedItem}
                    onSubmit={selectedItem ? handleUpdateItem : handleCreateItem}
                    loading={isSubmitting}
                    selectedProject={activeProject?.id}
                    projects={projects}
                />
            </Modal>

            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title="Plot Details"
                size="lg"
            >
                <InventoryDetail item={viewingItem} />
            </Modal>
        </div>
    );
}
