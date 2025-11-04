import React from 'react'
import { Outlet } from 'react-router-dom';
import Header from '../Components/Header';
import Sidebar from '../Components/Sidebar';


const Layout = () => {
  return (
    <div className="">
        <header>
            <Header />
        </header>

        <div className="flex">
            <Sidebar />

            <main>
                <Outlet />
            </main>
        </div>
        
    </div>
  )
}

export default Layout