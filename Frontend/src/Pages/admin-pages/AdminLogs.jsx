import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  FileClock,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  UserCheck
} from 'lucide-react';

import api from '../../api';
import { Button } from '../../Components/ui/button';
import { Skeleton } from '../../Components/ui/skeleton';
import { applyQueryParam, usePersistedQueryState } from '../../utils/usePersistedQueryState';

const rowsPerPage = 8;
const tabs = ['profit', 'drawer'];

const PERIOD_OPTIONS = ['ALL', 'CUSTOM', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const PERIOD_LABEL_MAP = {
  ALL: 'All Periods',
  CUSTOM: 'Custom Range',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

const VALID_SORT_KEYS = new Set([
  'created_at',
  'period',
  'created_by_name',
  'revenue',
  'expenses',
  'net_profit',
]);

const DRAWER_VALID_SORT_KEYS = new Set([
  'created_at',
  'opening_balance',
  'today_sales_total',
  'projected_total',
  'cashier_name',
  'created_by_name',
]);

const parsePositivePage = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const formatCurrency = (value) => {
  const parsed = Number(value || 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
};

const formatDateTime = (dateValue) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return parsed.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPeriodLabel = (entry) => {
  const periodCode = String(entry?.period || '').toUpperCase();
  return entry?.period_label || PERIOD_LABEL_MAP[periodCode] || periodCode || 'N/A';
};

const getPeriodBadgeClass = (periodCode) => {
  switch (String(periodCode || '').toUpperCase()) {
    case 'DAILY':
      return 'bg-blue-50 text-blue-700 border border-blue-200/60';
    case 'WEEKLY':
      return 'bg-purple-50 text-purple-700 border border-purple-200/60';
    case 'MONTHLY':
      return 'bg-amber-50 text-amber-700 border border-amber-200/60';
    case 'YEARLY':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200/60';
  }
};

const extractErrorMessage = (error) => {
  const detail = error?.response?.data;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (detail && typeof detail === 'object') {
    if (typeof detail.error === 'string' && detail.error.trim()) {
      return detail.error;
    }

    if (typeof detail.detail === 'string' && detail.detail.trim()) {
      return detail.detail;
    }

    const firstEntry = Object.values(detail)[0];
    if (Array.isArray(firstEntry) && firstEntry.length > 0) {
      return String(firstEntry[0]);
    }

    if (typeof firstEntry === 'string' && firstEntry.trim()) {
      return firstEntry;
    }
  }

  return 'Failed to load admin profit logs.';
};

const sortArrow = (targetKey, currentKey, currentDirection) => {
  if (targetKey !== currentKey) return null;
  return (
    <span className="inline-block ml-1 text-gray-400">
      {currentDirection === 'asc' ? '↑' : '↓'}
    </span>
  );
};

const AdminLogs = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = usePersistedQueryState({
    searchParams,
    queryKey: 'tab',
    storageKey: 'adminLogs_tab',
    defaultValue: 'profit',
    parse: (rawValue) => (tabs.includes(rawValue) ? rawValue : 'profit'),
  });

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerLogs, setDrawerLogs] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(true);
  const [drawerError, setDrawerError] = useState('');

  const [currentPage, setCurrentPage] = usePersistedQueryState({
    searchParams,
    queryKey: 'page',
    storageKey: 'profitLogs_page',
    defaultValue: 1,
    parse: (rawValue, fallback) => parsePositivePage(rawValue, fallback),
    serialize: (value) => String(value),
  });

  const [periodFilter, setPeriodFilter] = usePersistedQueryState({
    searchParams,
    queryKey: 'period',
    storageKey: 'profitLogs_period',
    defaultValue: 'ALL',
    parse: (rawValue) => {
      const normalized = String(rawValue || '').toUpperCase();
      return PERIOD_OPTIONS.includes(normalized) ? normalized : 'ALL';
    },
  });

  const [sortKey, setSortKey] = usePersistedQueryState({
    searchParams,
    queryKey: 'sortKey',
    storageKey: 'profitLogs_sortKey',
    defaultValue: 'created_at',
    parse: (rawValue) => (VALID_SORT_KEYS.has(rawValue) ? rawValue : 'created_at'),
  });

  const [sortDirection, setSortDirection] = usePersistedQueryState({
    searchParams,
    queryKey: 'sortDir',
    storageKey: 'profitLogs_sortDir',
    defaultValue: 'desc',
    parse: (rawValue) => (rawValue === 'asc' ? 'asc' : 'desc'),
  });

  const [drawerCurrentPage, setDrawerCurrentPage] = usePersistedQueryState({
    searchParams,
    queryKey: 'drawerPage',
    storageKey: 'drawerLogs_page',
    defaultValue: 1,
    parse: (rawValue, fallback) => parsePositivePage(rawValue, fallback),
    serialize: (value) => String(value),
  });

  const [drawerSortKey, setDrawerSortKey] = usePersistedQueryState({
    searchParams,
    queryKey: 'drawerSortKey',
    storageKey: 'drawerLogs_sortKey',
    defaultValue: 'created_at',
    parse: (rawValue) => (DRAWER_VALID_SORT_KEYS.has(rawValue) ? rawValue : 'created_at'),
  });

  const [drawerSortDirection, setDrawerSortDirection] = usePersistedQueryState({
    searchParams,
    queryKey: 'drawerSortDir',
    storageKey: 'drawerLogs_sortDir',
    defaultValue: 'desc',
    parse: (rawValue) => (rawValue === 'asc' ? 'asc' : 'desc'),
  });

  useEffect(() => {
    const nextParams = new URLSearchParams();
    applyQueryParam(nextParams, 'tab', activeTab, (value) => value === 'profit');
    applyQueryParam(nextParams, 'period', periodFilter, (value) => value === 'ALL');
    applyQueryParam(nextParams, 'sortKey', sortKey, (value) => value === 'created_at');
    applyQueryParam(nextParams, 'sortDir', sortDirection, (value) => value === 'desc');
    applyQueryParam(nextParams, 'page', currentPage, (value) => Number(value) <= 1);
    applyQueryParam(nextParams, 'drawerSortKey', drawerSortKey, (value) => value === 'created_at');
    applyQueryParam(nextParams, 'drawerSortDir', drawerSortDirection, (value) => value === 'desc');
    applyQueryParam(nextParams, 'drawerPage', drawerCurrentPage, (value) => Number(value) <= 1);

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    activeTab,
    currentPage,
    periodFilter,
    sortDirection,
    sortKey,
    drawerCurrentPage,
    drawerSortKey,
    drawerSortDirection,
    searchParams,
    setSearchParams,
  ]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (periodFilter !== 'ALL') {
        params.set('period', periodFilter);
      }
      const endpoint = params.toString()
        ? `/firstapp/profit-logs/?${params.toString()}`
        : '/firstapp/profit-logs/';
      const response = await api.get(endpoint);
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      setLogs([]);
      setError(extractErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  };

  const fetchDrawerLogs = async () => {
    setDrawerLoading(true);
    setDrawerError('');
    try {
      const response = await api.get('/firstapp/drawer-balance-logs/');
      setDrawerLogs(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      setDrawerLogs([]);
      setDrawerError(extractErrorMessage(fetchError));
    } finally {
      setDrawerLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter]);

  useEffect(() => {
    fetchDrawerLogs();
  }, []);

  const totalNetProfit = useMemo(() => {
    return logs.reduce((sum, entry) => sum + Number(entry?.net_profit || 0), 0);
  }, [logs]);

  const cashierSalesSummary = useMemo(() => {
    const summary = {};
    drawerLogs.forEach((log) => {
      const cashierName = log.cashier_name || 'Unknown';
      const sales = Number(log.today_sales_total || 0);
      
      if (!summary[cashierName]) {
        summary[cashierName] = 0;
      }
      summary[cashierName] += sales;
    });

    return Object.entries(summary)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [drawerLogs]);

  const sortedLogs = useMemo(() => {
    const nextLogs = [...logs];
    nextLogs.sort((a, b) => {
      let left = a?.[sortKey];
      let right = b?.[sortKey];

      if (sortKey === 'created_at') {
        const leftDate = Date.parse(left || '');
        const rightDate = Date.parse(right || '');
        left = Number.isNaN(leftDate) ? 0 : leftDate;
        right = Number.isNaN(rightDate) ? 0 : rightDate;
      }

      if (['revenue', 'expenses', 'net_profit'].includes(sortKey)) {
        left = Number(left || 0);
        right = Number(right || 0);
      }

      if (sortKey === 'period') {
        left = getPeriodLabel(a).toLowerCase();
        right = getPeriodLabel(b).toLowerCase();
      }

      if (sortKey === 'created_by_name') {
        left = String(a?.created_by_name || '').toLowerCase();
        right = String(b?.created_by_name || '').toLowerCase();
      }

      if (left < right) return sortDirection === 'asc' ? -1 : 1;
      if (left > right) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return nextLogs;
  }, [logs, sortDirection, sortKey]);

  const sortedDrawerLogs = useMemo(() => {
    const nextLogs = [...drawerLogs];
    nextLogs.sort((a, b) => {
      let left = a?.[drawerSortKey];
      let right = b?.[drawerSortKey];

      if (drawerSortKey === 'created_at') {
        const leftDate = Date.parse(left || '');
        const rightDate = Date.parse(right || '');
        left = Number.isNaN(leftDate) ? 0 : leftDate;
        right = Number.isNaN(rightDate) ? 0 : rightDate;
      }

      if (['opening_balance', 'today_sales_total', 'projected_total'].includes(drawerSortKey)) {
        left = Number(left || 0);
        right = Number(right || 0);
      }

      if (drawerSortKey === 'created_by_name') {
        left = String(a?.created_by_name || '').toLowerCase();
        right = String(b?.created_by_name || '').toLowerCase();
      }

      if (drawerSortKey === 'cashier_name') {
        left = String(a?.cashier_name || '').toLowerCase();
        right = String(b?.cashier_name || '').toLowerCase();
      }

      if (left < right) return drawerSortDirection === 'asc' ? -1 : 1;
      if (left > right) return drawerSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return nextLogs;
  }, [drawerLogs, drawerSortDirection, drawerSortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / rowsPerPage));
  const drawerTotalPages = Math.max(1, Math.ceil(sortedDrawerLogs.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  useEffect(() => {
    if (drawerCurrentPage > drawerTotalPages) {
      setDrawerCurrentPage(drawerTotalPages);
    }
  }, [drawerCurrentPage, drawerTotalPages, setDrawerCurrentPage]);

  const validCurrentPage = Math.min(currentPage, totalPages);
  const validDrawerCurrentPage = Math.min(drawerCurrentPage, drawerTotalPages);

  const paginatedLogs = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedLogs.slice(startIndex, endIndex);
  }, [sortedLogs, validCurrentPage]);

  const paginatedDrawerLogs = useMemo(() => {
    const startIndex = (validDrawerCurrentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedDrawerLogs.slice(startIndex, endIndex);
  }, [sortedDrawerLogs, validDrawerCurrentPage]);

  const handlePageChange = (nextPage) => {
    setCurrentPage(Math.min(totalPages, Math.max(1, nextPage)));
  };

  const handleDrawerPageChange = (nextPage) => {
    setDrawerCurrentPage(Math.min(drawerTotalPages, Math.max(1, nextPage)));
  };

  const handleSort = (key) => {
    if (!VALID_SORT_KEYS.has(key)) return;
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const handleDrawerSort = (key) => {
    if (!DRAWER_VALID_SORT_KEYS.has(key)) return;
    if (drawerSortKey === key) {
      setDrawerSortDirection(drawerSortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    setDrawerSortKey(key);
    setDrawerSortDirection('asc');
  };

  return (
    <div className="w-full min-h-screen bg-gray-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                <FileClock size={24} />
              </div>
              Admin Logs
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Monitor business performance and cashier drawer activities.</p>
          </div>

          <Button
            variant="outline"
            onClick={activeTab === 'profit' ? fetchLogs : fetchDrawerLogs}
            disabled={activeTab === 'profit' ? loading : drawerLoading}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 shadow-sm transition-all"
          >
            <RefreshCw size={16} className={(activeTab === 'profit' ? loading : drawerLoading) ? 'animate-spin' : ''} />
            {(activeTab === 'profit' ? loading : drawerLoading) ? 'Refreshing...' : 'Refresh Logs'}
          </Button>
        </header>

        {/* Custom Segmented Control Tabs */}
        <div className="mb-8 inline-flex bg-gray-200/60 p-1 rounded-xl shadow-inner border border-gray-200">
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'profit' 
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Profit Logs
          </button>
          <button
            onClick={() => setActiveTab('drawer')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'drawer' 
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Wallet size={16} />
            Out Drawer Logs
          </button>
        </div>

        {/* Profit Tab Header Controls */}
        {activeTab === 'profit' && (
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div className="flex flex-col w-full lg:w-72">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Period Filter</label>
              <div className="relative">
                <select
                  value={periodFilter}
                  onChange={(event) => {
                    setPeriodFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full shadow-sm transition-all cursor-pointer"
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {PERIOD_LABEL_MAP[option]}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <ChevronDown size={16} /> {/* If ChevronDown isn't imported, just ignore or add it */}
                </div>
              </div>
            </div>

            {/* Total Net Profit Summary Card */}
            {!loading && !error && logs.length > 0 && (
              <div className={`flex items-center gap-5 px-6 py-4 rounded-2xl border shadow-sm min-w-[280px] transition-all duration-300 ${
                totalNetProfit >= 0 ? 'bg-white border-green-200' : 'bg-white border-red-200'
              }`}>
                <div className={`p-4 rounded-xl flex-shrink-0 ${
                  totalNetProfit >= 0 ? 'bg-green-100/50 text-green-600' : 'bg-red-100/50 text-red-600'
                }`}>
                  {totalNetProfit >= 0 ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Net Profit</p>
                  <p className={`text-3xl font-black tracking-tight ${
                    totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(totalNetProfit)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drawer Tab Header Controls / Cashier Sales Summary */}
        {activeTab === 'drawer' && !drawerLoading && !drawerError && cashierSalesSummary.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
               <UserCheck size={18} className="text-indigo-400" />
               Cashier Breakdown
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cashierSalesSummary.map((cashier) => (
                <div key={cashier.name} className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                    <Wallet size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">{cashier.name}</p>
                    <p className="text-xl font-extrabold tracking-tight text-gray-900">
                      {formatCurrency(cashier.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Table Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] flex flex-col relative">
          
          {/* Loading States */}
          {activeTab === 'profit' && loading && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-7 gap-4 border-b border-gray-100 pb-4">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={`head-${index}`} className="h-4 w-full bg-gray-100" />
                ))}
              </div>
              {Array.from({ length: rowsPerPage }).map((_, index) => (
                <div key={`row-${index}`} className="grid grid-cols-7 gap-4 items-center">
                  <Skeleton className="h-4 w-4/5 bg-gray-50" />
                  <Skeleton className="h-6 w-2/3 rounded-full bg-gray-50" />
                  <Skeleton className="h-4 w-2/3 bg-gray-50" />
                  <Skeleton className="h-4 w-2/3 bg-gray-50" />
                  <Skeleton className="h-4 w-2/3 bg-gray-50" />
                  <Skeleton className="h-4 w-3/4 bg-gray-50" />
                  <Skeleton className="h-4 w-full bg-gray-50" />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'drawer' && drawerLoading && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-7 gap-4 border-b border-gray-100 pb-4">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={`drawer-head-${index}`} className="h-4 w-full bg-gray-100" />
                ))}
              </div>
              {Array.from({ length: rowsPerPage }).map((_, index) => (
                <div key={`drawer-row-${index}`} className="grid grid-cols-7 gap-4 items-center">
                  <Skeleton className="h-4 w-4/5 bg-gray-50" />
                  <Skeleton className="h-4 w-2/3 bg-gray-50" />
                  <Skeleton className="h-4 w-2/3 bg-gray-50" />
                  <Skeleton className="h-4 w-2/3 bg-gray-50" />
                  <Skeleton className="h-4 w-3/4 bg-gray-50" />
                  <Skeleton className="h-4 w-3/4 bg-gray-50" />
                  <Skeleton className="h-4 w-full bg-gray-50" />
                </div>
              ))}
            </div>
          )}

          {/* Error States */}
          {activeTab === 'profit' && !loading && error && (
            <div className="flex-1 flex flex-col justify-center items-center p-12 text-center bg-red-50/30">
              <div className="bg-red-100 p-4 rounded-full mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Failed to load data</h3>
              <p className="text-gray-500 font-medium mb-6">{error}</p>
              <Button onClick={fetchLogs} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                Try Again
              </Button>
            </div>
          )}

          {activeTab === 'drawer' && !drawerLoading && drawerError && (
            <div className="flex-1 flex flex-col justify-center items-center p-12 text-center bg-red-50/30">
              <div className="bg-red-100 p-4 rounded-full mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Failed to load data</h3>
              <p className="text-gray-500 font-medium mb-6">{drawerError}</p>
              <Button onClick={fetchDrawerLogs} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                Try Again
              </Button>
            </div>
          )}

          {/* Empty States */}
          {activeTab === 'profit' && !loading && !error && sortedLogs.length === 0 && (
            <div className="flex-1 flex flex-col justify-center items-center p-16 text-center border-2 border-dashed border-gray-200 m-8 rounded-2xl bg-gray-50/50">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <FileClock size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Logs Found</h3>
              <p className="text-gray-500">There are no profit logs for the selected time period.</p>
            </div>
          )}

          {activeTab === 'drawer' && !drawerLoading && !drawerError && sortedDrawerLogs.length === 0 && (
            <div className="flex-1 flex flex-col justify-center items-center p-16 text-center border-2 border-dashed border-gray-200 m-8 rounded-2xl bg-gray-50/50">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Wallet size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Drawer Logs</h3>
              <p className="text-gray-500">Out drawer activities haven't been recorded yet.</p>
            </div>
          )}

          {/* Data Tables */}
          {activeTab === 'profit' && !loading && !error && sortedLogs.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 whitespace-nowrap">
                  <thead className="bg-white border-b border-gray-200 text-gray-500 uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th onClick={() => handleSort('created_at')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Logged At {sortArrow('created_at', sortKey, sortDirection)}
                      </th>
                      <th onClick={() => handleSort('period')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Period {sortArrow('period', sortKey, sortDirection)}
                      </th>
                      <th onClick={() => handleSort('revenue')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Revenue {sortArrow('revenue', sortKey, sortDirection)}
                      </th>
                      <th onClick={() => handleSort('expenses')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Expenses {sortArrow('expenses', sortKey, sortDirection)}
                      </th>
                      <th onClick={() => handleSort('net_profit')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Net Profit {sortArrow('net_profit', sortKey, sortDirection)}
                      </th>
                      <th onClick={() => handleSort('created_by_name')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Logged By {sortArrow('created_by_name', sortKey, sortDirection)}
                      </th>
                      <th className="px-6 py-4 w-1/4">Notes</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {paginatedLogs.map((entry) => {
                      const periodCode = String(entry?.period || '').toUpperCase();
                      const netProfitValue = Number(entry?.net_profit || 0);
                      const notes = String(entry?.notes || '').trim();

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            {formatDateTime(entry.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${getPeriodBadgeClass(periodCode)}`}>
                              {getPeriodLabel(entry)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-medium">
                            {formatCurrency(entry.revenue)}
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-medium">
                            {formatCurrency(entry.expenses)}
                          </td>
                          <td className={`px-6 py-4 font-bold ${netProfitValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(entry.net_profit)}
                          </td>
                          <td className="px-6 py-4 text-gray-700 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">
                              {(entry.created_by_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            {entry.created_by_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-gray-500 whitespace-normal">
                            <p className="line-clamp-2 text-sm">{notes || '—'}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50 mt-auto">
                <span className="text-sm font-medium text-gray-500">
                  Showing <span className="text-gray-900">{validCurrentPage}</span> of <span className="text-gray-900">{totalPages}</span> pages
                </span>
                <div className="flex items-center space-x-1.5">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(1)} disabled={validCurrentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(validCurrentPage - 1)} disabled={validCurrentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(validCurrentPage + 1)} disabled={validCurrentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePageChange(totalPages)} disabled={validCurrentPage === totalPages}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'drawer' && !drawerLoading && !drawerError && sortedDrawerLogs.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 whitespace-nowrap">
                  <thead className="bg-white border-b border-gray-200 text-gray-500 uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th onClick={() => handleDrawerSort('created_at')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Logged At {sortArrow('created_at', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th onClick={() => handleDrawerSort('opening_balance')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        POS Initial {sortArrow('opening_balance', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th onClick={() => handleDrawerSort('today_sales_total')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Today Sales {sortArrow('today_sales_total', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th onClick={() => handleDrawerSort('projected_total')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Projected Total {sortArrow('projected_total', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th onClick={() => handleDrawerSort('cashier_name')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Cashier {sortArrow('cashier_name', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th onClick={() => handleDrawerSort('created_by_name')} className="px-6 py-4 cursor-pointer hover:text-gray-800 transition-colors">
                        Logged By {sortArrow('created_by_name', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th className="px-6 py-4 w-1/4">Notes</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {paginatedDrawerLogs.map((entry) => {
                      const notes = String(entry?.notes || '').trim();
                      const projectedTotal = Number(entry?.projected_total || 0);

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            {formatDateTime(entry.created_at)}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-600">
                            {formatCurrency(entry.opening_balance)}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-600">
                            {formatCurrency(entry.today_sales_total)}
                          </td>
                          <td className={`px-6 py-4 font-bold ${projectedTotal >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                            {formatCurrency(entry.projected_total)}
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            {entry.cashier_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-gray-700 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">
                              {(entry.created_by_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            {entry.created_by_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-gray-500 whitespace-normal">
                            <p className="line-clamp-2 text-sm">{notes || '—'}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50 mt-auto">
                <span className="text-sm font-medium text-gray-500">
                  Showing <span className="text-gray-900">{validDrawerCurrentPage}</span> of <span className="text-gray-900">{drawerTotalPages}</span> pages
                </span>
                <div className="flex items-center space-x-1.5">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleDrawerPageChange(1)} disabled={validDrawerCurrentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleDrawerPageChange(validDrawerCurrentPage - 1)} disabled={validDrawerCurrentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleDrawerPageChange(validDrawerCurrentPage + 1)} disabled={validDrawerCurrentPage === drawerTotalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleDrawerPageChange(drawerTotalPages)} disabled={validDrawerCurrentPage === drawerTotalPages}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;