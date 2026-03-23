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

// Example location data.
const COUNTRIES = ["Philippines"];
const PROVINCES = ["Zamboanga del Sur", "Zamboanga del Norte", "Zamboanga Sibugay", "Davao", "Cebu", "Other"];
const CITIES = ["Zamboanga City", "Pagadian City", "Dipolog City", "Ipil", "Davao City", "Cebu City", "Other"];
const BARANGAYS = ["Zone I", "Zone II", "Zone III", "Zone IV", "Tetuan", "Pasonanca", "Tumaga", "Sta. Maria", "San Roque", "Putik", "Divisoria", "Ayala", "Canelar", "Maasin", "Recodo", "San Jose Gusu", "Santa Maria", "Arena Blanco", "Boalan", "Bolong", "Buenavista", "Bunguiao", "Curuan", "Manicahan", "Mercedes", "Putik", "Tetuan", "Vitali", "Other"];

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
    
    const fullAddress = [
      values.street, 
      values.barangay, 
      values.city, 
      values.province, 
      values.country
    ].filter(Boolean).join(", ");

    delete values.street;
    delete values.barangay;
    delete values.city;
    delete values.province;
    delete values.country;

    values.address = fullAddress;
    values.is_staff = isStaff;

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

      {/* CHANGED: Increased max-width to 900px and added w-[95vw] to allow it to expand naturally */}
      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[95vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Fill out the details below to create a new staff or admin account.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="break-words">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          
          {/* CHANGED: Grouped Username and Password on the same row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input name="username" id="username" required placeholder="johndoe" maxLength={50} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input name="password" id="password" type="password" required maxLength={50} />
            </div>
          </div>

          {/* Full Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            
            {/* CHANGED: Converted to a 4-column layout on medium+ screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <select defaultValue="" name="country" id="country" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled>Select Country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="province">Province / Region</Label>
                <select defaultValue="" name="province" id="province" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled>Select Province</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="city">City / Municipality</Label>
                <select defaultValue="" name="city" id="city" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled>Select City</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="barangay">Barangay</Label>
                <select defaultValue="" name="barangay" id="barangay" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled>Select Barangay</option>
                  {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-2 mt-2">
              <Label htmlFor="street">Additional Info (Street, House No., Bldg)</Label>
              <Input name="street" id="street" required placeholder="e.g. Unit 4A, 123 Main St." />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center justify-start gap-3">
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
            
            <DialogFooter className="sm:justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Add User"}
              </Button>
            </DialogFooter>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}