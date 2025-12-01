import { useState } from 'react';
import { Trash2, Plus, Calculator, GripVertical } from 'lucide-react';

function CostingTable() {
  const [rows, setRows] = useState([
    { id: 1, ingredient: '', quantity: '', unit: '', costPerUnit: '' }
  ]);
  const [vatRate, setVatRate] = useState(12);
  const [profitMargin, setProfitMargin] = useState(20);
  const [quantity, setQuantity] = useState(1);
  const [dishName, setDishName] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);

  const updateRow = (id, field, value) => {
    setRows(rows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addRow = () => {
    const newId = Math.max(...rows.map(r => r.id), 0) + 1;
    setRows([...rows, { id: newId, ingredient: '', quantity: '', unit: '', costPerUnit: '' }]);
  };

  const deleteRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const calculateTotals = () => {
    let totalIngredientsForAllDishes = 0;
    const breakdown = [];

    rows.forEach(row => {
      const qty = parseFloat(row.quantity) || 0;
      const costPerUnit = parseFloat(row.costPerUnit) || 0;
      const totalCost = qty * costPerUnit;

      if (totalCost > 0 && row.ingredient.trim()) {
        breakdown.push({
          ingredient: row.ingredient,
          quantity: qty,
          unit: row.unit,
          costPerUnit,
          totalCost
        });
        totalIngredientsForAllDishes += totalCost;
      }
    });

    const costPerDish = totalIngredientsForAllDishes / quantity;
    const profitPerDish = costPerDish * (profitMargin / 100);
    const priceBeforeVAT = costPerDish + profitPerDish;
    const vatPerDish = priceBeforeVAT * (vatRate / 100);
    const suggestedPricePerDish = priceBeforeVAT + vatPerDish;

    const totalRevenue = suggestedPricePerDish * quantity;
    const totalProfit = totalRevenue - totalIngredientsForAllDishes;

    return {
      totalIngredientsForAllDishes,
      costPerDish,
      profitPerDish,
      priceBeforeVAT,
      vatPerDish,
      suggestedPricePerDish,
      totalRevenue,
      totalProfit,
      breakdown
    };
  };

  const {
    totalIngredientsForAllDishes,
    costPerDish,
    profitPerDish,
    priceBeforeVAT,
    vatPerDish,
    suggestedPricePerDish,
    totalRevenue,
    totalProfit,
    breakdown
  } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-8 h-8 text-[#FF4D50]" />
            <h1 className="text-3xl font-bold text-gray-800">Recipe Costing Calculator</h1>
          </div>
          <p className="text-gray-600">Calculate accurate pricing for your dishes</p>
        </div>

        {/* Configuration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          {/* Dish Name */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              Dish Name
            </label>
            <input
              type="text"
              value={dishName}
              onChange={e => setDishName(e.target.value)}
              placeholder="e.g., Pasta Carbonara"
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D50] focus:bg-white transition-all"
            />
          </div>
          
          {/* Servings */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              Servings
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D50] focus:bg-white transition-all"
            />
          </div>

          {/* VAT Rate */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              VAT Rate (%)
            </label>
            <input
              type="number"
              value={vatRate}
              onChange={e => setVatRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D50] focus:bg-white transition-all"
            />
          </div>

          {/* Profit Margin */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              Profit Margin (%)
            </label>
            <input
              type="number"
              value={profitMargin}
              onChange={e => setProfitMargin(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF4D50] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Cost Name Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="grid grid-cols-12 gap-px bg-gray-200 border-b border-gray-300">
            <div className="col-span-1 bg-[#F6ADAD] px-4 py-3"></div>
            <div className="col-span-4 bg-[#F6ADAD] px-4 py-3">
              <span className="text-xs font-semibold text-gray-600 uppercase">COST NAME</span>
            </div>
            <div className="col-span-2 bg-[#F6ADAD] px-4 py-3">
              <span className="text-xs font-semibold text-gray-600 uppercase">Quantity</span>
            </div>
            <div className="col-span-1 bg-[#F6ADAD] px-4 py-3">
              <span className="text-xs font-semibold text-gray-600 uppercase">Unit</span>
            </div>
            <div className="col-span-2 bg-[#F6ADAD] px-4 py-3">
              <span className="text-xs font-semibold text-gray-600 uppercase">Cost/Unit</span>
            </div>
            <div className="col-span-2 bg-[#F6ADAD] px-4 py-3">
              <span className="text-xs font-semibold text-gray-600 uppercase">Total</span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {rows.map((row, index) => {
              const qty = parseFloat(row.quantity) || 0;
              const costPerUnit = parseFloat(row.costPerUnit) || 0;
              const totalCost = qty * costPerUnit;
              const isHovered = hoveredRow === row.id;

              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-12 gap-px group hover:bg-[#F6ADAD]/20 transition-colors ${
                    isHovered ? 'bg-[#F6ADAD]/20' : 'bg-white'
                  }`}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <div className="col-span-1 px-2 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                      <span className="text-sm text-gray-400 font-medium">{index + 1}</span>
                    </div>
                    {isHovered && (
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="text-gray-400 hover:text-[#FF4D50] transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="col-span-4 px-4 py-2">
                    <input
                      type="text"
                      value={row.ingredient}
                      onChange={e => updateRow(row.id, 'ingredient', e.target.value)}
                      placeholder="Enter name"
                      className="w-full px-3 py-2 bg-transparent border-0 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D50] rounded transition-all"
                    />
                  </div>

                  <div className="col-span-2 px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.quantity}
                      onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-transparent border-0 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D50] rounded transition-all text-right"
                    />
                  </div>

                  <div className="col-span-1 px-4 py-2">
                    <input
                      type="text"
                      value={row.unit}
                      onChange={e => updateRow(row.id, 'unit', e.target.value)}
                      placeholder="kg"
                      className="w-full px-3 py-2 bg-transparent border-0 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D50] rounded transition-all"
                    />
                  </div>

                  <div className="col-span-2 px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.costPerUnit}
                      onChange={e => updateRow(row.id, 'costPerUnit', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-transparent border-0 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D50] rounded transition-all text-right"
                    />
                  </div>

                  <div className="col-span-2 px-4 py-2 flex items-center">
                    <div className={`px-3 py-2 rounded font-semibold ${
                      totalCost > 0 
                        ? 'bg-[#F6ADAD]/30 text-[#FF4D50]' 
                        : 'text-gray-400'
                    }`}>
                      {totalCost > 0 ? `₱${totalCost.toFixed(2)}` : '-'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-200 bg-gray-50">
            <button
              onClick={addRow}
              className="w-full px-4 py-3 text-left text-sm text-gray-600 hover:text-[#FF4D50] hover:bg-[#F6ADAD]/20 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Ingredient
            </button>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-4">Total Ingredients Cost</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">For {quantity} dish{quantity !== 1 ? 'es' : ''}</span>
                <span className="font-semibold">₱{totalIngredientsForAllDishes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Per dish</span>
                <span className="font-semibold">₱{costPerDish.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-4">Price Per Dish</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Ingredient Cost</span>
                <span className="font-medium">₱{costPerDish.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Profit ({profitMargin}%)</span>
                <span className="font-medium text-[#FF4D50]">+₱{profitPerDish.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">VAT ({vatRate}%)</span>
                <span className="font-medium text-[#FF4D50]">+₱{vatPerDish.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Selling Price</span>
                  <span className="text-xl font-bold text-[#FF4D50]">₱{suggestedPricePerDish.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-[#FF4D50] to-[#F6ADAD] rounded-lg shadow-sm p-6 text-white">
            <div className="text-xs font-semibold uppercase mb-4 opacity-90">
              Total for {quantity} Dish{quantity !== 1 ? 'es' : ''}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm opacity-90">
                <span>Revenue</span>
                <span className="font-semibold">₱{totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm opacity-90">
                <span>Total Cost</span>
                <span className="font-semibold">₱{totalIngredientsForAllDishes.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-[#FF4D50]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Net Profit</span>
                  <span className="text-2xl font-bold">₱{totalProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ingredient Breakdown */}
        {breakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Ingredient Breakdown</h3>
            <div className="space-y-2">
              {breakdown.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg hover:bg-[#F6ADAD]/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{item.ingredient}</span>
                    <span className="text-xs text-gray-500">
                      {item.quantity} {item.unit} × ₱{item.costPerUnit.toFixed(2)}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900">₱{item.totalCost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CostingTable;