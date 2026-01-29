import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  ClipboardPenIcon,
} from 'lucide-react';
import AlertDialog from "./AlertDialog";
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isExpanded, toggleSidebar }) => {
  const { logout, user } = useAuth(); 
  const navigate = useNavigate();
  const location = useLocation();
  
  const isMinimized = !isExpanded;

  const allMenuItems = [
    { id: 'sales', icon: TrendingUp, label: 'Sales & Reports', path: '/admin/sales', restricted: true },
    { id: 'menu', icon: Menu, label: 'Menu & Products', path: '/admin/menu', restricted: true },
    { id: 'users', icon: Users, label: 'User Management', path: '/admin/userManagement', restricted: true },
    { id: 'promo-management', icon: TicketPercent, label: 'Promo Management', path: '/admin/promo-management', restricted: true },
    // { id: 'costings', icon: ClipboardPenIcon, label: 'Costings', path: '/admin/costing-table', restricted: true },
    { id: 'feedback', icon: MessageSquare, label: 'Customer Feedback', path: '/admin/customerFeedback', restricted: true },
    { id: 'transaction', icon: FileText, label: 'Transaction', path: '/admin/transaction', restricted: false },
    { id: 'point-of-sale', icon: PresentationIcon, label: 'POS', path: '/admin/pos', restricted: false },
  ];

  
  const cmsMenuItem = { 
    id: 'cms', 
    icon: Settings, 
    label: 'CMS', 
    path: '/admin/cms', 
    restricted: true 
  };

  const visibleMenu = allMenuItems.filter(item => user?.is_superuser || !item.restricted);
  const showCMS = user?.is_superuser; // Only superusers can see CMS

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

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 border-r border-gray-200 shadow-sm">
      
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between">
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
            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 ${isMinimized ? 'mx-auto' : ''}`}
          >
            {isMinimized ? <ChevronRight className="w-5 h-5 text-gray-600" /> : <ChevronLeft className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
         
          {visibleMenu.map(renderNavItem)}

         
          {showCMS && (
             <div className="my-2 border-t border-gray-300/50 mx-2" />
          )}

  
          {showCMS && renderNavItem(cmsMenuItem)}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200">
        <AlertDialog onConfirm={logout} title="Confirm Logout" description="Are you sure you want to Logout?">
          <button
            className={`w-full flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white 
                        rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm group relative
                        ${isMinimized ? 'justify-center' : 'justify-center'}`}
            title={isMinimized ? 'Logout' : ''}
          >
            <LogOut className="w-4 h-4" />
            {!isMinimized && <span>Logout</span>}
          </button>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Sidebar;