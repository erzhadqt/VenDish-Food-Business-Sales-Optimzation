import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  ClipboardPenIcon
} from 'lucide-react';

import AlertDialog from "./AlertDialog";
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout } = useAuth();

  const navigate = useNavigate()
  const [isMinimized, setIsMinimized] = useState(false);

  const menu = [
    { id: 'sales', icon: TrendingUp, label: 'Sales & Reports', path: '/admin/sales' },
    { id: 'menu', icon: Menu, label: 'Menu & Products', path: '/admin/menu' },
    { id: 'users', icon: Users, label: 'User Management', path: '/admin/userManagement' },
    { id: 'promo-management', icon: TicketPercent, label: 'Promo Management', path: '/admin/promo-management' },
    { id: 'costings', icon: ClipboardPenIcon, label: 'Costings', path: '/admin/costing-table' },
    { id: 'feedback', icon: MessageSquare, label: 'Customer Feedback', path: '/admin/customerFeedback' },
    { id: 'transaction', icon: FileText, label: 'Transaction', path: '/admin/transaction' },
    { id: 'point-of-sale', icon: PresentationIcon, label: 'POS', path: '/admin/pos' },
  ];

  const cms = [
    { id: 'cms', icon: Settings, label: 'CMS', path: '/admin/cms' }
  ];

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

        {/* Tooltip when minimized */}
        {isMinimized && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 
                           group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 
                           transition-opacity duration-200">
            {item.label}
          </div>
        )}
      </NavLink>
    );
  };

  return (
    <div className={`h-screen flex flex-col bg-gray-100 border-r border-gray-200 shadow-sm transition-all duration-300 
                     ${isMinimized ? 'w-20' : 'w-64'}`}>

      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between">
        {!isMinimized && (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-gray-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
          </div>
        )}

        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className={`p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 ${isMinimized ? 'mx-auto' : ''}`}
        >
          {isMinimized ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menu.map(renderNavItem)}
        </div>

        {/* CMS Section */}
        <div className="mt-8">
          {!isMinimized && (
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Content Management
              </p>
            </div>
          )}

          {isMinimized && <div className="border-t border-gray-200 my-4" />}

          <div className="space-y-1">
            {cms.map(renderNavItem)}
          </div>
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200 inset-0">
        <AlertDialog onConfirm={logout} title="Confirm Logout" description="Are you sure you want to Logout?">
          <button
            className={`
              w-full flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white 
              rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm group relative
              ${isMinimized ? 'justify-center' : 'justify-center'}
            `}
            title={isMinimized ? 'Logout' : ''}
          >
            <LogOut className="w-4 h-4" />
            {!isMinimized && <span>Logout</span>}

            {/* Tooltip if minimized */}
            {isMinimized && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded 
                              opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
                Logout
              </div>
            )}
          </button>
        </AlertDialog>
      </div>

    </div>
  );
};

export default Sidebar;
