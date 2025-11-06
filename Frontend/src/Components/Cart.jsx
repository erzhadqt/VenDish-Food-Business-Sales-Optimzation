import React, { useState } from "react";

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [cash, setCash] = useState("");

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
    <div className="w-[350px] sm:w-[400px] mx-auto mt-8 bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">
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
          className="w-full bg-red-600 text-white py-2 rounded hover:bg-gray-600 transition"
        >
          Discount
        </button>
      </div>
    </div>
  );
}
export default Cart;