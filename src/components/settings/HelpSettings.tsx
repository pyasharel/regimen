import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Mail, MessageSquare, ExternalLink, Bug, Copy, Check, LogIn } from "lucide-react";
import { appVersion, appBuild } from "../../../capacitor.config";
import { getBootTraceText, getLastBootSummary, clearBootTrace } from "@/utils/bootTracer";
import { getAuthTraceText, getLastAuthSummary, clearAuthTrace } from "@/utils/authTracer";
import { isDeveloperUser } from "@/utils/developerAccess";
import { supabase } from "@/integrations/supabase/client";
import { useSwipeBack } from "@/hooks/useSwipeBack";

// Build-time constant defined in vite.config.ts
declare const __WEB_BUNDLE_STAMP__: string;

export const HelpSettings = () => {
  const navigate = useNavigate();
  const swipeBack = useSwipeBack();
  const [showBootTrace, setShowBootTrace] = useState(false);
  const [showAuthTrace, setShowAuthTrace] = useState(false);
  const [copiedBoot, setCopiedBoot] = useState(false);
  const [copiedAuth, setCopiedAuth] = useState(false);
  const [bootSummary] = useState(() => getLastBootSummary());
  const [authSummary] = useState(() => getLastAuthSummary());
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsDev(isDeveloperUser(data.session?.user?.id ?? null));
    });
  }, []);

  const faqItems = [
    {
      question: "How do I add a new compound to my stack?",
      answer: "Navigate to 'My Stack' and tap the '+' button. Fill in the compound details including name, dosage, and schedule."
    },
    {
      question: "Can I export my data?",
      answer: "Yes! Go to Settings > Data > Export Data. Your data will be downloaded as a CSV file that you can open in Excel or other spreadsheet applications."
    },
    {
      question: "Is my health data secure?",
      answer: "Absolutely. Your data is encrypted and stored securely. We never sell your personal health information. You can delete your data at any time from Settings > Data."
    }
  ];

  const handleCopyBoot = () => {
    const text = getBootTraceText();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedBoot(true);
      setTimeout(() => setCopiedBoot(false), 2000);
    });
  };

  const handleCopyAuth = () => {
    const text = getAuthTraceText();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAuth(true);
      setTimeout(() => setCopiedAuth(false), 2000);
    });
  };

  const handleCopyAll = () => {
    const combined = `${getBootTraceText()}\n\n${getAuthTraceText()}`;
    navigator.clipboard.writeText(combined).then(() => {
      setCopiedBoot(true);
      setCopiedAuth(true);
      setTimeout(() => {
        setCopiedBoot(false);
        setCopiedAuth(false);
      }, 2000);
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate("/settings")}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Help & Support</h1>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Send Feedback */}
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Send Feedback</h2>
              <p className="text-sm text-muted-foreground">Share ideas or suggestions</p>
            </div>
          </div>
          <a
            href="mailto:support@helloregimen.com?subject=Feedback for Regimen"
            className="flex items-center justify-between w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <span className="text-sm">We'd love to hear from you</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        {/* Contact Support */}
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Contact Support</h2>
              <p className="text-sm text-muted-foreground">Get help from our team</p>
            </div>
          </div>
          <a
            href="mailto:support@helloregimen.com"
            className="flex items-center justify-between w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <span className="text-sm">support@helloregimen.com</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        {/* FAQ */}
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Frequently Asked Questions</h2>
              <p className="text-sm text-muted-foreground">Common questions and answers</p>
            </div>
          </div>
          <div className="space-y-4 mt-4">
            {faqItems.map((item, index) => (
              <div key={index} className="space-y-2">
                <h3 className="font-medium text-sm">{item.question}</h3>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
                {index < faqItems.length - 1 && <div className="border-b border-border mt-4" />}
              </div>
            ))}
          </div>
        </div>

        {isDev && (
          <>
            {/* Boot Trace (Diagnostics) */}
            <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Bug className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold">Boot Diagnostics</h2>
                  <p className="text-xs text-muted-foreground font-mono">{bootSummary}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowBootTrace(!showBootTrace)} className="flex-1 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm">
                  {showBootTrace ? 'Hide Trace' : 'View Boot Trace'}
                </button>
                <button onClick={handleCopyBoot} className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Copy to clipboard">
                  {copiedBoot ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              {showBootTrace && (
                <div className="mt-2">
                  <pre className="p-3 rounded-lg bg-background text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">{getBootTraceText()}</pre>
                  <button onClick={() => { clearBootTrace(); setShowBootTrace(false); }} className="mt-2 w-full p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm transition-colors">Clear Boot Trace</button>
                </div>
              )}
            </div>

            {/* Auth Trace (Login Diagnostics) */}
            <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <LogIn className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold">Login Diagnostics</h2>
                  <p className="text-xs text-muted-foreground font-mono">{authSummary}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAuthTrace(!showAuthTrace)} className="flex-1 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm">
                  {showAuthTrace ? 'Hide Trace' : 'View Auth Trace'}
                </button>
                <button onClick={handleCopyAuth} className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Copy to clipboard">
                  {copiedAuth ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              {showAuthTrace && (
                <div className="mt-2">
                  <pre className="p-3 rounded-lg bg-background text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">{getAuthTraceText()}</pre>
                  <button onClick={() => { clearAuthTrace(); setShowAuthTrace(false); }} className="mt-2 w-full p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm transition-colors">Clear Auth Trace</button>
                </div>
              )}
            </div>

            {/* Copy All Diagnostics Button */}
            <button onClick={handleCopyAll} className="w-full p-3 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm flex items-center justify-center gap-2">
              {copiedBoot && copiedAuth ? (
                <><Check className="h-4 w-4 text-primary" />Copied All Diagnostics</>
              ) : (
                <><Copy className="h-4 w-4" />Copy All Diagnostics</>
              )}
            </button>
          </>
        )}

        {/* App Version */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Regimen v{appVersion} (Build {appBuild})</p>
          <p className="text-xs mt-1 font-mono opacity-70">
            Bundle: {typeof __WEB_BUNDLE_STAMP__ !== 'undefined' ? __WEB_BUNDLE_STAMP__ : 'dev'}
          </p>
          <p className="mt-1">© 2025 All rights reserved</p>
        </div>
      </div>
    </div>
  );
};
