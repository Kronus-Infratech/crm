"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";

const schema = z.object({
    name: z.string().min(2, "Name is required (min 2 chars)"),
});

export default function CityForm({ onSubmit, loading, initialData }) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        if (initialData) {
            reset(initialData);
        }
    }, [initialData, reset]);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-black p-1">
            <Input
                label="City Name"
                placeholder="e.g. Noida"
                error={errors.name?.message}
                {...register("name")}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#009688]! hover:bg-[#00796B]! w-full"
                >
                    {loading ? "Processing..." : initialData ? "Update City" : "Create City"}
                </Button>
            </div>
        </form>
    );
}
