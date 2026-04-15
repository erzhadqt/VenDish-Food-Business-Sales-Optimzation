import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Facebook, MessageCircle, Twitter, Instagram, Utensils, Star, Users, Clock, Smartphone, ArrowDownIcon } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from '../../Components/Footer';
import Carousel from '../../Components/Carousel';
import TextAnimations from '../../Components/TextAnimations';
import api from '../../api';

const DEFAULT_CONTENT = {
  hero: {
    line1Start: "SAVOR THE TASTE OF",
    line1Highlight: "LOVE",
    line1End: "AND TRADITION",
    line2Start: "IN EVERY",
    line2Highlight: "BITE",
    descriptionStart: "At",
    brandName: "Kuya Vince Karinderya",
    descriptionMiddle: ", we take pride in serving the best",
    cuisineType: "Pinoy bayan cuisine",
    descriptionEnd: "— flavorful, hearty, and made just like how",
    lolaText: "lola",
    descriptionFinal: "used to cook.",
    heroImage: ""
  },
  carouselImages: [],
  popularDishes: ["Chicken Adobo", "Pork Sisig", "Beef Sinigang", "Kare-Kare"]
};

const DEFAULT_CAROUSEL_SLIDES = [
  "/pic1.jpg", "/pic2.jpg", "/pic3.jpg", "/pic4.jpg", "/pic6.jpg",
  "/pic7.jpg", "/pic8.jpg", "/pic9.jpg", "/pic10.jpg", "/pic11.jpg",
];

const resolveImageUrl = (path) => {
  if (!path) return "/icon.jpeg";
  if (path.startsWith('http')) return path;
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

const resolveMediaUrl = (path) => {
  if (!path) return "";
  if (path.startsWith('http')) return path;
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

const HomePage = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState(DEFAULT_CONTENT);

  useEffect(() => {
    const fetchHomeContent = async () => {
      try {
        const response = await api.get('/firstapp/home/');
        const apiData = Array.isArray(response.data)
          ? response.data[response.data.length - 1]
          : response.data;

        if (!apiData) return;

        setContent(prev => ({
          ...prev,
          hero: {
            line1Start: apiData.line1_start,
            line1Highlight: apiData.line1_highlight,
            line1End: apiData.line1_end,
            line2Start: apiData.line2_start,
            line2Highlight: apiData.line2_highlight,
            descriptionStart: apiData.description_start,
            brandName: apiData.brand_name,
            descriptionMiddle: apiData.description_middle,
            cuisineType: apiData.cuisine_type,
            descriptionEnd: apiData.description_end,
            lolaText: apiData.lola_text,
            descriptionFinal: apiData.description_final,
            heroImage: apiData.hero_image || "",
          },
          carouselImages: Array.from({ length: 10 }, (_, index) => apiData[`carousel_image_${index + 1}`] || "").filter(Boolean),
          popularDishes: [
            apiData.popular_dish_1,
            apiData.popular_dish_2,
            apiData.popular_dish_3,
            apiData.popular_dish_4,
          ].filter(Boolean),
        }));
      } catch (e) {
        console.error("Error loading home CMS data", e);
      }
    };

    fetchHomeContent();
  }, []);

  const slides = content.carouselImages.length > 0
    ? content.carouselImages.map(resolveMediaUrl).filter(Boolean)
    : DEFAULT_CAROUSEL_SLIDES;

  const features = [
    { icon: Utensils, title: "Authentic Recipes", description: "Traditional Filipino dishes passed down through generations" },
    { icon: Star, title: "Fresh Ingredients", description: "Daily prepared with the freshest local ingredients" },
    { icon: Users, title: "Family-Owned", description: "Serving with genuine care and hospitality" },
    { icon: Clock, title: "Always Ready", description: "Open daily to satisfy your cravings" }
  ];

  return (
    <div className="w-full min-h-screen bg-linear-to-br from-white via-red-100 to-white font-poppins pt-20 sm:pt-24">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Hero Section */}
        <section className="flex flex-col-reverse lg:flex-row items-center justify-between gap-8 sm:gap-12 lg:gap-20 py-8 sm:py-12 lg:py-24">
          
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in w-full">
            <div className="space-y-1 sm:space-y-2 lg:space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                <span>{content.hero.line1Start} </span>
                <span className="text-red-600">{content.hero.line1Highlight}</span>
                <span> {content.hero.line1End}</span>
              </h1>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800">
                {content.hero.line2Start} <span className="text-red-600">{content.hero.line2Highlight}</span>
              </h2>
            </div>

            <p className="text-gray-700 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
              {content.hero.descriptionStart} <span className="text-red-600 font-semibold">{content.hero.brandName}</span>
              {content.hero.descriptionMiddle} 
              <span className="text-red-600 font-semibold"> {content.hero.cuisineType}</span> 
              {content.hero.descriptionEnd} 
              <span className="font-semibold mr-1"> {content.hero.lolaText}</span> 
              {content.hero.descriptionFinal}
            </p>

            {/* Popular Dishes */}
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md border border-gray-100 w-full max-w-md mx-auto lg:mx-0">
              <h3 className="font-bold text-red-600 mb-3 text-base sm:text-lg">POPULAR DISHES</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                {content.popularDishes.map((dish, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-gray-700">
                    <div className="w-2 h-2 bg-red-600 rounded-full shrink-0"></div>
                    <span className="text-sm font-medium">{dish}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div className="pt-4 lg:pt-6">
              <h3 className="text-red-600 font-bold mb-3 text-base sm:text-lg">FOLLOW US</h3>
              <div className="flex justify-center lg:justify-start space-x-4">
                {[
                  { icon: Facebook, color: 'bg-blue-600' },
                  { icon: MessageCircle, color: 'bg-green-500' },
                  { icon: Twitter, color: 'bg-blue-400' },
                  { icon: Instagram, color: 'bg-gradient-to-br from-purple-600 to-pink-600' }
                ].map((social, idx) => {
                  const Icon = social.icon;
                  return (
                    <a 
                      key={idx}
                      href="#"
                      className={`${social.color} w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg`}
                    >
                      <Icon size={18} className="text-white sm:w-5 sm:h-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Content - Logo Circle */}
          <div className="flex-1 flex justify-center lg:justify-end animate-fade-in w-full">
            <div className="relative h-52 w-52 sm:h-72 sm:w-72 md:h-80 md:w-80 lg:h-96 lg:w-96">
              <div className="absolute inset-0 bg-red-200 rounded-full"></div>
              <div className="animate-bounce relative w-full h-full bg-linear-to-r from-red-500 to-red-700 rounded-full items-center justify-center shadow-2xl border-4 sm:border-8 border-white text-white bg-cover bg-center" style={{ backgroundImage: `url('${resolveImageUrl(content.hero.heroImage)}')` }}>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-10 sm:py-12 lg:py-20 px-4 sm:px-6 md:px-8 border-t border-gray-100 shadow-2xl animate-fade-in rounded-xl my-6 sm:my-8">
          <div className="text-center mb-10 lg:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              WHY CHOOSE <span className="text-red-600">KUYA VINCE</span>
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
              Experience the warmth and authenticity of true Filipino home cooking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="text-center p-6 rounded-2xl hover:bg-red-50 transition-all duration-300 group cursor-pointer border border-transparent hover:border-red-100">
                  <div className="bg-red-100 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-red-200 transition-colors duration-300">
                    <Icon className="text-red-600" size={28} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-10 py-8 sm:py-10 animate-fade-in">
          {/* Left Content: Text and Button */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 lg:w-1/2 w-full">
            <TextAnimations />
            <p className="flex items-center gap-2 text-center text-zinc-700 text-base sm:text-lg">
              Get our app now <ArrowDownIcon size={24} className="sm:w-6 sm:h-6" />
            </p>
            <button
              onClick={() => window.location.replace('https://expo.dev/artifacts/eas/fbqMMw3xsotsJUguhuqMhv.apk')}
              className="bg-red-600 px-6 py-3 rounded-xl text-lg sm:text-xl font-bold text-white flex items-center gap-2 hover:bg-red-700 transition-all w-full sm:w-auto justify-center"
            >
              Get app
              <Smartphone size={24} className="sm:w-7 sm:h-7" />
            </button>
          </div>

          {/* Right Content: Carousel */}
          <div className="w-full rounded-xl bg-linear-to-br from-gray-100 via-red-100 to-gray-100 px-3 py-4 shadow-lg sm:px-6 sm:py-6 lg:w-1/2 lg:px-8">
            <div className="w-full max-w-4xl mx-auto">
              <Carousel slides={slides} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HomePage;