import Link from "next/link";
import Image from "next/image";
import { Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function LandingPage() {
  const neuLogo = PlaceHolderImages.find(img => img.id === 'neu-logo')?.imageUrl || "";

  return (
    <main className="min-h-screen bg-[#2d4a3e] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center shadow-sm">
        <div className="container mx-auto flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {neuLogo ? (
              <Image 
                src={neuLogo} 
                alt="NEU Logo" 
                width={50} 
                height={50} 
                className="object-contain"
                priority
              />
            ) : (
              <div className="bg-primary/10 p-1.5 rounded-full">
                <Library className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-[#1a3a2a] tracking-tight uppercase leading-tight">
                New Era University
              </h1>
              <span className="text-sm font-semibold text-[#1a3a2a]/70 uppercase tracking-wider">
                Library Management System
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-[#1a3a2a] rounded-xl shadow-2xl p-12 text-center text-white space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight uppercase">
              Welcome to the NEU Library
            </h2>
            <p className="text-emerald-100 text-lg opacity-80 uppercase text-xs font-bold tracking-widest">
              Your gateway to knowledge and resources. Please sign in to continue.
            </p>
          </div>

          <div className="grid gap-4 max-w-sm mx-auto">
            <Link href="/visitor" className="w-full">
              <Button variant="outline" className="w-full h-14 text-lg font-bold border-white/20 hover:bg-white/10 text-white bg-transparent transition-all uppercase tracking-widest">
                USER LOG IN &rarr;
              </Button>
            </Link>
            
            <Link href="/admin/login" className="w-full">
              <Button variant="outline" className="w-full h-14 text-lg font-bold border-white/20 hover:bg-white/10 text-white bg-transparent transition-all uppercase tracking-widest">
                ADMIN PORTAL
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <footer className="w-full text-center py-8 text-white/50 text-[10px] font-bold uppercase tracking-[0.2em]">
        © 2026 NEU Library. All rights reserved
      </footer>
    </main>
  );
}
