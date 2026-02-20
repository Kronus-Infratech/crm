"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiChevronLeft, HiChevronRight, HiPlus, HiFilter, HiLocationMarker, HiPhone, HiUser } from "react-icons/hi";
import { useAuth } from "@/src/contexts/AuthContext";
import api from "@/src/services/api";
import Heading from "@/src/components/ui/Heading";
import Card from "@/src/components/ui/Card";
import Button from "@/src/components/ui/Button";
import Select from "@/src/components/ui/Select";
import EventModal from "@/src/components/calendar/EventModal";
import DayEventsModal from "@/src/components/calendar/DayEventsModal";
import clsx from "clsx";

export default function CalendarPage() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState("all");
    const [isModalOpen, setModalOpen] = useState(false);
    const [isDayModalOpen, setDayModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [dayEvents, setDayEvents] = useState([]);

    const isAdmin = user?.roles.some(role => ["ADMIN", "EXECUTIVE", "DIRECTOR"].includes(role));

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const params = {
                startDate: firstDay.toISOString(),
                endDate: lastDay.toISOString(),
            };

            if (selectedUser !== "all") {
                params.userId = selectedUser;
            }

            const res = await api.get("/events", { params });
            const eventData = res.data.data || res.data;
            setEvents(Array.isArray(eventData) ? eventData : []);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    }, [currentDate, selectedUser]);

    const fetchUsers = async () => {
        if (!isAdmin) return;
        try {
            const res = await api.get("/users");
            // Ensure we handle both { data: { users: [...] } } and other formats
            const userData = res.data.data?.users || res.data.data || res.data;
            setUsers(Array.isArray(userData) ? userData : []);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            setUsers([]);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (date) => {
        const d = date.getDate();
        const m = date.getMonth();
        const y = date.getFullYear();

        const dateEvents = events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.getDate() === d && eventDate.getMonth() === m && eventDate.getFullYear() === y;
        });

        setSelectedDate(date);
        setDayEvents(dateEvents);
        setDayModalOpen(true);
    };

    const handleEventClick = (e, event) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setModalOpen(true);
    };

    const handleSelectEventFromDayModal = (event) => {
        setDayModalOpen(false);
        setSelectedEvent(event);
        setModalOpen(true);
    };

    const handleCreateEventFromDayModal = (date) => {
        setDayModalOpen(false);
        setSelectedDate(date);
        setSelectedEvent(null);
        setModalOpen(true);
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
        const days = [];

        // Paddings for start of month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`blank-${i}`} className="h-20 sm:h-24 md:h-32 bg-gray-50/10 border-b border-r border-gray-100" />);
        }

        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(year, month, d);
            const isToday = new Date().toDateString() === date.toDateString();

            const dateEvents = events.filter(event => {
                const eventDate = new Date(event.start);
                return eventDate.getDate() === d && eventDate.getMonth() === month && eventDate.getFullYear() === year;
            });

            days.push(
                <div
                    key={d}
                    onClick={() => handleDateClick(date)}
                    className={clsx(
                        "h-20 sm:h-24 md:h-32 border-b border-r border-brand-spanish-gray/10 p-1 md:p-3 transition-all hover:bg-gray-50/80 cursor-pointer relative group",
                        isToday && "bg-[#009688]/5"
                    )}
                >
                    <div className="flex flex-col h-full">
                        <span className={clsx(
                            "text-xs md:text-sm font-bold w-6 h-6 md:w-9 md:h-9 mb-4 flex items-center justify-center rounded-lg transition-all",
                            isToday ? "bg-[#009688] text-white shadow-xl shadow-[#009688]/30" : "text-brand-spanish-gray group-hover:text-[#009688] group-hover:bg-[#009688]/5"
                        )}>
                            {d}
                        </span>

                        {/* Desktop: Event Pills */}
                        <div className="hidden md:block mt-auto space-y-1 overflow-hidden">
                            {dateEvents.slice(0, 2).map((event, idx) => (
                                <div
                                    key={idx}
                                    onClick={(e) => handleEventClick(e, event)}
                                    className={clsx(
                                        "px-2 py-1 text-[10px] font-bold rounded-lg truncate border-l-4",
                                        event.type === 'FOLLOW_UP' ? "bg-[#FBB03B]/10 text-[#FBB03B] border-[#FBB03B]" :
                                            event.type === 'SITE_VISIT' ? "bg-[#8DC63F]/10 text-[#8DC63F] border-[#8DC63F]" :
                                                event.type === 'MEETING' ? "bg-[#009688]/10 text-[#009688] border-[#009688]" :
                                                    "bg-red-500/10 text-red-500 border-red-500"
                                    )}
                                >
                                    {event.title}
                                </div>
                            ))}
                            {dateEvents.length > 2 && (
                                <div className="text-[10px] text-[#009688] font-black px-1">
                                    + {dateEvents.length - 2} more
                                </div>
                            )}
                        </div>

                        {/* Mobile: Compact Lines */}
                        <div className="flex md:hidden mt-auto flex-wrap gap-0.5 max-h-3 overflow-hidden">
                            {dateEvents.slice(0, 3).map((event, idx) => (
                                <div
                                    key={idx}
                                    className={clsx(
                                        "h-1 px-1.5 flex-1 rounded-full",
                                        event.type === 'FOLLOW_UP' ? "bg-[#FBB03B]" :
                                            event.type === 'SITE_VISIT' ? "bg-[#8DC63F]" :
                                                event.type === 'MEETING' ? "bg-[#009688]" :
                                                    "bg-red-500"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        return days;
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.4em] text-[#009688]">Team Sync</span>
                    <Heading level={1} className="text-4xl">Calendar</Heading>
                    <p className="text-gray-400">Streamline your follow-ups and onsite visits.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    {isAdmin && (
                        <div className="w-full sm:w-56">
                            <Select
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                options={[
                                    { label: "All Members", value: "all" },
                                    ...(Array.isArray(users) ? users.map(u => ({ label: u.name, value: u.id })) : [])
                                ]}
                            />
                        </div>
                    )}
                    <Button variant="primary" size="lg" icon={HiPlus} className="shadow-2xl shadow-[#009688]/20 bg-[#009688] hover:bg-[#00796B]" onClick={() => { setSelectedEvent(null); setSelectedDate(new Date()); setModalOpen(true); }}>
                        New Schedule
                    </Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border border-brand-spanish-gray/20 shadow-2xl shadow-black/5 bg-white rounded-lg">
                <div className="bg-white p-2 flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-brand-spanish-gray/20">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
                                {monthNames[currentDate.getMonth()]} <span className="text-gray-200">/ {currentDate.getFullYear()}</span>
                            </h2>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-lg border border-brand-spanish-gray/20">
                            <button onClick={handlePrevMonth} className="p-2.5 hover:bg-white hover:shadow-md rounded-lg transition-all">
                                <HiChevronLeft size={22} className="text-brand-dark-gray" />
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-6 py-1.5 text-xs font-black uppercase tracking-widest text-brand-dark-gray hover:text-[#009688] transition-colors">
                                Today
                            </button>
                            <button onClick={handleNextMonth} className="p-2.5 hover:bg-white hover:shadow-md rounded-lg transition-all">
                                <HiChevronRight size={22} className="text-brand-dark-gray" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 p-4 md:p-0 bg-gray-50/50 md:bg-transparent rounded-lg">
                        {[
                            { color: "bg-red-500", label: "General" },
                            { color: "bg-[#FBB03B]", label: "Follow-ups" },
                            { color: "bg-[#009688]", label: "Meetings" },
                            { color: "bg-[#8DC63F]", label: "Site Visits" }
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-spanish-gray">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-7 border-collapse">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                        <div key={i} className="py-5 text-center border-b border-r border-brand-spanish-gray/10 text-[10px] md:text-xs font-black uppercase tracking-widest text-brand-spanish-gray">
                            {day}
                        </div>
                    ))}
                    {renderCalendar()}
                </div>
            </Card>

            <EventModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                onEventSaved={fetchEvents}
                event={selectedEvent}
                initialDate={selectedDate}
            />

            <DayEventsModal
                isOpen={isDayModalOpen}
                onClose={() => setDayModalOpen(false)}
                date={selectedDate}
                events={dayEvents}
                onSelectEvent={handleSelectEventFromDayModal}
                onCreateEvent={handleCreateEventFromDayModal}
            />
        </div>
    );
}
