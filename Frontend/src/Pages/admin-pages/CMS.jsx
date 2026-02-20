import React, { useState, useEffect } from 'react';
import { Save, Layout, Coffee, Info, Phone, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import api from '../../api';

// --- HELPER COMPONENT ---
const InputGroup = ({ label, value, onChange, type = "text" }) => (
  <div className="mb-4">
    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">{label}</label>
    {type === 'textarea' ? (
      <textarea 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none h-28 text-sm resize-none bg-gray-50 focus:bg-white transition-colors" 
      />
    ) : (
      <input 
        type={type} 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-gray-50 focus:bg-white transition-colors" 
      />
    )}
  </div>
);

// --- DEFAULT STATES ---
const DEFAULT_HOME = {
  hero: { line1Start: "SAVOR THE TASTE OF", line1Highlight: "LOVE", line1End: "AND TRADITION", line2Start: "IN EVERY", line2Highlight: "BITE" },
  desc: { brandName: "Kuya Vince Karinderya", cuisineType: "Pinoy bayan cuisine", lolaText: "lola", start: "At", middle: ", we take pride in serving the best", end: "— flavorful, hearty, and made just like how", final: "used to cook." }
};
const DEFAULT_SERVICES = {
  header: { titlePrefix: "OUR", titleHighlight: "SERVICES", description: "At Kuya Vince Karinderya, we extend our warm Filipino hospitality..." },
  s1: { title: "DAILY", subtitle: "SPECIALS", desc: "Freshly cooked meals prepared daily with rotating specials." },
  s2: { title: "AFFORDABLE", subtitle: "MEAL PLANS", desc: "Budget-friendly meal packages for students and families." }
};
const DEFAULT_ABOUT = {
  header: { line1: "WE'RE MORE", line1Highlight: "THAN", line1End: "JUST A", line1Highlight2: "PLACE TO EAT,", line2: "WE'RE A", line2Highlight: "TASTE", line2End: "OF", line2Highlight2: "HOME." },
  story: { title: "Our Story", p1: "Inspired by the warmth of Filipino karinderyas...", p2: "Our journey started with a simple mission...", footer: "Masarap, malasakit, tulad ng pamilya!" }
};
const DEFAULT_CONTACT = {
  header: { highlight: "CONTACT", suffix: "US", subtitle: "We’d love to hear from you!" },
  info: { phone: "0912 345 6789", email: "kuyavince@example.com", address: "Cagayan de Oro City", facebookLink: "https://facebook.com", facebookLabel: "Kuya Vince Karinderya" }
};

const CMS = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  // Data States
  const [homeData, setHomeData] = useState(DEFAULT_HOME);
  const [servicesData, setServicesData] = useState(DEFAULT_SERVICES);
  const [aboutData, setAboutData] = useState(DEFAULT_ABOUT);
  const [contactData, setContactData] = useState(DEFAULT_CONTACT);

  // Only track ID for contact page since it goes to backend
  const [contactPageId, setContactPageId] = useState(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Contact Page from Backend (Kept for React Native App)
      try {
        const contactRes = await api.get('/firstapp/contact-page/');
        const cData = Array.isArray(contactRes.data) ? contactRes.data[contactRes.data.length - 1] : contactRes.data;
        if (cData && cData.id) {
           setContactPageId(cData.id);
           setContactData({
             header: { highlight: cData.header_highlight, suffix: cData.header_suffix, subtitle: cData.subtitle },
             info: { phone: cData.phone_number, email: cData.email, address: cData.address, facebookLink: cData.fb_page, facebookLabel: cData.fb_label }
           });
        }
      } catch (error) {
        console.error("Failed to load Contact data from backend:", error);
      }

      // 2. Fetch Home, Services, and About from Local Storage
      try {
        const storedHome = localStorage.getItem('cms_home');
        if (storedHome) setHomeData(JSON.parse(storedHome));

        const storedServices = localStorage.getItem('cms_services');
        if (storedServices) setServicesData(JSON.parse(storedServices));

        const storedAbout = localStorage.getItem('cms_about');
        if (storedAbout) setAboutData(JSON.parse(storedAbout));
      } catch (error) {
        console.error("Failed to parse local storage data:", error);
      }
    };
    fetchData();
  }, []);

  // --- SAVE HANDLER ---
  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
        if (activeTab === 'home') {
            // Save locally
            localStorage.setItem('cms_home', JSON.stringify(homeData));
            setStatus({ type: 'success', message: 'Saved HOME locally!' });
        } 
        else if (activeTab === 'services') {
            // Save locally
            localStorage.setItem('cms_services', JSON.stringify(servicesData));
            setStatus({ type: 'success', message: 'Saved SERVICES locally!' });
        } 
        else if (activeTab === 'about') {
            // Save locally
            localStorage.setItem('cms_about', JSON.stringify(aboutData));
            setStatus({ type: 'success', message: 'Saved ABOUT locally!' });
        } 
        else if (activeTab === 'contact') {
            // Save to Backend
            const payload = {
                header_highlight: contactData.header.highlight, header_suffix: contactData.header.suffix, subtitle: contactData.header.subtitle,
                phone_number: contactData.info.phone, email: contactData.info.email, address: contactData.info.address, fb_page: contactData.info.facebookLink, fb_label: contactData.info.facebookLabel
            };

            if (contactPageId) {
                await api.put(`/firstapp/contact-page/${contactPageId}/`, payload);
            } else {
                const res = await api.post('/firstapp/contact-page/', payload);
                if (res.data && res.data.id) setContactPageId(res.data.id);
            }
            setStatus({ type: 'success', message: 'Saved CONTACT to backend!' });
        }
    } catch (error) {
        console.error("Save failed", error);
        const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : "Failed to save changes.";
        setStatus({ type: 'error', message: errorMessage });
    } finally {
        setSaving(false);
        setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    }
  };

  const updateState = (setter, state, section, key, val) => {
    setter({ ...state, [section]: { ...state[section], [key]: val } });
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-poppins">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg flex flex-col min-h-[85vh] overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="border-b px-8 py-6 bg-white sticky top-0 z-10">
            <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">CONTENT MANAGEMENT</h1>
                  <p className="text-sm text-gray-500 mt-1">Update your website's landing page content instantly</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                    {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[ {id:'home', icon: Layout, label:'Home (Local)'}, {id:'services', icon: Coffee, label:'Services (Local)'}, {id:'about', icon: Info, label:'About (Local)'}, {id:'contact', icon: Phone, label:'Contact (Backend)'} ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <t.icon size={16}/> {t.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Status Messages */}
        {status.message && (
          <div className={`m-6 p-4 rounded-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {status.type === 'success' ? <CheckCircle size={20} className="text-green-600"/> : <AlertCircle size={20} className="text-red-600"/>}
            <span className="font-medium text-sm">{status.message}</span>
          </div>
        )}

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/50">
            
            {/* HOME TAB */}
            {activeTab === 'home' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <section className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1.5 h-6 bg-red-500 rounded-full"></span>Hero Section Text</h2>
                        <div className="grid md:grid-cols-3 gap-5 mb-4">
                            <InputGroup label="Line 1 Start" value={homeData.hero.line1Start} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line1Start', v)} />
                            <InputGroup label="Line 1 Highlight (Red)" value={homeData.hero.line1Highlight} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line1Highlight', v)} />
                            <InputGroup label="Line 1 End" value={homeData.hero.line1End} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line1End', v)} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-5">
                            <InputGroup label="Line 2 Start" value={homeData.hero.line2Start} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line2Start', v)} />
                            <InputGroup label="Line 2 Highlight (Red)" value={homeData.hero.line2Highlight} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line2Highlight', v)} />
                        </div>
                    </section>
                    <section className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1.5 h-6 bg-red-500 rounded-full"></span>Description Text</h2>
                        <div className="grid md:grid-cols-3 gap-5">
                            <InputGroup label="Brand Name" value={homeData.desc.brandName} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'brandName', v)} />
                            <InputGroup label="Cuisine Type" value={homeData.desc.cuisineType} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'cuisineType', v)} />
                            <InputGroup label="Lola Text" value={homeData.desc.lolaText} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'lolaText', v)} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-5 mt-4">
                            <InputGroup label="Start Text" value={homeData.desc.start} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'start', v)} />
                            <InputGroup label="Middle Text" value={homeData.desc.middle} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'middle', v)} />
                            <InputGroup label="End Text" value={homeData.desc.end} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'end', v)} />
                            <InputGroup label="Final Text" value={homeData.desc.final} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'final', v)} />
                        </div>
                    </section>
                </div>
            )}

            {/* SERVICES TAB */}
            {activeTab === 'services' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <section className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1.5 h-6 bg-red-500 rounded-full"></span>Page Header</h2>
                        <div className="grid md:grid-cols-2 gap-5">
                            <InputGroup label="Title Prefix" value={servicesData.header.titlePrefix} onChange={(v) => updateState(setServicesData, servicesData, 'header', 'titlePrefix', v)} />
                            <InputGroup label="Title Highlight" value={servicesData.header.titleHighlight} onChange={(v) => updateState(setServicesData, servicesData, 'header', 'titleHighlight', v)} />
                        </div>
                        <InputGroup label="Description" type="textarea" value={servicesData.header.description} onChange={(v) => updateState(setServicesData, servicesData, 'header', 'description', v)} />
                    </section>
                    <div className="grid md:grid-cols-2 gap-6">
                        <section className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                            <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1.5 h-6 bg-red-500 rounded-full"></span>Service 1 (Daily Specials)</h2>
                            <InputGroup label="Title" value={servicesData.s1.title} onChange={(v) => updateState(setServicesData, servicesData, 's1', 'title', v)} />
                            <InputGroup label="Subtitle" value={servicesData.s1.subtitle} onChange={(v) => updateState(setServicesData, servicesData, 's1', 'subtitle', v)} />
                            <InputGroup label="Description" type="textarea" value={servicesData.s1.desc} onChange={(v) => updateState(setServicesData, servicesData, 's1', 'desc', v)} />
                        </section>
                        <section className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                            <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1.5 h-6 bg-red-500 rounded-full"></span>Service 2 (Meal Plans)</h2>
                            <InputGroup label="Title" value={servicesData.s2.title} onChange={(v) => updateState(setServicesData, servicesData, 's2', 'title', v)} />
                            <InputGroup label="Subtitle" value={servicesData.s2.subtitle} onChange={(v) => updateState(setServicesData, servicesData, 's2', 'subtitle', v)} />
                            <InputGroup label="Description" type="textarea" value={servicesData.s2.desc} onChange={(v) => updateState(setServicesData, servicesData, 's2', 'desc', v)} />
                        </section>
                    </div>
                </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <section className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                         <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1.5 h-6 bg-red-500 rounded-full"></span>Header Text (Split Lines)</h2>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            <InputGroup label="Line 1" value={aboutData.header.line1} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line1', v)} />
                            <InputGroup label="L1 Highlight" value={aboutData.header.line1Highlight} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line1Highlight', v)} />
                            <InputGroup label="L1 End" value={aboutData.header.line1End} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line1End', v)} />
                            <InputGroup label="L1 Highlight 2" value={aboutData.header.line1Highlight2} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line1Highlight2', v)} />
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-4">
                            <InputGroup label="Line 2" value={aboutData.header.line2} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line2', v)} />
                            <InputGroup label="L2 Highlight" value={aboutData.header.line2Highlight} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line2Highlight', v)} />
                            <InputGroup label="L2 End" value={aboutData.header.line2End} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line2End', v)} />
                            <InputGroup label="L2 Highlight 2" value={aboutData.header.line2Highlight2} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line2Highlight2', v)} />
                         </div>
                    </section>
                    <section className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1.5 h-6 bg-red-500 rounded-full"></span>Our Story</h2>
                        <InputGroup label="Section Title" value={aboutData.story.title} onChange={(v) => updateState(setAboutData, aboutData, 'story', 'title', v)} />
                        <div className="grid md:grid-cols-2 gap-5">
                            <InputGroup label="Paragraph 1" type="textarea" value={aboutData.story.p1} onChange={(v) => updateState(setAboutData, aboutData, 'story', 'p1', v)} />
                            <InputGroup label="Paragraph 2" type="textarea" value={aboutData.story.p2} onChange={(v) => updateState(setAboutData, aboutData, 'story', 'p2', v)} />
                        </div>
                        <InputGroup label="Footer / Slogan" value={aboutData.story.footer} onChange={(v) => updateState(setAboutData, aboutData, 'story', 'footer', v)} />
                    </section>
                </div>
            )}

            {/* CONTACT TAB */}
            {activeTab === 'contact' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <section className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1.5 h-6 bg-red-500 rounded-full"></span>Contact Header</h2>
                        <div className="grid md:grid-cols-2 gap-5">
                            <InputGroup label="Highlight Word (Red)" value={contactData.header.highlight} onChange={(v) => updateState(setContactData, contactData, 'header', 'highlight', v)} />
                            <InputGroup label="Suffix Word" value={contactData.header.suffix} onChange={(v) => updateState(setContactData, contactData, 'header', 'suffix', v)} />
                        </div>
                        <InputGroup label="Subtitle" value={contactData.header.subtitle} onChange={(v) => updateState(setContactData, contactData, 'header', 'subtitle', v)} />
                    </section>
                    <section className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1.5 h-6 bg-red-500 rounded-full"></span>Details</h2>
                        <div className="grid md:grid-cols-2 gap-5">
                             <InputGroup label="Phone" value={contactData.info.phone} onChange={(v) => updateState(setContactData, contactData, 'info', 'phone', v)} />
                             <InputGroup label="Email" value={contactData.info.email} onChange={(v) => updateState(setContactData, contactData, 'info', 'email', v)} />
                        </div>
                        <InputGroup label="Address" value={contactData.info.address} onChange={(v) => updateState(setContactData, contactData, 'info', 'address', v)} />
                        <div className="grid md:grid-cols-2 gap-5 mt-2">
                             <InputGroup label="FB Label" value={contactData.info.facebookLabel} onChange={(v) => updateState(setContactData, contactData, 'info', 'facebookLabel', v)} />
                             <InputGroup label="FB Link URL" value={contactData.info.facebookLink} onChange={(v) => updateState(setContactData, contactData, 'info', 'facebookLink', v)} />
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