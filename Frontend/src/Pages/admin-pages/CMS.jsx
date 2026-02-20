import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Layout, Coffee, Info, Phone, CheckCircle, Loader2 } from 'lucide-react';
import api from '../../api';

// --- HELPER COMPONENT ---
const InputGroup = ({ label, value, onChange, type = "text" }) => (
  <div className="mb-4">
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

// --- DEFAULT STATES (Populated from Landing Pages) ---

const DEFAULT_HOME = {
  hero: { 
    line1Start: "SAVOR THE TASTE OF", 
    line1Highlight: "LOVE", 
    line1End: "AND TRADITION", 
    line2Start: "IN EVERY", 
    line2Highlight: "BITE" 
  },
  desc: { 
    brandName: "Kuya Vince Karinderya", 
    cuisineType: "Pinoy bayan cuisine", 
    lolaText: "lola", 
    start: "At", 
    middle: ", we take pride in serving the best", 
    end: "— flavorful, hearty, and made just like how", 
    final: "used to cook." 
  }
};

const DEFAULT_SERVICES = {
  header: { 
    titlePrefix: "OUR", 
    titleHighlight: "SERVICES", 
    description: "At Kuya Vince Karinderya, we extend our warm Filipino hospitality through a wide variety of services designed to bring authentic Pinoy Bayan Cuisine to every occasion." 
  },
  s1: { 
    title: "DAILY", 
    subtitle: "SPECIALS", 
    desc: "Freshly cooked meals prepared daily with rotating specials." 
  },
  s2: { 
    title: "AFFORDABLE", 
    subtitle: "MEAL PLANS", 
    desc: "Budget-friendly meal packages for students and families." 
  }
};

const DEFAULT_ABOUT = {
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
  story: { 
    title: "Our Story", 
    p1: "Inspired by the warmth of Filipino karinderyas and the love of home-cooked meals, we bring you the authentic flavors of pinoy bayan cuisine. Every dish is prepared with care, using traditional recipes passed down through generations, so you can enjoy the comforting taste of lola's cooking in every bite.", 
    p2: "Our journey started with a simple mission: to serve delicious, affordable, and hearty meals that bring people together. Whether you're craving classic adobo, sizzling sisig, or a hearty bowl of sinigang, we're here to make every meal feel like a celebration of Filipino culture and community.", 
    footer: "Masarap, malasakit, tulad ng pamilya!" 
  }
};

const DEFAULT_CONTACT = {
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
  const [activeTab, setActiveTab] = useState('contact');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Data States
  const [homeData, setHomeData] = useState(DEFAULT_HOME);
  const [servicesData, setServicesData] = useState(DEFAULT_SERVICES);
  const [aboutData, setAboutData] = useState(DEFAULT_ABOUT);
  const [contactData, setContactData] = useState(DEFAULT_CONTACT);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Contact
        const contactRes = await api.get('/firstapp/contact-page/');
        if (contactRes.data) {
           const d = contactRes.data;
           setContactData({
             header: { highlight: d.header_highlight, suffix: d.header_suffix, subtitle: d.subtitle },
             info: { phone: d.phone_number, email: d.email, address: d.address, facebookLink: d.fb_page, facebookLabel: d.fb_label }
           });
        }

        // 2. Home
        const homeRes = await api.get('/firstapp/home/'); 
        const hData = Array.isArray(homeRes.data) ? homeRes.data[homeRes.data.length -1] : homeRes.data;
        if (hData) {
            setHomeData({
                hero: { 
                    line1Start: hData.line1_start, line1Highlight: hData.line1_highlight, line1End: hData.line1_end,
                    line2Start: hData.line2_start, line2Highlight: hData.line2_highlight 
                },
                desc: {
                    brandName: hData.brand_name, cuisineType: hData.cuisine_type, lolaText: hData.lola_text,
                    start: hData.description_start, middle: hData.description_middle, end: hData.description_end, final: hData.description_final
                }
            });
        }

        // 3. Services
        const servRes = await api.get('/firstapp/services-page/');
        if (servRes.data && servRes.data.id) {
            const s = servRes.data;
            setServicesData({
                header: { titlePrefix: s.title_prefix, titleHighlight: s.title_highlight, description: s.description },
                s1: { title: s.s1_title, subtitle: s.s1_subtitle, desc: s.s1_desc },
                s2: { title: s.s2_title, subtitle: s.s2_subtitle, desc: s.s2_desc }
            });
        }

        // 4. About
        const aboutRes = await api.get('/firstapp/about/');
        const aData = Array.isArray(aboutRes.data) ? aboutRes.data[aboutRes.data.length -1] : aboutRes.data;
        if (aData) {
            setAboutData({
                header: {
                    line1: aData.line1, line1Highlight: aData.line1_highlight, line1End: aData.line1_end, line1Highlight2: aData.line1_highlight2,
                    line2: aData.line2, line2Highlight: aData.line2_highlight, line2End: aData.line2_end, line2Highlight2: aData.line2_highlight2
                },
                story: { title: aData.story_title, p1: aData.story_p1, p2: aData.story_p2, footer: aData.footer_text }
            });
        }

      } catch (error) {
        console.error("CMS Load Error - using defaults:", error);
        // Defaults are already set in useState, so if fetch fails, we see the default content.
      }
    };
    fetchData();
  }, []);

  // --- SAVE HANDLER ---
  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    try {
        let endpoint = '';
        let payload = {};

        if (activeTab === 'contact') {
            endpoint = '/firstapp/contact-page/';
            payload = {
                header_highlight: contactData.header.highlight, header_suffix: contactData.header.suffix, subtitle: contactData.header.subtitle,
                phone_number: contactData.info.phone, email: contactData.info.email, address: contactData.info.address, fb_page: contactData.info.facebookLink, fb_label: contactData.info.facebookLabel
            };
        } else if (activeTab === 'home') {
            endpoint = '/firstapp/home/';
            payload = {
                line1_start: homeData.hero.line1Start, line1_highlight: homeData.hero.line1Highlight, line1_end: homeData.hero.line1End,
                line2_start: homeData.hero.line2Start, line2_highlight: homeData.hero.line2Highlight,
                brand_name: homeData.desc.brandName, cuisine_type: homeData.desc.cuisineType, lola_text: homeData.desc.lolaText,
                description_start: homeData.desc.start, description_middle: homeData.desc.middle, description_end: homeData.desc.end, description_final: homeData.desc.final
            };
        } else if (activeTab === 'services') {
            endpoint = '/firstapp/services-page/';
            payload = {
                title_prefix: servicesData.header.titlePrefix, title_highlight: servicesData.header.titleHighlight, description: servicesData.header.description,
                s1_title: servicesData.s1.title, s1_subtitle: servicesData.s1.subtitle, s1_desc: servicesData.s1.desc,
                s2_title: servicesData.s2.title, s2_subtitle: servicesData.s2.subtitle, s2_desc: servicesData.s2.desc
            };
        } else if (activeTab === 'about') {
            endpoint = '/firstapp/about/';
            payload = {
                line1: aboutData.header.line1, line1_highlight: aboutData.header.line1Highlight, line1_end: aboutData.header.line1End, line1_highlight2: aboutData.header.line1Highlight2,
                line2: aboutData.header.line2, line2_highlight: aboutData.header.line2Highlight, line2_end: aboutData.header.line2End, line2_highlight2: aboutData.header.line2Highlight2,
                story_title: aboutData.story.title, story_p1: aboutData.story.p1, story_p2: aboutData.story.p2, footer_text: aboutData.story.footer
            };
        }

        await api.post(endpoint, payload);
        setStatus(`Saved ${activeTab.toUpperCase()} successfully!`);

    } catch (error) {
        console.error("Save failed", error);
        setStatus("Failed to save changes.");
    } finally {
        setSaving(false);
        setTimeout(() => setStatus(''), 3000);
    }
  };

  const updateState = (setter, state, section, key, val) => {
    setter({ ...state, [section]: { ...state[section], [key]: val } });
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-poppins">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg flex flex-col min-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="border-b px-8 py-6 bg-white sticky top-0 z-10">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-black text-gray-800 tracking-tight">CONTENT MANAGEMENT</h1>
                <button onClick={handleSave} disabled={saving} className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-md">
                    {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[ {id:'home', icon: Layout, label:'Home'}, {id:'services', icon: Coffee, label:'Services'}, {id:'about', icon: Info, label:'About'}, {id:'contact', icon: Phone, label:'Contact'} ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <t.icon size={16}/> {t.label}
                    </button>
                ))}
            </div>
        </div>

        {status && <div className="m-4 p-3 bg-green-50 text-green-700 text-center rounded-lg border border-green-200 flex justify-center items-center gap-2 animate-in fade-in slide-in-from-top-2"><CheckCircle size={16}/> {status}</div>}

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/50">
            
            {/* HOME TAB */}
            {activeTab === 'home' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <section className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1 h-6 bg-red-500 rounded-full"></span>Hero Section Text</h2>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <InputGroup label="Line 1 Start" value={homeData.hero.line1Start} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line1Start', v)} />
                            <InputGroup label="Line 1 Highlight (Red)" value={homeData.hero.line1Highlight} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line1Highlight', v)} />
                            <InputGroup label="Line 1 End" value={homeData.hero.line1End} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line1End', v)} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <InputGroup label="Line 2 Start" value={homeData.hero.line2Start} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line2Start', v)} />
                            <InputGroup label="Line 2 Highlight (Red)" value={homeData.hero.line2Highlight} onChange={(v) => updateState(setHomeData, homeData, 'hero', 'line2Highlight', v)} />
                        </div>
                    </section>
                    <section className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1 h-6 bg-red-500 rounded-full"></span>Description Text</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <InputGroup label="Brand Name" value={homeData.desc.brandName} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'brandName', v)} />
                            <InputGroup label="Cuisine Type" value={homeData.desc.cuisineType} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'cuisineType', v)} />
                            <InputGroup label="Lola Text" value={homeData.desc.lolaText} onChange={(v) => updateState(setHomeData, homeData, 'desc', 'lolaText', v)} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
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
                    <section className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1 h-6 bg-red-500 rounded-full"></span>Page Header</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <InputGroup label="Title Prefix" value={servicesData.header.titlePrefix} onChange={(v) => updateState(setServicesData, servicesData, 'header', 'titlePrefix', v)} />
                            <InputGroup label="Title Highlight" value={servicesData.header.titleHighlight} onChange={(v) => updateState(setServicesData, servicesData, 'header', 'titleHighlight', v)} />
                        </div>
                        <InputGroup label="Description" type="textarea" value={servicesData.header.description} onChange={(v) => updateState(setServicesData, servicesData, 'header', 'description', v)} />
                    </section>
                    <div className="grid md:grid-cols-2 gap-6">
                        <section className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                            <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1 h-6 bg-red-500 rounded-full"></span>Service 1 (Daily Specials)</h2>
                            <InputGroup label="Title" value={servicesData.s1.title} onChange={(v) => updateState(setServicesData, servicesData, 's1', 'title', v)} />
                            <InputGroup label="Subtitle" value={servicesData.s1.subtitle} onChange={(v) => updateState(setServicesData, servicesData, 's1', 'subtitle', v)} />
                            <InputGroup label="Description" type="textarea" value={servicesData.s1.desc} onChange={(v) => updateState(setServicesData, servicesData, 's1', 'desc', v)} />
                        </section>
                        <section className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                            <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1 h-6 bg-red-500 rounded-full"></span>Service 2 (Meal Plans)</h2>
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
                    <section className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                         <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1 h-6 bg-red-500 rounded-full"></span>Header Text (Split Lines)</h2>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InputGroup label="Line 1" value={aboutData.header.line1} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line1', v)} />
                            <InputGroup label="L1 Highlight" value={aboutData.header.line1Highlight} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line1Highlight', v)} />
                            <InputGroup label="L1 End" value={aboutData.header.line1End} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line1End', v)} />
                            <InputGroup label="L1 Highlight 2" value={aboutData.header.line1Highlight2} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line1Highlight2', v)} />
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <InputGroup label="Line 2" value={aboutData.header.line2} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line2', v)} />
                            <InputGroup label="L2 Highlight" value={aboutData.header.line2Highlight} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line2Highlight', v)} />
                            <InputGroup label="L2 End" value={aboutData.header.line2End} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line2End', v)} />
                            <InputGroup label="L2 Highlight 2" value={aboutData.header.line2Highlight2} onChange={(v) => updateState(setAboutData, aboutData, 'header', 'line2Highlight2', v)} />
                         </div>
                    </section>
                    <section className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1 h-6 bg-red-500 rounded-full"></span>Our Story</h2>
                        <InputGroup label="Section Title" value={aboutData.story.title} onChange={(v) => updateState(setAboutData, aboutData, 'story', 'title', v)} />
                        <div className="grid md:grid-cols-2 gap-4">
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
                    <section className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1 h-6 bg-red-500 rounded-full"></span>Contact Header</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <InputGroup label="Highlight Word (Red)" value={contactData.header.highlight} onChange={(v) => updateState(setContactData, contactData, 'header', 'highlight', v)} />
                            <InputGroup label="Suffix Word" value={contactData.header.suffix} onChange={(v) => updateState(setContactData, contactData, 'header', 'suffix', v)} />
                        </div>
                        <InputGroup label="Subtitle" value={contactData.header.subtitle} onChange={(v) => updateState(setContactData, contactData, 'header', 'subtitle', v)} />
                    </section>
                    <section className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm">
                        <h2 className="font-bold text-lg mb-6 text-gray-800 flex items-center gap-2"><span className="w-1 h-6 bg-red-500 rounded-full"></span>Details</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                             <InputGroup label="Phone" value={contactData.info.phone} onChange={(v) => updateState(setContactData, contactData, 'info', 'phone', v)} />
                             <InputGroup label="Email" value={contactData.info.email} onChange={(v) => updateState(setContactData, contactData, 'info', 'email', v)} />
                        </div>
                        <InputGroup label="Address" value={contactData.info.address} onChange={(v) => updateState(setContactData, contactData, 'info', 'address', v)} />
                        <div className="grid md:grid-cols-2 gap-4 mt-2">
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