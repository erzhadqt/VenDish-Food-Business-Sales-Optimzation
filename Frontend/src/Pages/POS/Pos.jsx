import React, { useState, useEffect } from "react";
import { CirclePowerIcon, Tag, Trash2, ShoppingBag } from "lucide-react"; 
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa"; 

import api from "../../api";

import ReceiptModal2 from "../../Components/ReceiptModal2";
import VoidConfirmDialog from "../../Components/VoidConfirmDialog"; 
import { SelectDiscount } from "../../Components/SelectDiscount";
import { useAuth } from "../../context/AuthContext";

const Pos = () => {
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
  
  // --- Promo Code States ---
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  const discountOptions = [
    { value: "senior", label: "Senior Citizen" },
    { value: "birthday", label: "Birthday" },
    { value: "none", label: "No Discount" },
  ];

  // -------------------------------
  // 1. Fetch Products
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
  // 2. Cart Logic
  // -------------------------------
  const handleFoodClick = (food) => {
    if (food.stock_quantity <= 0) {
      return alert("This product is out of stock!");
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

    // Optimistic Stock Update
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
    
    // VALIDATION: If removing the item that supports the current coupon
    if (appliedCoupon && appliedCoupon.product === food.id && exist.qty === 1) {
        setAppliedCoupon(null);
        setPromoCode("");
        setCouponError("Coupon removed because the required item was removed.");
        setTimeout(() => setCouponError(""), 3000);
    }

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

  // -------------------------------
  // 3. UPDATED: Handle Promo Code
  // -------------------------------
  const handleApplyPromo = async () => {
    setCouponError("");
    if (!promoCode) return;
    
    try {
        setLoading(true);
        const response = await api.get("/firstapp/coupons/");
        const allCoupons = response.data;
        
        const coupon = allCoupons.find(c => c.code.toUpperCase() === promoCode.toUpperCase());

        if (!coupon) {
            setCouponError("Invalid Coupon Code");
            setAppliedCoupon(null);
            return;
        }

        if (coupon.status === 'Redeemed') {
            setCouponError("This coupon has already been used.");
            setAppliedCoupon(null);
            return;
        }

        const now = new Date();
        const expirationDate = new Date(coupon.expiration);
        if (expirationDate < now) {
            setCouponError("This coupon has expired.");
            setAppliedCoupon(null);
            return;
        }

        const productInCart = cartItems.find(item => item.id === coupon.product);
        
        if (!productInCart) {
            setCouponError(`This coupon requires a specific product (ID: ${coupon.product}) in the cart.`);
            setAppliedCoupon(null);
            return;
        }

        setAppliedCoupon(coupon);
        setCouponError(""); 
        
    } catch (error) {
        console.error("Promo check failed", error);
        setCouponError("Network error validating coupon");
    } finally {
        setLoading(false);
    }
  };

  // -------------------------------
  // 4. Receipt Calculation
  // -------------------------------
  const subTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  
  const vat = subTotal - (subTotal * .88);
  
  const standardDiscount =
    selectedDiscount === "senior"
      ? subTotal * 0.2
      : selectedDiscount === "birthday"
      ? subTotal * 0.1
      : 0;

  const couponDiscount = appliedCoupon ? parseFloat(appliedCoupon.rate) : 0;
  const tempTotal = subTotal - standardDiscount - couponDiscount;
  const total = tempTotal > 0 ? tempTotal : 0;
  const change = cash ? (cash - total).toFixed(2) : 0;

  // -------------------------------
  // 5. Handle Void Current Order
  // -------------------------------
  const handleVoidCurrentOrder = async () => {
    if (cartItems.length === 0) return;

    setLoading(true);

    const payload = {
        subtotal: subTotal.toFixed(2),
        vat: vat.toFixed(2),
        total: total.toFixed(2), 
        cash_given: "0", 
        change: "0",
        coupon: appliedCoupon ? appliedCoupon.id : null, 
        items: cartItems.map((i) => ({
          product: i.id,
          product_name: i.product_name,
          price: i.price,
          quantity: i.qty,
        })),
    };

    try {
        const createResponse = await api.post("/firstapp/receipt/", payload);
        const newReceiptId = createResponse.data.receipt_id || createResponse.data.id;

        if (!newReceiptId) throw new Error("Failed to get Receipt ID");

        await api.post(`/firstapp/receipt/${newReceiptId}/void/`);

        alert("Order successfully Cancelled and Voided to History.");

        // Clear State
        setCartItems([]);
        setCash("");
        setAppliedCoupon(null);
        setPromoCode("");
        setCouponError("");
        
        const prodResponse = await api.get("/firstapp/products/");
        setProducts(prodResponse.data);

    } catch (error) {
        console.error("Void Process Failed:", error);
        alert("Warning: Receipt was created but Void failed. Please void manually in History.");
    } finally {
        setLoading(false);
    }
  };

  // -------------------------------
  // 6. Submit Order (Normal Sale)
  // -------------------------------
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return alert("Cart is empty!");
    if (!cash || parseFloat(cash) < total) return alert("Insufficient cash!");

    setLoading(true);

    const payload = {
      subtotal: subTotal.toFixed(2),
      vat: vat.toFixed(2),
      total: total.toFixed(2), 
      cash_given: cash,
      change,
      coupon: appliedCoupon ? appliedCoupon.id : null, 
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
      // NOTE: We do NOT clear cart items here anymore. 
      // We wait until the user closes the Receipt Modal (via onConfirm)
    } catch (error) {
      console.error("Submit failed:", error);
      alert("Failed to submit order. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  // 7. NEW: Reset after Printing/Closing Receipt
  const handleResetOrder = () => {
      setCartItems([]);
      setCash("");
      setAppliedCoupon(null);
      setPromoCode("");
      setCouponError("");
      setReceiptDetails(null); // This closes the modal if you are controlling it via state
  };

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className="font-poppins bg-zinc-300 min-h-screen">

      {/* Main layout grid */}
      <div className="flex flex-col lg:flex-row gap-6 justify-center items-start px-4 py-6">

        {/* Left Section: Food Menu */}
        <div className="flex-1 w-full bg-gray-100 p-6 rounded-xl shadow-md">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-2xl font-bold text-gray-800">Menu</h3>
             {loading && <span className="text-sm text-blue-600 animate-pulse">Syncing...</span>}
          </div>

          {/* Category Buttons */}
          <div className="flex justify-center flex-wrap gap-2 mb-5 p-2 bg-white rounded-lg shadow-sm">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1 text-sm font-medium rounded-full border transition-all ${
                  selectedCategory === category
                    ? "bg-red-600 text-white border-red-600 shadow-md"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-red-100 hover:border-red-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Food Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFoods.map((food) => (
                <div
                  key={food.id}
                  onClick={() => handleFoodClick(food)}
                  className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:shadow-lg hover:border-red-200 transition cursor-pointer flex flex-col items-center group relative overflow-hidden"
                >
                  <div className="w-full h-40 mb-2 overflow-hidden rounded-lg">
                      <img
                        src={food.image}
                        alt={food.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                  </div>

                  <h4 className="font-semibold text-gray-800 text-center text-lg mb-1 line-clamp-1">
                    {food.product_name}
                  </h4>

                  <p className="text-red-600 font-bold text-lg">
                    ₱{food.price}
                  </p>
                  <hr className="w-full border my-2"/>
                  <div className="w-full p-1 flex justify-between">
                    <span className="text-sm">Stocks:</span> <span className="font-medium">{food.stock_quantity}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Section: Order Summary */}
        <div className="w-full lg:w-[380px] bg-white rounded-xl shadow-lg flex flex-col h-[calc(100vh-100px)] sticky top-6">
      
          {/* --- HEADER SECTION --- */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ShoppingBag size={20} /> Current Order
                </h3>
                {cartItems.length > 0 && (
                      <VoidConfirmDialog 
                        onConfirm={handleVoidCurrentOrder} 
                        trigger={
                            <button className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition-colors" title="Void Order">
                                <Trash2 size={18} />
                            </button>
                        }
                    />
                )}
            </div>
          </div>

          {/* --- SCROLLABLE ITEMS SECTION --- */}
          <div className="flex-1 overflow-y-auto px-5 py-2 custom-scrollbar">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <ShoppingBag size={48} className="opacity-20" />
                <p className="text-sm">No items selected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start group">
                    <div className="flex-1">
                        <div className="flex justify-between mb-1">
                            <span className="font-medium text-gray-800 text-sm">{item.product_name}</span>
                            <span className="font-semibold text-gray-900 text-sm">₱{(item.price * item.qty).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                             <span>₱{item.price} each</span>
                        </div>
                    </div>
                    
                    {/* Qty Controls */}
                    <div className="flex items-center gap-3 ml-4 bg-gray-50 rounded-lg px-2 py-1">
                          <span className="font-bold text-gray-800 text-sm">{item.qty}</span>
                          <button
                            onClick={() => handleRemove(item)}
                            className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                          >
                            -
                          </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- BOTTOM FIXED SECTION --- */}
          <div className="bg-gray-50 p-5 border-t border-gray-200 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] z-10">
            
            {/* 1. Financial Breakdown */}
            <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>₱{subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                    <span>VAT (12%)</span>
                    <span>₱{vat.toFixed(2)}</span>
                </div>

                {/* Discounts */}
                {selectedDiscount !== "none" && selectedDiscount && (
                <div className="flex justify-between text-green-600 bg-green-50 px-2 py-1 rounded">
                    <span>{selectedDiscount} Discount</span>
                    <span>-₱{standardDiscount.toFixed(2)}</span>
                </div>
                )}

                {appliedCoupon && (
                <div className="flex justify-between text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    <span className="flex items-center gap-1"><Tag size={12}/> Promo ({appliedCoupon.code})</span>
                    <span>-₱{parseFloat(appliedCoupon.rate).toFixed(2)}</span>
                </div>
                )}

                <div className="flex justify-between items-center text-2xl font-bold text-gray-900 border-t border-dashed border-gray-300 pt-3 mt-2">
                    <span>Total</span>
                    <span>₱{total.toFixed(2)}</span>
                </div>
            </div>

            {/* 2. Promo Code Input */}
            <div className="mb-3">
                <div className="flex gap-2">
                    <div className="relative grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Tag size={14} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="Enter Code"
                            className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm uppercase ${couponError ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'}`}
                            disabled={!!appliedCoupon}
                        />
                    </div>
                    {appliedCoupon ? (
                        <button 
                            onClick={() => { setAppliedCoupon(null); setPromoCode(""); }}
                            className="bg-red-100 text-red-600 px-3 rounded-lg hover:bg-red-200 transition text-xs font-bold uppercase"
                        >
                            Remove
                        </button>
                    ) : (
                        <button 
                            onClick={handleApplyPromo}
                            disabled={loading}
                            className="bg-gray-800 text-white px-4 rounded-lg hover:bg-gray-700 transition text-xs font-bold uppercase"
                        >
                            {loading ? '...' : 'Apply'}
                        </button>
                    )}
                </div>
                
                {/* Messages */}
                {couponError && (
                    <div className="flex items-center gap-1 text-red-500 text-xs mt-1 animate-pulse">
                        <FaExclamationCircle /> {couponError}
                    </div>
                )}
                {appliedCoupon && (
                      <div className="flex items-center gap-1 text-green-600 text-xs mt-1">
                        <FaCheckCircle /> Code valid for item ID: {appliedCoupon.product}
                    </div>
                )}
            </div>

            {/* 3. Inputs & Actions */}
            <div className="grid grid-cols-2 gap-10 mb-3">
                <SelectDiscount
                    options={discountOptions}
                    onSelect={setSelectedDiscount}
                    className="text-sm "
                />
                 <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₱</span>
                    <input
                        type="number"
                        value={cash}
                        onChange={(e) => setCash(e.target.value)}
                        placeholder="CASH"
                        className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-lg text-right font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>
            </div>

            {/* Change Display & Submit */}
            <div className="flex items-center justify-between mb-3 text-sm font-medium text-gray-500">
                <span className="text-lg">Change:</span>
                <span className={`font-bold text-lg ${change < 0 ? 'text-red-500' : 'text-gray-900'}`}>₱{change}</span>
            </div>

            {/* UPDATED RECEIPT MODAL LOGIC: 
               We pass the handleResetOrder function to onConfirm 
            */}
            <ReceiptModal2 
                title="Receipt" 
                receiptDetails={receiptDetails} 
                onConfirm={handleResetOrder} // <--- This function clears the cart when clicked
            >
                <button
                onClick={handleSubmitOrder}
                disabled={loading || parseFloat(cash || 0) < total}
                className={`w-full font-bold py-3 rounded-xl transition-all duration-300 transform active:scale-[0.98] shadow-lg flex justify-center items-center gap-2
                    ${parseFloat(cash || 0) >= total 
                        ? 'bg-linear-to-r from-red-600 to-red-500 text-white hover:opacity-95' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`
                }
                >
                {loading ? <span className="animate-spin">↻</span> : 'COMPLETE ORDER'}
                </button>
            </ReceiptModal2>
          </div>
        </div> 
      </div>
    </div>
  );
};

export default Pos;