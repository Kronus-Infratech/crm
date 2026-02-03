"use client";

import clsx from "clsx";

export default function Heading({ level = 1, children, className, ...props }) {
    const Tag = `h${level}`;

    const sizes = {
        1: "text-4xl md:text-5xl font-bold",
        2: "text-3xl md:text-4xl font-bold",
        3: "text-2xl md:text-3xl font-bold",
        4: "text-xl md:text-2xl font-bold",
        5: "text-lg md:text-xl font-bold",
        6: "text-base md:text-lg font-bold",
    };

    return (
        <Tag
            className={clsx(
                "text-brand-dark-gray",
                sizes[level],
                className
            )}
            style={{ fontFamily: "'Clash Display', system-ui, sans-serif" }}
            {...props}
        >
            {children}
        </Tag>
    );
}
