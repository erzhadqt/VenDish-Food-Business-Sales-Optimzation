import React, { useState } from 'react';
import { Home, Briefcase, Info, Phone } from 'lucide-react';
import HomepageCMS from './HomePageCMS';  
import ServicesCMS from './ServicesCMS';
import AboutCMS from './AboutCMS';
import ContactCMS from './ContactCMS';

const CMSNavbar = () => {
  const [activeTab, setActiveTab] = useState('homepage');

  const navItems = [
    { id: 'homepage', icon: Home, label: 'Homepage', component: HomepageCMS },
    { id: 'services', icon: Briefcase, label: 'Services', component: ServicesCMS },
    { id: 'about', icon: Info, label: 'About', component: AboutCMS },
    { id: 'contact', icon: Phone, label: 'Contact', component: ContactCMS },
  ];

  const ActiveComponent = navItems.find(item => item.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">Content Management System</h1>
          <nav className="flex justify-center">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
                    transition-all duration-200 whitespace-nowrap
                    ${activeTab === item.id
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-fade-in">
        {ActiveComponent && <ActiveComponent />}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CMSNavbar;