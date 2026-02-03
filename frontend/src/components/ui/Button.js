"use client";

import { motion } from "framer-motion";
import { isValidElement } from "react";
import Link from "next/link";
import clsx from "clsx";

export default function Button({
  children,
  variant = "primary", // primary, secondary, outline, ghost, danger, warning
  size = "md", // xs, sm, md, lg
  fullWidth = false,
  className,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  isLoading = false,
  icon,
  ...props
}) {
  const isActuallyLoading = loading || isLoading;
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#009688] hover:bg-[#00796B] text-white focus:ring-[#009688]/50 shadow-lg shadow-[#009688]/20",
    secondary: "bg-[#8DC63F] hover:bg-[#7AB52F] text-white focus:ring-[#8DC63F]/50 shadow-md shadow-[#8DC63F]/20",
    outline: "border-2 border-[#009688] text-[#009688] hover:bg-[#009688]/5 focus:ring-[#009688]/50",
    ghost: "text-[#4A4A4A] hover:bg-gray-100 hover:text-[#009688]",
    danger: "bg-red-500 hover:bg-[#8F6449] text-white focus:ring-red-500/50 shadow-lg shadow-red-500/20",
    warning: "bg-[#FBB03B] hover:bg-[#E89F2A] text-white focus:ring-[#FBB03B]/50 shadow-md shadow-[#FBB03B]/20",
  };

  const sizes = {
    xs: "px-2 py-1 text-xs",
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || isActuallyLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isActuallyLoading ? 1 : 0.98 }}
      type={type}
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      onClick={onClick}
      disabled={disabled || isActuallyLoading}
      {...props}
    >
      {isActuallyLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>{children}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {icon && (
            isValidElement(icon) ? icon : (() => {
              const Icon = icon;
              return <Icon size={20} />;
            })()
          )}
          {children}
        </div>
      )}
    </motion.button>
  );
}
