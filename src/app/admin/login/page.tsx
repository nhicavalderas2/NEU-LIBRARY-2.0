"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2, Chrome, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const ADMIN_WHITELIST = [
  "nhica.valderas@neu.edu.ph",
  "shawndavid.domingo@neu.edu.ph",
  "jcesperanza@neu.edu.ph",
  "edwardjasteen.degala@neu.edu.ph"
];

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
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const isAuthorized = user.email && ADMIN_WHITELIST.includes(user.email.toLowerCase());

      if (!isAuthorized) {
        await signOut(auth);
        setError("Access Denied: Institutional Email Required");
        setLoading(false);
        return;
      }

      router.push("/admin");
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError("Failed to sign in with Google.");
      }
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1a3a2a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
        <Link 
          href="/" 
          className="inline-flex items-center text-white/80 hover:text-white transition-all group font-bold uppercase text-[10px] tracking-widest mb-12 self-start"
        >
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="w-full text-center space-y-6">
          <div className="flex flex-col items-center space-y-4 mb-8">
            {neuLogo && (
              <div className="bg-white p-3 rounded-full shadow-lg">
                <Image 
                  src={neuLogo} 
                  alt="NEU Logo" 
                  width={70} 
                  height={70} 
                  className="object-contain"
                />
              </div>
            )}
            <div className="text-white space-y-1">
              <h1 className="text-3xl font-bold tracking-tight uppercase">NEU Library</h1>
              <h2 className="text-xl font-medium opacity-90 uppercase tracking-widest">ADMIN PORTAL</h2>
              <p className="text-[10px] opacity-70 font-black uppercase tracking-widest">Authorized Access Only</p>
            </div>
          </div>

          <Card className="border-none shadow-2xl overflow-hidden bg-white/10 backdrop-blur-md">
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="text-white text-[10px] font-bold uppercase tracking-widest opacity-80 mb-6">
                  Sign in with your authorized NEU administrator account to access the dashboard.
                </div>
                
                <Button 
                  onClick={handleGoogleLogin} 
                  disabled={loading}
                  className="w-full h-14 bg-white text-[#1a3a2a] hover:bg-slate-100 font-bold flex items-center justify-center space-x-3 rounded-xl transition-all shadow-xl uppercase text-xs tracking-widest"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Chrome className="h-6 w-6" />
                  )}
                  <span>ADMIN GOOGLE LOGIN</span>
                </Button>
              </div>
              
              {error && (
                <div className="text-red-200 text-[10px] font-bold uppercase tracking-widest bg-red-900/50 p-3 rounded-lg border border-red-500/30">
                  {error}
                </div>
              )}

              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] text-white/50 leading-relaxed uppercase font-bold tracking-widest">
                  Security Warning: Unauthorized access attempts are monitored and logged.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="w-full text-center py-8 text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">
        © 2026 NEU Library. All rights reserved
      </footer>
    </main>
  );
}
