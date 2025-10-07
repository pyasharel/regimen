import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const TermsSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4">
        <button onClick={() => navigate("/settings")} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Terms of Service</h1>
      </header>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Terms of Service</h2>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h3 className="font-semibold text-base mb-2">1. Acceptance of Terms</h3>
            <p className="text-muted-foreground">
              By accessing and using Regimen ("the App"), you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">2. Medical Disclaimer</h3>
            <div className="space-y-2 text-muted-foreground">
              <p className="font-medium text-destructive">IMPORTANT: This app is for tracking purposes only and is not a substitute for professional medical advice.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Regimen is NOT a medical device and does not provide medical advice, diagnosis, or treatment</li>
                <li>Always consult with a qualified healthcare provider before starting, stopping, or changing any medication regimen</li>
                <li>Never disregard professional medical advice or delay seeking it because of information from this app</li>
                <li>In case of medical emergency, call your doctor or emergency services immediately</li>
                <li>The dosage information you enter is self-reported and not verified by medical professionals</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">3. User Responsibilities</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>You are solely responsible for:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Accurately entering and maintaining your medication information</li>
                <li>Following your healthcare provider's instructions regarding medications</li>
                <li>Reporting any adverse effects to your healthcare provider</li>
                <li>Keeping your account secure and confidential</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">4. Limitation of Liability</h3>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, REGIMEN SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, 
              OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, 
              USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE APP.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">5. No Warranty</h3>
            <p className="text-muted-foreground">
              THE APP IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">6. Data Privacy</h3>
            <p className="text-muted-foreground">
              Your health data is stored securely. We will never sell your personal health information. You can export or delete 
              your data at any time through the Data settings.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">7. Prohibited Uses</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>You may not use the App to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Share or distribute controlled substances illegally</li>
                <li>Provide medical advice to others</li>
                <li>Use for any unlawful or fraudulent purpose</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">8. Changes to Terms</h3>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">9. Contact Information</h3>
            <p className="text-muted-foreground">
              For questions about these Terms of Service, please contact us at support@regimen.app
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            By using Regimen, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
};
