"use client";

import { formatNumber, formatDate } from "@/src/utils/formatters";
import { HiUser, HiPhone, HiCalendar, HiCurrencyRupee, HiLocationMarker, HiTag, HiInformationCircle } from "react-icons/hi";

export default function InventoryDetail({ item }) {
  if (!item) return null;

  const detailRows = [
    { label: "Plot Number", value: item.plotNumber, icon: <HiTag /> },
    { label: "Block / Sector", value: item.block, icon: <HiLocationMarker /> },
    { label: "Size", value: item.size, icon: <HiInformationCircle /> },
    { label: "Facing", value: item.facing, icon: <HiInformationCircle /> },
    { label: "Road Width", value: item.roadWidth ? `${item.roadWidth} ft` : null, icon: <HiInformationCircle /> },
    { label: "Status", value: item.status, icon: <HiTag /> },
  ];

  const pricingRows = [
    { label: "Total Price", value: item.totalPrice ? `₹${formatNumber(item.totalPrice)}` : null, icon: <HiCurrencyRupee />, bold: true },
    { label: "Rate per Sq.Yd", value: item.ratePerSqYard ? `₹${formatNumber(item.ratePerSqYard)}` : null, icon: <HiCurrencyRupee /> },
    { label: "Asking Price", value: item.askingPrice ? `₹${formatNumber(item.askingPrice)}` : null, icon: <HiCurrencyRupee /> },
    { label: "Circle Rate", value: item.circleRate ? `₹${formatNumber(item.circleRate)}` : null, icon: <HiCurrencyRupee /> },
  ];

  const ownerRows = [
    { label: "Owner Name", value: item.ownerName, icon: <HiUser /> },
    { label: "Owner Contact", value: item.ownerContact, icon: <HiPhone /> },
    { label: "Reference", value: item.reference, icon: <HiUser /> },
  ];

  const chargesRows = [
    { label: "Maintenance Charges", value: item.maintenanceCharges ? `₹${formatNumber(item.maintenanceCharges)}` : null, icon: <HiCurrencyRupee /> },
    { label: "Club Charges", value: item.clubCharges ? `₹${formatNumber(item.clubCharges)}` : null, icon: <HiCurrencyRupee /> },
    { label: "Cannes Charges", value: item.cannesCharges ? `₹${formatNumber(item.cannesCharges)}` : null, icon: <HiCurrencyRupee /> },
  ];

  const saleRows = item.status === 'SOLD' ? [
    { label: "Sold To", value: item.soldTo, icon: <HiUser /> },
    { label: "Sold Date", value: item.soldDate ? formatDate(item.soldDate) : null, icon: <HiCalendar /> },
  ] : [];

  const Section = ({ title, rows }) => {
    const activeRows = rows.filter(r => r.value);
    if (activeRows.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 border-b border-gray-100 pb-1">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeRows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="text-gray-400">{row.icon}</div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">{row.label}</p>
                <p className={`text-sm ${row.bold ? 'font-black text-gray-900' : 'font-medium text-gray-700'}`}>
                  {row.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-1">
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Selected Property</p>
          <h3 className="text-xl font-black text-gray-900">{item.project?.name || 'Inventory Item'}</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          item.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          item.status === 'SOLD' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'
        }`}>
          {item.status}
        </div>
      </div>

      <Section title="Property Details" rows={detailRows} />
      <Section title="Pricing & Value" rows={pricingRows} />
      <Section title="Ownership & Contacts" rows={ownerRows} />
      <Section title="Additional Charges" rows={chargesRows} />
      <Section title="Finalized Sale" rows={saleRows} />

      {item.amenities && (
        <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 border-b border-gray-100 pb-1">Amenities & Remarks</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                {item.amenities}
            </p>
        </div>
      )}
    </div>
  );
}
