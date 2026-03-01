import React from "react";
import { Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pages = [
    { name: "home", path: "/" },
    { name: "services", path: "/services" },
    { name: "about", path: "/about" },
    { name: "contact", path: "/contact" },
    // { name: 'admin', path: '/login'},
  ];
  return (
    <nav className="fixed top-0 left-0 w-screen bg-white/90 backdrop-blur-md shadow-md z-50">
      <div className="w-screen px-4 sm:px-6 flex items-center justify-between h-16 sm:h-18 md:h-20">
        {/* Logo */}
        <NavLink
          to="/"
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer min-w-0"
        >
          <img
            src="/icon.jpeg"
            alt=""
            className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 mr-0.5 sm:mr-1 rounded-2xl shrink-0"
          ></img>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800 truncate">
            <span className="text-red-600">KUYA VINCE</span>{" "}
            <span className="hidden xs:inline">KARINDERYA</span>
          </h1>
        </NavLink>
        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-10">
          {pages
            .filter((page) => page.name !== "admin")
            .map((page) => (
              <NavLink
                key={page.name}
                to={page.path}
                className={({ isActive }) =>
                  `relative font-semibold text-base xl:text-lg transition-all duration-300 ${
                    isActive
                      ? "text-red-600 after:absolute after:-bottom-1.5 after:left-0 after:w-full after:h-0.5 after:bg-red-600 after:rounded-full"
                      : "text-gray-700 hover:text-red-600"
                  }`
                }
              >
                {page.name.toUpperCase()}
              </NavLink>
            ))}
          {/* Separate ADMIN Button */}
          {/* <NavLink
              to="/login"
              className="px-4 py-2 rounded-md font-semibold text-white bg-linear-to-r from-red-500 to-red-700 hover:from-red-700 hover:to-red-500 transition-all duration-300"
            >
              ADMIN
            </NavLink> */}
        </div>
        {/* Mobile Toggle */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            className="text-gray-700 hover:text-red-600 transition p-1"
          >
            {isOpen ? (
              <X size={24} className="sm:w-7 sm:h-7" />
            ) : (
              <Menu size={24} className="sm:w-7 sm:h-7" />
            )}
          </button>
        </div>
      </div>
      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white shadow-md border-t border-gray-200 animate-fade-in">
          <div className="flex flex-col items-start p-3 sm:p-4 space-y-2 sm:space-y-3">
            {pages.map((page) => (
              <NavLink
                key={page.name}
                to={page.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `w-full text-left font-semibold text-sm sm:text-base py-2 px-3 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-red-100 text-red-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                {page.name.toUpperCase()}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navigation;