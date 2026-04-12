import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import { 
  format, startOfMonth, endOfMonth, parseISO, 
  startOfWeek, endOfWeek, startOfYear, endOfYear, startOfDay, endOfDay,
  eachDayOfInterval, eachMonthOfInterval, subYears 
} from "date-fns";
import { 
  TrendingUp, TrendingDown, CalendarDays, 
  Download, RefreshCw, PhilippinePesoIcon, Users, BarChart3, Clock,
  ShoppingBag
} from "lucide-react";

import api from '../../api'; 
import { Skeleton } from '../../Components/ui/skeleton';

const periods = ["Custom Range", "Daily", "Weekly", "Monthly", "Yearly"];
const chartTypes = ["Bar", "Line", "Area"];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const PERIOD_QUERY_MAP = {
  "Custom Range": "custom",
  "Daily": "daily",
  "Weekly": "weekly",
  "Monthly": "monthly",
  "Yearly": "yearly",
};

const getRangeForPeriod = (selectedPeriod, selectedRange) => {
  const refDate = selectedRange?.[0] || new Date();

  if (selectedPeriod === "Custom Range") {
    return {
      start: selectedRange?.[0] || null,
      end: selectedRange?.[1] || null,
    };
  }

  if (selectedPeriod === "Daily") {
    return { start: startOfMonth(refDate), end: endOfMonth(refDate) };
  }

  if (selectedPeriod === "Weekly") {
    return { start: startOfWeek(refDate), end: endOfWeek(refDate) };
  }

  if (selectedPeriod === "Monthly") {
    return { start: startOfYear(refDate), end: endOfYear(refDate) };
  }

  if (selectedPeriod === "Yearly") {
    return { start: startOfYear(subYears(refDate, 4)), end: endOfYear(refDate) };
  }

  return { start: null, end: null };
};

const formatBucketLabel = (bucketValue, selectedPeriod, compact = false) => {
  if (!bucketValue) return "N/A";

  const parsed = parseISO(String(bucketValue));
  if (Number.isNaN(parsed.getTime())) return String(bucketValue);

  if (selectedPeriod === "Weekly") {
    const weekEnd = endOfWeek(parsed);
    return compact
      ? `Wk ${format(parsed, "MMM d")}`
      : `${format(parsed, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  }

  if (selectedPeriod === "Monthly") {
    return format(parsed, compact ? "MMM" : "MMM yyyy");
  }

  if (selectedPeriod === "Yearly") {
    return format(parsed, "yyyy");
  }

  return format(parsed, compact ? "MMM d" : "MMM d, yyyy");
};

const TimelineLoadingSkeleton = () => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-gray-200">
          <Skeleton className="h-4 w-1/2 mb-3" />
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>

    <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-6 w-52" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-14" />
        </div>
      </div>
      <Skeleton className="h-80 w-full" />
    </div>

    <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-6 p-4 space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-6 gap-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </div>
  </>
);

const StaffLoadingSkeleton = () => (
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
    <div className="bg-white rounded-xl shadow-lg p-4 space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-3 gap-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </div>
  </div>
);

export default function SalesAndReports() {
  // --- STATE ---
  const [reports, setReports] = useState([]); 
  const [chartReports, setChartReports] = useState([]);
  const [staffReports, setStaffReports] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [cashierOptions, setCashierOptions] = useState([]); 
  const [filterCashier, setFilterCashier] = useState("ALL"); 
  
  const [viewMode, setViewMode] = useState('timeline'); 
  const [isAdmin, setIsAdmin] = useState(false);

  // Date & Time state defaults to start and end of current day
  const [dateRange, setDateRange] = useState([startOfDay(new Date()), endOfDay(new Date())]);
  const [period, setPeriod] = useState("Custom Range");
  const [chartType, setChartType] = useState("Bar");
  const [showCalendar, setShowCalendar] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'report_date', direction: 'desc' });

  // Refs for click outside
  const calendarRef = useRef(null);

  // 1. CHECK ADMIN STATUS ON LOAD
  useEffect(() => {
    const getUserData = async () => {
      try {
        const response = await api.get('/firstapp/user/me/');
        if (response.data.is_staff || response.data.is_superuser) {
            setIsAdmin(true);
        }
      } catch (err) {
        console.log(err);
      }
    }
    getUserData();
  }, []);

  // 2. FETCH REPORTS DYNAMICALLY
  const fetchReports = async (cashierFilter = "ALL", selectedPeriod = period, selectedRange = dateRange) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cashierFilter !== "ALL") {
        params.set("cashier", cashierFilter);
      }

      params.set("period", PERIOD_QUERY_MAP[selectedPeriod] || "daily");

      const { start, end } = getRangeForPeriod(selectedPeriod, selectedRange);
      if (start instanceof Date && !Number.isNaN(start.getTime())) {
        params.set("start", start.toISOString());
      }
      if (end instanceof Date && !Number.isNaN(end.getTime())) {
        params.set("end", end.toISOString());
      }

      const timelineRes = await api.get(`/firstapp/sales/?${params.toString()}`);
      const timelineData = Array.isArray(timelineRes.data) ? timelineRes.data : [];
      setReports(timelineData);

      let nextChartReports = timelineData;
      if (selectedPeriod === "Weekly") {
        // Weekly chart should show daily progression across the selected week.
        const chartParams = new URLSearchParams(params.toString());
        chartParams.set("period", "daily");
        const weeklyChartRes = await api.get(`/firstapp/sales/?${chartParams.toString()}`);
        nextChartReports = Array.isArray(weeklyChartRes.data) ? weeklyChartRes.data : [];
      }

      setChartReports(nextChartReports);

      if (isAdmin) {
          const staffRes = await api.get('/firstapp/sales/by-staff/');
          setStaffReports(staffRes.data);

          const usersRes = await api.get('/firstapp/users/');
          const uniqueCashiers = new Set();
          
          if (Array.isArray(usersRes.data)) {
             usersRes.data.forEach(u => {
                 const isRelevant = u.is_staff || u.is_superuser || 
                                    u.username.toLowerCase().includes('cashier') || 
                                    u.username.toLowerCase().includes('staff');
                 if (isRelevant) uniqueCashiers.add(u.username);
             });
          }
          setCashierOptions(Array.from(uniqueCashiers).sort());
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      setReports([]);
      setChartReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(filterCashier, period, dateRange);
  }, [isAdmin, filterCashier, period, dateRange]);

  // 3. HANDLE CLICK OUTSIDE CALENDAR TO CLOSE
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }

    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  const refreshToday = async () => {
    try {
      setLoading(true);
      await api.post('/firstapp/sales/refresh-today/');
      await fetchReports(filterCashier, period, dateRange); 
    } catch (error) {
      console.error("Failed to refresh today's report:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- DATA FILTERING (Timeline) ---
  const filteredReports = useMemo(() => reports, [reports]);

  // --- CHART DATA (Timeline) ---
  const chartData = useMemo(() => {
    const getVal = (val) => parseFloat(val || 0);

    if (period === "Daily") {
      const { start, end } = getRangeForPeriod("Daily", dateRange);
      if (!(start instanceof Date) || !(end instanceof Date)) return [];

      const byDay = new Map();
      chartReports.forEach((report) => {
        if (!report?.report_date) return;
        const parsed = parseISO(String(report.report_date));
        if (Number.isNaN(parsed.getTime())) return;

        const key = format(parsed, "yyyy-MM-dd");
        const current = byDay.get(key) || { revenue: 0, orders: 0 };
        byDay.set(key, {
          revenue: current.revenue + getVal(report.total_revenue),
          orders: current.orders + Number(report.total_orders || 0),
        });
      });

      return eachDayOfInterval({ start, end }).map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const found = byDay.get(key);
        return {
          label: format(day, "MMM d"),
          revenue: found ? found.revenue : 0,
          orders: found ? found.orders : 0,
        };
      });
    }

    if (period === "Weekly") {
      const { start, end } = getRangeForPeriod("Weekly", dateRange);
      if (!(start instanceof Date) || !(end instanceof Date)) return [];

      const byDay = new Map();
      chartReports.forEach((report) => {
        if (!report?.report_date) return;
        const parsed = parseISO(String(report.report_date));
        if (Number.isNaN(parsed.getTime())) return;

        const key = format(parsed, "yyyy-MM-dd");
        const current = byDay.get(key) || { revenue: 0, orders: 0 };
        byDay.set(key, {
          revenue: current.revenue + getVal(report.total_revenue),
          orders: current.orders + Number(report.total_orders || 0),
        });
      });

      return eachDayOfInterval({ start, end }).map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const found = byDay.get(key);
        return {
          label: format(day, "EEE"),
          revenue: found ? found.revenue : 0,
          orders: found ? found.orders : 0,
        };
      });
    }

    if (period === "Monthly") {
      const { start, end } = getRangeForPeriod("Monthly", dateRange);
      if (!(start instanceof Date) || !(end instanceof Date)) return [];

      const byMonth = new Map();
      chartReports.forEach((report) => {
        if (!report?.report_date) return;
        const parsed = parseISO(String(report.report_date));
        if (Number.isNaN(parsed.getTime())) return;

        const key = format(parsed, "yyyy-MM");
        const current = byMonth.get(key) || { revenue: 0, orders: 0 };
        byMonth.set(key, {
          revenue: current.revenue + getVal(report.total_revenue),
          orders: current.orders + Number(report.total_orders || 0),
        });
      });

      return eachMonthOfInterval({ start, end }).map((month) => {
        const key = format(month, "yyyy-MM");
        const found = byMonth.get(key);
        return {
          label: format(month, "MMM"),
          revenue: found ? found.revenue : 0,
          orders: found ? found.orders : 0,
        };
      });
    }

    return [...chartReports]
      .sort((a, b) => {
        const aTime = Date.parse(a.report_date || "");
        const bTime = Date.parse(b.report_date || "");
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
          return aTime - bTime;
        }
        return String(a.report_date || "").localeCompare(String(b.report_date || ""));
      })
      .map((report) => ({
        label: formatBucketLabel(report.report_date, period, true),
        revenue: getVal(report.total_revenue),
        orders: Number(report.total_orders || 0),
      }));
  }, [chartReports, period, dateRange]);

  // --- WIDGET STATS ---
  const stats = useMemo(() => {
    const totalRev = filteredReports.reduce((acc, curr) => acc + parseFloat(curr.total_revenue || 0), 0);
    const totalOrders = filteredReports.reduce((acc, curr) => acc + (curr.total_orders || 0), 0);
    
    const productTotals = {};
    filteredReports.forEach(r => {
      const dailySales = r?.daily_product_sales;
      if (!dailySales || typeof dailySales !== "object") return;

      Object.entries(dailySales).forEach(([productName, qty]) => {
        const safeName = String(productName || "").trim();
        const parsedQty = Number(qty || 0);
        if (!safeName || !Number.isFinite(parsedQty) || parsedQty <= 0) return;

        productTotals[safeName] = (productTotals[safeName] || 0) + parsedQty;
      });
    });

    let topSellerName = "N/A";
    let leastSellerName = "N/A";
    const productTotalEntries = Object.entries(productTotals);
    if (productTotalEntries.length > 0) {
      const sortedByQty = [...productTotalEntries].sort((a, b) => {
        if (a[1] !== b[1]) return a[1] - b[1];
        return a[0].localeCompare(b[0]);
      });
      leastSellerName = sortedByQty[0][0];
      topSellerName = sortedByQty[sortedByQty.length - 1][0];
    } else {
      const topSellers = {};
      const leastSellers = {};
      filteredReports.forEach((r) => {
        if (r.top_selling_product && r.top_selling_product !== "N/A") {
          topSellers[r.top_selling_product] = (topSellers[r.top_selling_product] || 0) + 1;
        }
        if(r.least_selling_product && r.least_selling_product !== "N/A") {
          leastSellers[r.least_selling_product] = (leastSellers[r.least_selling_product] || 0) + 1;
        }
      });
      topSellerName = Object.keys(topSellers).sort((a,b) => topSellers[b] - topSellers[a])[0] || "N/A";
      leastSellerName = Object.keys(leastSellers).sort((a,b) => leastSellers[b] - leastSellers[a])[0] || "N/A";
    }

    return { totalRev, totalOrders, topSellerName, leastSellerName };
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

    if (sortConfig.key === 'report_date') {
        const aDate = Date.parse(aValue || '');
        const bDate = Date.parse(bValue || '');
        if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
          aValue = aDate;
          bValue = bDate;
        }
    }

    if(['total_revenue', 'total_orders', 'voided_orders'].includes(sortConfig.key)) {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const timelineSubtitle = useMemo(() => {
    const baseText = `${period} revenue tracking`;
    return filterCashier === 'ALL' ? baseText : `${baseText} for: ${filterCashier}`;
  }, [period, filterCashier]);

  const periodColumnTitle = useMemo(() => {
    if (period === 'Weekly') return 'Week';
    if (period === 'Monthly') return 'Month';
    if (period === 'Yearly') return 'Year';
    return 'Day';
  }, [period]);

  // --- EXPORT FUNCTION ---
  const exportToCSV = () => {
    const bom = "\uFEFF";

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const text = String(value);
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const formatMoney = (value) => Number.parseFloat(value || 0).toFixed(2);
    const periodStart = dateRange[0];
    const periodEnd = dateRange[1];
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';

    const baseMetadata = [
      ['Generated At', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
      ['Report View', viewMode === 'staff' ? 'Staff Performance' : 'Sales Timeline'],
      ['Selected Period', period],
      ['Range Start', periodStart ? format(periodStart, 'yyyy-MM-dd HH:mm:ss') : 'N/A'],
      ['Range End', periodEnd ? format(periodEnd, 'yyyy-MM-dd HH:mm:ss') : 'N/A'],
      ['Timezone', timezone],
    ];

    let summaryRows = [];
    let detailHeaders = [];
    let detailRows = [];
    let filename = '';

    if (viewMode === 'staff') {
      const rankedStaff = [...staffReports].sort(
        (a, b) => Number.parseFloat(b.revenue || 0) - Number.parseFloat(a.revenue || 0)
      );
      const totalStaffRevenue = rankedStaff.reduce((sum, row) => sum + Number.parseFloat(row.revenue || 0), 0);
      const totalStaffOrders = rankedStaff.reduce((sum, row) => sum + Number(row.orders || 0), 0);
      const overallAov = totalStaffOrders > 0 ? totalStaffRevenue / totalStaffOrders : 0;
      const topStaff = rankedStaff[0]?.name || 'N/A';

      summaryRows = [
        ['Total Staff', rankedStaff.length],
        ['Total Orders', totalStaffOrders],
        ['Total Revenue (PHP)', formatMoney(totalStaffRevenue)],
        ['Average Order Value (PHP)', formatMoney(overallAov)],
        ['Top Performer', topStaff],
      ];

      detailHeaders = [
        'Rank',
        'Staff Name',
        'Total Orders',
        'Total Revenue (PHP)',
        'Average Order Value (PHP)',
        'Revenue Share (%)',
        'Order Share (%)',
      ];

      detailRows = rankedStaff.map((staff, index) => {
        const revenue = Number.parseFloat(staff.revenue || 0);
        const orders = Number(staff.orders || 0);
        const aov = orders > 0 ? revenue / orders : 0;
        const revenueShare = totalStaffRevenue > 0 ? (revenue / totalStaffRevenue) * 100 : 0;
        const orderShare = totalStaffOrders > 0 ? (orders / totalStaffOrders) * 100 : 0;

        return [
          index + 1,
          staff.name || 'N/A',
          orders,
          formatMoney(revenue),
          formatMoney(aov),
          revenueShare.toFixed(2),
          orderShare.toFixed(2),
        ];
      });

      filename = `staff-performance-report-${format(new Date(), 'yyyy-MM-dd')}`;
    } else {
      const totalVoidedOrders = filteredReports.reduce((sum, row) => sum + Number(row.voided_orders || 0), 0);
      const averageOrderValue = stats.totalOrders > 0 ? stats.totalRev / stats.totalOrders : 0;

      const highestRevenueDay = filteredReports.reduce((maxRow, row) => {
        const rowRev = Number.parseFloat(row.total_revenue || 0);
        const maxRev = maxRow ? Number.parseFloat(maxRow.total_revenue || 0) : -1;
        return rowRev > maxRev ? row : maxRow;
      }, null);

      const highestRevenueDayLabel = highestRevenueDay?.report_date
        ? formatBucketLabel(highestRevenueDay.report_date, period)
        : 'N/A';

      summaryRows = [
        ['Cashier Filter', filterCashier],
        ['Total Records', filteredReports.length],
        ['Total Orders', stats.totalOrders],
        ['Total Revenue (PHP)', formatMoney(stats.totalRev)],
        ['Total Voided Orders', totalVoidedOrders],
        ['Average Order Value (PHP)', formatMoney(averageOrderValue)],
        ['Top Seller', stats.topSellerName || 'N/A'],
        ['Least Seller', stats.leastSellerName || 'N/A'],
        [`Highest Revenue ${periodColumnTitle}`, highestRevenueDayLabel],
      ];

      detailHeaders = [
        'No.',
        periodColumnTitle,
        'Total Orders',
        'Total Revenue (PHP)',
        'Voided Orders',
        'Top Seller',
        'Least Seller',
        'Average Order Value (PHP)',
      ];

      detailRows = sortedTableData.map((report, index) => {
        const revenue = Number.parseFloat(report.total_revenue || 0);
        const orders = Number(report.total_orders || 0);
        const aov = orders > 0 ? revenue / orders : 0;

        const displayDate = formatBucketLabel(report.report_date, period);

        return [
          index + 1,
          displayDate,
          orders,
          formatMoney(revenue),
          Number(report.voided_orders || 0),
          report.top_selling_product || 'N/A',
          report.least_selling_product || 'N/A',
          formatMoney(aov),
        ];
      });

      const safeCashierFilter = String(filterCashier || 'ALL')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9\-_]/g, '')
        .toLowerCase();

      filename = `sales-report-${safeCashierFilter}-${format(new Date(), 'yyyy-MM-dd')}`;
    }

    const allRows = [
      ['VenDish Business Report'],
      [],
      ['Report Metadata'],
      ['Field', 'Value'],
      ...baseMetadata,
      [],
      ['Summary'],
      ['Metric', 'Value'],
      ...summaryRows,
      [],
      ['Detailed Records'],
      detailHeaders,
      ...detailRows,
    ];

    if (viewMode === 'timeline' && chartData.length > 0) {
      allRows.push([]);
      allRows.push(['Period Buckets']);
      allRows.push(['Bucket', 'Revenue (PHP)', 'Orders']);
      chartData.forEach((bucket) => {
        allRows.push([
          bucket.label,
          formatMoney(bucket.revenue),
          Number(bucket.orders || 0),
        ]);
      });
    }

    const csvContent = bom + allRows
      .map((row) => row.map(escapeCSV).join(','))
      .join('\n');

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

  // --- AXIS FORMATTER ---
  const formatAxisCurrency = (value) => {
    if (value >= 1000) {
      const formatted = Number.isInteger(value / 1000) 
        ? value / 1000 
        : (value / 1000).toFixed(1);
      return `₱${formatted}k`;
    }
    return `₱${value}`;
  };

  return (
    <div className="p-4 md:p-6 min-h-screen">
      
      {/* HEADER */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {viewMode === 'timeline' ? 'Financial Reports' : 'Staff Performance'}
          </h1>
          <p className="text-gray-600">
             {viewMode === 'timeline' 
                ? timelineSubtitle
                : 'Comparative sales analysis by staff member'}
          </p>
        </div>
        
        <div className="flex gap-2">
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
            <div className="flex flex-wrap gap-3 mb-6 relative">
                
                {/* CALENDAR TRIGGER AND POPOVER WRAPPER */}
                <div className="relative" ref={calendarRef}>
                    <button 
                        onClick={() => setShowCalendar(!showCalendar)} 
                        className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm transition-all ${showCalendar ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                        <CalendarDays size={18} className={showCalendar ? "text-blue-600" : "text-gray-600"}/>
                        <span className="font-medium text-gray-700">
                            {/* CHANGED: Shows Time as well on the button */}
                            {dateRange[0] && dateRange[1] && period === "Custom Range" 
                            ? `${format(dateRange[0], "MMM d, h:mma")} - ${format(dateRange[1], "MMM d, h:mma")}`
                            : "Select Date & Time"}
                        </span>
                    </button>

                    {/* NEW: DATETIME PICKER POPOVER */}
                    {showCalendar && (
                        <div className="absolute left-0 top-full mt-2 bg-white p-5 rounded-xl shadow-2xl border border-gray-100 z-50 min-w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
                            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Clock size={16}/> Set Date & Time Range
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start</label>
                                    <input 
                                        type="datetime-local" 
                                        value={dateRange[0] ? format(dateRange[0], "yyyy-MM-dd'T'HH:mm") : ""}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setDateRange([new Date(e.target.value), dateRange[1]]);
                                                setPeriod("Custom Range");
                                            }
                                        }}
                                        className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End</label>
                                    <input 
                                        type="datetime-local" 
                                        value={dateRange[1] ? format(dateRange[1], "yyyy-MM-dd'T'HH:mm") : ""}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setDateRange([dateRange[0], new Date(e.target.value)]);
                                                setPeriod("Custom Range");
                                            }
                                        }}
                                        className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                    />
                                </div>
                                <button 
                                    onClick={() => setShowCalendar(false)}
                                    className="w-full mt-2 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 transition"
                                >
                                    Apply Range
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                {periods.map(p => (
                    <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${period === p ? "bg-gray-800 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
                    {p}
                    </button>
                ))}
                </div>
            </div>

            {loading ? (
              <TimelineLoadingSkeleton />
            ) : (
              <>
              {/* WIDGETS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 font-medium text-sm">Total Revenue</h3>
                  <PhilippinePesoIcon className="text-blue-800" size={24} />
                </div>
                <p className="text-blue-800 font-bold text-3xl">₱ {stats.totalRev.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {filterCashier === 'ALL' ? 'Overall Revenue' : `Rev. by ${filterCashier}`}
                </p>
                </div>

                <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 font-medium text-sm">Total Orders</h3>
                  <ShoppingBag className="text-orange-500" size={24} />
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
                  {filterCashier === 'ALL' ? 'Most bought' : `Top item for ${filterCashier}`}
                </p>
                </div>

                <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-red-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 font-medium text-sm">Least Seller</h3>
                  <TrendingDown className="text-red-500" size={24} />
                </div>
                <p className="text-red-500 font-bold text-xl truncate">{stats.leastSellerName}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {filterCashier === 'ALL' ? 'Least bought' : `Least item for ${filterCashier}`}
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
                    <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#1e40af" radius={[4, 4, 0, 0]} />
                  </BarChart>
                  ) : chartType === "Line" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `₱ ${v.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1e40af" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                  ) : (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 12 }} />
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
                <table className="min-w-200 w-full">
                  <thead>
                  <tr className="bg-gray-800 text-white">
                    <th onClick={() => handleSort('report_date')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">{periodColumnTitle} {sortConfig.key === 'report_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('total_orders')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Orders {sortConfig.key === 'total_orders' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('total_revenue')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Revenue {sortConfig.key === 'total_revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('top_selling_product')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Top Seller {sortConfig.key === 'top_selling_product' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('least_selling_product')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Least Seller {sortConfig.key === 'least_selling_product' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th onClick={() => handleSort('voided_orders')} className="py-3 px-4 text-left font-semibold cursor-pointer text-sm">Voided {sortConfig.key === 'voided_orders' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  </tr>
                  </thead>
                  <tbody>
                  {sortedTableData.length > 0 ? sortedTableData.map((report) => (
                    <tr key={report.id || report.report_date} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{formatBucketLabel(report.report_date, period)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{report.total_orders}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-blue-700">₱ {parseFloat(report.total_revenue).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        {report.top_selling_product || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                        {report.least_selling_product || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-red-600">{parseFloat(report.voided_orders).toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-500">
                        No sales reports found.
                      </td>
                    </tr>
                  )}
                  </tbody>
                </table>
                </div>
              </div>
              </>
            )}
        </>
      )}

      {/* ========================== VIEW MODE: STAFF (ADMIN ONLY) ========================== */}
      {viewMode === 'staff' && isAdmin && (
        loading ? (
          <StaffLoadingSkeleton />
        ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                
                {/* CHART 1: REVENUE */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Staff</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={staffReports} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={formatAxisCurrency} />
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
        )
      )}

    </div>
  );
}