import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Mail, ExternalLink } from "lucide-react";
import { appVersion, appBuild } from "../../../capacitor.config";

export const HelpSettings = () => {
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4 mt-5">
        <button onClick={() => navigate("/settings")} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Help & Support</h1>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
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
            href="mailto:hello@regimenstack.com"
            className="flex items-center justify-between w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <span className="text-sm">hello@regimenstack.com</span>
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

        {/* App Version */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Regimen v{appVersion} (Build {appBuild})</p>
          <p className="mt-1">© 2025 All rights reserved</p>
        </div>
      </div>
    </div>
  );
};
