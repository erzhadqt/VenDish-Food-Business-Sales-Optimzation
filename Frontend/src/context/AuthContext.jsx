import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user on app load
  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    const token = localStorage.getItem("access");

    if (token) {
      try {
        const response = await api.get("/firstapp/user/me/");
        setUser(response.data);
      } catch (error) {
        console.error("Token invalid or expired", error);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setUser(null);
      }
    }
    setLoading(false);
  };

  // Login function
  const login = async (username, password) => {
    try {
      const response = await api.post("/firstapp/token/", {
        username,
        password,
        platform: "web",
      });
      const { access, refresh } = response.data;

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);

      // Fetch the user immediately and update state
      await checkUserStatus();

      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "Invalid credentials"
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
