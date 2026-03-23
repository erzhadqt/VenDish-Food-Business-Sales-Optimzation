import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "../Components/ui/button";

export default function GCashCancel() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">The GCash transaction was not completed.</p>
        <Button onClick={() => navigate('/pos')}>Return to POS</Button>
      </div>
    </div>
  );
}