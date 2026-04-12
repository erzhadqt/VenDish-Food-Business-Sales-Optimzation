import React, { useEffect, useState } from "react";
import api from "../../api";
import { 
  UserCogIcon, 
  UserPlus, 
  UserRoundPen, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  EllipsisVertical,
  Search,
  UserStarIcon
} from "lucide-react";

import UpdateUserDialog from "../../Components/UpdateUserDialog";
import ConfirmDeleteUserDialog from "../../Components/ConfirmDeleteUserDialog";
import AddUserDialog from "../../Components/AddUserDialog";
import BlockUserDialog from "../../Components/BlockUserDialog";
import AdminAccountDialog from "../../Components/AdminAccountDialog";
import SuccessAlert from "../../Components/SuccessAlert";
import UserDetailsModal from "../../Components/UserDetailsModal";
import { Skeleton } from "../../Components/ui/skeleton";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewDetailsUser, setViewDetailsUser] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // 🔴 NEW: Lazy load state from localStorage (or default if null)
  const [filterRole, setFilterRole] = useState(() => {
    return localStorage.getItem("userMgmt_role") || "All";
  });
  const [filterStatus, setFilterStatus] = useState(() => {
    return localStorage.getItem("userMgmt_status") || "All";
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem("userMgmt_search") || "";
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem("userMgmt_page");
    return savedPage ? parseInt(savedPage, 10) : 1;
  });

  const rowsPerPage = 5;

  // 🔴 NEW: Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("userMgmt_role", filterRole);
    localStorage.setItem("userMgmt_status", filterStatus);
    localStorage.setItem("userMgmt_search", searchQuery);
    localStorage.setItem("userMgmt_page", currentPage.toString());
  }, [filterRole, filterStatus, searchQuery, currentPage]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/firstapp/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getUserStatus = (user) => {
    if (user?.account_status) return user.account_status;
    if (user.is_active) return "Active";
    if (user.is_staff && !user.is_active) return "Pending";
    return "Deactivated";
  };

  const getUserRole = (user) => {
    if (user?.role) return user.role;
    if (user?.is_staff && user?.is_superuser) return "admin";
    if (user?.is_staff) return "staff";
    return "user";
  };

  // Hide admin/superadmin accounts from the management table
  const visibleUsers = users.filter((user) => getUserRole(user) !== "admin");

  // Filter & Search Logic
  const filteredUsers = visibleUsers.filter((user) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesUsername = user.username?.toLowerCase().includes(query);
      const matchesEmail = user.email?.toLowerCase().includes(query);
      
      if (!matchesUsername && !matchesEmail) return false;
    }

    const role = getUserRole(user);
    if (filterRole === "Staff" && role !== "staff") return false;
    if (filterRole === "User" && role !== "user") return false;

    const status = getUserStatus(user);
    if (filterStatus !== "All" && status !== filterStatus) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  
  // Failsafe: If filtering reduces items so much that the current page is now empty, push back to page 1
  const validCurrentPage = currentPage > totalPages && totalPages > 0 ? totalPages : currentPage;
  
  const paginatedUsers = filteredUsers.slice(
    (validCurrentPage - 1) * rowsPerPage,
    validCurrentPage * rowsPerPage
  );

  const handleFilterChange = (e) => {
    setFilterRole(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); 
  };

  const triggerSuccessAlert = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleAdded = () => {
    fetchUsers();
    triggerSuccessAlert("New user created successfully! An invite email was sent.");
  };

  const handleUpdated = () => {
    fetchUsers();
    triggerSuccessAlert("User account updated successfully!");
  };

  const handleAdminSaved = (message = "Admin account updated successfully.") => {
    fetchUsers();
    triggerSuccessAlert(message);
  };

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="w-full pt-8">
      <div className="max-w-8xl  px-2">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
          {/* Page Title */}
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900 whitespace-nowrap">
            <UserCogIcon size={32} className="text-gray-700" /> User Management
          </h1>

          {/* Controls & Actions Container - Strictly Inline */}
          <div className="flex flex-row items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
            
            {/* Search */}
            <div className="relative group shrink-0">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2.5 min-w-100 lg:w-64 bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent shadow-sm transition-colors"
              />
            </div>

            {/* Role Filter */}
            <div className="relative group shrink-0">
              <Filter
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <select
                value={filterRole}
                onChange={handleFilterChange}
                className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent cursor-pointer font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                <option value="All">All Users</option>
                <option value="Staff">Staffs</option>
                <option value="User">Normal Accounts</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative group shrink-0">
              <Filter
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <select
                value={filterStatus}
                onChange={handleStatusFilterChange}
                className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent cursor-pointer font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Deactivated">Deactivated</option>
              </select>
            </div>

            {/* Admin Account Button */}
            <AdminAccountDialog onSaved={handleAdminSaved}>
              <button className="shrink-0 flex justify-center items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm whitespace-nowrap">
                <UserStarIcon size={20}/> Admin Account
              </button>
            </AdminAccountDialog>

            {/* Add User Button */}
            <AddUserDialog onSaved={handleAdded}>
              <button className="shrink-0 flex justify-center items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm whitespace-nowrap">
                <UserPlus size={20} /> Add User
              </button>
            </AddUserDialog>

          </div>
        </div>

        {showSuccess && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <SuccessAlert message={successMessage} />
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 space-y-3 border-b border-gray-200 bg-gray-50">
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="p-4 space-y-4">
              {Array.from({ length: rowsPerPage }).map((_, index) => (
                <div key={index} className="grid grid-cols-5 gap-3 items-center">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-6 w-2/3 rounded-full" />
                  <Skeleton className="h-6 w-2/3 rounded-full" />
                  <div className="flex justify-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && visibleUsers.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No users found.</p>
          </div>
        )}

        {!loading && visibleUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-700">Username</th>
                    <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="py-3.5 px-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-gray-500">
                           No users found matching your search.
                        </td>
                      </tr>
                  ) : (
                    paginatedUsers.map((u) => {
                      const currentStatus = getUserStatus(u);
                      const role = getUserRole(u);
                      
                      return (
                      <tr
                        key={u.id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="py-3 px-3 text-sm font-medium text-gray-900">{u.username}</td>
                        <td className="py-3 px-3 text-sm text-gray-600">{u.email}</td>
                        <td className="py-3 px-3 text-sm">
                          {role === "staff" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              Staff
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              User
                            </span>
                          )}
                        </td>
                        
                        <td className="py-3 px-3 text-sm">
                          {currentStatus === "Active" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              Active
                            </span>
                          )}
                          {currentStatus === "Pending" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                              Pending
                            </span>
                          )}
                          {currentStatus === "Deactivated" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              Deactivated
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex justify-center items-center gap-1">
                            <button
                              onClick={() => setViewDetailsUser(u)}
                              className="p-2 hover:bg-gray-200 rounded-md transition-colors duration-150"
                              title="View Personal Details"
                            >
                              <EllipsisVertical size={20} className="text-gray-500" />
                            </button>

                            <button
                              onClick={() => setSelectedUser(u)}
                              className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-150"
                              title="Edit User"
                            >
                              <UserRoundPen size={20} className="text-green-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredUsers.length > 0 && (
              <div className="flex justify-end items-center gap-2 p-4">
                <button
                  onClick={handlePrevPage}
                  disabled={validCurrentPage === 1}
                  className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-gray-600">
                  Page {validCurrentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={validCurrentPage === totalPages || totalPages === 0}
                  className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <UserDetailsModal 
        isOpen={!!viewDetailsUser} 
        onClose={() => setViewDetailsUser(null)} 
        user={viewDetailsUser} 
      />

      {selectedUser && (
        <UpdateUserDialog
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSaved={handleUpdated}
        />
      )}
    </div>
  );
}