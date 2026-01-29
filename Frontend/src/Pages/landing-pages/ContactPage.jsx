import React, { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, Globe } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from "../../Components/Footer";
import axios from 'axios';

// Icon mapping
const ICON_MAP = {
  Phone, Mail, MapPin, Facebook, Instagram, Twitter, Globe
};

const DEFAULT_DATA = {
  header: {
    highlight: "CONTACT",
    suffix: "US",
    subtitle: "We'd love to hear from you!"
  }
};

const ContactPage = () => {
  const [content, setContent] = useState(DEFAULT_DATA);
  const [contactInfo, setContactInfo] = useState([]);
  const [loading, setLoading] = useState(true);

 
  useEffect(() => {
    const timestamp = new Date().getTime();
    
    // Load Contact Page Header
    axios.get(`http://localhost:8000/firstapp/contact-page/?_t=${timestamp}`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const data = res.data[0];
          setContent({
            header: {
              highlight: data.header_highlight || DEFAULT_DATA.header.highlight,
              suffix: data.header_suffix || DEFAULT_DATA.header.suffix,
              subtitle: data.header_subtitle || DEFAULT_DATA.header.subtitle
            }
          });
        }
      })
      .catch((err) => {
        console.error('Error loading contact page:', err);
      });

   
    axios.get(`http://localhost:8000/firstapp/contact-info/?_t=${timestamp}`)
      .then((res) => {
        setContactInfo(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading contact info:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

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

        {/* Contact Info */}
        <div className="grid lg:grid-row-2 gap-10 items-center justify-center mb-16">
          <div className="space-y-5">
            {contactInfo.map((item, idx) => {
              const Icon = ICON_MAP[item.icon_name] || Phone;
              const colorClass = `bg-${item.color}-100 border-${item.color}-200`;
              const iconColorClass = `text-${item.color}-600`;
              
              return (
                <a 
                  key={idx} 
                  href={item.link}
                  target={item.link.startsWith('http') ? '_blank' : '_self'}
                  rel={item.link.startsWith('http') ? 'noopener noreferrer' : ''}
                  className="flex items-center space-x-4 group cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                >
                  <div className={`${colorClass} ${iconColorClass} p-4 rounded-xl border`}>
                    <Icon size={22} />
                  </div>
                  <div className="w-100 bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <div className="font-semibold text-gray-900">{item.value}</div>
                    <div className="text-sm text-gray-600 mt-1">{item.label}</div>
                  </div>
                </a>
              );
            })}
            
            {contactInfo.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No contact information available.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <Footer />
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        /* Tailwind color classes for dynamic colors */
        .bg-purple-100 { background-color: #f3e8ff; }
        .border-purple-200 { border-color: #e9d5ff; }
        .text-purple-600 { color: #9333ea; }
        
        .bg-red-100 { background-color: #fee2e2; }
        .border-red-200 { border-color: #fecaca; }
        .text-red-600 { color: #dc2626; }
        
        .bg-pink-100 { background-color: #fce7f3; }
        .border-pink-200 { border-color: #fbcfe8; }
        .text-pink-600 { color: #db2777; }
        
        .bg-blue-100 { background-color: #dbeafe; }
        .border-blue-200 { border-color: #bfdbfe; }
        .text-blue-600 { color: #2563eb; }
        
        .bg-green-100 { background-color: #dcfce7; }
        .border-green-200 { border-color: #bbf7d0; }
        .text-green-600 { color: #16a34a; }
        
        .bg-yellow-100 { background-color: #fef3c7; }
        .border-yellow-200 { border-color: #fde68a; }
        .text-yellow-600 { color: #ca8a04; }
        
        .bg-indigo-100 { background-color: #e0e7ff; }
        .border-indigo-200 { border-color: #c7d2fe; }
        .text-indigo-600 { color: #4f46e5; }
      `}</style>
    </div>
  );
};

export default ContactPage;