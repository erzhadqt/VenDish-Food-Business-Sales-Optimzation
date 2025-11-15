import React, { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, Facebook, MessageCircle, Clock } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from "../../Components/Footer";
import api from '../../api';

const ContactPage = () => {

  const [contact, setContact] = useState(null);

  useEffect(() => {
    api.get("firstapp/contact/")
      .then((res) => {
        setContact(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch CMS data:", err);
      });
  }, []);

  const contactInfo = contact
    ? [
        { 
          icon: Phone,
          label: "Phone",
          value: contact.phone_number,
          color: "bg-purple-100 border-purple-200",
          iconColor: "text-purple-600",
          link: `tel:${contact.phone_number}`
        },
        { 
          icon: Mail,
          label: "Email",
          value: contact.email,
          color: "bg-red-100 border-red-200",
          iconColor: "text-red-600",
          link: `mailto:${contact.email}`
        },
        { 
          icon: MapPin,
          label: "Address",
          value: contact.address,
          color: "bg-pink-100 border-pink-200",
          iconColor: "text-pink-600",
          link: "#"
        },
        { 
          icon: Facebook,
          label: "Facebook",
          value: contact.fb_page,
          color: "bg-blue-100 border-blue-200",
          iconColor: "text-blue-600",
          link: contact.fb_page
        },
      ]
    : [];

  if (!contact) {
    return (
      <div className="text-center text-gray-600 py-20">
        Loading Contact Info...
      </div>
    );
  }

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
            We’d love to hear from you!
          </p>
        </div>

        {/* Contact Info Grid */}
        <div className="grid lg:grid-cols-2 gap-10 items-start mb-16">
          <div className="space-y-5">
            {contactInfo.map((item, idx) => {
              const Icon = item.icon;
              return (
                <a 
                  key={idx} 
                  href={item.link}
                  className="flex items-center space-x-4 group cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                >
                  <div className={`${item.color} ${item.iconColor} p-4 rounded-xl border`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <div className="font-semibold text-gray-900">{item.value}</div>
                    <div className="text-sm text-gray-600 mt-1">{item.label}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default ContactPage;
