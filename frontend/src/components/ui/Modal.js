"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX } from "react-icons/hi";
import Heading from "./Heading";

export default function Modal({ isOpen, onClose, title, children, size = "md" }) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const sizes = {
        sm: "max-w-md",
        md: "max-w-2xl",
        lg: "max-w-4xl",
        xl: "max-w-6xl",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-brand-dark-gray/60 z-50 backdrop-blur-sm"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={`bg-white rounded-lg shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col pointer-events-auto border border-brand-spanish-gray/20`}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-brand-spanish-gray/20 bg-linear-to-r from-[#009688]/5 to-transparent">
                                <Heading level={3} className="text-xl! text-brand-dark-gray">{title}</Heading>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-[#009688]/10 rounded-lg text-brand-spanish-gray hover:text-[#009688] transition-colors"
                                >
                                    <HiX size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 overflow-y-auto">
                                {children}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
