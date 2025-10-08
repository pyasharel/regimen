import { useState } from "react";
import { ChevronDown, Clock, TrendingUp, Heart, Shield, Wifi, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoGradient from "@/assets/logo-gradient.png";

const Landing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    {
      icon: Clock,
      title: "Effortless Tracking",
      description: "Manage custom regimens for peptides, GLP-1s, vitamins, or any compound. Automatic dose calculations (mcg, mg, IU conversions), smart scheduling for complex protocols, and one-tap logging that remembers everything.",
      points: [
        "Handle multiple compounds simultaneously",
        "Track injection sites, timing, and cycles",
        "Automatic unit conversions"
      ],
      align: "left"
    },
    {
      icon: TrendingUp,
      title: "Smart Scheduling",
      description: "Never miss a dose or wonder when to cycle off. Handles complex cycles and titration schedules, knows when you should take breaks, and adapts to your routine and preferences.",
      points: [
        "Complex cycles and titration management",
        "Automatic cycle management",
        "Works even when traveling"
      ],
      align: "right"
    },
    {
      icon: Heart,
      title: "Progress Insights",
      description: "Photo progress tracking with AI analysis, weight, measurements, and custom metrics. Understand what compounds are working and see your transformation visually.",
      points: [
        "Track body composition changes",
        "Visual transformation timeline",
        "Export data for healthcare providers"
      ],
      align: "left"
    }
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Reduce cognitive load",
      description: "Stop thinking about when to take what - we handle the complexity so you can focus on results"
    },
    {
      icon: TrendingUp,
      title: "Reach goals faster",
      description: "Consistent tracking and smart insights help you optimize your protocol for better outcomes"
    },
    {
      icon: Heart,
      title: "Stay safe and on track",
      description: "Know when to cycle off and take breaks - never take something for too long or miss important timing"
    }
  ];

  const trustBadges = [
    {
      icon: Shield,
      title: "Privacy first",
      description: "Your health data is encrypted and never shared with third parties"
    },
    {
      icon: Wifi,
      title: "Works offline",
      description: "Access your data anytime, anywhere, even without internet"
    },
    {
      icon: FileText,
      title: "Not medical advice",
      description: "For tracking only - always consult your healthcare provider"
    },
    {
      icon: Users,
      title: "500+ users",
      description: "Join others already optimizing their health journey"
    }
  ];

  const faqs = [
    {
      question: "What kind of medications or compounds can I track with Regimen?",
      answer: "Regimen is designed to be highly versatile. You can effortlessly track a wide range of substances, including peptides, GLP-1s, vitamins, supplements, prescription medications, and any other custom compounds you use in your health regimen. It's built for comprehensive tracking of anything that impacts your health journey."
    },
    {
      question: "How does Regimen ensure my data privacy?",
      answer: "Your privacy is our top priority. Regimen is designed with a \"privacy-first\" approach, meaning your personal health data is securely stored and never shared with third parties. We are committed to protecting your sensitive information with bank-level encryption."
    },
    {
      question: "Can I use Regimen offline?",
      answer: "Yes! Regimen is built to work seamlessly even without an internet connection. All your critical data and tracking capabilities are available offline, ensuring you can manage your regimen anytime, anywhere."
    },
    {
      question: "Is Regimen a substitute for medical advice?",
      answer: "No, Regimen is a tracking and management tool designed to help you organize your personal health protocols. It is not intended to provide medical advice, diagnosis, or treatment. Always consult with a qualified healthcare professional for any medical concerns or before making any decisions about your health."
    },
    {
      question: "How do I get the app?",
      answer: "Click the \"Download the app\" button to get started. Regimen is available for both iOS and Android devices."
    },
    {
      question: "What features does Regimen include?",
      answer: "Regimen includes smart dose tracking, automatic calculations, intelligent scheduling for complex protocols, customizable compound profiles, progress insights with photo tracking, weight and measurement tracking, and the ability to export your data. We're continuously adding more features based on user feedback."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <img src={logoGradient} alt="Regimen" className="h-8" />
            <Button 
              onClick={() => window.location.href = 'https://getregimen.app'}
              className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-all duration-300 shadow-premium"
            >
              Download the app
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 -z-10" />
        
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Track everything,<br />reach your goals
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Take the guesswork out of dosing, timing, and cycles
            </p>
            <Button 
              onClick={() => window.location.href = 'https://getregimen.app'}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-all duration-300 shadow-premium text-lg px-8 py-6 h-auto"
            >
              Get started
            </Button>
          </div>

          {/* Hero Image Placeholder */}
          <div className="relative mx-auto max-w-4xl mt-16 animate-slide-up">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8 sm:p-12 border border-border shadow-elevated">
              <div className="aspect-[16/9] bg-card rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="text-lg">Your intelligent companion for managing health protocols</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`flex flex-col ${feature.align === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 mb-24 last:mb-0`}
            >
              {/* Content */}
              <div className="flex-1 animate-fade-in">
                <feature.icon className="w-12 h-12 text-primary mb-6" strokeWidth={1.5} />
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">{feature.title}</h2>
                <p className="text-lg text-muted-foreground mb-6">{feature.description}</p>
                <ul className="space-y-3">
                  {feature.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5" />
                      <span className="text-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup Placeholder */}
              <div className="flex-1 w-full max-w-md">
                <div className="bg-card rounded-2xl p-8 border border-border shadow-card">
                  <div className="aspect-[9/16] bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-16 h-16 text-primary/30" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Why people love Regimen
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="bg-card rounded-xl p-8 border border-border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
              >
                <benefit.icon className="w-10 h-10 text-primary mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustBadges.map((badge, index) => (
              <div key={index} className="text-center">
                <badge.icon className="w-10 h-10 text-primary mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="font-semibold mb-2">{badge.title}</h3>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-card rounded-lg border border-border overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold pr-4">{faq.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-primary transition-transform duration-300 flex-shrink-0 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div 
                  className={`transition-all duration-300 overflow-hidden ${
                    openFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-6 pb-4 text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary to-secondary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-secondary/50 -z-10" />
        
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to optimize your health?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of people taking control of their health protocols
          </p>
          <Button 
            onClick={() => window.location.href = 'https://getregimen.app'}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 transition-all duration-300 shadow-elevated text-lg px-8 py-6 h-auto"
          >
            Download the app
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <img src={logoGradient} alt="Regimen" className="h-8" />
            <div className="flex gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="mailto:hello@regimenstack.com" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="text-center mt-8 text-sm text-muted-foreground">
            © 2025 Regimen. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
