import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../Components/ui/dialog";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Plus, Edit, Trash2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react"; 
import api from "../api"; 
import DeleteConfirmDialog from "./DeleteConfirmDialog"; 
import { Skeleton } from "../Components/ui/skeleton";

const CATEGORY_NAME_ALLOWED_REGEX = /^[a-zA-Z0-9\s\-'&]+$/;
const CATEGORY_NAME_HAS_LETTER_REGEX = /[a-zA-Z]/;

export default function ManageCategoryDialog({ open, onOpenChange, onSaved }) {
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  // Feedback States
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  
  // Data States
  const [categoryList, setCategoryList] = useState([]);
  const [editId, setEditId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
  });

  // Fetch Existing Categories
  const fetchCategories = async () => {
    setFetching(true);
    try {
      const response = await api.get("/firstapp/categories/");
      setCategoryList(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setError("Failed to load categories.");
    } finally {
      setFetching(false);
    }
  };

  // Run fetch when modal opens
  useEffect(() => {
    if (open) {
      fetchCategories();
      setView("list");
      resetForm();
      setError("");
      setSuccess("");
      setFieldErrors({});
    }
  }, [open]);

  const resetForm = () => {
    setFormData({ name: "" });
    setEditId(null);
  };

  const handleChange = (e) => {
    const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9\s\-'&]/g, "");
    setFormData({ ...formData, [e.target.name]: sanitizedValue });
    setError(""); // Clear errors when typing

    setFieldErrors((prev) => {
      if (!prev[e.target.name]) return prev;
      const next = { ...prev };
      delete next[e.target.name];
      return next;
    });
  };

  // Switch views and clear messages
  const changeView = (newView) => {
    setView(newView);
    setError("");
    setSuccess("");
    setFieldErrors({});
  };

  // --- EDIT ACTION ---
  const handleEditClick = (category) => {
    setFormData({
      name: category.name || category.label || "", 
    });
    setEditId(category.id);
    changeView("form");
  };

  // --- DELETE ACTION ---
  const handleDelete = async (id) => {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/firstapp/categories/${id}/`);
      setSuccess("Category deleted successfully.");
      fetchCategories(); 
      if (onSaved) onSaved(); 
    } catch (error) {
      console.error("Failed to delete category:", error);
      setError("Failed to delete. It might be in use by existing products.");
    }
  };

  // --- SAVE ACTION (CREATE OR UPDATE) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedName = formData.name.trim();

    const nextFieldErrors = {};

    if (!normalizedName) {
      nextFieldErrors.name = "Category name must not be blank.";
    }

    if (normalizedName && !CATEGORY_NAME_ALLOWED_REGEX.test(normalizedName)) {
      nextFieldErrors.name = "Category name can only contain letters, numbers, spaces, hyphens, apostrophes, and ampersands.";
    }

    if (normalizedName && !CATEGORY_NAME_HAS_LETTER_REGEX.test(normalizedName)) {
      nextFieldErrors.name = "Category name must contain letters (numbers or symbols only are not allowed).";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(
        `Please review the highlighted fields. ${Object.keys(nextFieldErrors).length} validation issue${
          Object.keys(nextFieldErrors).length > 1 ? "s" : ""
        } found.`
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    try {
      const payload = {
        name: normalizedName,
      };

      if (editId) {
        await api.patch(`/firstapp/categories/${editId}/`, payload);
        setSuccess("Category updated successfully.");
      } else {
        await api.post("/firstapp/categories/", payload);
        setSuccess("Category created successfully.");
      }
      
      fetchCategories(); 
      if (onSaved) onSaved(); 
      setView("list"); 
      resetForm();

      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);

    } catch (error) {
      console.error("Error saving category:", error);
      const backendNameError = error.response?.data?.name?.[0];
      if (backendNameError) {
        setFieldErrors({ name: backendNameError });
      }
      setError(backendNameError || "Failed to save category. It might already exist.");
    } finally {
      setLoading(false);
    }
  };

  const topErrorItems = Object.values(fieldErrors);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === 'form' && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeView('list')}>
                <ArrowLeft size={18} />
              </Button>
            )}
            {view === 'list' ? 'Manage Product Categories' : (editId ? 'Edit Category' : 'Create New Category')}
          </DialogTitle>
        </DialogHeader>

        {/* --- FEEDBACK ALERTS --- */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 border border-red-200 text-sm mt-2">
            <AlertCircle size={16} className="shrink-0" />
            <div className="space-y-1">
              <p>{error}</p>
              {topErrorItems.length > 0 && (
                <ul className="list-disc pl-4">
                  {topErrorItems.slice(0, 3).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-center gap-2 border border-green-200 text-sm mt-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <p>{success}</p>
          </div>
        )}
        
        {/* --- VIEW 1: LIST EXISTING CATEGORIES --- */}
        {view === 'list' && (
          <div className="py-2 space-y-4">
            <div className="flex justify-end">
               <Button onClick={() => { resetForm(); changeView('form'); }} size="sm" className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus size={16} /> Add Category
               </Button>
            </div>

            {fetching ? (
              <div className="border rounded-lg overflow-hidden bg-gray-50 max-h-[40vh] overflow-y-auto p-3 space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="p-3 flex justify-between items-center bg-white rounded-md border border-gray-200">
                    <Skeleton className="h-5 w-1/2" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden bg-gray-50 max-h-[40vh] overflow-y-auto">
                {categoryList.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No categories found.</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {categoryList.map((c) => (
                      <div key={c.id} className="p-3 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                        <span className="font-medium text-gray-800">{c.name || c.label}</span>
                        
                        <div className="flex items-center gap-1">
                           <Button variant="ghost" size="icon" onClick={() => handleEditClick(c)}>
                              <Edit size={16} className="text-blue-600" />
                           </Button>

                           <DeleteConfirmDialog
                              title={`Delete Category: ${c.name || c.label}?`}
                              description="Are you sure you want to delete this category? Products currently assigned to it may lose their category formatting."
                              onConfirm={() => handleDelete(c.id)}
                           >
                              <Button variant="ghost" size="icon">
                                 <Trash2 size={16} className="text-red-600"/>
                              </Button>
                           </DeleteConfirmDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        )}

        {/* --- VIEW 2: ADD/EDIT FORM --- */}
        {view === 'form' && (
          <form noValidate onSubmit={handleSubmit} className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input 
                id="name"
                name="name"
                placeholder="e.g., Beverages, Desserts" 
                value={formData.name} 
                onChange={handleChange} 
                required
                autoFocus
                className={fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                aria-invalid={!!fieldErrors.name}
                maxLength={20}
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => changeView('list')}>Cancel</Button>
              <Button type="submit" disabled={loading || !formData.name.trim()}>
                {loading ? "Saving..." : (editId ? "Update Category" : "Save Category")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}