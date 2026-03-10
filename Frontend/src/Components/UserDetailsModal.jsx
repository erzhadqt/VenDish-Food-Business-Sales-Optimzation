import React from "react";
import { X, User } from "lucide-react";
import { Skeleton } from "../Components/ui/skeleton";

export default function UserDetailsModal({ isOpen, onClose, user }) {
  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center p-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Skeleton for Avatar Header */}
            <div className="flex items-center gap-4 pb-2">
               <Skeleton className="h-16 w-16 rounded-full shrink-0" />
               <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
               </div>
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>

          <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>
    );
  }

  // Handle different possible field names for the image from your Django backend
  const userImage = user.image || user.profile_image || user.avatar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          
          {/* Profile Header: Avatar, Username, and Email */}
          <div className="flex items-center gap-4 pb-3 border-b border-gray-100">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 shadow-sm">
              {userImage ? (
                <img src={userImage} alt={user.username || "User"} className="h-full w-full object-cover" />
              ) : (
                <User size={32} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-gray-900 truncate">
                {user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || "Unknown User"}
              </h4>
              <p className="text-sm text-gray-500 truncate">{user.email || "No email provided"}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">First Name</label>
              <p className="text-gray-800 font-medium">{user.first_name || "N/A"}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Last Name</label>
              <p className="text-gray-800 font-medium">{user.last_name || "N/A"}</p>
            </div>
          </div>
          
          {/* Conditionally render Middle Name so it doesn't leave an awkward gap if empty */}
          {user.middle_name && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Middle Name</label>
              <p className="text-gray-800 font-medium">{user.middle_name}</p>
            </div>
          )}
          
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Email Address</label>
            <p className="text-gray-800 font-medium">{user.email || "N/A"}</p>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
            <p className="text-gray-800 font-medium">{user.phone || "N/A"}</p>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Address</label>
            <p className="text-gray-800 font-medium bg-gray-50 p-3 rounded-md border border-gray-100 mt-1">
              {user.address || "N/A"}
            </p>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-lg font-medium transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}