import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Searchbar from "../../Components/Searchbar";
import api from "../../api";
import { EditIcon, Trash2Icon, PlusSquareIcon, ListIcon, TicketPercentIcon } from "lucide-react";

import EditProductDialog from "../../Components/EditProductDialog";
import SuccessAlert from "../../Components/SuccessAlert";
import DeleteConfirmDialog from "../../Components/DeleteConfirmDialog";
import AddProductDialog from "../../Components/AddProductDialog";
import DiscountDialog from "../../Components/DiscountDialog";

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);


  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("search") || "";
  const categoryParam = searchParams.get("category") || "";

  const categories = [
    { value: "chicken", label: "Chicken" },
    { value: "beef", label: "Beef" },
    { value: "fish", label: "Fish" },
    { value: "vegetables", label: "Vegetables" },
    { value: "combo_meal", label: "Combo Meal" },
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
    fetchProducts(query, category);

    const params = {};
    if (query) params.search = query;
    if (category) params.category = category;

    setSearchParams(params);
  };

  // Load products on mount based on URL params
  useEffect(() => {
    fetchProducts(queryParam, categoryParam);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="w-full min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <nav className="flex items-center justify-between mb-8">
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900"><ListIcon size={26}/> Product List</h1>

          <div className="flex gap-2" >
            <DiscountDialog>
              <button className="flex gap-2 items-center bg-white hover:bg-gray-200 text-zinc-700 px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-md border border-gray-200">
                <TicketPercentIcon size={22} className="text-green-500"/> Discount
              </button>
            </DiscountDialog>
            
            <AddProductDialog onSaved={handleUpdatedProduct}>
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
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-5 border border-gray-200 flex flex-col"
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
					className="w-full h-50 object-cover shadow-md border border-gray-100 rounded-md mb-3"
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
                  
                  <div className="flex items-center justify-between pt-2 border-t-3 border-gray-200">
                    <span className="text-gray-500">Stock</span>
                    <span className="font-semibold text-gray-800">{p.stock_quantity}</span>
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