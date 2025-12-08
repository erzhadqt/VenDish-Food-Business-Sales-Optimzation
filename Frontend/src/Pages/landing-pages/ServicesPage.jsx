import React, { useState, useEffect } from 'react';
import { Utensils, Users, PartyPopper, Clock, Heart, CheckCircle, Star } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from '../../Components/Footer';

// 1. Map String Names to Actual Components
const ICON_MAP = {
  'Clock': Clock,
  'Heart': Heart,
  'Utensils': Utensils,
  'PartyPopper': PartyPopper,
  'Users': Users,
  'Star': Star,
};

// 2. Default Data (Fallback)
const DEFAULT_DATA = {
  header: {
    titlePrefix: "OUR",
    titleHighlight: "SERVICES",
    description: "At Kuya Vince Karinderya, we extend our warm Filipino hospitality through a wide variety of services designed to bring authentic Pinoy Bayan Cuisine to every occasion."
  },
  services: [
    { 
      title: 'DAILY', 
      subtitle: 'SPECIALS', 
      iconName: 'Clock',
      description: 'Freshly cooked meals prepared daily with rotating specials.',
      features: ['5+ Daily Ulams', 'Fresh Ingredients', 'Combo Meals'],
      featured: false
    },
    { 
      title: 'AFFORDABLE', 
      subtitle: 'MEAL PLANS', 
      iconName: 'Heart',
      description: 'Budget-friendly meal packages for students and families.',
      features: ['Weekly Plans', 'Family Bundles', 'Student Discounts'],
      featured: false
    }
  ],
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

  // 3. Load Data from LocalStorage
  useEffect(() => {
    const savedData = localStorage.getItem('servicesContent');
    if (savedData) {
      try {
        setContent(JSON.parse(savedData));
      } catch (error) {
        console.error("CMS Load Error", error);
      }
    }
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

        {/* Services Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20 animate-fade-in">
          
          {/* Service Cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            {content.services.map((service, idx) => {
              // Get the icon component from the map, fallback to Utensils if not found
              const IconComponent = ICON_MAP[service.iconName] || Utensils;

              return (
                <div 
                  key={idx}
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

          {/* Experience Highlight Box - Dynamic Data */}
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

      </div> 
      <Footer />
    </div>
  );
};

export default ServicesPage;