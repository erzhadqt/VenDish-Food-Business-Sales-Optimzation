import React, { useState, useEffect } from 'react';
import { Star, Quote, Heart } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from '../../Components/Footer';

const ICON_MAP = {
  'Heart': Heart,
  'Star': Star,
  'Quote': Quote
};

const DEFAULT_DATA = {
  header: {
    line1: "WE'RE MORE",
    line1Highlight: "THAN",
    line1End: "JUST A",
    line1Highlight2: "PLACE TO EAT,",
    line2: "WE'RE A",
    line2Highlight: "TASTE",
    line2End: "OF",
    line2Highlight2: "HOME."
  },
  values: [
    { title: 'MALASAKIT', desc: 'Serving with genuine care and compassion', iconName: 'Heart' },
    { title: 'SARAP', desc: 'Authentic flavors that remind you of home', iconName: 'Star' },
    { title: 'TRADITION', desc: 'Recipes passed down through generations', iconName: 'Quote' }
  ],
  story: {
    title: "Our Story",
    p1: "Inspired by the warmth of Filipino karinderyas and the love of home-cooked meals, we bring you the authentic flavors of pinoy bayan cuisine. Every dish is prepared with care, using traditional recipes passed down through generations, so you can enjoy the comforting taste of lola's cooking in every bite.",
    p2: "Our journey started with a simple mission: to serve delicious, affordable, and hearty meals that bring people together. Whether you're craving classic adobo, sizzling sisig, or a hearty bowl of sinigang, we're here to make every meal feel like a celebration of Filipino culture and community.",
    footer: "Masarap, malasakit, tulad ng pamilya!"
  },
  testimonials: [
    { text: "Kuya Vince Karinderya the best karinderya I've ever been to! All the food there is so delicious and brings back childhood memories! Love it!", author: "ANGEL GARCIA", role: "REGULAR CUSTOMER" },
    { text: "Amazing food and great service! The sisig reminds me of home. Will definitely come back again!", author: "MARIA SANTOS", role: "LOCAL RESIDENT" },
    { text: "Best Filipino food in town! The adobo is perfectly cooked and the portions are generous. Truly feels like home!", author: "JUAN DELA CRUZ", role: "FOOD ENTHUSIAST" }
  ]
};

const AboutPage = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [content, setContent] = useState(DEFAULT_DATA);

  useEffect(() => {
    const savedData = localStorage.getItem('aboutContent');
    if (savedData) {
      try {
        setContent(JSON.parse(savedData));
      } catch (e) {
        console.error("Error loading CMS data", e);
      }
    }
  }, []);

  return (
    <div className="w-full min-h-screen bg-linear-to-b from-white via-red-50 to-white pt-20 sm:pt-24 md:pt-32 lg:pt-40 pb-16">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 animate-fade-in">

        {/* HEADER SECTION */}
        <div className="text-center space-y-2 sm:space-y-3 md:space-y-4 px-2 sm:px-0">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            {content.header.line1} <span className="text-red-600">{content.header.line1Highlight}</span> {content.header.line1End}{" "}
            <span className="text-red-600 block sm:inline">{content.header.line1Highlight2}</span>
          </h1>
          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mt-2">
            {content.header.line2} <span className="text-red-600">{content.header.line2Highlight}</span> {content.header.line2End}{" "}
            <span className="text-red-600">{content.header.line2Highlight2}</span>
          </h2>
        </div>

        {/* VALUES SECTION */}
        <div className="max-w-5xl mx-auto text-center pt-10 sm:pt-16 md:pt-20 px-2 sm:px-0">
          <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-12">
            {content.values.map((val, i) => {
              const Icon = ICON_MAP[val.iconName] || Heart;
              return (
                <div key={i} className="space-y-3 p-4">
                  <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Icon className="text-red-600" size={30} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">{val.title}</h3>
                  <p className="text-gray-600 text-sm max-w-xs mx-auto">{val.desc}</p>
                </div>
              );
            })}
          </div>

          {/* OUR STORY */}
          <div className="bg-white rounded-2xl p-5 sm:p-8 md:p-10 shadow-lg border border-red-200 text-gray-700 text-sm sm:text-base md:text-lg leading-relaxed space-y-4 sm:space-y-5 mx-0 sm:mx-2 md:mx-0">
            <h3 className="text-center text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-4">
              {content.story.title}
            </h3>
            <p>{content.story.p1}</p>
            <p>{content.story.p2}</p>
            <p className="text-center text-red-600 font-semibold italic pt-4 border-t border-gray-200">
              {content.story.footer}
            </p>
          </div>
        </div>

        {/* TESTIMONIAL SECTION */}
        <div className="text-center space-y-5 sm:space-y-6 md:space-y-8 pt-14 sm:pt-20 md:pt-28">
          <div className="space-y-2 px-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
              WHAT <span className="text-red-600">PEOPLE</span> SAY
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto pb-6 sm:pb-10">
              Hear from our happy customers who’ve shared meals and memories with us.
            </p>
          </div>

          {/* ACTIVE TESTIMONIAL */}
          {content.testimonials.length > 0 && (
            <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8 md:p-10 border border-red-200 transition-all duration-300 mx-0 sm:mx-2 md:mx-0">
              <div className="text-center space-y-4 sm:space-y-6">
                <div className="text-5xl sm:text-6xl text-red-600 leading-none h-8 sm:h-12">"</div>
                <p className="text-base sm:text-xl text-gray-700 leading-relaxed italic max-w-3xl mx-auto">
                  {content.testimonials[currentTestimonial]?.text}
                </p>
                <div className="pt-4 border-t border-gray-200">
                  <div className="font-bold text-red-600 text-base sm:text-lg">
                    {content.testimonials[currentTestimonial]?.author}
                  </div>
                  <div className="text-gray-600 text-xs sm:text-sm">
                    {content.testimonials[currentTestimonial]?.role}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TESTIMONIAL SELECTOR */}
          <div className="flex flex-col xs:flex-row flex-wrap justify-center gap-3 sm:gap-4 max-w-4xl mx-auto mt-4 sm:mt-6 px-2 sm:px-0">
            {content.testimonials.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTestimonial(idx)}
                className={`flex-1 w-full xs:w-auto sm:min-w-[200px] md:min-w-[250px] border rounded-xl p-3 sm:p-4 transition-all duration-300 ${
                  idx === currentTestimonial
                    ? 'border-red-600 bg-red-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-red-300'
                }`}
              >
                <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 mb-2 italic">
                  {t.text}
                </p>
                <div className={`font-semibold text-xs sm:text-sm ${
                  idx === currentTestimonial ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {t.author}
                </div>
              </button>
            ))}
          </div>

          {/* DOTS */}
          <div className="flex justify-center mt-6 space-x-3 pb-10">
            {content.testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTestimonial(idx)}
                className={`h-3 rounded-full transition-all duration-300 ${
                  idx === currentTestimonial
                    ? 'bg-red-600 w-8'
                    : 'bg-gray-300 hover:bg-red-400 w-3'
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