"use client";

import clsx from "clsx";

export default function Card({ children, className, hover = false, ...props }) {
  return (
    <div
      className={clsx(
        "bg-white rounded-lg border border-brand-spanish-gray/20 shadow-sm transition-all",
        hover && "hover:shadow-lg hover:border-[#009688]/30 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
