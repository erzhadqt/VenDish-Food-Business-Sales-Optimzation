import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Mail, KeyRound, Lock, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import api from "../api";

// Step constants
const STEP_EMAIL = "email";
const STEP_OTP = "otp";
const STEP_RESET = "reset";

export default function ForgotPasswordModal({ open, onOpenChange }) {
  const [step, setStep] = useState(STEP_EMAIL);

  // Step 1: Email
  const [email, setEmail] = useState("");

  // Step 2: OTP (6 individual digits)
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  // Step 3: New Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");

  // Shared UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset all state when modal opens/closes
  useEffect(() => {
    if (!open) {
      // Delay reset so closing animation plays first
      const timer = setTimeout(() => {
        setStep(STEP_EMAIL);
        setEmail("");
        setOtpDigits(["", "", "", "", "", ""]);
        setNewPassword("");
        setConfirmPassword("");
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setResetToken("");
        setError("");
        setSuccess("");
        setLoading(false);
        setResendCooldown(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === STEP_OTP && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ---------------------------
  // STEP 1: Request OTP
  // ---------------------------
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/request-otp/", { email: email.trim().toLowerCase() });
      setSuccess(res.data.details || "OTP sent! Check your email inbox.");
      setResendCooldown(60);
      
      // Move to OTP step after brief delay
      setTimeout(() => {
        setSuccess("");
        setStep(STEP_OTP);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.details || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // STEP 2: Verify OTP
  // ---------------------------
  const handleOtpChange = (index, value) => {
    // Only allow single digit
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // On backspace, clear current and move to previous
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);

    // Focus the next empty or the last
    const nextEmpty = newDigits.findIndex((d) => d === "");
    otpRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/verify-otp/", {
        email: email.trim().toLowerCase(),
        otp,
      });

      setResetToken(res.data.token);
      setSuccess(res.data.details || "OTP verified! Set your new password.");

      setTimeout(() => {
        setSuccess("");
        setStep(STEP_RESET);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.details || "Invalid or expired OTP.");
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post("/request-otp/", { email: email.trim().toLowerCase() });
      setSuccess("A new OTP has been sent to your email.");
      setResendCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        setSuccess("");
        otpRefs.current[0]?.focus();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.details || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // STEP 3: Reset Password
  // ---------------------------
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/change-password-token/", {
        token: resetToken,
        email: email.trim().toLowerCase(),
        password: newPassword,
      });

      setSuccess(res.data.details || "Password changed successfully!");

      // Close modal after showing success
      setTimeout(() => {
        onOpenChange(false);
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.details || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Step descriptions
  // ---------------------------
  const titles = {
    [STEP_EMAIL]: "Forgot Password",
    [STEP_OTP]: "Verify OTP",
    [STEP_RESET]: "Reset Password",
  };

  const descriptions = {
    [STEP_EMAIL]: "Enter the email address associated with your account and we'll send you a verification code.",
    [STEP_OTP]: `We sent a 6-digit code to ${email}. Enter it below.`,
    [STEP_RESET]: "Create a new password for your account. Make sure it's at least 8 characters.",
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val && !loading) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-md z-50 font-poppins" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {step !== STEP_EMAIL && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  if (step === STEP_OTP) setStep(STEP_EMAIL);
                  else if (step === STEP_RESET) setStep(STEP_OTP);
                }}
                disabled={loading}
                className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            {titles[step]}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {descriptions[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-1">
          {[STEP_EMAIL, STEP_OTP, STEP_RESET].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step === s
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : [STEP_EMAIL, STEP_OTP, STEP_RESET].indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-400"
              }`}>
                {[STEP_EMAIL, STEP_OTP, STEP_RESET].indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < 2 && (
                <div className={`w-10 h-0.5 transition-all duration-300 ${
                  [STEP_EMAIL, STEP_OTP, STEP_RESET].indexOf(step) > i
                    ? "bg-green-500"
                    : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 border border-red-200 text-sm animate-fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-xl flex items-center gap-2 border border-green-200 text-sm animate-fade-in">
            <CheckCircle2 size={16} className="shrink-0" />
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* ========================= */}
        {/* STEP 1: EMAIL INPUT       */}
        {/* ========================= */}
        {step === STEP_EMAIL && (
          <form onSubmit={handleRequestOTP} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email Address</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                </div>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="pl-10 py-5 rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500/20"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !email}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer"
              >
                {loading ? (
                  <><Loader2 className="animate-spin mr-2" size={16} /> Sending...</>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ========================= */}
        {/* STEP 2: OTP VERIFICATION  */}
        {/* ========================= */}
        {step === STEP_OTP && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 py-2">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center block">
                Enter 6-Digit Code
              </Label>
              <div className="flex items-center justify-center gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    className="w-11 h-13 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800"
                  />
                ))}
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || loading}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : "Resend OTP"}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setStep(STEP_EMAIL); setError(""); setSuccess(""); }}
                disabled={loading}
                className="rounded-xl cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || otpDigits.join("").length !== 6}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer"
              >
                {loading ? (
                  <><Loader2 className="animate-spin mr-2" size={16} /> Verifying...</>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ========================= */}
        {/* STEP 3: NEW PASSWORD      */}
        {/* ========================= */}
        {step === STEP_RESET && (
          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs font-bold text-gray-500 uppercase tracking-wide">New Password</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                </div>
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  className="pl-10 pr-10 py-5 rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password" className="text-xs font-bold text-gray-500 uppercase tracking-wide">Confirm New Password</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                </div>
                <Input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 py-5 rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password requirements hint */}
            <p className="text-xs text-gray-400 px-1">
              Password must be at least 8 characters and not too common.
            </p>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer"
              >
                {loading ? (
                  <><Loader2 className="animate-spin mr-2" size={16} /> Resetting...</>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
