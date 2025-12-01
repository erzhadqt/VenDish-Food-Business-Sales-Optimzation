import React, { useState, useEffect, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from "recharts";
import { 
  format, startOfMonth, endOfMonth, isWithinInterval, parseISO, 
  startOfWeek, endOfWeek, startOfYear, endOfYear 
} from "date-fns";
import { 
  TrendingUp, CircleDollarSign, Package, CalendarDays, 
  Download, RefreshCw, DollarSign 
} from "lucide-react";

import api from '../../api'; // Ensure this points to your Django server

const periods = ["Daily", "Weekly", "Monthly"];
const chartTypes = ["Bar", "Line", "Area"];

export default function Sales() {
  // --- STATE ---
  const [reports, setReports] = useState([]); // Stores data from DB
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [period, setPeriod] = useState("Daily");
  const [chartType, setChartType] = useState("Bar");
  const [showCalendar, setShowCalendar] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'report_date', direction: 'desc' });

  // --- API FETCHING ---
  const fetchReports = async () => {
    setLoading(true);
    try {
      // UPDATED ENDPOINT: Matches the ViewSet router path we created
      const response = await api.get('/firstapp/sales/');
      console.log("Fetched Data:", response.data); // Debugging log
      setReports(response.data);
    } catch (error) {
      console.error("Failed to fetch reports. Check your Django URLS:", error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger calculation on backend for "Today"
  const refreshToday = async () => {
    try {
      setLoading(true);
      // UPDATED ENDPOINT: Matches the @action in ViewSet
      await api.post('/firstapp/sales/refresh-today/');
      await fetchReports(); // Reload data after calculation
    } catch (error) {
      console.error("Failed to refresh today's report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // --- DATA FILTERING & AGGREGATION ---
  
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Safety check: ensure report_date exists
      if (!report.report_date) return false;

      const reportDate = parseISO(report.report_date);
      
      if (period === "Daily") {
        return isWithinInterval(reportDate, { 
          start: startOfMonth(selectedDate), 
          end: endOfMonth(selectedDate) 
        });
      } 
      else if (period === "Weekly") {
        return isWithinInterval(reportDate, { 
          start: startOfWeek(selectedDate), 
          end: endOfWeek(selectedDate) 
        });
      }
      else if (period === "Monthly") {
         return isWithinInterval(reportDate, { 
          start: startOfYear(selectedDate), 
          end: endOfYear(selectedDate) 
        });
      }
      return true;
    });
  }, [reports, selectedDate, period]);

  // --- CHART DATA PREPARATION ---
  const chartData = useMemo(() => {
    if (period === "Daily" || period === "Weekly") {
      return filteredReports.map(r => ({
        label: format(parseISO(r.report_date), "MMM dd"),
        revenue: parseFloat(r.total_revenue || 0),
        profit: parseFloat(r.net_profit || 0),
        cost: parseFloat(r.total_cost || 0),
        orders: r.total_orders || 0
      })).reverse(); 
    }

    if (period === "Monthly") {
      const monthlyGroups = {};
      filteredReports.forEach(r => {
        const monthName = format(parseISO(r.report_date), "MMM");
        if (!monthlyGroups[monthName]) {
          monthlyGroups[monthName] = { label: monthName, revenue: 0, profit: 0, cost: 0, orders: 0 };
        }
        monthlyGroups[monthName].revenue += parseFloat(r.total_revenue || 0);
        monthlyGroups[monthName].profit += parseFloat(r.net_profit || 0);
        monthlyGroups[monthName].cost += parseFloat(r.total_cost || 0);
        monthlyGroups[monthName].orders += (r.total_orders || 0);
      });
      return Object.values(monthlyGroups); 
    }
    return [];
  }, [filteredReports, period]);

  // --- WIDGET STATS ---
  const stats = useMemo(() => {
    const totalRev = filteredReports.reduce((acc, curr) => acc + parseFloat(curr.total_revenue || 0), 0);
    const totalProfit = filteredReports.reduce((acc, curr) => acc + parseFloat(curr.net_profit || 0), 0);
    const totalOrders = filteredReports.reduce((acc, curr) => acc + (curr.total_orders || 0), 0);
    
    const sellers = {};
    filteredReports.forEach(r => {
      if(r.top_selling_product) {
        sellers[r.top_selling_product] = (sellers[r.top_selling_product] || 0) + 1;
      }
    });
    const topSellerName = Object.keys(sellers).sort((a,b) => sellers[b] - sellers[a])[0] || "N/A";

    return { totalRev, totalProfit, totalOrders, topSellerName };
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

    if(['total_revenue', 'net_profit', 'total_cost', 'total_orders'].includes(sortConfig.key)) {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // --- EXPORT CSV ---
  const exportToCSV = () => {
    const headers = ['Date', 'Revenue', 'Cost', 'Net Profit', 'Orders', 'Voided', 'Top Seller'];
    const rows = filteredReports.map(r => [
      r.report_date, r.total_revenue, r.total_cost, r.net_profit, 
      r.total_orders, r.voided_orders, r.top_selling_product
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
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
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Financial Reports</h1>
          <p className="text-gray-600">Daily revenue, costs, and profit tracking</p>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={refreshToday} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                {loading ? "Syncing..." : "Sync Today"}
            </button>
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all">
                <Download size={18} />
                Export
            </button>
        </div>
      </div>

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
            <CircleDollarSign className="text-blue-800" size={24} />
          </div>
          <p className="text-blue-800 font-bold text-3xl">₱ {stats.totalRev.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p className="text-xs text-gray-400 mt-1">For selected period</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 font-medium text-sm">Net Profit</h3>
            <DollarSign className="text-green-500" size={24} />
          </div>
          <p className="text-green-500 font-bold text-3xl">₱ {stats.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          <p className="text-xs text-gray-400 mt-1">After costs & expenses</p>
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
            <h3 className="text-gray-600 font-medium text-sm">Top Performer</h3>
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
                <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
            ) : chartType === "Line" ? (
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₱${v/1000}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#1e40af" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
            ) : (
             <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₱${v/1000}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#1e40af" fill="#93c5fd" />
                <Area type="monotone" dataKey="profit" stackId="2" stroke="#22c55e" fill="#86efac" />
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
                <th onClick={() => handleSort('total_cost')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Costs {sortConfig.key === 'total_cost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('net_profit')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Net Profit {sortConfig.key === 'net_profit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('top_selling_product')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Top Seller {sortConfig.key === 'top_selling_product' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTableData.length > 0 ? sortedTableData.map((report) => (
                <tr key={report.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{report.report_date}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{report.total_orders}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-blue-700">₱ {parseFloat(report.total_revenue).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-red-500">₱ {parseFloat(report.total_cost).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm font-bold text-green-600">₱ {parseFloat(report.net_profit).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        {report.top_selling_product || "N/A"}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                        {loading ? "Loading data..." : "No sales reports found. Click 'Sync Today' to generate one."}
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}