import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const Terms = () => {
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
            <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Regimen, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Medical Disclaimer</h2>
              <p className="text-muted-foreground">
                Regimen is a tracking tool designed to help you monitor your supplement regimen and progress. It is NOT a medical device and does NOT provide medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals before starting, stopping, or modifying any supplement regimen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">User Responsibilities</h2>
              <p className="text-muted-foreground mb-2">You agree to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Provide accurate information</li>
                <li>Maintain the security of your account</li>
                <li>Use the application in compliance with all applicable laws</li>
                <li>Not misuse or abuse the service</li>
                <li>Consult healthcare professionals for medical decisions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
              <p className="text-muted-foreground">
                Regimen and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the application. This includes but is not limited to health outcomes, medical decisions, or supplement choices.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">No Warranty</h2>
              <p className="text-muted-foreground">
                The application is provided "as is" without warranty of any kind. We do not guarantee that the service will be uninterrupted, secure, or error-free. We make no warranties regarding the accuracy or reliability of any information provided through the application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data and Privacy</h2>
              <p className="text-muted-foreground">
                Your use of Regimen is also governed by our Privacy Policy. By using our application, you consent to our collection and use of data as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Prohibited Uses</h2>
              <p className="text-muted-foreground mb-2">You may not use Regimen to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit malicious code or viruses</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Provide medical advice to others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the application after changes are posted constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Service, please contact us at:{" "}
                <a href="mailto:support@helloregimen.com" className="text-primary hover:underline">
                  support@helloregimen.com
                </a>
              </p>
            </section>

            <section className="pt-4 border-t">
              <p className="text-sm text-muted-foreground italic">
                By using Regimen, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
