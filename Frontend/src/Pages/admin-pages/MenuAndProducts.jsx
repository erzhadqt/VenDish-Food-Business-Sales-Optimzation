import React, { useEffect, useState } from "react";
import Searchbar from "../../Components/Searchbar";
import api from "../../api";
import { EditIcon, Trash2Icon, PlusSquareIcon } from "lucide-react";

import EditDialog from "../../Components/EditDialog";
import SuccessAlert from "../../Components/SuccessAlert";
import DeleteConfirmDialog from "../../Components/DeleteConfirmDialog";
import AddProductDialog from "../../Components/AddProductDialog";

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch products from API
  const fetchProducts = (query = "", category = "") => {
  setLoading(true);

  let url = `/firstapp/products/?search=${query}`;
  if (category) {
    url += `&category=${category}`;
  }

  api
    .get(url)
    .then((res) => {
      setProducts(res.data);
      setLoading(false);
    })
    .catch(() => setLoading(false));
};


  useEffect(() => {
    fetchProducts();
  }, []);

  // Search handler
  const handleSearch = (query) => {
  fetchProducts(query);
};

  // Refresh list + show success alert
  const handleUpdatedProduct = () => {
    fetchProducts();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    try {
      await api.delete(`/firstapp/products/${productId}/`);
      fetchProducts();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete the product. Please try again.");
    }
  };

  return (
    <div className="w-full p-4">
      {/* Header */}
      <nav className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-bold">Product List</h1>

        {/* Add Product Button */}
        <AddProductDialog onSaved={handleUpdatedProduct}>
          <button className="flex gap-2 items-center shadow-lg border border-gray-500 bg-gray-800 text-zinc-200 px-2 py-2 rounded-lg font-semibold">
            <PlusSquareIcon size={22} /> Add Product
          </button>
        </AddProductDialog>
      </nav>

        <Searchbar onSearch={handleSearch} />

      {/* Loading */}
      {loading && <p className="text-gray-500 mt-2">Loading...</p>}

      {/* No products */}
      {!loading && products.length === 0 && (
        <p className="text-gray-500 mt-2">No products found.</p>
      )}

      {/* Success alert */}
      {showSuccess && (
        <div className="mb-4 w-90">
          <SuccessAlert />
        </div>
      )}

      {/* Product list */}
      <div className="flex flex-wrap gap-6 w-full justify-center">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-col w-60 bg-white rounded-xl shadow-md p-5 gap-2 border border-gray-200"
          >
            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              {/* Edit */}
              <button
                onClick={() => setSelectedProduct(p)}
                className="text-gray-800"
              >
                <EditIcon />
              </button>

              {/* Delete */}
              <DeleteConfirmDialog
                onConfirm={() => handleDeleteProduct(p.id)}
                title="Delete Product"
                description="Are you sure you want to delete this product? This cannot be undone."
              >
                <button className="ml-2">
                  <Trash2Icon className="text-red-600" />
                </button>
              </DeleteConfirmDialog>
            </div>

            {/* Product info */}
            <h3 className="text-xl font-semibold">{p.product_name}</h3>
            <p className="text-gray-600">Category: {p.category}</p>
            <p className="text-lg font-bold text-green-600">₱{p.price}</p>
            <p>
              Stocks:{" "}
              <span className="font-semibold text-gray-800">
                {p.stock_quantity}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      {selectedProduct && (
        <EditDialog
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSaved={handleUpdatedProduct}
        />
      )}
    </div>
  );
}

export default ProductList;
