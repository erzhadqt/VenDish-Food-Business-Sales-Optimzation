import React, { useState, useEffect, useMemo } from "react";
import { Tag, Trash2, ShoppingBag, User, X } from "lucide-react"; 
import { FaExclamationCircle } from "react-icons/fa"; 
import { useLocation } from "react-router-dom";

import api from "../../api";
import ReceiptModal2 from "../../Components/ReceiptModal2";
import VoidConfirmDialog from "../../Components/VoidConfirmDialog";
import CustomerCouponModal from "../../Components/CustomerCouponModal";
import GCashPaymentModal from "../../Components/GCashPaymentModal";
import ManageGcashInfoDialog from "../../Components/ManageGcashInfoDialog";
import { SelectDiscount } from "../../Components/SelectDiscount";
import AlertModal from "../../Components/AlertModal";
import { Skeleton } from "../../Components/ui/skeleton";

const POS_STORAGE_KEYS = {
  cart: "pos_cartItems",
  promoCode: "pos_promoCode",
  appliedCoupons: "pos_appliedCoupons",
  gcashPending: "pos_gcash_pending",
};

const Pos = () => {
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDiscount, setSelectedDiscount] = useState(null); 
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem(POS_STORAGE_KEYS.cart);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Error loading cart from storage", error);
      return [];
    }
  });
  const [cash, setCash] = useState("");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["All"]);

  const [maxCoupons, setMaxCoupons] = useState(2);
  
  // --- CUSTOMER SEARCH STATES ---
  const [users, setUsers] = useState([]); 
  const [selectedCustomer, setSelectedCustomer] = useState(null); 
  const [customerCoupons, setCustomerCoupons] = useState([]);
  const [customerCouponsLoading, setCustomerCouponsLoading] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [receiptDetails, setReceiptDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  const [promoCode, setPromoCode] = useState(() => {
    try {
      return localStorage.getItem(POS_STORAGE_KEYS.promoCode) || "";
    } catch (error) {
      console.error("Error loading promo code from storage", error);
      return "";
    }
  });
  
  const [appliedCoupons, setAppliedCoupons] = useState(() => {
    try {
      const savedCoupons = localStorage.getItem(POS_STORAGE_KEYS.appliedCoupons);
      const parsedCoupons = savedCoupons ? JSON.parse(savedCoupons) : [];
      return Array.isArray(parsedCoupons) ? parsedCoupons : [];
    } catch (error) {
      console.error("Error loading applied coupons from storage", error);
      return [];
    }
  });
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [gcashAccountName, setGcashAccountName] = useState("KUYA VINCE KARINDERYA");
  const [gcashAccountNumber, setGcashAccountNumber] = useState("+63 912-345-XXXX");

  const [gcashModalOpen, setGcashModalOpen] = useState(false);
  const [gcashCheckoutUrl, setGcashCheckoutUrl] = useState("");
  const [gcashTransactionId, setGcashTransactionId] = useState(null);
  const [gcashReference, setGcashReference] = useState("");
  const [gcashStatus, setGcashStatus] = useState("PENDING");
  
  // NEW: State to queue the receipt to open AFTER GCash modal is closed
  const [pendingGcashReceipt, setPendingGcashReceipt] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    setGcashAccountName(localStorage.getItem("GCASH_ACCOUNT_NAME") || "KUYA VINCE KARINDERYA");
    setGcashAccountNumber(localStorage.getItem("GCASH_ACCOUNT_NUMBER") || "+63 912-345-XXXX");
  }, [gcashModalOpen]);

  const [alertConfig, setAlertConfig] = useState({
    open: false,
    title: "",
    description: ""
  });

  const triggerAlert = (title, description) => {
    setAlertConfig({
      open: true,
      title,
      description
    });
  };

  const discountOptions = [
    { value: "senior", label: "Senior Citizen (20%)" },
    { value: "pwd", label: "PWD (20%)" },
    { value: "none", label: "No Discount" },
  ];

  useEffect(() => {
    localStorage.setItem(POS_STORAGE_KEYS.cart, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(POS_STORAGE_KEYS.promoCode, promoCode);
  }, [promoCode]);

  useEffect(() => {
    localStorage.setItem(POS_STORAGE_KEYS.appliedCoupons, JSON.stringify(appliedCoupons));
  }, [appliedCoupons]);

  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [prodRes, userRes, settingsRes, catRes] = await Promise.all([
            api.get("/firstapp/products/"),
            api.get("/firstapp/users/"),
            api.get("/settings/"),
            api.get("/firstapp/categories/")
        ]);
        setProducts(prodRes.data);
        setUsers(userRes.data);
        if (settingsRes.data.max_coupons_per_order !== undefined) {
             setMaxCoupons(settingsRes.data.max_coupons_per_order);
        }
        if (catRes.data && Array.isArray(catRes.data)) {
          const catNames = catRes.data.map(c => c.name).filter(Boolean);
          setCategories(["All", ...catNames]);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const filteredFoods = selectedCategory === "All" ? products : products.filter((food) => food.category === selectedCategory);

  const selectedCustomerInfo = useMemo(
    () => users.find((user) => user.id === selectedCustomer) || null,
    [users, selectedCustomer]
  );

  const handleSelectCustomer = (user) => {
      if (selectedCustomer !== user.id) {
        setAppliedCoupons([]);
        setPromoCode("");
        setCouponError("");
      }
      setSelectedCustomer(user.id);
  };

  const handleClearCustomer = () => {
      setSelectedCustomer(null);
      setCustomerCoupons([]);
      setAppliedCoupons([]);
      setPromoCode("");
      setCouponError("");
  };

  useEffect(() => {
    const fetchCustomerCoupons = async () => {
      if (!selectedCustomer) {
        setCustomerCoupons([]);
        return;
      }

      setCustomerCouponsLoading(true);
      try {
        const response = await api.get(`/firstapp/users/${selectedCustomer}/claimed-coupons/`);
        setCustomerCoupons(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to fetch customer claimed coupons:", error);
        setCustomerCoupons([]);
      } finally {
        setCustomerCouponsLoading(false);
      }
    };

    fetchCustomerCoupons();
  }, [selectedCustomer]);

  const applyClaimedCoupon = (coupon) => {
    if (!selectedCustomer) {
      setCouponError("Select a customer first. Coupons are tied to user accounts.");
      return;
    }

    if (appliedCoupons.length >= maxCoupons) {
      setCouponError(`Maximum of ${maxCoupons} coupons allowed per order.`);
      return;
    }

    if (appliedCoupons.some((existing) => existing.id === coupon.id)) {
      setCouponError("This coupon is already applied!");
      return;
    }

    if (coupon.is_used) {
      setCouponError("This coupon was already used by the selected customer.");
      return;
    }

    if (coupon.status === 'Expired') {
      setCouponError("Coupon is Expired");
      return;
    }

    if (coupon.criteria_details && parseFloat(coupon.criteria_details.min_spend) > 0) {
      if (subTotal < parseFloat(coupon.criteria_details.min_spend)) {
        setCouponError(`Minimum spend of ₱${coupon.criteria_details.min_spend} required.`);
        return;
      }
    }

    if (coupon.criteria_details) {
      const criteria = coupon.criteria_details;
      let itemToAutoAdd = null;
      
      if (criteria.discount_type === 'free_item' && criteria.free_product) {
        itemToAutoAdd = criteria.free_product;
      } else if (criteria.target_product) {
        itemToAutoAdd = criteria.target_product;
      }

      if (itemToAutoAdd) {
        autoAddItemToCart(itemToAutoAdd);
      }
    }

    setAppliedCoupons((prev) => [...prev, coupon]);
    setCouponError("");
  };

  const getCurrentProductStock = (productId, fallbackStock = 0) => {
    const liveProduct = products.find((p) => p.id === productId);
    if (!liveProduct) return Number(fallbackStock || 0);
    return Number(liveProduct.stock_quantity || 0);
  };

  const getRemainingServings = (productId, fallbackStock = 0) => {
    const currentStock = getCurrentProductStock(productId, fallbackStock);
    const inCart = cartItems.find((item) => item.id === productId);
    const inCartQty = inCart ? Number(inCart.qty || 0) : 0;
    return Math.max(currentStock - inCartQty, 0);
  };

  const remindIfTenRemaining = (productName, remainingServings) => {
    if (remainingServings === 10) {
      triggerAlert("Low Servings", `${productName} now has only 10 servings remaining.`);
    }
  };

  const handleFoodClick = (food) => {
    const baseStock = getCurrentProductStock(food.id, food.stock_quantity);
    if (baseStock <= 0) {
      return triggerAlert("Unavailable", "This product has no available servings.");
    }

    const exist = cartItems.find((item) => item.id === food.id);
    const nextQty = exist ? exist.qty + 1 : 1;

    if (nextQty > baseStock) {
      return triggerAlert("Serving Limit", `Cannot add more. Only ${baseStock} servings available.`);
    }

    if (exist) {
      setCartItems(cartItems.map((item) => item.id === food.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCartItems([...cartItems, { ...food, qty: 1 }]);
    }

    const remainingServings = baseStock - nextQty;
    remindIfTenRemaining(food.product_name, remainingServings);
  };

  const autoAddItemToCart = (productId) => {
    if (!productId) return;
    const exist = cartItems.find((item) => item.id === productId);
    if (exist) return;

    const product = products.find(p => p.id === productId);
    if (product) {
       if (product.stock_quantity > 0) {
         setCartItems(prev => [...prev, { ...product, qty: 1 }]);
         const remainingServings = Number(product.stock_quantity) - 1;
         remindIfTenRemaining(product.product_name, remainingServings);
       } else {
         setCouponError(`Cannot apply coupon: ${product.product_name} has no available servings.`);
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
    if (appliedCoupons.length === 0) return 0;

    let totalDiscount = 0;

    appliedCoupons.forEach(coupon => {
        if (!coupon.criteria_details) return;
        const criteria = coupon.criteria_details;
        let currentDiscount = 0;
        
        if (criteria.discount_type === 'free_item' && criteria.free_product) {
             const freeItemInCart = cartItems.find(item => item.id === criteria.free_product);
             if (freeItemInCart) {
                 currentDiscount = parseFloat(freeItemInCart.price);
             }
        }
        else if (criteria.target_product) {
            const targetItem = cartItems.find(item => item.id === criteria.target_product);
            if (targetItem) {
                const itemTotal = targetItem.price * targetItem.qty;
                if (criteria.discount_type === 'percentage') {
                    const val = parseFloat(criteria.discount_value);
                    currentDiscount = itemTotal * (val / 100);
                } else if (criteria.discount_type === 'fixed') {
                    const val = parseFloat(criteria.discount_value);
                    currentDiscount = val > itemTotal ? itemTotal : val;
                }
            }
        } 
        else {
            const baseAmount = subTotal - standardDiscount;
            if (criteria.discount_type === 'percentage') {
                const val = parseFloat(criteria.discount_value);
                currentDiscount = baseAmount * (val / 100);
            } 
            else if (criteria.discount_type === 'fixed') {
                currentDiscount = parseFloat(criteria.discount_value);
            } 
        }
        totalDiscount += currentDiscount;
    });

    const remainingTotal = subTotal - standardDiscount;
    return totalDiscount > remainingTotal ? remainingTotal : totalDiscount;
  }, [appliedCoupons, subTotal, cartItems, standardDiscount]);

  const tempTotal = subTotal - standardDiscount - couponDiscountAmount;
  const total = tempTotal > 0 ? tempTotal : 0;
  const change = cash ? (parseFloat(cash) - total).toFixed(2) : 0;

  // 🔴 Strict sanitization for Cash Amount Input (Allows numbers and decimals)
  const handleCashChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setCash(val);
  };

  const handleApplyPromo = async () => {
    if (!selectedCustomer) {
      setCouponError("Select a customer first. Coupons are tied to user accounts.");
      return;
    }

    if (!promoCode.trim()) {
      setCouponError("Please enter a promo code");
      return;
    }

    if (appliedCoupons.length >= maxCoupons) {
      setCouponError(`Maximum of ${maxCoupons} coupons allowed per order.`);
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    
    try {
      const response = await api.get(`/firstapp/coupons/?code=${promoCode.toUpperCase()}`);
      const couponData = Array.isArray(response.data) ? response.data[0] : response.data;

      if (!couponData) {
        setCouponError("Invalid Coupon Code");
        setCouponLoading(false);
        return;
      }

      if (appliedCoupons.some(c => c.id === couponData.id)) {
        setCouponError("This coupon is already applied!");
        setCouponLoading(false);
        return;
      }

      const coupon = couponData;

      const ownedCoupon = customerCoupons.find(c => c.id === coupon.id);
      if (!ownedCoupon) {
        setCouponError("This coupon is not claimed by the selected customer.");
        setCouponLoading(false);
        return;
      }

      if (ownedCoupon.is_used) {
        setCouponError("This coupon was already used by the selected customer.");
        setCouponLoading(false);
        return;
      }
      
      const validStatuses = ['Active', 'active', 'Redeemed', 'redeemed'];
      if (!validStatuses.includes(coupon.status)) {
        setCouponError(`Coupon is ${coupon.status}`);
        setCouponLoading(false);
        return;
      }

      if (coupon.criteria_details && parseFloat(coupon.criteria_details.min_spend) > 0) {
        if (subTotal < parseFloat(coupon.criteria_details.min_spend)) {
            setCouponError(`Minimum spend of ₱${coupon.criteria_details.min_spend} required.`);
            setCouponLoading(false);
            return;
        }
      }

      applyClaimedCoupon({ ...coupon, is_used: ownedCoupon.is_used });
      setPromoCode("");
      
    } catch (error) {
      console.error("Promo check failed", error);
      setCouponError("Error validating coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  useEffect(() => {
    if (appliedCoupons.length === 0) return;

    const validCoupons = appliedCoupons.filter(coupon => {
        if (!coupon.criteria_details) return true;
        const criteria = coupon.criteria_details;

        if (criteria.min_spend > 0 && subTotal < parseFloat(criteria.min_spend)) {
            return false;
        }
        
        if (criteria.discount_type === 'free_item') {
             const hasItem = cartItems.some(i => i.id === criteria.free_product);
             if(!hasItem) return false;
        }

        if (criteria.target_product) {
            const hasItem = cartItems.some(i => i.id === criteria.target_product);
            if(!hasItem) return false;
        }
        return true;
    });

    if (validCoupons.length !== appliedCoupons.length) {
        setAppliedCoupons(validCoupons);
        setCouponError("Some coupons were removed due to cart changes.");
    }

  }, [subTotal, cartItems]); 

  const handleRemoveCoupon = (couponId) => {
    setAppliedCoupons(prev => prev.filter(c => c.id !== couponId));
    setCouponError("");
  };

  const handleVoidItems = async (itemsToVoid) => {
    if (!itemsToVoid || itemsToVoid.length === 0) return;

    const itemsToLog = itemsToVoid.map(v => {
        const originalItem = cartItems.find(i => i.id === v.id);
        return {
            product_id: originalItem?.id,
            product_name: originalItem?.product_name || "Unknown",
            price: originalItem?.price || 0,
            quantity: v.qty 
        };
    });

    try {
        setLoading(true);
        await api.post('/firstapp/receipt/log-void/', {
            items: itemsToLog,
            reason: "Manager Void (Partial/Full)"
        });
        
        const newCart = cartItems.map(item => {
            const voidEntry = itemsToVoid.find(v => v.id === item.id);
            if (voidEntry) {
                return { ...item, qty: item.qty - voidEntry.qty };
            }
            return item;
        }).filter(item => item.qty > 0); 

        setCartItems(newCart);

        if (newCart.length === 0) {
            setCash("");
            setAppliedCoupons([]);
            setPromoCode("");
            setCouponError("");
        }
        triggerAlert("Void Success", "Items voided and recorded in history.");

    } catch (error) {
        console.error("Failed to log void:", error);
        triggerAlert("Void Error", "Failed to record void transaction.");
    } finally {
        setLoading(false);
    }
  };

  const buildReceiptPayload = () => {
    const isCash = paymentMethod === "cash";

    return {
      subtotal: subTotal.toFixed(2),
      vat: vat.toFixed(2),
      total: total.toFixed(2),
      cash_given: isCash ? cash : total.toFixed(2),
      change: isCash ? change : "0.00",
      payment_method: isCash ? "CASH" : "GCASH",
      coupons: appliedCoupons.map(c => c.id),
      discount_type: selectedDiscount !== "none" ? selectedDiscount : null,
      customer_id: selectedCustomer,
      items: cartItems.map((i) => ({
        product: i.id,
        product_name: i.product_name,
        price: i.price,
        quantity: i.qty,
      })),
    };
  };

  const attachPaymentToReceipt = async (transactionId, receiptId) => {
    if (!transactionId || !receiptId) return;
    try {
      await api.post("/firstapp/payments/gcash/attach-receipt/", {
        transaction_id: transactionId,
        receipt_id: receiptId,
      });
    } catch (error) {
      console.error("Failed to attach payment to receipt:", error);
    }
  };

  const openReceiptById = async (receiptId, delayForGcash = false) => {
    if (!receiptId) return;
    try {
      const response = await api.get(`/firstapp/receipt/${receiptId}/`);
      setReceiptDetails(response.data);
      
      if (delayForGcash) {
          setPendingGcashReceipt(true);
      } else {
          setIsReceiptModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to load receipt details:", error);
    }
  };

  const finalizePaidGcashReceipt = async (transactionId, manualReference = "") => {
    setLoading(true);
    try {
      let currentReceiptDetails = receiptDetails;

      // 1. If a receipt hasn't been created by the webhook yet, create it.
      if (!currentReceiptDetails || !currentReceiptDetails.id) {
          const payload = buildReceiptPayload();
          payload.provider_reference = manualReference; 
          const response = await api.post("/firstapp/receipt/", payload);
          currentReceiptDetails = response.data;
      }

      // 2. Inject the manual reference locally so it immediately shows on the UI
      const finalRef = manualReference.trim() || currentReceiptDetails.provider_reference || "";
      const updatedReceipt = {
          ...currentReceiptDetails,
          provider_reference: finalRef
      };
      
      setReceiptDetails(updatedReceipt);
      setPendingGcashReceipt(true);

      // 3. If the receipt was generated by the webhook, try to PATCH the backend to save the manual reference
      if (currentReceiptDetails.id && manualReference.trim()) {
          try {
              await api.patch(`/firstapp/receipt/${currentReceiptDetails.id}/`, {
                  provider_reference: manualReference.trim()
              });
          } catch (e) {
              console.warn("Could not patch reference to backend", e);
          }
      }

      await attachPaymentToReceipt(transactionId, updatedReceipt.receipt_id || updatedReceipt.id);
      localStorage.removeItem(POS_STORAGE_KEYS.gcashPending);
      
      // Close the modal now that we are done -> triggers the Receipt modal to pop up!
      setGcashModalOpen(false); 
      
    } catch (error) {
      console.error("Failed to finalize GCash receipt:", error);
      triggerAlert("Order Finalization Failed", error.response?.data?.error || "Payment succeeded but receipt finalization failed.");
    } finally {
      setLoading(false);
    }
  };

  const checkGcashStatus = async (transactionId, options = { autoFinalize: false, devOverrideOverride: false }) => {
    if (!transactionId) return;
    try {
      const url = options.devOverrideOverride 
        ? `/firstapp/payments/gcash/${transactionId}/status/?dev_override_paid=true`
        : `/firstapp/payments/gcash/${transactionId}/status/`;
      const response = await api.get(url);
      const status = response.data?.status || "PENDING";
      const returnedReceiptId = response.data?.receipt_id;
      setGcashStatus(status);

      if (status === "PAID") {
          if (returnedReceiptId && options.autoFinalize) {
              await openReceiptById(returnedReceiptId, true);
              localStorage.removeItem(POS_STORAGE_KEYS.gcashPending);
          }
      }

      if (["FAILED", "EXPIRED", "CANCELLED"].includes(status)) {
        setGcashModalOpen(false);
        localStorage.removeItem(POS_STORAGE_KEYS.gcashPending);
        triggerAlert("GCash Payment", `Payment status is ${status}.`);
      }
    } catch (error) {
      console.error("Failed to check GCash status:", error);
    }
  };

  const createGcashPayment = async () => {
    const orderPayload = buildReceiptPayload();
    const amountInCentavos = Math.max(Math.round(Number(total || 0) * 100), 1);

    const response = await api.post("/firstapp/payments/gcash/create/", {
      amount: amountInCentavos,
      currency: "PHP",
      description: `VenDish POS Order - ₱${total.toFixed(2)}`,
      customer_id: selectedCustomer,
      order_payload: orderPayload,
    });

    setGcashTransactionId(response.data.transaction_id);
    setGcashCheckoutUrl(response.data.checkout_url || "");
    setGcashReference(response.data.reference || "");
    setGcashStatus(response.data.status || "PENDING");
    setGcashModalOpen(true);

    localStorage.setItem(
      POS_STORAGE_KEYS.gcashPending,
      JSON.stringify({
        transactionId: response.data.transaction_id,
        reference: response.data.reference || "",
        checkoutUrl: response.data.checkout_url || "",
        createdAt: Date.now(),
      })
    );
  };

  useEffect(() => {
    if (!gcashModalOpen || !gcashTransactionId || gcashStatus === "PAID") return;

    const intervalId = setInterval(() => {
      checkGcashStatus(gcashTransactionId, { autoFinalize: true });
    }, 3000);

    return () => clearInterval(intervalId);
  }, [gcashModalOpen, gcashTransactionId, gcashStatus]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("gcash_ref") || params.get("ref");
    if (!ref) return;

    const recoveryKey = `gcash_ref_recovery_${ref}`;
    if (sessionStorage.getItem(recoveryKey)) return;
    sessionStorage.setItem(recoveryKey, "1");

    const recoverByReference = async () => {
      try {
        const response = await api.post("/firstapp/payments/gcash/finalize-by-reference/", { reference: ref });
        const receiptId = response.data?.receipt_id;

        if (receiptId) {
          await openReceiptById(receiptId, false);
          localStorage.removeItem(POS_STORAGE_KEYS.gcashPending);
        }
      } catch (error) {
        console.error("Failed to recover GCash by reference:", error);
      }
    };

    recoverByReference();
  }, [location.search]);

  useEffect(() => {
    try {
      const rawPending = localStorage.getItem(POS_STORAGE_KEYS.gcashPending);
      if (!rawPending) return;

      const pending = JSON.parse(rawPending);
      if (!pending?.transactionId) {
        localStorage.removeItem(POS_STORAGE_KEYS.gcashPending);
        return;
      }

      setPaymentMethod("gcash");
      setGcashTransactionId(pending.transactionId);
      setGcashReference(pending.reference || "");
      setGcashCheckoutUrl(pending.checkoutUrl || "");
      setGcashModalOpen(true);

      checkGcashStatus(pending.transactionId, { autoFinalize: true });
    } catch (error) {
      console.error("Failed to restore pending GCash transaction:", error);
      localStorage.removeItem(POS_STORAGE_KEYS.gcashPending);
    }
  }, []);

  useEffect(() => {
      if (!gcashModalOpen && pendingGcashReceipt && receiptDetails) {
          setIsReceiptModalOpen(true);
          setPendingGcashReceipt(false);
      }
  }, [gcashModalOpen, pendingGcashReceipt, receiptDetails]);

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) return triggerAlert("Empty Cart", "Cart is empty!");
    if (paymentMethod === "cash" && (!cash || parseFloat(cash) < total)) return triggerAlert("Insufficient Cash", "The cash provided is less than the total amount!");
    if (appliedCoupons.length > 0 && !selectedCustomer) {
      return triggerAlert("Customer Required", "Select a customer first. Coupons are tied to user accounts.");
    }
    
    for (const coupon of appliedCoupons) {
        const isCouponLimitReached = coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit;
        if ((coupon.status === 'Redeemed' || isCouponLimitReached)) {
            if (!selectedCustomer) {
                triggerAlert("Coupon Limit", `Coupon ${coupon.code} is sold out. Select a customer.`);
                return;
            }
        }
    }

    setLoading(true);
    try {
      if (paymentMethod === "gcash") {
        await createGcashPayment();
      } else {
        const payload = buildReceiptPayload();
        const response = await api.post("/firstapp/receipt/", payload);
        setReceiptDetails(response.data);
        setIsReceiptModalOpen(true);
      }

    } catch (error) {
      console.error("Submit failed:", error);
      triggerAlert("Order Failed", error.response?.data?.error || "Failed to submit order.");
    } finally {
        setLoading(false);
    }
  };

  const handleResetOrder = () => {
      setCartItems([]);
      setCash("");
      setAppliedCoupons([]); 
      setPromoCode("");
      setCouponError("");
      setSelectedDiscount(null);
      setReceiptDetails(null);
      setSelectedCustomer(null); 
      setCustomerCoupons([]);
      setIsCustomerModalOpen(false);
      setPaymentMethod("cash");
      setGcashModalOpen(false);
      
      setPendingGcashReceipt(false); 
      localStorage.removeItem(POS_STORAGE_KEYS.gcashPending);

      setIsReceiptModalOpen(false);
      
      Promise.all([
        api.get("/firstapp/products/"),
        api.get("/firstapp/categories/")
      ]).then(([prodRes, catRes]) => {
        setProducts(prodRes.data);
        if (catRes.data && Array.isArray(catRes.data)) {
          const catNames = catRes.data.map(c => c.name).filter(Boolean);
          setCategories(["All", ...catNames]);
        }
      });
  };

  return (
    <div className="font-poppins min-h-screen flex flex-col lg:flex-row gap-4 p-4">
        <AlertModal 
            open={alertConfig.open} 
            onOpenChange={(isOpen) => setAlertConfig(prev => ({ ...prev, open: isOpen }))}
            title={alertConfig.title}
            description={alertConfig.description}
        />

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
               {dataLoading && Array.from({ length: 8 }).map((_, index) => (
                <div 
                  key={`skeleton-${index}`} 
                  className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm flex flex-col items-center h-60"
                >
                  <Skeleton className="w-full h-32 mb-2 rounded-lg" />
                  <Skeleton className="h-5 w-3/4" />
                  <div className="flex-1"></div>
                  <div className="w-full flex justify-between items-end border-t pt-2 mt-1">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
               ))}

               {!dataLoading && filteredFoods.map((food) => (
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
                    
                    {getRemainingServings(food.id, food.stock_quantity) > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                        Servings: {getRemainingServings(food.id, food.stock_quantity)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        Unavailable
                      </span>
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
                
                <div className="mb-3 border rounded-md bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 flex items-center gap-2">
                      <User size={15} className={selectedCustomer ? "text-green-600" : "text-gray-400"} />
                      {selectedCustomerInfo ? (
                        <span className="font-medium">
                          {(selectedCustomerInfo.first_name || selectedCustomerInfo.username) + (selectedCustomerInfo.last_name ? ` ${selectedCustomerInfo.last_name}` : "")}
                        </span>
                      ) : (
                        <span className="text-gray-400">No customer selected</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedCustomer && (
                        <button
                          type="button"
                          onClick={handleClearCustomer}
                          className="text-xs px-2 py-1 rounded border text-gray-600 hover:bg-gray-50"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsCustomerModalOpen(true)}
                        className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Select User & Coupons
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 mb-4 text-sm text-gray-600">
                    <div className="flex justify-between"><span>Subtotal</span><span>₱{subTotal.toFixed(2)}</span></div>
                    {selectedDiscount !== "none" && selectedDiscount && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({selectedDiscount})</span>
                        <span>-₱{standardDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {appliedCoupons.length > 0 && (
                      <div className="flex justify-between text-blue-600 font-medium bg-blue-50 p-1 rounded">
                        <span className="flex items-center gap-1"><Tag size={12}/> Promos ({appliedCoupons.length})</span>
                        <span>-₱{couponDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-xl text-gray-900 border-t pt-2 mt-2">
                      <span>Total</span>
                      <span>₱{total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm font-medium"
                  >
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash</option>
                  </select>

                  <SelectDiscount 
                    options={discountOptions} 
                    onSelect={setSelectedDiscount} 
                    placeholder="Discount Type"
                  />

                  {paymentMethod === "cash" ? (
                  <div className="relative col-span-2">
                    <span className="absolute left-3 top-2 text-gray-400">₱</span>
                    {/* 🔴 Updated Cash Input Field */}
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={cash} 
                      onChange={handleCashChange} 
                      className="w-full pl-6 pr-2 py-2 border rounded-md text-right font-bold focus:ring-2 focus:ring-green-500 outline-none" 
                      placeholder="CASH AMOUNT"
                      maxLength={20}
                    />
                  </div>
                  ) : (
                    <div className="w-full px-3 py-2 border rounded-md text-sm font-semibold text-green-700 bg-green-50 text-right col-span-2">
                      GCash Amount to Pay: ₱{total.toFixed(2)}
                    </div>
                      )}
                </div>

                <div className="flex gap-2 mb-2">
                    <input 
                      value={promoCode} 
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())} 
                      onKeyPress={(e) => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="PROMO CODE" 
                      maxLength={8}
                      className={`flex-1 border rounded-md px-3 py-2 uppercase text-sm outline-none focus:ring-2 transition ${couponError ? 'border-red-300 focus:ring-red-200' : 'focus:ring-blue-200'}`} 
                    />
                    <button 
                        onClick={handleApplyPromo}
                        disabled={couponLoading || !promoCode.trim()}
                        className={`px-3 py-2 rounded text-xs font-bold uppercase transition ${
                          couponLoading || !promoCode.trim()
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-800 text-white hover:bg-gray-900'
                        }`}
                      >
                        {couponLoading ? '...' : 'Apply'}
                    </button>
                </div>
                
                {appliedCoupons.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {appliedCoupons.map((coupon, index) => (
                            <div key={coupon.id} className="bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 text-xs font-bold flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                    <Tag size={10}/> {coupon.code}
                                </span>
                                <button 
                                    onClick={() => handleRemoveCoupon(coupon.id)}
                                    className="hover:text-red-500 rounded-full hover:bg-blue-100 p-0.5"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {couponError && (
                  <div className="text-xs text-red-500 flex items-center gap-1 mb-2">
                    <FaExclamationCircle/> {couponError}
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
                  disabled={loading || (paymentMethod === "cash" && parseFloat(cash || 0) < total) || cartItems.length === 0}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                    (paymentMethod === "gcash" || parseFloat(cash || 0) >= total) && cartItems.length > 0
                        ? 'bg-red-600 hover:bg-red-700 shadow-lg' 
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                  {loading ? "Processing..." : paymentMethod === "gcash" ? "PAY VIA GCASH" : "PAY & PRINT"}
                </button>

             </div>
        </div>

        <CustomerCouponModal
          open={isCustomerModalOpen}
          onOpenChange={setIsCustomerModalOpen}
          users={users}
          selectedCustomerId={selectedCustomer}
          onSelectCustomer={handleSelectCustomer}
          onClearCustomer={handleClearCustomer}
          customerCoupons={customerCoupons}
          customerCouponsLoading={customerCouponsLoading}
          appliedCoupons={appliedCoupons}
          onApplyCoupon={applyClaimedCoupon}
        />

        <GCashPaymentModal
          open={gcashModalOpen}
          onOpenChange={setGcashModalOpen}
          checkoutUrl={gcashCheckoutUrl}
          status={gcashStatus}
          reference={gcashReference}
          amount={total} 
          accountName={gcashAccountName}
          accountNumber={gcashAccountNumber}
          onRefresh={() => checkGcashStatus(gcashTransactionId, { autoFinalize: false })}
          onFinalize={(manualRef) => finalizePaidGcashReceipt(gcashTransactionId, manualRef)}
          onCancel={() => {
            setGcashModalOpen(false); // Closes the modal
            localStorage.removeItem(POS_STORAGE_KEYS.gcashPending); // Deletes the saved pending state so it doesn't pop up on refresh
          }}
          onDevOverride={() => checkGcashStatus(gcashTransactionId, { autoFinalize: true, devOverrideOverride: true })}
        />
    </div>
  );
};

export default Pos;