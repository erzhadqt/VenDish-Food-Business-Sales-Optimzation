import React, { useState } from 'react';
import { Star, Quote, Heart } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from '../../Components/Footer';

const AboutPage = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      text: "Kuya Vince Karinderya the best karinderya I've ever been to! All the food there is so delicious and brings back childhood memories! Love it!",
      author: "ANGEL GARCIA",
      role: "REGULAR CUSTOMER"
    },
    {
      text: "Amazing food and great service! The sisig reminds me of home. Will definitely come back again!",
      author: "MARIA SANTOS",
      role: "LOCAL RESIDENT"
    },
    {
      text: "Best Filipino food in town! The adobo is perfectly cooked and the portions are generous. Truly feels like home!",
      author: "JUAN DELA CRUZ",
      role: "FOOD ENTHUSIAST"
    }
  ];

  return (
    <div className="w-full min-h-screen bg-linear-to-b from-white via-red-50 to-white pt-40">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6 animate-fade-in">

        {/* HEADER SECTION */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            WE'RE MORE <span className="text-red-600">THAN</span> JUST A{" "}
            <span className="text-red-600">PLACE TO EAT,</span>
          </h1>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold">
            WE'RE A <span className="text-red-600">TASTE</span> OF{" "}
            <span className="text-red-600">HOME.</span>
          </h2>
        </div>

        {/* VALUES SECTION */}
        <div className="max-w-5xl mx-auto text-center pt-20">
          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            {[
              { icon: Heart, title: 'MALASAKIT', desc: 'Serving with genuine care and compassion' },
              { icon: Star, title: 'SARAP', desc: 'Authentic flavors that remind you of home' },
              { icon: Quote, title: 'TRADITION', desc: 'Recipes passed down through generations' }
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="space-y-3">
                <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Icon className="text-red-600" size={30} />
                </div>
                <h3 className="font-bold text-lg text-gray-900">{title}</h3>
                <p className="text-gray-600 text-sm max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>

          {/* OUR STORY */}
          <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-lg border border-red-200 text-gray-700 text-base sm:text-lg leading-relaxed space-y-5">
            <h3 className="text-center text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
              Our Story
            </h3>
            <p>
              Inspired by the warmth of Filipino karinderyas and the love of home-cooked meals, 
              we bring you the authentic flavors of{" "}
              <span className="text-red-600 font-semibold">pinoy bayan cuisine</span>. 
              Every dish is prepared with care, using traditional recipes passed down through generations, 
              so you can enjoy the comforting taste of lola's cooking in every bite.
            </p>
            <p>
              Our journey started with a simple mission: to serve{" "}
              <span className="text-red-600 font-semibold">
                delicious, affordable, and hearty meals
              </span>{" "}
              that bring people together. Whether you're craving classic adobo, sizzling sisig, 
              or a hearty bowl of sinigang, we're here to make every meal feel like a celebration 
              of Filipino culture and community.
            </p>
            <p className="text-center text-red-600 font-semibold italic pt-4 border-t border-gray-200">
              Masarap, malasakit, tulad ng pamilya!
            </p>
          </div>
        </div>

        {/* TESTIMONIAL SECTION */}
        <div className="text-center space-y-8 pt-30">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              WHAT <span className="text-red-600">PEOPLE</span> SAY ABOUT US
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto pb-10">
              Hear from our happy customers who’ve shared meals and memories with us.
            </p>
          </div>

          {/* ACTIVE TESTIMONIAL */}
          <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-red-200 transition-all duration-300">
            <div className="text-center space-y-6">
              <div className="text-6xl text-red-600">"</div>
              <p className="text-lg sm:text-xl text-gray-700 leading-relaxed italic max-w-3xl mx-auto">
                {testimonials[currentTestimonial].text}
              </p>
              <div className="pt-4 border-t border-gray-200">
                <div className="font-bold text-red-600 text-lg">
                  {testimonials[currentTestimonial].author}
                </div>
                <div className="text-gray-600 text-sm">
                  {testimonials[currentTestimonial].role}
                </div>
              </div>
            </div>
          </div>

          {/* TESTIMONIAL SELECTOR */}
          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto mt-6">
            {testimonials.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTestimonial(idx)}
                className={`flex-1 min-w-[250px] border rounded-xl p-4 transition-all duration-300 ${
                  idx === currentTestimonial
                    ? 'border-red-600 bg-red-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-red-300'
                }`}
              >
                <p className="text-gray-600 text-sm line-clamp-2 mb-2 italic">
                  {t.text}
                </p>
                <div className={`font-semibold text-sm ${
                  idx === currentTestimonial ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {t.author}
                </div>
              </button>
            ))}
          </div>

          {/* DOTS */}
          <div className="flex justify-center mt-6 space-x-3">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTestimonial(idx)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  idx === currentTestimonial
                    ? 'bg-red-600 w-8'
                    : 'bg-gray-300 hover:bg-red-400'
                }`}
                aria-label={`View testimonial ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AboutPage;
