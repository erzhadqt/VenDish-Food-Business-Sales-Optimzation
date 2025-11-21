import { createContext, useContext, useState } from "react";
import api from '../api'

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    return localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : null;
  });

  const logout = async () => {
    try {
      // OPTIONAL: notify backend
      await api.post("/api/logout/", {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });
    } catch (error) {
      console.log("Logout error (ignored):", error);
    }

    // Remove all auth-related data
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);

    // Redirect to login
    window.location.href = "/logout";
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
