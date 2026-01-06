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
import ProjectForm from "@/src/components/inventory/ProjectForm";
import InventoryDetail from "@/src/components/inventory/InventoryDetail";

export default function InventoryPage() {
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modals
    const [isProjectModalOpen, setProjectModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null); // For area edit
    
    const [isItemModalOpen, setItemModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null); // For item edit
    
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState(null); // For item detail

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Projects
    const fetchProjects = async () => {
        try {
            const res = await api.get("/inventory/projects");
            if (res.data.success) {
                setProjects(res.data.data);
                // Set default active tab if none selected and projects exist
                if (!activeProjectId && res.data.data.length > 0) {
                    setActiveProjectId(res.data.data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch projects", error);
            toast.error("Could not load property areas.");
        } finally {
            setLoading(false);
        }
    };

    // Fetch Inventory for specific project
    const fetchInventory = async (projectId) => {
        if (!projectId) return;
        setLoading(true);
        try {
            const res = await api.get(`/inventory/items?projectId=${projectId}&search=${searchQuery}`);
            if (res.data.success) {
                setItems(res.data.data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load inventory.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (activeProjectId) {
            fetchInventory(activeProjectId);
        }
    }, [activeProjectId, searchQuery]);

    
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
                setActiveProjectId(null);
                setItems([]);
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
            fetchInventory(activeProjectId);
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
            fetchInventory(activeProjectId);
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
            fetchInventory(activeProjectId);
        } catch (error) {
            toast.error("Failed to delete item");
        }
    };

    // Modal Switchers
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
         if (!activeProjectId) {
            toast.error("Please create a Property Area first.");
            return;
        }
        setSelectedItem(null);
        setItemModalOpen(true);
    };

    const openItemDetail = (item) => {
        setViewingItem(item);
        setDetailModalOpen(true);
    };

    const activeProject = projects.find(p => p.id === activeProjectId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Heading level={2}>Inventory Management</Heading>
                    <p className="text-gray-500 mt-1 font-medium">Track your plots, pricing, and availability across areas.</p>
                </div>
                <div className="flex gap-3">
                     <Button variant="outline" onClick={openProjectCreate}>
                        <HiOfficeBuilding className="mr-2" size={20} /> New Area
                    </Button>
                    <Button onClick={openItemAdd} disabled={!activeProjectId}>
                        <HiPlus className="mr-2" size={20} /> Add Inventory
                    </Button>
                </div>
            </div>

            {/* Tabs & Area Management */}
            {projects.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pr-4">
                        <div className="flex overflow-x-auto gap-6">
                            {projects.map(project => (
                                <button
                                    key={project.id}
                                    onClick={() => setActiveProjectId(project.id)}
                                    className={`pb-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 px-1 ${
                                        activeProjectId === project.id
                                            ? "border-indigo-600 text-indigo-600"
                                            : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
                                    }`}
                                >
                                    {project.name}
                                </button>
                            ))}
                        </div>
                        
                        {activeProject && (
                            <div className="flex items-center gap-1 ml-4 mb-2">
                                <button 
                                    onClick={() => openProjectEdit(activeProject)}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    title="Edit Area Details"
                                >
                                    <HiPencil size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteProject(activeProject)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Area"
                                >
                                    <HiTrash size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {activeProject?.description && (
                        <p className="text-sm text-gray-400 italic bg-gray-50/50 p-2 rounded border-l-4 border-indigo-200">
                            {activeProject.description}
                        </p>
                    )}
                </div>
            ) : (
                <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-2xl text-center">
                     <p className="text-indigo-700 font-bold mb-4">👋 Welcome! Your inventory is empty.</p>
                     <Button onClick={openProjectCreate}>Create your first Property Area</Button>
                </div>
            )}
           

            {/* Controls */}
            {activeProjectId && (
                <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-gray-100 shadow-sm w-full md:w-96">
                    <HiSearch className="text-gray-400 ml-2" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search plot no, owner, block..." 
                        className="bg-transparent text-black border-none focus:ring-0 w-full text-sm font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            )}

            {/* Inventory List */}
            {loading && items.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <InventoryTable 
                    items={items} 
                    onView={openItemDetail}
                    onEdit={openItemEdit} 
                    onDelete={handleDeleteItem} 
                />
            )}

            {/* Modals */}
             <Modal
                isOpen={isProjectModalOpen}
                onClose={() => setProjectModalOpen(false)}
                title={selectedProject ? "Edit Property Area" : "Add Property Area"}
            >
                <ProjectForm 
                    initialData={selectedProject}
                    onSubmit={selectedProject ? handleUpdateProject : handleCreateProject} 
                    loading={isSubmitting} 
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
                    selectedProject={activeProjectId}
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
