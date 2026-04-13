import React from 'react';
import { MapPin, User } from 'lucide-react';

const Footer = () => (
  <footer className="mt-10 w-full border-t border-gray-200 bg-white text-gray-700">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
      
      {/* === Left Section: Products & Legal === */}
      <div className="flex w-full flex-col gap-8 sm:flex-row sm:gap-16 lg:w-auto">
        <div>
          <h3 className="font-semibold text-red-600 mb-3">Products</h3>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-red-600 cursor-pointer transition">Content Marketing</li>
            <li className="hover:text-red-600 cursor-pointer transition">Email Marketing</li>
            <li className="hover:text-red-600 cursor-pointer transition">Influencer Marketing</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-red-600 mb-3">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-red-600 cursor-pointer transition">Privacy Policy</li>
            <li className="hover:text-red-600 cursor-pointer transition">Terms & Conditions</li>
          </ul>
        </div>
      </div>

      {/* === Right Section: Address & Owner (Right Corner) === */}
      <div className="ml-0 flex w-full flex-col items-start space-y-2 text-left text-sm md:ml-auto md:w-auto md:items-end md:text-right">
        <div className="flex items-center gap-2 md:justify-end">
          <MapPin className="text-red-600" size={18} />
          <p className="font-medium">Zamboanga City, PH</p>
        </div>
        <div className="flex items-center gap-2 md:justify-end">
          <User className="text-red-600" size={18} />
          <p className="font-medium">Vince (Owner)</p>
        </div>
      </div>
    </div>

    {/* === Bottom Copyright === */}
    <div className="border-t border-gray-200 py-4 text-center text-gray-500 text-sm">
      © {new Date().getFullYear()} Kuya Vince Karinderya. All rights reserved.
    </div>
  </footer>
);

export default Footer;
