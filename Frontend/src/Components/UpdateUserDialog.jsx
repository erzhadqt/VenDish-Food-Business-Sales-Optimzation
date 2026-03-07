import { useState } from "react";
import api from "../api";
import { Button } from "../Components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../Components/ui/dialog";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../Components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function UpdateUserDialog({ user, onClose, onSaved }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Initialize isStaff state from the prop
    const [isStaff, setIsStaff] = useState(user.is_staff);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null); // Clear previous errors

        const formData = new FormData(e.target);
        const values = Object.fromEntries(formData.entries());

        const trimmedPassword = (values.password || "").trim();
        if (!trimmedPassword) {
            delete values.password;
        } else {
            values.password = trimmedPassword;
        }

        // 1. Convert checkbox state (boolean) to the payload
        values.is_staff = isStaff;

    try {
        console.log("Payload:", values); 
      
        await api.patch(`/firstapp/users/${user.id}/`, values, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        onSaved(); 
        onClose(); 
    } catch (err) {
        console.error("Update User Error:", err.response?.data || err);
      
        // Format the error message
        let errorMessage = "Failed to update user.";
        
        if (err.response?.data) {
            const errorData = err.response.data;
            
            // Check if there are specific password errors from Django
            if (errorData.password && Array.isArray(errorData.password)) {
                // Join multiple password errors with a space or new line
                errorMessage = errorData.password.join(" ");
            } 
            // Handle other specific field errors dynamically
            else if (typeof errorData === 'object') {
                const errorMessages = [];
                for (const [field, messages] of Object.entries(errorData)) {
                    if (Array.isArray(messages)) {
                        // Capitalize the field name (e.g., "email" -> "Email") and append the message
                        const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
                        errorMessages.push(`${fieldName}: ${messages.join(" ")}`);
                    } else {
                        errorMessages.push(`${field}: ${messages}`);
                    }
                }
                errorMessage = errorMessages.join(" | ");
            } else {
                errorMessage = String(errorData);
            }
        } else if (err.message) {
            errorMessage = err.message;
        }
      
        setError(errorMessage);
    } finally {
        setLoading(false);
    }
    };

  const handleClose = () => {
        setError(null);
        onClose();
    };

  return (
        <Dialog open={true} onOpenChange={handleClose}>

        <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
            onClick={handleClose} 
            />

        <DialogContent className="sm:max-w-[450px] z-50">
            <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
                Update the user information and click save.
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

            <form onSubmit={handleSave} className="grid gap-4">

            <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                name="username" 
                id="username" 
                defaultValue={user.username} 
                required 
                maxLength={50} 
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input 
                name="first_name" 
                id="first_name" 
                defaultValue={user.first_name} 
                maxLength={50} 
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input 
                name="last_name" 
                id="last_name" 
                defaultValue={user.last_name} 
                maxLength={50} 
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                name="email"
                id="email"
                type="email"
                defaultValue={user.email}
                required
                maxLength={50}
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                name="password"
                id="password"
                type="password"
                placeholder="Leave blank to keep current password"
                maxLength={50}
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
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <Label htmlFor="is_staff" className="cursor-pointer select-none">Staff Access (Can use POS)</Label>
            </div>

            <DialogFooter>
                <DialogClose asChild>
                <Button variant="outline" disabled={loading} onClick={handleClose}>
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