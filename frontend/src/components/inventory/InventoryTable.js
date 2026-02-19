"use client";

import { HiPencil, HiTrash, HiCheckCircle, HiXCircle, HiPause, HiEye, HiChevronUp, HiChevronDown } from "react-icons/hi";
import { formatNumber } from "@/src/utils/formatters";
import clsx from "clsx";

export default function InventoryTable({
  items,
  onEdit,
  onDelete,
  onView,
  isAllView = false,
  sortBy,
  sortOrder,
  onSort,
  isLoading = false
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-brand-spanish-gray/20 shadow-sm overflow-hidden p-12 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#009688] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-brand-spanish-gray font-medium italic animate-pulse">Fetching inventory data...</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-brand-spanish-gray/30 rounded-lg text-brand-spanish-gray">
        No inventory items found. Add one to get started.
      </div>
    );
  }

  const SortHeader = ({ label, field, align = "left" }) => {
    const isSorted = sortBy === field;
    return (
      <th
        className={`px-4 py-3 cursor-pointer hover:bg-[#009688]/5 transition-colors ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}`}
        onClick={() => onSort && onSort(field)}
      >
        <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
          {label}
          {isSorted ? (
            sortOrder === "asc" ? <HiChevronUp className="text-[#009688]" /> : <HiChevronDown className="text-[#009688]" />
          ) : (
            <div className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <HiChevronUp className="text-brand-spanish-gray/30" />
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-brand-spanish-gray/20 shadow-sm overflow-hidden relative">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-linear-to-r from-brand-dark-gray/5 to-transparent border-b border-brand-spanish-gray/20 uppercase font-black text-brand-dark-gray">
            <tr>
              <SortHeader label="Plot No." field="plotNumber" />
              {isAllView && <SortHeader label="Project" field="projectId" />}
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Transaction</th>
              <SortHeader label="Block" field="block" />
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Dimens.</th>
              <SortHeader label="Rate (/sqyd)" field="ratePerSqYard" align="right" />
              <SortHeader label="Total Price" field="totalPrice" align="right" />
              <SortHeader label="Status" field="status" align="center" />
              <th className="px-4 py-3 text-center">Connected Leads</th>
              <SortHeader label="Owner" field="ownerName" />
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => onView(item)}
              >
                <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-50">
                  {item.plotNumber}
                </td>
                {isAllView && (
                  <td className="px-4 py-3 font-medium text-[#009688]">
                    {item.project?.name || "-"}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                    {item.propertyType || "RESIDENTIAL"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className={clsx(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block",
                    item.transactionType === 'SALE' ? "bg-[#009688]/10 text-[#009688]" :
                      item.transactionType === 'RENT' ? "bg-[#FBB03B]/10 text-[#FBB03B]" : "bg-red-500/10 text-red-500"
                  )}>
                    {item.transactionType || "SALE"}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-600">
                  {item.block || "-"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {item.size || "-"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {item.facing ? `${item.facing} / ${item.roadWidth || '?'}ft` : "-"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {item.ratePerSqYard ? `₹${formatNumber(item.ratePerSqYard)}` : "-"}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  {item.totalPrice ? `₹${formatNumber(item.totalPrice)}` : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={clsx(
                    "px-2 py-1 rounded-lg text-[10px] font-bold",
                    item._count?.leads > 0 ? "bg-[#009688]/10 text-[#009688] border border-[#009688]/20" : "bg-gray-50 text-brand-spanish-gray border border-gray-100"
                  )}>
                    {item._count?.leads || 0} Leads
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-30 truncate" title={item.ownerName}>
                  {item.ownerName || "-"}
                </td>
                <td className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-50">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onView(item); }}
                      className="text-brand-spanish-gray hover:text-[#009688] p-1.5 rounded-lg hover:bg-[#009688]/10 transition-all"
                      title="View Details"
                    >
                      <HiEye size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                      className="text-brand-spanish-gray hover:text-[#FBB03B] p-1.5 rounded-lg hover:bg-[#FBB03B]/10 transition-all"
                      title="Edit"
                    >
                      <HiPencil size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                      className="text-brand-spanish-gray hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <HiTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'AVAILABLE') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#009688]/10 text-[#009688] px-2 py-0.5 rounded-lg text-[10px] font-bold border border-[#009688]/30 whitespace-nowrap">
        <HiCheckCircle /> Available
      </span>
    );
  }
  if (status === 'SOLD') {
    return (
      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-red-500/30 whitespace-nowrap">
        <HiXCircle /> Sold
      </span>
    );
  }
  if (status === 'BLOCKED') {
    return (
      <span className="inline-flex items-center gap-1 bg-[#FBB03B]/10 text-[#FBB03B] px-2 py-0.5 rounded-lg text-[10px] font-bold border border-[#FBB03B]/30 whitespace-nowrap">
        <HiPause /> Blocked
      </span>
    );
  }
  return <span className="text-brand-spanish-gray">-</span>;
}
