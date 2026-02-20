"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { HiPaperAirplane, HiSparkles, HiUser, HiRefresh, HiLightBulb } from "react-icons/hi";
import { getAuthToken, getBaseURL } from "@/src/services/api";
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
    const [streamingText, setStreamingText] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const scrollRef = useRef(null);
    const abortRef = useRef(null);

    const scrollToBottom = () => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingText, statusMessage]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = { role: "user", parts: [{ text: input }] };
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        const messageText = input;
        setInput("");
        setLoading(true);
        setStreamingText("");
        setStatusMessage("thinking");

        try {
            const token = getAuthToken();
            const controller = new AbortController();
            abortRef.current = controller;

            const response = await fetch(`${getBaseURL()}/ai/chat/stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    message: messageText,
                    history: messages, // Send history before adding user message
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                // Keep the last (possibly incomplete) line in the buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data: ")) continue;

                    try {
                        const payload = JSON.parse(trimmed.slice(6));

                        if (payload.type === "status") {
                            setStatusMessage(payload.data);
                        } else if (payload.type === "token") {
                            accumulated += payload.data;
                            setStreamingText(accumulated);
                            setStatusMessage(""); // Clear status once tokens start
                        } else if (payload.type === "done") {
                            // Finalize — move streaming text into messages
                            setMessages(prev => [...prev, { role: "model", parts: [{ text: accumulated }] }]);
                            setStreamingText("");
                            setStatusMessage("");
                        } else if (payload.type === "error") {
                            setMessages(prev => [...prev, { role: "model", parts: [{ text: `⚠️ ${payload.data}` }] }]);
                            setStreamingText("");
                            setStatusMessage("");
                        }
                    } catch {
                        // Ignore malformed JSON lines
                    }
                }
            }

            // If stream ended without a 'done' event but we have accumulated text
            if (accumulated) {
                setMessages(prev => {
                    // Avoid adding duplicate if 'done' event already added it
                    const last = prev[prev.length - 1];
                    if (last?.role === 'model' && last?.parts?.[0]?.text === accumulated) return prev;
                    return [...prev, { role: "model", parts: [{ text: accumulated }] }];
                });
                setStreamingText("");
            }
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("AI Stream Error:", error);
            toast.error("Failed to get response from AI. Please try again.");
            setMessages(prev => [...prev, {
                role: "model",
                parts: [{ text: "⚠️ Sorry, I encountered an error. Please check your connection or API key." }]
            }]);
            setStreamingText("");
        } finally {
            setLoading(false);
            setStatusMessage("");
            abortRef.current = null;
        }
    };

    const suggestions = [
        "Give me a summary of the latest 10 leads.",
        "Which property area is most popular?",
        "How is our lead growth this month?",
        "Analyze the hot properties right now."
    ];

    // Animated status dots
    const StatusIndicator = ({ message }) => (
        <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-white border border-[#009688]/20 flex items-center justify-center text-[#009688] shrink-0 shadow-sm">
                <HiSparkles size={16} className="" />
            </div>
            <div className="bg-white border border-[#009688]/10 p-4 rounded-2xl rounded-tl-none shadow-sm">
                <div className="flex items-center gap-2.5">
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-[#009688] rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-[#009688] rounded-full animate-bounce [animation-delay:0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-[#009688] rounded-full animate-bounce [animation-delay:0.3s]"></span>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold tracking-wide">
                        Kronus AI is <span className="text-[#009688] font-bold">{message}</span>
                    </span>
                </div>
            </div>
        </div>
    );

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

                {/* Streaming text (partial response being received) */}
                {streamingText && (
                    <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-white border border-[#009688]/20 flex items-center justify-center text-[#009688] shrink-0 shadow-sm">
                            <HiSparkles size={16} />
                        </div>
                        <div className="max-w-[92%] md:max-w-[80%] p-3 md:p-4 rounded-2xl text-[13px] md:text-sm leading-relaxed bg-white text-brand-dark-gray border border-brand-spanish-gray/20 rounded-tl-none shadow-sm">
                            <div className="markdown-container model-markdown">
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
                                    {streamingText}
                                </ReactMarkdown>
                            </div>
                            <span className="inline-block w-0.5 h-4 bg-[#009688] animate-pulse ml-0.5 align-text-bottom" />
                        </div>
                    </div>
                )}

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

                {/* Dynamic status indicator (shown while processing, before tokens arrive) */}
                {loading && statusMessage && !streamingText && (
                    <StatusIndicator message={statusMessage} />
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
