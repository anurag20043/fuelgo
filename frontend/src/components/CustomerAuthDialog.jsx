import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, KeyRound, Mail, Smartphone, UserRound, Lock, ArrowRight } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function loginWithGoogle() {
  try {
    sessionStorage.setItem("fuel_intent", "customer");
  } catch {
    /* noop */
  }
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function CustomerAuthDialog({ open, onOpenChange }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="customer-auth-dialog"
        className="bg-[#121214] border border-zinc-700 rounded-none p-0 max-w-md text-white"
      >
        <DialogHeader className="p-6 border-b border-zinc-800">
          <DialogTitle className="font-display uppercase text-2xl font-black tracking-tight">
            {mode === "login" ? "Customer Sign In" : "Create Account"}
          </DialogTitle>
          <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
            // Fuel/Ops · Customer portal
          </div>
        </DialogHeader>

        <div className="p-6">
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="bg-transparent border-b border-zinc-800 rounded-none p-0 flex space-x-6 h-auto justify-start w-full">
              <TabsTrigger
                value="password"
                data-testid="auth-tab-password"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-yellow-400 data-[state=active]:text-yellow-400 text-zinc-500 rounded-none px-0 pb-3 font-bold uppercase tracking-widest text-xs shadow-none"
              >
                <Lock className="w-3.5 h-3.5 mr-1" /> Password
              </TabsTrigger>
              <TabsTrigger
                value="otp"
                data-testid="auth-tab-otp"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-yellow-400 data-[state=active]:text-yellow-400 text-zinc-500 rounded-none px-0 pb-3 font-bold uppercase tracking-widest text-xs shadow-none"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" /> OTP
              </TabsTrigger>
              <TabsTrigger
                value="google"
                data-testid="auth-tab-google"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-yellow-400 data-[state=active]:text-yellow-400 text-zinc-500 rounded-none px-0 pb-3 font-bold uppercase tracking-widest text-xs shadow-none"
              >
                Google
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="pt-6">
              <PasswordForm mode={mode} setMode={setMode} onClose={() => onOpenChange(false)} />
            </TabsContent>
            <TabsContent value="otp" className="pt-6">
              <OtpForm onClose={() => onOpenChange(false)} />
            </TabsContent>
            <TabsContent value="google" className="pt-6">
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  Continue with Google — no forms, no passwords. We only use your email and profile picture.
                </p>
                <button
                  data-testid="google-signin-submit"
                  onClick={loginWithGoogle}
                  className="btn-primary w-full px-4 py-3 text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                    <path fill="#000" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
                    <path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.14 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                  CONTINUE WITH GOOGLE
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasswordForm({ mode, setMode, onClose }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login" ? { email, password } : { email, password, name, phone: phone || undefined };
      const { data } = await api.post(url, payload);
      setUser(data);
      toast.success(mode === "login" ? "Signed in" : "Welcome aboard!");
      onClose();
      navigate("/dashboard", { state: { user: data } });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-testid={`password-${mode}-form`}>
      {mode === "register" && (
        <div>
          <label className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
            <UserRound className="w-3 h-3" /> Full name
          </label>
          <input
            className="input-industrial mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            data-testid="register-name-input"
          />
        </div>
      )}
      <div>
        <label className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
          <Mail className="w-3 h-3" /> Email
        </label>
        <input
          type="email"
          className="input-industrial mt-1.5"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid={`${mode}-email-input`}
        />
      </div>
      {mode === "register" && (
        <div>
          <label className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
            <Smartphone className="w-3 h-3" /> Phone (optional)
          </label>
          <input
            className="input-industrial mt-1.5"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            data-testid="register-phone-input"
          />
        </div>
      )}
      <div>
        <label className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Password {mode === "register" && "(min 6 chars)"}
        </label>
        <input
          type="password"
          className="input-industrial mt-1.5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          data-testid={`${mode}-password-input`}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full px-4 py-3 text-sm disabled:opacity-60"
        data-testid={`${mode}-submit-btn`}
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
      </button>

      <div className="text-center text-xs text-zinc-500 font-mono-num uppercase tracking-widest">
        {mode === "login" ? (
          <>
            No account?{" "}
            <button type="button" onClick={() => setMode("register")} className="text-yellow-400 hover:underline" data-testid="switch-to-register-btn">
              Create one
            </button>
          </>
        ) : (
          <>
            Have an account?{" "}
            <button type="button" onClick={() => setMode("login")} className="text-yellow-400 hover:underline" data-testid="switch-to-login-btn">
              Sign in
            </button>
          </>
        )}
      </div>
    </form>
  );
}

function OtpForm({ onClose }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("request"); // 'request' | 'verify'
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState("email");
  const [devCode, setDevCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/otp/send", { contact });
      setChannel(data.channel);
      setDevCode(data.dev_code || null);
      setStep("verify");
      if (data.dev_code) {
        toast.success(`DEV OTP: ${data.dev_code}`);
      } else {
        toast.success(`OTP sent via ${data.channel}`);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/otp/verify", { contact, code, name: name || undefined });
      setUser(data);
      toast.success("Signed in");
      onClose();
      navigate("/dashboard", { state: { user: data } });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Invalid OTP");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "request") {
    return (
      <form onSubmit={requestOtp} className="space-y-4" data-testid="otp-request-form">
        <p className="text-sm text-zinc-400">
          Enter your email or phone number. We'll send a 6-digit code to sign you in — no password needed.
        </p>
        <div>
          <label className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">
            Email or Phone (E.164)
          </label>
          <input
            className="input-industrial mt-1.5"
            placeholder="you@example.com or +919876543210"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            data-testid="otp-contact-input"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full px-4 py-3 text-sm disabled:opacity-60"
          data-testid="otp-send-btn"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          SEND CODE
        </button>
        <div className="text-[10px] text-zinc-500 font-mono-num uppercase tracking-widest text-center">
          Dev mode: OTP will be shown on-screen · 10-min validity
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={verifyOtp} className="space-y-4" data-testid="otp-verify-form">
      <div className="border border-zinc-800 bg-[#0a0a0a] p-4 text-center">
        <div className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">
          Code sent to {channel === "email" ? "email" : "phone"}
        </div>
        <div className="font-mono-num text-sm text-zinc-200 mt-1 truncate">{contact}</div>
        {devCode && (
          <div className="mt-3 border border-yellow-400/40 bg-yellow-400/5 p-2">
            <div className="font-mono-num text-[10px] uppercase tracking-widest text-yellow-400">DEV OTP</div>
            <div className="font-mono-num text-2xl font-bold text-yellow-400" data-testid="dev-otp-display">{devCode}</div>
          </div>
        )}
      </div>

      <div>
        <label className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">
          6-digit code
        </label>
        <input
          className="input-industrial mt-1.5 text-center text-2xl font-bold tracking-[0.4em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          inputMode="numeric"
          maxLength={6}
          data-testid="otp-code-input"
        />
      </div>

      <div>
        <label className="font-mono-num text-[10px] uppercase tracking-widest text-zinc-500">
          Name (only if signing up)
        </label>
        <input
          className="input-industrial mt-1.5"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="otp-name-input"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || code.length !== 6}
        className="btn-primary w-full px-4 py-3 text-sm disabled:opacity-60"
        data-testid="otp-verify-btn"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        VERIFY & SIGN IN
      </button>

      <button
        type="button"
        onClick={() => { setStep("request"); setCode(""); setDevCode(null); }}
        className="w-full font-mono-num text-[10px] uppercase tracking-widest text-zinc-500 hover:text-yellow-400"
        data-testid="otp-change-contact-btn"
      >
        ← Use different email / phone
      </button>
    </form>
  );
}
