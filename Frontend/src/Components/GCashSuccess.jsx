import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function GCashSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');

    // Automatically redirect back to the POS after 3 seconds
    const timer = setTimeout(() => {
      if (ref) {
        navigate(`/admin/pos?gcash_ref=${encodeURIComponent(ref)}`);
      } else {
        navigate('/admin/pos');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, location.search]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Payment Authorized!</h1>
        <p className="text-gray-600">Please wait while we confirm the transaction...</p>
        <p className="text-sm text-gray-400 mt-4">Redirecting you back to the POS...</p>
      </div>
    </div>
  );
}