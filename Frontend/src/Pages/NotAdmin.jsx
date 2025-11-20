import React from 'react'
import { ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const NotAdmin = () => {
    const navigate = useNavigate()
  return (
    <div className='w-full h-screen flex flex-col gap-2 justify-center items-center bg-gray-50'>
        <ShieldX size={52} className="animate-bounce"/>
        <p className="text-3xl font-medium">No, You are not an admin!</p>

        <button onClick={() => navigate(-1)} className='bg-zinc-700 px-2 py-1 font-medium rounded-md text-lg mt-3 text-zinc-200'>
            GTFO
      </button>
    </div>
  )
}

export default NotAdmin