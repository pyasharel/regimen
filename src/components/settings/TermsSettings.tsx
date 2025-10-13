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
            <div className="space-y-3 text-muted-foreground">
              <p className="font-semibold text-destructive text-base">
                MEDICAL DISCLAIMER
              </p>
              <p className="font-medium">
                This application is a <strong>TRACKING TOOL ONLY</strong>. It does not provide medical advice, diagnosis, or treatment.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All calculations are for informational purposes only</li>
                <li>You must independently verify all dosages and calculations</li>
                <li>Consult a qualified healthcare provider before starting any medication or supplement regimen</li>
                <li>We are not responsible for dosing errors, adverse effects, or health consequences resulting from app use</li>
                <li>Using this app does not create a physician-patient relationship</li>
                <li>Always consult with a qualified healthcare provider before starting, stopping, or changing any medication regimen</li>
                <li>Never disregard professional medical advice or delay seeking it because of information from this app</li>
                <li>In case of medical emergency, call your doctor or emergency services immediately</li>
              </ul>
              <div className="pt-2 mt-3 border-t border-border">
                <p className="font-medium mb-2">By using this app, you acknowledge that:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>You are solely responsible for your health decisions</li>
                  <li>You will verify all calculations independently</li>
                  <li>You will consult healthcare professionals as appropriate</li>
                  <li>You use this app entirely at your own risk</li>
                </ol>
              </div>
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
