import React, { useState } from 'react';
import { Search } from 'lucide-react'

const Searchbar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(query); // Pass the search query to the parent component
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center gap-2 mb-6">
      <div className="flex items-center border border-gray-400 rounded-xl gap-1 py-2 pl-1">
        <Search size={26}/>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-110 rounded-lg py-1 px-2 items-center outline-0"
        />
      </div>
      
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