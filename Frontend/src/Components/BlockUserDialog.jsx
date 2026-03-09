import { useMemo, useState } from "react";
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
import { Button } from "../Components/ui/button";
import { Checkbox } from "../Components/ui/checkbox";

export default function BlockUserDialog({ users = [], onSaved, children }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("block");

  const blockableUsers = useMemo(
    () => users.filter((u) => !u.is_superuser),
    [users]
  );

  const modeUsers = useMemo(() => {
    if (mode === "unblock") {
      return blockableUsers.filter((u) => u.is_active === false);
    }
    return blockableUsers.filter((u) => u.is_active !== false);
  }, [blockableUsers, mode]);

  const toggleUser = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedIds([]);
      setError("");
      setMode("block");
    }
  };

  const handleSubmitSelected = async () => {
    if (selectedIds.length === 0 || loading) return;

    setLoading(true);
    setError("");

    try {
      await Promise.all(
        selectedIds.map((id) =>
          api.patch(`/firstapp/users/${id}/`, {
            is_active: mode === "unblock",
          })
        )
      );

      onSaved?.(mode, selectedIds.length);
      setOpen(false);
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to update selected users:", err);
      setError(
        `Failed to ${mode} one or more users. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      )}

      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>Manage User Blocking</DialogTitle>
          <DialogDescription>
            Select one or more accounts to block or unblock. Blocked staff can’t
            log in to web, and blocked users can’t log in to the app.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={mode === "block" ? "default" : "outline"}
            onClick={() => {
              setMode("block");
              setSelectedIds([]);
              setError("");
            }}
            disabled={loading}
          >
            Block
          </Button>
          <Button
            type="button"
            variant={mode === "unblock" ? "default" : "outline"}
            onClick={() => {
              setMode("unblock");
              setSelectedIds([]);
              setError("");
            }}
            disabled={loading}
          >
            Unblock
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
          {modeUsers.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No users available.</div>
          ) : (
            modeUsers.map((u) => {
              const isAlreadyBlocked = u.is_active === false;
              return (
                <label
                  key={u.id}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      checked={selectedIds.includes(u.id)}
                      onCheckedChange={() => toggleUser(u.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {u.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        u.is_staff
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      {u.is_staff ? "Staff" : "User"}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        isAlreadyBlocked
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-green-100 text-green-800 border-green-200"
                      }`}
                    >
                      {isAlreadyBlocked ? "Blocked" : "Active"}
                    </span>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant={mode === "block" ? "destructive" : "default"}
            disabled={loading || selectedIds.length === 0}
            onClick={handleSubmitSelected}
          >
            {loading
              ? `${mode === "block" ? "Blocking" : "Unblocking"}...`
              : `${mode === "block" ? "Block" : "Unblock"} Selected (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}