import React, { useState, useEffect } from 'react';
import { Star, Quote, Heart } from 'lucide-react';
import Navigation from '../../Components/Navigation';
import Footer from '../../Components/Footer';
import axios from 'axios';

// Map Icon Strings to Components
const ICON_MAP = {
  'Heart': Heart,
  'Star': Star,
  'Quote': Quote
};

// Default Data 
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
  testimonials: []
};

const AboutPage = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [content, setContent] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

 
  useEffect(() => {
    loadAboutData();
  }, []);

  const loadAboutData = () => {
    const timestamp = new Date().getTime();
    
    // Load About Page Content
    axios.get(`http://localhost:8000/firstapp/about-page/?_t=${timestamp}`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const data = res.data[0];
          setContent(prev => ({
            ...prev,
            header: {
              line1: data.header_line1 || DEFAULT_DATA.header.line1,
              line1Highlight: data.header_line1_highlight || DEFAULT_DATA.header.line1Highlight,
              line1End: data.header_line1_end || DEFAULT_DATA.header.line1End,
              line1Highlight2: data.header_line1_highlight2 || DEFAULT_DATA.header.line1Highlight2,
              line2: data.header_line2 || DEFAULT_DATA.header.line2,
              line2Highlight: data.header_line2_highlight || DEFAULT_DATA.header.line2Highlight,
              line2End: data.header_line2_end || DEFAULT_DATA.header.line2End,
              line2Highlight2: data.header_line2_highlight2 || DEFAULT_DATA.header.line2Highlight2
            },
            values: data.values || DEFAULT_DATA.values,
            story: {
              title: data.story_title || DEFAULT_DATA.story.title,
              p1: data.story_p1 || DEFAULT_DATA.story.p1,
              p2: data.story_p2 || DEFAULT_DATA.story.p2,
              footer: data.story_footer || DEFAULT_DATA.story.footer
            }
          }));
        }
      })
      .catch((err) => console.error('Error loading about page:', err));

    // Load Testimonials
    axios.get(`http://localhost:8000/firstapp/testimonials/?_t=${timestamp}`)
      .then((res) => {
        setContent(prev => ({
          ...prev,
          testimonials: res.data || []
        }));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading testimonials:', err);
        setLoading(false);
      });
  };

  return (
    <div className="w-full min-h-screen bg-linear-to-b from-white via-red-50 to-white pt-40">
      <Navigation />
      
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-gray-500 mt-4">Loading content...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 animate-fade-in">

          {/* HEADER SECTION - Database Controlled */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              {content.header.line1} <span className="text-red-600">{content.header.line1Highlight}</span> {content.header.line1End}{" "}
              <span className="text-red-600">{content.header.line1Highlight2}</span>
            </h1>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold">
              {content.header.line2} <span className="text-red-600">{content.header.line2Highlight}</span> {content.header.line2End}{" "}
              <span className="text-red-600">{content.header.line2Highlight2}</span>
            </h2>
          </div>

          {/* VALUES SECTION - */}
          <div className="max-w-5xl mx-auto text-center pt-20">
            <div className="grid sm:grid-cols-3 gap-8 mb-12">
              {content.values.map((val, i) => {
                const Icon = ICON_MAP[val.iconName] || Heart;
                return (
                  <div key={i} className="space-y-3">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                      <Icon className="text-red-600" size={30} />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">{val.title}</h3>
                    <p className="text-gray-600 text-sm max-w-xs mx-auto">{val.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* OUR STORY  */}
            <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-lg border border-red-200 text-gray-700 text-base sm:text-lg leading-relaxed space-y-5">
              <h3 className="text-center text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                {content.story.title}
              </h3>
              <p>{content.story.p1}</p>
              <p>{content.story.p2}</p>
              <p className="text-center text-red-600 font-semibold italic pt-4 border-t border-gray-200">
                {content.story.footer}
              </p>
            </div>
          </div>

          {/* TESTIMONIAL SECTION  */}
          {content.testimonials.length > 0 && (
            <div className="text-center space-y-8 pt-30">
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                  WHAT <span className="text-red-600">PEOPLE</span> SAY ABOUT US
                </h2>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto pb-10">
                  Hear from our happy customers who've shared meals and memories with us.
                </p>
              </div>

              {/* ACTIVE TESTIMONIAL */}
              <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-red-200 transition-all duration-300">
                <div className="text-center space-y-6">
                  <div className="text-6xl text-red-600">"</div>
                  <p className="text-lg sm:text-xl text-gray-700 leading-relaxed italic max-w-3xl mx-auto">
                    {content.testimonials[currentTestimonial]?.text}
                  </p>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="font-bold text-red-600 text-lg">
                      {content.testimonials[currentTestimonial]?.author}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {content.testimonials[currentTestimonial]?.role}
                    </div>
                  </div>
                </div>
              </div>

              {content.testimonials.length > 1 && (
                <>
                  <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto mt-6">
                    {content.testimonials.map((t, idx) => (
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

                  <div className="flex justify-center mt-6 space-x-3">
                    {content.testimonials.map((_, idx) => (
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
                </>
              )}
            </div>
          )}
        </div>
      )}
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

export default AboutPage;