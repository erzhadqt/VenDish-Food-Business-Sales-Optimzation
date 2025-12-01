import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Mail, ArrowLeft, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

function Form({ route, method }) {
  const { user, loading: userLoading, login } = useAuth();
  
  // Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(""); 
  
  const navigate = useNavigate();

  // Determine mode
  const isLogin = method === "login";
  const title = isLogin ? "Welcome Back!" : "Create Account";
  const subtitle = isLogin ? "Sign in to access the dashboard" : "Join Kuya Vince Karinderya today";
  const buttonText = isLogin ? "Sign In" : "Sign Up";

  // Redirect if user is already logged in
  useEffect(() => {
    if (!userLoading && user) {
      if (user.is_superuser) navigate("/admin/sales");
      else if (user.is_staff) navigate("/admin/pos");
    }
  }, [user, userLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const result = await login(username, password);

        if (result.success) {
          if (!user?.is_superuser && !user?.is_staff) {
             setMessage("Logged in successfully!");
          }
        } else {
          setMessage(result.message || "Invalid credentials");
        }
      } else {
        // --- SIGNUP LOGIC ---
        if (password !== confirmPassword) {
          setMessage("Passwords do not match");
          setLoading(false);
          return;
        }

        await api.post(route, { username, email, password });
        setMessage("Signup successful! Redirecting to login...");
        setTimeout(() => navigate("/kuyavincekarinderya"), 1500);
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-poppins text-gray-800 relative bg-linear-to-br from-white via-red-100 to-white">
      
      {/* --- CARD CONTAINER --- */}
      <div className="relative z-10 w-full max-w-md px-6 my-10 animate-fade-in">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/40">
          
          {/* --- HEADER --- */}
          <div className="pt-8 pb-6 px-8 text-center bg-linear-to-b from-white to-red-50 border-b border-red-100">
            <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer transition-transform hover:scale-105 duration-300">
              <div className="absolute inset-0 bg-red-600 rounded-full animate-pulse blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <img 
                src="/icon.jpeg" 
                alt="Kuya Vince Logo" 
                className="relative w-full h-full rounded-full border-4 border-white shadow-lg object-cover"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              {isLogin ? <span className="text-red-600">Kuya Vince</span> : "Join Us"}
            </h2>
            <p className="text-gray-500 font-medium text-sm mt-1">{isLogin ? "Karinderya Management System" : subtitle}</p>
          </div>

          {/* --- FORM BODY --- */}
          <div className="p-8 pt-6">
            
            {/* Alert Message */}
            {message && (
              <div className={`mb-6 p-3 border rounded-xl flex items-center gap-3 text-sm animate-fade-in shadow-sm ${
                message.toLowerCase().includes("success") 
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}>
                <AlertCircle size={18} className="shrink-0" />
                <p className="font-medium">{message}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Username Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Email Field (Signup Only) */}
              {!isLogin && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Email</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field (Signup Only) */}
              {!isLogin && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {/* Terms Checkbox (Signup Only - Text) */}
              {!isLogin && (
                <div className="text-xs text-center text-gray-500 px-1 mt-2">
                   By creating an account, you agree to our <span className="text-red-600 font-bold cursor-pointer hover:underline">Terms</span> & <span className="text-red-600 font-bold cursor-pointer hover:underline">Privacy Policy</span>.
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-600/30 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processing...</span>
                  </>
                ) : (
                  buttonText
                )}
              </button>
            </form>

            {/* Footer / Back Link */}
            <div className="mt-8 flex flex-col items-center gap-4 text-sm">
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors font-semibold group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Link>
            </div>
          </div>
          
          {/* Decorative Bottom Stripe */}
          <div className="h-2 bg-linear-to-r from-red-500 via-red-600 to-red-700"></div>
        </div>
        
        <p className="text-center text-gray-400 text-xs mt-6 font-medium">
          © {new Date().getFullYear()} Kuya Vince Karinderya
        </p>
      </div>
    </div>
  );
}

export default Form;