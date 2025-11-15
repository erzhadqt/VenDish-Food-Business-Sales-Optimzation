import React from 'react'

const Header = () => {
  return (
    <header className="p-1 flex gap-3 bg-black items-center">
        <div className="">
            <img src="/icon.jpeg" alt="" className="h-10 w-10 mr-1 rounded-2xl"></img>
        </div>

        <span className="font-bold text-white text-sm">KUYA VINCE</span>
        <span className="font-bold text-red-700 text-md">KARINDERYA</span>
        
    </header>
  )
}

export default Header