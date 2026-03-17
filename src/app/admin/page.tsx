
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useMemoFirebase, useCollection, useFirestore, useUser, useAuth } from "@/firebase";
import { collection, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { 
  Users, 
  Calendar, 
  UserX, 
  Activity, 
  FileDown, 
  Search,
  Library,
  Info,
  LogOut,
  ShieldAlert,
  ChevronLeft,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PlaceHolderImages } from "@/lib/placeholder-images";

const ADMIN_WHITELIST = [
  "nhica.valderas@neu.edu.ph",
  "shawndavid.domingo@neu.edu.ph",
  "jcesperanza@neu.edu.ph"
];

function FormattedTime({ dateString }: { dateString: any }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return <span className="opacity-0">00:00 am</span>;
  
  try {
    let date: Date;
    if (dateString instanceof Timestamp) {
      date = dateString.toDate();
    } else if (dateString?.toDate) {
      date = dateString.toDate();
    } else {
      date = new Date(dateString);
    }
    return (
      <span className="text-sm">
        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
      </span>
    );
  } catch (e) {
    return <span className="text-sm text-muted-foreground">--:--</span>;
  }
}

export default function AdminDashboard() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const neuLogo = PlaceHolderImages.find(img => img.id === 'neu-logo')?.imageUrl || "";

  const isAdmin = useMemo(() => {
    return user && ADMIN_WHITELIST.includes(user.email || "");
  }, [user]);

  // Real-time visitor logs
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return query(collection(firestore, "visitor_logs"), orderBy("timeIn", "desc"), limit(100));
  }, [firestore, isAdmin]);
  const { data: logs, isLoading: logsLoading } = useCollection(logsQuery);

  // Real-time block list
  const blockListQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return collection(firestore, "blockList");
  }, [firestore, isAdmin]);
  const { data: blockList } = useCollection(blockListQuery);

  const blockedIds = useMemo(() => new Set(blockList?.map(item => item.id) || []), [blockList]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/admin/login");
  };

  // PDF Generation Logic
  const generatePDF = () => {
    if (!logs || logs.length === 0) return;
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Branding
      doc.setFillColor(31, 58, 58); // NEU Blue-Green
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("NEU LIBRARY VISITOR REPORT", pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });

      // Summary Stats Section
      doc.setTextColor(33, 33, 33);
      doc.setFontSize(14);
      doc.text("Summary Statistics", 14, 55);
      
      doc.setFontSize(10);
      doc.text(`Total Records in Report: ${logs.length}`, 14, 65);
      doc.text(`Report Period: Today`, 14, 70);

      // Logs Table
      const tableData = logs.map(log => {
        let logDate: Date;
        if (log.timeIn instanceof Timestamp) logDate = log.timeIn.toDate();
        else if (log.timeIn?.toDate) logDate = log.timeIn.toDate();
        else logDate = new Date(log.timeIn);

        return [
          logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          `${log.visitorFirstName} ${log.visitorLastName}`,
          log.visitorCollege || 'N/A',
          log.purposeOfVisit || 'N/A',
          blockedIds.has(log.visitorId) ? 'BLOCKED' : 'ACTIVE'
        ];
      });

      (doc as any).autoTable({
        startY: 80,
        head: [['Time In', 'Name', 'College', 'Purpose', 'Status']],
        body: tableData,
        headStyles: { fillColor: [31, 58, 58] },
        alternateRowStyles: { fillColor: [240, 244, 247] },
      });

      doc.save(`NEU_Library_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Statistics Calculation
  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCount = logs?.filter(log => {
      let logDate: Date;
      if (log.timeIn instanceof Timestamp) {
        logDate = log.timeIn.toDate();
      } else if (log.timeIn?.toDate) {
        logDate = log.timeIn.toDate();
      } else {
        logDate = new Date(log.timeIn);
      }
      return logDate >= todayStart;
    }).length || 0;

    const activeSessions = logs?.filter(l => l.status === 'ACTIVE').length || 0;
    const blockedCount = blockList?.length || 0;

    return [
      { title: "Today's Visitors", value: todayCount.toString(), icon: Users, color: "text-blue-600" },
      { title: "Recent Records", value: logs?.length.toString() || "0", icon: Calendar, color: "text-green-600" },
      { title: "Blocked Users", value: blockedCount.toString(), icon: UserX, color: "text-red-600" },
      { title: "Active Sessions", value: activeSessions.toString(), icon: Activity, color: "text-emerald-600" },
    ];
  }, [logs, blockList]);

  // Search filter
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchTerm) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter(log => 
      `${log.visitorFirstName} ${log.visitorLastName}`.toLowerCase().includes(term) ||
      (log.visitorCollege || "").toLowerCase().includes(term) ||
      (log.purposeOfVisit || "").toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Activity className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-red-200 shadow-xl bg-white">
          <CardHeader className="space-y-4 pt-10">
            <div className="mx-auto bg-red-100 p-4 rounded-full w-fit">
              <ShieldAlert className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-900">Access Denied</CardTitle>
            <CardDescription className="text-red-700">
              Your account <strong>{user?.email || "Unknown"}</strong> does not have administrative privileges.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-10 space-y-4">
            <p className="text-sm text-muted-foreground">
              Please contact the Library System Administrator if you believe this is an error.
            </p>
            <div className="flex flex-col space-y-3">
              <Button onClick={handleLogout} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                Log Out
              </Button>
              <Link href="/" className="w-full">
                <Button className="w-full bg-[#1a3a3a] hover:bg-[#1a3a3a]/90">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#1a3a3a] text-white shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {neuLogo ? (
              <Image 
                src={neuLogo} 
                alt="NEU Logo" 
                width={36} 
                height={36} 
                className="object-contain"
              />
            ) : (
              <Library className="h-7 w-7" />
            )}
            <div className="flex flex-col">
              <h1 className="text-xl font-bold leading-none uppercase">NEU Library</h1>
              <span className="text-xs opacity-70">Visitor Log • Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end text-right mr-2">
              <span className="text-xs font-bold opacity-80">{user.displayName || "Staff"}</span>
              <span className="text-[10px] opacity-60">{user.email}</span>
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline" 
              size="sm" 
              className="text-white border-white/20 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-sm overflow-hidden bg-white">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                </div>
                <div className={cn("p-2 rounded-lg bg-slate-100", stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Visitor Statistics & Reporting</CardTitle>
                <CardDescription>Time Period Selector</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
                <RadioGroup defaultValue="day" className="flex space-x-6">
                  {['Day', 'Week', 'Month', 'Custom'].map(period => (
                    <div key={period} className="flex items-center space-x-2">
                      <RadioGroupItem value={period.toLowerCase()} id={period} />
                      <Label htmlFor={period} className="text-sm font-medium">{period}</Label>
                    </div>
                  ))}
                </RadioGroup>
                <Button 
                  onClick={generatePDF}
                  disabled={isGeneratingPDF || !logs || logs.length === 0}
                  className="bg-[#1a3a3a] hover:bg-[#1a3a3a]/90"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  Generate PDF Report
                </Button>
              </CardContent>
              <CardHeader className="pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Visitor Activity Logs</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search users here" 
                      className="pl-10 h-9" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold">Time In</TableHead>
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">College/Office</TableHead>
                      <TableHead className="font-bold">Purpose</TableHead>
                      <TableHead className="font-bold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">Loading logs...</TableCell></TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8">No activity logs found.</TableCell></TableRow>
                    ) : filteredLogs.map((log: any) => {
                      const isBlocked = blockedIds.has(log.visitorId);
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <FormattedTime dateString={log.timeIn} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.visitorFirstName} {log.visitorLastName}
                          </TableCell>
                          <TableCell className="text-sm">{log.visitorCollege}</TableCell>
                          <TableCell className="text-sm">{log.purposeOfVisit}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn(
                              "w-20 justify-center border-none shadow-none",
                              isBlocked 
                                ? "bg-red-100 text-red-700" 
                                : "bg-green-100 text-green-700"
                            )}>
                              {isBlocked ? "BLOCKED" : "ACTIVE"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-md font-bold">Block List Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockList?.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center py-4 text-xs text-muted-foreground">No blocked users</TableCell></TableRow>
                    ) : blockList?.map((block: any) => (
                      <TableRow key={block.id}>
                        <TableCell className="text-sm font-medium">{block.visitorName || 'Unknown Visitor'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 text-[10px] shadow-none">BLOCKED</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center text-red-600 font-bold text-sm">
                  <Info className="h-4 w-4 mr-2" />
                  Access Warning
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  System access is limited to authorized library staff. Any unauthorized attempts to bypass security will be logged and reported to the system administrator.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
