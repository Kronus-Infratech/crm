"use client";

import clsx from "clsx";
import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { HiEye, HiEyeOff } from "react-icons/hi";

const Input = forwardRef(({
  label,
  error,
  type = "text",
  className,
  containerClassName,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={clsx("w-full", containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <motion.div
        initial={false}
        animate={error ? { x: [-2, 2, -2, 2, 0] } : {}}
        className="relative"
      >
        <input
          ref={ref}
          type={inputType}
          autoComplete={isPassword ? "off" : props.autoComplete}
          className={clsx(
            "w-full px-4 py-3 text-black rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all",
            error
              ? "border-brand-red focus:ring-brand-red/50 text-brand-red"
              : "border-gray-200 focus:border-brand-primary focus:ring-brand-primary/20",
            isPassword && "pr-12",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-brand-primary transition-colors"
          >
            {showPassword ? <HiEyeOff size={20} /> : <HiEye size={20} />}
          </button>
        )}
      </motion.div>
      {error && (
        <p className="mt-1 text-xs text-brand-red">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
