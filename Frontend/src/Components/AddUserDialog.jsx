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

const PROVINCES = sortLocations(["Zamboanga del Sur", "Zamboanga del Norte", "Zamboanga Sibugay", "Other"]);
const CITIES = sortLocations(["Zamboanga City", "Ipil", "Other"]);
const BARANGAYS = sortLocations([
  "Zone I", "Zone II", "Zone III", "Zone IV", "Tetuan", "Pasonanca", 
  "Tumaga", "Sta. Maria", "San Roque", "Putik", "Divisoria", "Ayala", 
  "Canelar", "Maasin", "Recodo", "San Jose Gusu", "Santa Maria", 
  "Arena Blanco", "Boalan", "Bolong", "Buenavista", "Bunguiao", 
  "Curuan", "Manicahan", "Mercedes", "Putik", "Tetuan", "Vitali", 
  "Malagutay", "Baliwasan", "Campo Islam", "Cabaluay", "Cabatangan", "Calarian", "Camino Nuevo", "Other"
]);

export default function AddUserDialog({ onSaved, children }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isStaff, setIsStaff] = useState(false);
  
  const [addressSelection, setAddressSelection] = useState({
    province: "",
    city: "",
    barangay: ""
  });

  const FIELD_LABELS = {
    username: "Username",
    password: "Password",
    first_name: "First name",
    middle_name: "Middle name",
    last_name: "Last name",
    email: "Email",
    phone_input: "Phone number",
    province: "Province",
    city: "City",
    barangay: "Barangay",
    other_province: "Province",
    other_city: "City",
    other_barangay: "Barangay",
    street: "Additional address details",
  };

  const clearFieldError = (fieldName) => {
    if (!fieldName) return;

    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const getInputClassName = (fieldName, baseClass = "h-11") => {
    return fieldErrors[fieldName]
      ? `${baseClass} border-red-500 focus-visible:ring-red-500`
      : baseClass;
  };

  const getSelectClassName = (fieldName) => {
    const base = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";
    return fieldErrors[fieldName]
      ? `${base} border-red-500 focus:ring-red-500`
      : base;
  };

  const sanitizeInput = (e, type) => {
    clearFieldError(e.target.name);

    const val = e.target.value;
    switch (type) {
      case 'username':
        e.target.value = val.replace(/[^a-zA-Z0-9_]/g, '');
        break;
      case 'name':
        e.target.value = val.replace(/[^a-zA-Z\s\-'ñÑ]/g, '');
        break;
      case 'phone':
        // 1. Strip all non-digits
        let num = val.replace(/\D/g, '');
        
        // 2. Automatically trim leading '0' or '63'
        if (num.startsWith('0')) num = num.slice(1);
        if (num.startsWith('63')) num = num.slice(2);
        
        // 3. Force exactly 10 remaining digits maximum
        num = num.slice(0, 10);
        
        // 4. Auto-format with spaces (e.g., 912 345 6789)
        let formatted = '';
        if (num.length > 0) formatted += num.substring(0, 3);
        if (num.length > 3) formatted += ' ' + num.substring(3, 6);
        if (num.length > 6) formatted += ' ' + num.substring(6, 10);

        e.target.value = formatted;
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
    const { name, value } = e.target;

    setAddressSelection((prev) => ({
      ...prev,
      [name]: value
    }));

    clearFieldError(name);

    if (name === "province" && value !== "Other") clearFieldError("other_province");
    if (name === "city" && value !== "Other") clearFieldError("other_city");
    if (name === "barangay" && value !== "Other") clearFieldError("other_barangay");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData);
    const nextFieldErrors = {};
    const normalizedValue = (value) => String(value ?? "").trim();

    const addError = (field, message) => {
      if (!nextFieldErrors[field]) {
        nextFieldErrors[field] = message;
      }
    };

    const requireField = (field) => {
      if (!normalizedValue(values[field])) {
        addError(field, `${FIELD_LABELS[field] || field} must not be blank.`);
      }
    };

    [
      "username",
      "password",
      "first_name",
      "last_name",
      "email",
      "phone_input",
      "province",
      "city",
      "barangay",
      "street",
    ].forEach(requireField);

    if (values.province === "Other") requireField("other_province");
    if (values.city === "Other") requireField("other_city");
    if (values.barangay === "Other") requireField("other_barangay");

    if (normalizedValue(values.password) && normalizedValue(values.password).length < 8) {
      addError("password", "Password must be at least 8 characters long.");
    }

    if (normalizedValue(values.email)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedValue(values.email))) {
        addError("email", "Please enter a valid email address.");
      }
    }
    
    // Process formatted phone input
    if (normalizedValue(values.phone_input)) {
      // Strip out the visual spaces we added for the user
      const rawPhone = values.phone_input.replace(/\s/g, '');

      if (rawPhone.length !== 10 || !rawPhone.startsWith('9')) {
        addError("phone_input", "Please enter a valid 10-digit mobile number starting with 9.");
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      const totalIssues = Object.keys(nextFieldErrors).length;
      setError(`Please review the highlighted fields. ${totalIssues} validation issue${totalIssues > 1 ? "s" : ""} found.`);

      const firstInvalidField = Object.keys(nextFieldErrors)[0];
      const targetElement = e.currentTarget.querySelector(`[name="${firstInvalidField}"]`);
      if (targetElement && typeof targetElement.focus === "function") {
        targetElement.focus();
      }

      setLoading(false);
      return;
    }

    if (values.phone_input) {
      // Strip out the visual spaces we added for the user
      const rawPhone = values.phone_input.replace(/\s/g, '');

      // Construct the final payload strictly as +63XXXXXXXXXX
      values.phone = `+63${rawPhone}`;
      delete values.phone_input; // Clean up the intermediate DOM state
    }

    const finalProvince = values.province === "Other" ? values.other_province : values.province;
    const finalCity = values.city === "Other" ? values.other_city : values.city;
    const finalBarangay = values.barangay === "Other" ? values.other_barangay : values.barangay;

    const fullAddress = [
      values.street, 
      finalBarangay, 
      finalCity, 
      finalProvince, 
    ].filter(Boolean).join(", ");

    delete values.street;
    delete values.barangay;
    delete values.city;
    delete values.province;
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
      setFieldErrors({});
      setAddressSelection({ province: "", city: "", barangay: "" });
    } catch (err) {
      console.error("Failed to add user:", err.response?.data || err);
      
      let errorMessage = "Failed to add new user.";
      const backendFieldErrors = {};
      
      if (err.response?.data) {
          const errorData = err.response.data;
          if (typeof errorData === 'object') {
              const errorMessages = [];
              for (const [field, messages] of Object.entries(errorData)) {
                  // Format field name cleanly (e.g., "first_name" -> "First Name")
                  const cleanFieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
                  const backendMessage = Array.isArray(messages) ? messages.join(" ") : String(messages);

                  if (FIELD_LABELS[field]) {
                    backendFieldErrors[field] = backendMessage;
                  }

                  if (Array.isArray(messages)) {
                      errorMessages.push(`${cleanFieldName}: ${messages.join(" ")}`);
                  } else {
                      errorMessages.push(`${cleanFieldName}: ${messages}`);
                  }
              }
              errorMessage = errorMessages.join(" | ");
          } else {
              errorMessage = String(errorData);
          }
      } else if (err.message) {
          errorMessage = err.message;
      }

      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setError(null);
      setFieldErrors({});
      setAddressSelection({ province: "", city: "", barangay: "" });
    }
    setOpen(newOpen);
  };

  const topErrorItems = Object.values(fieldErrors);

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
          <Alert variant="destructive" className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="break-words space-y-2">
              <p className="font-medium">{error}</p>
              {topErrorItems.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {topErrorItems.slice(0, 5).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form noValidate onSubmit={handleSubmit} className="grid gap-4 mt-2">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                className={getInputClassName("username")}
                name="username" 
                id="username" 
                required 
                placeholder="johndoe" 
                maxLength={30} 
                onInput={(e) => sanitizeInput(e, 'username')} 
                aria-invalid={!!fieldErrors.username}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                className={getInputClassName("password")} 
                name="password" 
                id="password" 
                type="password" 
                required 
                maxLength={50} 
                minLength={8}
                title="Password must be at least 8 characters long"
                onInput={() => clearFieldError("password")}
                aria-invalid={!!fieldErrors.password}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
              <Input className={getInputClassName("first_name")} name="first_name" id="first_name" required placeholder="John" maxLength={40} onInput={(e) => sanitizeInput(e, 'name')} aria-invalid={!!fieldErrors.first_name} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="middle_name">Middle Name</Label>
              <Input className={getInputClassName("middle_name")} name="middle_name" id="middle_name" placeholder="Optional" maxLength={40} onInput={(e) => sanitizeInput(e, 'name')} aria-invalid={!!fieldErrors.middle_name} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
              <Input className={getInputClassName("last_name")} name="last_name" id="last_name" required placeholder="Doe" maxLength={40} onInput={(e) => sanitizeInput(e, 'name')} aria-invalid={!!fieldErrors.last_name} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
              <Input className={getInputClassName("email")} name="email" id="email" type="email" required placeholder="john@example.com" maxLength={60} onInput={() => clearFieldError("email")} aria-invalid={!!fieldErrors.email} />
            </div>
            
            <div className="grid gap-2">
                <Label htmlFor="phone_input">Phone Number</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-500 font-medium select-none pointer-events-none">
                    +63
                  </span>
                  <Input 
                    className={getInputClassName("phone_input", "pl-12 h-11 font-medium tracking-wide")}
                    name="phone_input" 
                    id="phone_input" 
                    required 
                    placeholder="912 345 6789" 
                    maxLength={12} 
                    minLength={12} 
                    pattern="^9[0-9]{2} [0-9]{3} [0-9]{4}$"
                    title="Please enter a valid 10-digit mobile number starting with 9 (e.g. 912 345 6789)"
                    onInput={(e) => sanitizeInput(e, 'phone')} 
                    aria-invalid={!!fieldErrors.phone_input}
                  />
                </div>
            </div>
          </div>

          <div className="p-3 border rounded-md bg-slate-50/50 space-y-3 mt-1">
            <Label className="text-base font-semibold">Address Information</Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="province">Province</Label>
                <select defaultValue="" name="province" id="province" required onChange={handleAddressChange} className={getSelectClassName("province")} aria-invalid={!!fieldErrors.province}>
                  <option value="" disabled>Select Province</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <select defaultValue="" name="city" id="city" required onChange={handleAddressChange} className={getSelectClassName("city")} aria-invalid={!!fieldErrors.city}>
                  <option value="" disabled>Select City</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="barangay">Barangay</Label>
                <select defaultValue="" name="barangay" id="barangay" required onChange={handleAddressChange} className={getSelectClassName("barangay")} aria-invalid={!!fieldErrors.barangay}>
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
                    <Input className={getInputClassName("other_province")} name="other_province" id="other_province" required placeholder="Enter province" maxLength={30} onInput={(e) => sanitizeInput(e, 'location_text')} aria-invalid={!!fieldErrors.other_province} />
                  </div>
                )}
                {addressSelection.city === 'Other' && (
                  <div className="grid gap-2">
                    <Label htmlFor="other_city">Specify City</Label>
                    <Input className={getInputClassName("other_city")} name="other_city" id="other_city" required placeholder="Enter city" maxLength={30} onInput={(e) => sanitizeInput(e, 'location_text')} aria-invalid={!!fieldErrors.other_city} />
                  </div>
                )}
                {addressSelection.barangay === 'Other' && (
                  <div className="grid gap-2">
                    <Label htmlFor="other_barangay">Specify Barangay</Label>
                    <Input className={getInputClassName("other_barangay")} name="other_barangay" id="other_barangay" required placeholder="Enter barangay" maxLength={30} onInput={(e) => sanitizeInput(e, 'address')} aria-invalid={!!fieldErrors.other_barangay} />
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2 mt-2">
              <Label htmlFor="street">Additional Info (Street, House No., Bldg)</Label>
              <Input className={getInputClassName("street")} name="street" id="street" required placeholder="e.g. Unit 4A, 123 Main St." maxLength={55} onInput={(e) => sanitizeInput(e, 'address')} aria-invalid={!!fieldErrors.street} />
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
                <Button type="button" variant="outline" disabled={loading} className="h-11">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading} className="h-11">
                {loading ? "Creating..." : "Add User"}
              </Button>
            </DialogFooter>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}