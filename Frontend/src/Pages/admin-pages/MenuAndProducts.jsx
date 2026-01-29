import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Searchbar from "../../Components/Searchbar";
import api from "../../api";
import { EditIcon, Trash2Icon, PlusSquareIcon, ListIcon } from "lucide-react";

import EditProductDialog from "../../Components/EditProductDialog";
import SuccessAlert from "../../Components/SuccessAlert";
import DeleteConfirmDialog from "../../Components/DeleteConfirmDialog";
import AddProductDialog from "../../Components/AddProductDialog";

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("search") || "";
  const categoryParam = searchParams.get("category") || "";

  useEffect(() => {
  const delayDebounceFn = setTimeout(() => {
    fetchProducts(queryParam, categoryParam);
  }, 300); // Wait 300ms after the last keystroke before calling the API

  return () => clearTimeout(delayDebounceFn);
}, [queryParam, categoryParam]);

  const categories = [
    { value: "chicken", label: "Chicken" },
    { value: "beef", label: "Beef" },
    { value: "fish", label: "Fish" },
    { value: "vegetables", label: "Vegetables" },
    { value: "combo_meal", label: "Combo Meal" },
    { value: "others", label: "Others" },
  ];

  // Fetch products from API
  const fetchProducts = (query = "", category = "") => {
    setLoading(true);

    let url = `/firstapp/products/?search=${query}`;
    if (category) url += `&category=${category}`;

    api
      .get(url)
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Update URL params whenever search or category changes
  const handleSearch = (query, category) => {
   
    const params = {};
    if (query) params.search = query;
    if (category) params.category = category;

    setSearchParams(params);
  };

  // Load products on mount based on URL params
  useEffect(() => {
    fetchProducts(queryParam, categoryParam);
  }, [queryParam, categoryParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh list + show success alert
  const handleUpdatedProduct = () => {
    fetchProducts(searchParams.get("search") || "", searchParams.get("category") || "");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    try {
      await api.delete(`/firstapp/products/${productId}/`);
      handleUpdatedProduct();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete the product. Please try again.");
    }
  };

  return (
    <div className="w-full min-h-screen p-4">
      <div className="max-w-8xl mx-auto p-2">
        {/* Header */}
        <nav className="flex items-center justify-between mb-8">
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900"><ListIcon size={26}/> Product List</h1>

          <div className="flex gap-2" >
            {/* ---------------------------------------------------- */}
            {/* CHANGE HERE: Passed existingProducts prop for validation */}
            {/* ---------------------------------------------------- */}
            <AddProductDialog 
                onSaved={handleUpdatedProduct} 
                existingProducts={products} 
            >
              <button className="flex gap-2 items-center bg-gray-900 hover:bg-gray-700 text-white px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm">
                <PlusSquareIcon size={22} /> Product
              </button>
            </AddProductDialog>
          </div>
 
        </nav>

        {/* Searchbar */}
        <div className="mb-8">
          <Searchbar
            categories={categories}
            onSearch={handleSearch}
            initialQuery={queryParam}
            initialCategory={categoryParam}
          />
        </div>

        {/* Loading */}
        {loading && <p className="text-gray-500 text-center py-8">Loading...</p>}

        {/* No products */}
        {!loading && products.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No products found.</p>
          </div>
        )}

        {/* Success alert */}
        {showSuccess && (
          <div className="mb-6">
            <SuccessAlert />
          </div>
        )}

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-3 border border-gray-200 flex flex-col"
            >
              {/* Action buttons */}
              <div className="flex justify-end mb-1 -mt-3 ">
                <button
                  onClick={() => setSelectedProduct(p)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors duration-150"
                >
                  <EditIcon size={22} className="text-green-600" />
                </button>

                <DeleteConfirmDialog
                  onConfirm={() => handleDeleteProduct(p.id)}
                  title="Delete Product"
                  description="Are you sure you want to delete this product? This cannot be undone."
                >
                  <button className="p-1 hover:bg-red-100 rounded-md transition-colors duration-150">
                    <Trash2Icon size={18} className="text-gray-500 hover:text-red-600" />
                  </button>
                </DeleteConfirmDialog>
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


              {/* Product info */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                  {p.product_name}
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Category</span>
                    <span className="text-gray-700 font-medium capitalize">
                      {p.category.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Price</span>
                    <span className="text-lg font-bold text-gray-900">₱{p.price}</span>
                  </div>

                  {p.track_stock && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Stock</span>
                      <span className={`font-bold ${
                          p.stock_quantity === 0 ? "text-red-600" : 
                          p.stock_quantity < 10 ? "text-orange-600" : "text-gray-900"
                      }`}>
                          {p.stock_quantity}
                      </span>
                    </div>
                  )}


                  
                  <div className="flex items-center justify-between pt-2 border-t-3 border-gray-200">
                    <span className="text-gray-500">Status</span>
                    
                    {p.track_stock ? (
                      p.stock_quantity > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            In Stock
                          </span>
                      ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            Out of Stock
                          </span>
                      )
                    ) : (
                    /* LOGIC B: If NOT Tracking Stock, status depends on Manual Toggle */
                      p.is_available ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            Available
                          </span>
                      ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            Unavailable
                          </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Edit Dialog */}
      {selectedProduct && (
        <EditProductDialog
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSaved={handleUpdatedProduct}
        />
      )}
    </div>
  );
}

export default ProductList;