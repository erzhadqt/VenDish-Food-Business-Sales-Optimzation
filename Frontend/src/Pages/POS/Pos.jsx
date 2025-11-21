import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CirclePowerIcon } from "lucide-react";
import { FaTrash } from "react-icons/fa";

import api from "../../api";
import Header from "../../Components/Header";

import AlertDialog from "../../Components/AlertDialog";
import ReceiptDialog from "../../Components/ReceiptDialog";
import { SelectDiscount } from "../../Components/SelectDiscount";
import { useAuth } from "../../context/AuthContext";

const Pos = () => {
  const { logout } = useAuth();

  // -------------------------------
  // States
  // -------------------------------
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [cash, setCash] = useState("");
  const [products, setProducts] = useState([]);
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState();

  const discountOptions = [
    { value: "senior", label: "Senior Citizen" },
    { value: "birthday", label: "Birthday" },
    { value: "none", label: "No Discount" },
  ];

  // -------------------------------
  // Fetch Products
  // -------------------------------
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await api.get("/firstapp/products/");
        setProducts(response.data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // -------------------------------
  // Category Filtering
  // -------------------------------
  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredFoods =
    selectedCategory === "All"
      ? products
      : products.filter((food) => food.category === selectedCategory);

  // -------------------------------
  // Cart Logic
  // -------------------------------
  const handleFoodClick = (food) => {
    if (food.stock_quantity <= 0) {
      return alert("This product is out of stock!");
    }
    if (food.stock_quantity <= 10) {
      return alert("Stock is almost out!");
    }

    const exist = cartItems.find((item) => item.id === food.id);

    if (exist) {
      setCartItems(
        cartItems.map((item) =>
          item.id === food.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      setCartItems([...cartItems, { ...food, qty: 1 }]);
    }

    setProducts(
      products.map((p) =>
        p.id === food.id
          ? { ...p, stock_quantity: p.stock_quantity - 1 }
          : p
      )
    );
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

    setProducts(
      products.map((p) =>
        p.id === food.id
          ? { ...p, stock_quantity: p.stock_quantity + 1 }
          : p
      )
    );
  };

  const handleClearCart = () => {
    cartItems.forEach((item) => {
      setProducts(
        products.map((p) =>
          p.id === item.id
            ? { ...p, stock_quantity: p.stock_quantity + item.qty }
            : p
        )
      );
    });

    setCartItems([]);
  };

  // -------------------------------
  // Receipt Calculation
  // -------------------------------
  const subTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const vat = subTotal * 0.12;
  const total = subTotal + vat;
  const discount =
    selectedDiscount === "senior"
      ? subTotal * 0.2
      : selectedDiscount === "birthday"
      ? subTotal * 0.1
      : 0;

  const change = cash ? (cash - total).toFixed(2) : 0;

  // -------------------------------
  // Submit Order
  // -------------------------------
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return alert("Cart is empty!");
    if (!cash || parseFloat(cash) < total) return alert("Insufficient cash!");

    const payload = {
      subtotal: subTotal.toFixed(2),
      vat: vat.toFixed(2),
      total: total.toFixed(2),
      cash_given: cash,
      change,
      items: cartItems.map((i) => ({
        product: i.id,
        product_name: i.product_name,
        price: i.price,
        quantity: i.qty,
      })),
    };

    try {
      const response = await api.post("/firstapp/receipt/", payload);

      setReceiptDetails(response.data);
      setCartItems([]);
      setCash("");
    } catch (error) {
      console.error("Submit failed:", error);
      alert("Failed to submit order.");
    }
  };

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className="font-poppins bg-zinc-300 min-h-screen">
      <Header />

      {/* ------------------------------------ */}
      {/* Main layout grid */}
      {/* ------------------------------------ */}
      <div className="flex flex-col lg:flex-row gap-6 justify-center items-start px-4 py-6">

        {/* ------------------------------------ */}
        {/* Left Section: Food Menu */}
        {/* ------------------------------------ */}
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

          {/* Food Items Grid */}
          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {filteredFoods.map((food) => (
                <div
                  key={food.id}
                  onClick={() => handleFoodClick(food)}
                  className="w-[47%] md:w-[30%] lg:w-[22%] border p-3 rounded-lg text-center hover:shadow-lg transition cursor-pointer"
                >
                  <img
                    src={food.image}
                    alt={food.product_name}
                    className="w-full h-28 object-cover rounded hover:opacity-90"
                  />

                  <h4 className="font-semibold text-lg mt-2 bg-red-400 rounded-xl">
                    {food.product_name}
                  </h4>

                  <p className="text-black font-medium text-lg">
                    ₱{food.price}
                  </p>

                  <span className="text-gray-800 font-light flex justify-center">
                    stocks:{" "}
                    <p className="font-semibold ml-1">
                      {food.stock_quantity}
                    </p>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------ */}
        {/* Right Section: Order Summary */}
        {/* ------------------------------------ */}
        <div className="w-full lg:w-[350px] xl:w-[400px] bg-white p-6 rounded-xl shadow-lg">

          <button
            onClick={handleClearCart}
            className="text-red-500 hover:text-red-700 float-right"
          >
            <FaTrash size={22} />
          </button>

          <h3 className="text-2xl font-bold mb-6 pt-10 text-center text-gray-800">
            Order Summary
          </h3>

          {/* Cart Items */}
          {cartItems.length === 0 ? (
            <p className="text-center text-gray-500">No items yet</p>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center my-2"
              >
                <span className="font-medium">{item.product_name}</span>
                <div className="flex items-center gap-2">
                  <span>₱{item.price}</span>
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

          {/* Summary Values */}
          <div className="text-sm space-y-1">
            <p>Sub-Total: ₱{subTotal.toFixed(2)}</p>
            <p>VAT (12%): ₱{vat.toFixed(2)}</p>
            <h4 className="text-lg font-bold mt-2">
              Total: ₱{total.toFixed(2)}
            </h4>
          </div>

          {/* Cash Input */}
          <div className="mt-2">
            <label className="block font-medium mb-1">Cash:</label>
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="Enter cash"
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:ring-red-200"
            />
          </div>

          {/* Discount Dropdown */}
          <div className="mt-3">
            <SelectDiscount
              options={discountOptions}
              onSelect={setSelectedDiscount}
            />
          </div>

          <p className="mt-4 font-semibold">Change: ₱{change}</p>

          {/* Buttons */}
          <div className="mt-3 space-y-2">
            <ReceiptDialog title="Receipt" receiptDetails={receiptDetails}>
              <button
                onClick={handleSubmitOrder}
                className="w-full bg-red-600 text-white font-medium py-2 rounded-md hover:bg-red-700 transition"
              >
                Submit
              </button>
            </ReceiptDialog>

            <button className="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700 transition">
              <input
                type="text"
                placeholder="Enter Promo Code here"
                className="text-center"
              />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------ */}
      {/* Logout Button */}
      {/* ------------------------------------ */}
      <AlertDialog
        onConfirm={logout}
        title="Confirm Logout"
        description="Are you sure you want to Logout?"
      >
        <div className="cursor-pointer rounded-full w-13 bg-red-700 flex items-center p-2 ml-5">
          <CirclePowerIcon size={36} color="black" />
          <button className="cursor-pointer bg-transparent outline-0 text-white font-bold mx-auto"></button>
        </div>
      </AlertDialog>
    </div>
  );
};

export default Pos;
