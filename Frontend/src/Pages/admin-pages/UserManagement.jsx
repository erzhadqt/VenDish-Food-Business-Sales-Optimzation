import React, { useEffect, useState } from "react";
import api from "../../api";
import { 
  Trash2Icon, 
  UserCogIcon, 
  UserPlus, 
  UserRoundPen, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  EllipsisVertical,
  UserRoundX
} from "lucide-react";

import UpdateUserDialog from "../../Components/UpdateUserDialog";
import ConfirmDeleteUserDialog from "../../Components/ConfirmDeleteUserDialog";
import AddUserDialog from "../../Components/AddUserDialog";
import BlockUserDialog from "../../Components/BlockUserDialog";
import SuccessAlert from "../../Components/SuccessAlert";
import UserDetailsModal from "../../Components/UserDetailsModal";
import { Skeleton } from "../../Components/ui/skeleton";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // State to manage the user whose details are being viewed in the modal
  const [viewDetailsUser, setViewDetailsUser] = useState(null); 
  
  const [loading, setLoading] = useState(false);
  
  // Alert State
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Filter State
  const [filterRole, setFilterRole] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

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

  // Filter Logic
  const filteredUsers = users.filter((user) => {
    if (filterRole === "All") return true;
    if (filterRole === "Staff") return user.is_staff === true;
    if (filterRole === "User") return user.is_staff === false || user.is_staff === undefined;
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleFilterChange = (e) => {
    setFilterRole(e.target.value);
    setCurrentPage(1);
  };

  // Helper to show dynamic success messages
  const triggerSuccessAlert = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleAdded = () => {
    fetchUsers();
    triggerSuccessAlert("New user created successfully!");
  };

  const handleUpdated = () => {
    fetchUsers();
    triggerSuccessAlert("User account updated successfully!");
  };

  const handleBlocked = (mode = "block", count = 0) => {
    fetchUsers();
    const action = mode === "unblock" ? "unblocked" : "blocked";
    const message =
      count > 0
        ? `${count} user account${count > 1 ? "s were" : " was"} ${action} successfully!`
        : `Selected user accounts were ${action} successfully!`;
    triggerSuccessAlert(message);
  };

  // const handleDelete = async (id) => {
  //   try {
  //     await api.delete(`/firstapp/users/${id}/`);
  //     fetchUsers();
  //     triggerSuccessAlert("User deleted successfully!");
  //   } catch (err) {
  //     console.error("Delete failed:", err);
  //     alert("Failed to delete user. Please try again.");
  //   }
  // };

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="w-full py-6">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex justify-between items-center mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <UserCogIcon size={32} className="text-gray-700" /> User Management
          </h1>

          <div className="flex gap-2">
            <div className="relative group">
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

            <AddUserDialog onSaved={handleAdded}>
              <button className="flex gap-2 items-center bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm">
                <UserPlus size={20} /> User
              </button>
            </AddUserDialog>

            <BlockUserDialog users={users} onSaved={handleBlocked}>
              <button className="flex gap-2 items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm">
                <UserRoundX size={20} /> Manage Blocking
              </button>
            </BlockUserDialog>
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

        {!loading && users.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No users found.</p>
          </div>
        )}

        {!loading && users.length > 0 && (
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
                           No users found for this filter.
                        </td>
                      </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="py-3 px-3 text-sm font-medium text-gray-900">{u.username}</td>
                        <td className="py-3 px-3 text-sm text-gray-600">{u.email}</td>
                        <td className="py-3 px-3 text-sm">
                          {u.is_staff ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              Staff
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              User
                            </span>
                          )}
                        </td>
                        
                        {/* New Status Column */}
                        <td className="py-3 px-3 text-sm">
                          {u.is_active !== false ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              Deactivated
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex justify-center items-center gap-1">
                            {/* Personal Details Ellipsis Button */}
                            <button
                              onClick={() => setViewDetailsUser(u)}
                              className="p-2 hover:bg-gray-200 rounded-md transition-colors duration-150"
                              title="View Personal Details"
                            >
                              <EllipsisVertical size={20} className="text-gray-500" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-150"
                              title="Edit User"
                            >
                              <UserRoundPen size={20} className="text-green-500" />
                            </button>
  
                            {/* Delete Button */}
                            {/* <ConfirmDeleteUserDialog
                              title="Delete User"
                              description="Are you sure you want to delete this user? This action cannot be undone."
                              onConfirm={() => handleDelete(u.id)}
                            >
                              <button className="p-2 hover:bg-red-50 rounded-md transition-colors duration-150" title="Delete User">
                                <Trash2Icon size={20} className="text-red-600 hover:text-red-600" />
                              </button>
                            </ConfirmDeleteUserDialog> */}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredUsers.length > 0 && (
              <div className="flex justify-end items-center gap-2 p-4">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render the extracted details modal */}
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