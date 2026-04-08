import { useEffect, useMemo, useState } from "react";
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
  DialogTrigger,
} from "../Components/ui/dialog";
import { Label } from "../Components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../Components/ui/alert";
import { AlertCircle, Building2, Mail, UserRound } from "lucide-react";
import { Skeleton } from "../Components/ui/skeleton";

const FIELD_LIMITS = {
  usernameMin: 4,
  usernameMax: 30,
  emailMax: 60,
  nameMax: 40,
  addressMax: 255,
};

const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Z\s\-'ñÑ]*$/;

const EMPTY_FORM = {
  username: "",
  email: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  address: "",
};

const normalizeProfile = (data = {}) => ({
  username: data.username || "",
  email: data.email || "",
  first_name: data.first_name || "",
  middle_name: data.middle_name || "",
  last_name: data.last_name || "",
  address: data.address || "",
});

const parseApiError = (error) => {
  const data = error?.response?.data;
  if (!data) return error?.message || "Unable to update your admin account right now.";

  if (typeof data === "string") return data;

  if (typeof data === "object") {
    const messages = [];
    Object.entries(data).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        messages.push(`${field}: ${value.join(" ")}`);
      } else {
        messages.push(`${field}: ${String(value)}`);
      }
    });

    if (messages.length > 0) return messages.join(" | ");
  }

  return "Unable to update your admin account right now.";
};

const sanitizeValue = (field, rawValue) => {
  const value = rawValue || "";

  switch (field) {
    case "username":
      return value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, FIELD_LIMITS.usernameMax);
    case "first_name":
    case "middle_name":
    case "last_name":
      return value.replace(/[^a-zA-Z\s\-'ñÑ]/g, "").slice(0, FIELD_LIMITS.nameMax);
    case "address":
      return value.replace(/[^a-zA-Z0-9\s,.'#\-ñÑ]/g, "").slice(0, FIELD_LIMITS.addressMax);
    case "email":
      return value.trimStart().slice(0, FIELD_LIMITS.emailMax);
    default:
      return value;
  }
};

const validateForm = (form) => {
  const username = (form.username || "").trim();
  const email = (form.email || "").trim();
  const firstName = (form.first_name || "").trim();
  const middleName = (form.middle_name || "").trim();
  const lastName = (form.last_name || "").trim();
  const address = (form.address || "").trim();

  if (
    username.length < FIELD_LIMITS.usernameMin ||
    username.length > FIELD_LIMITS.usernameMax
  ) {
    return `Username must be ${FIELD_LIMITS.usernameMin}-${FIELD_LIMITS.usernameMax} characters long.`;
  }

  if (!USERNAME_REGEX.test(username)) {
    return "Username may contain only letters, numbers, and underscores.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address.";
  }

  const names = [
    { label: "First name", value: firstName },
    { label: "Middle name", value: middleName },
    { label: "Last name", value: lastName },
  ];

  for (const item of names) {
    if (item.value.length > FIELD_LIMITS.nameMax) {
      return `${item.label} must be ${FIELD_LIMITS.nameMax} characters or fewer.`;
    }
    if (!NAME_REGEX.test(item.value)) {
      return `${item.label} may contain only letters, spaces, apostrophes, and hyphens.`;
    }
  }

  if (address.length > FIELD_LIMITS.addressMax) {
    return `Address must be ${FIELD_LIMITS.addressMax} characters or fewer.`;
  }

  return null;
};

export default function AdminAccountDialog({ children, onSaved }) {
  const [open, setOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState(EMPTY_FORM);

  const hasChanges = useMemo(() => {
    return Object.keys(EMPTY_FORM).some((key) => (form[key] || "") !== (initialForm[key] || ""));
  }, [form, initialForm]);

  const previewFullName = useMemo(() => {
    const parts = [form.first_name, form.middle_name, form.last_name]
      .map((part) => part.trim())
      .filter(Boolean);

    return parts.join(" ") || "No full name set";
  }, [form.first_name, form.middle_name, form.last_name]);

  const loadAdminProfile = async () => {
    setLoadingProfile(true);
    setError("");

    try {
      const response = await api.get("/firstapp/user/me/");
      const normalized = normalizeProfile(response.data);
      setForm(normalized);
      setInitialForm(normalized);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadAdminProfile();
    }
  }, [open]);

  const handleInputChange = (field) => (event) => {
    const sanitizedValue = sanitizeValue(field, event.target.value);
    setForm((prev) => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleResetChanges = () => {
    setForm(initialForm);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const payload = {
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim(),
      last_name: form.last_name.trim(),
      address: form.address.trim(),
    };

    try {
      await api.patch("/firstapp/users/me/", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const normalized = normalizeProfile(payload);
      setInitialForm(normalized);
      setForm(normalized);
      setOpen(false);
      if (typeof onSaved === "function") {
        onSaved("Admin account updated successfully.");
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSaving(false);
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[95vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle>Admin Account Details</DialogTitle>
          <DialogDescription>
            Update your admin profile for business details and communication records.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Update Failed</AlertTitle>
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}

        {loadingProfile ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="grid gap-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="admin-username">Username</Label>
                  <input
                    id="admin-username"
                    type="text"
                    required
                    minLength={FIELD_LIMITS.usernameMin}
                    maxLength={FIELD_LIMITS.usernameMax}
                    pattern="^[A-Za-z0-9_]+$"
                    value={form.username}
                    onChange={handleInputChange("username")}
                    className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Use {FIELD_LIMITS.usernameMin}-{FIELD_LIMITS.usernameMax} characters: letters, numbers, underscore.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    maxLength={FIELD_LIMITS.emailMax}
                    value={form.email}
                    onChange={handleInputChange("email")}
                    className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="admin-first-name">First Name</Label>
                    <input
                      id="admin-first-name"
                      type="text"
                      maxLength={FIELD_LIMITS.nameMax}
                      value={form.first_name}
                      onChange={handleInputChange("first_name")}
                      className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="admin-middle-name">Middle Name</Label>
                    <input
                      id="admin-middle-name"
                      type="text"
                      maxLength={FIELD_LIMITS.nameMax}
                      value={form.middle_name}
                      onChange={handleInputChange("middle_name")}
                      className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="admin-last-name">Last Name</Label>
                    <input
                      id="admin-last-name"
                      type="text"
                      maxLength={FIELD_LIMITS.nameMax}
                      value={form.last_name}
                      onChange={handleInputChange("last_name")}
                      className="h-10 px-3 w-full rounded-md border border-gray-300 bg-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admin-address">Address</Label>
                  <textarea
                    id="admin-address"
                    rows={4}
                    maxLength={FIELD_LIMITS.addressMax}
                    value={form.address}
                    onChange={handleInputChange("address")}
                    className="w-full rounded-md border border-gray-300 bg-white text-sm p-3 resize-none"
                    placeholder="Business address or mailing address"
                  />
                  <p className="text-xs text-gray-500">
                    Max {FIELD_LIMITS.addressMax} characters.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-5 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Preview</h3>

                <div className="space-y-4">
                  <div className="rounded-md border border-gray-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Admin Name</p>
                    <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <UserRound size={16} className="text-gray-500" /> {previewFullName}
                    </p>
                  </div>

                  <div className="rounded-md border border-gray-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Username</p>
                    <p className="text-sm font-medium text-gray-800">{form.username || "No username"}</p>
                  </div>

                  <div className="rounded-md border border-gray-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Email</p>
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-2 break-all">
                      <Mail size={15} className="text-gray-500" /> {form.email || "No email"}
                    </p>
                  </div>

                  <div className="rounded-md border border-gray-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Business Address</p>
                    <p className="text-sm font-medium text-gray-800 flex items-start gap-2">
                      <Building2 size={15} className="text-gray-500 mt-0.5" />
                      <span>{form.address || "No address set"}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetChanges}
                disabled={saving || !hasChanges}
              >
                Reset Changes
              </Button>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={saving}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving || !hasChanges}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
