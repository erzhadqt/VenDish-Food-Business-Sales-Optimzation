import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, MessageSquare, TrendingUp, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api';
import { Skeleton } from '../../Components/ui/skeleton';
import { requestWithMethodFallback } from '../../utils/requestWithMethodFallback';
import { applyQueryParam, usePersistedQueryState } from '../../utils/usePersistedQueryState';

// Import the single unified modal
import ReviewDetailsModal from '../../Components/ReviewDetailsModal';
import ReviewReplyDialog from '../../Components/ReviewReplyDialog';

const FEEDBACK_TAB_OPTIONS = new Set(['customer', 'food']);
const FEEDBACK_RATING_OPTIONS = new Set(['all', '1', '2', '3', '4', '5']);
const FEEDBACK_CATEGORY_DEFAULT = 'all';

const parsePositivePage = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

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
  const [searchParams, setSearchParams] = useSearchParams();

  // Lazy load states from localStorage
  const [activeTab, setActiveTab] = usePersistedQueryState({
    searchParams,
    queryKey: 'tab',
    storageKey: 'feedback_activeTab',
    defaultValue: 'customer',
    parse: (rawValue, fallback) => (FEEDBACK_TAB_OPTIONS.has(rawValue) ? rawValue : fallback),
  }); 

  const [searchTerm, setSearchTerm] = usePersistedQueryState({
    searchParams,
    queryKey: 'shopSearch',
    storageKey: 'feedback_searchTerm',
    defaultValue: '',
  });
  const [ratingFilter, setRatingFilter] = usePersistedQueryState({
    searchParams,
    queryKey: 'shopRating',
    storageKey: 'feedback_ratingFilter',
    defaultValue: 'all',
    parse: (rawValue, fallback) => (FEEDBACK_RATING_OPTIONS.has(rawValue) ? rawValue : fallback),
  });
  
  const [searchFoodTerm, setSearchFoodTerm] = usePersistedQueryState({
    searchParams,
    queryKey: 'foodSearch',
    storageKey: 'feedback_searchFoodTerm',
    defaultValue: '',
  });
  const [foodRatingFilter, setFoodRatingFilter] = usePersistedQueryState({
    searchParams,
    queryKey: 'foodRating',
    storageKey: 'feedback_foodRatingFilter',
    defaultValue: 'all',
    parse: (rawValue, fallback) => (FEEDBACK_RATING_OPTIONS.has(rawValue) ? rawValue : fallback),
  });
  const [foodCategoryFilter, setFoodCategoryFilter] = usePersistedQueryState({
    searchParams,
    queryKey: 'foodCategory',
    storageKey: 'feedback_foodCategory',
    defaultValue: FEEDBACK_CATEGORY_DEFAULT,
    parse: (rawValue, fallback) => rawValue || fallback,
  });

  // Pagination states
  const [currentShopPage, setCurrentShopPage] = usePersistedQueryState({
    searchParams,
    queryKey: 'shopPage',
    storageKey: 'feedback_currentShopPage',
    defaultValue: 1,
    parse: (rawValue, fallback) => parsePositivePage(rawValue, fallback),
    serialize: (value) => String(value),
  });
  const [currentFoodPage, setCurrentFoodPage] = usePersistedQueryState({
    searchParams,
    queryKey: 'foodPage',
    storageKey: 'feedback_currentFoodPage',
    defaultValue: 1,
    parse: (rawValue, fallback) => parsePositivePage(rawValue, fallback),
    serialize: (value) => String(value),
  });
  const ITEMS_PER_PAGE = 5;

  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [foodFeedbacks, setFoodFeedbacks] = useState([]);
  const [filteredFoodFeedbacks, setFilteredFoodFeedbacks] = useState([]);
  const [foodCategories, setFoodCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- UNIFIED MODAL STATE ---
  const [selectedReview, setSelectedReview] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);

  const hasInitializedShopFilterReset = useRef(false);
  const hasInitializedFoodFilterReset = useRef(false);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const params = new URLSearchParams();
    applyQueryParam(params, 'tab', activeTab, (value) => value === 'customer');
    applyQueryParam(params, 'shopSearch', searchTerm.trim());
    applyQueryParam(params, 'shopRating', ratingFilter, (value) => value === 'all');
    applyQueryParam(params, 'foodSearch', searchFoodTerm.trim());
    applyQueryParam(params, 'foodRating', foodRatingFilter, (value) => value === 'all');
    applyQueryParam(params, 'foodCategory', foodCategoryFilter, (value) => value === FEEDBACK_CATEGORY_DEFAULT);
    applyQueryParam(params, 'shopPage', currentShopPage, (value) => Number(value) <= 1);
    applyQueryParam(params, 'foodPage', currentFoodPage, (value) => Number(value) <= 1);

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [
    activeTab,
    searchTerm,
    ratingFilter,
    searchFoodTerm,
    foodRatingFilter,
    foodCategoryFilter,
    currentShopPage,
    currentFoodPage,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    const loadFeedbacks = async () => {
      try {
        setLoading(true);

        const response = await api.get('/firstapp/reviews/');
        const allReviews = response.data;

        try {
          const categoryResponse = await api.get('/firstapp/categories/');
          const nextCategories = (Array.isArray(categoryResponse.data) ? categoryResponse.data : [])
            .map((category) => String(category?.name || '').trim())
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right));
          setFoodCategories(nextCategories);
        } catch (categoryError) {
          console.error('Error loading categories:', categoryError);
          setFoodCategories([]);
        }

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
            image: resolveMediaUrl(r.image),
            admin_reply: r.admin_reply || '',
            admin_reply_updated_at: r.admin_reply_updated_at || null,
        }));

        const productReviews = allReviews.filter(r => r.review_type === 'food').map(r => ({
           id: r.id,
           food_name: r.product_name || 'Unknown Item', 
            food_category: r.product_category || 'Uncategorized',
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
            image: resolveMediaUrl(r.image),
            admin_reply: r.admin_reply || '',
            admin_reply_updated_at: r.admin_reply_updated_at || null,
        }));

        setFeedbacks(shopReviews);
        setFoodFeedbacks(productReviews);
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

  useEffect(() => {
    if (!hasInitializedShopFilterReset.current) {
      hasInitializedShopFilterReset.current = true;
      return;
    }
    setCurrentShopPage(1);
  }, [searchTerm, ratingFilter]);

  // Filter food feedback
  useEffect(() => {
    let filtered = foodFeedbacks;
    if (foodRatingFilter !== 'all') filtered = filtered.filter(f => f.rating === parseInt(foodRatingFilter));
    if (foodCategoryFilter !== FEEDBACK_CATEGORY_DEFAULT) {
      filtered = filtered.filter((f) => (f.food_category || 'Uncategorized') === foodCategoryFilter);
    }
    if (searchFoodTerm !== '') filtered = filtered.filter(f =>
      f.food_name.toLowerCase().includes(searchFoodTerm.toLowerCase()) ||
      f.comment.toLowerCase().includes(searchFoodTerm.toLowerCase())
    );
    setFilteredFoodFeedbacks(filtered);
  }, [searchFoodTerm, foodRatingFilter, foodCategoryFilter, foodFeedbacks]);

  useEffect(() => {
    if (!hasInitializedFoodFilterReset.current) {
      hasInitializedFoodFilterReset.current = true;
      return;
    }
    setCurrentFoodPage(1);
  }, [searchFoodTerm, foodRatingFilter, foodCategoryFilter]);

  const selectedCategoryMissing =
    foodCategoryFilter !== FEEDBACK_CATEGORY_DEFAULT &&
    !foodCategories.includes(foodCategoryFilter);

  // Shop Feedback Calculations
  const totalFeedbacks = feedbacks.length;
  const averageRating = feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : 0;
  const fiveStarCount = feedbacks.filter(f => f.rating === 5).length;
  const fiveStarPercentage = feedbacks.length > 0 ? ((fiveStarCount / feedbacks.length) * 100).toFixed(0) : 0;

  // 🔴 NEW: Food Feedback Calculations (Per-Food Rating Logic)
  const totalFoodFeedbacks = foodFeedbacks.length;
  const uniqueFoodsCount = new Set(foodFeedbacks.map(f => f.food_name)).size;
  const fiveStarFoodCount = foodFeedbacks.filter(f => f.rating === 5).length;
  const fiveStarFoodPercentage = foodFeedbacks.length > 0 ? ((fiveStarFoodCount / foodFeedbacks.length) * 100).toFixed(0) : 0;

  const foodAverageRatings = useMemo(() => {
      const stats = {};
      foodFeedbacks.forEach(f => {
          if (!stats[f.food_name]) stats[f.food_name] = { total: 0, count: 0 };
          stats[f.food_name].total += f.rating;
          stats[f.food_name].count += 1;
      });
      const averages = {};
      for (const [name, data] of Object.entries(stats)) {
          averages[name] = (data.total / data.count).toFixed(1);
      }
      return averages;
  }, [foodFeedbacks]);

  // Pagination Calculations for Shop
  const totalShopPages = Math.ceil(filteredFeedbacks.length / ITEMS_PER_PAGE);
  const validShopPage = currentShopPage > totalShopPages && totalShopPages > 0 ? totalShopPages : currentShopPage;
  const paginatedShopFeedbacks = filteredFeedbacks.slice((validShopPage - 1) * ITEMS_PER_PAGE, validShopPage * ITEMS_PER_PAGE);

  // Pagination Calculations for Food
  const totalFoodPages = Math.ceil(filteredFoodFeedbacks.length / ITEMS_PER_PAGE);
  const validFoodPage = currentFoodPage > totalFoodPages && totalFoodPages > 0 ? totalFoodPages : currentFoodPage;
  const paginatedFoodFeedbacks = filteredFoodFeedbacks.slice((validFoodPage - 1) * ITEMS_PER_PAGE, validFoodPage * ITEMS_PER_PAGE);

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

  const applyReplyToLocalState = (reviewId, adminReply, adminReplyUpdatedAt) => {
    const patchReply = (item) => {
      if (item.id !== reviewId) return item;
      return {
        ...item,
        admin_reply: adminReply,
        admin_reply_updated_at: adminReplyUpdatedAt,
      };
    };

    setFeedbacks(prev => prev.map(patchReply));
    setFoodFeedbacks(prev => prev.map(patchReply));
    setSelectedReview(prev => {
      if (!prev || prev.id !== reviewId) return prev;
      return {
        ...prev,
        admin_reply: adminReply,
        admin_reply_updated_at: adminReplyUpdatedAt,
      };
    });
  };

  const handleOpenReplyDialog = (review) => {
    setReplyTarget(review);
    setReplyText(review.admin_reply || '');
    setReplyError('');
    setIsReplyDialogOpen(true);
  };

  const handleCloseReplyDialog = () => {
    setIsReplyDialogOpen(false);
    setReplyTarget(null);
    setReplyText('');
    setReplyError('');
  };

  const handleSubmitReply = async () => {
    if (!replyTarget) return;

    const trimmedReply = replyText.trim();
    if (!trimmedReply) {
      setReplyError('Reply message is required.');
      return;
    }

    try {
      setIsReplySubmitting(true);
      setReplyError('');

      const response = await requestWithMethodFallback({
        url: `/firstapp/reviews/${replyTarget.id}/reply/`,
        data: {
          admin_reply: trimmedReply,
        },
      });

      applyReplyToLocalState(
        replyTarget.id,
        response.data.admin_reply || '',
        response.data.admin_reply_updated_at || null,
      );

      handleCloseReplyDialog();
    } catch (error) {
      console.error('Failed to save admin reply:', error);
      setReplyError(error?.response?.data?.error || 'Failed to save reply. Please try again.');
    } finally {
      setIsReplySubmitting(false);
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
          <button className={`px-4 py-2 rounded-lg font-medium ${activeTab==='customer'?'bg-blue-500 text-white':'bg-white border border-gray-300'}`} onClick={()=>setActiveTab('customer')}>Customer Shop Review</button>
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
                {paginatedShopFeedbacks.map(f => (
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
                        <button onClick={()=>handleViewReview(f)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18} /></button>
                        <button
                          onClick={() => handleOpenReplyDialog(f)}
                          className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          {f.admin_reply ? 'Edit Reply' : 'Reply'}
                        </button>
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

                    {f.admin_reply && (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                          Admin Reply
                        </p>
                        {f.admin_reply_updated_at && (
                          <p className="text-xs text-blue-600 mt-1">
                            {new Date(f.admin_reply_updated_at).toLocaleString()}
                          </p>
                        )}
                        <p className="mt-2 text-sm text-blue-900 whitespace-pre-wrap">{f.admin_reply}</p>
                      </div>
                    )}
                    
                  </div>
                ))}
                
                <div className="flex justify-between sm:justify-end items-center gap-2 mt-4 pt-4 border-t border-gray-100">  
                    <button 
                        onClick={() => setCurrentShopPage(prev => Math.max(prev - 1, 1))} 
                        disabled={validShopPage === 1} 
                        className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >  
                        <ChevronLeft size={20} />  
                    </button>  
                    <span className="text-sm text-gray-600">Page {validShopPage} of {totalShopPages || 1}</span>  
                    <button 
                        onClick={() => setCurrentShopPage(prev => Math.min(prev + 1, totalShopPages))} 
                        disabled={validShopPage === totalShopPages || totalShopPages === 0} 
                        className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >  
                        <ChevronRight size={20} />  
                    </button>  
                </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Feedbacks</p>
                    <p className="text-3xl font-bold text-gray-900">{totalFoodFeedbacks}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <MessageSquare className="text-blue-600" size={24} />
                  </div>
                </div>
              </div>
              
              {/* 🔴 NEW: Updated Middle Card to show Unique Items instead of Overall Average */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Unique Foods Reviewed</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold text-blue-600">{uniqueFoodsCount}</p>
                    </div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <TrendingUp className="text-blue-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">5-Star Reviews</p>
                    <p className="text-3xl font-bold text-green-600">{fiveStarFoodPercentage}%</p>
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
                  placeholder="Search by food name or comment..."
                  value={searchFoodTerm}
                  onChange={(e)=>setSearchFoodTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
              <div className="w-full md:w-64">
                <select
                  value={foodCategoryFilter}
                  onChange={(e) => setFoodCategoryFilter(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={FEEDBACK_CATEGORY_DEFAULT}>All Categories</option>
                  {foodCategories.map((categoryName) => (
                    <option key={categoryName} value={categoryName}>{categoryName}</option>
                  ))}
                  {selectedCategoryMissing && (
                    <option value={foodCategoryFilter}>{foodCategoryFilter}</option>
                  )}
                </select>
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
                {paginatedFoodFeedbacks.map(f => (
                  <div key={f.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex flex-col gap-3 mb-2">
                          <div className='flex items-center gap-3'>
                            <h4 className="text-lg font-bold text-gray-900">{f.customer_name}</h4>
                            
                            {/* 🔴 NEW: Stars & Per-Food Average Badge */}
                            <div className="flex items-center gap-2">
                                {renderStars(f.rating)}
                                <span className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    Avg: {foodAverageRatings[f.food_name]} <Star size={10} className="fill-yellow-500 text-yellow-500" />
                                </span>
                            </div>

                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{f.food_name}</h3>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{f.food_category || 'Uncategorized'}</p>
                          <p className="text-sm text-gray-500">{new Date(f.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>handleViewReview(f)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18} /></button>
                        <button
                          onClick={() => handleOpenReplyDialog(f)}
                          className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          {f.admin_reply ? 'Edit Reply' : 'Reply'}
                        </button>
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

                    {f.admin_reply && (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                          Admin Reply
                        </p>
                        {f.admin_reply_updated_at && (
                          <p className="text-xs text-blue-600 mt-1">
                            {new Date(f.admin_reply_updated_at).toLocaleString()}
                          </p>
                        )}
                        <p className="mt-2 text-sm text-blue-900 whitespace-pre-wrap">{f.admin_reply}</p>
                      </div>
                    )}
                    
                  </div>
                ))}

                <div className="flex justify-between sm:justify-end items-center gap-2 mt-4 pt-4 border-t border-gray-100">  
                    <button 
                        onClick={() => setCurrentFoodPage(prev => Math.max(prev - 1, 1))} 
                        disabled={validFoodPage === 1} 
                        className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >  
                        <ChevronLeft size={20} />  
                    </button>  
                    <span className="text-sm text-gray-600">Page {validFoodPage} of {totalFoodPages || 1}</span>  
                    <button 
                        onClick={() => setCurrentFoodPage(prev => Math.min(prev + 1, totalFoodPages))} 
                        disabled={validFoodPage === totalFoodPages || totalFoodPages === 0} 
                        className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >  
                        <ChevronRight size={20} />  
                    </button>  
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="text-gray-400 mb-4"><MessageSquare size={64} className="mx-auto" /></div>
                <p className="text-gray-600 text-lg mb-2 font-medium">No food feedback found</p>
                <p className="text-sm text-gray-500">{searchFoodTerm || foodRatingFilter!=='all' || foodCategoryFilter !== FEEDBACK_CATEGORY_DEFAULT ?'Try adjusting your filters':'Food feedback will appear here'}</p>
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

        <ReviewReplyDialog
          open={isReplyDialogOpen}
          onOpenChange={setIsReplyDialogOpen}
          replyTarget={replyTarget}
          replyText={replyText}
          onReplyTextChange={setReplyText}
          replyError={replyError}
          isSubmitting={isReplySubmitting}
          onCancel={handleCloseReplyDialog}
          onSubmit={handleSubmitReply}
        />

      </div>
    </div>
  );
};

export default CustomerFeedback;