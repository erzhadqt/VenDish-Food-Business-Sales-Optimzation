import { ReactTyped } from "react-typed";

const TextAnimations = () => (
  <div className="mb-30">
    <ReactTyped strings={["Get All This on our App:"]} typeSpeed={40} className="text-5xl text-zinc-800 font-semibold"/>
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
      className="text-6xl font-semibold"
      loop
    >
      <input type="text" />
    </ReactTyped>
  </div>
);

export default TextAnimations