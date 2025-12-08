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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AddUserDialog({ onSaved, children }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [isStaff, setIsStaff] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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
    } catch (error) {
      console.error("Failed to add user:", error.response?.data || error);
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : "Please check console for details.";
      alert(`Failed to add user: ${errorDetail}`);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      {/* Increased max-width to accommodate extra fields comfortably */}
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Fill out the details below to create a new staff or admin account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          
          {/* Username */}
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input name="username" id="username" required placeholder="johndoe" />
          </div>

          {/* Full Name Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input name="first_name" id="first_name" required placeholder="John" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input name="middle_name" id="middle_name" placeholder="Optional" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input name="last_name" id="last_name" required placeholder="Doe" />
            </div>
          </div>

          {/* Contact Info Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input name="email" id="email" type="email" required placeholder="john@example.com" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input name="phone" id="phone" required placeholder="0912 345 6789" />
            </div>
          </div>

          {/* Address */}
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input name="address" id="address" required placeholder="Complete Address" />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input name="password" id="password" type="password" required />
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