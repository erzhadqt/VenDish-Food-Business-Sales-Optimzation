import React from "react";

function FoodItem({ food, onAdd }) {
  return (
    <div
      onClick={() => onAdd(food)}
      className="bg-white rounded-xl shadow-md p-4 text-center cursor-pointer hover:bg-red-50 hover:scale-105 transform transition"
    >
      <img
        src={food.image}
        alt={food.name}
        className="w-full h-32 object-cover rounded-lg mb-2"
      />
      <h3 className="text-lg font-semibold">{food.name}</h3>
      <p className="text-gray-700">₱{food.cost}</p>
    </div>
  );
}
export default FoodItem