"use client";

import { useState, useEffect, useCallback } from "react";
import {
    HiPlus,
    HiPencil,
    HiTrash,
    HiSearch,
    HiMap,
    HiLocationMarker,
    HiEye,
    HiLink,
    HiX,
    HiCursorClick,
    HiOfficeBuilding,
    HiSave,
    HiChevronDown,
    HiExclamation,
    HiMenuAlt2,
    HiSwitchHorizontal,
    HiClipboardCopy,
} from "react-icons/hi";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

import Heading from "@/src/components/ui/Heading";
import Button from "@/src/components/ui/Button";
import Modal from "@/src/components/ui/Modal";
import InventoryDetail from "@/src/components/inventory/InventoryDetail";
import api from "@/src/services/api";
import { formatNumber } from "@/src/utils/formatters";
import { useAuth } from "@/src/contexts/AuthContext";

// Dynamically import GoogleMapComponent to avoid SSR issues with google maps
const GoogleMapComponent = dynamic(
    () => import("@/src/components/map/GoogleMapComponent"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[calc(100vh-220px)] bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-[#009688] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-brand-spanish-gray font-medium">Loading Google Maps...</p>
                </div>
            </div>
        ),
    }
);

const STATUS_COLORS = {
    AVAILABLE: "#009688",
    SOLD: "#ef4444",
    BLOCKED: "#FBB03B",
};

const STATUS_LABELS = {
    ALL: "All",
    AVAILABLE: "Available",
    SOLD: "Sold",
    BLOCKED: "Blocked",
};

// Compute polygon area in sq yards from [[lng, lat], ...] coordinates
function computeAreaSqYards(coordinates) {
    if (!coordinates || coordinates.length < 3) return null;
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const avgLat = coordinates.reduce((s, c) => s + c[1], 0) / coordinates.length;
    const cosLat = Math.cos(toRad(avgLat));
    const projected = coordinates.map((c) => [toRad(c[0]) * cosLat * R, toRad(c[1]) * R]);
    let area = 0;
    for (let i = 0; i < projected.length; i++) {
        const j = (i + 1) % projected.length;
        area += projected[i][0] * projected[j][1];
        area -= projected[j][0] * projected[i][1];
    }
    return Math.round((Math.abs(area) / 2) * 1.19599);
}

export default function GoogleMapPage() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const urlInventoryId = searchParams.get("inventoryId");
    const urlLinkInventoryId = searchParams.get("linkInventoryId");

    const canDelete = user?.roles?.some((r) => ["ADMIN", "DIRECTOR", "EXECUTIVE"].includes(r));

    const [properties, setProperties] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [highlightPropertyId, setHighlightPropertyId] = useState(null);

    // Form state
    const [isSaveModalOpen, setSaveModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [drawnCoordinates, setDrawnCoordinates] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "#009688",
        inventoryItemId: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inventorySearch, setInventorySearch] = useState("");
    const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);

    // Delete confirmation modal
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState(null);

    // Inventory detail modal
    const [isInventoryDetailOpen, setInventoryDetailOpen] = useState(false);
    const [viewingInventoryItem, setViewingInventoryItem] = useState(null);

    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // New feature state
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [measureMode, setMeasureMode] = useState(null); // null | "distance" | "area"
    const [showMeasureDropdown, setShowMeasureDropdown] = useState(false);
    const [fitAllTrigger, setFitAllTrigger] = useState(0);

    // Open sidebar by default on desktop
    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
            setSidebarOpen(true);
        }
    }, []);

    // Fetch map properties
    const fetchProperties = useCallback(async () => {
        try {
            const res = await api.get("/map/properties");
            if (res.data.success) {
                setProperties(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch map properties", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch inventory items for linking
    const fetchInventory = useCallback(async () => {
        try {
            const res = await api.get("/inventory/items?limit=500");
            if (res.data.success) {
                setInventoryItems(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch inventory", error);
        }
    }, []);

    useEffect(() => {
        fetchProperties();
        fetchInventory();
    }, [fetchProperties, fetchInventory]);

    // Handle URL params
    useEffect(() => {
        if (!loading && properties.length > 0 && urlInventoryId) {
            const prop = properties.find((p) => p.inventoryItemId === urlInventoryId);
            if (prop) {
                setHighlightPropertyId(prop.id);
                setSelectedProperty(prop);
            }
        }
    }, [loading, properties, urlInventoryId]);

    useEffect(() => {
        if (urlLinkInventoryId && inventoryItems.length > 0) {
            setFormData((prev) => ({ ...prev, inventoryItemId: urlLinkInventoryId }));
            toast("Draw a boundary on the map to mark this property", {
                icon: "📍",
                duration: 5000,
            });
        }
    }, [urlLinkInventoryId, inventoryItems]);

    // Handle new polygon drawn on map
    const handlePropertyCreated = (coordinates) => {
        setDrawnCoordinates(coordinates);
        setIsDrawing(false);
        const prefillInventoryId = urlLinkInventoryId || "";
        let autoName = "";
        if (prefillInventoryId) {
            const inv = inventoryItems.find((i) => i.id === prefillInventoryId);
            if (inv) {
                autoName = `${inv.project?.name || "Property"} - Plot ${inv.plotNumber}`;
            }
        }
        setFormData({ name: autoName, description: "", color: "#009688", inventoryItemId: prefillInventoryId });
        setSaveModalOpen(true);
    };

    // Save new map property
    const handleSaveProperty = async () => {
        if (!formData.name.trim()) {
            toast.error("Property name is required");
            return;
        }
        if (!drawnCoordinates || drawnCoordinates.length < 3) {
            toast.error("Draw a property boundary first");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post("/map/properties", {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                coordinates: drawnCoordinates,
                color: formData.color,
                inventoryItemId: formData.inventoryItemId || null,
            });

            if (res.data.success) {
                toast.success("Property marked on map!");
                setSaveModalOpen(false);
                setDrawnCoordinates(null);
                fetchProperties();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save property");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Edit property
    const handleEditProperty = async () => {
        if (!selectedProperty) return;

        setIsSubmitting(true);
        try {
            const res = await api.put(`/map/properties/${selectedProperty.id}`, {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                color: formData.color,
                inventoryItemId: formData.inventoryItemId || null,
            });

            if (res.data.success) {
                toast.success("Property updated!");
                setEditModalOpen(false);
                setSelectedProperty(null);
                fetchProperties();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update property");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete property
    const openDeleteModal = (prop) => {
        setPropertyToDelete(prop);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!propertyToDelete) return;
        try {
            await api.delete(`/map/properties/${propertyToDelete.id}`);
            toast.success("Property removed from map");
            setSelectedProperty(null);
            setDeleteModalOpen(false);
            setPropertyToDelete(null);
            fetchProperties();
        } catch (error) {
            toast.error("Failed to delete property");
        }
    };

    // Open inventory detail
    const openInventoryDetail = (inventoryItem) => {
        setViewingInventoryItem(inventoryItem);
        setInventoryDetailOpen(true);
    };

    // Open edit modal
    const openEditModal = (prop) => {
        setSelectedProperty(prop);
        setFormData({
            name: prop.name,
            description: prop.description || "",
            color: prop.color || "#009688",
            inventoryItemId: prop.inventoryItemId || "",
        });
        setEditModalOpen(true);
    };

    // Copy Google Maps link for a property
    const copyPropertyLink = (prop) => {
        if (!prop.center) return;
        const url = `https://www.google.com/maps/@${prop.center[1]},${prop.center[0]},20z`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success("Location link copied!");
        });
    };

    // Get already linked inventory IDs
    const linkedInventoryIds = new Set(
        properties.filter((p) => p.inventoryItemId).map((p) => p.inventoryItemId)
    );

    // Filter available inventory for linking
    const availableInventory = inventoryItems.filter((item) => {
        if (linkedInventoryIds.has(item.id) && item.id !== formData.inventoryItemId) return false;
        if (!inventorySearch) return true;
        const q = inventorySearch.toLowerCase();
        return (
            item.plotNumber?.toLowerCase().includes(q) ||
            item.ownerName?.toLowerCase().includes(q) ||
            item.project?.name?.toLowerCase().includes(q) ||
            item.block?.toLowerCase().includes(q)
        );
    });

    // Filter by status (affects map + sidebar)
    const statusFilteredProperties = properties.filter((p) => {
        if (statusFilter === "ALL") return true;
        return p.inventoryItem?.status === statusFilter;
    });

    // Further filter by search (sidebar only)
    const filteredProperties = statusFilteredProperties.filter((p) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.name.toLowerCase().includes(q) ||
            p.inventoryItem?.plotNumber?.toLowerCase().includes(q) ||
            p.inventoryItem?.project?.name?.toLowerCase().includes(q)
        );
    });

    // Stats
    const totalValue = properties.reduce((sum, p) => sum + (p.inventoryItem?.totalPrice || 0), 0);

    // Reusable form JSX (NOT a component fn — avoids remount/focus loss)
    const renderPropertyForm = (onSubmit, submitLabel) => (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-black text-brand-dark-gray uppercase tracking-wider mb-1">
                    Property Name *
                </label>
                <input
                    type="text"
                    className="w-full px-3 py-2 border border-brand-spanish-gray/30 rounded-lg text-sm text-black focus:ring-[#009688]/20 focus:border-[#009688]"
                    placeholder="e.g. Plot 42A - Green Valley"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-xs font-black text-brand-dark-gray uppercase tracking-wider mb-1">
                    Description
                </label>
                <textarea
                    className="w-full px-3 py-2 border border-brand-spanish-gray/30 rounded-lg text-sm text-black focus:ring-[#009688]/20 focus:border-[#009688]"
                    rows={2}
                    placeholder="Optional notes about this property"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            <div>
                <label className="block text-xs font-black text-brand-dark-gray uppercase tracking-wider mb-1">
                    Boundary Color
                </label>
                <div className="flex items-center gap-3">
                    {["#009688", "#8DC63F", "#FBB03B", "#ef4444", "#6366f1", "#ec4899"].map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: c })}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c
                                ? "border-brand-dark-gray scale-110 shadow-md"
                                : "border-transparent"
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-xs font-black text-brand-dark-gray uppercase tracking-wider mb-1">
                    Link to Inventory
                </label>
                <div className="relative">
                    {formData.inventoryItemId ? (
                        <div className="flex items-center justify-between p-2 border border-[#009688]/30 bg-[#009688]/5 rounded-lg">
                            <div className="flex items-center gap-2">
                                <HiOfficeBuilding className="text-[#009688]" />
                                <span className="text-sm font-bold text-brand-dark-gray">
                                    {(() => {
                                        const inv = inventoryItems.find((i) => i.id === formData.inventoryItemId);
                                        return inv
                                            ? `${inv.project?.name || "Unknown"} - Plot ${inv.plotNumber}`
                                            : "Linked Item";
                                    })()}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, inventoryItemId: "" })}
                                className="p-1 hover:bg-red-500/10 rounded text-red-500"
                            >
                                <HiX size={16} />
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div
                                className="flex items-center gap-2 px-3 py-2 border border-brand-spanish-gray/30 rounded-lg cursor-pointer hover:border-[#009688]/50 transition-colors"
                                onClick={() => setShowInventoryDropdown(!showInventoryDropdown)}
                            >
                                <HiSearch className="text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search & link inventory..."
                                    className="bg-transparent border-none focus:ring-0 w-full text-sm text-black"
                                    value={inventorySearch}
                                    onChange={(e) => {
                                        setInventorySearch(e.target.value);
                                        setShowInventoryDropdown(true);
                                    }}
                                    onFocus={() => setShowInventoryDropdown(true)}
                                />
                                <HiChevronDown className="text-gray-400" size={16} />
                            </div>

                            {showInventoryDropdown && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowInventoryDropdown(false)} />
                                    <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-brand-spanish-gray/20 rounded-lg shadow-xl">
                                        {availableInventory.length === 0 ? (
                                            <div className="px-3 py-4 text-center text-xs text-brand-spanish-gray">
                                                No available inventory to link
                                            </div>
                                        ) : (
                                            availableInventory.slice(0, 20).map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 hover:bg-[#009688]/5 transition-colors border-b border-gray-50 last:border-0"
                                                    onClick={() => {
                                                        setFormData({ ...formData, inventoryItemId: item.id });
                                                        setShowInventoryDropdown(false);
                                                        setInventorySearch("");
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-bold text-brand-dark-gray">
                                                                {item.project?.name || "Unknown"} - Plot {item.plotNumber}
                                                            </p>
                                                            <p className="text-[10px] text-brand-spanish-gray">
                                                                {item.size} {item.block ? `• Block ${item.block}` : ""} •{" "}
                                                                {item.propertyType}
                                                            </p>
                                                        </div>
                                                        <span
                                                            className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full"
                                                            style={{
                                                                background: `${STATUS_COLORS[item.status]}15`,
                                                                color: STATUS_COLORS[item.status],
                                                            }}
                                                        >
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <Button onClick={onSubmit} disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                        <span className="flex items-center gap-2 justify-center">
                            <HiSave size={16} /> {submitLabel}
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="space-y-3 md:space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <Heading level={2}>Kronus Maps</Heading>
                    <p className="text-gray-500 mt-1 font-medium text-sm">
                        Mark property boundaries with satellite & street views.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="md:hidden p-2 bg-white border border-gray-200 rounded-lg text-brand-dark-gray hover:bg-gray-50"
                        title="Toggle sidebar"
                    >
                        <HiMenuAlt2 size={20} />
                    </button>
                    {properties.length > 0 && (
                        <button
                            onClick={() => setFitAllTrigger((t) => t + 1)}
                            className="p-2 bg-white border border-gray-200 rounded-lg text-brand-dark-gray hover:bg-gray-50 transition-colors"
                            title="Fit all properties in view"
                        >
                            <HiMap size={20} />
                        </button>
                    )}
                    {/* Measure dropdown */}
                    <div className="relative">
                        {measureMode ? (
                            <Button
                                onClick={() => {
                                    setMeasureMode(null);
                                    setShowMeasureDropdown(false);
                                }}
                                variant="danger"
                                size="sm"
                                className="flex items-center gap-1.5"
                            >
                                <HiX size={16} /> Stop
                            </Button>
                        ) : (
                            <Button
                                onClick={() => {
                                    if (isDrawing) setIsDrawing(false);
                                    setShowMeasureDropdown(!showMeasureDropdown);
                                }}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1.5"
                            >
                                <HiSwitchHorizontal size={16} /> <span className="hidden sm:inline">Measure</span>
                                <HiChevronDown size={14} />
                            </Button>
                        )}
                        {showMeasureDropdown && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setShowMeasureDropdown(false)} />
                                <div className="absolute right-0 mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden min-w-40">
                                    <button
                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-brand-dark-gray hover:bg-[#009688]/5 transition-colors flex items-center gap-2"
                                        onClick={() => {
                                            setMeasureMode("distance");
                                            setShowMeasureDropdown(false);
                                            toast("Click two points to measure distance. Click again to reset.", { icon: "📏", duration: 3000 });
                                        }}
                                    >
                                        <HiSwitchHorizontal size={16} className="text-[#009688]" />
                                        Distance
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-brand-dark-gray hover:bg-[#009688]/5 transition-colors flex items-center gap-2 border-t border-gray-100"
                                        onClick={() => {
                                            setMeasureMode("area");
                                            setShowMeasureDropdown(false);
                                            toast("Click to place points. Click first point to close and see area.", { icon: "📐", duration: 3000 });
                                        }}
                                    >
                                        <HiMap size={16} className="text-[#009688]" />
                                        Area
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    <Button
                        onClick={() => {
                            if (measureMode) {
                                setMeasureMode(null);
                                setShowMeasureDropdown(false);
                            }
                            setIsDrawing(!isDrawing);
                            if (!isDrawing) {
                                toast("Click on the map to draw property boundaries. Click first point to close.", {
                                    icon: "✏️",
                                    duration: 4000,
                                });
                            }
                        }}
                        variant={isDrawing ? "danger" : "primary"}
                        className="flex items-center gap-2"
                    >
                        {isDrawing ? (
                            <>
                                <HiX size={18} /> Cancel
                            </>
                        ) : (
                            <>
                                <HiCursorClick size={18} /> <span className="hidden sm:inline">Mark</span> Property
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Map + Sidebar Layout */}
            <div className="flex flex-col md:flex-row gap-2 sm:gap-3 md:gap-4 h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)] md:h-[calc(100vh-200px)]">
                {/* Sidebar - Property List */}
                <div
                    className={`${sidebarOpen ? "w-full md:w-80 md:min-w-[320px] h-48 sm:h-56 md:h-full" : "h-0 md:h-full md:w-0"
                        } transition-all duration-300 overflow-hidden shrink-0`}
                >
                    <div className="h-full bg-white rounded-xl border border-brand-spanish-gray/20 shadow-sm flex flex-col">
                        {/* Sidebar header */}
                        <div className="p-3 border-b border-gray-100 space-y-2">
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                <HiSearch className="text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search properties..."
                                    className="bg-transparent border-none focus:ring-0 w-full text-sm font-medium text-black"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {/* Status filter chips */}
                            <div className="flex items-center gap-1.5">
                                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                                    const isActive = statusFilter === key;
                                    const count = key === "ALL"
                                        ? properties.length
                                        : properties.filter((p) => p.inventoryItem?.status === key).length;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setStatusFilter(key)}
                                            className={`px-2 py-1 rounded-md text-[9px] uppercase font-black tracking-wider transition-all ${isActive
                                                ? "text-white shadow-sm"
                                                : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                                }`}
                                            style={
                                                isActive
                                                    ? { backgroundColor: key === "ALL" ? "#333" : STATUS_COLORS[key] || "#333" }
                                                    : {}
                                            }
                                        >
                                            {label} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Properties list */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="w-8 h-8 border-4 border-[#009688] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-xs text-brand-spanish-gray">Loading...</p>
                                </div>
                            ) : filteredProperties.length === 0 ? (
                                <div className="p-8 text-center text-brand-spanish-gray">
                                    <HiMap size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-medium">No properties marked yet</p>
                                    <p className="text-[10px] mt-1">Click &quot;Mark Property&quot; to get started</p>
                                </div>
                            ) : (
                                filteredProperties.map((prop) => {
                                    const inv = prop.inventoryItem;
                                    const isActive = highlightPropertyId === prop.id;

                                    return (
                                        <div
                                            key={prop.id}
                                            className={`p-3 rounded-lg cursor-pointer transition-all border ${isActive
                                                ? "bg-[#009688]/5 border-[#009688]/30 shadow-sm"
                                                : "border-transparent hover:bg-gray-50 hover:border-gray-100"
                                                }`}
                                            onClick={() => {
                                                setHighlightPropertyId(isActive ? null : prop.id);
                                                setSelectedProperty(prop);
                                            }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full shrink-0"
                                                            style={{ backgroundColor: prop.color || "#009688" }}
                                                        />
                                                        <p className="text-sm font-bold text-brand-dark-gray truncate">
                                                            {prop.name}
                                                        </p>
                                                    </div>
                                                    {inv && (
                                                        <div className="mt-1 ml-5">
                                                            <p className="text-[10px] text-brand-spanish-gray">
                                                                {inv.project?.name} • Plot {inv.plotNumber}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <span
                                                                    className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded"
                                                                    style={{
                                                                        background: `${STATUS_COLORS[inv.status]}15`,
                                                                        color: STATUS_COLORS[inv.status],
                                                                    }}
                                                                >
                                                                    {inv.status}
                                                                </span>
                                                                {inv.totalPrice && (
                                                                    <span className="text-[10px] font-bold text-[#009688]">
                                                                        ₹{formatNumber(inv.totalPrice)}
                                                                    </span>
                                                                )}
                                                                {(() => {
                                                                    const area = computeAreaSqYards(prop.coordinates);
                                                                    return area ? (
                                                                        <span className="text-[9px] text-gray-400 font-medium">
                                                                            {area.toLocaleString("en-IN")} sq yd
                                                                        </span>
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!inv && prop.description && (
                                                        <p className="text-[10px] text-brand-spanish-gray ml-5 mt-0.5 truncate">
                                                            {prop.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-0.5 shrink-0 ml-2">
                                                    {inv && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openInventoryDetail(inv);
                                                            }}
                                                            className="p-1.5 text-brand-spanish-gray hover:text-[#009688] hover:bg-[#009688]/10 rounded transition-all"
                                                            title="View Inventory"
                                                        >
                                                            <HiEye size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            copyPropertyLink(prop);
                                                        }}
                                                        className="p-1.5 text-brand-spanish-gray hover:text-blue-500 hover:bg-blue-500/10 rounded transition-all"
                                                        title="Copy Location Link"
                                                    >
                                                        <HiClipboardCopy size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditModal(prop);
                                                        }}
                                                        className="p-1.5 text-brand-spanish-gray hover:text-[#009688] hover:bg-[#009688]/10 rounded transition-all"
                                                        title="Edit"
                                                    >
                                                        <HiPencil size={14} />
                                                    </button>
                                                    {canDelete && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDeleteModal(prop);
                                                            }}
                                                            className="p-1.5 text-brand-spanish-gray hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                                            title="Delete"
                                                        >
                                                            <HiTrash size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-black text-brand-spanish-gray">
                                <span>{properties.length} Properties</span>
                                <span>{properties.filter((p) => p.inventoryItemId).length} Linked</span>
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                                <div className="flex items-center gap-3">
                                    {[
                                        { status: "AVAILABLE", color: "#009688" },
                                        { status: "SOLD", color: "#ef4444" },
                                        { status: "BLOCKED", color: "#FBB03B" },
                                    ].map(({ status, color }) => (
                                        <div key={status} className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                            <span className="text-[9px] font-bold text-gray-400">
                                                {properties.filter((p) => p.inventoryItem?.status === status).length}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {totalValue > 0 && (
                                    <span className="text-[9px] font-bold text-[#009688]">
                                        ₹{formatNumber(totalValue)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map */}
                <div className="flex-1 relative min-h-62.5 sm:min-h-87.5">
                    {/* Toggle sidebar button - desktop only */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="hidden md:block absolute top-4 left-3 z-10 bg-white shadow-lg rounded-lg p-2 hover:bg-gray-50 transition-colors border border-gray-200"
                        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    >
                        <HiMap size={18} className="text-brand-dark-gray" />
                    </button>

                    {isDrawing && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-[#009688] text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg text-[10px] md:text-xs font-bold uppercase tracking-wider animate-pulse text-center">
                            <span className="hidden sm:inline">Click on map to draw boundary • Click first point to close</span>
                            <span className="sm:hidden">Tap to draw • Tap first point to close</span>
                        </div>
                    )}

                    {measureMode && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-red-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg text-[10px] md:text-xs font-bold uppercase tracking-wider animate-pulse text-center">
                            {measureMode === "distance" ? (
                                <>
                                    <span className="hidden sm:inline">Click two points to measure distance • Click again to reset</span>
                                    <span className="sm:hidden">Tap two points to measure</span>
                                </>
                            ) : (
                                <>
                                    <span className="hidden sm:inline">Click to place points • Click first point to close & see area</span>
                                    <span className="sm:hidden">Tap to draw • Tap first point to close</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Color Legend */}
                    {!isDrawing && !measureMode && properties.length > 0 && (
                        <div className="absolute bottom-6 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 border border-gray-100">
                            <div className="space-y-1">
                                {[
                                    { color: "#009688", label: "Available" },
                                    { color: "#FBB03B", label: "Blocked" },
                                    { color: "#ef4444", label: "Sold" },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <GoogleMapComponent
                        properties={statusFilteredProperties}
                        onPropertyCreated={handlePropertyCreated}
                        onPropertyClick={(prop) => {
                            setHighlightPropertyId(prop.id);
                            setSelectedProperty(prop);
                        }}
                        highlightPropertyId={highlightPropertyId}
                        isDrawing={isDrawing}
                        setIsDrawing={setIsDrawing}
                        drawColor={formData.color}
                        measureMode={measureMode}
                        setMeasureMode={setMeasureMode}
                        fitAllTrigger={fitAllTrigger}
                    />
                </div>
            </div>

            {/* Save New Property Modal */}
            <Modal
                isOpen={isSaveModalOpen}
                onClose={() => {
                    setSaveModalOpen(false);
                    setDrawnCoordinates(null);
                }}
                title="Save Property Boundary"
            >
                {renderPropertyForm(handleSaveProperty, "Save Property")}
            </Modal>

            {/* Edit Property Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setSelectedProperty(null);
                }}
                title="Edit Map Property"
            >
                {renderPropertyForm(handleEditProperty, "Update Property")}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setPropertyToDelete(null);
                }}
                title="Delete Property"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <HiExclamation className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-sm font-bold text-brand-dark-gray">
                                Are you sure you want to delete &quot;{propertyToDelete?.name}&quot;?
                            </p>
                            <p className="text-xs text-brand-spanish-gray mt-1">
                                This will remove the property boundary from the map. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setPropertyToDelete(null);
                            }}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-brand-dark-gray hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Inventory Detail Modal */}
            <Modal
                isOpen={isInventoryDetailOpen}
                onClose={() => {
                    setInventoryDetailOpen(false);
                    setViewingInventoryItem(null);
                }}
                title="Plot Details"
                size="lg"
            >
                <InventoryDetail item={viewingInventoryItem} />
            </Modal>
        </div>
    );
}
