import React, { useState, useEffect, useMemo, useRef } from "react";
import { Tag, Trash2, ShoppingBag, User, Search, X } from "lucide-react"; 
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa"; 

import api from "../../api";
import ReceiptModal2 from "../../Components/ReceiptModal2";
import VoidConfirmDialog from "../../Components/VoidConfirmDialog";
import { SelectDiscount } from "../../Components/SelectDiscount";

const Pos = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDiscount, setSelectedDiscount] = useState(null); 
  const [cartItems, setCartItems] = useState([]);
  const [cash, setCash] = useState("");
  const [products, setProducts] = useState([]);
  
  // --- CUSTOMER SEARCH STATES ---
  const [users, setUsers] = useState([]); 
  const [selectedCustomer, setSelectedCustomer] = useState(null); 
  const [customerSearch, setCustomerSearch] = useState(""); // Input text
  const [showCustomerResults, setShowCustomerResults] = useState(false); // Dropdown visibility
  const searchRef = useRef(null);

  const [receiptDetails, setReceiptDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const discountOptions = [
    { value: "senior", label: "Senior Citizen (20%)" },
    { value: "pwd", label: "PWD (20%)" },
    { value: "none", label: "No Discount" },
  ];

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowCustomerResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodRes, userRes] = await Promise.all([
            api.get("/firstapp/products/"),
            api.get("/firstapp/users/") 
        ]);
        setProducts(prodRes.data);
        setUsers(userRes.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const filteredFoods = selectedCategory === "All" ? products : products.filter((food) => food.category === selectedCategory);

  // --- FILTER CUSTOMERS LOGIC ---
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return users.slice(0, 5); // Show first 5 if empty
    const lowerQ = customerSearch.toLowerCase();
    return users.filter(u => 
        u.username.toLowerCase().includes(lowerQ) ||
        (u.first_name && u.first_name.toLowerCase().includes(lowerQ)) ||
        (u.last_name && u.last_name.toLowerCase().includes(lowerQ))
    ).slice(0, 10); // Limit results
  }, [users, customerSearch]);

  const handleSelectCustomer = (user) => {
      setSelectedCustomer(user.id);
      setCustomerSearch(`${user.first_name} ${user.last_name} (${user.username})`.trim());
      setShowCustomerResults(false);
  };

  const handleClearCustomer = () => {
      setSelectedCustomer(null);
      setCustomerSearch("");
      setShowCustomerResults(false);
  };

  const handleFoodClick = (food) => {
    if (!food.track_stock && !food.is_available) {
        return alert("This product is currently unavailable!");
    }
    if (food.track_stock && food.stock_quantity <= 0) {
        return alert("This item is currently Out of Stock.");
    }

    const exist = cartItems.find((item) => item.id === food.id);

    if (exist) {
      if (food.track_stock && exist.qty + 1 > food.stock_quantity) {
          return alert(`Cannot add more. Only ${food.stock_quantity} units available.`);
      }
      setCartItems(cartItems.map((item) => item.id === food.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCartItems([...cartItems, { ...food, qty: 1 }]);
    }
  };

  const handleRemove = (food) => {
    const exist = cartItems.find((item) => item.id === food.id);
    if (exist.qty === 1) {
      setCartItems(cartItems.filter((item) => item.id !== food.id));
    } else {
      setCartItems(cartItems.map((item) => item.id === food.id ? { ...item, qty: item.qty - 1 } : item));
    }
  };

  const autoAddItemToCart = (productId) => {
    if (!productId) return;
    const exist = cartItems.find((item) => item.id === productId);
    if (exist) return; 

    const product = products.find(p => p.id === productId);
    if (product) {
       if (product.track_stock) {
            if (product.stock_quantity > 0) {
                setCartItems(prev => [...prev, { ...product, qty: 1 }]);
            } else {
                setCouponError(`Cannot apply coupon: Free item (${product.product_name}) is out of stock.`);
                setAppliedCoupon(null);
            }
       } else {
           if (product.is_available) {
               setCartItems(prev => [...prev, { ...product, qty: 1 }]);
           } else {
               setCouponError(`Cannot apply coupon: The required item (${product.product_name}) is unavailable.`);
               setAppliedCoupon(null);
           }
       }
    }
  };

  const subTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const vat = subTotal - (subTotal * 0.88); 

  const standardDiscount = useMemo(() => {
      if (selectedDiscount === "senior" || selectedDiscount === "pwd") return subTotal * 0.20;
      return 0;
  }, [selectedDiscount, subTotal]);

  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon || !appliedCoupon.criteria_details) return 0;
    const criteria = appliedCoupon.criteria_details;
    let discount = 0;
    const targetId = criteria.target_product; 
    
    if (targetId) {
        const targetItem = cartItems.find(item => item.id === targetId);
        if (!targetItem) return 0;
        const itemTotal = targetItem.price * targetItem.qty;
        if (criteria.discount_type === 'percentage') {
             const val = parseFloat(criteria.discount_value);
             discount = itemTotal * (val / 100);
        } else if (criteria.discount_type === 'fixed') {
             const val = parseFloat(criteria.discount_value);
             discount = val > itemTotal ? itemTotal : val;
        }
    } else {
        const baseAmount = subTotal - standardDiscount;
        if (criteria.discount_type === 'percentage') {
            const val = parseFloat(criteria.discount_value);
            discount = baseAmount * (val / 100);
        } 
        else if (criteria.discount_type === 'fixed') {
            discount = parseFloat(criteria.discount_value);
        } 
        else if (criteria.discount_type === 'free_item' && criteria.free_product) {
            const freeItemInCart = cartItems.find(item => item.id === criteria.free_product);
            if (freeItemInCart) discount = parseFloat(freeItemInCart.price);
        }
    }
    const remainingTotal = subTotal - standardDiscount;
    return discount > remainingTotal ? remainingTotal : discount;
  }, [appliedCoupon, subTotal, cartItems, standardDiscount]);

  const tempTotal = subTotal - standardDiscount - couponDiscountAmount;
  const total = tempTotal > 0 ? tempTotal : 0;
  const change = cash ? (parseFloat(cash) - total).toFixed(2) : 0;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setCouponError("Please enter a promo code");
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    
    try {
      const response = await api.get(`/firstapp/coupons/?code=${promoCode.toUpperCase()}`);
      const couponData = Array.isArray(response.data) ? response.data[0] : response.data;

      if (!couponData) {
        setCouponError("Invalid Coupon Code");
        setAppliedCoupon(null);
        setCouponLoading(false);
        return;
      }

      const coupon = couponData;

      // -------------------------------------------------------------
      // FIXED: Check usage limit vs times used (Static Limit Logic)
      // -------------------------------------------------------------
      const isSoldOut = coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit;

      if (isSoldOut) {
          if (!selectedCustomer) {
              setCouponError("Coupon limit reached (Sold Out). Only reserved users allowed.");
              setAppliedCoupon(null);
              setCouponLoading(false);
              return;
          }
      }
      
      const validStatuses = ['Active', 'active', 'Redeemed', 'redeemed'];
      if (!validStatuses.includes(coupon.status)) {
        setCouponError(`Coupon is ${coupon.status}`);
        setAppliedCoupon(null);
        setCouponLoading(false);
        return;
      }

      if (coupon.criteria_details) {
        const criteria = coupon.criteria_details;
        const baseAmount = subTotal - standardDiscount;

        let itemToAutoAdd = null;
        if (criteria.target_product) {
            itemToAutoAdd = criteria.target_product;
        } else if (criteria.discount_type === 'free_item' && criteria.free_product) {
            itemToAutoAdd = criteria.free_product;
        }

        if (itemToAutoAdd) {
            autoAddItemToCart(itemToAutoAdd);
        }
      }

      setAppliedCoupon(coupon);
      setPromoCode(""); 
      setCouponError("");
      
    } catch (error) {
      console.error("Promo check failed", error);
      setCouponError("Error validating coupon");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  useEffect(() => {
    if (appliedCoupon && appliedCoupon.criteria_details) {
        const criteria = appliedCoupon.criteria_details;
        
        if (criteria.min_spend > 0 && subTotal < parseFloat(criteria.min_spend)) {
            setAppliedCoupon(null);
            setCouponError(`Coupon removed: Spend fell below ₱${criteria.min_spend}`);
            return;
        }
        
        if (criteria.discount_type === 'free_item') {
             const hasItem = cartItems.some(i => i.id === criteria.free_product);
             if(!hasItem) {
                 setAppliedCoupon(null);
                 setCouponError("Coupon removed: Free item was removed from cart.");
                 return;
             }
        }

        if (criteria.target_product) {
            const hasItem = cartItems.some(i => i.id === criteria.target_product);
            if(!hasItem) {
                setAppliedCoupon(null);
                setCouponError("Coupon removed: Targeted product was removed from cart.");
                return;
            }
       }
    }
  }, [subTotal, cartItems, appliedCoupon]);

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setPromoCode("");
    setCouponError("");
  };

  const handleVoidItems = async (itemsToRemoveIds) => {
    if (!itemsToRemoveIds || itemsToRemoveIds.length === 0) return;

    const itemsToLog = cartItems
        .filter(item => itemsToRemoveIds.includes(item.id))
        .map(item => ({
            product_id: item.id,
            product_name: item.product_name,
            price: item.price,
            quantity: item.qty
        }));

    try {
        setLoading(true);
        await api.post('/firstapp/receipt/log-void/', {
            items: itemsToLog,
            reason: "Manager Void (Cart Selection)"
        });
        
        const newCart = cartItems.filter(item => !itemsToRemoveIds.includes(item.id));
        setCartItems(newCart);

        if (newCart.length === 0) {
            setCash("");
            setAppliedCoupon(null);
            setPromoCode("");
        }
        alert("Items voided and recorded in history.");

    } catch (error) {
        console.error("Failed to log void:", error);
        alert("Failed to record void transaction.");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return alert("Cart is empty!");
    if (!cash || parseFloat(cash) < total) return alert("Insufficient cash!");
    
    // -------------------------------------------------------------
    // FIXED: Check limit vs times used before submit
    // -------------------------------------------------------------
    const isCouponLimitReached = appliedCoupon && 
                                 appliedCoupon.usage_limit !== null && 
                                 appliedCoupon.times_used >= appliedCoupon.usage_limit;

    if (appliedCoupon && (appliedCoupon.status === 'Redeemed' || isCouponLimitReached)) {
        if (!selectedCustomer) {
            alert("This coupon is sold out. You MUST select a registered customer who claimed it to proceed.");
            return;
        }
    }

    setLoading(true);
    const payload = {
      subtotal: subTotal.toFixed(2),
      vat: vat.toFixed(2),
      total: total.toFixed(2), 
      cash_given: cash,
      change,
      coupon: appliedCoupon ? appliedCoupon.id : null, 
      discount_type: selectedDiscount !== "none" ? selectedDiscount : null,
      
      customer_id: selectedCustomer, // Send selected ID

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
      setIsReceiptModalOpen(true);

    } catch (error) {
      console.error("Submit failed:", error);
      alert(error.response?.data?.error || "Failed to submit order.");
    } finally {
        setLoading(false);
    }
  };

  const handleResetOrder = () => {
      setCartItems([]);
      setCash("");
      setAppliedCoupon(null);
      setPromoCode("");
      setCouponError("");
      setSelectedDiscount(null);
      setReceiptDetails(null);
      
      // Reset Customer Selection
      setSelectedCustomer(null); 
      setCustomerSearch("");

      setIsReceiptModalOpen(false);
      api.get("/firstapp/products/").then(res => setProducts(res.data));
  };

  return (
    <div className="font-poppins bg-zinc-300 min-h-screen flex flex-col lg:flex-row gap-4 p-4">
        {/* LEFT: MENU */}
        <div className="flex-1 bg-gray-100 rounded-xl shadow-md flex flex-col h-[calc(100vh-2rem)]">
            <div className="p-4 border-b bg-white rounded-t-xl">
             <h3 className="text-2xl font-bold text-gray-800">Menu</h3>
             <div className="flex gap-2 mt-3 overflow-x-auto pb-2 custom-scrollbar">
                {categories.map((category) => (
                  <button 
                    key={category} 
                    onClick={() => setSelectedCategory(category)} 
                    className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full border transition-all ${selectedCategory === category ? "bg-red-600 text-white border-red-600 shadow-md" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                  >
                    {category}
                  </button>
                ))}
             </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {filteredFoods.map((food) => (
                <div 
                  key={food.id} 
                  onClick={() => handleFoodClick(food)} 
                  className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm hover:shadow-lg hover:border-red-200 transition cursor-pointer flex flex-col items-center group relative overflow-hidden h-60"
                >
                    <div className="w-full h-32 mb-2 overflow-hidden rounded-lg bg-gray-200">
                       {food.image ? (
                         <img src={food.image} alt={food.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> 
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                       )}
                    </div>
                    <h4 className="font-bold text-gray-800 text-center text-md line-clamp-1 w-full">{food.product_name}</h4>
                    <div className="flex-1"></div>
                    
                    <div className="w-full flex justify-between items-end border-t pt-2 mt-1">
                       <span className="text-red-600 font-bold">₱{food.price}</span>
                       
                       {food.track_stock ? (
                           food.stock_quantity > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                                   Stock: {food.stock_quantity}
                                </span>
                           ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                   Out of Stock
                                </span>
                           )
                       ) : (
                           food.is_available ? (
                             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">Available</span>
                           ) : (
                             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">Unavailable</span>
                           )
                       )}
                    </div>
                </div>
               ))}
             </div>
           </div>
        </div>

        {/* RIGHT: ORDER SUMMARY */}
        <div className="w-full lg:w-[400px] bg-white rounded-xl shadow-lg flex flex-col h-[calc(100vh-2rem)]">
             
             <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><ShoppingBag size={20} /> Current Order</h3>
                
                {cartItems.length > 0 && (
                     <VoidConfirmDialog 
                        cartItems={cartItems}
                        onConfirm={handleVoidItems}
                        trigger={
                            <button className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Void Items">
                                <Trash2 size={18} />
                            </button>
                        }
                     />
                )}
             </div>

             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                      <ShoppingBag size={48} className="mb-2" />
                      <p>No items added</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cartItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-start bg-gray-50 p-3 rounded-lg">
                                <div>
                                  <div className="font-medium text-gray-800">{item.product_name}</div>
                                  <div className="text-xs text-gray-500">
                                    ₱{item.price} x {item.qty}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold">₱{(item.price * item.qty).toFixed(2)}</span>
                                    <div className="flex items-center gap-2 bg-white border rounded px-2">
                                        <button onClick={() => handleRemove(item)} className="text-red-500 font-bold px-1 hover:bg-red-200 rounded">-</button>
                                        <span className="text-sm font-bold">{item.qty}</span>
                                        <button onClick={() => handleFoodClick(item)} className="text-green-600 font-bold px-1 hover:bg-green-200 rounded">+</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>

             <div className="p-5 bg-gray-50 border-t shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10 rounded-b-xl">
                
                {/* --- UPDATED: SEARCHABLE CUSTOMER INPUT --- */}
                <div className="mb-3 relative" ref={searchRef}>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Customer (Optional)</label>
                    <div className="relative">
                        <div className="absolute left-3 top-2.5 text-gray-400">
                            {selectedCustomer ? <User size={16} className="text-green-600" /> : <Search size={16} />}
                        </div>
                        
                        <input 
                            type="text"
                            placeholder="Search customer name or ID..."
                            value={customerSearch}
                            onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                setShowCustomerResults(true);
                                if(e.target.value === "") setSelectedCustomer(null);
                            }}
                            onFocus={() => setShowCustomerResults(true)}
                            className={`w-full pl-9 pr-8 py-2 border rounded-md text-sm outline-none focus:ring-2 transition ${selectedCustomer ? 'border-green-500 ring-green-100 bg-green-50' : 'focus:ring-blue-100'}`}
                        />

                        {customerSearch && (
                            <button 
                                onClick={handleClearCustomer}
                                className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Results Dropdown */}
                    {showCustomerResults && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-20">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectCustomer(user)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                    >
                                        <div className="bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-800">
                                                {user.first_name || user.username} {user.last_name}
                                            </div>
                                            <div className="text-xs text-gray-500">@{user.username}</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-sm text-gray-400 text-center">No customers found</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-1 mb-4 text-sm text-gray-600">
                    <div className="flex justify-between"><span>Subtotal</span><span>₱{subTotal.toFixed(2)}</span></div>
                    {selectedDiscount !== "none" && selectedDiscount && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({selectedDiscount})</span>
                        <span>-₱{standardDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="flex justify-between text-blue-600 font-medium bg-blue-50 p-1 rounded">
                        <span className="flex items-center gap-1"><Tag size={12}/> {appliedCoupon.code}</span>
                        <span>-₱{couponDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-xl text-gray-900 border-t pt-2 mt-2">
                      <span>Total</span>
                      <span>₱{total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                      <SelectDiscount options={discountOptions} onSelect={setSelectedDiscount} placeholder="Discount Type"/>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400">₱</span>
                         <input 
                           type="number" 
                           value={cash} 
                           onChange={(e) => setCash(e.target.value)} 
                           className="w-full pl-6 pr-2 py-2 border rounded-md text-right font-bold focus:ring-2 focus:ring-green-500 outline-none" 
                           placeholder="CASH"
                         />
                      </div>
                </div>

                <div className="flex gap-2 mb-2">
                    <input 
                      value={promoCode} 
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
                      onKeyPress={(e) => e.key === 'Enter' && !appliedCoupon && handleApplyPromo()}
                      placeholder="PROMO CODE" 
                      className={`flex-1 border rounded-md px-3 py-2 uppercase text-sm outline-none focus:ring-2 transition ${couponError ? 'border-red-300 focus:ring-red-200' : 'focus:ring-blue-200'}`} 
                      disabled={!!appliedCoupon}
                    />
                    {appliedCoupon ? (
                      <button 
                        onClick={handleRemoveCoupon} 
                        className="bg-red-100 text-red-600 px-3 py-2 rounded text-xs font-bold uppercase hover:bg-red-200 transition"
                      >
                        Remove
                      </button>
                    ) : (
                      <button 
                        onClick={handleApplyPromo}
                        disabled={couponLoading || !promoCode.trim()}
                        className={`px-3 py-2 rounded text-xs font-bold uppercase transition ${
                          couponLoading || !promoCode.trim()
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-800 text-white hover:bg-gray-900'
                        }`}
                      >
                        {couponLoading ? 'Loading...' : 'Apply'}
                      </button>
                    )}
                </div>

                {couponError && (
                  <div className="text-xs text-red-500 flex items-center gap-1 mb-2">
                    <FaExclamationCircle/> {couponError}
                  </div>
                )}
                {appliedCoupon && !couponError && (
                  <div className="text-xs text-green-600 flex items-center gap-1 mb-2">
                    <FaCheckCircle/> Applied: {appliedCoupon.criteria_details?.name || appliedCoupon.code}
                  </div>
                )}

                <div className="flex justify-between text-sm font-medium text-gray-500 mb-3">
                  <span>Change:</span>
                  <span className={change < 0 ? 'text-red-500' : 'text-gray-900'}>₱{change}</span>
                </div>

                <ReceiptModal2 
                   title="Order Receipt" 
                   receiptDetails={receiptDetails} 
                   onConfirm={handleResetOrder} 
                   open={isReceiptModalOpen}
                   onOpenChange={setIsReceiptModalOpen}
                />

                <button 
                    onClick={handleSubmitOrder}
                    disabled={loading || parseFloat(cash || 0) < total || cartItems.length === 0}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                        parseFloat(cash || 0) >= total && cartItems.length > 0
                        ? 'bg-red-600 hover:bg-red-700 shadow-lg' 
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                    {loading ? "Processing..." : "PAY & PRINT"}
                </button>

             </div>
        </div>
    </div>
  );
};

export default Pos;