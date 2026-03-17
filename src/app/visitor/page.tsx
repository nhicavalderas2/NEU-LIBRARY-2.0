
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, GraduationCap, Mail, ScanLine, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirestore, useAuth, useUser } from "@/firebase";
import { collection, doc, getDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function VisitorLogin() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    college: "",
    purpose: "",
    schoolId: ""
  });

  const neuLogo = PlaceHolderImages.find(img => img.id === 'neu-logo')?.imageUrl || "";

  // Ensure user is authenticated anonymously to satisfy Firestore rules
  useEffect(() => {
    if (auth && !user && !isUserLoading) {
      signInAnonymously(auth).catch(err => {
        console.error("Visitor auth check failed:", err);
      });
    }
  }, [auth, user, isUserLoading]);

  const handleCheckIn = async () => {
    if (!firestore || !auth) {
      console.error("Firebase services not available");
      return;
    }
    
    setIsLoading(true);

    try {
      // Ensure user is signed in
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const userCred = await signInAnonymously(auth);
        currentUser = userCred.user;
      }

      if (!currentUser) {
        throw new Error("Could not initialize guest session.");
      }

      // Create a unique visitor ID for the block check
      const visitorId = formData.schoolId || formData.email || `guest-${currentUser.uid}`;
      
      // 1. Block List Check
      const blockRef = doc(firestore, "blockList", visitorId);
      const blockSnap = await getDoc(blockRef);

      if (blockSnap.exists()) {
        setIsBlocked(true);
        setIsLoading(false);
        setTimeout(() => router.push("/"), 4000);
        return;
      }

      // 2. Record Check-in to visitor_logs
      const logData = {
        visitorFirstName: formData.firstName || "Guest",
        visitorLastName: formData.lastName || "Visitor",
        visitorInstitutionalEmail: formData.email || "",
        visitorCollege: formData.college || "General",
        purposeOfVisit: formData.purpose,
        timeIn: serverTimestamp(),
        visitorId: visitorId,
        status: "ACTIVE"
      };

      await addDoc(collection(firestore, "visitor_logs"), logData);
      
      setIsLoading(false);
      setIsSuccess(true);
      
      // 3. Auto-Reset after success
      setTimeout(() => {
        router.push("/");
      }, 4000);

    } catch (error: any) {
      console.error("Check-in processing error:", error);
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
        <Card className="w-full max-w-md shadow-2xl border-none text-center bg-white overflow-hidden">
          <div className="h-2 bg-[#52796f] w-full" />
          <CardContent className="pt-12 pb-10 space-y-6">
            <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-[#2d6a4f]" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-[#1a3a3a]">Welcome to NEU Library!</h2>
              <div className="p-6 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <p className="text-2xl font-bold text-[#2d6a4f]">
                  {formData.firstName} {formData.lastName}
                </p>
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">
                  {formData.college || "Visitor"}
                </p>
              </div>
              <p className="text-muted-foreground text-sm">
                Your check-in was successful. Enjoy your stay!
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 mt-4">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Redirecting back to portal...</span>
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
        <Card className="w-full max-w-md shadow-2xl border-none text-center bg-white overflow-hidden">
          <div className="h-2 bg-red-600 w-full" />
          <CardContent className="pt-12 pb-10 space-y-6">
            <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-red-900 uppercase">Blocked Entry</h2>
              <div className="p-6 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm text-red-700 font-medium leading-relaxed">
                  Your ID may be blocked due to pending penalties or violations.
                </p>
              </div>
              <p className="text-muted-foreground text-sm font-semibold">
                Please proceed to the Main Circulation Desk for assistance.
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-red-300 mt-4">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Resetting terminal...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#52796f] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center text-white hover:underline transition-all group font-medium">
            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Selection
          </Link>
          {neuLogo && (
            <Image 
              src={neuLogo} 
              alt="NEU Logo" 
              width={50} 
              height={50} 
              className="object-contain"
            />
          )}
        </div>
        
        <Card className="shadow-2xl border-none overflow-hidden bg-white">
          <CardHeader className="border-b pb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-slate-100 rounded-lg">
                <GraduationCap className="h-8 w-8 text-[#2f3e46]" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-[#1a3a3a]">Visitor Check-in</CardTitle>
                <CardDescription>Enter your credentials to access library resources</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="tap" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <ScanLine className="h-4 w-4 mr-2" />
                  School ID Tap
                </TabsTrigger>
                <TabsTrigger value="email" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Details Form
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tap" className="space-y-6">
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <div className="bg-slate-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <ScanLine className="h-8 w-8 text-[#52796f]" />
                  </div>
                  <p className="text-muted-foreground font-medium">Please tap your NEU School ID on the card reader</p>
                  <div className="mt-4">
                    <Input 
                      placeholder="Enter ID Manually if Tap fails" 
                      className="max-w-xs mx-auto text-center h-11"
                      value={formData.schoolId}
                      onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      placeholder="Juan" 
                      className="h-12"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Dela Cruz" 
                      className="h-12"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">NEU Institutional Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="username@neu.edu.ph" 
                    className="h-12"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="college">College / Department</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, college: val })}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select your college" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="College of Engineering">College of Engineering</SelectItem>
                      <SelectItem value="College of Arts and Sciences">College of Arts and Sciences</SelectItem>
                      <SelectItem value="College of Business Administration">College of Business Administration</SelectItem>
                      <SelectItem value="College of Computer Studies">College of Computer Studies</SelectItem>
                      <SelectItem value="College of Nursing">College of Nursing</SelectItem>
                      <SelectItem value="College of Law">College of Law</SelectItem>
                      <SelectItem value="College of Medicine">College of Medicine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <div className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose of Visit</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, purpose: val })}>
                    <SelectTrigger className="h-12 border-slate-300 focus:ring-secondary">
                      <SelectValue placeholder="What brings you to the library today?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Research">Research / Thesis Work</SelectItem>
                      <SelectItem value="Study">Quiet Study / Individual Learning</SelectItem>
                      <SelectItem value="Collaboration">Group Project / Collaboration</SelectItem>
                      <SelectItem value="Borrowing">Borrowing / Returning Books</SelectItem>
                      <SelectItem value="Event">Library Event / Workshop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCheckIn}
                  disabled={isLoading || !formData.purpose || (!formData.schoolId && !formData.firstName)}
                  className="w-full h-14 text-lg bg-[#2f3e46] hover:bg-[#1a3a3a] transition-all shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Verifying...
                    </div>
                  ) : "Complete Check-in"}
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
