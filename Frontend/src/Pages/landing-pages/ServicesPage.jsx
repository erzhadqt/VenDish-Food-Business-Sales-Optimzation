import React, { useState, useEffect } from 'react';
import { Utensils, Users, PartyPopper, Clock, Heart, CheckCircle, Star } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from '../../Components/Footer';
import axios from 'axios';

// Icon Map
const ICON_MAP = {
  'Clock': Clock,
  'Heart': Heart,
  'Utensils': Utensils,
  'PartyPopper': PartyPopper,
  'Users': Users,
  'Star': Star,
};

// Default Data (Fallback)
const DEFAULT_DATA = {
  header: {
    titlePrefix: "OUR",
    titleHighlight: "SERVICES",
    description: "At Kuya Vince Karinderya, we extend our warm Filipino hospitality through a wide variety of services designed to bring authentic Pinoy Bayan Cuisine to every occasion."
  },
  services: [],
  highlightBox: {
    title: "AUTHENTIC FILIPINO DINING EXPERIENCE",
    description: "Experience the warmth of Filipino hospitality and the rich flavors of traditional Pinoy Bayan Cuisine.",
    stats: [
      { label: 'Dishes', value: '50+' },
      { label: 'Authentic', value: '100%' },
      { label: 'Service', value: '24/7' }
    ]
  }
};

const ServicesPage = () => {
  const [content, setContent] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timestamp = new Date().getTime();
    
    // Fetch Services Page Header & Highlight Box
    axios.get(`http://localhost:8000/firstapp/services-page/?_t=${timestamp}`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const data = res.data[0];
          setContent(prev => ({
            ...prev,
            header: {
              titlePrefix: data.title_prefix || DEFAULT_DATA.header.titlePrefix,
              titleHighlight: data.title_highlight || DEFAULT_DATA.header.titleHighlight,
              description: data.description || DEFAULT_DATA.header.description
            },
            highlightBox: {
              title: data.highlight_title || DEFAULT_DATA.highlightBox.title,
              description: data.highlight_description || DEFAULT_DATA.highlightBox.description,
              stats: data.highlight_stats || DEFAULT_DATA.highlightBox.stats
            }
          }));
        }
      })
      .catch((err) => {
        console.error('Error loading services page:', err);
      });

    // Fetch Services (individual cards)
    axios.get(`http://localhost:8000/firstapp/services/?_t=${timestamp}`)
      .then((res) => {
        console.log('🔍 Loaded Services:', res.data);
        setContent(prev => ({
          ...prev,
          services: res.data || []
        }));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading services:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full min-h-screen bg-linear-to-br from-white via-red-50 to-white pt-40">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6">

        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {content.header.titlePrefix} <span className="text-red-600">{content.header.titleHighlight}</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
            {content.header.description}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            <p className="text-gray-500 mt-4">Loading services...</p>
          </div>
        )}

        {/* Services Section */}
        {!loading && content.services.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20 animate-fade-in">
            
            {/* Service Cards */}
            <div className="grid sm:grid-cols-2 gap-6">
              {content.services.map((service, idx) => {
                const IconComponent = ICON_MAP[service.icon_name] || Utensils;

                return (
                  <div 
                    key={service.id || idx}
                    className={`rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-pointer border-2 ${
                      service.featured 
                        ? 'bg-linear-to-br from-red-600 to-red-700 text-white border-red-700 shadow-2xl' 
                        : 'bg-white border-gray-200 hover:border-red-300 shadow-md'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                      service.featured ? 'bg-white/20' : 'bg-red-100'
                    }`}>
                      <IconComponent 
                        size={32} 
                        className={service.featured ? 'text-white' : 'text-red-600'} 
                      />
                    </div>

                    {/* Title */}
                    <div className="mb-3">
                      <h3 className={`font-bold text-xl ${service.featured ? 'text-white' : 'text-gray-900'}`}>
                        {service.title}
                      </h3>
                      <p className={`font-semibold text-lg ${service.featured ? 'text-white/90' : 'text-red-600'}`}>
                        {service.subtitle}
                      </p>
                    </div>

                    {/* Description */}
                    <p className={`text-sm mb-4 ${service.featured ? 'text-white/80' : 'text-gray-600'}`}>
                      {service.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-2">
                      {service.features.map((feature, featureIdx) => (
                        <li key={featureIdx} className="flex items-center space-x-2">
                          <CheckCircle 
                            size={16} 
                            className={service.featured ? 'text-white' : 'text-red-600'} 
                          />
                          <span className={service.featured ? 'text-white/90 text-xs' : 'text-gray-700 text-xs'}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Experience Highlight Box */}
            <div className="bg-linear-to-br from-red-600 to-red-800 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10 text-center space-y-6">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Utensils size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold">{content.highlightBox.title}</h3>
                <p className="text-white/90 leading-relaxed max-w-md mx-auto">
                  {content.highlightBox.description}
                </p>

                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
                  {content.highlightBox.stats.map((stat, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-white/80 text-sm">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-400 opacity-20 blur-3xl rounded-full"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-yellow-400 opacity-20 blur-3xl rounded-full"></div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && content.services.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No services available yet.</p>
            <p className="text-gray-400 text-sm mt-2">Add services in the CMS to get started!</p>
          </div>
        )}

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
      `}</style>
    </div>
  );
};

export default ServicesPage;