"use client";

import { forwardRef, isValidElement } from "react";
import clsx from "clsx";

const Select = forwardRef((
    {
        label,
        error,
        options = [],
        icon: Icon,
        className,
        containerClassName,
        placeholder = "Select an option",
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
                <select
                    ref={ref}
                    className={clsx(
                        "w-full py-3 text-brand-dark-gray rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer",
                        Icon ? "pl-12 pr-10" : "px-4 pr-10",
                        error
                            ? "border-red-500 focus:ring-red-500/50 text-red-500"
                            : "border-brand-spanish-gray/30 focus:border-[#009688] focus:ring-[#009688]/20",
                        className
                    )}
                    {...props}
                >
                    <option value="">{placeholder}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-spanish-gray">
                        {isValidElement(Icon) ? Icon : <Icon size={20} />}
                    </div>
                )}
                {/* Custom arrow icon */}
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-brand-spanish-gray">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                    </svg>
                </div>
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>
            )}
        </div>
    );
});

Select.displayName = "Select";

export default Select;
