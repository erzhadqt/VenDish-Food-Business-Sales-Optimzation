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
} from "../Components/ui/dialog";
import { Input } from "../Components/ui/input";
import { Label } from "../Components/ui/label";
import { Button } from "../Components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../Components/ui/alert";
import { AlertCircle } from "lucide-react";

// Example location data. You can replace these with an API call (like PSGC) later if needed.
const COUNTRIES = ["Philippines"];
const PROVINCES = ["Zamboanga del Sur", "Zamboanga del Norte", "Zamboanga Sibugay", "Metro Manila", "Cebu", "Other"];
const CITIES = ["Zamboanga City", "Pagadian City", "Dipolog City", "Ipil", "Manila", "Cebu City", "Other"];
const BARANGAYS = ["Tetuan", "Pasonanca", "Tumaga", "Sta. Maria", "San Roque", "Putik", "Divisoria", "Ayala", "Other"];

export default function AddUserDialog({ onSaved, children }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  
  const [isStaff, setIsStaff] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData);
    
    // Combine the chopped up address fields into a single string for the backend
    const fullAddress = [
      values.street, 
      values.barangay, 
      values.city, 
      values.province, 
      values.country
    ].filter(Boolean).join(", ");

    // Clean up individual address fields from the payload
    delete values.street;
    delete values.barangay;
    delete values.city;
    delete values.province;
    delete values.country;

    // Set the finalized values
    values.address = fullAddress;
    values.is_staff = isStaff;
    
    console.log("Submitting User:", values);

    try {
      await api.post("/firstapp/users/", values);
      
      setIsStaff(false);
      onSaved();        
      setOpen(false);   
      setError(null);
    } catch (err) {
      console.error("Failed to add user:", err.response?.data || err);
      
      let errorMessage = "An unexpected error occurred.";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.password && Array.isArray(errorData.password)) {
          errorMessage = errorData.password.join(" ");
        } 
        else if (typeof errorData === 'object') {
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

  const handleOpenChange = (newOpen) => {
    if (!newOpen) setError(null);
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      {/* Increased max-width to 700px for the expanded address section */}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto z-50">
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
          
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input name="username" id="username" required placeholder="johndoe" maxLength={50} />
          </div>

          {/* Full Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input name="first_name" id="first_name" required placeholder="John" maxLength={50} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input name="middle_name" id="middle_name" placeholder="Optional" maxLength={50} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input name="last_name" id="last_name" required placeholder="Doe" maxLength={50} />
            </div>
          </div>

          {/* Contact Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input name="email" id="email" type="email" required placeholder="john@example.com" maxLength={50} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input name="phone" id="phone" required placeholder="0912 345 6789" maxLength={20} />
            </div>
          </div>

          {/* Structured Address Section */}
          <div className="p-3 border rounded-md bg-slate-50/50 space-y-3">
            <Label className="text-base font-semibold">Address Information</Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <select name="country" id="country" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled selected>Select Country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="province">Province / Region</Label>
                <select name="province" id="province" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled selected>Select Province</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="city">City / Municipality</Label>
                <select name="city" id="city" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled selected>Select City</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="barangay">Barangay</Label>
                <select name="barangay" id="barangay" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled selected>Select Barangay</option>
                  {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="street">Additional Info (Street, House No., Bldg)</Label>
              <Input name="street" id="street" required placeholder="e.g. Unit 4A, 123 Main St." />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input name="password" id="password" type="password" required maxLength={50} />
          </div>

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