import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

export default function EmailTest() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const sendWelcomeEmail = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading("welcome");
    try {
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          email,
          fullName: "Test User"
        }
      });

      if (error) throw error;
      toast.success(`Welcome email sent to ${email}!`);
    } catch (error: any) {
      console.error('Email error:', error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setLoading(null);
    }
  };

  const sendPasswordResetEmail = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading("reset");
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email,
          resetLink: `${window.location.origin}/auth?reset=true&token=test_token_123`
        }
      });

      if (error) throw error;
      toast.success(`Password reset email sent to ${email}!`);
    } catch (error: any) {
      console.error('Email error:', error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setLoading(null);
    }
  };

  const sendPaymentFailedEmail = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading("payment");
    try {
      const { error } = await supabase.functions.invoke('send-payment-failed', {
        body: {
          email,
          fullName: "Test User",
          amount: "4.99",
          currency: "usd",
          invoiceUrl: "https://stripe.com/invoice/test",
          updatePaymentUrl: `${window.location.origin}/settings`
        }
      });

      if (error) throw error;
      toast.success(`Payment failed email sent to ${email}!`);
    } catch (error: any) {
      console.error('Email error:', error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setLoading(null);
    }
  };

  const sendTrialEndingEmail = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading("trial");
    try {
      const { error } = await supabase.functions.invoke('send-trial-ending', {
        body: {
          email,
          fullName: "Test User",
          daysLeft: 2,
          planName: "Annual Plan",
          planPrice: "$39.99/year",
          manageSubscriptionUrl: `${window.location.origin}/settings`
        }
      });

      if (error) throw error;
      toast.success(`Trial ending email sent to ${email}!`);
    } catch (error: any) {
      console.error('Email error:', error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">📧 Email Testing Suite</h1>
          <p className="text-muted-foreground">
            Test all your email templates - check {" "}
            <a 
              href="https://resend.com/emails" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Resend Dashboard
            </a>
            {" "} to see the rendered emails
          </p>
        </div>

        {/* Email Input */}
        <Card>
          <CardHeader>
            <CardTitle>Test Email Address</CardTitle>
            <CardDescription>
              Enter your email to receive test emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Welcome Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Welcome Email
              </CardTitle>
              <CardDescription>
                Sent when a new user signs up
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={sendWelcomeEmail}
                disabled={loading === "welcome"}
                className="w-full"
              >
                {loading === "welcome" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Welcome Email"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Password Reset */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Password Reset
              </CardTitle>
              <CardDescription>
                Sent when user requests password reset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={sendPasswordResetEmail}
                disabled={loading === "reset"}
                className="w-full"
              >
                {loading === "reset" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Password Reset"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Payment Failed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-destructive" />
                Payment Failed
              </CardTitle>
              <CardDescription>
                Sent when a subscription payment fails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={sendPaymentFailedEmail}
                disabled={loading === "payment"}
                variant="destructive"
                className="w-full"
              >
                {loading === "payment" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Payment Failed"
                )}
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>How to View Emails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Enter your email address above</p>
            <p>2. Click any "Send" button to trigger that email</p>
            <p>3. Check your inbox (might be in spam initially)</p>
            <p>4. Or view in {" "}
              <a 
                href="https://resend.com/emails" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Resend Dashboard
              </a>
              {" "} to see the full HTML preview
            </p>
          </CardContent>
        </Card>

        {/* Warning */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              ⚠️ This page is for testing only. Remove before production or add authentication.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
