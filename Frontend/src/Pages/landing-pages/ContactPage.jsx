import React from 'react';
import { Phone, Mail, MapPin, Facebook, MessageCircle, Clock } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from "../../Components/Footer";

const ContactPage = () => {
  const contactInfo = [
    { icon: Phone, label: 'Phone', value: '+63 966-7106-528', color: 'bg-purple-100 border-purple-200', iconColor: 'text-purple-600', link: 'tel:09*****' },
    { icon: Mail, label: 'Email', value: 'gentech@gmail.com', color: 'bg-red-100 border-red-200', iconColor: 'text-red-600', link: 'mailto:ag@sads' },
    { icon: MapPin, label: 'Address', value: 'ZAMBOANGA CITY, PHILIPPINES', color: 'bg-pink-100 border-pink-200', iconColor: 'text-pink-600', link: '#' },
    { icon: Facebook, label: 'Facebook', value: 'GenTech Page', color: 'bg-blue-100 border-blue-200', iconColor: 'text-blue-600', link: 'https://www.facebook.com/erzhadqt' },
    { icon: Clock, label: 'Business Hours', value: '6:00 AM - 9:00 PM Daily', color: 'bg-green-100 border-green-200', iconColor: 'text-green-600', link: '#' }
  ];

  const businessInfo = {
    name: "KUYA VINCE KARINDERYA",
    tagline: "SAVOR THE TASTE OF LOVE AND TRADITION IN EVERY BITE...",
    address: "ZAMBOANGA CITY, PHILIPPINES",
    owner: "VINCE",
    hours: "6:00 AM - 9:00 PM Daily"
  };

  return (
    <div className="w-full min-h-screen bg-linear-to-br from-white via-red-50 to-white pt-35">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            <span className="text-red-600">CONTACT</span> US
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            We’d love to hear from you! Whether you’re ordering, catering, or just saying hi — reach out anytime.
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid lg:grid-cols-2 gap-10 items-start mb-16">
          
          {/* Left Side - Info Cards */}
          <div className="space-y-5">
            {contactInfo.map((item, idx) => {
              const Icon = item.icon;
              return (
                <a 
                  key={idx} 
                  href={item.link}
                  className="flex items-center space-x-4 group cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                >
                  <div className={`${item.color} ${item.iconColor} p-4 rounded-xl border group-hover:shadow-md transition-all duration-300`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="font-semibold text-gray-900">{item.value}</div>
                    <div className="text-sm text-gray-600 mt-1">{item.label}</div>
                  </div>
                </a>
              );
            })}
          </div>

        
          {/* <div className="flex justify-center">
            <div className="bg-white shadow-xl rounded-2xl p-10 border border-gray-100 text-center w-full max-w-md space-y-6">
              <div className="bg-linear-to-r from-red-500 to-red-700 w-32 h-32 flex items-center justify-center rounded-full mx-auto shadow-lg">
                <MessageCircle size={64} className="text-white" />
              </div>
              <h2 className="text-4xl font-bold text-red-600 leading-tight">ORDER NOW</h2>
              <p className="text-gray-600">
                Ready to enjoy the best Filipino comfort food? Call us or send a message!
              </p>
              <button className="bg-linear-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-300 hover:shadow-xl">
                Place Your Order
              </button>
              <p className="text-sm text-gray-500 pt-3 border-t border-gray-200">
                Prefer to call? <a href="tel:09*****" className="text-red-600 font-semibold hover:underline">09*****</a>
              </p>
            </div>
          </div> */}
        </div>

        {/* Business Info + Extra Details */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 space-y-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {businessInfo.name.split(' ')[0]} <span className="text-red-600">{businessInfo.name.split(' ')[1]}</span>
            </h2>
            <p className="italic text-gray-600">{businessInfo.tagline}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 text-gray-700">
            <div>
              <h3 className="text-red-600 font-bold mb-4 border-b border-red-200 pb-2">OUR SERVICES</h3>
              <ul className="space-y-2">
                {['Good Quality Foods', 'Friendly'].map((item, idx) => (
                  <li key={idx} className="flex items-center space-x-2 group">
                    <div className="w-2 h-2 bg-red-600 rounded-full group-hover:scale-125 transition-transform"></div>
                    <span className="group-hover:text-red-600 transition-colors">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-red-600 font-bold mb-4 border-b border-red-200 pb-2">WHY CHOOSE US</h3>
              <ul className="space-y-2">
                {['Authentic Filipino Recipes', 'Fresh Ingredients Daily', 'Family-Owned Business', 'Affordable Prices'].map((item, idx) => (
                  <li key={idx} className="flex items-center space-x-2 group">
                    <div className="w-2 h-2 bg-red-600 rounded-full group-hover:scale-125 transition-transform"></div>
                    <span className="group-hover:text-red-600 transition-colors">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
};

export default ContactPage;
