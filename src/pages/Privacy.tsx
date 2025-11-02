import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">Introduction</h2>
              <p className="text-muted-foreground">
                Regimen ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
              <p className="text-muted-foreground mb-2">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Account information (email, name)</li>
                <li>Health and fitness tracking data you choose to input</li>
                <li>Photos you choose to upload for progress tracking</li>
                <li>Usage data and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
              <p className="text-muted-foreground mb-2">We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Provide and maintain our services</li>
                <li>Track your health and fitness progress</li>
                <li>Send you notifications and reminders</li>
                <li>Improve our application and user experience</li>
                <li>Respond to your requests and support needs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell your personal information. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
              <p className="text-muted-foreground mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Opt-out of certain data collection</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Medical Disclaimer</h2>
              <p className="text-muted-foreground">
                Regimen is a tracking tool only and does not provide medical advice. Always consult with qualified healthcare professionals before starting any supplement regimen or making health-related decisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact us at:{" "}
                <a href="mailto:privacy@getregimen.app" className="text-primary hover:underline">
                  privacy@getregimen.app
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
