import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../Components/ui/dialog";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Plus, Edit, Trash2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react"; 
import api from "../api"; 
import DeleteConfirmDialog from "./DeleteConfirmDialog"; 

export default function ManageCategoryDialog({ open, onOpenChange, onSaved }) {
  const [view, setView] = useState("list"); // 'list' or 'form'
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  // Feedback States
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
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
    }
  }, [open]);

  const resetForm = () => {
    setFormData({ name: "" });
    setEditId(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // Clear errors when typing
  };

  // Switch views and clear messages
  const changeView = (newView) => {
    setView(newView);
    setError("");
    setSuccess("");
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
    if (!formData.name.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: formData.name.trim(),
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
      setError(error.response?.data?.name?.[0] || "Failed to save category. It might already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Blurred Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" aria-hidden="true" />}

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
            <p>{error}</p>
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
              <div className="text-center py-8 text-gray-500">Loading categories...</div>
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
          <form onSubmit={handleSubmit} className="grid gap-4 py-2">
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
                className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
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