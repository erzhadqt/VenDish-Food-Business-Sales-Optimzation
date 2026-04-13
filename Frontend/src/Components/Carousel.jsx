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
  }, [autoPlay, interval, slides.length]);
  // -------------------------------------------

  return (
    <div
      className="relative mx-auto w-full max-w-6xl py-4 select-none sm:py-8"
      onMouseEnter={stopAutoPlay}   // Pause when mouse is inside
      onMouseLeave={startAutoPlay}  // Resume autoplay when mouse leaves
    >
      {/* --- Slide Row --- */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
        
        {/* Previous */}
        <button
          type="button"
          className="hidden w-1/4 shrink-0 cursor-pointer transition-all duration-500 md:block"
          onClick={prev}
        >
          <img
            src={slides[curr === 0 ? slides.length - 1 : curr - 1]}
            alt=""
            className="
              h-40 w-full rounded-xl object-contain opacity-50 
              scale-90 -rotate-3
              transition-all duration-500
              hover:opacity-70
            "
          />
        </button>

        {/* Current */}
        <div className="relative w-full shrink-0 md:w-1/2">
          <img
            src={slides[curr]}
            alt="current"
            className="
              h-56 w-full rounded-2xl object-contain shadow-2xl sm:h-80 md:h-112
              transition-all duration-700 ease-out
              scale-105 opacity-100
            "
          />
        </div>

        {/* Next */}
        <button
          type="button"
          className="hidden w-1/4 shrink-0 cursor-pointer transition-all duration-500 md:block"
          onClick={next}
        >
          <img
            src={slides[curr === slides.length - 1 ? 0 : curr + 1]}
            alt=""
            className="
              h-40 w-full rounded-xl object-contain opacity-50
              scale-90 rotate-3
              transition-all duration-500
              hover:opacity-70
            "
          />
        </button>

      </div>

      {/* --- Navigation Buttons --- */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1 sm:px-4">
        <button
          type="button"
          onClick={prev}
          className="
            rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-md
            hover:bg-white transition-all pointer-events-auto
            sm:p-3
          "
        >
          <ChevronLeft className="text-gray-800" size={22} />
        </button>

        <button
          type="button"
          onClick={next}
          className="
            rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-md
            hover:bg-white transition-all pointer-events-auto
            sm:p-3
          "
        >
          <ChevronRight className="text-gray-800" size={22} />
        </button>
      </div>

      {/* --- Dots --- */}
      <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-2 sm:bottom-4 sm:gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurr(i)}
            className={`
              h-2.5 w-2.5 rounded-full transition-all duration-300 sm:h-3 sm:w-3
              ${curr === i ? "bg-white scale-125 shadow-lg" : "bg-white/50 hover:bg-white/70"}
            `}
          ></button>
        ))}
      </div>
    </div>
  );
}

export default Carousel;
