import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Searchbar from "../../Components/Searchbar";
import api from "../../api";
import { EditIcon, PlusSquareIcon, ListIcon, Settings, LockKeyhole, QrCodeIcon, PhilippinePeso, LayoutGrid, X, ArchiveIcon, LucideForkKnifeCrossed, CookingPotIcon } from "lucide-react";

import EditProductDialog from "../../Components/EditProductDialog";
import SuccessAlert from "../../Components/SuccessAlert";
import AddProductDialog from "../../Components/AddProductDialog";
import ManageCategoryDialog from "../../Components/ManageCategoryDialog";
import ChangeVoidPinDialog from "../../Components/ChangeVoidPinDialog";
import ManageGcashInfoDialog from "../../Components/ManageGcashInfoDialog";
import ManagePosBalanceDialog from "../../Components/ManagePosBalanceDialog"; 
import ManageServingsDialog from "../../Components/ManageServingsDialog";
import ManageArchivedProductsDialog from "../../Components/ManageArchivedProductsDialog";
import ManageProductsDialog from "../../Components/ManageProductsDialog";
import { Skeleton } from "../../Components/ui/skeleton";

const UNCATEGORIZED_FILTER_VALUE = "__uncategorized__";

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [gcashInfoModalOpen, setGcashInfoModalOpen] = useState(false);
  const [posBalanceModalOpen, setPosBalanceModalOpen] = useState(false);
  const [manageServingsOpen, setManageServingsOpen] = useState(false);
  const [manageProductsOpen, setManageProductsOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  // 🔴 NEW: Initialize state from URL first (for shared links), then localStorage (for persistence)
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get("search") !== null 
      ? searchParams.get("search") 
      : localStorage.getItem("productList_search") || "";
  });

  const [filterCategory, setFilterCategory] = useState(() => {
    return searchParams.get("category") !== null 
      ? searchParams.get("category") 
      : localStorage.getItem("productList_category") || "";
  });

  // 🔴 NEW: Save to localStorage whenever search or category changes
  useEffect(() => {
    localStorage.setItem("productList_search", searchQuery);
    localStorage.setItem("productList_category", filterCategory);
  }, [searchQuery, filterCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/firstapp/categories/");
      const formattedCategories = res.data.map(c => ({
        value: c.name, 
        label: c.name
      }));

      const categoryOptions = [...formattedCategories];
      if (!categoryOptions.some((category) => category.value === UNCATEGORIZED_FILTER_VALUE)) {
        categoryOptions.push({
          value: UNCATEGORIZED_FILTER_VALUE,
          label: "Uncategorized",
        });
      }

      setCategories(categoryOptions);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  const fetchProducts = useCallback((query = "", category = "") => {
    setLoading(true);

    let url = `/firstapp/products/?search=${query}`;
    if (category) {
      if (category === UNCATEGORIZED_FILTER_VALUE) {
        url += "&uncategorized=true";
      } else {
        url += `&category__name=${category}`;
      }
    }

    api
      .get(url)
      .then((res) => {
        // 🔴 NEW: Sort products alphabetically by product_name
        const sortedProducts = res.data.sort((a, b) => 
          a.product_name.localeCompare(b.product_name, undefined, { sensitivity: 'base' })
        );
        
        setProducts(sortedProducts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 🔴 NEW: Update local state, URL, and trigger a re-fetch
  const handleSearch = useCallback((query, category) => {
    const newQuery = query || "";
    const newCat = category || "";

    setSearchQuery(newQuery);
    setFilterCategory(newCat);

    // Update URL Params
    const params = {};
    if (newQuery) params.search = newQuery;
    if (newCat) params.category = newCat;
    setSearchParams(params);
  }, [setSearchParams]);

  // 🔴 NEW: Listens to the local states instead of URL parameters directly
  useEffect(() => {
    fetchProducts(searchQuery, filterCategory);
  }, [searchQuery, filterCategory, fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 🔴 NEW: Uses the persistent states when refreshing after an update
  const handleUpdatedProduct = useCallback(() => {
    fetchProducts(searchQuery, filterCategory);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  }, [searchQuery, filterCategory, fetchProducts]);

  useEffect(() => {
    if (!showControlCenter) return;

    const handleEscClose = (event) => {
      if (event.key === "Escape") {
        setShowControlCenter(false);
      }
    };

    document.addEventListener("keydown", handleEscClose);
    return () => document.removeEventListener("keydown", handleEscClose);
  }, [showControlCenter]);

  const assignableCategories = categories.filter(
    (categoryOption) => categoryOption.value !== UNCATEGORIZED_FILTER_VALUE
  );

  return (
    <div className="w-full min-h-screen p-4">
      <div className="max-w-8xl mx-auto p-2">
        <nav className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900"><ListIcon size={26}/> Product List</h1>

            <button
              onClick={() => setShowControlCenter(true)}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-950 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm"
            >
              <LayoutGrid size={18} />
              Open Control Center
            </button>
          </div>
        </nav>

        <div className="mb-8">
          <Searchbar
            categories={categories}
            onSearch={handleSearch}
            initialQuery={searchQuery}       
            initialCategory={filterCategory}
          />
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm p-3 border border-gray-200 flex flex-col"
              >
                <div className="flex justify-end mb-2 gap-2">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                </div>
                <Skeleton className="w-full h-40 rounded-md mb-3" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-7 w-1/3 rounded-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No products found.</p>
          </div>
        )}

        {/* {showSuccess && (
          <div className="mb-6">
            <SuccessAlert />
          </div>
        )} */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-3 border border-gray-200 flex flex-col"
            >
              <div className="flex justify-end mb-1 -mt-3 ">
                <button
                  onClick={() => setSelectedProduct(p)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors duration-150"
                >
                  <EditIcon size={22} className="text-green-600" />
                </button>

              </div>

              {p.image ? (
                <img
                  src={p.image}
                  alt={p.product_name}
                  className="w-full h-50 object-cover shadow-md border-2 border-gray-300 rounded-md mb-3"
                />
                ) : (
                <div className="w-full h-40 bg-gray-200 rounded-md mb-3 flex items-center justify-center text-gray-500">
                  No Image
                </div>
                )}

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                  {p.product_name}
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Category</span>
                    <span className="text-gray-700 font-medium capitalize">
                      {p.category ? p.category.replace('_', ' ') : 'Uncategorized'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Price</span>
                    <span className="text-lg font-bold text-gray-900">₱{p.price}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Servings</span>
                    <span className={`font-bold ${
                        p.stock_quantity === 0 ? "text-red-600" : 
                        p.stock_quantity < 10 ? "text-orange-600" : "text-gray-900"
                    }`}>
                        {p.stock_quantity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t-3 border-gray-200">
                    <span className="text-gray-500">Status</span>
                    
                    {p.stock_quantity > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          Available
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          Unavailable
                        </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <ManageGcashInfoDialog
        open={gcashInfoModalOpen}
        onOpenChange={setGcashInfoModalOpen}
      />

      <ChangeVoidPinDialog 
        open={pinModalOpen} 
        onOpenChange={setPinModalOpen} 
      />

      <ManageCategoryDialog 
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        onSaved={() => {
          fetchCategories(); 
          fetchProducts(searchQuery, filterCategory);
        }}
      />

      <ManagePosBalanceDialog 
        open={posBalanceModalOpen}
        onOpenChange={setPosBalanceModalOpen}
      />

      <ManageServingsDialog
        open={manageServingsOpen}
        onOpenChange={setManageServingsOpen}
        onSaved={handleUpdatedProduct}
      />

      <ManageProductsDialog
        open={manageProductsOpen}
        onOpenChange={setManageProductsOpen}
        onSaved={handleUpdatedProduct}
        categories={assignableCategories}
      />

      <ManageArchivedProductsDialog
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
        onSaved={handleUpdatedProduct}
      />

      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          showControlCenter ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          aria-label="Close control center"
          onClick={() => setShowControlCenter(false)}
          className="absolute inset-0 bg-gray-900/45"
        />

        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-linear-to-b from-white to-gray-50 border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ${
            showControlCenter ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 font-semibold">Admin Hub</p>
                <h2 className="text-xl font-bold text-gray-900">Control Center</h2>
              </div>

              <button
                onClick={() => setShowControlCenter(false)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  POS Settings
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setGcashInfoModalOpen(true);
                      setShowControlCenter(false);
                    }}
                    className="flex gap-2 items-center justify-center bg-gray-900 hover:bg-gray-950 text-white px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm"
                  >
                    <QrCodeIcon size={18}/> GCash Infos
                  </button>

                  <button
                    onClick={() => {
                      setPosBalanceModalOpen(true);
                      setShowControlCenter(false);
                    }}
                    className="flex gap-2 items-center justify-center bg-gray-900 hover:bg-gray-950 text-white px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm"
                  >
                    <PhilippinePeso size={18}/> POS Initial Balance
                  </button>

                  <button
                    onClick={() => {
                      setPinModalOpen(true);
                      setShowControlCenter(false);
                    }}
                    className="sm:col-span-2 flex gap-2 items-center justify-center bg-gray-900 hover:bg-gray-950 text-white px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm"
                  >
                    <LockKeyhole size={18}/> Change Void Pin
                  </button>
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  Product Controls
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setArchiveModalOpen(true);
                      setShowControlCenter(false);
                    }}
                    className="flex gap-2 items-center justify-center bg-gray-900 hover:bg-gray-950 text-white px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm"
                  >
                    <ArchiveIcon size={18}/> Archive Products
                  </button>

                  <button
                    onClick={() => {
                      setCategoryModalOpen(true);
                      setShowControlCenter(false);
                    }}
                    className="flex gap-2 items-center justify-center bg-gray-900 hover:bg-gray-950 text-white px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm"
                  >
                    <Settings size={18}/> Manage Categories
                  </button>

                  <button
                    onClick={() => {
                      setManageServingsOpen(true);
                      setShowControlCenter(false);
                    }}
                    className="sm:col-span-2 flex gap-2 items-center justify-center bg-gray-900 hover:bg-gray-950 text-white px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm"
                  >
                    <LucideForkKnifeCrossed size={18} /> Manage Servings
                  </button>

                  <button
                    onClick={() => {
                      setManageProductsOpen(true);
                      setShowControlCenter(false);
                    }}
                    className="sm:col-span-2 flex gap-2 items-center justify-center bg-gray-900 hover:bg-gray-950 text-white px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm"
                  >
                    <CookingPotIcon size={18} /> Manage Products
                  </button>
                  
                </div>
              </section>
            </div>

            <div className="p-5 border-t border-gray-200 bg-white">
              <AddProductDialog
                onSaved={handleUpdatedProduct}
                existingProducts={products}
                categories={assignableCategories}
              >
                <button
                  onClick={() => setShowControlCenter(false)}
                  className="w-full flex gap-2 items-center justify-center bg-gray-900 hover:bg-gray-950 text-white px-3 py-2.5 rounded-lg font-semibold transition-colors duration-200 shadow-sm"
                >
                  <PlusSquareIcon size={18} /> Add New Product
                </button>
              </AddProductDialog>
            </div>
          </div>
        </aside>
      </div>

      {selectedProduct && (
        <EditProductDialog
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSaved={handleUpdatedProduct}
          categories={assignableCategories}
        />
      )}
    </div>
  );
}

export default ProductList;