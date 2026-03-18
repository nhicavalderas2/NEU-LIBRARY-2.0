
"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, GraduationCap, ScanLine, CheckCircle2, AlertTriangle, Loader2, Chrome, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirestore, useAuth } from "@/firebase";
import { collection, doc, getDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
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
  "Staff / Administration",
  "Visitor / Guest"
];

const PURPOSES = [
  "Reading",
  "Research",
  "Computer Use",
  "Assignments"
];

const USER_TYPES = [
  { label: "Student", value: "Student" },
  { label: "Employee (Teacher/Staff)", value: "Employee" }
];

function VisitorKioskContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tap");
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    college: "",
    purpose: "",
    schoolId: "",
    userType: "Student"
  });

  const neuLogo = PlaceHolderImages.find(img => img.id === 'neu-logo')?.imageUrl || "";

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setIsLoading(true);
    setAuthError(null);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (activeTab === "email" && !googleUser.email?.toLowerCase().endsWith("@neu.edu.ph")) {
        await signOut(auth);
        setAuthError("Access Denied: Institutional Email (@neu.edu.ph) Required");
        setIsLoading(false);
        return;
      }

      setFormData(prev => ({
        ...prev,
        fullName: googleUser.displayName || prev.fullName,
        email: googleUser.email || "",
        userType: activeTab === "guest" ? "Guest" : (googleUser.email?.toLowerCase().endsWith("@neu.edu.ph") ? prev.userType : "Guest")
      }));
      setIsLoading(false);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError("Failed to sign in with Google.");
      }
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!firestore || !auth) return;
    setIsLoading(true);

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const visitorId = (formData.email || formData.schoolId || "").toLowerCase();
      
      if (!visitorId) {
        setIsLoading(false);
        return;
      }

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
      <main className="min-h-screen bg-[#1a3a2a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-none text-center bg-[#2d5a4c] overflow-hidden animate-in fade-in zoom-in-95 duration-500 rounded-2xl">
          <CardContent className="pt-12 pb-10 space-y-6">
            <div className="bg-white/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Welcome to NEU Library!</h2>
              <div className="p-6 bg-black/20 rounded-xl space-y-2">
                <p className="text-2xl font-black text-white uppercase">{formData.fullName}</p>
                <p className="text-sm text-white uppercase tracking-widest font-black opacity-80">
                  {formData.college || "Visitor"}
                </p>
              </div>
              <p className="text-white text-[10px] font-black uppercase tracking-widest">
                Successfully Checked In. Enjoy your stay!
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isBlocked) {
    return (
      <main className="min-h-screen bg-[#1a3a2a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-none text-center bg-red-900 overflow-hidden animate-in fade-in zoom-in-95 duration-500 rounded-2xl">
          <CardContent className="pt-12 pb-10 space-y-6">
            <div className="bg-white/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Access Restricted</h2>
              <p className="text-white text-sm font-black uppercase leading-relaxed px-6">
                Please visit the Library Help Desk for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1a3a2a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl flex-1 flex flex-col justify-center space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-white hover:text-white/80 transition-all group font-black uppercase text-[10px] tracking-widest">
            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          {neuLogo && (
            <div className="bg-white p-2 rounded-full shadow-lg">
              <Image src={neuLogo} alt="NEU Logo" width={40} height={40} className="object-contain" />
            </div>
          )}
        </div>
        
        <Card className="shadow-2xl border-none overflow-hidden bg-[#2d5a4c] rounded-2xl text-white">
          <CardHeader className="bg-black/10 p-8 border-b border-white/5 text-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 bg-white/10 rounded-full">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight text-white">
                  Library Check-in
                </CardTitle>
                <CardDescription className="text-white/80 uppercase text-[10px] font-black tracking-widest mt-1">
                  New Era University Portal
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            <Tabs defaultValue="tap" onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full mb-8 bg-black/20 h-14 p-1 rounded-xl grid-cols-3">
                <TabsTrigger value="tap" className="rounded-lg font-black uppercase text-[10px] data-[state=active]:bg-white data-[state=active]:text-[#2d5a4c]">
                  <ScanLine className="h-4 w-4 mr-2" />
                  ID Tap
                </TabsTrigger>
                <TabsTrigger value="email" className="rounded-lg font-black uppercase text-[10px] data-[state=active]:bg-white data-[state=active]:text-[#2d5a4c]">
                  <Chrome className="h-4 w-4 mr-2" />
                  Institutional
                </TabsTrigger>
                <TabsTrigger value="guest" className="rounded-lg font-black uppercase text-[10px] data-[state=active]:bg-white data-[state=active]:text-[#2d5a4c]">
                  <Mail className="h-4 w-4 mr-2" />
                  Guest
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tap" className="space-y-6">
                <div className="text-center py-10 border-2 border-dashed border-white/20 rounded-2xl bg-black/10 space-y-4">
                  <ScanLine className="h-12 w-12 text-white mx-auto animate-pulse" />
                  <Input 
                    placeholder="ENTER SCHOOL ID" 
                    className="max-w-xs mx-auto text-center h-12 font-black uppercase text-xs tracking-widest bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    value={formData.schoolId}
                    onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-black uppercase text-[10px] tracking-widest text-white ml-1">Full Name</Label>
                  <Input 
                    placeholder="ENTER FULL NAME" 
                    className="h-12 uppercase text-xs font-black bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-6">
                {!formData.email ? (
                  <div className="space-y-4">
                    <p className="text-center text-[10px] text-white uppercase font-black tracking-widest opacity-80">institutional access (@neu.edu.ph) only</p>
                    <Button 
                      onClick={handleGoogleLogin} 
                      className="w-full h-14 bg-white text-[#1a3a2a] hover:bg-slate-100 font-black space-x-3 uppercase text-xs rounded-xl"
                    >
                      <Chrome className="h-5 w-5" />
                      <span>Google Login</span>
                    </Button>
                    {authError && <p className="text-red-200 text-[10px] text-center font-black uppercase bg-red-900/40 p-3 rounded-lg">{authError}</p>}
                  </div>
                ) : (
                  <div className="bg-black/20 p-5 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/10 p-2 rounded-full"><CheckCircle2 className="h-5 w-5 text-white" /></div>
                      <div>
                        <p className="text-xs font-black text-white uppercase">{formData.fullName}</p>
                        <p className="text-[10px] text-white/60 font-bold">{formData.email}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setFormData({...formData, email: "", fullName: ""})} className="text-[10px] font-black uppercase text-white hover:bg-white/10">Change</Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="guest" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-white ml-1">Email Address</Label>
                    <Input 
                      placeholder="ENTER EMAIL" 
                      className="h-12 text-xs font-black bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-white ml-1">Full Name</Label>
                    <Input 
                      placeholder="ENTER FULL NAME" 
                      className="h-12 uppercase text-xs font-black bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <div className="mt-8 space-y-6 pt-6 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-white ml-1">Role</Label>
                    <Select value={formData.userType} onValueChange={(val) => setFormData({ ...formData, userType: val })}>
                      <SelectTrigger className="h-12 uppercase text-[10px] font-black bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="ROLE" />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_TYPES.map(u => <SelectItem key={u.value} value={u.value} className="uppercase text-[10px] font-black">{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-white ml-1">College</Label>
                    <Select value={formData.college} onValueChange={(val) => setFormData({ ...formData, college: val })}>
                      <SelectTrigger className="h-12 uppercase text-[10px] font-black bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="COLLEGE" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLEGES.map(c => <SelectItem key={c} value={c} className="uppercase text-[10px] font-black">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-white ml-1">Purpose</Label>
                    <Select onValueChange={(val) => setFormData({ ...formData, purpose: val })}>
                      <SelectTrigger className="h-12 uppercase text-[10px] font-black bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="PURPOSE" />
                      </SelectTrigger>
                      <SelectContent>
                        {PURPOSES.map(p => <SelectItem key={p} value={p} className="uppercase text-[10px] font-black">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleCheckIn}
                  disabled={isLoading || !formData.purpose || !formData.fullName || (!formData.schoolId && !formData.email)}
                  className="w-full h-16 text-xl bg-white text-[#1a3a2a] hover:bg-slate-100 font-black shadow-2xl rounded-xl transition-all uppercase tracking-widest border-none"
                >
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Complete Check-in"}
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <footer className="w-full text-center py-8 text-white text-[10px] font-black uppercase tracking-[0.2em]">
        © 2026 NEU Library. All rights reserved.
      </footer>
    </main>
  );
}

export default function VisitorKiosk() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a3a2a] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}>
      <VisitorKioskContent />
    </Suspense>
  );
}
