import React from "react"
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Pages/Layout";
import Dashboard from "./Pages/admin-pages/Dashboard";
import MenuAndProducts from "./Pages/admin-pages/MenuAndProducts";
import SalesAndReports from "./Pages/admin-pages/SalesAndReports";
import CustomerFeedback from "./Pages/admin-pages/CustomerFeedback";
import UserManagement from "./Pages/admin-pages/UserManagement";
import Invoices from "./Pages/admin-pages/Invoices";


import LandingPage from "./Pages/LandingPage";

function App() {

  return (
    <Routes>
      <Route path="/home" element={<LandingPage />} />
      
      <Route element={<Layout></Layout>}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/menu" element={<MenuAndProducts />} />
        <Route path="/sales" element={<SalesAndReports />} />
        <Route path="/customerFeedback" element={<CustomerFeedback />} />
        <Route path="/userManagement" element={<UserManagement />} />
        <Route path="/invoices" element={<Invoices />} />
      </Route>
        

          
    </Routes>
  )
}

export default App
