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

export default function Sales() {
  // --- STATE ---
  const [reports, setReports] = useState([]); 
  const [staffReports, setStaffReports] = useState([]); // NEW: Store Staff Data
  const [loading, setLoading] = useState(true);
  
  // VIEW MODES: 'timeline' (Default) | 'staff' (Admin Only)
  const [viewMode, setViewMode] = useState('timeline'); 
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [period, setPeriod] = useState("Daily");
  const [chartType, setChartType] = useState("Bar");
  const [showCalendar, setShowCalendar] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'report_date', direction: 'desc' });

  // 1. CHECK ADMIN STATUS ON LOAD
  useEffect(() => {
    try {
        const userString = localStorage.getItem('user'); // Or however you store auth
        if (userString) {
            const user = JSON.parse(userString);
            // Check if user is superuser (adjust property name based on your UserSerializer)
            if (user.is_superuser === true || user.role === 'admin') {
                setIsAdmin(true);
            }
        }
    } catch (e) {
        console.error("Error parsing user data:", e);
    }
  }, []);

  // 2. FETCH REPORTS (Updated to fetch Staff data if Admin)
  const fetchReports = async () => {
    setLoading(true);
    try {
      // A. Always fetch the Timeline (Sales Over Time)
      const timelineRes = await api.get('/firstapp/sales/');
      setReports(timelineRes.data);

      // B. If Admin, also fetch the Staff Performance breakdown
      // We check the state 'isAdmin' here. Note: inside useEffect, state might lag slightly on first render,
      // but the dependency array below handles re-fetching.
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      
      if (user && (user.is_superuser || user.role === 'admin')) {
          try {
            const staffRes = await api.get('/firstapp/sales/by-staff/');
            setStaffReports(staffRes.data);
          } catch (err) {
            console.warn("Could not fetch staff data:", err);
          }
      }

    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

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

  // Re-fetch when admin status is determined
  useEffect(() => {
    fetchReports();
  }, [isAdmin]);

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
        gross_income: getVal(r.total_revenue), 
        orders: r.total_orders || 0
      })).reverse(); 
    }

    if (period === "Monthly") {
      const monthlyGroups = {};
      filteredReports.forEach(r => {
        const monthName = format(parseISO(r.report_date), "MMM");
        if (!monthlyGroups[monthName]) {
          monthlyGroups[monthName] = { label: monthName, revenue: 0, gross_income: 0, orders: 0 };
        }
        monthlyGroups[monthName].revenue += getVal(r.total_revenue);
        monthlyGroups[monthName].gross_income += getVal(r.total_revenue);
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
      if(r.top_selling_product) {
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

    if (sortConfig.key === 'gross_income') {
        aValue = parseFloat(a.total_revenue || 0);
        bValue = parseFloat(b.total_revenue || 0);
    }
    else if(['total_revenue', 'total_orders', 'voided_orders'].includes(sortConfig.key)) {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const exportToCSV = () => {
    // Basic CSV export for timeline view
    if (viewMode === 'staff') return alert("Please switch to Sales view to export timeline data.");

    // 1. Add Title and Metadata
    const title = ['Total Sales Report'];
    const periodRow = [`Period: ${period}`, `Export Date: ${format(new Date(), 'yyyy-MM-dd')}`];
    const emptyRow = ['']; // Spacer for visual separation

    // 2. Define Headers
    const headers = ['Date', 'Revenue', 'Gross Income', 'Orders', 'Voided', 'Top Seller'];

    // 3. Map Data (Format Dates & Escape Strings)
    const rows = filteredReports.map(r => {
      // Safety check for date formatting to avoid "Hashtags" in Excel
      const dateStr = r.report_date ? format(parseISO(r.report_date), 'yyyy-MM-dd') : 'N/A';
      
      // Escape product name in quotes in case it contains a comma (e.g., "Chicken, Spicy")
      const productName = r.top_selling_product ? `"${r.top_selling_product}"` : '';

      return [
        dateStr,
        r.total_revenue,
        r.total_revenue, // Gross Income = Revenue (Since no COGS)
        r.total_orders,
        r.voided_orders,
        productName
      ];
    });

    // 4. Combine everything into CSV string
    // Title -> Metadata -> Empty Row -> Headers -> Data Rows
    const csvContent = [
        title.join(','),
        periodRow.join(','),
        emptyRow.join(','),
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // 5. Download Logic
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 bg-linear-to-br from-gray-50 to-gray-100 min-h-screen">
      
      {/* HEADER */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {viewMode === 'timeline' ? 'Financial Reports' : 'Staff Performance'}
          </h1>
          <p className="text-gray-600">
            {viewMode === 'timeline' 
                ? 'Daily revenue and gross income tracking' 
                : 'Comparative sales analysis by staff member'}
          </p>
        </div>
        
        <div className="flex gap-2">
            {/* --- ADMIN TOGGLE: Sales vs Staff --- */}
            {isAdmin && (
                <div className="bg-white border border-gray-300 rounded-lg p-1 flex mr-2">
                    <button 
                        onClick={() => setViewMode('timeline')}
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
                <p className="text-xs text-gray-400 mt-1">For selected period</p>
                </div>

                {/* <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-600 font-medium text-sm">Gross Income</h3>
                    <PhilippinePesoIcon className="text-green-500" size={24} />
                </div>
                <p className="text-green-500 font-bold text-3xl">₱ {stats.totalRev.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                <p className="text-xs text-gray-400 mt-1">Total Income Generated</p>
                </div> */}

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
                <p className="text-xs text-gray-400 mt-1">Most frequent top seller</p>
                </div>
            </div>

            {/* CHARTS */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Financial Performance</h3>
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
                        <Bar dataKey="gross_income" name="Gross Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    ) : chartType === "Line" ? (
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `₱${v/1000}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1e40af" strokeWidth={3} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="gross_income" name="Gross Income" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                    ) : (
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `₱${v/1000}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stackId="1" stroke="#1e40af" fill="#93c5fd" />
                        <Area type="monotone" dataKey="gross_income" name="Gross Income" stackId="2" stroke="#22c55e" fill="#86efac" />
                    </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                    <tr className="bg-gray-800 text-white">
                        <th onClick={() => handleSort('report_date')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Date {sortConfig.key === 'report_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th onClick={() => handleSort('total_orders')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Orders {sortConfig.key === 'total_orders' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        <th onClick={() => handleSort('total_revenue')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Revenue {sortConfig.key === 'total_revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                        {/* <th onClick={() => handleSort('gross_income')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Gross Income {sortConfig.key === 'gross_income' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th> */}
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
                        {/* <td className="py-3 px-4 text-sm font-bold text-green-600">₱ {parseFloat(report.total_revenue).toLocaleString()}</td> */}
                        <td className="py-3 px-4 text-sm text-gray-600">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                {report.top_selling_product || "N/A"}
                            </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-red-600">{parseFloat(report.voided_orders).toLocaleString()}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="6" className="text-center py-8 text-gray-500">
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
                            <th className="py-3 px-4 text-left text-sm">Staff Name</th>
                            <th className="py-3 px-4 text-left text-sm">Total Orders</th>
                            {/* <th className="py-3 px-4 text-left text-sm">Total Revenue Generated</th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {staffReports.length > 0 ? staffReports.map((staff, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-900">{staff.name}</td>
                                <td className="py-3 px-4 text-gray-600">{staff.orders}</td>
                                <td className="py-3 px-4 font-bold text-green-600">₱ {parseFloat(staff.revenue).toLocaleString()}</td>
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