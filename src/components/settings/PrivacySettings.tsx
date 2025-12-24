import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const PrivacySettings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>
      </header>
      <div className="p-6 space-y-6">
        <Card className="p-6 space-y-6 bg-card max-w-2xl mx-auto">
          <div className="space-y-4">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Introduction</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This privacy policy explains how Regimen ("we", "us", or "our") collects, uses, and protects your personal information when you use our medication tracking application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Information We Collect</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Account Information</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We collect your email address when you create an account to enable authentication and account recovery.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Health Data</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You voluntarily provide information about your medications, dosing schedules, weight, and progress photos. This data is stored securely and is only accessible by you.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>To provide medication tracking and reminder functionality</li>
                <li>To display your progress charts and statistics</li>
                <li>To send you dose reminders (if enabled)</li>
                <li>To improve and optimize our service</li>
                <li>To provide customer support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Data Security</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use industry-standard encryption and security measures to protect your data. Your health information is stored in a secure cloud database with row-level security policies ensuring only you can access your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Data Sharing</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We do not sell, rent, or share your personal health information with third parties for marketing purposes. Your data is yours and yours alone.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Your Rights</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Access and export your data at any time</li>
                <li>Delete your account and all associated data</li>
                <li>Modify or update your information</li>
                <li>Opt out of notifications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Medical Disclaimer</h2>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>IMPORTANT:</strong> Regimen is a tracking tool only and is not intended to provide medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider before starting, stopping, or modifying any medication regimen. We are not responsible for any health outcomes resulting from the use of this application.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Changes to This Policy</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any significant changes via email or in-app notification.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Contact Us</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you have questions about this privacy policy or your data, please contact us at{" "}
                <a href="mailto:privacy@regimen.app" className="text-primary hover:underline">
                  privacy@regimen.app
                </a>
              </p>
            </section>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
