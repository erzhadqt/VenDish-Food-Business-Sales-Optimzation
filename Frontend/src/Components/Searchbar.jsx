import React, { useState } from "react";
import { Search } from "lucide-react";

const Searchbar = ({ onSearch, categories, initialQuery = "", initialCategory = "" }) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(query, selectedCategory);
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center gap-2 mb-6">
      <div className="flex items-center border border-gray-400 rounded-xl gap-1 py-2 pl-1">
        <Search size={26} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-110 rounded-lg py-1 px-2 outline-0"
        />
      </div>

      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className="px-4 py-2 shadow-lg border border-gray-400 bg-white rounded-lg"
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="px-4 py-2 shadow-lg border border-gray-400 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        Search
      </button>
    </form>
  );
};

export default Searchbar;
