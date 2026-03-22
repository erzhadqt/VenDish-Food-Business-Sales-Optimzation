import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api'; // Adjust this import based on where your api.js is located
import { Button } from '../../Components/ui/button'; // Optional: if you want to use your custom button

const VerifyStaff = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState(''); // 'success' or 'error'

    useEffect(() => {
        const verifyAccount = async () => {
            const token = searchParams.get('token');
            const action = searchParams.get('action');

            // Prevent API call if parameters are missing
            if (!token || !action) {
                setStatus('error');
                setMessage('Invalid verification link. Missing token or action.');
                setLoading(false);
                return;
            }

            try {
                let response;

                try {
                    response = await api.post('/firstapp/users/verify-invite/', {
                        token: token,
                        action: action
                    });
                } catch (primaryError) {
                    if (primaryError?.response?.status === 404) {
                        response = await api.post('/users/verify-invite/', {
                            token: token,
                            action: action
                        });
                    } else {
                        throw primaryError;
                    }
                }

                setStatus('success');
                setMessage(response.data.message);
            } catch (error) {
                setStatus('error');
                // Extract error message from Django or show a generic one
                if (error.response && error.response.data && error.response.data.error) {
                    setMessage(error.response.data.error);
                } else {
                    setMessage('An error occurred during verification. The link might be expired.');
                }
            } finally {
                setLoading(false);
            }
        };

        verifyAccount();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                    Staff Verification
                </h2>

                {loading ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-4"></div>
                        <p className="text-gray-600">Verifying your account...</p>
                    </div>
                ) : (
                    <div>
                        <div className={`p-4 rounded-md mb-6 ${status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            <p className="font-medium">{message}</p>
                        </div>

                        {status === 'success' && searchParams.get('action') === 'accept' && (
                            <Button 
                                onClick={() => navigate('/login')}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                Proceed to Login
                            </Button>
                        )}
                        
                        {/* If they rejected or there was an error, just give them a button to go to the homepage */}
                        {(status === 'error' || searchParams.get('action') === 'reject') && (
                            <Button 
                                onClick={() => navigate('/')}
                                className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                            >
                                Return to Homepage
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyStaff;