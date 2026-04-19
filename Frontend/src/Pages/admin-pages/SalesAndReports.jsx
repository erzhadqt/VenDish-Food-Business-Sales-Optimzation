import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import { 
  TrendingUp, TrendingDown, CalendarDays, 
  Download, RefreshCw, PhilippinePesoIcon, Users, BarChart3, Clock,
  ShoppingBag, Receipt, ScrollText,
  TicketPlusIcon,
  TicketPercentIcon,
  CalculatorIcon,
  Wallet
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, parseISO, 
  startOfWeek, endOfWeek, startOfYear, endOfYear, startOfDay, endOfDay,
  eachDayOfInterval, eachMonthOfInterval, eachYearOfInterval
} from "date-fns";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import api from '../../api'; 
import { Skeleton } from '../../Components/ui/skeleton';
import { applyQueryParam, usePersistedQueryState } from '../../utils/usePersistedQueryState';
import ProfitCalculatorModal from '../../Components/ProfitCalculatorModal';

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

const QUERY_TO_PERIOD_MAP = {
  custom: "Custom Range",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const VALID_SORT_KEYS = new Set([
  "report_date",
  "total_revenue",
  "total_orders",
  "top_selling_product",
  "least_selling_product",
  "voided_orders",
]);

const parseDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const moneyToCents = (value) => {
  const parsed = Number.parseFloat(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
};

const centsToMoney = (value) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return parsed / 100;
};

const parseReportBucketDate = (value, period) => {
  if (!value) return null;
  const strVal = String(value).trim();

  // If it's a pre-aggregated bucket, strip time to avoid local/UTC shifts 
  // ensuring the bucket date perfectly anchors to the local day
  if (["Daily", "Monthly", "Yearly", "Weekly"].includes(period)) {
    const dateMatch = strVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      return new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
    }
    const monthMatch = strVal.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      return new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
    }
    const yearMatch = strVal.match(/^(\d{4})$/);
    if (yearMatch) {
      return new Date(Number(yearMatch[1]), 0, 1);
    }
  }

  const parsedIso = parseISO(strVal);
  if (!Number.isNaN(parsedIso.getTime())) return parsedIso;

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const isDateWithinRange = (value, rangeStart, rangeEnd) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return false;
  if (rangeStart instanceof Date && !Number.isNaN(rangeStart.getTime()) && value < rangeStart) return false;
  if (rangeEnd instanceof Date && !Number.isNaN(rangeEnd.getTime()) && value > rangeEnd) return false;
  return true;
};

const getCurrentDecadeRange = (referenceDate = new Date()) => {
  const year = referenceDate.getFullYear();
  const decadeStartYear = Math.floor(year / 10) * 10;
  return {
    start: new Date(decadeStartYear, 0, 1, 0, 0, 0, 0),
    end: new Date(decadeStartYear + 9, 11, 31, 23, 59, 59, 999),
  };
};

const getSummaryRangeForPeriod = (selectedPeriod, selectedRange) => {
  const now = new Date();

  if (selectedPeriod === "Custom Range") {
    return {
      start: selectedRange?.[0] || null,
      end: selectedRange?.[1] || null,
    };
  }

  if (selectedPeriod === "Daily") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (selectedPeriod === "Weekly") {
    return { start: startOfWeek(now), end: endOfWeek(now) };
  }

  if (selectedPeriod === "Monthly") {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }

  if (selectedPeriod === "Yearly") {
    return { start: startOfYear(now), end: endOfYear(now) };
  }

  return { start: null, end: null };
};

const getChartWindowForPeriod = (selectedPeriod) => {
  const now = new Date();

  if (selectedPeriod === "Daily") {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }

  if (selectedPeriod === "Monthly") {
    return { start: startOfYear(now), end: endOfYear(now) };
  }

  if (selectedPeriod === "Yearly") {
    return getCurrentDecadeRange(now);
  }

  return { start: null, end: null };
};

const getRangeForPeriod = (selectedPeriod, selectedRange) => {
  const now = new Date();

  if (selectedPeriod === "Custom Range") {
    return {
      start: selectedRange?.[0] || null,
      end: selectedRange?.[1] || null,
    };
  }

  if (selectedPeriod === "Daily") {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }

  if (selectedPeriod === "Weekly") {
    return { start: startOfWeek(now), end: endOfWeek(now) };
  }

  if (selectedPeriod === "Monthly") {
    return { start: startOfYear(now), end: endOfYear(now) };
  }

  if (selectedPeriod === "Yearly") {
    return getCurrentDecadeRange(now);
  }

  return { start: null, end: null };
};

const formatBucketLabel = (bucketValue, selectedPeriod, compact = false) => {
  if (!bucketValue) return "N/A";

  const parsed = parseReportBucketDate(bucketValue, selectedPeriod);
  if (!parsed || Number.isNaN(parsed.getTime())) return String(bucketValue);

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

const TimelineLoadingSkeleton = ({ isAdmin = false }) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`stat-${index}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-start mb-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>

    <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4 mb-6`}>
      {Array.from({ length: isAdmin ? 3 : 2 }).map((_, index) => (
        <div key={`insight-${index}`} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${isAdmin && index === 2 ? 'sm:col-span-2' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>

    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
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
  </>
);

const StaffLoadingSkeleton = () => (
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100 space-y-3">
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [reports, setReports] = useState([]); 
  const [chartReports, setChartReports] = useState([]);
  const [staffReports, setStaffReports] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [cashierOptions, setCashierOptions] = useState([]); 
  const [filterCashier, setFilterCashier] = usePersistedQueryState({
    searchParams,
    queryKey: "cashier",
    storageKey: "salesReports_cashier",
    defaultValue: "ALL",
    parse: (rawValue, fallback) => rawValue || fallback,
  });

  const [showNetRevenue] = useState(false);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [profitLogNotice, setProfitLogNotice] = useState('');
  const [drawerLogNotice, setDrawerLogNotice] = useState('');

  const [viewMode, setViewMode] = usePersistedQueryState({
    searchParams,
    queryKey: "view",
    storageKey: "salesReports_view",
    defaultValue: "timeline",
    parse: (rawValue) => (rawValue === "staff" ? "staff" : "timeline"),
  });
  const [isAdmin, setIsAdmin] = useState(false);

  const [dateRange, setDateRange] = useState(() => {
    const urlStart = parseDateValue(searchParams.get("start"));
    const urlEnd = parseDateValue(searchParams.get("end"));

    const storedStart = parseDateValue(localStorage.getItem("salesReports_start"));
    const storedEnd = parseDateValue(localStorage.getItem("salesReports_end"));

    const start = urlStart || storedStart || startOfDay(new Date());
    const end = urlEnd || storedEnd || endOfDay(new Date());
    return [start, end];
  });

  const [period, setPeriod] = usePersistedQueryState({
    searchParams,
    queryKey: "period",
    storageKey: "salesReports_period",
    defaultValue: "Custom Range",
    parse: (rawValue) => {
      const normalizedValue = QUERY_TO_PERIOD_MAP[rawValue] || rawValue;
      return periods.includes(normalizedValue) ? normalizedValue : "Custom Range";
    },
  });

  const [chartType, setChartType] = usePersistedQueryState({
    searchParams,
    queryKey: "chart",
    storageKey: "salesReports_chart",
    defaultValue: "Bar",
    parse: (rawValue) => (chartTypes.includes(rawValue) ? rawValue : "Bar"),
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [sortConfig, setSortConfig] = useState(() => {
    const keyCandidate = searchParams.get("sortKey") ?? localStorage.getItem("salesReports_sortKey") ?? "report_date";
    const dirCandidate = searchParams.get("sortDir") ?? localStorage.getItem("salesReports_sortDir") ?? "desc";

    return {
      key: VALID_SORT_KEYS.has(keyCandidate) ? keyCandidate : "report_date",
      direction: dirCandidate === "asc" ? "asc" : "desc",
    };
  });

  const calendarRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("salesReports_sortKey", sortConfig.key);
    localStorage.setItem("salesReports_sortDir", sortConfig.direction);

    const [rangeStart, rangeEnd] = dateRange || [];
    const safeStart = rangeStart instanceof Date && !Number.isNaN(rangeStart.getTime()) ? rangeStart : null;
    const safeEnd = rangeEnd instanceof Date && !Number.isNaN(rangeEnd.getTime()) ? rangeEnd : null;

    localStorage.setItem("salesReports_start", safeStart ? safeStart.toISOString() : "");
    localStorage.setItem("salesReports_end", safeEnd ? safeEnd.toISOString() : "");

    const params = new URLSearchParams();
    applyQueryParam(params, "cashier", filterCashier, (value) => value === "ALL");
    applyQueryParam(params, "view", viewMode, (value) => value === "timeline");
    applyQueryParam(params, "period", PERIOD_QUERY_MAP[period] || "custom", (value) => value === "custom");
    applyQueryParam(params, "chart", chartType, (value) => value === "Bar");
    applyQueryParam(params, "sortKey", sortConfig.key, (value) => value === "report_date");
    applyQueryParam(params, "sortDir", sortConfig.direction, (value) => value === "desc");
    applyQueryParam(params, "start", safeStart ? safeStart.toISOString() : "");
    applyQueryParam(params, "end", safeEnd ? safeEnd.toISOString() : "");

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [
    filterCashier,
    viewMode,
    period,
    chartType,
    sortConfig,
    dateRange,
    searchParams,
    setSearchParams,
  ]);

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

  const fetchReports = useCallback(async (cashierFilter, selectedPeriod, selectedRange) => {
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
        const chartParams = new URLSearchParams(params.toString());
        chartParams.set("period", "daily");
        const chartRes = await api.get(`/firstapp/sales/?${chartParams.toString()}`);
        nextChartReports = Array.isArray(chartRes.data) ? chartRes.data : [];
      }

      setChartReports(nextChartReports);

      if (isAdmin) {
          const { start: staffStart, end: staffEnd } = getSummaryRangeForPeriod(selectedPeriod, selectedRange);
          const staffParams = new URLSearchParams();
          if (cashierFilter !== "ALL") {
            staffParams.set("cashier", cashierFilter);
          }
          if (staffStart instanceof Date && !Number.isNaN(staffStart.getTime())) {
            staffParams.set("start", staffStart.toISOString());
          }
          if (staffEnd instanceof Date && !Number.isNaN(staffEnd.getTime())) {
            staffParams.set("end", staffEnd.toISOString());
          }

          const staffEndpoint = staffParams.toString()
            ? `/firstapp/sales/by-staff/?${staffParams.toString()}`
            : '/firstapp/sales/by-staff/';
          const staffRes = await api.get(staffEndpoint);
          setStaffReports(Array.isArray(staffRes.data) ? staffRes.data : []);

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
      } else {
          setStaffReports([]);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      setReports([]);
      setChartReports([]);
      setStaffReports([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchReports(filterCashier, period, dateRange);
  }, [fetchReports, filterCashier, period, dateRange]);

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

  useEffect(() => {
    if (!profitLogNotice) return undefined;

    const timeoutId = window.setTimeout(() => {
      setProfitLogNotice('');
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [profitLogNotice]);

  useEffect(() => {
    if (!drawerLogNotice) return undefined;

    const timeoutId = window.setTimeout(() => {
      setDrawerLogNotice('');
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [drawerLogNotice]);

  const filteredReports = useMemo(() => reports, [reports]);

  const summaryReports = useMemo(() => {
    if (!["Daily", "Monthly", "Yearly"].includes(period)) {
      return filteredReports;
    }

    const { start, end } = getSummaryRangeForPeriod(period, dateRange);
    return filteredReports.filter((report) => {
      const parsed = parseReportBucketDate(report?.report_date, period);
      return isDateWithinRange(parsed, start, end);
    });
  }, [filteredReports, period, dateRange]);

  const tableReports = useMemo(() => {
    if (!["Daily", "Monthly", "Yearly"].includes(period)) {
      return filteredReports.filter((report) => Number.parseFloat(report?.total_revenue || 0) > 0);
    }

    const { start, end } = getChartWindowForPeriod(period);
    return filteredReports.filter((report) => {
      const parsed = parseReportBucketDate(report?.report_date, period);
      if (!isDateWithinRange(parsed, start, end)) {
        return false;
      }
      return Number.parseFloat(report?.total_revenue || 0) > 0;
    });
  }, [filteredReports, period]);

  const chartData = useMemo(() => {
    const getVal = (val) => parseFloat(val || 0);

    if (period === "Daily") {
      const { start, end } = getChartWindowForPeriod("Daily");
      if (!(start instanceof Date) || !(end instanceof Date)) return [];

      const byDay = new Map();
      chartReports.forEach((report) => {
        if (!report?.report_date) return;
        const parsed = parseReportBucketDate(report.report_date, period);
        if (!parsed) return;
        const key = format(parsed, "yyyy-MM-dd");
        const current = byDay.get(key) || { revenue: 0, orders: 0 };
        byDay.set(key, {
          ...report,
          revenue: current.revenue + getVal(report.total_revenue),
          orders: current.orders + Number(report.total_orders || 0),
        });
      });

      return eachDayOfInterval({ start, end }).map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const report = byDay.get(key);
        return {
          label: format(day, "MMM d"),
          revenue: report ? report.revenue : 0,
          orders: report ? report.orders : 0,
        };
      });
    }

    if (period === "Monthly") {
      const { start, end } = getChartWindowForPeriod("Monthly");
      if (!(start instanceof Date) || !(end instanceof Date)) return [];

      const byMonth = new Map();
      chartReports.forEach((report) => {
        if (!report?.report_date) return;
        const parsed = parseReportBucketDate(report.report_date, period);
        if (!parsed) return;
        const key = format(parsed, "yyyy-MM");
        const current = byMonth.get(key) || { revenue: 0, orders: 0 };
        byMonth.set(key, {
          ...report,
          revenue: current.revenue + getVal(report.total_revenue),
          orders: current.orders + Number(report.total_orders || 0),
        });
      });

      return eachMonthOfInterval({ start, end }).map((month) => {
        const key = format(month, "yyyy-MM");
        const report = byMonth.get(key);
        return {
          label: format(month, "MMM yyyy"),
          revenue: report ? report.revenue : 0,
          orders: report ? report.orders : 0,
        };
      });
    }

    if (period === "Yearly") {
      const { start, end } = getChartWindowForPeriod("Yearly");
      if (!(start instanceof Date) || !(end instanceof Date)) return [];

      const byYear = new Map();
      chartReports.forEach((report) => {
        if (!report?.report_date) return;
        const parsed = parseReportBucketDate(report.report_date, period);
        if (!parsed) return;
        const key = format(parsed, "yyyy");
        const current = byYear.get(key) || { revenue: 0, orders: 0 };
        byYear.set(key, {
          ...report,
          revenue: current.revenue + getVal(report.total_revenue),
          orders: current.orders + Number(report.total_orders || 0),
        });
      });

      return eachYearOfInterval({ start, end }).map((year) => {
        const key = format(year, "yyyy");
        const report = byYear.get(key);
        return {
          label: format(year, "yyyy"),
          revenue: report ? report.revenue : 0,
          orders: report ? report.orders : 0,
        };
      });
    }

    if (period === "Weekly") {
      const { start, end } = getRangeForPeriod("Weekly", dateRange);
      if (!(start instanceof Date) || !(end instanceof Date)) return [];

      const byDay = new Map();
      chartReports.forEach((report) => {
        if (!report?.report_date) return;
        const parsed = parseReportBucketDate(report.report_date, period);
        if (!parsed || Number.isNaN(parsed.getTime())) return;

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

    const sortByReportDate = (data) => {
      return [...data].sort((a, b) => {
        const aTime = Date.parse(a?.report_date || "");
        const bTime = Date.parse(b?.report_date || "");
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
          return aTime - bTime;
        }
        return String(a?.report_date || "").localeCompare(String(b?.report_date || ""));
      });
    };

    return sortByReportDate(chartReports)
      .filter(report => getVal(report.total_revenue) > 0)
      .map((report) => ({
        label: formatBucketLabel(report.report_date, period, true),
        revenue: getVal(report.total_revenue),
        orders: Number(report.total_orders || 0),
      }));
  }, [chartReports, period, dateRange]);

  const stats = useMemo(() => {
    const totalRev = centsToMoney(
      summaryReports.reduce((acc, curr) => acc + moneyToCents(curr.total_revenue), 0)
    );
    const totalOrders = summaryReports.reduce((acc, curr) => acc + (curr.total_orders || 0), 0);
    const totalVat = centsToMoney(
      summaryReports.reduce((acc, curr) => acc + moneyToCents(curr.total_vat), 0)
    );
    const totalDiscount = centsToMoney(
      summaryReports.reduce((acc, curr) => acc + moneyToCents(curr.total_discount), 0)
    );
    
    const productTotals = {};
    summaryReports.forEach((r) => {
      const qtyMap = r?.daily_product_sales;
      const revenueMap = r?.daily_product_sales_revenue;
      const orderMap = r?.daily_product_order_counts;

      const productNames = new Set([
        ...Object.keys(qtyMap && typeof qtyMap === "object" ? qtyMap : {}),
        ...Object.keys(revenueMap && typeof revenueMap === "object" ? revenueMap : {}),
        ...Object.keys(orderMap && typeof orderMap === "object" ? orderMap : {}),
      ]);

      productNames.forEach((productName) => {
        const safeName = String(productName || "").trim();
        if (!safeName) return;

        const quantity = Number(qtyMap?.[productName] || 0);
        const revenue = Number(revenueMap?.[productName] || 0);
        const orders = Number(orderMap?.[productName] || 0);

        const current = productTotals[safeName] || { qty: 0, revenue: 0, orders: 0 };
        if (Number.isFinite(quantity) && quantity > 0) current.qty += quantity;
        if (Number.isFinite(revenue) && revenue > 0) current.revenue += revenue;
        if (Number.isFinite(orders) && orders > 0) current.orders += orders;

        if (current.qty > 0 || current.revenue > 0 || current.orders > 0) {
          productTotals[safeName] = current;
        }
      });
    });

    let topSellerName = "N/A";
    let leastSellerName = "N/A";
    const productTotalEntries = Object.entries(productTotals);
    if (productTotalEntries.length > 0) {
      const rankedByBestSellerPolicy = [...productTotalEntries].sort((a, b) => {
        const revenueDiff = Number(b[1]?.revenue || 0) - Number(a[1]?.revenue || 0);
        if (revenueDiff !== 0) return revenueDiff;

        const orderDiff = Number(b[1]?.orders || 0) - Number(a[1]?.orders || 0);
        if (orderDiff !== 0) return orderDiff;

        const qtyDiff = Number(b[1]?.qty || 0) - Number(a[1]?.qty || 0);
        if (qtyDiff !== 0) return qtyDiff;

        return a[0].localeCompare(b[0]);
      });

      topSellerName = rankedByBestSellerPolicy[0][0];

      const rankedLeastSeller = [...productTotalEntries].sort((a, b) => {
        const qtyDiff = Number(a[1]?.qty || 0) - Number(b[1]?.qty || 0);
        if (qtyDiff !== 0) return qtyDiff;

        const revenueDiff = Number(a[1]?.revenue || 0) - Number(b[1]?.revenue || 0);
        if (revenueDiff !== 0) return revenueDiff;

        return a[0].localeCompare(b[0]);
      });

      leastSellerName = rankedLeastSeller[0][0];
    } else {
      const topSellers = {};
      const leastSellers = {};
      summaryReports.forEach((r) => {
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

    return { totalRev, totalOrders, totalVat, totalDiscount, topSellerName, leastSellerName };
  }, [summaryReports]);

  const revenueCardStats = useMemo(() => {
    const totalRevenue = centsToMoney(
      summaryReports.reduce((acc, curr) => acc + moneyToCents(curr.total_revenue), 0)
    );
    const totalVat = centsToMoney(
      summaryReports.reduce((acc, curr) => acc + moneyToCents(curr.total_vat), 0)
    );

    return { totalRevenue, totalVat };
  }, [summaryReports]);

  const topCashier = useMemo(() => {
    if (!isAdmin || !Array.isArray(staffReports) || staffReports.length === 0) {
      return null;
    }

    const rankedStaff = staffReports
      .map((staff) => ({
        name: String(staff?.name || "N/A"),
        revenue: Number.parseFloat(staff?.revenue || 0),
        orders: Number(staff?.orders || 0),
      }))
      .filter((staff) => Number.isFinite(staff.revenue) && Number.isFinite(staff.orders))
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        if (b.orders !== a.orders) return b.orders - a.orders;
        return a.name.localeCompare(b.name);
      });

    return rankedStaff[0] || null;
  }, [isAdmin, staffReports]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedTableData = [...tableReports].sort((a, b) => {
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

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VenDish System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet(viewMode === 'staff' ? 'Staff Performance' : 'Sales Report');

    const titleFont = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1F2937' } };
    const subtitleFont = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF4B5563' } };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    const headerFont = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };

    const titleRow = worksheet.addRow(['VenDish Business Report']);
    titleRow.getCell(1).font = titleFont;
    worksheet.mergeCells('A1:E1');
    worksheet.addRow([]);

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    const metadata = [
      ['Report View', viewMode === 'staff' ? 'Staff Performance' : 'Sales Timeline'],
      ['Generated At', format(new Date(), 'MMM d, yyyy HH:mm:ss')],
      ['Selected Period', period],
      ['Timezone', timezone],
    ];

    worksheet.addRow(['Report Information']).getCell(1).font = subtitleFont;
    metadata.forEach(row => {
      const addedRow = worksheet.addRow(row);
      addedRow.getCell(1).font = { bold: true };
    });
    worksheet.addRow([]); 

    let filename = '';
    const formatMoney = (val) => Number.parseFloat(val || 0);

    worksheet.addRow(['Performance Summary']).getCell(1).font = subtitleFont;

    if (viewMode === 'staff') {
      const rankedStaff = [...staffReports].sort((a, b) => Number.parseFloat(b.revenue || 0) - Number.parseFloat(a.revenue || 0));
      const totalStaffRevenue = rankedStaff.reduce((sum, row) => sum + Number.parseFloat(row.revenue || 0), 0);
      const totalStaffOrders = rankedStaff.reduce((sum, row) => sum + Number(row.orders || 0), 0);
      const overallAov = totalStaffOrders > 0 ? totalStaffRevenue / totalStaffOrders : 0;
      const topStaff = rankedStaff[0]?.name || 'N/A';

      const summaryRows = [
        ['Total Staff Members', rankedStaff.length],
        ['Total Orders', totalStaffOrders],
        ['Total Revenue', totalStaffRevenue],
        ['Average Order Value', overallAov],
        ['Top Performer', topStaff],
      ];

      summaryRows.forEach(row => {
        const addedRow = worksheet.addRow(row);
        addedRow.getCell(1).font = { bold: true };
        if (typeof row[1] === 'number' && (row[0].includes('Revenue') || row[0].includes('Value'))) {
          addedRow.getCell(2).numFmt = '₱#,##0.00';
        }
      });
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Rank', 'Staff Name', 'Total Orders', 'Total Revenue', 'Avg Order Value', 'Revenue Share', 'Order Share']);
      headerRow.eachCell(cell => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center' };
        cell.border = borderStyle;
      });

      rankedStaff.forEach((staff, index) => {
        const revenue = Number.parseFloat(staff.revenue || 0);
        const orders = Number(staff.orders || 0);
        const aov = orders > 0 ? revenue / orders : 0;
        const revenueShare = totalStaffRevenue > 0 ? (revenue / totalStaffRevenue) : 0;
        const orderShare = totalStaffOrders > 0 ? (orders / totalStaffOrders) : 0;

        const row = worksheet.addRow([
          index + 1,
          staff.name || 'N/A',
          orders,
          revenue,
          aov,
          revenueShare,
          orderShare
        ]);

        row.eachCell(cell => { cell.border = borderStyle; });
        row.getCell(4).numFmt = '₱#,##0.00'; 
        row.getCell(5).numFmt = '₱#,##0.00'; 
        row.getCell(6).numFmt = '0.00%';     
        row.getCell(7).numFmt = '0.00%';     
      });

      filename = `staff-performance-${format(new Date(), 'yyyy-MM-dd')}`;
    } else {
      const totalVoidedOrders = summaryReports.reduce((sum, row) => sum + Number(row.voided_orders || 0), 0);
      const averageOrderValue = stats.totalOrders > 0 ? stats.totalRev / stats.totalOrders : 0;
      
      const summaryRows = [
        ['Cashier Filter', filterCashier],
        ['Total Orders', stats.totalOrders],
        ['Total Revenue', stats.totalRev],
        ['Total VAT', stats.totalVat],
        ['Total Discount Used', stats.totalDiscount],
        ['Total Voided Orders', totalVoidedOrders],
        ['Average Order Value', averageOrderValue],
        ['Top Cashier', topCashier?.name || 'N/A'],
        ['Top Cashier Revenue', topCashier?.revenue || 0],
        ['Top Cashier Orders', topCashier?.orders || 0],
        ['Top Selling Product', stats.topSellerName || 'N/A'],
        ['Least Selling Product', stats.leastSellerName || 'N/A'],
      ];

      summaryRows.forEach(row => {
        const addedRow = worksheet.addRow(row);
        addedRow.getCell(1).font = { bold: true };
        if (typeof row[1] === 'number' && (row[0].includes('Revenue') || row[0].includes('VAT') || row[0].includes('Discount') || row[0].includes('Value'))) {
          addedRow.getCell(2).numFmt = '₱#,##0.00';
        }
      });
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['No.', periodColumnTitle, 'Orders', 'Revenue', 'VAT', 'Discount', 'Voided', 'Top Seller', 'Least Seller', 'Avg Order Value']);
      headerRow.eachCell(cell => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center' };
        cell.border = borderStyle;
      });

      sortedTableData.forEach((report, index) => {
        const revenue = formatMoney(report.total_revenue);
        const orders = Number(report.total_orders || 0);
        const vat = formatMoney(report.total_vat);
        const discount = formatMoney(report.total_discount);
        const aov = orders > 0 ? revenue / orders : 0;
        const displayDate = formatBucketLabel(report.report_date, period);

        const row = worksheet.addRow([
          index + 1,
          displayDate,
          orders,
          revenue,
          vat,
          discount,
          Number(report.voided_orders || 0),
          report.top_selling_product || 'N/A',
          report.least_selling_product || 'N/A',
          aov
        ]);

        row.eachCell(cell => { cell.border = borderStyle; });
        row.getCell(4).numFmt = '₱#,##0.00';
        row.getCell(5).numFmt = '₱#,##0.00';
        row.getCell(6).numFmt = '₱#,##0.00';
        row.getCell(10).numFmt = '₱#,##0.00';
      });

      const safeCashierFilter = String(filterCashier || 'ALL').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '').toLowerCase();
      filename = `sales-report-${safeCashierFilter}-${format(new Date(), 'yyyy-MM-dd')}`;
    }

    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        if(cell.row === 1) return; 
        let columnLength = cell.value ? cell.value.toString().length : 10;
        if (cell.type === ExcelJS.ValueType.Number && cell.numFmt) {
           columnLength += 5; 
        }
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 12 ? 12 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
  };

  const formatAxisCurrency = (value) => {
    if (value >= 1000) {
      const formatted = Number.isInteger(value / 1000) 
        ? value / 1000 
        : (value / 1000).toFixed(1);
      return `₱${formatted}k`;
    }
    return `₱${value}`;
  };

  const handleProfitSaved = useCallback((savedLog) => {
    const label = savedLog?.period_label || period;
    setProfitLogNotice(`Profit log saved for ${label}.`);
  }, [period]);

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
              onClick={() => setIsProfitModalOpen(true)}
              disabled={viewMode !== 'timeline' || loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
            >
              <CalculatorIcon size={18} /> Get Profit
            </button>

           <button 
                onClick={refreshToday} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                {loading ? "Syncing..." : "Sync"}
            </button>

            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all text-green-700 hover:text-green-800 hover:border-green-600">
                <Download size={18} />
                Export Excel
            </button>
        </div>
      </div>

      {profitLogNotice && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-medium">
          {profitLogNotice}
        </div>
      )}

      {drawerLogNotice && (
        <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 font-medium">
          {drawerLogNotice}
        </div>
      )}

      {/* ========================== VIEW MODE: TIMELINE ========================== */}
      {viewMode === 'timeline' && (
        <>
            {/* CONTROLS */}
            <div className="flex flex-wrap gap-3 mb-6 relative">
                <div className="relative" ref={calendarRef}>
                    <button 
                        onClick={() => setShowCalendar(!showCalendar)} 
                        className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm transition-all ${showCalendar ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                        <CalendarDays size={18} className={showCalendar ? "text-blue-600" : "text-gray-600"}/>
                        <span className="font-medium text-gray-700">
                            {dateRange[0] && dateRange[1] && period === "Custom Range" 
                            ? `${format(dateRange[0], "MMM d, h:mma")} - ${format(dateRange[1], "MMM d, h:mma")}`
                            : "Select Date & Time"}
                        </span>
                    </button>

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
              <TimelineLoadingSkeleton isAdmin={isAdmin} />
            ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                
                {/* Revenue Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-gray-500 font-medium text-sm">Total Revenue</h3>
                      </div>
                      <p className="text-gray-900 font-bold text-2xl lg:text-3xl tracking-tight mt-1">
                        ₱ {(showNetRevenue ? revenueCardStats.totalRevenue - revenueCardStats.totalVat : revenueCardStats.totalRevenue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </p>
                    </div>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                      <PhilippinePesoIcon size={22} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    {filterCashier === 'ALL'
                      ? period === 'Daily'
                        ? (showNetRevenue ? 'Today revenue without VAT' : 'Today revenue collected')
                        : period === 'Monthly'
                          ? (showNetRevenue ? 'This month revenue without VAT' : 'This month revenue collected')
                          : period === 'Yearly'
                            ? (showNetRevenue ? 'This year revenue without VAT' : 'This year revenue collected')
                            : (showNetRevenue ? 'Raw revenue without VAT' : 'Overall revenue collected')
                      : period === 'Daily'
                        ? `Today revenue by ${filterCashier}`
                        : period === 'Monthly'
                          ? `This month revenue by ${filterCashier}`
                          : period === 'Yearly'
                            ? `This year revenue by ${filterCashier}`
                            : `Revenue by ${filterCashier}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Rev without VAT: <span className="text-black ">₱ {(revenueCardStats.totalRevenue - revenueCardStats.totalVat).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></p>
                </div>

                {/* Orders Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-gray-500 font-medium text-sm">Total Orders</h3>
                      <p className="text-gray-900 font-bold text-2xl lg:text-3xl tracking-tight mt-1">
                        {stats.totalOrders}
                      </p>
                    </div>
                    <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                      <ShoppingBag size={22} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    {filterCashier === 'ALL' ? 'Overall successful orders' : `Orders by ${filterCashier}`}
                  </p>
                </div>

                {/* VAT Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-gray-500 font-medium text-sm">Total VAT</h3>
                      <p className="text-gray-900 font-bold text-2xl lg:text-3xl tracking-tight mt-1">
                        ₱ {stats.totalVat.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </p>
                    </div>
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-lg shrink-0">
                      <ScrollText size={22} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Total VAT (12%) collected</p>
                </div>

                {/* Discount Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-gray-500 font-medium text-sm">Total Discount</h3>
                      <p className="text-gray-900 font-bold text-2xl lg:text-3xl tracking-tight mt-1">
                        ₱ {stats.totalDiscount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </p>
                    </div>
                    <div className="p-2.5 bg-green-50 text-green-600 rounded-lg shrink-0">
                      <TicketPercentIcon size={22} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Value of discounts applied</p>
                </div>
              </div>

              {/* Insights Widgets */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4 mb-6`}>
                
                {/* Top Seller Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 pr-4">
                      <h3 className="text-gray-500 font-medium text-sm">Top Seller</h3>
                      <p className="text-gray-900 font-bold text-lg lg:text-xl truncate mt-1" title={stats.topSellerName}>
                        {stats.topSellerName}
                      </p>
                    </div>
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                      <TrendingUp size={22} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    {filterCashier === 'ALL' ? 'Most frequently bought' : `Top item for ${filterCashier}`}
                  </p>
                </div>

                {/* Least Seller Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 pr-4">
                      <h3 className="text-gray-500 font-medium text-sm">Least Seller</h3>
                      <p className="text-gray-900 font-bold text-lg lg:text-xl truncate mt-1" title={stats.leastSellerName}>
                        {stats.leastSellerName}
                      </p>
                    </div>
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                      <TrendingDown size={22} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    {filterCashier === 'ALL' ? 'Least frequently bought' : `Least item for ${filterCashier}`}
                  </p>
                </div>

                {/* Top Cashier Hero Card (Admin Only) */}
                {isAdmin && (
                  <div className="bg-linear-to-br from-indigo-600 to-blue-700 rounded-xl shadow-sm border border-indigo-500 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden sm:col-span-2 text-white group">
                    <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none transition-transform duration-500 group-hover:scale-110">
                      <Users size={120} />
                    </div>
                    
                    <div className="flex items-start justify-between mb-2 relative z-10">
                      <div className="min-w-0 pr-4">
                        <h3 className="text-indigo-100 font-medium text-xs uppercase tracking-wider">Top Performing Cashier</h3>
                        <p className="text-white font-bold text-2xl lg:text-3xl truncate mt-1 drop-shadow-sm" title={topCashier?.name || 'N/A'}>
                          {topCashier?.name || 'N/A'}
                        </p>
                      </div>
                      <div className="p-2.5 bg-white/20 rounded-lg shrink-0 backdrop-blur-sm">
                        <Users size={22} className="text-white" />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4 relative z-10">
                      <div>
                        <p className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Generated Revenue</p>
                        <p className="font-semibold text-lg drop-shadow-sm">
                          ₱ {(topCashier?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-white/20"></div>
                      <div>
                        <p className="text-indigo-200 text-xs uppercase tracking-wider mb-1">Total Orders</p>
                        <p className="font-semibold text-lg drop-shadow-sm">
                          {(topCashier?.orders || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CHARTS */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                <div className="overflow-x-auto">
                <table className="min-w-200 w-full">
                  <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-700">
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
                    <tr key={report.id || report.report_date} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{formatBucketLabel(report.report_date, period)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{report.total_orders}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-blue-700">₱ {parseFloat(report.total_revenue).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-xs font-medium border border-purple-100">
                        {report.top_selling_product || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-xs font-medium border border-rose-100">
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
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full">
                  <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-700">
                          <th className="py-3 px-4 text-left text-sm font-semibold">Staff Name</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold">Total Orders</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold">Total Revenue</th>
                      </tr>
                  </thead>
                  <tbody>
                      {staffReports.length > 0 ? staffReports.map((staff, idx) => (
                          <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
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

      <ProfitCalculatorModal
        open={isProfitModalOpen}
        onOpenChange={setIsProfitModalOpen}
        period={period}
        totalRevenue={stats.totalRev}
        onSaved={handleProfitSaved}
      />

    </div>
  );
}