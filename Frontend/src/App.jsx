import React from "react"
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Pages/Layout";
import Dashboard from "./Pages/admin-pages/Dashboard";
import MenuAndProducts from "./Pages/admin-pages/MenuAndProducts";
import SalesAndReports from "./Pages/admin-pages/SalesAndReports";
import CustomerFeedback from "./Pages/admin-pages/CustomerFeedback";
import UserManagement from "./Pages/admin-pages/UserManagement";
import Invoices from "./Pages/admin-pages/Invoices";
import Login from "./Pages/login-signup/Login";
import Signup from "./Pages/login-signup/Signup";
import ProtectedRoutes from "./Components/ProtectedRoutes";

import HomePage from "./Pages/landing-pages/HomePage";
import ServicesPage from "./Pages/landing-pages/ServicesPage";
import AboutPage from "./Pages/landing-pages/AboutPage";
import ContactPage from "./Pages/landing-pages/ContactPage";
import Pos from "./Pages/POS/Pos";


function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />
}

function RegisterAndLogout() {
  localStorage.clear()
  return <Signup />
}

function App() {
  
      

  return (
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/about" element={<AboutPage />} />

      
      <Route element={<ProtectedRoutes><Layout></Layout></ProtectedRoutes>}>
        <Route path="/admin" element={<ProtectedRoutes><Dashboard /></ProtectedRoutes>} />
        <Route path="/menu" element={<ProtectedRoutes><MenuAndProducts /></ProtectedRoutes>} />
        <Route path="/sales" element={<ProtectedRoutes><SalesAndReports /></ProtectedRoutes>} />
        <Route path="/customerFeedback" element={<ProtectedRoutes><CustomerFeedback /></ProtectedRoutes>} />
        <Route path="/userManagement" element={<ProtectedRoutes><UserManagement /></ProtectedRoutes>} />
        <Route path="/invoices" element={<ProtectedRoutes><Invoices /></ProtectedRoutes>} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<RegisterAndLogout />} />

      <Route path="/pos" element={<ProtectedRoutes><Pos /></ProtectedRoutes>} />
        

          
    </Routes>
  )
}

export default App
