import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";

function Carousel({ slides = [], autoPlay = true, interval = 5000 }) {
  const [curr, setCurr] = useState(0);
  const [animating, setAnimating] = useState(false);
  const slideInterval = useRef(null);

  if (!slides || slides.length === 0) {
    return <div className="text-white text-center p-8">No slides available</div>;
  }

  const next = () => {
    if (animating) return;
    setAnimating(true);
    setCurr((c) => (c === slides.length - 1 ? 0 : c + 1));
  };

  const prev = () => {
    if (animating) return;
    setAnimating(true);
    setCurr((c) => (c === 0 ? slides.length - 1 : c - 1));
  };

  // Smooth animation lock
  useEffect(() => {
    const t = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(t);
  }, [curr]);

  // -------------------------------------------
  //        AUTOPLAY FIXED + CLEANED UP  
  // -------------------------------------------
  const startAutoPlay = () => {
    if (!autoPlay) return;

    // Avoid multiple intervals
    stopAutoPlay();

    slideInterval.current = setInterval(() => {
      next();
    }, interval);
  };

  const stopAutoPlay = () => {
    if (slideInterval.current) {
      clearInterval(slideInterval.current);
      slideInterval.current = null;
    }
  };

  // Start autoplay on mount
  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, []);
  // -------------------------------------------

  return (
    <div
      className="w-full max-w-6xl mx-auto relative py-8 select-none"
      onMouseEnter={stopAutoPlay}   // Pause when mouse is inside
      onMouseLeave={startAutoPlay}  // Resume autoplay when mouse leaves
    >
      {/* --- Slide Row --- */}
      <div className="flex items-center justify-center gap-6">
        
        {/* Previous */}
        <div
          className="w-1/4 shrink-0 transition-all duration-500 cursor-pointer"
          onClick={prev}
        >
          <img
            src={slides[curr === 0 ? slides.length - 1 : curr - 1]}
            alt=""
            className="
              w-full h-64 object-contain rounded-xl opacity-50 
              scale-90 -rotate-3
              transition-all duration-500
              hover:opacity-70
            "
          />
        </div>

        {/* Current */}
        <div className="w-1/2 shrink-0 relative">
          <img
            src={slides[curr]}
            alt="current"
            className="
              w-full h-112 object-contain rounded-2xl shadow-2xl
              transition-all duration-700 ease-out
              scale-105 opacity-100
            "
          />
        </div>

        {/* Next */}
        <div
          className="w-1/4 shrink-0 transition-all duration-500 cursor-pointer"
          onClick={next}
        >
          <img
            src={slides[curr === slides.length - 1 ? 0 : curr + 1]}
            alt=""
            className="
              w-full h-64 object-contain rounded-xl opacity-50
              scale-90 rotate-3
              transition-all duration-500
              hover:opacity-70
            "
          />
        </div>

      </div>

      {/* --- Navigation Buttons --- */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <button
          onClick={prev}
          className="
            p-3 rounded-full shadow-lg bg-white/90 backdrop-blur-md 
            hover:bg-white transition-all pointer-events-auto
          "
        >
          <ChevronLeft className="text-gray-800" size={26} />
        </button>

        <button
          onClick={next}
          className="
            p-3 rounded-full shadow-lg bg-white/90 backdrop-blur-md 
            hover:bg-white transition-all pointer-events-auto
          "
        >
          <ChevronRight className="text-gray-800" size={26} />
        </button>
      </div>

      {/* --- Dots --- */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurr(i)}
            className={`
              h-3 w-3 rounded-full transition-all duration-300
              ${curr === i ? "bg-white scale-125 shadow-lg" : "bg-white/40"}
            `}
          ></button>
        ))}
      </div>
    </div>
  );
}

export default Carousel;
