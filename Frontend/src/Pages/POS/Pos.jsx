import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsBoxArrowRight } from "react-icons/bs";
import Cart from "../../Components/Cart";
import FoodList from "../../Components/FoodList";
import Header from "../../Components/Header";
import foods from "../../data/foods";

import { FaTrash } from "react-icons/fa";


const Pos = () => {
    const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cartItems, setCartItems] = useState([]);
  const [cash, setCash] = useState("");

  const categories = [
    "All",
    "Chicken",
    "Beef",
    "Fish",
    "Vegetables",
    "Combo",
    "Value",
    "Silog Meal",
    "Add-ons",
  ];

  const filteredFoods =
    selectedCategory === "All"
      ? foods
      : foods.filter((food) => food.category === selectedCategory);

  const handleFoodClick = (food) => {
    alert(`You selected ${food.name}!`);
  };

  const handleRemove = (food) => {
    const exist = cartItems.find((item) => item.id === food.id);
    if (exist.qty === 1) {
      setCartItems(cartItems.filter((item) => item.id !== food.id));
    } else {
      setCartItems(
        cartItems.map((item) =>
          item.id === food.id ? { ...item, qty: item.qty - 1 } : item
        )
      );
    }
  };

  const subTotal = cartItems.reduce((sum, item) => sum + item.cost * item.qty, 0);
  const vat = subTotal * 0.12;
  const total = subTotal + vat;
  const change = cash ? (cash - total).toFixed(2) : 0;

  return (
    <div className="font-poppins bg-zinc-300 min-h-screen">
      <Header />

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 justify-center items-start px-4 py-6">
        
        {/* Left: Food Menu */}
        <div className="flex-1 w-full bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-2xl font-bold mb-4 text-center text-gray-800">
            Food Menu
          </h3>

          {/* Category Buttons */}
          <div className="flex justify-center flex-wrap gap-2 mb-5 p-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1 text-lg rounded-full border ${
                  selectedCategory === category
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-red-100"
                } transition`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Food Items */}
          <div className="flex flex-wrap justify-center gap-4">
            {filteredFoods.map((food) => (
              <div
                key={food.id}
                className="w-[47%] md:w-[30%] lg:w-[22%] border p-3 rounded-lg text-center hover:shadow-lg transition cursor-pointer"
                onClick={() => handleFoodClick(food)}
              >
                <img
                  src={food.image}
                  alt={food.name}
                  className="w-full h-28 object-cover rounded hover:opacity-90"
                />
                <h4 className="font-semibold mt-2 bg-red-400 rounded-xl">{food.name}</h4>
                <p className="text-gray-600">₱{food.cost}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart / Order Summary */}
        <div className="w-full lg:w-[350px] xl:w-[400px] bg-white p-6 rounded-xl shadow-lg">
          <button className="text-red-500 hover:text-red-700 float-right">
            <FaTrash size={22} />
        </button>
          
          <h3 className="text-2xl font-bold mb-6 pt-10 text-center text-gray-800">
            Order Summary
          </h3>

          {cartItems.length === 0 ? (
            <p className="text-center text-gray-500">No items yet</p>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center my-2">
                <span className="font-medium">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span>₱{item.cost}</span>
                  <span>x {item.qty}</span>
                  <button
                    onClick={() => handleRemove(item)}
                    className="bg-red-500 text-white px-2 rounded hover:bg-red-600"
                  >
                    –
                  </button>
                </div>
              </div>
            ))
          )}

          <hr className="my-3" />

          <div className="text-sm space-y-1">
            <p>Sub-Total: ₱{subTotal.toFixed(2)}</p>
            <p>VAT (12%): ₱{vat.toFixed(2)}</p>
            <h4 className="text-lg font-bold">Total: ₱{total.toFixed(2)}</h4>
          </div>

          <div className="mt-4">
            <label className="block font-medium mb-1">Cash:</label>
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="Enter cash"
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:ring-red-200"
            />
          </div>

          <p className="mt-2 font-semibold">Change: ₱{change}</p>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => alert("Order Submitted!")}
              className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
            >
              Submit
            </button>
            <button
              onClick={() => alert("Discount Applied!")}
              className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition"
            >
              Discount
            </button>
          </div>
        </div>
      </div>
      <div onClick={() => navigate('/')} className='cursor-pointer rounded-full h-10 w-30 bg-red-700 flex justify-center gap-3 items-center'>
                      <BsBoxArrowRight size={22} color='black' />
                      <button onClick={() => navigate('/')} className='cursor-pointer bg-transparent outline-0 text-white font-bold'>Logout</button>
                  </div>
    </div>
  );
};

export default Pos;
