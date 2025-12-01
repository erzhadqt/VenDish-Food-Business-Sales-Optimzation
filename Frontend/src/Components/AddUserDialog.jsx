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
  const [open, setOpen] = useState(false); // control dialog state
  
  // 1. New state for the checkbox
  const [isStaff, setIsStaff] = useState(false);

  // 2. Modified handleSubmit to include is_staff state
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData);
    
    // Add the is_staff status explicitly as a boolean
    values.is_staff = isStaff;
    
    // Log the final payload to verify
    console.log(values);

    try {
      // Your backend serializer is correctly set up to handle the "is_staff" field.
      await api.post("/firstapp/users/", values);
      
      // Reset state and close on success
      setIsStaff(false); // Reset checkbox state
      onSaved();        
      setOpen(false);   
    } catch (error) {
      console.error("Failed to add user:", error.response?.data || error);
      // Attempt to show detailed error if available
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : "Please check console for details.";
      alert(`Failed to add user: ${errorDetail}`);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Fill out the details below to add a new user.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input name="username" id="username" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input name="first_name" id="first_name" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input name="last_name" id="last_name" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input name="email" id="email" type="email" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input name="password" id="password" type="password" required />
          </div>

          {/* 3. Updated Checkbox Implementation */}
          <div className="flex items-center justify-start gap-3">
            <input 
                type="checkbox"
                id="is_staff_checkbox"
                checked={isStaff} 
                onChange={() => setIsStaff(!isStaff)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" // Tailwind classes for checkbox styling
            />
            <Label htmlFor="is_staff_checkbox" className="select-none cursor-pointer">
                Is Staff? (Grants POS and limited admin access)
            </Label>
          </div>

          <DialogFooter>
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