import React, { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, Facebook } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from "../../Components/Footer";
import api from '../../api';

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

  useEffect(() => {
    const fetchContactContent = async () => {
      try {
        const response = await api.get('/firstapp/contact-page/');
        const apiData = Array.isArray(response.data)
          ? response.data[response.data.length - 1]
          : response.data;

        if (!apiData) return;

        setContent({
          header: {
            highlight: apiData.header_highlight,
            suffix: apiData.header_suffix,
            subtitle: apiData.subtitle,
          },
          info: {
            phone: apiData.phone_number,
            email: apiData.email,
            address: apiData.address,
            facebookLink: apiData.fb_page,
            facebookLabel: apiData.fb_label,
          },
        });
      } catch (err) {
        console.error("Error loading contact CMS data", err);
      }
    };

    fetchContactContent();
  }, []);

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
    <div className="w-full min-h-screen bg-linear-to-br from-white via-red-50 to-white pt-20 sm:pt-24 md:pt-28 lg:pt-32 flex flex-col justify-between">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full animate-fade-in grow">
        
        {/* Header Section */}
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            <span className="text-red-600">{content.header.highlight}</span> {content.header.suffix}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto">
            {content.header.subtitle}
          </p>
        </div>

        {/* Contact Info Form / Grid */}
        <div className="flex flex-col items-center justify-center mb-10 sm:mb-16 px-2">
          <div className="w-full max-w-sm sm:max-w-md md:max-w-xl space-y-3 sm:space-y-4 md:space-y-5">
            {contactInfo.map((item, idx) => {
              const Icon = item.icon;
              return (
                <a 
                  key={idx} 
                  href={item.link}
                  className="flex w-full cursor-pointer flex-col items-start gap-4 transition-transform duration-300 group sm:flex-row sm:items-center md:hover:scale-[1.02]"
                >
                  <div className={`${item.color} ${item.iconColor} p-4 rounded-xl border shrink-0 hidden sm:flex`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 w-full bg-white border border-gray-100 p-3 sm:p-4 md:p-5 rounded-xl shadow-sm flex items-center gap-3 sm:gap-4 sm:block">
                    {/* Mobile icon inside card */}
                    <div className={`${item.color} ${item.iconColor} p-3 rounded-xl border shrink-0 sm:hidden`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm sm:text-base wrap-break-word">{item.value}</div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">{item.label}</div>
                    </div>
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