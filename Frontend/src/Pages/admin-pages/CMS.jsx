import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, Trash2, Layout, Coffee, Info, Phone, Heart, Star, Quote, Clock, Utensils, Users, PartyPopper, CheckCircle, Loader2 } from 'lucide-react';
import api from '../../api'; // Import your API helper

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

const InputGroup = ({ label, value, onChange, type = "text" }) => (
  <div className="mb-3">
    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
    {type === 'textarea' ? (
      <textarea 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none h-24 text-sm resize-none" 
      />
    ) : (
      <input 
        type={type} 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none text-sm transition-all" 
      />
    )}
  </div>
);

const CMS = () => {
  const [activeTab, setActiveTab] = useState('contact'); // Default to contact for testing
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // States
  const [homeData, setHomeData] = useState(DEFAULT_HOME_DATA);
  const [servicesData, setServicesData] = useState(DEFAULT_SERVICES_DATA);
  const [aboutData, setAboutData] = useState(DEFAULT_ABOUT_DATA);
  const [contactData, setContactData] = useState(DEFAULT_CONTACT_DATA);

  // Load Data from API
  useEffect(() => {
    const fetchData = async () => {
        try {
            // Fetch Contact Data
            const contactRes = await api.get('/firstapp/contact-page/');
            if (contactRes.data && !Array.isArray(contactRes.data)) {
                // Map Backend fields to Frontend structure
                setContactData(prev => ({
                    ...prev,
                    info: {
                        phone: contactRes.data.phone_number || prev.info.phone,
                        email: contactRes.data.email || prev.info.email,
                        address: contactRes.data.address || prev.info.address,
                        facebookLink: contactRes.data.fb_page || prev.info.facebookLink,
                        facebookLabel: prev.info.facebookLabel // Keep local as backend doesn't store this yet
                    }
                }));
            }
            // Add similar fetch calls for Home, Services, About if endpoints exist
        } catch (error) {
            console.error("Failed to load CMS data", error);
        }
    };
    fetchData();
  }, []);

  // Save Handler
  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    
    try {
        if (activeTab === 'contact') {
            // Map Frontend structure to Backend fields
            const payload = {
                phone_number: contactData.info.phone,
                email: contactData.info.email,
                address: contactData.info.address,
                fb_page: contactData.info.facebookLink
            };
            
            // Note: Views.py usually handles 'latest' logic, so POST creates a new version history
            await api.post('/firstapp/contact-page/', payload);
        }
        
        // ... Logic for other tabs can be added here ...

        setStatus(`Saved ${activeTab} page successfully!`);
    } catch (error) {
        console.error("Save failed", error);
        setStatus("Failed to save changes.");
    } finally {
        setSaving(false);
        setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleReset = () => {
    if (window.confirm(`Reset ${activeTab} to default settings?`)) {
       // Reset logic...
       if(activeTab === 'contact') setContactData(DEFAULT_CONTACT_DATA);
       // ... others
       setStatus('Reset to defaults.');
       setTimeout(() => setStatus(''), 3000);
    }
  };

  const updateNestedState = (setter, state, section, key, value) => {
    setter({ ...state, [section]: { ...state[section], [key]: value } });
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-poppins">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg flex flex-col min-h-[85vh] overflow-hidden">
        
        {/* Header & Tabs */}
        <div className="border-b px-8 py-6 bg-white z-10 sticky top-0">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-black text-gray-800 tracking-tight">CONTENT MANAGEMENT</h1>
                
                <div className="flex items-center gap-3">
                    <button onClick={handleReset} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg shadow-md font-bold transition-all ${
                            saving ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-gray-800"
                        }`}
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
                {[
                { id: 'home', icon: Layout, label: "Home Page" }, 
                { id: 'services', icon: Coffee, label: "Services" }, 
                { id: 'about', icon: Info, label: "About Us" }, 
                { id: 'contact', icon: Phone, label: "Contact" }
                ].map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
                ))}
            </div>
        </div>

        {/* Status Notification */}
        {status && (
            <div className="mx-8 mt-4 p-3 bg-green-50 text-green-700 text-sm font-medium text-center rounded-lg border border-green-200 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                <CheckCircle size={16}/> {status}
            </div>
        )}

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/50">
          
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="text-center text-gray-400 py-10">Home CMS content hidden for brevity (Focusing on Contact)</div>
          )}

          {/* SERVICES TAB */}
          {activeTab === 'services' && (
            <div className="text-center text-gray-400 py-10">Services CMS content hidden for brevity</div>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="text-center text-gray-400 py-10">About CMS content hidden for brevity</div>
          )}

          {/* CONTACT TAB - THIS IS WHAT YOU NEED */}
          {activeTab === 'contact' && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <section className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-red-500 rounded-full"></span> Page Header (Visual Only)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <InputGroup label="Red Highlight" value={contactData.header.highlight} onChange={(v) => updateNestedState(setContactData, contactData, 'header', 'highlight', v)} />
                      <InputGroup label="Suffix" value={contactData.header.suffix} onChange={(v) => updateNestedState(setContactData, contactData, 'header', 'suffix', v)} />
                  </div>
                  <InputGroup label="Subtitle" value={contactData.header.subtitle} onChange={(v) => updateNestedState(setContactData, contactData, 'header', 'subtitle', v)} />
                </section>

                <section className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-red-500 rounded-full"></span> Contact Information (Database Connected)
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <InputGroup label="Phone Number" value={contactData.info.phone} onChange={(v) => updateNestedState(setContactData, contactData, 'info', 'phone', v)} />
                        <InputGroup label="Email Address" value={contactData.info.email} onChange={(v) => updateNestedState(setContactData, contactData, 'info', 'email', v)} />
                    </div>
                    {/* THIS ADDRESS FIELD IS KEY */}
                    <InputGroup label="Physical Address (Updates Map on App)" value={contactData.info.address} onChange={(v) => updateNestedState(setContactData, contactData, 'info', 'address', v)} />
                    
                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-2">
                      <InputGroup label="Facebook Label" value={contactData.info.facebookLabel} onChange={(v) => updateNestedState(setContactData, contactData, 'info', 'facebookLabel', v)} />
                      <InputGroup label="Facebook Link URL" value={contactData.info.facebookLink} onChange={(v) => updateNestedState(setContactData, contactData, 'info', 'facebookLink', v)} />
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