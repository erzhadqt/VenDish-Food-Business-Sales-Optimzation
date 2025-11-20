import React from 'react';
import { MapPin, User } from 'lucide-react';

const Footer = () => (
  <footer className="bg-white border-t border-gray-200 text-gray-700 mt-10 w-full">
    <div className="w-full px-10 py-10 flex flex-col md:flex-row justify-between items-start gap-10">
      
      {/* === Left Section: Products & Legal === */}
      <div className="flex flex-col sm:flex-row gap-16">
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
      <div className="flex flex-col items-end text-sm space-y-2 text-right ml-auto">
        <div className="flex items-center gap-2 justify-end">
          <MapPin className="text-red-600" size={18} />
          <p className="font-medium">Zamboanga City, PH</p>
        </div>
        <div className="flex items-center gap-2 justify-end">
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
