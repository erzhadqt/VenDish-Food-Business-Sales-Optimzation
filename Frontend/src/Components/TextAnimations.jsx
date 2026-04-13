import { ReactTyped } from "react-typed";

const TextAnimations = () => (
  <div className="mb-8 sm:mb-12">
    <ReactTyped
      strings={["Get All This on our App:"]}
      typeSpeed={40}
      className="block text-2xl font-semibold leading-tight text-zinc-800 sm:text-4xl lg:text-5xl"
    />
    <br />

    <ReactTyped
      strings={[
        "Available Foods",
        "Promos",
        "Discounts",
      ]}
      typeSpeed={40}
      backSpeed={50}
      attr="placeholder"
      className="text-xl font-semibold text-red-600 sm:text-3xl lg:text-4xl"
      loop
    >
      <input
        type="text"
        readOnly
        aria-label="App features"
        className="mt-3 w-full max-w-[18rem] rounded-xl border border-red-200 bg-white/80 px-4 py-2 text-xl font-semibold text-red-600 placeholder:text-red-600/80 focus:outline-none sm:max-w-sm sm:text-3xl"
      />
    </ReactTyped>
  </div>
);

export default TextAnimations