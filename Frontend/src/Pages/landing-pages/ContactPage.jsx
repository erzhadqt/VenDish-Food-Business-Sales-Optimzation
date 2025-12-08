import React, { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, Facebook } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from "../../Components/Footer";

const DEFAULT_DATA = {
  header: {
    highlight: "CONTACT",
    suffix: "US",
    subtitle: "We’d love to hear from you!"
  },
  info: {
    phone: "0912 345 6789",
    email: "kuyavince@example.com",
    address: "Cagayan de Oro City, Misamis Oriental",
    facebookLink: "https://facebook.com",
    facebookLabel: "Kuya Vince Karinderya"
  }
};

const ContactPage = () => {
  const [content, setContent] = useState(DEFAULT_DATA);

  // Load from LocalStorage
  useEffect(() => {
    const savedData = localStorage.getItem('contactContent');
    if (savedData) {
      try {
        setContent(JSON.parse(savedData));
      } catch (err) {
        console.error("Failed to parse CMS data", err);
      }
    }
  }, []);

  // Map the CMS content to the display array
  const contactInfo = [
    { 
      icon: Phone,
      label: "Phone",
      value: content.info.phone,
      color: "bg-purple-100 border-purple-200",
      iconColor: "text-purple-600",
      link: `tel:${content.info.phone}`
    },
    { 
      icon: Mail,
      label: "Email",
      value: content.info.email,
      color: "bg-red-100 border-red-200",
      iconColor: "text-red-600",
      link: `mailto:${content.info.email}`
    },
    { 
      icon: MapPin,
      label: "Address",
      value: content.info.address,
      color: "bg-pink-100 border-pink-200",
      iconColor: "text-pink-600",
      link: "#"
    },
    { 
      icon: Facebook,
      label: "Facebook",
      value: content.info.facebookLabel,
      color: "bg-blue-100 border-blue-200",
      iconColor: "text-blue-600",
      link: content.info.facebookLink
    },
  ];

  return (
    <div className="w-full min-h-screen bg-linear-to-br from-white via-red-50 to-white pt-35">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-6 animate-fade-in">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            <span className="text-red-600">{content.header.highlight}</span> {content.header.suffix}
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            {content.header.subtitle}
          </p>
        </div>

        {/* Contact Info Grid */}
        <div className="grid lg:grid-row-2 gap-10 items-center justify-center mb-16">
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
                  <div className="w-100 bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
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