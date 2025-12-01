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
          <div className=''>
            <Sidebar />
          </div>

            <main className="w-screen bg-gray-200">
                <Outlet />
            </main>
        </div>
        
    </div>
  )
}

export default Layout