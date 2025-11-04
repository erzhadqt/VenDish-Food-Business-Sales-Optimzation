import React from 'react'

const Header = () => {
  return (
    <header className="p-4 flex gap-3 bg-black">
        <div className="">
            <img src="/icon.jpeg" alt="" className="h-10 w-10 mr-1 rounded-2xl"></img>
        </div>

        <h1 className="font-bold text-white mt-1.5">KUYA VINCE</h1>
        <span className="font-bold text-red-700 mt-1 text-lg">KARINDERYA</span>
        
    </header>
  )
}

export default Header