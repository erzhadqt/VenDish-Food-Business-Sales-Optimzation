import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../Components/Header';
import Sidebar from '../Components/Sidebar';

const Layout = () => {
  // State to manage sidebar expansion
  const [isExpanded, setIsExpanded] = useState(true);

  // Toggle function passed down to Sidebar
  const toggleSidebar = () => setIsExpanded(!isExpanded);

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 shrink-0 bg-black flex items-center z-20 relative">
        <Header />
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Wrapper: Controls the physical width and position */}
        <div 
          className={`fixed left-0 h-[calc(100vh-4rem)] flex flex-col transition-all duration-300 z-10 ${
            isExpanded ? 'w-64' : 'w-20' 
          }`}
        >
          {/* Pass state and toggle function to Sidebar */}
          <Sidebar isExpanded={isExpanded} toggleSidebar={toggleSidebar} />
        </div>

        {/* Main Content: Adjusts margin based on sidebar state */}
        <main 
          className={`flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-gray-200/50 transition-all duration-300 ${
            // If expanded, margin is 64 (16rem). If shrunk, margin is 20 (5rem) to match sidebar width.
            isExpanded ? 'ml-64' : 'ml-20' 
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;