import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { 
  InputGroup, 
  Section, 
  SectionWithAdd, 
  Card, 
  ImageUpload, 
  EmptyState,
  StatusMessage,
  updateNestedState,
  updateArrayItem
} from './CMSComponents.jsx';

export const DEFAULT_HOME_DATA = {
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
    descriptionFinal: "used to cook.",
    bannerImage: null
  }
};

const HomepageCMS = () => {
  const [status, setStatus] = useState('');
  const [homePageId, setHomePageId] = useState(null);
  const [homeData, setHomeData] = useState(DEFAULT_HOME_DATA);
  const [popularDishes, setPopularDishes] = useState([]);
  const [carouselImages, setCarouselImages] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const showStatus = (message, duration = 3000) => {
    setStatus(message);
    setTimeout(() => setStatus(''), duration);
  };

  const loadData = () => {
    const timestamp = new Date().getTime();
    
    axios.get(`http://localhost:8000/firstapp/home/?_t=${timestamp}`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const data = res.data[0];
          setHomePageId(data.id);
          setHomeData({
            hero: {
              line1Start: data.hero_line1_start || DEFAULT_HOME_DATA.hero.line1Start,
              line1Highlight: data.hero_line1_highlight || DEFAULT_HOME_DATA.hero.line1Highlight,
              line1End: data.hero_line1_end || DEFAULT_HOME_DATA.hero.line1End,
              line2Start: data.hero_line2_start || DEFAULT_HOME_DATA.hero.line2Start,
              line2Highlight: data.hero_line2_highlight || DEFAULT_HOME_DATA.hero.line2Highlight,
              descriptionStart: data.description_start || DEFAULT_HOME_DATA.hero.descriptionStart,
              brandName: data.brand_name || DEFAULT_HOME_DATA.hero.brandName,
              descriptionMiddle: data.description_middle || DEFAULT_HOME_DATA.hero.descriptionMiddle,
              cuisineType: data.cuisine_type || DEFAULT_HOME_DATA.hero.cuisineType,
              descriptionEnd: data.description_end || DEFAULT_HOME_DATA.hero.descriptionEnd,
              lolaText: data.lola_text || DEFAULT_HOME_DATA.hero.lolaText,
              descriptionFinal: data.description_final || DEFAULT_HOME_DATA.hero.descriptionFinal,
              bannerImage: data.banner_image || null,
            }
          });
        }
      })
      .catch((err) => console.error('Error loading home:', err));

    axios.get(`http://localhost:8000/firstapp/popular-dishes/?_t=${timestamp}`)
      .then((res) => setPopularDishes(res.data || []))
      .catch((err) => console.error('Error loading dishes:', err));

    axios.get(`http://localhost:8000/firstapp/homepage-images/by_type/?type=carousel&_t=${timestamp}`)
      .then((res) => setCarouselImages(res.data || []))
      .catch((err) => console.error('Error loading carousel:', err));
  };

  const handleSave = () => {
    if (!homePageId && (!homeData.hero.bannerImage || !(homeData.hero.bannerImage instanceof File))) {
      showStatus('❌ Please upload a banner image before creating the homepage', 5000);
      return;
    }
    
    showStatus('💾 Saving to database...');
    
    const formData = new FormData();
    
    const fieldMapping = {
      line1Start: 'hero_line1_start',
      line1Highlight: 'hero_line1_highlight',
      line1End: 'hero_line1_end',
      line2Start: 'hero_line2_start',
      line2Highlight: 'hero_line2_highlight',
      descriptionStart: 'description_start',
      brandName: 'brand_name',
      descriptionMiddle: 'description_middle',
      cuisineType: 'cuisine_type',
      descriptionEnd: 'description_end',
      lolaText: 'lola_text',
      descriptionFinal: 'description_final'
    };
    
    Object.entries(homeData.hero).forEach(([key, val]) => {
      if (key !== 'bannerImage') {
        const backendFieldName = fieldMapping[key] || key;
        formData.append(backendFieldName, val || "");
      }
    });
    
    formData.append('dishes', "POPULAR DISHES");
    
    if (homeData.hero.bannerImage && homeData.hero.bannerImage instanceof File) {
      formData.append('banner_image', homeData.hero.bannerImage);
    }

    const url = homePageId 
      ? `http://localhost:8000/firstapp/home/${homePageId}/` 
      : 'http://localhost:8000/firstapp/home/';
    
    const saveRequest = homePageId 
      ? axios.put(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      : axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

    saveRequest
      .then((res) => {
        if (!homePageId) setHomePageId(res.data.id);
        return savePopularDishes();
      })
      .then(() => saveCarouselImages())
      .then(() => {
        showStatus('✅ All content saved successfully!');
        setTimeout(() => loadData(), 500);
      })
      .catch((err) => {
        console.error('❌ Save error:', err);
        const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
        showStatus(`❌ Failed to save: ${errorMsg}`, 5000);
      });
  };

  const savePopularDishes = async () => {
    const validDishes = popularDishes.filter(dish => dish.name && dish.name.trim() !== '');
    
    const promises = validDishes.map(async (dish, index) => {
      const formData = new FormData();
      formData.append('name', dish.name);
      formData.append('is_active', true);
      formData.append('order', dish.order || index);

      if (dish.id) {
        return axios.put(`http://localhost:8000/firstapp/popular-dishes/${dish.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        return axios.post('http://localhost:8000/firstapp/popular-dishes/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
    });
    
    return Promise.all(promises);
  };

  const saveCarouselImages = async () => {
    const validImages = carouselImages.filter(img => img.image);
    
    const promises = validImages.map(async (img) => {
      const formData = new FormData();
      formData.append('title', img.title || `Carousel Image`);
      formData.append('image_type', 'carousel');
      
      if (img.image && img.image instanceof File) {
        formData.append('image', img.image);
      }

      if (img.id) {
        if (img.image instanceof File) {
          return axios.put(`http://localhost:8000/firstapp/homepage-images/${img.id}/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          return axios.patch(`http://localhost:8000/firstapp/homepage-images/${img.id}/`, {
            title: img.title || `Carousel Image`,
            image_type: 'carousel'
          });
        }
      } else {
        if (!img.image || !(img.image instanceof File)) {
          return Promise.reject(new Error('Image required'));
        }
        return axios.post('http://localhost:8000/firstapp/homepage-images/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
    });
    
    return Promise.all(promises);
  };

  const handleDelete = async (type, id, index, name = 'item') => {
    if (!window.confirm(`Delete "${name}"?`)) return;

    if (id) {
      const endpoints = {
        dish: `http://localhost:8000/firstapp/popular-dishes/${id}/`,
        image: `http://localhost:8000/firstapp/homepage-images/${id}/`
      };

      try {
        await axios.delete(endpoints[type]);
        showStatus('✅ Deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        showStatus('❌ Failed to delete');
        return;
      }
    }

    if (type === 'dish') {
      setPopularDishes(popularDishes.filter((_, idx) => idx !== index));
    } else if (type === 'image') {
      setCarouselImages(carouselImages.filter((_, idx) => idx !== index));
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset homepage to default?')) return;
    setHomeData(DEFAULT_HOME_DATA);
    setPopularDishes([]);
    setCarouselImages([]);
    showStatus('Reset to defaults.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg flex flex-col min-h-[80vh]">
        
        <div className="border-b px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Homepage CMS</h1>
          
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
            <Section title="Hero Section">
              <ImageUpload
                label="Banner Image"
                value={homeData.hero.bannerImage}
                onChange={(file) => updateNestedState(setHomeData, 'hero.bannerImage', file)}
                required={!homePageId}
                helpText={!homePageId ? 
                  '📌 Upload a banner image (JPG, PNG, etc.) - Required for first save' : 
                  '💡 Leave empty to keep current image. Upload only to replace it.'
                }
              />
              
              <h3 className="text-sm font-bold text-gray-600 mb-2">Headline Line 1</h3>
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <InputGroup label="Start" value={homeData.hero.line1Start} onChange={(v) => updateNestedState(setHomeData, 'hero.line1Start', v)} />
                <InputGroup label="Highlight (Red)" value={homeData.hero.line1Highlight} onChange={(v) => updateNestedState(setHomeData, 'hero.line1Highlight', v)} />
                <InputGroup label="End" value={homeData.hero.line1End} onChange={(v) => updateNestedState(setHomeData, 'hero.line1End', v)} />
              </div>

              <h3 className="text-sm font-bold text-gray-600 mb-2">Headline Line 2</h3>
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <InputGroup label="Start" value={homeData.hero.line2Start} onChange={(v) => updateNestedState(setHomeData, 'hero.line2Start', v)} />
                <InputGroup label="Highlight (Red)" value={homeData.hero.line2Highlight} onChange={(v) => updateNestedState(setHomeData, 'hero.line2Highlight', v)} />
              </div>

              <h3 className="text-sm font-bold text-gray-600 mb-2">Paragraph Content</h3>
              <div className="grid md:grid-cols-2 gap-3 mb-2">
                <InputGroup label="Brand Name (Red)" value={homeData.hero.brandName} onChange={(v) => updateNestedState(setHomeData, 'hero.brandName', v)} />
                <InputGroup label="Cuisine Type (Red)" value={homeData.hero.cuisineType} onChange={(v) => updateNestedState(setHomeData, 'hero.cuisineType', v)} />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <InputGroup label="Lola Text (Bold)" value={homeData.hero.lolaText} onChange={(v) => updateNestedState(setHomeData, 'hero.lolaText', v)} />
                <InputGroup label="Start Text" value={homeData.hero.descriptionStart} onChange={(v) => updateNestedState(setHomeData, 'hero.descriptionStart', v)} />
              </div>
              <InputGroup label="Middle Text" type="textarea" value={homeData.hero.descriptionMiddle} onChange={(v) => updateNestedState(setHomeData, 'hero.descriptionMiddle', v)} />
              <InputGroup label="End Text" type="textarea" value={homeData.hero.descriptionEnd} onChange={(v) => updateNestedState(setHomeData, 'hero.descriptionEnd', v)} />
              <InputGroup label="Final Text" value={homeData.hero.descriptionFinal} onChange={(v) => updateNestedState(setHomeData, 'hero.descriptionFinal', v)} />
            </Section>

            <SectionWithAdd 
              title={`Popular Dishes (${popularDishes.length})`}
              onAdd={() => setPopularDishes([...popularDishes, {id: null, name: "New Dish", is_active: true, order: popularDishes.length}])}
              addLabel="Add Dish"
            >
              <div className="space-y-3">
                {popularDishes.map((dish, i) => (
                  <Card 
                    key={i} 
                    onDelete={() => handleDelete('dish', dish.id, i, dish.name)}
                  >
                    <InputGroup 
                      label={`Dish #${i + 1} Name`}
                      value={dish.name} 
                      onChange={(v) => updateArrayItem(setPopularDishes, i, 'name', v)} 
                    />
                  </Card>
                ))}
                {popularDishes.length === 0 && (
                  <EmptyState message="No dishes added yet. Click 'Add Dish' to get started!" />
                )}
              </div>
            </SectionWithAdd>

            <SectionWithAdd 
              title={`Carousel Images (${carouselImages.length})`}
              onAdd={() => setCarouselImages([...carouselImages, {id: null, title: '', image: null}])}
              addLabel="Add Image"
            >
              <div className="space-y-3">
                {carouselImages.map((img, i) => (
                  <Card 
                    key={i} 
                    onDelete={() => handleDelete('image', img.id, i, 'carousel image')}
                  >
                    <div className="grid md:grid-cols-2 gap-3">
                      <InputGroup 
                        label="Title / Caption (Optional)" 
                        value={img.title || ''} 
                        onChange={(v) => updateArrayItem(setCarouselImages, i, 'title', v)} 
                      />
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                          Image File
                          {!img.image && <span className="text-red-600 ml-1">* Required</span>}
                        </label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              updateArrayItem(setCarouselImages, i, 'image', e.target.files[0]);
                            }
                          }} 
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" 
                        />
                      </div>
                    </div>
                    
                    {img.image && (
                      <div className="mt-3">
                        <div className="w-full h-40 rounded border-2 overflow-hidden bg-gray-100">
                          <img 
                            src={typeof img.image === 'string' 
                              ? (img.image.startsWith('http') ? img.image : `http://localhost:8000${img.image}`) 
                              : URL.createObjectURL(img.image)
                            } 
                            alt={img.title} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
                {carouselImages.length === 0 && (
                  <EmptyState message="No carousel images added yet. Click 'Add Image' to get started!" />
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

export default HomepageCMS;