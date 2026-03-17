import React, { useMemo, useState } from "react";
import { User, Search, X, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const CustomerCouponModal = ({
  open,
  onOpenChange,
  users,
  selectedCustomerId,
  onSelectCustomer,
  onClearCustomer,
  customerCoupons,
  customerCouponsLoading,
  appliedCoupons,
  onApplyCoupon,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const normalUsers = useMemo(() => users.filter((user) => !user.is_staff), [users]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return normalUsers;

    const query = searchQuery.toLowerCase();
    return normalUsers.filter((user) => {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
      return (
        user.username.toLowerCase().includes(query) ||
        fullName.includes(query)
      );
    });
  }, [normalUsers, searchQuery]);

  const selectedUser = useMemo(
    () => normalUsers.find((user) => user.id === selectedCustomerId) || null,
    [normalUsers, selectedCustomerId]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white p-0 overflow-hidden" showCloseButton>
        <DialogHeader className="px-5 py-4 border-b bg-gray-50">
          <DialogTitle className="text-gray-800">Select User & Claimed Coupons</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="border-r border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search customer..."
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {filteredUsers.length === 0 && (
                <div className="text-xs text-gray-400 p-2 text-center">No customers found.</div>
              )}

              {filteredUsers.map((user) => {
                const isActive = selectedCustomerId === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => onSelectCustomer(user)}
                    className={`w-full text-left p-2.5 rounded-md mb-1 border transition ${isActive ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50 border-transparent"}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-200 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                        {user.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {(user.first_name || user.username) + (user.last_name ? ` ${user.last_name}` : "")}
                        </div>
                        <div className="text-xs text-gray-500 truncate">@{user.username}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-700 flex items-center gap-2">
                <User size={14} className="text-green-600" />
                {selectedUser ? (
                  <span className="font-medium">
                    {(selectedUser.first_name || selectedUser.username) + (selectedUser.last_name ? ` ${selectedUser.last_name}` : "")}
                  </span>
                ) : (
                  <span className="text-gray-400">No customer selected</span>
                )}
              </div>

              {selectedUser && (
                <button
                  type="button"
                  onClick={onClearCustomer}
                  className="text-xs px-2 py-1 rounded border text-gray-600 hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {!selectedUser && (
                <div className="text-xs text-gray-400 p-2">Select a customer to view claimed coupons.</div>
              )}

              {selectedUser && customerCouponsLoading && (
                <div className="text-xs text-gray-400 p-2">Loading claimed coupons...</div>
              )}

              {selectedUser && !customerCouponsLoading && customerCoupons.length === 0 && (
                <div className="text-xs text-gray-400 p-2">No claimed coupons found for this user.</div>
              )}

              {selectedUser && !customerCouponsLoading && customerCoupons.map((coupon) => {
                const alreadyApplied = appliedCoupons.some((applied) => applied.id === coupon.id);
                const disabled = alreadyApplied || coupon.is_used || coupon.status === "Expired";

                return (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between border rounded px-2 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-800 truncate flex items-center gap-1">
                        <Tag size={11} /> {coupon.code}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {coupon.is_used ? "Used" : coupon.status === "Expired" ? "Expired" : "Available"}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onApplyCoupon(coupon)}
                      className={`text-[10px] font-bold px-2 py-1 rounded ${disabled ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                    >
                      {/* {alreadyApplied ? "Applied" : coupon.is_used ? "Used" : "Use" } */}
                      {coupon.is_used ? "Used" : coupon.status === "Expired" ? "Expired" : "Available" && coupon.is_used ? "Used" : "Use"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t bg-gray-50 text-[11px] text-gray-500 flex items-center gap-1">
              <X size={12} />
              Only selected user’s claimed coupons can be applied.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerCouponModal;
