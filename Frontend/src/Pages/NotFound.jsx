import React from 'react'
import { useNavigate } from 'react-router-dom'

const NotFound = () => {
    const navigate = useNavigate()
  return (
    <div className='w-full h-screen flex flex-col gap-2 justify-center items-center text-4xl bg-gray-50'>
        <p className="font-bold text-5xl animate-bounce">404</p>
        <p className="font-semibold ">Page Not Found</p>

        <button onClick={() => navigate(-1)} className='bg-zinc-700 px-2 py-1 rounded-md text-lg mt-3 text-zinc-200'>
        Go Back
      </button>
    </div>
  )
}

export default NotFound