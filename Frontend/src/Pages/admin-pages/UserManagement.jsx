import React, { useEffect, useState } from "react";
import api from "../../api";
import { Trash2Icon, UserCogIcon, UserPlus, UserRoundPen } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import UpdateUserDialog from "../../Components/UpdateUserDialog";
import ConfirmDeleteUserDialog from "../../Components/ConfirmDeleteUserDialog";
import AddUserDialog from "../../Components/AddUserDialog";
import SuccessAlert from "../../Components/SuccessAlert";

export default function UserTable() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleUpdated = () => {
    fetchUsers();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/firstapp/users/${id}/`);
      fetchUsers();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete user. Please try again.");
    }
  };

  const totalPages = Math.ceil(users.length / rowsPerPage);
  const paginatedUsers = users.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="w-full py-6">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex justify-between items-center mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <UserCogIcon size={32} className="text-gray-700" /> User Management
          </h1>

          <AddUserDialog onSaved={fetchUsers}>
            <button className="flex gap-2 items-center bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-sm">
              <UserPlus size={20} /> User
            </button>
          </AddUserDialog>
        </div>

        {showSuccess && (
          <div className="mb-6">
            <SuccessAlert />
          </div>
        )}

        {loading && (
          <p className="text-gray-500 text-center py-8">Loading...</p>
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
                    <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-700">
                      ID
                    </th>
                    <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-700">
                      Username
                    </th>
                    <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    {/* <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-700">
                      Phone
                    </th>
                    <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-700">
                      Address
                    </th> */}
                    <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-700">
                      First Name
                    </th>
                    <th className="py-3.5 px-4 text-left text-sm font-semibold text-gray-700">
                      Last Name
                    </th>
                    <th className="py-3.5 px-4 text-center text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {u.id}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {u.username}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {u.email}
                      </td>
                      {/* <td className="py-3 px-4 text-sm text-gray-600">
                        {u.phone}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {u.address}
                      </td> */}
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {u.first_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {u.last_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-150"
                          >
                            <UserRoundPen
                              size={26}
                              className="text-green-500"
                            />
                          </button>

                          <ConfirmDeleteUserDialog
                            title="Delete User"
                            description="Are you sure you want to delete this user? This action cannot be undone."
                            onConfirm={() => handleDelete(u.id)}
                          >
                            <button className="p-2 hover:bg-red-50 rounded-md transition-colors duration-150">
                              <Trash2Icon
                                size={26}
                                className="text-red-600 hover:text-red-600"
                              />
                            </button>
                          </ConfirmDeleteUserDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end items-center gap-2 p-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

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