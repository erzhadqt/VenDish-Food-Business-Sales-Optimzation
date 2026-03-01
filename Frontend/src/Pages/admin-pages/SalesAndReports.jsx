import React, { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import { 
  format, startOfMonth, endOfMonth, isWithinInterval, parseISO, 
  startOfWeek, endOfWeek, startOfYear, endOfYear 
} from "date-fns";
import { 
  TrendingUp, Package, CalendarDays, 
  Download, RefreshCw, PhilippinePesoIcon, Users, BarChart3
} from "lucide-react";

import api from '../../api'; 

const periods = ["Daily", "Weekly", "Monthly", "Yearly"];
const chartTypes = ["Bar", "Line", "Area"];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function SalesAndReports() {
  // --- STATE ---
  const [reports, setReports] = useState([]); 
  const [staffReports, setStaffReports] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [allReceipts, setAllReceipts] = useState([]); 
  const [originalReports, setOriginalReports] = useState([]); 

  const [cashierOptions, setCashierOptions] = useState([]); 
  const [filterCashier, setFilterCashier] = useState("ALL"); 
  
  const [viewMode, setViewMode] = useState('timeline'); 
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [period, setPeriod] = useState("Daily");
  const [chartType, setChartType] = useState("Bar");
  const [showCalendar, setShowCalendar] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'report_date', direction: 'desc' });

  // 1. CHECK ADMIN STATUS ON LOAD
  useEffect(() => {
    const getUserData = async () => {
      try {
        const response = await api.get('/firstapp/user/me/');
        // Allow BOTH Staff and Superusers to access admin features
        if (response.data.is_staff || response.data.is_superuser) {
            setIsAdmin(true);
        }
      } catch (err) {
        console.log(err);
      }
    }
    getUserData();
  }, []);

  // 2. FETCH REPORTS
  const fetchReports = async () => {
    setLoading(true);
    try {
      // A. Fetch Timeline Data (Global Sales)
      const timelineRes = await api.get('/firstapp/sales/');
      setOriginalReports(timelineRes.data); 
      setReports(timelineRes.data);         

      // B. Fetch Data for Filters (Receipts & Users)
      // We check the token/user state here, but we also rely on the API call succeeding
      try {
          // Fetch Receipts and Users in parallel
          const [receiptsRes, usersRes] = await Promise.all([
            api.get('/firstapp/receipt/'),
            api.get('/firstapp/users/')
          ]);

          const receipts = receiptsRes.data;
          const allUsers = usersRes.data;
          
          setAllReceipts(receipts); 

          // 1. Prepare Cashier List & Staff Data
          const staffMap = {};
          const uniqueCashiers = new Set();

          // A. Add ALL Users to the list (Broadened to ensure your accounts show up)
          if (Array.isArray(allUsers)) {
             allUsers.forEach(u => {
                 // Logic: Include if they are staff, superuser, OR have "cashier"/"staff" in name
                 // OR simply include everyone to be safe for now.
                 const isRelevant = u.is_staff || u.is_superuser || 
                                    u.username.toLowerCase().includes('cashier') || 
                                    u.username.toLowerCase().includes('staff');
                 
                 if (isRelevant) {
                     uniqueCashiers.add(u.username);
                     // Initialize stats
                     if (!staffMap[u.username]) {
                         staffMap[u.username] = { name: u.username, revenue: 0, orders: 0 };
                     }
                 }
             });
          }

          // B. Process Receipts to calculate Revenue
          receipts.forEach(receipt => {
            const cashierName = receipt.cashier_name || 'Unknown';
            
            // Ensure this cashier is in our unique list (even if deleted)
            if (cashierName !== 'Unknown') {
                uniqueCashiers.add(cashierName);
            }

            if(receipt.status === 'COMPLETED') {
                if (!staffMap[cashierName]) {
                    staffMap[cashierName] = { name: cashierName, revenue: 0, orders: 0 };
                }
                staffMap[cashierName].revenue += parseFloat(receipt.total || 0);
                staffMap[cashierName].orders += 1;
            }
          });
          
          setStaffReports(Object.values(staffMap).sort((a, b) => b.revenue - a.revenue));
          setCashierOptions(Array.from(uniqueCashiers).sort());

      } catch (err) {
          console.error("Error fetching detailed filter data (User might not be admin or network error):", err);
      }
      
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when component mounts or admin status changes
  useEffect(() => {
    fetchReports();
  }, [isAdmin]);

  const refreshToday = async () => {
    try {
      setLoading(true);
      await api.post('/firstapp/sales/refresh-today/');
      await fetchReports(); 
    } catch (error) {
      console.error("Failed to refresh today's report:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. HANDLE CASHIER FILTERING LOGIC
  useEffect(() => {
    if (filterCashier === 'ALL') {
        if (originalReports.length > 0) {
            setReports(originalReports);
        }
        return;
    }

    const groupedData = {};

    allReceipts.forEach(receipt => {
        const rCashier = receipt.cashier_name || 'Unknown';
        if (rCashier !== filterCashier) return;

        const dateObj = new Date(receipt.created_at);
        const dateKey = receipt.created_at ? format(dateObj, 'yyyy-MM-dd') : 'N/A';

        if (!groupedData[dateKey]) {
            groupedData[dateKey] = {
                report_date: dateKey,
                total_revenue: 0,
                total_orders: 0,
                voided_orders: 0,
                top_selling_product: "N/A",
                itemCounts: {} 
            };
        }

        if (receipt.status === 'COMPLETED') {
            groupedData[dateKey].total_revenue += parseFloat(receipt.total || 0);
            groupedData[dateKey].total_orders += 1;

            if (Array.isArray(receipt.items)) {
                receipt.items.forEach(item => {
                    const pName = item.product_name || item.name || 'Unknown Item';
                    const qty = parseFloat(item.quantity || 1);
                    
                    if (!groupedData[dateKey].itemCounts[pName]) {
                        groupedData[dateKey].itemCounts[pName] = 0;
                    }
                    groupedData[dateKey].itemCounts[pName] += qty;
                });
            }

        } else if (receipt.status === 'VOIDED') {
            groupedData[dateKey].voided_orders += 1;
        }
    });

    const calculatedReports = Object.values(groupedData).map(dayReport => {
        let topProduct = "N/A";
        let maxCount = 0;

        if (dayReport.itemCounts) {
            Object.entries(dayReport.itemCounts).forEach(([name, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    topProduct = name;
                }
            });
            delete dayReport.itemCounts; 
        }

        return { ...dayReport, top_selling_product: topProduct };
    }).sort((a, b) => new Date(b.report_date) - new Date(a.report_date));

    setReports(calculatedReports);

  }, [filterCashier, allReceipts, originalReports]);

  // --- DATA FILTERING (Timeline) ---
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (!report.report_date) return false;
      const reportDate = parseISO(report.report_date);
      
      if (period === "Daily") {
        return isWithinInterval(reportDate, { 
          start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) 
        });
      } 
      else if (period === "Weekly") {
        return isWithinInterval(reportDate, { 
          start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) 
        });
      }
      else if (period === "Monthly" || period === "Yearly") {
         return isWithinInterval(reportDate, { 
          start: startOfYear(selectedDate), end: endOfYear(selectedDate) 
        });
      }
      return true;
    });
  }, [reports, selectedDate, period]);

  // --- CHART DATA (Timeline) ---
  const chartData = useMemo(() => {
    const getVal = (val) => parseFloat(val || 0);

    if (period === "Daily" || period === "Weekly") {
      return filteredReports.map(r => ({
        label: format(parseISO(r.report_date), "MMM dd"),
        revenue: getVal(r.total_revenue),
        orders: r.total_orders || 0
      })).reverse(); 
    }

    if (period === "Monthly") {
      const monthlyGroups = {};
      filteredReports.forEach(r => {
        const monthName = format(parseISO(r.report_date), "MMM");
        if (!monthlyGroups[monthName]) {
          monthlyGroups[monthName] = { label: monthName, revenue: 0, orders: 0 };
        }
        monthlyGroups[monthName].revenue += getVal(r.total_revenue);
        monthlyGroups[monthName].orders += (r.total_orders || 0);
      });
      return Object.values(monthlyGroups); 
    }
    return [];
  }, [filteredReports, period]);

  // --- WIDGET STATS ---
  const stats = useMemo(() => {
    const totalRev = filteredReports.reduce((acc, curr) => acc + parseFloat(curr.total_revenue || 0), 0);
    const totalOrders = filteredReports.reduce((acc, curr) => acc + (curr.total_orders || 0), 0);
    
    const sellers = {};
    filteredReports.forEach(r => {
      if(r.top_selling_product && r.top_selling_product !== "N/A") {
        sellers[r.top_selling_product] = (sellers[r.top_selling_product] || 0) + 1;
      }
    });
    const topSellerName = Object.keys(sellers).sort((a,b) => sellers[b] - sellers[a])[0] || "N/A";

    return { totalRev, totalOrders, topSellerName };
  }, [filteredReports]);

  // --- SORTING ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedTableData = [...filteredReports].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if(['total_revenue', 'total_orders', 'voided_orders'].includes(sortConfig.key)) {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // --- EXPORT FUNCTION ---
  const exportToCSV = () => {
    let dataToExport = [];
    let headers = [];
    let title = "";
    let summaryRows = [];
    let filename = "";
    const bom = "\uFEFF"; 

    if (viewMode === 'staff') {
        title = "Staff Performance Report";
        headers = ['Staff Name', 'Total Orders', 'Total Revenue'];
        dataToExport = staffReports.map(s => [
            `"${s.name}"`, 
            s.orders, 
            s.revenue.toFixed(2)
        ]);
        filename = `staff-report-${format(new Date(), 'yyyy-MM-dd')}`;
    } else {
        title = `Sales Report - ${filterCashier === 'ALL' ? 'All Cashiers' : filterCashier}`;
        headers = ['Date', 'Revenue', 'Orders', 'Voided Orders', 'Top Seller']; 
        
        dataToExport = filteredReports.map(r => {
            const dateStr = r.report_date ? format(parseISO(r.report_date), 'yyyy-MM-dd') : 'N/A';
            const productName = r.top_selling_product ? `"${r.top_selling_product.replace(/"/g, '""')}"` : 'N/A';
            
            return [
                dateStr,
                parseFloat(r.total_revenue || 0).toFixed(2),
                r.total_orders || 0,
                r.voided_orders || 0,
                productName
            ];
        });

        summaryRows = [
            ['Total Revenue:', stats.totalRev.toFixed(2)],
            ['Total Orders:', stats.totalOrders],
            ['Top Item:', `"${stats.topSellerName}"`],
            [''] 
        ];
        
        filename = `sales-report-${filterCashier}-${format(selectedDate, 'yyyy-MM-dd')}`;
    }

    const metadata = [
        [title],
        [`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`],
        [`Period: ${period} (${format(selectedDate, 'MMM yyyy')})`],
        [''] 
    ];

    const allRows = [...metadata, ...summaryRows, headers, ...dataToExport];
    const csvContent = bom + allRows.map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 bg-linear-to-br from-gray-50 to-gray-100 min-h-screen">
      
      {/* HEADER */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {viewMode === 'timeline' ? 'Financial Reports' : 'Staff Performance'}
          </h1>
          <p className="text-gray-600">
             {viewMode === 'timeline' 
                ? (filterCashier === 'ALL' ? 'Daily revenue and gross income tracking' : `Sales history for: ${filterCashier}`)
                : 'Comparative sales analysis by staff member'}
          </p>
        </div>
        
        <div className="flex gap-2">
            {/* --- ADMIN TOGGLE: Cashier Filter --- */}
            {/* We show this if isAdmin is true, regardless of superuser status */}
            {isAdmin && viewMode === 'timeline' && (
                <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2">
                    <span className="text-xs text-gray-500 mr-2 font-medium uppercase">Filter:</span>
                    <select 
                        value={filterCashier}
                        onChange={(e) => setFilterCashier(e.target.value)}
                        className="bg-transparent text-sm font-medium text-gray-700 py-2 focus:outline-none cursor-pointer"
                    >
                        <option value="ALL">All Cashiers</option>
                        {cashierOptions.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
            )}

            {isAdmin && (
                <div className="bg-white border border-gray-300 rounded-lg p-1 flex mr-2">
                    <button 
                        onClick={() => { setViewMode('timeline'); setFilterCashier('ALL'); }} 
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'timeline' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <BarChart3 size={16}/> Sales
                    </button>
                    <button 
                        onClick={() => setViewMode('staff')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'staff' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Users size={16}/> Staff
                    </button>
                </div>
            )}

           <button 
                onClick={refreshToday} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                {loading ? "Syncing..." : "Sync"}
            </button>
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all">
                <Download size={18} />
                Export
            </button>
        </div>
      </div>

      {/* ========================== VIEW MODE: TIMELINE ========================== */}
      {viewMode === 'timeline' && (
        <>
            {/* CONTROLS */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={() => setShowCalendar(!showCalendar)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm">
                <CalendarDays size={18} />
                {format(selectedDate, "MMM yyyy")}
                </button>

                <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                {periods.map(p => (
                    <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${period === p ? "bg-gray-800 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
                    {p}
                    </button>
                ))}
                </div>
            </div>

            {showCalendar && (
                <div className="mb-6 bg-white p-4 rounded-lg shadow-md max-w-sm relative z-10">
                <Calendar onChange={(date) => { setSelectedDate(date); setShowCalendar(false); }} value={selectedDate} />
                </div>
            )}

            {/* WIDGETS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-blue-800">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-600 font-medium text-sm">Total Revenue</h3>
                    <PhilippinePesoIcon className="text-blue-800" size={24} />
                </div>
                <p className="text-blue-800 font-bold text-3xl">₱ {stats.totalRev.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                <p className="text-xs text-gray-400 mt-1">
                    {filterCashier === 'ALL' ? 'Global Revenue' : `Rev. by ${filterCashier}`}
                </p>
                </div>

                <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-600 font-medium text-sm">Total Orders</h3>
                    <Package className="text-orange-500" size={24} />
                </div>
                <p className="text-orange-500 font-bold text-3xl">{stats.totalOrders}</p>
                </div>

                <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-600 font-medium text-sm">Top Seller</h3>
                    <TrendingUp className="text-purple-500" size={24} />
                </div>
                <p className="text-purple-500 font-bold text-xl truncate">{stats.topSellerName}</p>
                <p className="text-xs text-gray-400 mt-1">
                     {filterCashier === 'ALL' ? 'Most frequent' : `Top item for ${filterCashier}`}
                </p>
                </div>
            </div>

            {/* CHARTS */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                    {filterCashier === 'ALL' ? 'Financial Performance' : `Performance: ${filterCashier}`}
                </h3>
                <div className="flex gap-2">
                    {chartTypes.map(type => (
                    <button key={type} onClick={() => setChartType(type)} className={`px-3 py-1 rounded-md text-xs font-medium border ${chartType === type ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200"}`}>
                        {type}
                    </button>
                    ))}
                </div>
                </div>
                
                <ResponsiveContainer width="100%" height={320}>
                    {chartType === "Bar" ? (
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `₱${v/1000}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#1e40af" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    ) : chartType === "Line" ? (
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `₱${v/1000}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1e40af" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                    ) : (
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `₱${v/1000}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stackId="1" stroke="#1e40af" fill="#93c5fd" />
                    </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-6">
                <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full">
                    <thead>
                    <tr className="bg-gray-800 text-white">
                        <th onClick={() => handleSort('report_date')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Date {sortConfig.key === 'report_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th onClick={() => handleSort('total_orders')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Orders {sortConfig.key === 'total_orders' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th onClick={() => handleSort('total_revenue')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Revenue {sortConfig.key === 'total_revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th onClick={() => handleSort('top_selling_product')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Top Seller {sortConfig.key === 'top_selling_product' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th onClick={() => handleSort('voided_orders')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Voided {sortConfig.key === 'voided_orders' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {sortedTableData.length > 0 ? sortedTableData.map((report) => (
                        <tr key={report.id || report.report_date} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{report.report_date}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{report.total_orders}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-blue-700">₱ {parseFloat(report.total_revenue).toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                {report.top_selling_product || "N/A"}
                            </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-red-600">{parseFloat(report.voided_orders).toLocaleString()}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="5" className="text-center py-8 text-gray-500">
                                {loading ? "Loading data..." : "No sales reports found."}
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>
            </div>
        </>
      )}

      {/* ========================== VIEW MODE: STAFF (ADMIN ONLY) ========================== */}
      {viewMode === 'staff' && isAdmin && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                
                {/* CHART 1: REVENUE */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Staff</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={staffReports} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(v) => `₱${v/1000}k`} />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}}/>
                            <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                            <Bar dataKey="revenue" fill="#8884d8" name="Revenue" radius={[0, 4, 4, 0]}>
                                {staffReports.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* CHART 2: ORDERS */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Orders Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={staffReports}
                                cx="50%" cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="orders"
                            >
                                {staffReports.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* STAFF TABLE */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="min-w-full">
                  <thead>
                      <tr className="bg-gray-800 text-white">
                          <th className="py-3 px-4 text-left text-sm font-semibold">Staff Name</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold">Total Orders</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold">Total Revenue</th>
                      </tr>
                  </thead>
                  <tbody>
                      {staffReports.length > 0 ? staffReports.map((staff, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-900">{staff.name}</td>
                              <td className="py-3 px-4 text-gray-600">{staff.orders}</td>
                              <td className="py-3 px-4 font-bold text-green-600">
                                  ₱ {parseFloat(staff.revenue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </td>
                          </tr>
                      )) : (
                          <tr><td colSpan="3" className="text-center py-8 text-gray-500">No staff data available.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
        </div>
      )}

    </div>
  );
}