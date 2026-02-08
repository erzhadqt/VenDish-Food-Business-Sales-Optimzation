import { useState, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, Eye, Trash2, Search } from 'lucide-react';
import api from '../../api';

const CustomerFeedback = () => {
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' or 'food'

  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [foodFeedbacks, setFoodFeedbacks] = useState([]);
  const [filteredFoodFeedbacks, setFilteredFoodFeedbacks] = useState([]);
  const [searchFoodTerm, setSearchFoodTerm] = useState('');
  const [foodRatingFilter, setFoodRatingFilter] = useState('all');
  const [selectedFoodFeedback, setSelectedFoodFeedback] = useState(null);
  const [showFoodModal, setShowFoodModal] = useState(false);

  
  useEffect(() => {
    const loadFeedbacks = async () => {
      try {
        setLoading(true);

        // 1. Fetch reviews from Django
        const response = await api.get('/firstapp/reviews/');
        const allReviews = response.data;

        // 2. Separate them into Shop (Customer) and Food reviews
        const shopReviews = allReviews.filter(r => r.review_type === 'shop').map(r => ({
           id: r.id,
           customer_name: r.username || 'Anonymous',
           rating: r.rating,
           comment: r.comment,
           order_id: r.id, // Using ID as order_id for now
           created_at: r.created_at,
           image: r.image // API will return full URL
        }));

        const productReviews = allReviews.filter(r => r.review_type === 'food').map(r => ({
           id: r.id,
           food_name: r.product_name || 'Unknown Item', // From serializer
           rating: r.rating,
           comment: r.comment,
           created_at: r.created_at,
           image: r.image
        }));

        // 3. Update State
        setFeedbacks(shopReviews);
        setFilteredFeedbacks(shopReviews); // Initialize filter

        setFoodFeedbacks(productReviews);
        setFilteredFoodFeedbacks(productReviews);

        // Remove localStorage logic since we are now live
        localStorage.removeItem('customer_feedbacks'); 

      } catch (err) {
        console.error('Error loading feedbacks:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFeedbacks();
  }, []);

  // Filter customer feedback
  useEffect(() => {
    let filtered = feedbacks;
    if (ratingFilter !== 'all') filtered = filtered.filter(f => f.rating === parseInt(ratingFilter));
    if (searchTerm !== '') filtered = filtered.filter(f =>
      f.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.order_id.toString().includes(searchTerm)
    );
    setFilteredFeedbacks(filtered);
  }, [searchTerm, ratingFilter, feedbacks]);

  // Filter food feedback
  useEffect(() => {
    let filtered = foodFeedbacks;
    if (foodRatingFilter !== 'all') filtered = filtered.filter(f => f.rating === parseInt(foodRatingFilter));
    if (searchFoodTerm !== '') filtered = filtered.filter(f =>
      f.food_name.toLowerCase().includes(searchFoodTerm.toLowerCase()) ||
      f.comment.toLowerCase().includes(searchFoodTerm.toLowerCase())
    );
    setFilteredFoodFeedbacks(filtered);
  }, [searchFoodTerm, foodRatingFilter, foodFeedbacks]);

  // Customer stats
  const totalFeedbacks = feedbacks.length;
  const averageRating = feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : 0;
  const fiveStarCount = feedbacks.filter(f => f.rating === 5).length;
  const fiveStarPercentage = feedbacks.length > 0 ? ((fiveStarCount / feedbacks.length) * 100).toFixed(0) : 0;

  const ratingDistribution = [5,4,3,2,1].map(rating => ({
    rating,
    count: feedbacks.filter(f => f.rating === rating).length,
    percentage: feedbacks.length>0?((feedbacks.filter(f=>f.rating===rating).length/feedbacks.length)*100).toFixed(0):0
  }));

  const renderStars = (rating) => (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <Star key={star} size={16} className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
      ))}
    </div>
  );

  const handleViewFeedback = (feedback) => { setSelectedFeedback(feedback); setShowModal(true); };
  const handleDeleteFeedback = (id) => { if(confirm('Are you sure you want to delete this feedback?')) { const updated = feedbacks.filter(f => f.id !== id); setFeedbacks(updated); localStorage.setItem('customer_feedbacks', JSON.stringify(updated)); } };
  const handleViewFoodFeedback = (feedback) => { setSelectedFoodFeedback(feedback); setShowFoodModal(true); };
  const handleDeleteFoodFeedback = (id) => { const updated = foodFeedbacks.filter(f => f.id !== id); setFoodFeedbacks(updated); setFilteredFoodFeedbacks(updated); };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button className={`px-4 py-2 rounded-lg font-medium ${activeTab==='customer'?'bg-blue-500 text-white':'bg-white border border-gray-300'}`} onClick={()=>setActiveTab('customer')}>Customer Review</button>
          <button className={`px-4 py-2 rounded-lg font-medium ${activeTab==='food'?'bg-blue-500 text-white':'bg-white border border-gray-300'}`} onClick={()=>setActiveTab('food')}>Food Review</button>
        </div>

        {activeTab === 'customer' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Feedbacks</p>
                    <p className="text-3xl font-bold text-gray-900">{totalFeedbacks}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <MessageSquare className="text-blue-600" size={24} />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold text-yellow-500">{averageRating}</p>
                      <Star className="fill-yellow-400 text-yellow-400" size={24} />
                    </div>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <TrendingUp className="text-yellow-600" size={24} />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">5-Star Reviews</p>
                    <p className="text-3xl font-bold text-green-600">{fiveStarPercentage}%</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <Star className="text-green-600 fill-green-600" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by customer name, comment, or order ID..."
                  value={searchTerm}
                  onChange={(e)=>setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setRatingFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${ratingFilter==='all'?'bg-blue-500 text-white':'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>All</button>
                {[5,4,3,2,1].map(r => (
                  <button key={r} onClick={()=>setRatingFilter(r.toString())} className={`px-4 py-2 rounded-lg font-medium flex items-center gap-1 ${ratingFilter===r.toString()?'bg-yellow-500 text-white':'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{r} <Star size={14} className={ratingFilter===r.toString()?'fill-white':''} /></button>
                ))}
              </div>
            </div>

            {/* Feedbacks List */}
            {filteredFeedbacks.length>0 ? (
              <div className="space-y-4">
                {filteredFeedbacks.map(f => (
                  <div key={f.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{f.customer_name}</h3>
                          {renderStars(f.rating)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Order #{f.order_id} • {new Date(f.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>handleViewFeedback(f)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18} /></button>
                        <button onClick={()=>handleDeleteFeedback(f.id)} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{f.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="text-gray-400 mb-4"><MessageSquare size={64} className="mx-auto" /></div>
                <p className="text-gray-600 text-lg mb-2 font-medium">No feedback found</p>
                <p className="text-sm text-gray-500">{searchTerm || ratingFilter!=='all'?'Try adjusting your filters':'Customer feedback will appear here'}</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'food' && (
          <>
            {/* Food Search and Filter */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by food name or comment..."
                  value={searchFoodTerm}
                  onChange={(e)=>setSearchFoodTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setFoodRatingFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${foodRatingFilter==='all'?'bg-blue-500 text-white':'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>All</button>
                {[5,4,3,2,1].map(r => (
                  <button key={r} onClick={()=>setFoodRatingFilter(r.toString())} className={`px-4 py-2 rounded-lg font-medium flex items-center gap-1 ${foodRatingFilter===r.toString()?'bg-yellow-500 text-white':'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{r} <Star size={14} className={foodRatingFilter===r.toString()?'fill-white':''} /></button>
                ))}
              </div>
            </div>

            {/* Food Feedbacks List */}
            {filteredFoodFeedbacks.length>0 ? (
              <div className="space-y-4">
                {filteredFoodFeedbacks.map(f => (
                  <div key={f.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{f.food_name}</h3>
                          {renderStars(f.rating)}
                        </div>
                        <p className="text-sm text-gray-500">{new Date(f.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>handleViewFoodFeedback(f)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18} /></button>
                        <button onClick={()=>handleDeleteFoodFeedback(f.id)} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{f.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="text-gray-400 mb-4"><MessageSquare size={64} className="mx-auto" /></div>
                <p className="text-gray-600 text-lg mb-2 font-medium">No food feedback found</p>
                <p className="text-sm text-gray-500">{searchFoodTerm || foodRatingFilter!=='all'?'Try adjusting your filters':'Food feedback will appear here'}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerFeedback;
