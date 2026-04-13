import React, { useState, useEffect } from "react";
import { Search, Filter, ArrowUpDown, ChevronDown } from "lucide-react";

const Searchbar = ({ onSearch, categories, initialQuery = "", initialCategory = "", initialSort = "product_name" }) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortOption, setSortOption] = useState(initialSort);

  // Sync local state if URL parameters change externally (e.g., navigating back/forward)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setSortOption(initialSort);
  }, [initialSort]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Only trigger an update if the typed values actually differ from the URL parameters.
      if (query !== initialQuery || selectedCategory !== initialCategory || sortOption !== initialSort) {
        onSearch(query, selectedCategory, sortOption);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, selectedCategory, sortOption, onSearch, initialQuery, initialCategory, initialSort]);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-3 mb-8 w-full">
      {/* Search Input Container */}
      <div className="relative w-full lg:max-w-md flex-1 group">
        <div className="flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 focus-within:bg-white focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900">
          <Search size={18} className="text-gray-400 group-focus-within:text-gray-900 transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-transparent outline-none ml-3 text-sm text-gray-900 placeholder-gray-500 font-medium" 
          />
        </div>
      </div>

      {/* Filters Group Container */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
        
        {/* Category Filter */}
        <div className="relative w-full sm:w-auto group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Filter size={16} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 appearance-none pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 outline-none cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
          </div>
        </div>

        {/* Sort Filter */}
        <div className="relative w-full sm:w-auto group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <ArrowUpDown size={16} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
          </div>
          
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full sm:w-48 appearance-none pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 outline-none cursor-pointer transition-all hover:bg-gray-50 hover:border-gray-300 focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
          >
            <option value="product_name">A - Z</option>
            <option value="-product_name">Z - A</option>
            <option value="-price">Highest-Lowest Price</option>
            <option value="price">Lowest-Highest Price</option>
          </select>

          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Searchbar;