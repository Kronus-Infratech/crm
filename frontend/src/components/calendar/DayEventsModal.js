"use client";

import Modal from "@/src/components/ui/Modal";
import Button from "@/src/components/ui/Button";
import { HiPlus, HiClock, HiOutlineDocumentText, HiUser } from "react-icons/hi";
import { formatDate } from "@/src/utils/formatters";
import clsx from "clsx";

export default function DayEventsModal({ isOpen, onClose, date, events, onSelectEvent, onCreateEvent }) {
    if (!date) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Events for ${formatDate(date)}`}
            size="md"
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">{events.length} schedule(s) found</p>
                    <Button
                        size="xs"
                        variant="primary"
                        icon={HiPlus}
                        onClick={() => onCreateEvent(date)}
                    >
                        Add New
                    </Button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                    {events.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                            <p className="text-gray-400">No events scheduled for this day.</p>
                        </div>
                    ) : (
                        events.map((event, idx) => (
                            <div
                                key={idx}
                                onClick={() => onSelectEvent(event)}
                                className={clsx(
                                    "p-4 rounded-2xl border-l-4 cursor-pointer transition-all hover:translate-x-1 group",
                                    event.type === 'FOLLOW_UP' ? "bg-amber-50 border-amber-500 hover:bg-amber-100/80" :
                                        event.type === 'SITE_VISIT' ? "bg-teal-50 border-teal-500 hover:bg-teal-100/80" :
                                            event.type === 'MEETING' ? "bg-purple-50 border-purple-500 hover:bg-purple-100/80" :
                                                "bg-blue-50 border-blue-500 hover:bg-blue-100/80"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-gray-900 group-hover:text-brand-primary transition-colors">
                                        {event.title}
                                    </h4>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                        event.type === 'FOLLOW_UP' ? "bg-amber-200 text-amber-800" :
                                            event.type === 'SITE_VISIT' ? "bg-teal-200 text-teal-800" :
                                                event.type === 'MEETING' ? "bg-purple-200 text-purple-800" :
                                                    "bg-blue-200 text-blue-800"
                                    )}>
                                        {event.type}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <HiClock className="text-gray-400" />
                                        {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {event.userName || event.lead?.name ? (
                                        <div className="flex items-center gap-1.5 line-clamp-1">
                                            <HiUser className="text-gray-400 shrink-0" />
                                            {event.userName || event.lead?.name}
                                        </div>
                                    ) : null}
                                    {event.description && (
                                        <div className="col-span-2 flex items-start gap-1.5 mt-1 opacity-70">
                                            <HiOutlineDocumentText className="mt-0.5 shrink-0" />
                                            <p className="line-clamp-1">{event.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-4 mt-6 border-t border-gray-100">
                    <Button variant="secondary" fullWidth onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
