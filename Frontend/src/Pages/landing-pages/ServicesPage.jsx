import React from 'react';
import { Utensils, Users, PartyPopper, Clock, Heart, CheckCircle } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from '../../Components/Footer';

const ServicesPage = () => {
  const services = [
    { 
      title: 'DAILY', 
      subtitle: 'SPECIALS', 
      icon: Clock,
      description: 'Freshly cooked meals prepared daily with rotating specials.',
      features: ['5+ Daily Ulams', 'Fresh Ingredients', 'Combo Meals']
    },
    { 
      title: 'AFFORDABLE', 
      subtitle: 'MEAL PLANS', 
      icon: Heart,
      description: 'Budget-friendly meal packages for students and families.',
      features: ['Weekly Plans', 'Family Bundles', 'Student Discounts']
    },
    // { 
    //   title: 'SPECIAL', 
    //   subtitle: 'CATERING', 
    //   icon: PartyPopper,
    //   description: 'Complete catering services for parties and events.',
    //   features: ['Party Trays', 'Full Setup', 'Custom Menus']
    // },
    // { 
    //   title: 'GROUP', 
    //   subtitle: 'RESERVATIONS', 
    //   icon: Users,
    //   description: 'Special arrangements for groups and celebrations.',
    //   features: ['Private Area', 'Advance Orders', 'Special Requests'],
    //   featured: true
    // }
  ];

  // const additionalServices = [
  //   {
  //     title: 'TAKEOUT & DELIVERY',
  //     description: 'Enjoy our food at home with convenient takeout and delivery options.'
  //   },
  //   {
  //     title: 'CUSTOM ORDERS',
  //     description: 'Special requests accommodated with advance notice.'
  //   },
  //   {
  //     title: 'LOYALTY PROGRAM',
  //     description: 'Earn points with every purchase for exclusive rewards.'
  //   }
  // ];

  return (
    <div className="w-full min-h-screen bg-linear-to-br from-white via-red-50 to-white pt-40">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6">

        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            OUR <span className="text-red-600">SERVICES</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
            At <span className="text-red-600 font-semibold">Kuya Vince Karinderya</span>, 
            we extend our warm Filipino hospitality through a wide variety of 
            services designed to bring authentic <span className="italic">Pinoy Bayan Cuisine</span> 
            to every occasion.
          </p>
        </div>

        {/* Services Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20 animate-fade-in">
          
          {/* Service Cards */}
          <div className="grid sm:grid-cols-2 gap-6">
            {services.map((service, idx) => {
              const Icon = service.icon;
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
                    <Icon 
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
              <h3 className="text-2xl font-bold">AUTHENTIC FILIPINO DINING EXPERIENCE</h3>
              <p className="text-white/90 leading-relaxed max-w-md mx-auto">
                Experience the warmth of Filipino hospitality and the rich flavors of traditional 
                <span className="text-yellow-300 font-semibold"> Pinoy Bayan Cuisine</span>.
              </p>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
                {[
                  { label: 'Dishes', value: '50+' },
                  { label: 'Authentic', value: '100%' },
                  { label: 'Service', value: '24/7' }
                ].map((stat, idx) => (
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

        
        {/* <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-10">
            ADDITIONAL <span className="text-red-600">SERVICES</span>
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {additionalServices.map((service, idx) => (
              <div 
                key={idx} 
                className="text-center group p-6 rounded-2xl hover:bg-red-50 transition-all duration-300 cursor-pointer"
              >
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors duration-300">
                  <CheckCircle className="text-red-600" size={28} />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-3">{service.title}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>

          
          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-gray-700 text-lg mb-6">
              Ready to experience authentic Filipino dining?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-linear-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-300 hover:shadow-2xl transform hover:scale-105 shadow-lg">
                Book a Service
              </button>
              <button className="border-2 border-red-600 text-red-600 px-8 py-4 rounded-xl font-semibold hover:bg-red-600 hover:text-white transition-all duration-300 transform hover:scale-105">
                View Full Menu
              </button>
            </div>
          </div>
        </div> */}

      </div> 
      <Footer />
    </div>
  );
};

export default ServicesPage;
