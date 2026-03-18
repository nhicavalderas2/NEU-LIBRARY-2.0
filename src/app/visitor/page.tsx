"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, GraduationCap, ScanLine, CheckCircle2, AlertTriangle, Loader2, Chrome, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirestore, useAuth } from "@/firebase";
import { collection, doc, getDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const COLLEGES = [
  "College of Engineering",
  "College of Arts and Sciences",
  "College of Business Administration",
  "College of Computer Studies",
  "College of Nursing",
  "College of Law",
  "College of Medicine",
  "Staff / Administration"
];

const PURPOSES = [
  "Reading",
  "Research",
  "Computer Use",
  "Assignments"
];

const USER_TYPES = [
  "Student",
  "Employee"
];

export default function VisitorKiosk() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    college: "",
    purpose: "",
    schoolId: "",
    userType: ""
  });

  const neuLogo = PlaceHolderImages.find(img => img.id === 'neu-logo')?.imageUrl || "";

  const isValidNEUUser = (email: string | null) => {
    return email?.toLowerCase().endsWith("@neu.edu.ph");
  };

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setIsLoading(true);
    setAuthError(null);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!isValidNEUUser(googleUser.email)) {
        await signOut(auth);
        setAuthError("Access Denied: Institutional Email (@neu.edu.ph) Required");
        setIsLoading(false);
        return;
      }

      setFormData(prev => ({
        ...prev,
        fullName: googleUser.displayName || "",
        email: googleUser.email || ""
      }));
      setIsLoading(false);
    } catch (err: any) {
      console.error("Google login error:", err);
      setAuthError("Failed to sign in with Google.");
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!firestore || !auth) return;
    setIsLoading(true);

    try {
      const visitorId = (formData.email || formData.schoolId || "").toLowerCase();
      
      if (!visitorId) {
        setIsLoading(false);
        return;
      }

      // Check Block List
      const blockRef = doc(firestore, "blockList", visitorId);
      const blockSnap = await getDoc(blockRef);

      if (blockSnap.exists()) {
        setIsBlocked(true);
        setIsLoading(false);
        setTimeout(() => {
          setIsBlocked(false);
          router.push("/");
        }, 4000);
        return;
      }

      // Record Check-in
      const logData = {
        visitorId,
        fullName: formData.fullName,
        email: formData.email || "N/A",
        college: formData.college || "General",
        purpose: formData.purpose,
        userType: formData.userType || "Student",
        timestamp: serverTimestamp(),
        status: "ACTIVE"
      };

      await addDoc(collection(firestore, "visitor_logs"), logData);
      
      setIsLoading(false);
      setIsSuccess(true);
      
      setTimeout(() => {
        setIsSuccess(false);
        router.push("/");
      }, 4000);

    } catch (error: any) {
      console.error("Check-in error:", error);
      setIsLoading(false);
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'visitor_logs',
          operation: 'create',
          requestResourceData: formData,
        }));
      }
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-[#1a3a3a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-none text-center bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="h-2 bg-primary w-full" />
          <CardContent className="pt-12 pb-10 space-y-6">
            <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-[#2d6a4f]" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-[#1a3a3a]">Welcome to NEU Library!</h2>
              <div className="p-6 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <p className="text-2xl font-bold text-[#2d6a4f]">{formData.fullName}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">
                  {formData.college || "Visitor"}
                </p>
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Your check-in was successful. Enjoy your stay!
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 mt-4">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Resetting terminal for next student...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isBlocked) {
    return (
      <main className="min-h-screen bg-red-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-none text-center bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="h-2 bg-red-600 w-full" />
          <CardContent className="pt-12 pb-10 space-y-6">
            <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-red-900 uppercase">Blocked Entry</h2>
              <div className="p-6 bg-red-50 rounded-xl border border-red-100 text-red-700 font-medium">
                Please proceed to the Main Circulation Desk for assistance regarding your status.
              </div>
              <div className="flex items-center justify-center space-x-2 text-xs text-red-300 mt-4">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Terminal resetting...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#2d4a3e] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center text-white/80 hover:text-white transition-all group font-semibold uppercase text-xs tracking-widest">
            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          {neuLogo && (
            <div className="bg-white p-2 rounded-full shadow-lg">
              <Image src={neuLogo} alt="NEU Logo" width={45} height={45} className="object-contain" />
            </div>
          )}
        </div>
        
        <Card className="shadow-2xl border-none overflow-hidden bg-white/95 backdrop-blur-sm rounded-2xl">
          <CardHeader className="bg-[#1a3a2a] text-white p-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <GraduationCap className="h-10 w-10" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold uppercase tracking-tight">Library Check-in</CardTitle>
                <CardDescription className="text-white/70 uppercase text-[10px] font-bold tracking-widest">NEU Library Visitor Management System</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            <Tabs defaultValue="tap" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 h-14 p-1 rounded-xl">
                <TabsTrigger value="tap" className="rounded-lg font-bold uppercase text-xs data-[state=active]:bg-white data-[state=active]:text-primary">
                  <ScanLine className="h-4 w-4 mr-2" />
                  School ID Tap
                </TabsTrigger>
                <TabsTrigger value="email" className="rounded-lg font-bold uppercase text-xs data-[state=active]:bg-white data-[state=active]:text-primary">
                  <Chrome className="h-4 w-4 mr-2" />
                  Institutional Email
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tap" className="space-y-6">
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 space-y-4">
                  <div className="bg-slate-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <ScanLine className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-primary font-bold uppercase text-sm tracking-tight">Please tap your NEU School ID on the reader</p>
                  <div className="max-w-xs mx-auto">
                    <Input 
                      placeholder="OR ENTER SCHOOL ID MANUALLY" 
                      className="text-center h-12 font-bold uppercase text-xs tracking-widest"
                      value={formData.schoolId}
                      onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Full Name</Label>
                  <Input 
                    placeholder="ENTER YOUR FULL NAME" 
                    className="h-12 uppercase text-sm"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-6">
                {!formData.email ? (
                  <div className="space-y-4">
                    <p className="text-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Sign in with your @neu.edu.ph account to continue.</p>
                    <Button 
                      onClick={handleGoogleLogin} 
                      className="w-full h-14 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold space-x-3 shadow-sm uppercase text-xs"
                    >
                      <Chrome className="h-5 w-5" />
                      <span>Sign in with Google</span>
                    </Button>
                    {authError && <p className="text-red-600 text-[10px] text-center font-bold uppercase tracking-tight">{authError}</p>}
                  </div>
                ) : (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-center space-x-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-emerald-500 p-2 rounded-full">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900 uppercase">{formData.fullName}</p>
                      <p className="text-[10px] text-emerald-700 font-medium">{formData.email}</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <div className="mt-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="space-y-2">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Visitor Type</Label>
                    <Select onValueChange={(val) => setFormData({ ...formData, userType: val })}>
                      <SelectTrigger className="h-12 uppercase text-xs font-bold">
                        <SelectValue placeholder="SELECT ROLE" />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_TYPES.map(u => <SelectItem key={u} value={u} className="uppercase text-xs font-bold">{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-slate-500">College / Dept</Label>
                    <Select onValueChange={(val) => setFormData({ ...formData, college: val })}>
                      <SelectTrigger className="h-12 uppercase text-xs font-bold">
                        <SelectValue placeholder="SELECT" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLEGES.map(c => <SelectItem key={c} value={c} className="uppercase text-xs font-bold">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Purpose</Label>
                    <Select onValueChange={(val) => setFormData({ ...formData, purpose: val })}>
                      <SelectTrigger className="h-12 uppercase text-xs font-bold">
                        <SelectValue placeholder="SELECT PURPOSE" />
                      </SelectTrigger>
                      <SelectContent>
                        {PURPOSES.map(p => <SelectItem key={p} value={p} className="uppercase text-xs font-bold">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleCheckIn}
                  disabled={isLoading || !formData.purpose || !formData.fullName || !formData.userType || (!formData.schoolId && !formData.email)}
                  className="w-full h-16 text-xl bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 font-bold shadow-xl rounded-xl transition-all uppercase tracking-widest"
                >
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Complete Check-in"}
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <footer className="w-full text-center py-6 text-white/50 text-[10px] font-bold uppercase tracking-[0.2em]">
        © 2026 NEU Library. All rights reserved
      </footer>
    </main>
  );
}
