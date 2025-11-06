import React from 'react'
import { FaHome, FaUserCheck, FaFileInvoice } from "react-icons/fa";
import { MdMenu, MdShowChart, MdFeedback } from "react-icons/md";
import { BsBoxArrowRight } from "react-icons/bs";



import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState("admin");
    const navigate = useNavigate();

  return (
    <div className="flex w-50 bg-gradient-to-b from-red-900 to-gray-900 h-screen">
        <nav className="flex-col text-white mt-10">
            <div onClick={() => setActiveTab("admin")} className={` p-4 cursor-pointer font-bold w-50 ${activeTab === "admin" ? "bg-red-500 font-bold text-gray-300" : ""}`}>
                <NavLink to="/admin" className="flex gap-3">
                <FaHome className="text-white text-2xl" />
                Home
                </NavLink>
            </div>
            <div onClick={() => setActiveTab("menu")} className={`p-4 cursor-pointer font-bold w-50 ${activeTab === "menu" ? "bg-red-500 font-bold text-gray-300" : ""}`}>
                <NavLink to="/menu" className="flex gap-3">
                <MdMenu className="text-3xl text-white mt-3" />
                Menu & Products
                </NavLink>
            </div>
            <div onClick={() => setActiveTab("sales")} className={`p-4 cursor-pointer font-bold w-50 ${activeTab === "sales" ? "bg-red-500 font-bold text-gray-300" : ""}`}>
                <NavLink to="/sales" className="flex gap-3">
                <MdShowChart className="text-white text-2xl" />
                Sales & Reports
                </NavLink>
            </div>
            <div onClick={() => setActiveTab("customerFeedback")} className={`p-4 cursor-pointer font-bold w-50 ${activeTab === "customerFeedback" ? "bg-red-500 font-bold text-gray-300" : ""}`}>
                <NavLink to="/customerFeedback" className="flex gap-3">
                <MdFeedback className="text-white text-2xl mt-4" />
                Customer Feedback
                </NavLink>
            </div>
            <div onClick={() => setActiveTab("userManagement")} className={`p-4 cursor-pointer font-bold w-50 ${activeTab === "userManagement" ? "bg-red-500 font-bold text-gray-300" : ""}`}>
                <NavLink to="/userManagement" className="flex gap-3">
                <FaUserCheck className="text-white mt-3 text-2xl" />
                User Management
                </NavLink>
            </div>
            <div onClick={() => setActiveTab("invoices")} className={`p-4 cursor-pointer font-bold w-50 ${activeTab === "invoices" ? "bg-red-500 font-bold text-gray-300" : ""}`}>
                <NavLink to="/invoices" className="flex gap-3">
                <FaFileInvoice className="text-white text-2xl" />
                Invoices
                </NavLink>
            </div>
            
            <div onClick={() => navigate('/')} className='cursor-pointer rounded-full h-10 w-[80%] mx-auto bg-red-700 flex justify-center gap-3 items-center mt-35'>
                <BsBoxArrowRight size={22} color='black' />
                <button onClick={() => navigate('/')} className='cursor-pointer bg-transparent outline-0 text-white font-bold'>Logout</button>
            </div>
            
            
        </nav>
    </div>
  )
}

export default Sidebar