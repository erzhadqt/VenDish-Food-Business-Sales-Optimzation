import { useState } from "react";
import api from "../api";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/Components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AddUserDialog({ onSaved, children }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  
  const [isStaff, setIsStaff] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Clear previous errors

    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData);
    
    // Add the is_staff status explicitly
    values.is_staff = isStaff;
    
    console.log("Submitting User:", values);

    try {
      await api.post("/firstapp/users/", values);
      
      // Reset state and close on success
      setIsStaff(false);
      onSaved();        
      setOpen(false);   
      setError(null);
    } catch (err) {
      console.error("Failed to add user:", err.response?.data || err);
      
      // Format the error message
      let errorMessage = "An unexpected error occurred.";
      if (err.response?.data) {
        errorMessage = typeof err.response.data === 'object' 
          ? JSON.stringify(err.response.data) 
          : String(err.response.data);
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) setError(null);
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      )}

      {/* Increased max-width to accommodate extra fields comfortably */}
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Fill out the details below to create a new staff or admin account.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="break-words">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          
          {/* Username */}
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              name="username" 
              id="username" 
              required 
              placeholder="johndoe" 
              maxLength={50} 
            />
          </div>

          {/* Full Name Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input 
                  name="first_name" 
                  id="first_name" 
                  required 
                  placeholder="John" 
                  maxLength={50} 
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input 
                  name="middle_name" 
                  id="middle_name" 
                  placeholder="Optional" 
                  maxLength={50} 
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input 
                  name="last_name" 
                  id="last_name" 
                  required 
                  placeholder="Doe" 
                  maxLength={50} 
                />
            </div>
          </div>

          {/* Contact Info Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  name="email" 
                  id="email" 
                  type="email" 
                  required 
                  placeholder="john@example.com" 
                  maxLength={50} 
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  name="phone" 
                  id="phone" 
                  required 
                  placeholder="0912 345 6789" 
                  maxLength={20} 
                />
            </div>
          </div>

          {/* Address */}
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input 
              name="address" 
              id="address" 
              required 
              placeholder="Complete Address" 
              maxLength={50} 
            />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              name="password" 
              id="password" 
              type="password" 
              required 
              maxLength={50} 
            />
          </div>

          {/* Staff Checkbox */}
          <div className="flex items-center justify-start gap-3 mt-2">
            <input 
                type="checkbox"
                id="is_staff_checkbox"
                checked={isStaff} 
                onChange={() => setIsStaff(!isStaff)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <Label htmlFor="is_staff_checkbox" className="select-none cursor-pointer">
                Is Staff? (Grants POS access)
            </Label>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>

            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}