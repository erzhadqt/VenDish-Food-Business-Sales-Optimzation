import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";

const Searchbar = ({ onSearch, categories, initialQuery = "", initialCategory = "" }) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // Sync local state if URL parameters change externally (e.g., navigating back/forward)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Only trigger an update if the typed values actually differ from the URL parameters.
      // This totally eliminates double-fetching and recursive render loops.
      if (query !== initialQuery || selectedCategory !== initialCategory) {
        onSearch(query, selectedCategory);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, selectedCategory, onSearch, initialQuery, initialCategory]);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <div className="flex items-center border border-gray-400 rounded-xl gap-1 py-2 pl-2 pr-1 bg-white">
        <Search size={20} className="text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-[150px] sm:w-[300px] rounded-lg py-1 px-2 outline-none" 
        />
      </div>

      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className="px-4 py-2.5 shadow-sm border border-gray-400 bg-white rounded-lg outline-none cursor-pointer"
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Searchbar;