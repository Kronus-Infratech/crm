"use client";

import { useState, useRef, useEffect } from "react";
import { HiPaperAirplane, HiSparkles, HiUser, HiRefresh, HiLightBulb } from "react-icons/hi";
import api from "@/src/services/api";
import clsx from "clsx";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AIInsights() {
    const [messages, setMessages] = useState([
        {
            role: "model",
            parts: [{ text: "Hello! I'm your AI Data Assistant. I can help you analyze leads, inventory, and sales trends. What would you like to know?" }]
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    const scrollToBottom = () => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = { role: "user", parts: [{ text: input }] };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            // Format history for Gemini (excluding the last message we just added)
            // Backend expects array of { role, parts: [{ text }] }
            const res = await api.post("/ai/chat", {
                message: input,
                history: messages
            });

            if (res.data.success) {
                setMessages(prev => [...prev, { role: "model", parts: [{ text: res.data.data }] }]);
            }
        } catch (error) {
            console.error("AI Error:", error);
            toast.error("Failed to get response from AI. Please try again.");
            setMessages(prev => [...prev, {
                role: "model",
                parts: [{ text: "⚠️ Sorry, I encountered an error. Please check your connection or API key." }]
            }]);
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        "Give me a summary of the latest 10 leads.",
        "Which property area is most popular?",
        "How is our lead growth this month?",
        "Analyze the hot properties right now."
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50/30">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={clsx(
                            "flex gap-3",
                            msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                    >
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                            msg.role === "user" ? "bg-[#009688] text-white" : "bg-white text-[#009688] border border-[#009688]/20"
                        )}>
                            {msg.role === "user" ? <HiUser size={16} /> : <HiSparkles size={16} />}
                        </div>

                        <div className={clsx(
                            "max-w-[92%] md:max-w-[80%] p-3 md:p-4 rounded-2xl text-[13px] md:text-sm leading-relaxed",
                            msg.role === "user"
                                ? "bg-[#009688] text-white rounded-tr-none shadow-md"
                                : "bg-white text-brand-dark-gray border border-brand-spanish-gray/20 rounded-tl-none shadow-sm"
                        )}>
                            <div className={clsx(
                                "markdown-container",
                                msg.role === "user" ? "user-markdown" : "model-markdown"
                            )}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        table: ({ node, ...props }) => (
                                            <div className="overflow-x-auto my-4 -mx-1 px-1">
                                                <table {...props} className="min-w-full border-collapse border border-gray-100 rounded-lg overflow-hidden" />
                                            </div>
                                        )
                                    }}
                                >
                                    {msg.parts[0].text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Suggestions - Centered when chat is empty */}
                {messages.length === 1 && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => { setInput(s); }}
                                className="text-left p-4 rounded-xl border border-dashed border-gray-300 hover:border-[#009688] hover:bg-[#009688]/5 transition-all group flex items-start gap-3"
                            >
                                <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:text-[#009688] group-hover:bg-white transition-colors">
                                    <HiLightBulb size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 group-hover:text-[#009688]">{s}</p>
                                    <p className="text-xs text-gray-400 mt-1">Click to ask</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {loading && (
                    <div className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-white border border-brand-spanish-gray/20 flex items-center justify-center text-[#009688]">
                            <HiSparkles size={16} />
                        </div>
                        <div className="bg-white border border-brand-spanish-gray/20 p-4 rounded-2xl rounded-tl-none w-32 flex gap-1 items-center justify-center">
                            <span className="w-1.5 h-1.5 bg-[#009688] rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-[#009688] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-[#009688] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSend} className="relative max-w-4xl mx-auto flex gap-2">
                    <input
                        type="text"
                        placeholder="Ask anything about your data..."
                        className="flex-1 bg-gray-50 border-brand-spanish-gray/30 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#009688]/20 focus:border-[#009688] outline-none transition-all pr-12 text-black font-medium"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className={clsx(
                            "bg-[#009688] text-white p-3 rounded-lg shadow-lg shadow-[#009688]/20 transition-all hover:scale-105 active:scale-95",
                            (!input.trim() || loading) && "opacity-50 cursor-not-allowed grayscale"
                        )}
                    >
                        <HiPaperAirplane size={20} className="rotate-90" />
                    </button>
                </form>
                <p className="mt-2 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    AI can make mistakes. Verify important financial data.
                </p>
            </div>
        </div>
    );
}
