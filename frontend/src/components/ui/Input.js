"use client";

import { forwardRef, isValidElement } from "react";
import clsx from "clsx";

const Input = forwardRef((
  {
    label,
    error,
    icon: Icon,
    type = "text",
    className,
    containerClassName,
    ...props
  },
  ref
) => {
  return (
    <div className={clsx("w-full", containerClassName)}>
      {label && (
        <label className="block text-sm font-bold text-brand-dark-gray mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={type}
          className={clsx(
            "w-full py-3 text-brand-dark-gray rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all",
            Icon ? "pl-12 pr-4" : "px-4",
            error
              ? "border-red-500 focus:ring-red-500/50 text-red-500"
              : "border-brand-spanish-gray/30 focus:border-[#009688] focus:ring-[#009688]/20",
            className
          )}
          {...props}
        />
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-spanish-gray">
            {isValidElement(Icon) ? Icon : <Icon size={20} />}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
