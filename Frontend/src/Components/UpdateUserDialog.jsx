import { useState } from "react";
import api from "../api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UpdateUserDialog({ user, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  // Initialize isStaff state from the prop
  const [isStaff, setIsStaff] = useState(user.is_staff);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData.entries());

    // 1. Convert checkbox state (boolean) to the payload
    values.is_staff = isStaff;

    try {
      console.log("Payload:", values); // Debugging: Log the payload
      
      // The API endpoint uses PUT/PATCH, which the UserSerializer handles correctly
      await api.put(`/firstapp/users/${user.id}/`, values, {
        headers: {
          "Content-Type": "application/json", // Ensure JSON content type
        },
      });

      onSaved(); // Refresh the user list
      onClose(); // Close the modal
    } catch (err) {
      console.error("Update User Error:", err.response?.data || err);
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : "Please check console for details.";
      alert(`Failed to update user: ${errorDetail}`);
    }

    setLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the user information and click save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="grid gap-4">

          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input name="username" id="username" defaultValue={user.username} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input name="first_name" id="first_name" defaultValue={user.first_name} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input name="last_name" id="last_name" defaultValue={user.last_name} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              name="email"
              id="email"
              type="email"
              defaultValue={user.email}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              name="password"
              id="password"
              type="password"
              defaultValue={user.password}
              required
            />
          </div>

          {/* 2. Staff Checkbox (Controlled Component) */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_staff"
              // Controls the checkbox state
              checked={isStaff}
              // Updates the state when clicked
              onChange={(e) => setIsStaff(e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="is_staff">Staff Access (Can use POS)</Label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}