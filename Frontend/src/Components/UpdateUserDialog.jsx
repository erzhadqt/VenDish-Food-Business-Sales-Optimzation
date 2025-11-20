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
  const [isStaff, setIsStaff] = useState(user.is_staff);

  const handleSave = async (e) => {
  e.preventDefault();
  setLoading(true);

  const formData = new FormData(e.target);
  const values = Object.fromEntries(formData.entries());

  // Convert checkbox to boolean
  values.is_staff = isStaff;

  try {
    console.log("Payload:", values); // Debugging: Log the payload
    await api.put(`/firstapp/users/${user.id}/`, values, {
      headers: {
        "Content-Type": "application/json", // Ensure JSON content type
      },
    });

    onSaved(); // Refresh the user list
    onClose(); // Close the modal
  } catch (err) {
    console.error("Update User Error:", err);
    alert("Failed to update user. Please try again.");
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
            <Label>Username</Label>
            <Input name="username" defaultValue={user.username} required />
          </div>

          <div className="grid gap-2">
            <Label>First Name</Label>
            <Input name="first_name" defaultValue={user.first_name} />
          </div>

          <div className="grid gap-2">
            <Label>Last Name</Label>
            <Input name="last_name" defaultValue={user.last_name} />
          </div>

          <div className="grid gap-2">
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              defaultValue={user.email}
              required
            />
          </div>

          {/* Admin checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_staff"
              checked={isStaff}
              onChange={(e) => setIsStaff(e.target.checked)}
            />
            <Label htmlFor="is_staff">Admin Access</Label>
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
