import React from 'react'
import { FaHome, FaUserCheck, FaFileInvoice } from "react-icons/fa";
import { MdMenu, MdShowChart, MdFeedback, MdSettings } from "react-icons/md";
import { BsBoxArrowRight } from "react-icons/bs";



import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState("admin");
    const navigate = useNavigate();

  return (
    <div className="flex-col w-60 border-r border-gray-500 bg-gray-50 h-screen">
        <p className='mb-1 p-1 font-semibold'>Dashboard</p>
        <nav className="flex-col text-zinc-800">
            {/* <div onClick={() => setActiveTab("admin")} className={`text-zinc-800 font-semibold mb-1 rounded-full p-2 cursor-pointer w-50 hover:bg-red-500 ${activeTab === "admin" ? "bg-red-500 font-semibold text-gray-300" : ""}`}>
                <NavLink to="/admin" className="flex gap-3">
                <FaHome className="text-2xl" />
                Home
                </NavLink>
            </div> */}
            <div onClick={() => setActiveTab("menu")} className={`text-zinc-800 mb-2 rounded-xs p-2 cursor-pointer font-medium w-50 hover:bg-gray-200 ${activeTab === "menu" ? "bg-gray-300 hover:bg-gray-300 shadow-sm shadow-gray-500 font-medium text-zinc-100" : ""}`}>
                <NavLink to="/menu" className="flex gap-3 items-center">
                <MdMenu className="text-2xl text-zinc-800" />
                Menu & Products
                </NavLink>
            </div>
            <div onClick={() => setActiveTab("sales")} className={`text-zinc-800 mb-2 rounded-xs p-2 cursor-pointer font-medium w-50 hover:bg-gray-200 ${activeTab === "sales" ? "bg-gray-300 hover:bg-gray-300 shadow-sm shadow-gray-500 font-medium text-zinc-300" : ""}`}>
                <NavLink to="/sales" className="flex gap-3">
                <MdShowChart className="text-2xl" />
                Sales & Reports
                </NavLink>
            </div>
            <div onClick={() => setActiveTab("customerFeedback")} className={`text-zinc-800 mb-2 rounded-xs p-2 cursor-pointer font-medium w-50 hover:bg-gray-200 ${activeTab === "customerFeedback" ? "bg-zinc-300 hover:bg-gray-300 shadow-sm shadow-gray-500 font-medium text-gray-300" : ""}`}>
                <NavLink to="/customerFeedback" className="flex gap-3">
                <MdFeedback className="text-2xl mt-4" />
                Customer Feedback
                </NavLink>
            </div>
            <div onClick={() => setActiveTab("userManagement")} className={`text-zinc-800 mb-2 rounded-xs p-2 cursor-pointer font-medium w-50 hover:bg-gray-200 ${activeTab === "userManagement" ? "bg-zinc-300 hover:bg-gray-300 shadow-sm shadow-gray-500 font-medium text-gray-300" : ""}`}>
                <NavLink to="/userManagement" className="flex gap-3">
                <FaUserCheck className="text-2xl" />
                User Management
                </NavLink>
            </div>
            <div onClick={() => setActiveTab("invoices")} className={`text-zinc-800 mb-2 rounded-xs p-2 items-center font-medium w-50 hover:bg-gray-200 ${activeTab === "invoices" ? "bg-gray-300 hover:bg-gray-300 shadow-sm shadow-gray-500 font-medium text-zinc-300" : ""}`}>
                <NavLink to="/invoices" className="flex gap-3">
                <FaFileInvoice className="text-xl" />
                Invoices
                </NavLink>
            </div>

            <p className='mt-3 p-1 font-semibold text-black'>Content Management System</p>
            <div onClick={() => setActiveTab("cms")} className={`text-zinc-800 mb-1 rounded-xs p-2 items-center font-medium w-50 hover:bg-gray-200 ${activeTab === "cms" ? "bg-gray-300 hover:bg-gray-300 font-medium text-zinc-300" : ""}`}>
                <NavLink to="/cms" className="flex gap-3">
                <MdSettings className="text-2xl" />
                CMS
                </NavLink>
            </div>

            
            <div onClick={() => navigate('/')} className='cursor-pointer rounded-full h-10 w-[80%] mx-auto bg-red-700 flex justify-center gap-3 items-center mt-60'>
                <BsBoxArrowRight size={22} color='black' />
                <button onClick={() => navigate('/')} className='cursor-pointer bg-transparent outline-0 text-white font-bold'>Logout</button>
            </div>

        </nav>
    </div>
  )
}

export default Sidebar