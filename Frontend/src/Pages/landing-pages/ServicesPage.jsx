import React, { useState, useEffect } from 'react';
import { Utensils, Users, PartyPopper, Clock, Heart, CheckCircle, Star } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from '../../Components/Footer';

const ICON_MAP = {
  'Clock': Clock,
  'Heart': Heart,
  'Utensils': Utensils,
  'PartyPopper': PartyPopper,
  'Users': Users,
  'Star': Star,
};

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
    <div className="w-full min-h-screen bg-linear-to-br from-white via-red-50 to-white pt-20 sm:pt-24 md:pt-32 lg:pt-40 pb-10">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header Section */}
        <div className="text-center mb-10 sm:mb-12 lg:mb-16 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            {content.header.titlePrefix} <span className="text-red-600">{content.header.titleHighlight}</span>
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            {content.header.description}
          </p>
        </div>

        {/* Services Section */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center mb-12 sm:mb-16 lg:mb-20 animate-fade-in">
          
          {/* Service Cards */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-4 sm:gap-6">
            {content.services.map((service, idx) => {
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
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 ${
                    service.featured ? 'bg-white/20' : 'bg-red-100'
                  }`}>
                    <IconComponent 
                      size={28} 
                      className={service.featured ? 'text-white' : 'text-red-600'} 
                    />
                  </div>

                  <div className="mb-3">
                    <h3 className={`font-bold text-lg md:text-xl ${service.featured ? 'text-white' : 'text-gray-900'}`}>
                      {service.title}
                    </h3>
                    <p className={`font-semibold text-base md:text-lg ${service.featured ? 'text-white/90' : 'text-red-600'}`}>
                      {service.subtitle}
                    </p>
                  </div>

                  <p className={`text-sm mb-4 ${service.featured ? 'text-white/80' : 'text-gray-600'}`}>
                    {service.description}
                  </p>

                  <ul className="space-y-2">
                    {service.features.map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex items-start space-x-2">
                        <CheckCircle 
                          size={16} 
                          className={`mt-0.5 shrink-0 ${service.featured ? 'text-white' : 'text-red-600'}`} 
                        />
                        <span className={service.featured ? 'text-white/90 text-xs md:text-sm' : 'text-gray-700 text-xs md:text-sm'}>
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
          <div className="bg-linear-to-br from-red-600 to-red-800 rounded-3xl p-6 sm:p-8 md:p-10 text-white shadow-2xl relative overflow-hidden mt-6 sm:mt-8 lg:mt-0">
            <div className="relative z-10 text-center space-y-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
                <Utensils size={32} className="text-white md:w-10 md:h-10" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold">{content.highlightBox.title}</h3>
              <p className="text-white/90 text-sm md:text-base leading-relaxed max-w-md mx-auto">
                {content.highlightBox.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/20">
                {content.highlightBox.stats.map((stat, idx) => (
                  <div key={idx} className="text-center py-2 sm:py-0">
                    <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
                    <div className="text-white/80 text-xs md:text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="absolute -top-10 -right-10 w-32 h-32 md:w-40 md:h-40 bg-pink-400 opacity-20 blur-3xl rounded-full"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 md:w-40 md:h-40 bg-yellow-400 opacity-20 blur-3xl rounded-full"></div>
          </div>
        </div>

      </div> 
      <Footer />
    </div>
  );
};

export default ServicesPage;