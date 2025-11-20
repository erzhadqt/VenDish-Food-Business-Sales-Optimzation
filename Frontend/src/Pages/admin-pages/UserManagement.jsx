import React, { useEffect, useState } from "react";
import api from "../../api";
import { EditIcon, Trash2Icon, PlusSquare } from "lucide-react";

import UpdateUserDialog from "../../Components/UpdateUserDialog";
import ConfirmDeleteUserDialog from "../../Components/ConfirmDeleteUserDialog";
import AddUserDialog from "../../Components/AddUserDialog";
import SuccessAlert from "../../Components/SuccessAlert";

export default function UserTable() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/firstapp/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load users", err);
    }
    setLoading(false);
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

  return (
    <div className="w-full p-6">
      <div className="flex justify-between mb-5 items-center">
        <h1 className="text-3xl font-bold mb-4">User Management</h1>

        <AddUserDialog onSaved={fetchUsers}>
          <button className="flex gap-1 bg-blue-900 items-center px-2 py-2 rounded-lg text-zinc-200 font-medium">
          <PlusSquare /> Add User
        </button>
        </AddUserDialog>
      </div>
      

      {showSuccess && (
        <div className="mb-4">
          <SuccessAlert />
        </div>
      )}

      {/* Loading */}
      {loading && <p className="text-gray-500">Loading...</p>}

      {/* No Users */}
      {!loading && users.length === 0 && (
        <p className="text-gray-500">No users found.</p>
      )}

      {/* USER TABLE */}
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 border-b">ID</th>
              <th className="py-3 px-4 border-b">Username</th>
              <th className="py-3 px-4 border-b">Email</th>
              <th className="py-3 px-4 border-b">First Name</th>
              <th className="py-3 px-4 border-b">Last Name</th>
              <th className="py-3 px-4 border-b text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition">
                <td className="py-2 px-4 border-b">{u.id}</td>
                <td className="py-2 px-4 border-b">{u.username}</td>
                <td className="py-2 px-4 border-b">{u.email}</td>
                <td className="py-2 px-4 border-b">{u.first_name}</td>
                <td className="py-2 px-4 border-b">{u.last_name}</td>

                <td className="py-2 px-4 border-b text-center">
                  <div className="flex justify-center gap-3">
                    {/* Edit button */}
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <EditIcon size={18} />
                    </button>

                    {/* Delete button + confirmation */}
                    <ConfirmDeleteUserDialog
                      title="Delete User"
                      description="Are you sure you want to delete this user? This action cannot be undone."
                      onConfirm={() => handleDelete(u.id)}
                    >
                      <button className="text-red-600 hover:text-red-800">
                        <Trash2Icon size={18} />
                      </button>
                    </ConfirmDeleteUserDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Update Modal */}
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
