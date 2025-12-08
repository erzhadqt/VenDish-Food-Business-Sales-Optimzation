import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, Trash2, Layout, Coffee, Info, Phone, Heart, Star, Quote, Clock, Utensils, Users, PartyPopper } from 'lucide-react';

// --- DEFAULTS ---
const DEFAULT_HOME_DATA = {
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
  popularDishes: ["Chicken Adobo", "Pork Sisig", "Beef Sinigang", "Kare-Kare"]
};

const DEFAULT_SERVICES_DATA = {
  header: {
    titlePrefix: "OUR",
    titleHighlight: "SERVICES",
    description: "At Kuya Vince Karinderya, we extend our warm Filipino hospitality through a wide variety of services designed to bring authentic Pinoy Bayan Cuisine to every occasion."
  },
  services: [
    { title: 'DAILY', subtitle: 'SPECIALS', iconName: 'Clock', description: 'Freshly cooked meals prepared daily with rotating specials.', features: ['5+ Daily Ulams', 'Fresh Ingredients', 'Combo Meals'], featured: false },
    { title: 'AFFORDABLE', subtitle: 'MEAL PLANS', iconName: 'Heart', description: 'Budget-friendly meal packages for students and families.', features: ['Weekly Plans', 'Family Bundles', 'Student Discounts'], featured: false }
  ],
  highlightBox: {
    title: "AUTHENTIC FILIPINO DINING EXPERIENCE",
    description: "Experience the warmth of Filipino hospitality and the rich flavors of traditional Pinoy Bayan Cuisine.",
    stats: [{ label: 'Dishes', value: '50+' }, { label: 'Authentic', value: '100%' }, { label: 'Service', value: '24/7' }]
  }
};

const DEFAULT_ABOUT_DATA = {
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

const DEFAULT_CONTACT_DATA = {
  header: {
    highlight: "CONTACT",
    suffix: "US",
    subtitle: "We’d love to hear from you!"
  },
  info: {
    phone: "0912 345 6789",
    email: "kuyavince@example.com",
    address: "Cagayan de Oro City, Misamis Oriental",
    facebookLink: "https://facebook.com",
    facebookLabel: "Kuya Vince Karinderya"
  }
};

const CMS = () => {
  const [activeTab, setActiveTab] = useState('home'); 
  const [status, setStatus] = useState('');

  // States
  const [homeData, setHomeData] = useState(DEFAULT_HOME_DATA);
  const [servicesData, setServicesData] = useState(DEFAULT_SERVICES_DATA);
  const [aboutData, setAboutData] = useState(DEFAULT_ABOUT_DATA);
  const [contactData, setContactData] = useState(DEFAULT_CONTACT_DATA);

  // Load Data
  useEffect(() => {
    const savedHome = localStorage.getItem('homepageContent');
    const savedServices = localStorage.getItem('servicesContent');
    const savedAbout = localStorage.getItem('aboutContent');
    const savedContact = localStorage.getItem('contactContent');
    
    if (savedHome) setHomeData(JSON.parse(savedHome));
    if (savedServices) setServicesData(JSON.parse(savedServices));
    if (savedAbout) setAboutData(JSON.parse(savedAbout));
    if (savedContact) setContactData(JSON.parse(savedContact));
  }, []);

  // Save Handler
  const handleSave = () => {
    if (activeTab === 'home') localStorage.setItem('homepageContent', JSON.stringify(homeData));
    else if (activeTab === 'services') localStorage.setItem('servicesContent', JSON.stringify(servicesData));
    else if (activeTab === 'about') localStorage.setItem('aboutContent', JSON.stringify(aboutData));
    else if (activeTab === 'contact') localStorage.setItem('contactContent', JSON.stringify(contactData));
    
    setStatus(`Saved ${activeTab} page successfully!`);
    setTimeout(() => setStatus(''), 3000);
  };

  // Reset Handler
  const handleReset = () => {
    if (window.confirm(`Reset ${activeTab} to default?`)) {
      if (activeTab === 'home') { setHomeData(DEFAULT_HOME_DATA); localStorage.removeItem('homepageContent'); }
      else if (activeTab === 'services') { setServicesData(DEFAULT_SERVICES_DATA); localStorage.removeItem('servicesContent'); }
      else if (activeTab === 'about') { setAboutData(DEFAULT_ABOUT_DATA); localStorage.removeItem('aboutContent'); }
      else if (activeTab === 'contact') { setContactData(DEFAULT_CONTACT_DATA); localStorage.removeItem('contactContent'); }
      
      setStatus('Reset to defaults.');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const InputGroup = ({ label, value, onChange, type = "text" }) => (
    <div className="mb-3">
      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
      {type === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none h-24 text-sm" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none text-sm" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-poppins">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg flex flex-col min-h-[80vh]">
        
        {/* Tabs */}
        <div className="border-b px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">CMS</h1>
          <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {[
              { id: 'home', icon: Layout }, 
              { id: 'services', icon: Coffee }, 
              { id: 'about', icon: Info }, 
              { id: 'contact', icon: Phone }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-2 rounded-md capitalize transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow text-red-600 font-bold' : 'text-gray-600 hover:text-gray-900'}`}>
                <tab.icon size={16} /> {tab.id}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
             <button onClick={handleReset} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><RefreshCw size={20} /></button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 shadow-md">
              <Save size={18} /> Save
            </button>
          </div>
        </div>

        {status && <div className="mx-8 mt-4 p-3 bg-green-100 text-green-700 text-center rounded-lg border border-green-200 animate-fade-in">{status}</div>}

        <div className="p-8 flex-1 overflow-y-auto">
          {/* ======================= HOME TAB ======================= */}
          {activeTab === 'home' && (
            <div className="space-y-8 animate-fade-in">
              <section className="border rounded-xl p-6 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Hero Section</h2>
                
                <h3 className="text-sm font-bold text-gray-600 mb-2">Headline Line 1</h3>
                <div className="grid md:grid-cols-3 gap-3 mb-4">
                   <InputGroup label="Start" value={homeData.hero.line1Start} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, line1Start: v}})} />
                   <InputGroup label="Highlight (Red)" value={homeData.hero.line1Highlight} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, line1Highlight: v}})} />
                   <InputGroup label="End" value={homeData.hero.line1End} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, line1End: v}})} />
                </div>

                <h3 className="text-sm font-bold text-gray-600 mb-2">Headline Line 2</h3>
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                   <InputGroup label="Start" value={homeData.hero.line2Start} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, line2Start: v}})} />
                   <InputGroup label="Highlight (Red)" value={homeData.hero.line2Highlight} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, line2Highlight: v}})} />
                </div>

                <h3 className="text-sm font-bold text-gray-600 mb-2">Paragraph Content</h3>
                <div className="grid md:grid-cols-2 gap-3 mb-2">
                    <InputGroup label="Brand Name (Red)" value={homeData.hero.brandName} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, brandName: v}})} />
                    <InputGroup label="Cuisine Type (Red)" value={homeData.hero.cuisineType} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, cuisineType: v}})} />
                </div>
                 <div className="grid md:grid-cols-2 gap-3">
                    <InputGroup label="Lola Text (Bold)" value={homeData.hero.lolaText} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, lolaText: v}})} />
                    <InputGroup label="Start Text" value={homeData.hero.descriptionStart} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, descriptionStart: v}})} />
                </div>
                <div className="mt-2">
                    <InputGroup label="Middle Text" type="textarea" value={homeData.hero.descriptionMiddle} onChange={(v) => setHomeData({...homeData, hero: {...homeData.hero, descriptionMiddle: v}})} />
                </div>
              </section>

              <section className="border rounded-xl p-6 bg-gray-50">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Popular Dishes</h2>
                    <button onClick={() => setHomeData(p => ({...p, popularDishes: [...p.popularDishes, "New Dish"]}))} className="text-blue-600 text-sm font-bold flex items-center gap-1"><Plus size={16}/> Add</button>
                 </div>
                 <div className="grid md:grid-cols-2 gap-3">
                    {homeData.popularDishes.map((dish, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={dish} onChange={(e) => {
                           const newD = [...homeData.popularDishes]; newD[i] = e.target.value; setHomeData({...homeData, popularDishes: newD});
                        }} className="border p-2 rounded w-full focus:ring-2 focus:ring-red-500 outline-none" />
                        <button onClick={() => {
                            const newD = homeData.popularDishes.filter((_, idx) => idx !== i);
                            setHomeData({...homeData, popularDishes: newD});
                        }} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                      </div>
                    ))}
                 </div>
              </section>
            </div>
          )}

          {/* ======================= SERVICES TAB ======================= */}
          {activeTab === 'services' && (
             <div className="space-y-8 animate-fade-in">
               <section className="border rounded-xl p-6 bg-gray-50">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Page Header</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                     <InputGroup label="Title Prefix" value={servicesData.header.titlePrefix} onChange={(v) => setServicesData({...servicesData, header: {...servicesData.header, titlePrefix: v}})} />
                     <InputGroup label="Highlight (Red)" value={servicesData.header.titleHighlight} onChange={(v) => setServicesData({...servicesData, header: {...servicesData.header, titleHighlight: v}})} />
                  </div>
                  <InputGroup label="Description" type="textarea" value={servicesData.header.description} onChange={(v) => setServicesData({...servicesData, header: {...servicesData.header, description: v}})} />
               </section>

               <section className="border rounded-xl p-6 bg-gray-50">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                     <h2 className="text-xl font-bold text-gray-800">Service Cards</h2>
                     <button onClick={() => setServicesData(prev => ({
                        ...prev, services: [...prev.services, { title: 'New', subtitle: 'Service', iconName: 'Clock', description: 'Description here', features: [], featured: false }]
                     }))} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"><Plus size={16} /> Add Card</button>
                  </div>
                  
                  {servicesData.services.map((svc, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg border shadow-sm mb-4 relative group">
                        <button onClick={() => {
                          const newS = servicesData.services.filter((_, idx) => idx !== i);
                          setServicesData({...servicesData, services: newS});
                        }} className="absolute top-3 right-3 text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                        
                        <div className="grid md:grid-cols-3 gap-3 mb-3 pr-8">
                           <InputGroup label="Title" value={svc.title} onChange={(v) => {
                             const newS = [...servicesData.services]; newS[i].title = v; setServicesData({...servicesData, services: newS});
                           }} />
                           <InputGroup label="Subtitle" value={svc.subtitle} onChange={(v) => {
                             const newS = [...servicesData.services]; newS[i].subtitle = v; setServicesData({...servicesData, services: newS});
                           }} />
                           <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Icon</label>
                              <select value={svc.iconName} onChange={(e) => {
                                 const newS = [...servicesData.services]; newS[i].iconName = e.target.value; setServicesData({...servicesData, services: newS});
                              }} className="w-full p-2 border rounded text-sm bg-white">
                                <option value="Clock">Clock</option>
                                <option value="Heart">Heart</option>
                                <option value="Utensils">Utensils</option>
                                <option value="PartyPopper">PartyPopper</option>
                                <option value="Users">Users</option>
                              </select>
                           </div>
                        </div>
                        <InputGroup label="Description" value={svc.description} onChange={(v) => {
                             const newS = [...servicesData.services]; newS[i].description = v; setServicesData({...servicesData, services: newS});
                        }} />
                        
                        <div className="bg-gray-50 p-3 rounded mt-2">
                           <div className="flex justify-between mb-2">
                             <label className="text-xs font-bold text-gray-500 uppercase">Features</label>
                             <button onClick={() => {
                                const featName = prompt("Enter feature:");
                                if(featName) {
                                   const newS = [...servicesData.services]; newS[i].features.push(featName);
                                   setServicesData({...servicesData, services: newS});
                                }
                             }} className="text-xs text-blue-600 font-bold">+ Add Feature</button>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {svc.features.map((f, fIdx) => (
                                <span key={fIdx} className="bg-white border px-2 py-1 rounded text-xs flex items-center gap-1">
                                  {f} <button onClick={() => {
                                     const newS = [...servicesData.services];
                                     newS[i].features = svc.features.filter((_, fi) => fi !== fIdx);
                                     setServicesData({...servicesData, services: newS});
                                  }} className="text-red-500 hover:text-red-700">×</button>
                                </span>
                              ))}
                           </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                           <input type="checkbox" checked={svc.featured} onChange={(e) => {
                              const newS = [...servicesData.services]; newS[i].featured = e.target.checked; setServicesData({...servicesData, services: newS});
                           }} className="w-4 h-4 text-red-600"/>
                           <span className="text-sm font-medium">Highlight this card? (Red Background)</span>
                        </div>
                    </div>
                  ))}
               </section>
             </div>
          )}

          {/* ======================= ABOUT TAB ======================= */}
          {activeTab === 'about' && (
            <div className="space-y-8 animate-fade-in">
              <section className="border rounded-xl p-6 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Page Header</h2>
                <div className="grid md:grid-cols-4 gap-3 mb-4">
                   <InputGroup label="Line 1" value={aboutData.header.line1} onChange={(v) => setAboutData({...aboutData, header: {...aboutData.header, line1: v}})} />
                   <InputGroup label="Red 1" value={aboutData.header.line1Highlight} onChange={(v) => setAboutData({...aboutData, header: {...aboutData.header, line1Highlight: v}})} />
                   <InputGroup label="Mid 1" value={aboutData.header.line1End} onChange={(v) => setAboutData({...aboutData, header: {...aboutData.header, line1End: v}})} />
                   <InputGroup label="Red 2" value={aboutData.header.line1Highlight2} onChange={(v) => setAboutData({...aboutData, header: {...aboutData.header, line1Highlight2: v}})} />
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                   <InputGroup label="Line 2" value={aboutData.header.line2} onChange={(v) => setAboutData({...aboutData, header: {...aboutData.header, line2: v}})} />
                   <InputGroup label="Red 3" value={aboutData.header.line2Highlight} onChange={(v) => setAboutData({...aboutData, header: {...aboutData.header, line2Highlight: v}})} />
                   <InputGroup label="End 2" value={aboutData.header.line2End} onChange={(v) => setAboutData({...aboutData, header: {...aboutData.header, line2End: v}})} />
                   <InputGroup label="Red 4" value={aboutData.header.line2Highlight2} onChange={(v) => setAboutData({...aboutData, header: {...aboutData.header, line2Highlight2: v}})} />
                </div>
              </section>

              <section className="border rounded-xl p-6 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Core Values</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {aboutData.values.map((val, idx) => (
                    <div key={idx} className="bg-white p-3 rounded shadow-sm border">
                       <div className="mb-2">
                         <label className="block text-xs font-bold text-gray-500 mb-1">ICON</label>
                         <select value={val.iconName} onChange={(e) => {
                            const newV = [...aboutData.values]; newV[idx].iconName = e.target.value; setAboutData({...aboutData, values: newV});
                         }} className="w-full border p-1 rounded text-sm bg-gray-50">
                           <option value="Heart">Heart</option>
                           <option value="Star">Star</option>
                           <option value="Quote">Quote</option>
                         </select>
                       </div>
                       <InputGroup label="Title" value={val.title} onChange={(v) => {
                          const newV = [...aboutData.values]; newV[idx].title = v; setAboutData({...aboutData, values: newV});
                       }} />
                       <InputGroup label="Description" value={val.desc} onChange={(v) => {
                          const newV = [...aboutData.values]; newV[idx].desc = v; setAboutData({...aboutData, values: newV});
                       }} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="border rounded-xl p-6 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Our Story</h2>
                <InputGroup label="Title" value={aboutData.story.title} onChange={(v) => setAboutData({...aboutData, story: {...aboutData.story, title: v}})} />
                <InputGroup label="Paragraph 1" type="textarea" value={aboutData.story.p1} onChange={(v) => setAboutData({...aboutData, story: {...aboutData.story, p1: v}})} />
                <InputGroup label="Paragraph 2" type="textarea" value={aboutData.story.p2} onChange={(v) => setAboutData({...aboutData, story: {...aboutData.story, p2: v}})} />
                <InputGroup label="Footer Quote" value={aboutData.story.footer} onChange={(v) => setAboutData({...aboutData, story: {...aboutData.story, footer: v}})} />
              </section>

              <section className="border rounded-xl p-6 bg-gray-50">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                   <h2 className="text-xl font-bold text-gray-800">Testimonials</h2>
                   <button onClick={() => setAboutData(p => ({...p, testimonials: [...p.testimonials, {text: "New review", author: "Name", role: "Role"}]}))} className="text-blue-600 font-bold text-sm flex items-center gap-1"><Plus size={16}/> Add</button>
                </div>
                <div className="grid gap-4">
                  {aboutData.testimonials.map((t, idx) => (
                    <div key={idx} className="bg-white p-4 rounded border relative group">
                      <button onClick={() => {
                          const newT = aboutData.testimonials.filter((_, i) => i !== idx);
                          setAboutData({...aboutData, testimonials: newT});
                      }} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      
                      <InputGroup label="Review Text" type="textarea" value={t.text} onChange={(v) => {
                          const newT = [...aboutData.testimonials]; newT[idx].text = v; setAboutData({...aboutData, testimonials: newT});
                      }} />
                      <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Author" value={t.author} onChange={(v) => {
                            const newT = [...aboutData.testimonials]; newT[idx].author = v; setAboutData({...aboutData, testimonials: newT});
                        }} />
                        <InputGroup label="Role" value={t.role} onChange={(v) => {
                            const newT = [...aboutData.testimonials]; newT[idx].role = v; setAboutData({...aboutData, testimonials: newT});
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ======================= CONTACT TAB ======================= */}
          {activeTab === 'contact' && (
             <div className="space-y-8 animate-fade-in">
                <section className="border rounded-xl p-6 bg-gray-50">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Page Header</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputGroup label="Red Highlight" value={contactData.header.highlight} onChange={(v) => setContactData({...contactData, header: {...contactData.header, highlight: v}})} />
                      <InputGroup label="Suffix" value={contactData.header.suffix} onChange={(v) => setContactData({...contactData, header: {...contactData.header, suffix: v}})} />
                  </div>
                  <InputGroup label="Subtitle" value={contactData.header.subtitle} onChange={(v) => setContactData({...contactData, header: {...contactData.header, subtitle: v}})} />
                </section>

                <section className="border rounded-xl p-6 bg-gray-50">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Contact Information</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <InputGroup label="Phone Number" value={contactData.info.phone} onChange={(v) => setContactData({...contactData, info: {...contactData.info, phone: v}})} />
                    <InputGroup label="Email Address" value={contactData.info.email} onChange={(v) => setContactData({...contactData, info: {...contactData.info, email: v}})} />
                    <InputGroup label="Physical Address" value={contactData.info.address} onChange={(v) => setContactData({...contactData, info: {...contactData.info, address: v}})} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Facebook Label" value={contactData.info.facebookLabel} onChange={(v) => setContactData({...contactData, info: {...contactData.info, facebookLabel: v}})} />
                      <InputGroup label="Facebook Link URL" value={contactData.info.facebookLink} onChange={(v) => setContactData({...contactData, info: {...contactData.info, facebookLink: v}})} />
                    </div>
                  </div>
                </section>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CMS;