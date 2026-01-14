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
            days.push(<div key={`blank-${i}`} className="h-32 border-b border-r bg-gray-50/50" />);
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
                        "h-32 border-b border-r p-2 transition-colors hover:bg-gray-50 cursor-pointer relative",
                        isToday && "bg-brand-primary/5"
                    )}
                >
                    <span className={clsx(
                        "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1",
                        isToday ? "bg-brand-primary text-white" : "text-gray-500"
                    )}>
                        {d}
                    </span>

                    <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                        {dateEvents.map((event, idx) => (
                            <div
                                key={idx}
                                onClick={(e) => handleEventClick(e, event)}
                                className={clsx(
                                    "px-2 py-1 text-[10px] font-bold rounded-md truncate border-l-4",
                                    event.type === 'FOLLOW_UP' ? "bg-amber-100 text-amber-700 border-amber-500" :
                                        event.type === 'SITE_VISIT' ? "bg-teal-100 text-teal-700 border-teal-500" :
                                            event.type === 'MEETING' ? "bg-purple-100 text-purple-700 border-purple-500" :
                                                "bg-blue-100 text-blue-700 border-blue-500"
                                )}
                            >
                                {event.title}
                            </div>
                        ))}
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Heading level={1}>Team Calendar</Heading>
                    <p className="text-gray-500 mt-1">Schedule follow-ups and manage your appointments.</p>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <div className="w-48">
                            <Select
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                options={[
                                    { label: "All Team Events", value: "all" },
                                    ...(Array.isArray(users) ? users.map(u => ({ label: u.name, value: u.id })) : [])
                                ]}
                            />
                        </div>
                    )}
                    <Button variant="primary" icon={HiPlus} onClick={() => { setSelectedEvent(null); setSelectedDate(new Date()); setModalOpen(true); }}>
                        New Event
                    </Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border-none shadow-xl shadow-black/3">
                <div className="bg-[#4a4a4a] text-white p-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <h2 className="text-2xl font-black uppercase tracking-tighter">
                            {monthNames[currentDate.getMonth()]} <span className="text-[#fbb03b]">{currentDate.getFullYear()}</span>
                        </h2>
                        <div className="flex items-center bg-white/10 rounded-xl p-1">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <HiChevronLeft size={20} />
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-xs font-black uppercase tracking-widest hover:bg-white/10 rounded-lg transition-colors">
                                Today
                            </button>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <HiChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500" /> General</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500" /> Follow-ups</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-500" /> Meetings</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-teal-500" /> Site Visits</div>
                    </div>
                </div>

                <div className="grid grid-cols-7 bg-white">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} className="py-3 text-center border-b border-r text-[11px] font-black uppercase tracking-[0.2em] text-[#4a4a4a] bg-gray-50/50">
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
