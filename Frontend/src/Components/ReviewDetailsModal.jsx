import React from 'react';
import { Star, User, Mail, MapPin, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

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

const ReviewDetailsModal = ({ open, onOpenChange, feedback }) => {
  const renderStars = (rating) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} size={16} className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
      ))}
    </div>
  );

  const isFoodReview = feedback?.food_name !== undefined;
  const modalTitle = isFoodReview ? "Food Review Details" : "Customer Review Details";
  const profilePicUrl = resolveMediaUrl(feedback?.profile_pic);
  const reviewImageUrl = resolveMediaUrl(feedback?.image);

  if (!feedback) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125 z-50">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-2 space-y-5">
          
          {/* USER PROFILE HEADER */}
          <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
            <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 shadow-sm">
              {profilePicUrl ? (
                <img src={profilePicUrl} alt="User" className="h-full w-full object-cover" />
              ) : (
                <User size={28} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-gray-900 truncate">
                {feedback.customer_name || `${feedback.first_name || ''} ${feedback.last_name || ''}`.trim() || "Anonymous"}
              </h4>
              <div className="flex flex-col gap-1 mt-1">
                {feedback.email && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5 truncate">
                    <Mail size={12} className="text-gray-400 shrink-0"/> {feedback.email}
                  </p>
                )}
                {feedback.phone && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5 truncate">
                    <Phone size={12} className="text-gray-400 shrink-0"/> {feedback.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ADDRESS SECTION (If available) */}
          {feedback.address && (
             <div className="bg-gray-50/50 p-3 rounded-md border border-gray-100 flex items-start gap-2">
                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-600 leading-tight">{feedback.address}</p>
             </div>
          )}

          {/* REVIEW CONTENT */}
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  {isFoodReview ? `Review for: ${feedback.food_name}` : 'Shop Feedback'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">{new Date(feedback.created_at).toLocaleString()}</p>
              </div>
              <div>{renderStars(feedback.rating)}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{feedback.comment}</p>
            </div>

            {feedback.admin_reply && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Admin Reply
                </p>
                {feedback.admin_reply_updated_at && (
                  <p className="text-xs text-blue-600 mt-1">
                    {new Date(feedback.admin_reply_updated_at).toLocaleString()}
                  </p>
                )}
                <p className="mt-2 text-blue-900 whitespace-pre-wrap text-sm leading-relaxed">{feedback.admin_reply}</p>
              </div>
            )}

            {reviewImageUrl && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attached Image</p>
                <img 
                  src={reviewImageUrl} 
                  alt="Review attachment" 
                  className="w-full max-h-64 object-contain rounded-md border border-gray-200 bg-gray-50" 
                />
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDetailsModal;