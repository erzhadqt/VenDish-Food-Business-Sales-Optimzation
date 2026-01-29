import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { 
  InputGroup, 
  Section, 
  SectionWithAdd, 
  Card, 
  IconSelect,
  EmptyState,
  StatusMessage,
  updateNestedState
} from './CMSComponents.jsx';

export const DEFAULT_ABOUT_DATA = {
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
    p1: "Inspired by the warmth of Filipino karinderyas and the love of home-cooked meals, we bring you the authentic flavors of pinoy bayan cuisine.",
    p2: "Our journey started with a simple mission: to serve delicious, affordable, and hearty meals that bring people together.",
    footer: "Masarap, malasakit, tulad ng pamilya!"
  },
  testimonials: []
};

const AboutCMS = () => {
  const [status, setStatus] = useState('');
  const [aboutPageId, setAboutPageId] = useState(null);
  const [aboutData, setAboutData] = useState(DEFAULT_ABOUT_DATA);

  useEffect(() => {
    loadData();
  }, []);

  const showStatus = (message, duration = 3000) => {
    setStatus(message);
    setTimeout(() => setStatus(''), duration);
  };

  const loadData = () => {
    const timestamp = new Date().getTime();
    
    axios.get(`http://localhost:8000/firstapp/about-page/?_t=${timestamp}`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const data = res.data[0];
          setAboutPageId(data.id);
          setAboutData({
            header: {
              line1: data.header_line1 || DEFAULT_ABOUT_DATA.header.line1,
              line1Highlight: data.header_line1_highlight || DEFAULT_ABOUT_DATA.header.line1Highlight,
              line1End: data.header_line1_end || DEFAULT_ABOUT_DATA.header.line1End,
              line1Highlight2: data.header_line1_highlight2 || DEFAULT_ABOUT_DATA.header.line1Highlight2,
              line2: data.header_line2 || DEFAULT_ABOUT_DATA.header.line2,
              line2Highlight: data.header_line2_highlight || DEFAULT_ABOUT_DATA.header.line2Highlight,
              line2End: data.header_line2_end || DEFAULT_ABOUT_DATA.header.line2End,
              line2Highlight2: data.header_line2_highlight2 || DEFAULT_ABOUT_DATA.header.line2Highlight2
            },
            values: data.values || DEFAULT_ABOUT_DATA.values,
            story: {
              title: data.story_title || DEFAULT_ABOUT_DATA.story.title,
              p1: data.story_p1 || DEFAULT_ABOUT_DATA.story.p1,
              p2: data.story_p2 || DEFAULT_ABOUT_DATA.story.p2,
              footer: data.story_footer || DEFAULT_ABOUT_DATA.story.footer
            },
            testimonials: []
          });
        }
      })
      .catch((err) => console.error('Error loading about page:', err));

    axios.get(`http://localhost:8000/firstapp/testimonials/?_t=${timestamp}`)
      .then((res) => {
        setAboutData(prev => ({
          ...prev,
          testimonials: res.data || []
        }));
      })
      .catch((err) => console.error('Error loading testimonials:', err));
  };

  const handleSave = async () => {
    showStatus('💾 Saving about page to database...');
    
    try {
      const pageData = {
        header_line1: aboutData.header.line1,
        header_line1_highlight: aboutData.header.line1Highlight,
        header_line1_end: aboutData.header.line1End,
        header_line1_highlight2: aboutData.header.line1Highlight2,
        header_line2: aboutData.header.line2,
        header_line2_highlight: aboutData.header.line2Highlight,
        header_line2_end: aboutData.header.line2End,
        header_line2_highlight2: aboutData.header.line2Highlight2,
        values: aboutData.values,
        story_title: aboutData.story.title,
        story_p1: aboutData.story.p1,
        story_p2: aboutData.story.p2,
        story_footer: aboutData.story.footer
      };

      if (aboutPageId) {
        await axios.put(
          `http://localhost:8000/firstapp/about-page/${aboutPageId}/`,
          pageData
        );
      } else {
        const res = await axios.post(
          'http://localhost:8000/firstapp/about-page/',
          pageData
        );
        setAboutPageId(res.data.id);
      }

      await saveTestimonials();

      showStatus('✅ About page saved successfully!');
      setTimeout(() => loadData(), 500);
    } catch (err) {
      console.error('❌ Save error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      showStatus(`❌ Failed to save: ${errorMsg}`, 5000);
    }
  };

  const saveTestimonials = async () => {
    const promises = aboutData.testimonials.map(async (testimonial, index) => {
      const testimonialData = {
        text: testimonial.text,
        author: testimonial.author,
        role: testimonial.role,
        order: testimonial.order !== undefined ? testimonial.order : index,
        is_active: true
      };

      if (testimonial.id) {
        return axios.put(
          `http://localhost:8000/firstapp/testimonials/${testimonial.id}/`,
          testimonialData
        );
      } else {
        return axios.post(
          'http://localhost:8000/firstapp/testimonials/',
          testimonialData
        );
      }
    });

    return Promise.all(promises);
  };

  const handleDelete = async (id, index) => {
    const testimonial = aboutData.testimonials[index];
    if (!window.confirm(`Delete "${testimonial.author}'s testimonial"?`)) return;

    if (id) {
      try {
        await axios.delete(`http://localhost:8000/firstapp/testimonials/${id}/`);
        showStatus('✅ Deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        showStatus('❌ Failed to delete');
        return;
      }
    }

    setAboutData({
      ...aboutData,
      testimonials: aboutData.testimonials.filter((_, idx) => idx !== index)
    });
  };

  const handleReset = () => {
    if (!window.confirm('Reset about page to default?')) return;
    setAboutData(DEFAULT_ABOUT_DATA);
    showStatus('Reset to defaults.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg flex flex-col min-h-[80vh]">
        
        <div className="border-b px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">About CMS</h1>
          
          <div className="flex gap-2">
            <button 
              onClick={handleReset} 
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset to defaults"
            >
              <RefreshCw size={20} />
            </button>
            <button 
              onClick={handleSave} 
              className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 shadow-md transition-colors"
            >
              <Save size={18} /> Save
            </button>
          </div>
        </div>

        <StatusMessage status={status} />

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="space-y-8 animate-fade-in">
            <Section title="Header Section">
              <h3 className="text-sm font-bold text-gray-600 mb-2">Line 1</h3>
              <div className="grid md:grid-cols-4 gap-3 mb-4">
                <InputGroup label="Start" value={aboutData.header.line1} onChange={(v) => updateNestedState(setAboutData, 'header.line1', v)} />
                <InputGroup label="Highlight 1" value={aboutData.header.line1Highlight} onChange={(v) => updateNestedState(setAboutData, 'header.line1Highlight', v)} />
                <InputGroup label="End" value={aboutData.header.line1End} onChange={(v) => updateNestedState(setAboutData, 'header.line1End', v)} />
                <InputGroup label="Highlight 2" value={aboutData.header.line1Highlight2} onChange={(v) => updateNestedState(setAboutData, 'header.line1Highlight2', v)} />
              </div>

              <h3 className="text-sm font-bold text-gray-600 mb-2">Line 2</h3>
              <div className="grid md:grid-cols-4 gap-3">
                <InputGroup label="Start" value={aboutData.header.line2} onChange={(v) => updateNestedState(setAboutData, 'header.line2', v)} />
                <InputGroup label="Highlight 1" value={aboutData.header.line2Highlight} onChange={(v) => updateNestedState(setAboutData, 'header.line2Highlight', v)} />
                <InputGroup label="End" value={aboutData.header.line2End} onChange={(v) => updateNestedState(setAboutData, 'header.line2End', v)} />
                <InputGroup label="Highlight 2" value={aboutData.header.line2Highlight2} onChange={(v) => updateNestedState(setAboutData, 'header.line2Highlight2', v)} />
              </div>
            </Section>

            <Section title="Core Values">
              <div className="space-y-4">
                {aboutData.values.map((val, i) => (
                  <Card key={i}>
                    <div className="grid md:grid-cols-3 gap-3">
                      <InputGroup label="Title" value={val.title} onChange={(v) => {
                        const newV = [...aboutData.values]; 
                        newV[i].title = v; 
                        setAboutData({...aboutData, values: newV});
                      }} />
                      <InputGroup label="Description" value={val.desc} onChange={(v) => {
                        const newV = [...aboutData.values]; 
                        newV[i].desc = v; 
                        setAboutData({...aboutData, values: newV});
                      }} />
                      <IconSelect 
                        value={val.iconName} 
                        onChange={(v) => {
                          const newV = [...aboutData.values]; 
                          newV[i].iconName = v; 
                          setAboutData({...aboutData, values: newV});
                        }} 
                        icons={['Heart', 'Star', 'Quote']}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </Section>

            <Section title="Our Story">
              <InputGroup label="Title" value={aboutData.story.title} onChange={(v) => updateNestedState(setAboutData, 'story.title', v)} />
              <InputGroup label="Paragraph 1" type="textarea" value={aboutData.story.p1} onChange={(v) => updateNestedState(setAboutData, 'story.p1', v)} />
              <InputGroup label="Paragraph 2" type="textarea" value={aboutData.story.p2} onChange={(v) => updateNestedState(setAboutData, 'story.p2', v)} />
              <InputGroup label="Footer Text" value={aboutData.story.footer} onChange={(v) => updateNestedState(setAboutData, 'story.footer', v)} />
            </Section>

            <SectionWithAdd 
              title={`Testimonials (${aboutData.testimonials.length})`}
              onAdd={() => setAboutData({
                ...aboutData, 
                testimonials: [...aboutData.testimonials, {id: null, text: 'New testimonial', author: 'NAME', role: 'ROLE', order: aboutData.testimonials.length}]
              })}
              addLabel="Add Testimonial"
            >
              <div className="space-y-4">
                {aboutData.testimonials.map((test, i) => (
                  <Card 
                    key={i} 
                    onDelete={() => handleDelete(test.id, i)}
                  >
                    <InputGroup label="Testimonial Text" type="textarea" value={test.text} onChange={(v) => {
                      const newT = [...aboutData.testimonials]; 
                      newT[i].text = v; 
                      setAboutData({...aboutData, testimonials: newT});
                    }} />
                    <div className="grid md:grid-cols-2 gap-3">
                      <InputGroup label="Author Name" value={test.author} onChange={(v) => {
                        const newT = [...aboutData.testimonials]; 
                        newT[i].author = v; 
                        setAboutData({...aboutData, testimonials: newT});
                      }} />
                      <InputGroup label="Role" value={test.role} onChange={(v) => {
                        const newT = [...aboutData.testimonials]; 
                        newT[i].role = v; 
                        setAboutData({...aboutData, testimonials: newT});
                      }} />
                    </div>
                  </Card>
                ))}
                {aboutData.testimonials.length === 0 && (
                  <EmptyState message="No testimonials added yet. Click 'Add Testimonial' to get started!" />
                )}
              </div>
            </SectionWithAdd>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AboutCMS;