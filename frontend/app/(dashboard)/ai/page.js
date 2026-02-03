"use client";

import Heading from "@/src/components/ui/Heading";
import AIInsights from "@/src/components/ai/AIInsights";

export default function AIPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Heading level={2}>KRONUS AI</Heading>
                    <p className="text-gray-500 mt-1 font-medium">Analyze your CRM data and get instant answers powered by Gemini.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-brand-spanish-gray/20 shadow-sm overflow-hidden min-h-[70vh] flex flex-col">
                <AIInsights />
            </div>
        </div>
    );
}
