import React from 'react';
import { Save, RefreshCw, Plus, Trash2 } from 'lucide-react';

// --- REUSABLE COMPONENTS ---

export const InputGroup = ({ label, value, onChange, type = "text", required = false }) => (
  <div className="mb-3">
    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
      {label}
      {required && <span className="text-red-600 ml-1">*</span>}
    </label>
    {type === 'textarea' ? (
      <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none h-24 text-sm" 
      />
    ) : (
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none text-sm" 
      />
    )}
  </div>
);

export const Section = ({ title, children }) => (
  <section className="border rounded-xl p-6 bg-gray-50">
    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{title}</h2>
    {children}
  </section>
);

export const SectionWithAdd = ({ title, onAdd, addLabel, children }) => (
  <section className="border rounded-xl p-6 bg-gray-50">
    <div className="flex justify-between items-center mb-4 border-b pb-2">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <button 
        onClick={onAdd} 
        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"
      >
        <Plus size={16}/> {addLabel}
      </button>
    </div>
    {children}
  </section>
);

export const Card = ({ children, onDelete }) => (
  <div className="bg-white p-4 rounded-lg border shadow-sm relative">
    {onDelete && (
      <button 
        onClick={onDelete} 
        className="absolute top-3 right-3 text-red-400 hover:text-red-600"
      >
        <Trash2 size={18}/>
      </button>
    )}
    <div className={onDelete ? "pr-10" : ""}>
      {children}
    </div>
  </div>
);

export const IconSelect = ({ value, onChange, icons = ['Clock', 'Heart', 'Star', 'Utensils', 'Users', 'PartyPopper', 'Quote'] }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Icon</label>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 outline-none"
    >
      {icons.map(icon => (
        <option key={icon} value={icon}>{icon}</option>
      ))}
    </select>
  </div>
);

export const ColorSelect = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Color</label>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 outline-none"
    >
      {['purple', 'red', 'pink', 'blue', 'green', 'yellow', 'indigo'].map(color => (
        <option key={color} value={color}>{color.charAt(0).toUpperCase() + color.slice(1)}</option>
      ))}
    </select>
  </div>
);

export const ImageUpload = ({ label, value, onChange, required = false, helpText }) => {
  const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') {
      return img.startsWith('http') ? img : `http://localhost:8000${img.startsWith('/media') ? '' : '/media/'}${img}`;
    }
    return URL.createObjectURL(img);
  };

  return (
    <div className={`mb-6 p-4 bg-white rounded-lg border-2 ${required && !value ? 'border-red-200' : 'border-gray-200'}`}>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">* Required</span>}
      </label>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) onChange(file);
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
          />
          {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
        </div>
        {value && (
          <div className="w-32 h-20 rounded border-2 border-green-500 overflow-hidden bg-gray-100 relative">
            <img src={getImageUrl(value)} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl">
              {typeof value === 'string' ? 'Current' : 'New'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const EmptyState = ({ message }) => (
  <div className="text-center py-8 text-gray-500">
    <p>{message}</p>
  </div>
);

export const StatusMessage = ({ status }) => {
  if (!status) return null;
  
  const getStatusClass = () => {
    if (status.includes('✅')) return 'bg-green-100 text-green-700 border-green-200';
    if (status.includes('❌')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className={`mx-8 mt-4 p-3 text-center rounded-lg border animate-fade-in ${getStatusClass()}`}>
      {status}
    </div>
  );
};

// --- HELPER FUNCTIONS ---
export const updateNestedState = (setter, path, value) => {
  setter(prevState => {
    const newState = JSON.parse(JSON.stringify(prevState));
    const keys = path.split('.');
    let current = newState;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    return newState;
  });
};

export const updateArrayItem = (setter, index, field, value) => {
  setter(prevArray => {
    const newArray = [...prevArray];
    if (field) {
      newArray[index] = { ...newArray[index], [field]: value };
    } else {
      newArray[index] = value;
    }
    return newArray;
  });
};