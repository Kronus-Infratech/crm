"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import Select from "@/src/components/ui/Select";
import Button from "@/src/components/ui/Button";
import Input from "@/src/components/ui/Input";

const schema = z.object({
  name: z.string().min(2, "Name is required (min 2 chars)"),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  cityId: z.string().min(1, "City is required"),
});

export default function ProjectForm({ onSubmit, loading, initialData, cities = [] }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
      cityId: "",
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        cityId: initialData.cityId || "",
      });
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-black p-1">
      <Select
        label="Select City"
        placeholder="Choose a city"
        error={errors.cityId?.message}
        options={cities.map(city => ({ label: city.name, value: city.id }))}
        {...register("cityId")}
      />
      <Input
        label="Property Area Name"
        placeholder="e.g. Sector 15"
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="Location"
        placeholder="e.g. Greater Noida"
        {...register("location")}
      />
      <Input
        label="Description"
        placeholder="Optional notes about this area"
        {...register("description")}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
        <Button
          type="submit"
          disabled={loading}
          className="bg-indigo-600! hover:bg-indigo-700! w-full"
        >
          {loading ? "Processing..." : initialData ? "Update Area" : "Create Area"}
        </Button>
      </div>
    </form>
  );
}
