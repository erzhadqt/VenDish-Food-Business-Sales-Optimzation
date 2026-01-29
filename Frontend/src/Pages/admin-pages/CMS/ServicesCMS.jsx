import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, Trash2 } from 'lucide-react';
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

export const DEFAULT_SERVICES_DATA = {
  header: {
    titlePrefix: "OUR",
    titleHighlight: "SERVICES",
    description: "At Kuya Vince Karinderya, we extend our warm Filipino hospitality through a wide variety of services designed to bring authentic Pinoy Bayan Cuisine to every occasion."
  },
  services: [],
  highlightBox: {
    title: "AUTHENTIC FILIPINO DINING EXPERIENCE",
    description: "Experience the warmth of Filipino hospitality and the rich flavors of traditional Pinoy Bayan Cuisine.",
    stats: [{ label: 'Dishes', value: '50+' }, { label: 'Authentic', value: '100%' }, { label: 'Service', value: '24/7' }]
  }
};

const ServicesCMS = () => {
  const [status, setStatus] = useState('');
  const [servicesPageId, setServicesPageId] = useState(null);
  const [servicesData, setServicesData] = useState(DEFAULT_SERVICES_DATA);

  useEffect(() => {
    loadData();
  }, []);

  const showStatus = (message, duration = 3000) => {
    setStatus(message);
    setTimeout(() => setStatus(''), duration);
  };

  const loadData = () => {
    const timestamp = new Date().getTime();
    
    axios.get(`http://localhost:8000/firstapp/services-page/?_t=${timestamp}`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const data = res.data[0];
          setServicesPageId(data.id);
          setServicesData(prev => ({
            ...prev,
            header: {
              titlePrefix: data.title_prefix || DEFAULT_SERVICES_DATA.header.titlePrefix,
              titleHighlight: data.title_highlight || DEFAULT_SERVICES_DATA.header.titleHighlight,
              description: data.description || DEFAULT_SERVICES_DATA.header.description
            },
            highlightBox: {
              title: data.highlight_title || DEFAULT_SERVICES_DATA.highlightBox.title,
              description: data.highlight_description || DEFAULT_SERVICES_DATA.highlightBox.description,
              stats: data.highlight_stats || DEFAULT_SERVICES_DATA.highlightBox.stats
            }
          }));
        }
      })
      .catch((err) => console.error('Error loading services page:', err));

    axios.get(`http://localhost:8000/firstapp/services/?_t=${timestamp}`)
      .then((res) => {
        setServicesData(prev => ({
          ...prev,
          services: res.data || []
        }));
      })
      .catch((err) => console.error('Error loading services:', err));
  };

  const handleSave = async () => {
    showStatus('💾 Saving services to database...');
    
    try {
      const pageData = {
        title_prefix: servicesData.header.titlePrefix,
        title_highlight: servicesData.header.titleHighlight,
        description: servicesData.header.description,
        highlight_title: servicesData.highlightBox.title,
        highlight_description: servicesData.highlightBox.description,
        highlight_stats: servicesData.highlightBox.stats
      };

      if (servicesPageId) {
        await axios.put(
          `http://localhost:8000/firstapp/services-page/${servicesPageId}/`,
          pageData
        );
      } else {
        const res = await axios.post(
          'http://localhost:8000/firstapp/services-page/',
          pageData
        );
        setServicesPageId(res.data.id);
      }

      await saveServices();

      showStatus('✅ Services page saved successfully!');
      setTimeout(() => loadData(), 500);
    } catch (err) {
      console.error('❌ Save error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      showStatus(`❌ Failed to save: ${errorMsg}`, 5000);
    }
  };

  const saveServices = async () => {
    const promises = servicesData.services.map(async (service, index) => {
      const serviceData = {
        title: service.title,
        subtitle: service.subtitle,
        icon_name: service.icon_name || service.iconName,
        description: service.description,
        features: service.features,
        featured: service.featured,
        order: service.order !== undefined ? service.order : index,
        is_active: true
      };

      if (service.id) {
        return axios.put(
          `http://localhost:8000/firstapp/services/${service.id}/`,
          serviceData
        );
      } else {
        return axios.post(
          'http://localhost:8000/firstapp/services/',
          serviceData
        );
      }
    });

    return Promise.all(promises);
  };

  const handleDelete = async (id, index) => {
    const service = servicesData.services[index];
    if (!window.confirm(`Delete "${service.title} ${service.subtitle}"?`)) return;

    if (id) {
      try {
        await axios.delete(`http://localhost:8000/firstapp/services/${id}/`);
        showStatus('✅ Deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        showStatus('❌ Failed to delete');
        return;
      }
    }

    setServicesData({
      ...servicesData,
      services: servicesData.services.filter((_, idx) => idx !== index)
    });
  };

  const handleReset = () => {
    if (!window.confirm('Reset services to default?')) return;
    setServicesData(DEFAULT_SERVICES_DATA);
    showStatus('Reset to defaults.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg flex flex-col min-h-[80vh]">
        
        <div className="border-b px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Services CMS</h1>
          
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
              <div className="grid md:grid-cols-2 gap-3">
                <InputGroup label="Title Prefix" value={servicesData.header.titlePrefix} onChange={(v) => updateNestedState(setServicesData, 'header.titlePrefix', v)} />
                <InputGroup label="Title Highlight (Red)" value={servicesData.header.titleHighlight} onChange={(v) => updateNestedState(setServicesData, 'header.titleHighlight', v)} />
              </div>
              <InputGroup label="Description" type="textarea" value={servicesData.header.description} onChange={(v) => updateNestedState(setServicesData, 'header.description', v)} />
            </Section>

            <SectionWithAdd 
              title={`Services (${servicesData.services.length})`}
              onAdd={() => setServicesData({
                ...servicesData, 
                services: [...servicesData.services, {
                  id: null,
                  title: 'NEW', 
                  subtitle: 'SERVICE', 
                  icon_name: 'Star', 
                  description: 'Description here', 
                  features: ['Feature 1'], 
                  featured: false,
                  order: servicesData.services.length,
                  is_active: true
                }]
              })}
              addLabel="Add Service"
            >
              <div className="space-y-4">
                {servicesData.services.map((svc, i) => (
                  <Card 
                    key={i} 
                    onDelete={() => handleDelete(svc.id, i)}
                  >
                    <div className="grid md:grid-cols-3 gap-3">
                      <InputGroup label="Title" value={svc.title} onChange={(v) => {
                        const newS = [...servicesData.services]; 
                        newS[i].title = v; 
                        setServicesData({...servicesData, services: newS});
                      }} />
                      <InputGroup label="Subtitle" value={svc.subtitle} onChange={(v) => {
                        const newS = [...servicesData.services]; 
                        newS[i].subtitle = v; 
                        setServicesData({...servicesData, services: newS});
                      }} />
                      <IconSelect 
                        value={svc.icon_name || svc.iconName} 
                        onChange={(v) => {
                          const newS = [...servicesData.services]; 
                          newS[i].icon_name = v; 
                          setServicesData({...servicesData, services: newS});
                        }} 
                      />
                    </div>
                    
                    <InputGroup label="Description" type="textarea" value={svc.description} onChange={(v) => {
                      const newS = [...servicesData.services]; 
                      newS[i].description = v; 
                      setServicesData({...servicesData, services: newS});
                    }} />
                    
                    <div className="mt-3">
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Features</label>
                      {svc.features.map((feat, fi) => (
                        <div key={fi} className="flex gap-2 mb-2">
                          <input 
                            value={feat} 
                            onChange={(e) => {
                              const newS = [...servicesData.services]; 
                              newS[i].features[fi] = e.target.value; 
                              setServicesData({...servicesData, services: newS});
                            }} 
                            className="flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-red-500 outline-none" 
                          />
                          <button 
                            onClick={() => {
                              const newS = [...servicesData.services]; 
                              newS[i].features.splice(fi, 1); 
                              setServicesData({...servicesData, services: newS});
                            }} 
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={18}/>
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const newS = [...servicesData.services]; 
                          newS[i].features.push('New Feature'); 
                          setServicesData({...servicesData, services: newS});
                        }} 
                        className="text-blue-600 text-sm flex items-center gap-1 hover:text-blue-700"
                      >
                        <Plus size={14}/> Add Feature
                      </button>
                    </div>
                    
                    <label className="flex items-center gap-2 mt-3">
                      <input 
                        type="checkbox" 
                        checked={svc.featured} 
                        onChange={(e) => {
                          const newS = [...servicesData.services]; 
                          newS[i].featured = e.target.checked; 
                          setServicesData({...servicesData, services: newS});
                        }} 
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Featured Service (Red Background)</span>
                    </label>
                  </Card>
                ))}
                {servicesData.services.length === 0 && (
                  <EmptyState message="No services added yet. Click 'Add Service' to get started!" />
                )}
              </div>
            </SectionWithAdd>

            <Section title="Highlight Box">
              <InputGroup label="Title" value={servicesData.highlightBox.title} onChange={(v) => updateNestedState(setServicesData, 'highlightBox.title', v)} />
              <InputGroup label="Description" type="textarea" value={servicesData.highlightBox.description} onChange={(v) => updateNestedState(setServicesData, 'highlightBox.description', v)} />
              
              <h3 className="text-sm font-bold text-gray-600 mt-4 mb-2">Stats</h3>
              {servicesData.highlightBox.stats.map((stat, i) => (
                <div key={i} className="grid grid-cols-2 gap-3 mb-2">
                  <InputGroup label="Label" value={stat.label} onChange={(v) => {
                    const newS = [...servicesData.highlightBox.stats]; 
                    newS[i].label = v; 
                    setServicesData({...servicesData, highlightBox: {...servicesData.highlightBox, stats: newS}});
                  }} />
                  <InputGroup label="Value" value={stat.value} onChange={(v) => {
                    const newS = [...servicesData.highlightBox.stats]; 
                    newS[i].value = v; 
                    setServicesData({...servicesData, highlightBox: {...servicesData.highlightBox, stats: newS}});
                  }} />
                </div>
              ))}
            </Section>
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

export default ServicesCMS;