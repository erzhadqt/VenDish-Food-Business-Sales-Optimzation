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
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/menu" element={<MenuAndProducts />} />
        <Route path="/sales" element={<SalesAndReports />} />
        <Route path="/customerFeedback" element={<CustomerFeedback />} />
        <Route path="/userManagement" element={<UserManagement />} />
        <Route path="/invoices" element={<Invoices />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<RegisterAndLogout />} />
      <Route path="/logout" element={<Logout />} />


      <Route path="/pos" element={<ProtectedRoutes><Pos /></ProtectedRoutes>} />
        

          
    </Routes>
  )
}

export default App
