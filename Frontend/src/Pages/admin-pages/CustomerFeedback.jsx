import { useState, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, Eye, Trash2, Search } from 'lucide-react';
import api from '../../api';
import DeleteConfirmDialog from '../../Components/DeleteConfirmDialog';
import { Skeleton } from '../../Components/ui/skeleton';

// Import the single unified modal
import ReviewDetailsModal from '../../Components/ReviewDetailsModal';

const resolveMediaUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  try {
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
};

const CustomerFeedback = () => {
  // 🔴 NEW: Lazy load states from localStorage
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('feedback_activeTab') || 'customer';
  }); 

  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('feedback_searchTerm') || '';
  });
  const [ratingFilter, setRatingFilter] = useState(() => {
    return localStorage.getItem('feedback_ratingFilter') || 'all';
  });
  
  const [searchFoodTerm, setSearchFoodTerm] = useState(() => {
    return localStorage.getItem('feedback_searchFoodTerm') || '';
  });
  const [foodRatingFilter, setFoodRatingFilter] = useState(() => {
    return localStorage.getItem('feedback_foodRatingFilter') || 'all';
  });

  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [foodFeedbacks, setFoodFeedbacks] = useState([]);
  const [filteredFoodFeedbacks, setFilteredFoodFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- UNIFIED MODAL STATE ---
  const [selectedReview, setSelectedReview] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // 🔴 NEW: Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('feedback_activeTab', activeTab);
    localStorage.setItem('feedback_searchTerm', searchTerm);
    localStorage.setItem('feedback_ratingFilter', ratingFilter);
    localStorage.setItem('feedback_searchFoodTerm', searchFoodTerm);
    localStorage.setItem('feedback_foodRatingFilter', foodRatingFilter);
  }, [activeTab, searchTerm, ratingFilter, searchFoodTerm, foodRatingFilter]);

  useEffect(() => {
    const loadFeedbacks = async () => {
      try {
        setLoading(true);

        const response = await api.get('/firstapp/reviews/');
        const allReviews = response.data;

        const shopReviews = allReviews.filter(r => r.review_type === 'shop').map(r => ({
           id: r.id,
           customer_name: r.username || 'Anonymous',
           email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
          address: r.address,
           profile_pic: resolveMediaUrl(r.profile_pic),
           rating: r.rating,
           comment: r.comment,
           created_at: r.created_at,
            image: resolveMediaUrl(r.image)
        }));

        const productReviews = allReviews.filter(r => r.review_type === 'food').map(r => ({
           id: r.id,
           food_name: r.product_name || 'Unknown Item', 
           customer_name: r.username || 'Anonymous',
           email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
          address: r.address,
           profile_pic: resolveMediaUrl(r.profile_pic),
           rating: r.rating,
           comment: r.comment,
           created_at: r.created_at,
            image: resolveMediaUrl(r.image)
        }));

        setFeedbacks(shopReviews);
        setFoodFeedbacks(productReviews);

        // We no longer call setFiltered directly here, the other useEffects will handle it
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
      f.comment.toLowerCase().includes(searchTerm.toLowerCase())
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

  const totalFeedbacks = feedbacks.length;
  const averageRating = feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : 0;
  const fiveStarCount = feedbacks.filter(f => f.rating === 5).length;
  const fiveStarPercentage = feedbacks.length > 0 ? ((fiveStarCount / feedbacks.length) * 100).toFixed(0) : 0;

  const renderStars = (rating) => (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <Star key={star} size={16} className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
      ))}
    </div>
  );

  // Unified function to open the modal
  const handleViewReview = (review) => { 
    setSelectedReview(review); 
    setIsReviewModalOpen(true); 
  };
  
  const handleDeleteFeedback = async (id) => { 
    try {
      await api.delete(`/firstapp/reviews/${id}/`);
      const updated = feedbacks.filter(f => f.id !== id); 
      setFeedbacks(updated); 
    } catch (error) {
      console.error("Failed to delete customer feedback:", error);
    }
  };
  
  const handleDeleteFoodFeedback = async (id) => { 
    try {
      await api.delete(`/firstapp/reviews/${id}/`);
      const updated = foodFeedbacks.filter(f => f.id !== id); 
      setFoodFeedbacks(updated); 
    } catch (error) {
      console.error("Failed to delete food feedback:", error);
    }
  };

  if (loading) return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <Skeleton className="h-4 w-1/2 mb-3" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-16 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2 w-full">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6">
        
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button className={`px-4 py-2 rounded-lg font-medium ${activeTab==='customer'?'bg-blue-500 text-white':'bg-white border border-gray-300'}`} onClick={()=>setActiveTab('customer')}>Customer Review</button>
          <button className={`px-4 py-2 rounded-lg font-medium ${activeTab==='food'?'bg-blue-500 text-white':'bg-white border border-gray-300'}`} onClick={()=>setActiveTab('food')}>Food Review</button>
        </div>

        {activeTab === 'customer' && (
          <>
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

            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by customer name or comment..."
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
                          {new Date(f.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {/* Use Unified view function */}
                        <button onClick={()=>handleViewReview(f)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18} /></button>
                        
                        <DeleteConfirmDialog
                          title={`Delete review by ${f.customer_name}?`}
                          description="Are you sure you want to delete this customer feedback? This action cannot be undone."
                          onConfirm={() => handleDeleteFeedback(f.id)}
                        >
                          <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </DeleteConfirmDialog>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{f.comment}</p>
                    {f.image && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attached Image</p>
                        <img
                          src={f.image}
                          alt={`Review attachment from ${f.customer_name}`}
                          className="w-full max-w-md max-h-64 object-cover rounded-md border border-gray-200 bg-gray-50"
                          loading="lazy"
                        />
                      </div>
                    )}
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
                         {/* Use Unified view function */}
                        <button onClick={()=>handleViewReview(f)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18} /></button>
                        
                        <DeleteConfirmDialog
                          title={`Delete review for ${f.food_name}?`}
                          description="Are you sure you want to delete this food review? This action cannot be undone."
                          onConfirm={() => handleDeleteFoodFeedback(f.id)}
                        >
                          <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </DeleteConfirmDialog>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{f.comment}</p>
                    {f.image && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attached Image</p>
                        <img
                          src={f.image}
                          alt={`Review attachment for ${f.food_name}`}
                          className="w-full max-w-md max-h-64 object-cover rounded-md border border-gray-200 bg-gray-50"
                          loading="lazy"
                        />
                      </div>
                    )}
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

        {/* --- USE SINGLE UNIFIED MODAL --- */}
        <ReviewDetailsModal 
          open={isReviewModalOpen} 
          onOpenChange={setIsReviewModalOpen} 
          feedback={selectedReview} 
        />

      </div>
    </div>
  );
};

export default CustomerFeedback;