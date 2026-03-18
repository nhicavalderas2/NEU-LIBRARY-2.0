"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useMemoFirebase, useCollection, useFirestore, useUser, useAuth } from "@/firebase";
import { collection, query, orderBy, limit, Timestamp, doc, setDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { 
  Users, 
  Calendar as CalendarIcon, 
  UserX, 
  Activity, 
  FileDown, 
  Search,
  Library,
  LogOut,
  ShieldAlert,
  Loader2,
  Ban,
  Filter,
  Users2,
  GraduationCap,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";

const ADMIN_WHITELIST = [
  "nhica.valderas@neu.edu.ph",
  "shawndavid.domingo@neu.edu.ph",
  "jcesperanza@neu.edu.ph",
  "edwardjasteen.degala@neu.edu.ph"
];

const COLLEGES = ["All Colleges", "College of Engineering", "College of Arts and Sciences", "College of Business Administration", "College of Computer Studies", "College of Nursing", "College of Law", "College of Medicine", "Staff / Administration"];
const PURPOSES = ["All Purposes", "Reading", "Research", "Computer Use", "Assignments"];
const USER_TYPES = ["All Types", "Student", "Employee"];

function FormattedDateDisplay({ dateString }: { dateString: any }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return <span className="opacity-0">--/--/--</span>;
  
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
      <span className="text-sm font-medium">
        {format(date, "MMM dd, yyyy")}
      </span>
    );
  } catch (e) {
    return <span className="text-sm text-muted-foreground">--/--/--</span>;
  }
}

export default function AdminDashboard() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Advanced Filters
  const [filterCollege, setFilterCollege] = useState("All Colleges");
  const [filterPurpose, setFilterPurpose] = useState("All Purposes");
  const [filterUserType, setFilterUserType] = useState("All Types");
  const [dateRangeMode, setDateRangeMode] = useState("today"); 
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const neuLogo = PlaceHolderImages.find(img => img.id === 'neu-logo')?.imageUrl || "";

  const isAdmin = useMemo(() => {
    return user && ADMIN_WHITELIST.includes(user.email || "");
  }, [user]);

  // Real-time visitor logs
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return query(collection(firestore, "visitor_logs"), orderBy("timestamp", "desc"), limit(1000));
  }, [firestore, isAdmin]);
  const { data: rawLogs, isLoading: logsLoading } = useCollection(logsQuery);

  // Real-time block list
  const blockListQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return collection(firestore, "blockList");
  }, [firestore, isAdmin]);
  const { data: blockList } = useCollection(blockListQuery);

  const filteredLogs = useMemo(() => {
    if (!rawLogs) return [];
    
    let filtered = [...rawLogs];
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfDay(subDays(now, 7));
    const monthStart = startOfDay(subDays(now, 30));
    const yearStart = startOfDay(subDays(now, 365));

    // Apply Date Filter
    if (dateRangeMode === "today") {
      filtered = filtered.filter(log => {
        const d = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp);
        return d >= todayStart;
      });
    } else if (dateRangeMode === "week") {
      filtered = filtered.filter(log => {
        const d = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp);
        return d >= weekStart;
      });
    } else if (dateRangeMode === "month") {
      filtered = filtered.filter(log => {
        const d = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp);
        return d >= monthStart;
      });
    } else if (dateRangeMode === "year") {
      filtered = filtered.filter(log => {
        const d = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp);
        return d >= yearStart;
      });
    } else if (dateRangeMode === "custom" && customRange.from && customRange.to) {
      filtered = filtered.filter(log => {
        const d = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp);
        return isWithinInterval(d, {
          start: startOfDay(customRange.from!),
          end: endOfDay(customRange.to!),
        });
      });
    }

    // Apply Content Filters
    if (filterCollege !== "All Colleges") {
      filtered = filtered.filter(l => l.college === filterCollege);
    }
    if (filterPurpose !== "All Purposes") {
      filtered = filtered.filter(l => l.purpose === filterPurpose);
    }
    if (filterUserType !== "All Types") {
      filtered = filtered.filter(l => l.userType === filterUserType);
    }

    // Apply Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        (log.fullName || "").toLowerCase().includes(term) ||
        (log.visitorId || "").toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [rawLogs, searchTerm, filterCollege, filterPurpose, filterUserType, dateRangeMode, customRange]);

  const stats = useMemo(() => {
    const totalCount = filteredLogs.length;
    const activeSessions = filteredLogs.filter(l => l.status === 'ACTIVE').length;
    const studentCount = filteredLogs.filter(l => l.userType === 'Student').length;
    const employeeCount = filteredLogs.filter(l => l.userType === 'Employee').length;

    return [
      { title: "Today's Visitors", value: totalCount.toString(), icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
      { title: "Active Sessions", value: activeSessions.toString(), icon: Activity, color: "text-orange-600", bg: "bg-orange-50" },
      { title: "Students", value: studentCount.toString(), icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50" },
      { title: "Employees", value: employeeCount.toString(), icon: Users2, color: "text-purple-600", bg: "bg-purple-50" },
    ];
  }, [filteredLogs]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/admin/login");
  };

  const handleBlock = async (log: any) => {
    if (!firestore || !log.visitorId) return;
    const isBlocked = blockList?.some(b => b.id === log.visitorId);
    try {
      if (isBlocked) {
        await deleteDoc(doc(firestore, "blockList", log.visitorId));
        toast({ title: "Visitor Unblocked", description: `${log.fullName} has been removed.` });
      } else {
        await setDoc(doc(firestore, "blockList", log.visitorId), {
          visitorName: log.fullName,
          email: log.email || "N/A",
          blockedAt: Timestamp.now(),
          reason: "Administrative Action"
        });
        toast({ variant: "destructive", title: "Visitor Blocked", description: `${log.fullName} has been blocked.` });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const generatePDF = () => {
    if (!filteredLogs.length) return;
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFillColor(26, 58, 42); 
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("NEU LIBRARY VISITOR REPORT", pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      
      let dateText = dateRangeMode.toUpperCase();
      if (dateRangeMode === 'custom' && customRange.from && customRange.to) {
        dateText = `${format(customRange.from, "PP")} - ${format(customRange.to, "PP")}`;
      }
      
      doc.text(`Period: ${dateText} | Filter: ${filterCollege} | Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Filtered Records: ${filteredLogs.length}`, 14, 50);
      const tableData = filteredLogs.map(log => [
        format(log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp), "MMM dd, yyyy"),
        log.fullName || 'Unknown',
        log.userType || 'Student',
        log.college || 'N/A',
        log.purpose || 'N/A'
      ]);
      (doc as any).autoTable({
        startY: 65,
        head: [['Date', 'Name', 'Role', 'College', 'Purpose']],
        body: tableData,
        headStyles: { fillColor: [26, 58, 42] },
        alternateRowStyles: { fillColor: [245, 250, 245] },
      });
      doc.save(`NEU_Library_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-none shadow-2xl bg-white p-8">
          <ShieldAlert className="h-12 w-12 text-red-600 mx-auto mb-6" />
          <CardTitle className="text-2xl font-bold mb-2 uppercase">Access Denied</CardTitle>
          <Button onClick={handleLogout} variant="outline" className="w-full mt-8 uppercase">Sign Out</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-[#1a3a2a] text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {neuLogo ? <Image src={neuLogo} alt="NEU" width={44} height={44} className="bg-white rounded-full p-1" /> : <Library className="h-8 w-8" />}
            <h1 className="text-xl font-bold uppercase tracking-tight hidden sm:block">NEU Library Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right mr-4 hidden md:block">
              <p className="text-sm font-bold uppercase">{user.displayName}</p>
              <p className="text-[10px] opacity-70">{user.email}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white uppercase font-bold text-xs">
              <LogOut className="h-4 w-4 mr-2" /> Log Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 md:p-8 space-y-8 flex-1">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.title}</p>
                  <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
                </div>
                <div className={cn("p-4 rounded-2xl", stat.bg, stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Card */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Data Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-bold tracking-wider">Time Period</Label>
                <div className="flex gap-2">
                  <Select value={dateRangeMode} onValueChange={setDateRangeMode}>
                    <SelectTrigger className="flex-1 font-bold text-xs uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today" className="uppercase text-xs font-bold">Day (Today)</SelectItem>
                      <SelectItem value="week" className="uppercase text-xs font-bold">Week (7 Days)</SelectItem>
                      <SelectItem value="month" className="uppercase text-xs font-bold">Month (30 Days)</SelectItem>
                      <SelectItem value="year" className="uppercase text-xs font-bold">Year (365 Days)</SelectItem>
                      <SelectItem value="custom" className="uppercase text-xs font-bold">Chosen Range</SelectItem>
                      <SelectItem value="all" className="uppercase text-xs font-bold">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {dateRangeMode === 'custom' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0 h-10 w-10">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={customRange.from}
                          selected={{ from: customRange.from, to: customRange.to }}
                          onSelect={(range) => setCustomRange({ from: range?.from, to: range?.to })}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-bold tracking-wider">User Type</Label>
                <Select value={filterUserType} onValueChange={setFilterUserType}>
                  <SelectTrigger className="font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map(t => <SelectItem key={t} value={t} className="uppercase text-xs font-bold">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-bold tracking-wider">College / Department</Label>
                <Select value={filterCollege} onValueChange={setFilterCollege}>
                  <SelectTrigger className="font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLLEGES.map(c => <SelectItem key={c} value={c} className="uppercase text-xs font-bold">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-bold tracking-wider">Purpose of Visit</Label>
                <Select value={filterPurpose} onValueChange={setFilterPurpose}>
                  <SelectTrigger className="font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map(p => <SelectItem key={p} value={p} className="uppercase text-xs font-bold">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <Card className="xl:col-span-2 border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between p-6 border-b">
              <CardTitle className="text-lg font-bold flex items-center uppercase">
                <Activity className="h-5 w-5 mr-2 text-emerald-600" />
                Live Visitor Activity
              </CardTitle>
              <div className="flex items-center space-x-3">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search name/ID..." className="pl-10 h-10 font-bold uppercase text-[10px] tracking-widest" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Button onClick={generatePDF} disabled={isGeneratingPDF || !filteredLogs.length} className="bg-[#1a3a2a] uppercase text-xs font-bold">
                  <FileDown className="h-4 w-4 mr-2" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="uppercase text-[10px] font-bold">Date</TableHead>
                    <TableHead className="uppercase text-[10px] font-bold">Visitor</TableHead>
                    <TableHead className="uppercase text-[10px] font-bold">Role</TableHead>
                    <TableHead className="uppercase text-[10px] font-bold">College</TableHead>
                    <TableHead className="text-right uppercase text-[10px] font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" /></TableCell></TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 font-bold uppercase text-xs">No records found for active filters</TableCell></TableRow>
                  ) : filteredLogs.map((log: any) => {
                    const isVisitorBlocked = blockList?.some(b => b.id === log.visitorId);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-slate-500"><FormattedDateDisplay dateString={log.timestamp} /></TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 uppercase text-xs">{log.fullName}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{log.visitorId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                            {log.userType || "Student"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 truncate max-w-[150px] font-medium">{log.college || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            onClick={() => handleBlock(log)}
                            variant={isVisitorBlocked ? "default" : "outline"}
                            size="sm"
                            className={cn("h-8 text-[10px] uppercase font-bold", isVisitorBlocked ? "bg-red-600" : "text-red-600 border-red-100")}
                          >
                            {isVisitorBlocked ? "Unblock" : "Block"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="bg-slate-50 border-b p-6">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center">
                  <UserX className="h-4 w-4 mr-2" /> Restricted Access List
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-auto">
                {!blockList?.length ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic uppercase font-bold">No restrictions in place</div>
                ) : (
                  <Table>
                    <TableBody>
                      {blockList.map((block: any) => (
                        <TableRow key={block.id}>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold uppercase">{block.visitorName}</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-widest">{block.id}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <Badge className="bg-red-50 text-red-600 border-red-100 uppercase font-black">BLOCKED</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-[#1a3a2a] text-white">
              <CardContent className="p-8 space-y-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/10 p-4 rounded-full">
                    <Library className="h-10 w-10 text-emerald-400" />
                  </div>
                </div>
                <h4 className="font-bold text-lg uppercase tracking-tight">Security & Insights</h4>
                <p className="text-[10px] text-emerald-50 leading-relaxed uppercase opacity-80 font-bold">
                  Toggle filters to generate custom reports for library management and safety audits.
                </p>
                <div className="pt-4 flex items-center justify-center text-[10px] font-black uppercase text-emerald-400 tracking-widest">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
                  Real-time Data Stream: ACTIVE
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-6 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] border-t bg-white">
        © 2026 NEU Library. All rights reserved
      </footer>
    </div>
  );
}
