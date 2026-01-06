"use client";

import { HiPencil, HiTrash, HiCheckCircle, HiXCircle, HiPause, HiEye } from "react-icons/hi";
import { formatNumber } from "@/src/utils/formatters";

export default function InventoryTable({ items, onEdit, onDelete, onView }) {
  if (!items || items.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
        No inventory items found. Add one to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-100 uppercase font-black text-gray-400">
            <tr>
              <th className="px-4 py-3 min-w-[80px]">Plot No.</th>
              <th className="px-4 py-3">Block</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Dimens.</th>
              <th className="px-4 py-3 text-right">Rate (/sqyd)</th>
              <th className="px-4 py-3 text-right">Total Price</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3">Owner</th>
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
                <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate" title={item.ownerName}>
                  {item.ownerName || "-"}
                </td>
                <td className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-50">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onView(item); }}
                      className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-all"
                      title="View Details"
                    >
                      <HiEye size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                      className="text-gray-400 hover:text-amber-600 p-1.5 rounded-md hover:bg-amber-50 transition-all"
                      title="Edit"
                    >
                      <HiPencil size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-all"
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
      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100 whitespace-nowrap">
        <HiCheckCircle /> Available
      </span>
    );
  }
  if (status === 'SOLD') {
    return (
      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100 whitespace-nowrap">
        <HiXCircle /> Sold
      </span>
    );
  }
  if (status === 'BLOCKED') {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-100 whitespace-nowrap">
        <HiPause /> Blocked
      </span>
    );
  }
  return <span className="text-gray-400">-</span>;
}
