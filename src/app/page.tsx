import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function LandingPage() {
  const neuLogo = PlaceHolderImages.find(img => img.id === 'neu-logo')?.imageUrl || "";

  return (
    <main className="min-h-screen flex flex-col bg-[#1a3a2a]">
      {/* Header - White bar exactly like screenshot */}
      <header className="bg-white border-b px-6 py-4 flex items-center shadow-sm z-20">
        <div className="container mx-auto flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {neuLogo && (
              <Image 
                src={neuLogo} 
                alt="NEU Logo" 
                width={44} 
                height={44} 
                className="object-contain"
                priority
              />
            )}
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-[#1a3a2a] tracking-tight uppercase leading-none">
                New Era University
              </h1>
              <span className="text-[10px] font-bold text-[#1a3a2a]/80 uppercase tracking-widest mt-0.5">
                Library Management System
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-xl text-center space-y-12">
          <div className="bg-[#2d5a4c] p-12 rounded-2xl shadow-2xl space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                Welcome to the NEU Library
              </h2>
              <p className="text-white/90 text-sm md:text-base font-bold uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                Your gateway to knowledge and resources. Please sign in to continue.
              </p>
            </div>

            <div className="grid gap-4 max-w-xs mx-auto">
              <Link href="/visitor" className="w-full">
                <Button 
                  variant="outline" 
                  className="w-full h-16 text-lg font-black border-white/40 hover:bg-white/10 text-white bg-transparent transition-all uppercase tracking-[0.2em] rounded-lg"
                >
                  USER LOG IN <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              
              <Link href="/admin/login" className="w-full">
                <Button 
                  variant="outline" 
                  className="w-full h-16 text-lg font-black border-white/40 hover:bg-white/10 text-white bg-transparent transition-all uppercase tracking-[0.2em] rounded-lg"
                >
                  ADMIN PORTAL
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full text-center py-8 text-white text-[10px] font-black uppercase tracking-[0.2em] z-10" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        © 2026 NEU Library. All rights reserved.
      </footer>
    </main>
  );
}