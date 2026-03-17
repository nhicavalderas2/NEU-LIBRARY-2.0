"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2, Chrome, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function AdminLogin() {
  const auth = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const neuLogo = PlaceHolderImages.find(img => img.id === 'neu-logo')?.imageUrl || "";

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/admin");
    } catch (err: any) {
      console.error("Google login error:", err);
      setError("Failed to sign in with Google.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1a3a2a] flex items-center justify-center p-4 relative">
      {/* Back to Home Link */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 inline-flex items-center text-white/80 hover:text-white hover:underline transition-all group font-medium"
      >
        <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex flex-col items-center space-y-4 mb-8">
          {neuLogo && (
            <Image 
              src={neuLogo} 
              alt="NEU Logo" 
              width={80} 
              height={80} 
              className="object-contain"
            />
          )}
          <div className="text-white space-y-1">
            <h1 className="text-3xl font-bold tracking-tight uppercase">NEU Library</h1>
            <h2 className="text-xl font-medium opacity-90">ADMIN ACCESS</h2>
            <p className="text-sm opacity-70">Authorized personnel only</p>
          </div>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden bg-white/10 backdrop-blur-md">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <Button 
                onClick={handleGoogleLogin} 
                disabled={loading}
                className="w-full h-12 bg-white text-[#1a3a2a] hover:bg-slate-100 font-bold flex items-center justify-center space-x-3"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Chrome className="h-5 w-5" />}
                <span>Sign in with Google</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-white/40">Staff Credentials</span>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="username" className="text-white">Username</Label>
                <Input 
                  id="username" 
                  type="text" 
                  disabled
                  className="bg-white/80 border-none h-12" 
                  placeholder="Password login disabled" 
                />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  disabled
                  className="bg-white/80 border-none h-12" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
            
            {error && (
              <p className="text-red-200 text-xs font-medium bg-red-900/40 p-2 rounded-md border border-red-500/20">
                {error}
              </p>
            )}

            <p className="text-xs text-white/60">
              Protected System. Unauthorized access is monitored.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}