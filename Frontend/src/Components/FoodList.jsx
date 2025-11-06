import React, { useState } from "react";
import foods from "../data/foods";

function FoodList() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All","Chicken","Beef","Fish","Vegetables","Combo","Value","Silog Meal","Add-ons",];
  const filteredFoods = selectedCategory === "All" ? foods : foods.filter((food) => food.category === selectedCategory);

  const handleFoodClick = (food) => {
    alert(`You selected ${food.name}!`);
  };

  return (
    <div className="w-[90%] lg:w-2/3 bg-white p-6 mt-6 rounded-xl shadow-md">
      <h3 className="text-2xl font-bold mb-4 text-center text-gray-800">
        Food Menu
      </h3>

      <div className="flex justify-center flex-wrap gap-2 mb-5">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-1 text-sm rounded-full border ${
              selectedCategory === category ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-700 border-gray-300 hover:bg-red-100"} transition`}
               >
            {category}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-left gap-4">
        {filteredFoods.map((food) => (
          <div
            key={food.id}
            className="w-[45%] md:w-[30%] border p-3 rounded-lg text-center hover:shadow-lg transition cursor-pointer"
            onClick={() => handleFoodClick(food)}
          >
            <img
              src={food.image}
              alt={food.name}
              className="w-full h-28 object-cover rounded hover:opacity-90"/>
            <h4 className="font-semibold mt-2">{food.name}</h4>
            <p className="text-gray-600">₱{food.cost}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FoodList;
