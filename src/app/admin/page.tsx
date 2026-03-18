
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
  Filter,
  Users2,
  GraduationCap,
  Building2,
  ClipboardList
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
  "jcesperanza@neu.edu.ph",
  "nhica.valderas@neu.edu.ph",
  "shawndavid.domingo@neu.edu.ph",
  "edwardjassteen.degala@neu.edu.ph",
  "edwardjasteen.degla@neu.edu.ph",
  "edwardjasteen.degala@neu.edu.ph"
];

const COLLEGES = [
  "All Colleges", 
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
  "All Reasons", 
  "Reading", 
  "Research", 
  "Computer Use", 
  "Assignments"
];

const USER_TYPES = [
  "All Roles", 
  "Student", 
  "Employee"
];

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
      <span className="text-sm font-bold text-slate-800">
        {format(date, "MMM dd, yyyy")}
      </span>
    );
  } catch (e) {
    return <span className="text-sm text-slate-400">--/--/--</span>;
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
  const [filterPurpose, setFilterPurpose] = useState("All Reasons");
  const [filterUserType, setFilterUserType] = useState("All Roles");
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
    if (filterPurpose !== "All Reasons") {
      filtered = filtered.filter(l => l.purpose === filterPurpose);
    }
    if (filterUserType !== "All Roles") {
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
      { title: "Total Visitors", value: totalCount.toString(), icon: Users, color: "text-emerald-700", bg: "bg-emerald-50" },
      { title: "Active Sessions", value: activeSessions.toString(), icon: Activity, color: "text-orange-700", bg: "bg-orange-50" },
      { title: "Students", value: studentCount.toString(), icon: GraduationCap, color: "text-blue-700", bg: "bg-blue-50" },
      { title: "Employees", value: employeeCount.toString(), icon: Users2, color: "text-purple-700", bg: "bg-purple-50" },
    ];
  }, [filteredLogs]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/admin/login");
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
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      const tableData = filteredLogs.map(log => [
        format(log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp), "MMM dd, yyyy"),
        log.fullName || 'Unknown',
        log.userType || 'Student',
        log.college || 'N/A',
        log.purpose || 'N/A'
      ]);
      (doc as any).autoTable({
        startY: 50,
        head: [['Date', 'Name', 'Role', 'College', 'Reason']],
        body: tableData,
        headStyles: { fillColor: [26, 58, 42] },
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
          <CardTitle className="text-2xl font-black mb-2 uppercase text-slate-900">Access Denied</CardTitle>
          <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Administrator credentials required.</p>
          <Button onClick={handleLogout} variant="outline" className="w-full mt-8 uppercase font-black border-[#1a3a2a] text-[#1a3a2a]">Sign Out</Button>
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
            <div className="flex flex-col">
              <h1 className="text-xl font-black uppercase tracking-tight hidden sm:block leading-none">NEU Library Dashboard</h1>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1 hidden sm:block">Welcome back, {user.displayName || "Administrator"}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={handleLogout} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white uppercase font-black text-xs hover:bg-white/20">
              <LogOut className="h-4 w-4 mr-2" /> Log Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 md:p-8 space-y-8 flex-1">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">{stat.title}</p>
                  <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
                </div>
                <div className={cn("p-4 rounded-2xl", stat.bg, stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Card */}
        <Card className="border-none shadow-sm bg-white overflow-visible">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Data Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black tracking-wider text-slate-800 flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" /> Time Period
                </Label>
                <div className="flex gap-2">
                  <Select value={dateRangeMode} onValueChange={setDateRangeMode}>
                    <SelectTrigger className="flex-1 font-black text-xs uppercase text-slate-800 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today" className="uppercase text-xs font-bold">Today</SelectItem>
                      <SelectItem value="week" className="uppercase text-xs font-bold">Past 7 Days</SelectItem>
                      <SelectItem value="custom" className="uppercase text-xs font-bold">Custom Range</SelectItem>
                      <SelectItem value="all" className="uppercase text-xs font-bold">All Records</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {dateRangeMode === 'custom' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 border-slate-200">
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
                <Label className="uppercase text-[10px] font-black tracking-wider text-slate-800 flex items-center">
                  <Users2 className="h-3 w-3 mr-1" /> Visitor Role
                </Label>
                <Select value={filterUserType} onValueChange={setFilterUserType}>
                  <SelectTrigger className="font-black text-xs uppercase text-slate-800 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map(t => <SelectItem key={t} value={t} className="uppercase text-xs font-bold">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black tracking-wider text-slate-800 flex items-center">
                  <Building2 className="h-3 w-3 mr-1" /> College / Department
                </Label>
                <Select value={filterCollege} onValueChange={setFilterCollege}>
                  <SelectTrigger className="font-black text-xs uppercase text-slate-800 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLLEGES.map(c => <SelectItem key={c} value={c} className="uppercase text-xs font-bold">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black tracking-wider text-slate-800 flex items-center">
                  <ClipboardList className="h-3 w-3 mr-1" /> Reason for Visit
                </Label>
                <Select value={filterPurpose} onValueChange={setFilterPurpose}>
                  <SelectTrigger className="font-black text-xs uppercase text-slate-800 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map(p => <SelectItem key={p} value={p} className="uppercase text-xs font-bold">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between p-6 border-b">
            <CardTitle className="text-lg font-black flex items-center uppercase text-slate-900">
              <Activity className="h-5 w-5 mr-2 text-emerald-700" />
              Visitor Activity Stream
            </CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search name/ID..." className="pl-10 h-10 font-black uppercase text-[10px] tracking-widest border-slate-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Button onClick={generatePDF} disabled={isGeneratingPDF || !filteredLogs.length} className="bg-[#1a3a2a] uppercase text-xs font-black shadow-md hover:bg-[#2d5a4c]">
                <FileDown className="h-4 w-4 mr-2" /> Export PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="uppercase text-[10px] font-black text-slate-800">Date</TableHead>
                  <TableHead className="uppercase text-[10px] font-black text-slate-800">Visitor</TableHead>
                  <TableHead className="uppercase text-[10px] font-black text-slate-800">Role</TableHead>
                  <TableHead className="uppercase text-[10px] font-black text-slate-800">College</TableHead>
                  <TableHead className="uppercase text-[10px] font-black text-slate-800">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-700" /></TableCell></TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 font-black uppercase text-xs">No records found for the selected filters</TableCell></TableRow>
                ) : filteredLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-slate-800 font-bold"><FormattedDateDisplay dateString={log.timestamp} /></TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 uppercase text-xs">{log.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{log.visitorId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-black uppercase bg-slate-100 text-slate-800">
                        {log.userType || "Student"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-800 font-bold">{log.college || "N/A"}</TableCell>
                    <TableCell className="text-xs text-slate-800 font-bold">{log.purpose || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <footer className="w-full text-center py-6 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-t bg-white">
        © 2026 NEU Library. All rights reserved.
      </footer>
    </div>
  );
}
