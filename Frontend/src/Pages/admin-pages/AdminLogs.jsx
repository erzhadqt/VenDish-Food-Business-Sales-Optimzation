import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileClock,
  RefreshCw,
  Wallet,
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
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'WEEKLY':
      return 'bg-purple-100 text-purple-700 border border-purple-200';
    case 'MONTHLY':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'YEARLY':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
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
  if (targetKey !== currentKey) return '';
  return currentDirection === 'asc' ? '↑' : '↓';
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
    if (!VALID_SORT_KEYS.has(key)) {
      return;
    }

    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const handleDrawerSort = (key) => {
    if (!DRAWER_VALID_SORT_KEYS.has(key)) {
      return;
    }

    if (drawerSortKey === key) {
      setDrawerSortDirection(drawerSortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }

    setDrawerSortKey(key);
    setDrawerSortDirection('asc');
  };

  return (
    <div className="w-full p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <nav className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold text-gray-900">
            <FileClock size={28} className="text-blue-900 md:w-7.5 md:h-7.5" />
            Admin Logs
          </h1>

          <Button
            variant="outline"
            onClick={activeTab === 'profit' ? fetchLogs : fetchDrawerLogs}
            disabled={activeTab === 'profit' ? loading : drawerLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={(activeTab === 'profit' ? loading : drawerLoading) ? 'animate-spin' : ''} />
            {(activeTab === 'profit' ? loading : drawerLoading) ? 'Refreshing...' : 'Refresh'}
          </Button>
        </nav>

        <div className="mb-6 inline-flex bg-white border border-gray-300 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'profit' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Profit Logs
          </button>
          <button
            onClick={() => setActiveTab('drawer')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'drawer' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Wallet size={14} /> Out Drawer Logs
          </button>
        </div>

        {activeTab === 'profit' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={periodFilter}
                onChange={(event) => {
                  setPeriodFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full h-9.5"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {PERIOD_LABEL_MAP[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-100">
          {activeTab === 'profit' && loading && (
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={`head-${index}`} className="h-5 w-full" />
                ))}
              </div>

              {Array.from({ length: rowsPerPage }).map((_, index) => (
                <div key={`row-${index}`} className="grid grid-cols-7 gap-4 items-center">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-6 w-2/3 rounded-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'drawer' && drawerLoading && (
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={`drawer-head-${index}`} className="h-5 w-full" />
                ))}
              </div>

              {Array.from({ length: rowsPerPage }).map((_, index) => (
                <div key={`drawer-row-${index}`} className="grid grid-cols-6 gap-4 items-center">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'profit' && !loading && error && (
            <div className="flex flex-col justify-center items-center h-64 text-red-500 px-4 text-center">
              <AlertCircle size={40} className="mb-2" />
              <p className="font-medium">{error}</p>
              <button
                onClick={fetchLogs}
                className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition"
              >
                Try Again
              </button>
            </div>
          )}

          {activeTab === 'drawer' && !drawerLoading && drawerError && (
            <div className="flex flex-col justify-center items-center h-64 text-red-500 px-4 text-center">
              <AlertCircle size={40} className="mb-2" />
              <p className="font-medium">{drawerError}</p>
              <button
                onClick={fetchDrawerLogs}
                className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm transition"
              >
                Try Again
              </button>
            </div>
          )}

          {activeTab === 'profit' && !loading && !error && sortedLogs.length === 0 && (
            <div className="flex flex-col justify-center items-center h-64 text-gray-400">
              <FileClock size={48} className="mb-2 opacity-20" />
              <p>No profit logs found for the selected filter.</p>
            </div>
          )}

          {activeTab === 'drawer' && !drawerLoading && !drawerError && sortedDrawerLogs.length === 0 && (
            <div className="flex flex-col justify-center items-center h-64 text-gray-400">
              <Wallet size={48} className="mb-2 opacity-20" />
              <p>No out drawer logs found yet.</p>
            </div>
          )}

          {activeTab === 'profit' && !loading && !error && sortedLogs.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 min-w-260">
                  <thead className="bg-gray-100 text-gray-900 uppercase font-semibold">
                    <tr>
                      <th
                        onClick={() => handleSort('created_at')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Logged At {sortArrow('created_at', sortKey, sortDirection)}
                      </th>
                      <th
                        onClick={() => handleSort('period')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Period {sortArrow('period', sortKey, sortDirection)}
                      </th>
                      <th
                        onClick={() => handleSort('revenue')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Revenue {sortArrow('revenue', sortKey, sortDirection)}
                      </th>
                      <th
                        onClick={() => handleSort('expenses')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Expenses {sortArrow('expenses', sortKey, sortDirection)}
                      </th>
                      <th
                        onClick={() => handleSort('net_profit')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Net Profit {sortArrow('net_profit', sortKey, sortDirection)}
                      </th>
                      <th
                        onClick={() => handleSort('created_by_name')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Logged By {sortArrow('created_by_name', sortKey, sortDirection)}
                      </th>
                      <th className="px-4 md:px-6 py-4">Notes</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {paginatedLogs.map((entry) => {
                      const periodCode = String(entry?.period || '').toUpperCase();
                      const netProfitValue = Number(entry?.net_profit || 0);
                      const notes = String(entry?.notes || '').trim();

                      return (
                        <tr key={entry.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-700">
                            {formatDateTime(entry.created_at)}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center ${getPeriodBadgeClass(periodCode)}`}>
                              {getPeriodLabel(entry)}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 font-medium text-gray-700 whitespace-nowrap">
                            {formatCurrency(entry.revenue)}
                          </td>
                          <td className="px-4 md:px-6 py-4 font-medium text-gray-700 whitespace-nowrap">
                            {formatCurrency(entry.expenses)}
                          </td>
                          <td className={`px-4 md:px-6 py-4 font-bold whitespace-nowrap ${netProfitValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(entry.net_profit)}
                          </td>
                          <td className="px-4 md:px-6 py-4 text-gray-700 whitespace-nowrap">
                            {entry.created_by_name || 'Unknown'}
                          </td>
                          <td className="px-4 md:px-6 py-4 text-gray-600 max-w-[320px]">
                            <p className="line-clamp-2">{notes || 'No notes provided.'}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end space-x-2 py-4 mt-2 border-t border-gray-100 pr-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(1)}
                  disabled={validCurrentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(validCurrentPage - 1)}
                  disabled={validCurrentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm text-gray-600 px-2">
                  Page {validCurrentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(validCurrentPage + 1)}
                  disabled={validCurrentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={validCurrentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {activeTab === 'drawer' && !drawerLoading && !drawerError && sortedDrawerLogs.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 min-w-245">
                  <thead className="bg-gray-100 text-gray-900 uppercase font-semibold">
                    <tr>
                      <th
                        onClick={() => handleDrawerSort('created_at')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Logged At {sortArrow('created_at', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th
                        onClick={() => handleDrawerSort('opening_balance')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        POS Initial {sortArrow('opening_balance', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th
                        onClick={() => handleDrawerSort('today_sales_total')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Today Sales {sortArrow('today_sales_total', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th
                        onClick={() => handleDrawerSort('projected_total')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Projected Total {sortArrow('projected_total', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th
                        onClick={() => handleDrawerSort('created_by_name')}
                        className="px-4 md:px-6 py-4 cursor-pointer"
                      >
                        Logged By {sortArrow('created_by_name', drawerSortKey, drawerSortDirection)}
                      </th>
                      <th className="px-4 md:px-6 py-4">Notes</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {paginatedDrawerLogs.map((entry) => {
                      const notes = String(entry?.notes || '').trim();
                      const projectedTotal = Number(entry?.projected_total || 0);

                      return (
                        <tr key={entry.id} className="hover:bg-indigo-50 transition-colors">
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-700">
                            {formatDateTime(entry.created_at)}
                          </td>
                          <td className="px-4 md:px-6 py-4 font-medium text-blue-700 whitespace-nowrap">
                            {formatCurrency(entry.opening_balance)}
                          </td>
                          <td className="px-4 md:px-6 py-4 font-medium text-emerald-700 whitespace-nowrap">
                            {formatCurrency(entry.today_sales_total)}
                          </td>
                          <td className={`px-4 md:px-6 py-4 font-bold whitespace-nowrap ${projectedTotal >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
                            {formatCurrency(entry.projected_total)}
                          </td>
                          <td className="px-4 md:px-6 py-4 text-gray-700 whitespace-nowrap">
                            {entry.created_by_name || 'Unknown'}
                          </td>
                          <td className="px-4 md:px-6 py-4 text-gray-600 max-w-[320px]">
                            <p className="line-clamp-2">{notes || 'No notes provided.'}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end space-x-2 py-4 mt-2 border-t border-gray-100 pr-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDrawerPageChange(1)}
                  disabled={validDrawerCurrentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDrawerPageChange(validDrawerCurrentPage - 1)}
                  disabled={validDrawerCurrentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm text-gray-600 px-2">
                  Page {validDrawerCurrentPage} of {drawerTotalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDrawerPageChange(validDrawerCurrentPage + 1)}
                  disabled={validDrawerCurrentPage === drawerTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDrawerPageChange(drawerTotalPages)}
                  disabled={validDrawerCurrentPage === drawerTotalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
