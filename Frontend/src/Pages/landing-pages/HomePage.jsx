import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Facebook, MessageCircle, Twitter, Instagram, Utensils, Star, Users, Clock, Smartphone, ArrowDownIcon } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from '../../Components/Footer';
import Carousel from '../../Components/Carousel';
import TextAnimations from '../../Components/TextAnimations';
import api from '../../api';

// Default content (fallback if CMS hasn't been used yet)
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
    descriptionFinal: "used to cook."
  },
  dishes: "POPULAR DISHES"
};

const HomePage = () => {
  const navigate = useNavigate();
  
  const [homePageData, setHomePageData] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [popularDishes, setPopularDishes] = useState([]);
  const [carouselImages, setCarouselImages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch HomePage content from Django
  const fetchHomePageData = () => {
    const timestamp = new Date().getTime(); 
    api
      .get(`/firstapp/home/?_t=${timestamp}`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setHomePageData(res.data[0]);
        }
      })
      .catch((err) => console.error('HomePage API error:', err));
  };

  
  const fetchPopularDishes = () => {
    const timestamp = new Date().getTime();
    api
      .get(`/firstapp/popular-dishes/?_t=${timestamp}`)
      .then((res) => {
        console.log('🔍 Popular Dishes API Response:', res.data);
        setPopularDishes(res.data || []);
      })
      .catch((err) => {
        console.error('❌ Error loading popular dishes:', err);
        console.error('Error details:', err.response);
        setPopularDishes([]);
      });
  };

 
  const fetchCarouselImages = () => {
    const timestamp = new Date().getTime();
    api
      .get(`/firstapp/homepage-images/by_type/?type=carousel&_t=${timestamp}`)
      .then((res) => {
        console.log('🔍 Carousel Images from backend:', res.data);
        const imageUrls = res.data.map(img => img.image);
        setCarouselImages(imageUrls);
      })
      .catch((err) => {
        console.error('Error loading carousel images:', err);
        setCarouselImages([]);
      });
  };

  // Fetch Products from same API as ProductList
  const fetchFeaturedProducts = () => {
    setLoading(true);
    const timestamp = new Date().getTime(); 

    api
      .get(`/firstapp/products/?_t=${timestamp}`)
      .then((res) => {
        // Filter available products
        const availableProducts = res.data.filter(product => {
          if (product.track_stock) {
            return product.stock_quantity > 0;
          }
          return product.is_available;
        });
        
        setFeaturedProducts(availableProducts.slice(0, 8)); // Show max 8 on homepage
        setLoading(false);
      })
      .catch((err) => {
        console.error('Products API error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    
    fetchHomePageData();
    fetchFeaturedProducts();
    fetchPopularDishes();
    fetchCarouselImages();
  }, []);

  // Fallback slides if no carousel images from backend
  const fallbackSlides = [
    "/pic1.jpg", "/pic2.jpg", "/pic3.jpg", "/pic4.jpg", "/pic6.jpg",
    "/pic7.jpg", "/pic8.jpg", "/pic9.jpg", "/pic10.jpg", "/pic11.jpg",
  ];

  // Use carousel images from backend if available, otherwise use fallback
  const slides = carouselImages.length > 0 ? carouselImages : fallbackSlides;

  const features = [
    { icon: Utensils, title: "Authentic Recipes", description: "Traditional Filipino dishes passed down through generations" },
    { icon: Star, title: "Fresh Ingredients", description: "Daily prepared with the freshest local ingredients" },
    { icon: Users, title: "Family-Owned", description: "Serving with genuine care and hospitality" },
    { icon: Clock, title: "Always Ready", description: "Open daily to satisfy your cravings" }
  ];

  return (
    <div className="w-full min-h-screen bg-linear-to-br from-white via-red-100 to-white font-poppins">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6">

        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-20 py-16 lg:py-24">
          
          
          <div className="flex-1 text-center lg:text-left space-y-8 animate-fade-in">
            <div className="space-y-3">
              <h1 className="text-3xl lg:text-6xl font-bold text-gray-900 leading-tight ">
                <span className="">
                  {homePageData?.hero_line1_start || DEFAULT_CONTENT.hero.line1Start}{" "}
                </span>
                <span className="text-red-600">
                  {homePageData?.hero_line1_highlight || DEFAULT_CONTENT.hero.line1Highlight}
                </span>
                <span className="">
                  {" "}{homePageData?.hero_line1_end || DEFAULT_CONTENT.hero.line1End}
                </span>
              </h1>
              <h2 className="text-3xl lg:text-5xl font-bold text-gray-800">
                {homePageData?.hero_line2_start || DEFAULT_CONTENT.hero.line2Start}{" "}
                <span className="text-red-600">
                  {homePageData?.hero_line2_highlight || DEFAULT_CONTENT.hero.line2Highlight}
                </span>
              </h2>
            </div>

            <p className="text-gray-700 text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
              {homePageData?.description_start || DEFAULT_CONTENT.hero.descriptionStart}{" "}
              <span className="text-red-600 font-semibold">
                {homePageData?.brand_name || DEFAULT_CONTENT.hero.brandName}
              </span>
              {homePageData?.description_middle || DEFAULT_CONTENT.hero.descriptionMiddle}{" "}
              <span className="text-red-600 font-semibold">
                {homePageData?.cuisine_type || DEFAULT_CONTENT.hero.cuisineType}
              </span>{" "}
              {homePageData?.description_end || DEFAULT_CONTENT.hero.descriptionEnd}{" "}
              <span className="font-semibold">
                {homePageData?.lola_text || DEFAULT_CONTENT.hero.lolaText}
              </span>{" "}
              {homePageData?.description_final || DEFAULT_CONTENT.hero.descriptionFinal}
            </p>

            
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 max-w-md mx-auto lg:mx-0">
              <h3 className="font-bold text-red-600 mb-3 text-lg">
                {homePageData?.dishes || DEFAULT_CONTENT.dishes}
              </h3>
              
              {popularDishes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {popularDishes.map((dish, idx) => (
                    <div key={dish.id || idx} className="flex items-center space-x-2 text-gray-700">
                      <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                      <span className="text-sm font-medium">{dish.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm italic">No popular dishes added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add dishes in the CMS</p>
                </div>
              )}
            </div>

            {/* Social Media */}
            <div className="pt-6">
              <h3 className="text-red-600 font-bold mb-3 text-lg">FOLLOW US</h3>
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
                      className={`${social.color} w-11 h-11 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg`}
                    >
                      <Icon size={20} className="text-white" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Logo Circle WITH BOUNCE ANIMATION */}
          <div className="flex-1 flex lg:justify-end animate-fade-in">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 ">
              <div className="absolute inset-0 bg-red-200 rounded-full "></div>
              <div 
                className="animate-bounce relative w-full h-full bg-linear-to-r from-red-500 to-red-700 rounded-full items-center justify-center shadow-2xl border-8 border-white text-white bg-cover bg-center" 
                style={{ 
                  backgroundImage: homePageData?.banner_image 
                    ? `url(${homePageData.banner_image})` 
                    : "url('/icon.jpeg')" 
                }}
              >
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-16 lg:py-20 border-t border-gray-100 shadow-2xl animate-fade-in rounded-xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              WHY CHOOSE <span className="text-red-600">KUYA VINCE</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Experience the warmth and authenticity of true Filipino home cooking.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="text-center p-6 rounded-2xl hover:bg-red-50 transition-all duration-300 group cursor-pointer">
                  <div className="bg-red-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-red-200 transition-colors duration-300">
                    <Icon className="text-red-600" size={32} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Featured Products Section */}
        {!loading && featuredProducts.length > 0 && (
          <section className="py-16 lg:py-20 animate-fade-in">
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
                OUR <span className="text-red-600">MENU</span>
              </h2>
              <p className="text-gray-600 text-lg">Fresh from the kitchen, served with love</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                  {product.image && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.product_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{product.product_name}</h3>
                    <p className="text-red-600 text-sm mb-2">{product.category}</p>
                    <p className="text-2xl font-bold text-gray-900">₱{product.price}</p>
                    {!product.is_available && (
                      <span className="inline-block mt-2 bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Carousel Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 py-10 animate-fade-in">
          {/* Left Content: Text and Button */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 lg:w-1/2">
            <TextAnimations />

            <p className="flex items-center gap-2 text-zinc-700 text-lg">
              Get our app now <ArrowDownIcon size={26} />
            </p>

            <button
              onClick={() => navigate('/notfound')}
              className="bg-red-600 px-6 py-3 rounded-xl text-xl font-bold text-white flex items-center gap-2 hover:bg-red-700 transition-all"
            >
              Get app
              <Smartphone size={30} />
            </button>
          </div>

          {/* Carousel */}
          <div className="lg:w-1/2 bg-linear-to-br from-gray-100 via-red-100 to-gray-100 px-10 shadow-lg rounded">
            <div className="w-full max-w-4xl mx-auto">
              <Carousel slides={slides} />
              {carouselImages.length === 0 && (
                <p className="text-center text-xs text-gray-500 mt-2">
                  Using default images. Add carousel images in CMS.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HomePage;