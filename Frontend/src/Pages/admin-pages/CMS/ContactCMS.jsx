import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { 
  InputGroup, 
  Section, 
  SectionWithAdd, 
  Card, 
  IconSelect,
  ColorSelect,
  EmptyState,
  StatusMessage,
  updateNestedState,
  updateArrayItem
} from './CMSComponents.jsx';

export const DEFAULT_CONTACT_DATA = {
  header: {
    highlight: "CONTACT",
    suffix: "US",
    subtitle: "We'd love to hear from you!"
  }
};

const ContactCMS = () => {
  const [status, setStatus] = useState('');
  const [contactPageId, setContactPageId] = useState(null);
  const [contactData, setContactData] = useState(DEFAULT_CONTACT_DATA);
  const [contactInfoList, setContactInfoList] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const showStatus = (message, duration = 3000) => {
    setStatus(message);
    setTimeout(() => setStatus(''), duration);
  };

  const loadData = () => {
    const timestamp = new Date().getTime();
    
    axios.get(`http://localhost:8000/firstapp/contact-page/?_t=${timestamp}`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const data = res.data[0];
          setContactPageId(data.id);
          setContactData({
            header: {
              highlight: data.header_highlight || DEFAULT_CONTACT_DATA.header.highlight,
              suffix: data.header_suffix || DEFAULT_CONTACT_DATA.header.suffix,
              subtitle: data.header_subtitle || DEFAULT_CONTACT_DATA.header.subtitle
            }
          });
        }
      })
      .catch((err) => console.error('Error loading contact page:', err));

    axios.get(`http://localhost:8000/firstapp/contact-info/?_t=${timestamp}`)
      .then((res) => {
        setContactInfoList(res.data || []);
      })
      .catch((err) => console.error('Error loading contact info:', err));
  };

  const handleSave = async () => {
    showStatus('💾 Saving contact page to database...');
    
    try {
      const pageData = {
        header_highlight: contactData.header.highlight,
        header_suffix: contactData.header.suffix,
        header_subtitle: contactData.header.subtitle
      };

      if (contactPageId) {
        await axios.put(
          `http://localhost:8000/firstapp/contact-page/${contactPageId}/`,
          pageData
        );
      } else {
        const res = await axios.post(
          'http://localhost:8000/firstapp/contact-page/',
          pageData
        );
        setContactPageId(res.data.id);
      }

      await saveContactInfo();

      showStatus('✅ Contact page saved successfully!');
      setTimeout(() => loadData(), 500);
    } catch (err) {
      console.error('❌ Save error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      showStatus(`❌ Failed to save: ${errorMsg}`, 5000);
    }
  };

  const saveContactInfo = async () => {
    const promises = contactInfoList.map(async (info, index) => {
      const infoData = {
        label: info.label,
        value: info.value,
        link: info.link,
        icon_name: info.icon_name,
        color: info.color,
        order: info.order !== undefined ? info.order : index,
        is_active: true
      };

      if (info.id) {
        return axios.put(
          `http://localhost:8000/firstapp/contact-info/${info.id}/`,
          infoData
        );
      } else {
        return axios.post(
          'http://localhost:8000/firstapp/contact-info/',
          infoData
        );
      }
    });

    return Promise.all(promises);
  };

  const handleDelete = async (id, index) => {
    const info = contactInfoList[index];
    if (!window.confirm(`Delete "${info.label}"?`)) return;

    if (id) {
      try {
        await axios.delete(`http://localhost:8000/firstapp/contact-info/${id}/`);
        showStatus('✅ Deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        showStatus('❌ Failed to delete');
        return;
      }
    }

    setContactInfoList(contactInfoList.filter((_, idx) => idx !== index));
  };

  const handleReset = () => {
    if (!window.confirm('Reset contact page to default?')) return;
    setContactData(DEFAULT_CONTACT_DATA);
    setContactInfoList([]);
    showStatus('Reset to defaults.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg flex flex-col min-h-[80vh]">
        
        <div className="border-b px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Contact CMS</h1>
          
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
                <InputGroup label="Highlight Text (Red)" value={contactData.header.highlight} onChange={(v) => updateNestedState(setContactData, 'header.highlight', v)} />
                <InputGroup label="Suffix Text" value={contactData.header.suffix} onChange={(v) => updateNestedState(setContactData, 'header.suffix', v)} />
              </div>
              <InputGroup label="Subtitle" value={contactData.header.subtitle} onChange={(v) => updateNestedState(setContactData, 'header.subtitle', v)} />
            </Section>

            <SectionWithAdd 
              title={`Contact Information (${contactInfoList.length})`}
              onAdd={() => setContactInfoList([...contactInfoList, {
                id: null,
                label: 'Phone',
                value: '0912 345 6789',
                link: 'tel:09123456789',
                icon_name: 'Phone',
                color: 'purple',
                order: contactInfoList.length,
                is_active: true
              }])}
              addLabel="Add Contact Info"
            >
              <div className="space-y-4">
                {contactInfoList.map((info, i) => (
                  <Card 
                    key={i} 
                    onDelete={() => handleDelete(info.id, i)}
                  >
                    <div className="grid md:grid-cols-3 gap-3 mb-3">
                      <InputGroup 
                        label="Label" 
                        value={info.label} 
                        onChange={(v) => updateArrayItem(setContactInfoList, i, 'label', v)} 
                      />
                      <InputGroup 
                        label="Value" 
                        value={info.value} 
                        onChange={(v) => updateArrayItem(setContactInfoList, i, 'value', v)} 
                      />
                      <InputGroup 
                        label="Link (tel:, mailto:, https://)" 
                        value={info.link} 
                        onChange={(v) => updateArrayItem(setContactInfoList, i, 'link', v)} 
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <IconSelect 
                        value={info.icon_name} 
                        onChange={(v) => updateArrayItem(setContactInfoList, i, 'icon_name', v)} 
                        icons={['Phone', 'Mail', 'MapPin', 'Facebook', 'Instagram', 'Twitter', 'Globe']}
                      />
                      <ColorSelect 
                        value={info.color} 
                        onChange={(v) => updateArrayItem(setContactInfoList, i, 'color', v)} 
                      />
                    </div>
                  </Card>
                ))}
                {contactInfoList.length === 0 && (
                  <EmptyState message="No contact information added yet. Click 'Add Contact Info' to get started!" />
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

export default ContactCMS;