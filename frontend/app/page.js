"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  HiOfficeBuilding, HiGlobe, HiShieldCheck, HiUserGroup,
  HiArrowRight, HiServer, HiChip
} from "react-icons/hi";
import BgLayout from "@/src/components/layout/BgLayout";
import Button from "@/src/components/ui/Button";

export default function Home() {
  return (
    <BgLayout showFooter={false}>
      {/* --- HERO SECTION --- */}
      <section className="pt-40 pb-48 overflow-hidden bg-gray-900">
        {/* Animated Background Mesh - Dark Corporate Theme */}
        {/* <div className="absolute inset-0 w-full h-full bg-[#0a0f1c]">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
           <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-3xl opacity-50 animate-blob"></div>
           <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        </div> */}

        <div className="absolute inset-0 w-full h-full bg-[#0a0f1c]">
          <img src="/kronus-crm-hero.jpg" alt="Logo" className="w-full max-h-screen object-cover bg-white" />
          <div className="absolute top-0 right-0 w-full h-full bg-black/70"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <span className="inline-block px-4 py-1.5 mb-8 text-xs font-bold tracking-[0.2em] text-[#009688] uppercase border border-[#009688]/30 bg-[#009688]/10 rounded-full">
              Internal CRM Portal
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-tight">
              Kronus <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#009688] to-[#8DC63F]">
                Infratech & Consultants
              </span>
            </h1>
            <p className="max-w-xl text-xl text-gray-400 mb-12 leading-relaxed border-l-2 border-[#009688] pl-6">
              Building the future of Sonipat, Haryana. <br />This unified workspace is designed for our teams to manage projects, clients, and assets with precision.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <Link href="/login">
                <button className="text-lg px-10 py-4 bg-white text-gray-900 hover:bg-gray-100 shadow-none rounded-lg border-l-4 border-[#009688]">
                  Access Workspace <HiArrowRight className="ml-2 inline" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Abstract Architectural Elements */}
        {/* <div className="h-full hidden lg:block">
            <img src="/logo.png" alt="Logo" className="w-full rounded-lg object-contain bg-white" />
        </div> */}
      </section>
    </BgLayout>
  );
}
