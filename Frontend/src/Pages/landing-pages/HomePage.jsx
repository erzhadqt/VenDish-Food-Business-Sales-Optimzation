import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Facebook, MessageCircle, Twitter, Instagram, Utensils, Star, Users, Clock, Smartphone, ArrowDownIcon } from 'lucide-react';
import Navigation from '../../Components/Navigation'; // adjust path if needed
import Footer from '../../Components/Footer';
import Carousel from '../../Components/Carousel';
import TextAnimations from '../../Components/TextAnimations';

const HomePage = () => {
	const navigate = useNavigate()

  const slides = [
    "/pic1.jpg",
    "/pic2.jpg",
    "/pic3.jpg",
    "/pic4.jpg",
    "/pic6.jpg",
    "/pic7.jpg",
    "/pic8.jpg",
    "/pic9.jpg",
    "/pic10.jpg",
    "/pic11.jpg",
  ]

  const features = [
    { icon: Utensils, title: "Authentic Recipes", description: "Traditional Filipino dishes passed down through generations" },
    { icon: Star, title: "Fresh Ingredients", description: "Daily prepared with the freshest local ingredients" },
    { icon: Users, title: "Family-Owned", description: "Serving with genuine care and hospitality" },
    { icon: Clock, title: "Always Ready", description: "Open daily to satisfy your cravings" }
  ];

  const popularDishes = ["Chicken Adobo", "Pork Sisig", "Beef Sinigang", "Kare-Kare"];

  return (
    <div className="w-full min-h-screen bg-linear-to-br from-white via-red-100 to-white font-poppins">
      {/* Navigation */}
      <Navigation />

      <div className="max-w-7xl mx-auto px-6">

        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-20 py-16 lg:py-24">
          
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left space-y-8 animate-fade-in">
            <div className="space-y-3">
              <h1 className="text-3xl lg:text-6xl font-bold text-gray-900 leading-tight ">
                <span className="">SAVOR THE TASTE OF </span>
                <span className="text-red-600">LOVE</span>
                <span className=""> AND TRADITION</span>
              </h1>
              <h2 className="text-3xl lg:text-5xl font-bold text-gray-800">
                IN EVERY <span className="text-red-600">BITE</span>
              </h2>
            </div>

            <p className="text-gray-700 text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
              At <span className="text-red-600 font-semibold">Kuya Vince Karinderya</span>, we take pride in serving the best 
              <span className="text-red-600 font-semibold"> Pinoy bayan cuisine</span> — flavorful, hearty, and made just like how 
              <span className="font-semibold"> lola</span> used to cook.
            </p>

            {/* Popular Dishes */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 max-w-md mx-auto lg:mx-0">
              <h3 className="font-bold text-red-600 mb-3 text-lg">POPULAR DISHES</h3>
              <div className="grid grid-cols-2 gap-2">
                {popularDishes.map((dish, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-gray-700">
                    <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    <span className="text-sm font-medium">{dish}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            {/* <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <p>are you an admin? Log in</p>
              <button className="bg-linear-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
                Admin? Log in
              </button>
              <button className="border-2 border-red-600 text-red-600 px-8 py-3 rounded-xl font-semibold hover:bg-red-600 hover:text-white transition-all duration-300 transform hover:scale-105">
                View Menu
              </button>
            </div> */}

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

          {/* Right Content - Logo Circle */}
          <div className="flex-1 flex lg:justify-end animate-fade-in">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 ">
              <div className="absolute inset-0 bg-red-200 rounded-full "></div>
              <div className="animate-bounce relative w-full h-full bg-linear-to-r from-red-500 to-red-700 rounded-full items-center justify-center shadow-2xl border-8 border-white text-white bg-cover bg-center" style={{ backgroundImage: "url('/icon.jpeg')" }}>
                {/* <ChefHat size={70} className="animate-bounce mb-3" />
                <h2 className="text-2xl lg:text-3xl font-bold tracking-wide">KUYA VINCE</h2>
                <h3 className="text-3xl lg:text-4xl font-bold tracking-wider">KARINDERYA</h3>
                <p className="text-sm opacity-80 mt-3">SINCE 2025</p> */}
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

			{/* Right Content: Carousel */}
			<div className="lg:w-1/2 bg-linear-to-br from-gray-100 via-red-100 to-gray-100 px-10 shadow-lg rounded">
				<div className="w-full max-w-4xl mx-auto">
				<Carousel slides={slides} />
				</div>
			</div>
			</div>
        {/* <div className="flex-row items-center justify-center w-100 mx-auto px-5 py-5 text-center mt-10">
            <p className="pb-2 text-zinc-700">are you an admin? </p>

            <button onClick={() => navigate("/notadmin")} className="flex gap-2 items-center mx-auto bg-linear-to-r from-red-600 to-red-700 text-white px-5 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-300 hover:shadow-lg transform hover:scale-105">
              Log in <ArrowRight className="flex justify-center" />
            </button>
        </div> */}
      </div>
      <Footer />
    </div>
  );
};

export default HomePage;