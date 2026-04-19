import React, { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Menu, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PresentationIcon,
  TicketPercent,
  Store,
  Loader2, // Added for loading state
  FileClock
} from 'lucide-react';
import AlertDialog from "./AlertDialog";
import { useAuth } from '../context/AuthContext';
import api from '../api';
import StoreToggleDialog from './StoreToggleDialog';

const Sidebar = ({ isExpanded, toggleSidebar }) => {
  const { logout, user } = useAuth(); 
  const [storeIsOpen, setStoreIsOpen] = useState(true);
  const [storeStatusLoading, setStoreStatusLoading] = useState(false);
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [isTogglingStore, setIsTogglingStore] = useState(false);
  
  const isMinimized = !isExpanded;

  const allMenuItems = [
    { id: 'sales', icon: TrendingUp, label: 'Sales & Reports', path: '/admin/sales', restricted: true },
    { id: 'menu', icon: Menu, label: 'Menu & Products', path: '/admin/menu', restricted: true },
    { id: 'users', icon: Users, label: 'User Management', path: '/admin/userManagement', restricted: true },
    { id: 'promo-management', icon: TicketPercent, label: 'Promo Management', path: '/admin/promo-management', restricted: true },
    { id: 'admin-logs', icon: FileClock, label: 'Admin Logs', path: '/admin/logs', restricted: true },
    { id: 'feedback', icon: MessageSquare, label: 'Customer Feedback', path: '/admin/customerFeedback', restricted: true },
    { id: 'transaction', icon: FileText, label: 'Transaction', path: '/admin/transaction', restricted: false },
    { id: 'point-of-sale', icon: PresentationIcon, label: 'POS', path: '/admin/pos', restricted: false },
  ];

  const cms = [{ id: 'cms', icon: Settings, label: 'CMS', path: '/admin/cms', restricted: true }];

  const visibleMenu = allMenuItems.filter(item => user?.is_superuser || !item.restricted);
  const visibleCMS = cms.filter(item => user?.is_superuser || !item.restricted);

  const fetchStoreStatus = useCallback(async () => {
    if (!user?.is_superuser) return;

    setStoreStatusLoading(true);
    try {
      const response = await api.get(`/settings/?t=${Date.now()}`);
      setStoreIsOpen(response?.data?.store_is_open !== false);
    } catch (error) {
      console.error('Failed to fetch store status:', error);
    } finally {
      setStoreStatusLoading(false);
    }
  }, [user?.is_superuser]);

  useEffect(() => {
    fetchStoreStatus();
  }, [fetchStoreStatus]);

  const handleConfirmStoreToggle = async () => {
    if (!user?.is_superuser) {
      return { success: false, message: 'Only administrators can change store status.' };
    }

    setIsTogglingStore(true);
    try {
      const response = await api.post('/settings/', {
        store_is_open: !storeIsOpen,
      });

      setStoreIsOpen(response?.data?.store_is_open !== false);
      return { success: true };
    } catch (error) {
      console.error('Failed to toggle store status:', error);
      const message =
        error?.response?.data?.error ||
        'Failed to update store status. Please try again.';
      return { success: false, message };
    } finally {
      setIsTogglingStore(false);
    }
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.id}
        to={item.path}
        className={({ isActive }) => `
          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium 
          transition-all duration-200 group relative
          ${isActive ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
          ${isMinimized ? 'justify-center' : ''}
        `}
        title={isMinimized ? item.label : ''}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!isMinimized && <span>{item.label}</span>}

        {isMinimized && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 
                          group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
            {item.label}
          </div>
        )}
      </NavLink>
    );
  };

  const isLoading = storeStatusLoading || isTogglingStore;

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 border-r border-gray-200 shadow-sm transition-all duration-300">
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className={`border-b border-gray-200 flex items-center justify-between transition-all duration-300 ${isMinimized ? 'p-3 flex-col gap-2' : 'px-4 py-5'}`}>
          {!isMinimized && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <LayoutDashboard className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
                <span className="text-xs text-gray-500 uppercase font-bold">
                  {user?.is_superuser ? 'Administrator' : 'Staff'}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            {isMinimized ? <ChevronRight className="w-5 h-5 text-gray-600" /> : <ChevronLeft className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        <nav className={`py-4 space-y-1 transition-all ${isMinimized ? 'px-2' : 'px-3'}`}>
          {visibleMenu.map(renderNavItem)}

          {visibleCMS.length > 0 && (
             <div className="my-2 border-t border-gray-300/50 mx-2" />
          )}

          {visibleCMS.map(renderNavItem)}
        </nav>
      </div>

      <div className={`border-t border-gray-200 transition-all duration-300 ${isMinimized ? 'p-2' : 'p-4'}`}>
        {user?.is_superuser && (
          <button
            onClick={() => setIsStoreDialogOpen(true)}
            disabled={isLoading}
            className={`w-full mb-2 flex items-center px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-all duration-1000 shadow-sm group relative overflow-hidden
                        ${storeIsOpen ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                        ${isMinimized ? 'justify-center px-0' : 'justify-start'}
                        ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
            title={isMinimized ? (storeIsOpen ? 'Close Store' : 'Open Store') : ''}
          >
            {/* Left side: Icon */}
            <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
              <Loader2 className={`absolute w-4 h-4 transition-all duration-1000 animate-spin ${isLoading ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
              <Store className={`absolute w-4 h-4 transition-all duration-1000 ${!isLoading ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
            </div>

            {/* Right side: Animated Text (Only visible when expanded) */}
            {!isMinimized && (
              <div className="relative flex-1 h-5 overflow-hidden ml-2 flex items-center">
                {/* State 1: Updating */}
                <span className={`absolute left-0 transition-transform duration-1000 flex items-center ${isLoading ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
                  Updating...
                </span>

                {/* State 2: Store Open */}
                <span className={`absolute left-0 transition-transform duration-1000 flex items-center gap-2 ${!isLoading && storeIsOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  Store Open
                  {/* Live Pulsing Dot */}
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-100"></span>
                  </span>
                </span>

                {/* State 3: Store Closed */}
                <span className={`absolute left-0 transition-transform duration-1000 flex items-center ${!isLoading && !storeIsOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  Store Closed
                </span>
              </div>
            )}
          </button>
        )}

        <AlertDialog onConfirm={logout} title="Confirm Logout" description="Are you sure you want to Logout?">
          <button
            className={`w-full flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white 
                        rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm group relative
                        ${isMinimized ? 'justify-center px-0' : 'justify-center'}`}
            title={isMinimized ? 'Logout' : ''}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isMinimized && <span>Logout</span>}
          </button>
        </AlertDialog>
      </div>

      <StoreToggleDialog
        open={isStoreDialogOpen}
        onOpenChange={setIsStoreDialogOpen}
        isStoreOpen={storeIsOpen}
        isSubmitting={isTogglingStore}
        onConfirm={handleConfirmStoreToggle}
      />
    </div>
  );
};

export default Sidebar;