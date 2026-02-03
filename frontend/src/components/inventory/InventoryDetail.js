import { useState, useEffect } from "react";
import api from "@/src/services/api";
import { formatNumber, formatDate } from "@/src/utils/formatters";
import { HiUser, HiPhone, HiCalendar, HiCheckCircle, HiCurrencyRupee, HiLocationMarker, HiTag, HiInformationCircle, HiExternalLink } from "react-icons/hi";
import Link from "next/link";

export default function InventoryDetail({ item: initialItem }) {
  const [item, setItem] = useState(initialItem);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFullDetails = async () => {
      if (!initialItem?.id) return;
      setLoading(true);
      try {
        const res = await api.get(`/inventory/items/${initialItem.id}`);
        if (res.data.success) {
          setItem(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch inventory details", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullDetails();
  }, [initialItem?.id]);

  if (!item) return null;

  const detailRows = [
    { label: "Plot Number", value: item.plotNumber, icon: <HiTag /> },
    { label: "Block / Sector", value: item.block, icon: <HiLocationMarker /> },
    { label: "Size", value: item.size, icon: <HiInformationCircle /> },
    { label: "Facing", value: item.facing, icon: <HiInformationCircle /> },
    { label: "Road Width", value: item.roadWidth ? `${item.roadWidth} ft` : null, icon: <HiInformationCircle /> },
    { label: "Type", value: item.propertyType, icon: <HiTag /> },
    { label: "Transaction", value: item.transactionType, icon: <HiTag /> },
    { label: "Open Sides", value: item.openSides, icon: <HiInformationCircle /> },
    { label: "Condition", value: item.condition, icon: <HiTag /> },
    { label: "Status", value: item.status, icon: <HiTag /> },
  ];

  const featureRows = [
    { label: "Construction", value: item.construction ? "Yes" : "No", icon: <HiCheckCircle className={item.construction ? "text-green-500" : "text-gray-300"} /> },
    { label: "Boundary Walls", value: item.boundaryWalls ? "Yes" : "No", icon: <HiCheckCircle className={item.boundaryWalls ? "text-green-500" : "text-gray-300"} /> },
    { label: "Gated Colony", value: item.gatedColony ? "Yes" : "No", icon: <HiCheckCircle className={item.gatedColony ? "text-green-500" : "text-gray-300"} /> },
    { label: "Corner Plot", value: item.corner ? "Yes" : "No", icon: <HiCheckCircle className={item.corner ? "text-green-500" : "text-gray-300"} /> },
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
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#009688] border-b border-brand-spanish-gray/20 pb-1">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeRows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="text-[#009688]">{row.icon}</div>
              <div>
                <p className="text-[10px] text-brand-spanish-gray font-bold uppercase">{row.label}</p>
                <p className={`text-sm ${row.bold ? 'font-black text-brand-dark-gray' : 'font-medium text-brand-dark-gray'}`}>
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
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center backdrop-blur-sm rounded-xl">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="flex items-center justify-between bg-linear-to-r from-brand-dark-gray/5 to-transparent p-4 rounded-lg border border-brand-spanish-gray/20">
        <div>
          <p className="text-[10px] font-black text-[#009688] uppercase tracking-widest">Selected Property</p>
          <h3 className="text-xl font-black text-brand-dark-gray">{item.project?.name || 'Inventory Item'}</h3>
        </div>
        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${item.status === 'AVAILABLE' ? 'bg-[#009688]/10 text-[#009688] border-[#009688]/30' :
          item.status === 'SOLD' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-[#FBB03B]/10 text-[#FBB03B] border-[#FBB03B]/30'
          }`}>
          {item.status}
        </div>
      </div>

      <Section title="Property Details" rows={detailRows} />
      <Section title="Property Features" rows={featureRows} />

      {/* Connected Leads Section */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#009688] border-b border-brand-spanish-gray/20 pb-1">Connected Leads</h4>
        {item.leads && item.leads.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {item.leads.map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-3 bg-white border border-brand-spanish-gray/20 rounded-lg hover:border-[#009688]/30 transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#009688]/10 flex items-center justify-center text-[#009688] font-black text-xs">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-dark-gray leading-none">{lead.name}</p>
                    <p className="text-[10px] text-brand-spanish-gray mt-1">{lead.phone} • {lead.status}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="hidden sm:block">
                    <p className="text-[10px] text-brand-spanish-gray font-bold uppercase">Budget</p>
                    <p className="text-xs font-black text-[#8DC63F]">₹{formatNumber(lead.budgetTo || lead.budgetFrom || 0)}</p>
                  </div>
                  <Link href={`/leads?id=${lead.id}`} className="p-2 text-brand-spanish-gray hover:text-[#009688] hover:bg-[#009688]/10 rounded-lg transition-all">
                    <HiExternalLink size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-brand-spanish-gray italic">No leads associated with this property yet.</p>
        )}
      </div>

      <Section title="Pricing & Value" rows={pricingRows} />
      <Section title="Ownership & Contacts" rows={ownerRows} />
      <Section title="Additional Charges" rows={chargesRows} />
      <Section title="Finalized Sale" rows={saleRows} />

      {item.amenities && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#009688] border-b border-brand-spanish-gray/20 pb-1">Amenities & Remarks</h4>
          <p className="text-sm text-brand-dark-gray bg-linear-to-r from-brand-dark-gray/5 to-transparent p-3 rounded-lg border border-brand-spanish-gray/20 italic">
            {item.amenities}
          </p>
        </div>
      )}
    </div>
  );
}
