import { useEffect, useState } from "react";
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
import { Label } from "../Components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../Components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "../Components/ui/skeleton";

export default function UpdateUserDialog({ user, onClose, onSaved }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // User info state
    const [username, setUsername] = useState(user?.username || "");
    const [email, setEmail] = useState(user?.email || "");
    const [firstName, setFirstName] = useState(user?.first_name || "");
    const [lastName, setLastName] = useState(user?.last_name || "");
    const [middleName, setMiddleName] = useState(user?.middle_name || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [address, setAddress] = useState(user?.address || "");

    // System-level toggles state
    const [isStaff, setIsStaff] = useState(Boolean(user?.is_staff));
    const [isActive, setIsActive] = useState(user?.is_active !== false);

    useEffect(() => {
        if (user) {
            setUsername(user.username || "");
            setEmail(user.email || "");
            setFirstName(user.first_name || "");
            setLastName(user.last_name || "");
            setMiddleName(user.middle_name || "");
            setPhone(user.phone || "");
            setAddress(user.address || "");
            setIsStaff(Boolean(user.is_staff));
            setIsActive(user.is_active !== false); // Defaults to true if undefined
        }
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null); 

        // Only send the fields the admin is allowed to change
        const payload = {
            is_staff: isStaff,
            is_active: isActive
        };

        if (user.is_staff) {
            Object.assign(payload, {
                username,
                email,
                first_name: firstName,
                last_name: lastName,
                middle_name: middleName,
                phone,
                address,
            });
        }

        try {
            console.log("Payload:", payload); 
          
            await api.patch(`/firstapp/users/${user.id}/`, payload, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            onSaved(); 
            onClose(); 
        } catch (err) {
            console.error("Update User Error:", err.response?.data || err);
          
            let errorMessage = "Failed to update user privileges.";
            
            if (err.response?.data) {
                const errorData = err.response.data;
                if (typeof errorData === 'object') {
                    const errorMessages = [];
                    for (const [field, messages] of Object.entries(errorData)) {
                        if (Array.isArray(messages)) {
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
            <DialogContent className="sm:max-w-[450px] z-50">
                <DialogHeader>
                    <DialogTitle>Manage User Permissions</DialogTitle>
                    <DialogDescription>
                        Update the system access and status for this user.
                    </DialogDescription>
                </DialogHeader>

                {!user ? (
                    <div className="grid gap-4 py-1">
                        <div className="grid gap-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid gap-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-52" />
                        </div>
                        <DialogFooter>
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-10 w-28" />
                        </DialogFooter>
                    </div>
                ) : (
                    <>
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
                            
                            {user.is_staff ? (
                                <div className="grid gap-3 py-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="username">Username</Label>
                                        <input
                                            type="text"
                                            id="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="firstName">First Name</Label>
                                            <input
                                                type="text"
                                                id="firstName"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="middleName">Middle Name</Label>
                                            <input
                                                type="text"
                                                id="middleName"
                                                value={middleName}
                                                onChange={(e) => setMiddleName(e.target.value)}
                                                className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <input
                                                type="text"
                                                id="lastName"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="phone">Phone</Label>
                                            <input
                                                type="text"
                                                id="phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="address">Address</Label>
                                            <input
                                                type="text"
                                                id="address"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                                            />
                                    </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Editing Account</p>
                                    <p className="font-medium text-gray-900">{user.username}</p>
                                    <p className="text-sm text-gray-600">{user.email}</p>
                                </div>
                            )}

                            <div className="grid gap-3 py-2">
                                {/* 1. Staff Checkbox */}
                                <div className="flex items-start space-x-3 border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        id="is_staff"
                                        checked={isStaff}
                                        onChange={(e) => setIsStaff(e.target.checked)}
                                        className="h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="is_staff" className="font-medium cursor-pointer text-gray-900">
                                            Staff Access
                                        </Label>
                                        <p className="text-sm text-gray-500">
                                            Allows the user to access the POS system and manage standard operations.
                                        </p>
                                    </div>
                                </div>

                                {/* 2. Active Status Checkbox */}
                                <div className="flex items-start space-x-3 border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="h-4 w-4 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="is_active" className="font-medium cursor-pointer text-gray-900">
                                            Account Active
                                        </Label>
                                        <p className="text-sm text-gray-500">
                                            Uncheck to deactivate this account and block the user from logging in.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-4">
                                <DialogClose asChild>
                                    <Button variant="outline" disabled={loading} onClick={handleClose}>
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Saving..." : "Save Privileges"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}