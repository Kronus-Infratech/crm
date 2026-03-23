"use client";

import { useMemo, useState } from "react";
import { HiDownload, HiCheck, HiGlobe, HiOfficeBuilding } from "react-icons/hi";
import { toast } from "react-hot-toast";
import Modal from "@/src/components/ui/Modal";
import Button from "@/src/components/ui/Button";
import api from "@/src/services/api";

export default function InventoryExportModal({ isOpen, onClose, cities = [] }) {
  const [mode, setMode] = useState("all"); // all | specific
  const [selectedCityIds, setSelectedCityIds] = useState([]);
  const [downloading, setDownloading] = useState(false);

  const sortedCities = useMemo(() => [...cities].sort((a, b) => a.name.localeCompare(b.name)), [cities]);

  const toggleCity = (cityId) => {
    setSelectedCityIds((prev) => prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]);
  };

  const handleDownload = async () => {
    if (mode === "specific" && selectedCityIds.length === 0) {
      toast.error("Please select at least one city");
      return;
    }

    try {
      setDownloading(true);
      const params = mode === "all"
        ? { cityIds: "ALL" }
        : { cityIds: selectedCityIds.join(",") };

      const res = await api.get("/inventory/items/export/csv", {
        params,
        responseType: "blob"
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const datePart = new Date().toISOString().split("T")[0];
      const scope = mode === "all" ? "all" : "cities";
      link.href = url;
      link.download = `kronus_inventory_${scope}_${datePart}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("CSV downloaded successfully");
      onClose();
    } catch (error) {
      console.error("Inventory CSV download failed", error);
      toast.error(error?.response?.data?.message || "Failed to download CSV");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Download Inventory CSV">
      <div className="p-1 max-h-[80vh] overflow-y-auto pr-2">
        <p className="text-[10px] font-black text-[#009688] uppercase tracking-widest mb-4">Select Download Scope</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setMode("all")}
            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${mode === "all" ? "border-[#009688] bg-[#009688]/5 text-[#009688]" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}
          >
            <div className="flex items-center gap-2">
              <HiGlobe size={18} />
              <span className="text-xs font-black uppercase tracking-wider">All Data</span>
            </div>
            {mode === "all" && <HiCheck size={16} />}
          </button>

          <button
            onClick={() => setMode("specific")}
            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${mode === "specific" ? "border-[#009688] bg-[#009688]/5 text-[#009688]" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}
          >
            <div className="flex items-center gap-2">
              <HiOfficeBuilding size={18} />
              <span className="text-xs font-black uppercase tracking-wider">Specific Cities</span>
            </div>
            {mode === "specific" && <HiCheck size={16} />}
          </button>
        </div>

        {mode === "specific" && (
          <div className="mb-6">
            <p className="text-[10px] font-black text-[#009688] uppercase tracking-widest mb-3">Select Cities</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {sortedCities.map((city) => {
                const checked = selectedCityIds.includes(city.id);
                return (
                  <button
                    key={city.id}
                    onClick={() => toggleCity(city.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${checked ? "border-[#009688]/30 bg-[#009688]/5 text-[#009688]" : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"}`}
                  >
                    <span className="text-xs font-bold">{city.name}</span>
                    {checked && <HiCheck size={14} />}
                  </button>
                );
              })}
              {sortedCities.length === 0 && (
                <p className="text-sm text-gray-500">No cities found.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-5 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose} className="flex-1 py-3 font-black uppercase tracking-widest text-[10px]">
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading || (mode === "specific" && selectedCityIds.length === 0)}
            className="flex-1 py-3 font-black uppercase tracking-widest text-[10px] bg-brand-dark-gray hover:bg-black text-white flex items-center justify-center gap-2"
          >
            <HiDownload size={16} />
            {downloading ? "Downloading..." : "Download CSV"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
