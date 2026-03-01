import React from "react"
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Pages/Layout";
import Dashboard from "./Pages/admin-pages/Dashboard";

import Login from "./Pages/login-signup/Login";
import Signup from "./Pages/login-signup/Signup";
import ProtectedRoute from "./Components/ProtectedRoute";

import NotFound from "./Pages/NotFound";
import NotAdmin from "./Pages/NotAdmin";

import HomePage from "./Pages/landing-pages/HomePage";
import ServicesPage from "./Pages/landing-pages/ServicesPage";
import AboutPage from "./Pages/landing-pages/AboutPage";
import ContactPage from "./Pages/landing-pages/ContactPage";

import MenuAndProducts from "./Pages/admin-pages/MenuAndProducts";
import SalesAndReports from "./Pages/admin-pages/SalesAndReports";
import CustomerFeedback from "./Pages/admin-pages/CustomerFeedback";
import UserManagement from "./Pages/admin-pages/UserManagement";
import CMS from "./Pages/admin-pages/CMS";
import Pos from "./Pages/POS/Pos";
import PromoManagement from "./Pages/admin-pages/PromoManagement";
import Transaction from "./Pages/admin-pages/Transaction";
import CostingTable from './Pages/admin-pages/CostingTable';



function Logout() {
  localStorage.clear()
  return <Navigate to="/" />
}

function RegisterAndLogout() {
  localStorage.clear()
  return <Signup />
}

function App() {
  
      

  return (

		<div className="w-full overflow-x-hidden">
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/services" element={<ServicesPage />} />
				<Route path="/contact" element={<ContactPage />} />
				<Route path="/about" element={<AboutPage />} />

			
				<Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
					{/* <Route path="/admin" element={<Dashboard />} /> */}
					<Route path="/admin/menu" element={<MenuAndProducts />} />
					<Route path="/admin/sales" element={<SalesAndReports />} />
					<Route path="/admin/customerFeedback" element={<CustomerFeedback />} />
					<Route path="/admin/userManagement" element={<UserManagement />} />
					<Route path="/admin/transaction" element={<Transaction />} />
					<Route path="/admin/cms" element={<CMS />} />
					<Route path="/admin/promo-management" element={<PromoManagement />} />
					<Route path="/admin/costing-table" element={<CostingTable />} />
					<Route path="/admin/pos" element={<Pos />} />
				</Route>

				<Route path="/kuyavincekarinderya" element={<Login />} />
				<Route path="/kuyavincekarinderya-signup" element={<RegisterAndLogout />} />
				<Route path="/logout" element={<Logout />} />
			
				
				
				<Route path="/*" element={<NotFound />} />
				<Route path="/notadmin" element={<NotAdmin />} />
				
			</Routes>
		</div>
  )
}

export default App
