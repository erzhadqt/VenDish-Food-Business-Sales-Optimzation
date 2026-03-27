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
import { Alert, AlertDescription } from "../Components/ui/alert";
import { AlertCircle } from "lucide-react";

const sortLocations = (locations) => {
  return [...new Set(locations)].sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });
};

const COUNTRIES = sortLocations(["Philippines"]);
const PROVINCES = sortLocations(["Zamboanga del Sur", "Zamboanga del Norte", "Zamboanga Sibugay", "Davao", "Cebu", "Other"]);
const CITIES = sortLocations(["Zamboanga City", "Pagadian City", "Dipolog City", "Ipil", "Davao City", "Cebu City", "Other"]);
const BARANGAYS = sortLocations([
  "Zone I", "Zone II", "Zone III", "Zone IV", "Tetuan", "Pasonanca", 
  "Tumaga", "Sta. Maria", "San Roque", "Putik", "Divisoria", "Ayala", 
  "Canelar", "Maasin", "Recodo", "San Jose Gusu", "Santa Maria", 
  "Arena Blanco", "Boalan", "Bolong", "Buenavista", "Bunguiao", 
  "Curuan", "Manicahan", "Mercedes", "Putik", "Tetuan", "Vitali", 
  "Malagutay", "Other"
]);

export default function AddUserDialog({ onSaved, children }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  
  const [addressSelection, setAddressSelection] = useState({
    province: "",
    city: "",
    barangay: ""
  });

  const sanitizeInput = (e, type) => {
    const val = e.target.value;
    switch (type) {
      case 'username':
        e.target.value = val.replace(/[^a-zA-Z0-9_]/g, '');
        break;
      case 'name':
        e.target.value = val.replace(/[^a-zA-Z\s\-'ñÑ]/g, '');
        break;
      case 'phone':
        // NEW: Smart Philippine Phone Number formatting
        // 1. Strip everything except numbers
        let num = val.replace(/[^0-9]/g, '');
        // 2. If they pasted a number starting with 63, change it to 0
        if (num.startsWith('63')) {
          num = '0' + num.slice(2);
        }
        // 3. Force length to 11 digits maximum
        e.target.value = num.slice(0, 11);
        break;
      case 'location_text':
        e.target.value = val.replace(/[^a-zA-Z\s\-.ñÑ]/g, '');
        break;
      case 'address':
        e.target.value = val.replace(/[^a-zA-Z0-9\s,.\-#ñÑ]/g, '');
        break;
      default:
        break;
    }
  };

  const handleAddressChange = (e) => {
    setAddressSelection((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData);
    
    const finalProvince = values.province === "Other" ? values.other_province : values.province;
    const finalCity = values.city === "Other" ? values.other_city : values.city;
    const finalBarangay = values.barangay === "Other" ? values.other_barangay : values.barangay;

    const fullAddress = [
      values.street, 
      finalBarangay, 
      finalCity, 
      finalProvince, 
      values.country
    ].filter(Boolean).join(", ");

    delete values.street;
    delete values.barangay;
    delete values.city;
    delete values.province;
    delete values.country;
    delete values.other_province;
    delete values.other_city;
    delete values.other_barangay;

    values.address = fullAddress;
    values.is_staff = isStaff;

    try {
      await api.post("/firstapp/users/", values);
      
      setIsStaff(false);
      onSaved();        
      setOpen(false);   
      setError(null);
      setAddressSelection({ province: "", city: "", barangay: "" });
    } catch (err) {
      console.error("Failed to add user:", err.response?.data || err);
      let errorMessage = "An unexpected error occurred.";
      if (err.response?.data) {
        errorMessage = JSON.stringify(err.response.data); 
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setError(null);
      setAddressSelection({ province: "", city: "", barangay: "" });
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input name="username" id="username" required placeholder="johndoe" maxLength={30} onInput={(e) => sanitizeInput(e, 'username')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input name="password" id="password" type="password" required maxLength={50} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input name="first_name" id="first_name" required placeholder="John" maxLength={40} onInput={(e) => sanitizeInput(e, 'name')} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input name="middle_name" id="middle_name" placeholder="Optional" maxLength={40} onInput={(e) => sanitizeInput(e, 'name')} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input name="last_name" id="last_name" required placeholder="Doe" maxLength={40} onInput={(e) => sanitizeInput(e, 'name')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input name="email" id="email" type="email" required placeholder="john@example.com" maxLength={60} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                {/* UPDATED: Added minLength, pattern, and strict placeholder */}
                <Input 
                  name="phone" 
                  id="phone" 
                  required 
                  placeholder="09123456789" 
                  maxLength={11} 
                  minLength={11}
                  pattern="^09[0-9]{9}$"
                  title="Please enter a valid 11-digit mobile number starting with 09 (e.g. 09123456789)"
                  onInput={(e) => sanitizeInput(e, 'phone')} 
                />
            </div>
          </div>

          <div className="p-3 border rounded-md bg-slate-50/50 space-y-3">
            <Label className="text-base font-semibold">Address Information</Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <select defaultValue="" name="country" id="country" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="" disabled>Select Country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="province">Region</Label>
                <select defaultValue="" name="province" id="province" required onChange={handleAddressChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="" disabled>Select Province</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <select defaultValue="" name="city" id="city" required onChange={handleAddressChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="" disabled>Select City</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="barangay">Barangay</Label>
                <select defaultValue="" name="barangay" id="barangay" required onChange={handleAddressChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="" disabled>Select Barangay</option>
                  {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            {(addressSelection.province === 'Other' || addressSelection.city === 'Other' || addressSelection.barangay === 'Other') && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white border rounded-md shadow-sm">
                {addressSelection.province === 'Other' && (
                  <div className="grid gap-2">
                    <Label htmlFor="other_province">Specify Province</Label>
                    <Input name="other_province" id="other_province" required placeholder="Enter province" maxLength={30} onInput={(e) => sanitizeInput(e, 'location_text')} />
                  </div>
                )}
                {addressSelection.city === 'Other' && (
                  <div className="grid gap-2">
                    <Label htmlFor="other_city">Specify City</Label>
                    <Input name="other_city" id="other_city" required placeholder="Enter city" maxLength={30} onInput={(e) => sanitizeInput(e, 'location_text')} />
                  </div>
                )}
                {addressSelection.barangay === 'Other' && (
                  <div className="grid gap-2">
                    <Label htmlFor="other_barangay">Specify Barangay</Label>
                    <Input name="other_barangay" id="other_barangay" required placeholder="Enter barangay" maxLength={30} onInput={(e) => sanitizeInput(e, 'address')} />
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2 mt-2">
              <Label htmlFor="street">Additional Info (Street, House No., Bldg)</Label>
              <Input name="street" id="street" required placeholder="e.g. Unit 4A, 123 Main St." maxLength={55} onInput={(e) => sanitizeInput(e, 'address')} />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center justify-start gap-3">
              <input 
                  type="checkbox"
                  id="is_staff_checkbox"
                  checked={isStaff} 
                  onChange={() => setIsStaff(!isStaff)}
                  className="h-4 w-4 rounded text-blue-600 cursor-pointer"
              />
              <Label htmlFor="is_staff_checkbox" className="select-none cursor-pointer">
                  Check for Cashier (Grants POS access)
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