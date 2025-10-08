import { useState } from "react";
import { Clock, TrendingUp, Heart, Shield, Wifi, FileText, Users, Zap, Bell, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logoGradient from "@/assets/logo-gradient.png";
import beforeRealistic from "@/assets/before-realistic.jpg";
import afterRealistic from "@/assets/after-realistic.jpg";

const Landing = () => {
  const features = [
    {
      icon: Zap,
      title: "Effortless tracking",
      description: "One-tap logging that remembers everything. Manage custom regimens for peptides, GLP-1s, vitamins, or any compound.",
      points: [
        "Automatic dose calculations (mcg, mg, IU)",
        "Smart scheduling for complex protocols",
        "Track injection sites, timing, and cycles",
        "Handle multiple compounds simultaneously",
      ],
    },
    {
      icon: Bell,
      title: "Smart scheduling",
      description: "Never miss a dose or wonder when to cycle off. Intelligent reminders that adapt to your unique protocols.",
      points: [
        "Handles complex cycles and titration schedules",
        "Knows when you should take breaks",
        "Adapts to your routine and preferences",
        "Works even when you're traveling",
        "Customizable reminder timing",
      ],
    },
    {
      icon: TrendingUp,
      title: "Progress insights",
      description: "See your transformation and stay motivated. Track what matters and understand what's driving your results.",
      points: [
        "Photo progress tracking with AI analysis",
        "Weight, measurements, and custom metrics",
        "Understand what compounds are working",
        "Stay motivated with visual progress",
        "Export data for healthcare providers",
      ],
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Reduce cognitive load",
      description: "Stop thinking about when to take what - we handle the complexity so you can focus on results",
    },
    {
      icon: TrendingUp,
      title: "Reach goals faster",
      description: "Consistent tracking and smart insights help you optimize your protocol for better outcomes",
    },
    {
      icon: Heart,
      title: "Stay safe and on track",
      description: "Know when to cycle off and take breaks - never take something for too long or miss important timing",
    },
  ];

  const trustBadges = [
    {
      icon: Shield,
      title: "Privacy first",
      description: "Your health data is encrypted and never shared with third parties",
    },
    {
      icon: Wifi,
      title: "Works offline",
      description: "Access your data anytime, anywhere, even without internet",
    },
    {
      icon: FileText,
      title: "Not medical advice",
      description: "For tracking only - always consult your healthcare provider",
    },
    {
      icon: Users,
      title: "500+ users",
      description: "Join others already optimizing their health journey",
    },
  ];

  const faqs = [
    {
      question: "What kind of medications or compounds can I track with Regimen?",
      answer: "Regimen is designed to be highly versatile. You can effortlessly track a wide range of substances, including peptides, GLP-1s, vitamins, supplements, prescription medications, and any other custom compounds you use in your health regimen. It's built for comprehensive tracking of anything that impacts your health journey.",
    },
    {
      question: "How does Regimen ensure my data privacy?",
      answer: 'Your privacy is our top priority. Regimen is designed with a "privacy-first" approach, meaning your personal health data is securely stored and never shared with third parties. We are committed to protecting your sensitive information with bank-level encryption.',
    },
    {
      question: "Can I use Regimen offline?",
      answer: "Yes! Regimen is built to work seamlessly even without an internet connection. All your critical data and tracking capabilities are available offline, ensuring you can manage your regimen anytime, anywhere.",
    },
    {
      question: "Is Regimen a substitute for medical advice?",
      answer: "No, Regimen is a tracking and management tool designed to help you organize your personal health protocols. It is not intended to provide medical advice, diagnosis, or treatment. Always consult with a qualified healthcare professional for any medical concerns or before making any decisions about your health.",
    },
    {
      question: "How do I get the app?",
      answer: 'Click the "Download the app" button to get started. Regimen is available for both iOS and Android devices.',
    },
    {
      question: "What features does Regimen include?",
      answer: "Regimen includes smart dose tracking, automatic calculations, intelligent scheduling for complex protocols, customizable compound profiles, progress insights with photo tracking, weight and measurement tracking, and the ability to export your data. We're continuously adding more features based on user feedback.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logoGradient} alt="Regimen" className="h-8" />
          <Button asChild>
            <a href="https://getregimen.app" target="_blank" rel="noopener noreferrer">
              Download the app
            </a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-background via-primary/3 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
                Track everything, reach your goals
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Take the guesswork out of dosing, timing, and cycles
              </p>
              <Button 
                size="lg" 
                asChild 
                className="shadow-lg hover:shadow-xl transition-shadow"
              >
                <a href="https://getregimen.app" target="_blank" rel="noopener noreferrer">
                  Download the app
                </a>
              </Button>
            </div>
            
            {/* Hero Phone Mockups - Placeholder for actual screenshots */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg">
                {/* Add your app screenshots here */}
                {/* Replace these placeholder divs with: */}
                {/* <img src={appTodayScreen} alt="..." className="w-3/5 relative z-10 rounded-3xl shadow-2xl" /> */}
                {/* <img src={appProgressScreen} alt="..." className="w-3/5 absolute top-12 right-0 rounded-3xl shadow-2xl" /> */}
                
                <div className="w-3/5 relative z-10 bg-card border-4 border-foreground rounded-[2.5rem] shadow-2xl p-4">
                  <div className="aspect-[9/19.5] bg-gradient-to-b from-primary/10 to-secondary/10 rounded-[1.5rem] flex items-center justify-center">
                    <div className="text-center p-6">
                      <Calendar className="w-12 h-12 text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Today's Schedule</p>
                      <p className="text-xs text-muted-foreground mt-2">Replace with app screenshot</p>
                    </div>
                  </div>
                </div>
                
                <div className="w-3/5 absolute top-12 right-0 bg-card border-4 border-foreground rounded-[2.5rem] shadow-2xl p-4">
                  <div className="aspect-[9/19.5] bg-gradient-to-b from-secondary/10 to-primary/10 rounded-[1.5rem] flex items-center justify-center">
                    <div className="text-center p-6">
                      <TrendingUp className="w-12 h-12 text-secondary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Progress Tracking</p>
                      <p className="text-xs text-muted-foreground mt-2">Replace with app screenshot</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`grid lg:grid-cols-2 gap-12 items-center ${index !== features.length - 1 ? 'mb-32' : ''}`}
            >
              <div className={index === 1 ? "lg:order-2" : ""}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h2 className="text-4xl font-bold text-foreground mb-4">{feature.title}</h2>
                <p className="text-lg text-muted-foreground mb-6">{feature.description}</p>
                <ul className="space-y-3">
                  {feature.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className={`${index === 1 ? "lg:order-1" : ""}`}>
                {/* Mockup placeholders - replace with actual app screenshots */}
                {index === 2 ? (
                  // Progress insights section with app mockup and carousel
                  <div className="space-y-6">
                    {/* App screenshot mockup showing weight progress */}
                    <div className="flex justify-center">
                      <div className="w-3/5 bg-card border-4 border-foreground rounded-[2.5rem] shadow-2xl p-4">
                        <div className="aspect-[9/19.5] bg-gradient-to-b from-primary/5 to-secondary/5 rounded-[1.5rem] flex items-center justify-center">
                          <div className="text-center p-6">
                            <TrendingUp className="w-12 h-12 text-primary/40 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-foreground">-12 lbs</p>
                            <p className="text-xs text-muted-foreground mt-1">Last 8 weeks</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Before/After Photo Carousel */}
                    <div className="bg-card border border-border rounded-xl p-4 shadow-md">
                      <h3 className="text-sm font-semibold text-foreground mb-3 text-center">Visual Progress</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        <div className="flex-shrink-0 relative w-32">
                          <img 
                            src={beforeRealistic} 
                            alt="Before progress photo"
                            className="w-full aspect-[3/4] object-cover rounded-lg"
                          />
                          <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded font-medium">
                            Before
                          </span>
                        </div>
                        <div className="flex-shrink-0 relative w-32">
                          <img 
                            src={afterRealistic} 
                            alt="After progress photo"
                            className="w-full aspect-[3/4] object-cover rounded-lg"
                          />
                          <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded font-medium">
                            8 weeks
                          </span>
                        </div>
                        {/* Placeholder for more photos */}
                        <div className="flex-shrink-0 w-32 aspect-[3/4] bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                          <p className="text-[10px] text-muted-foreground text-center px-2">More photos</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Generic phone mockup placeholder
                  <div className="flex justify-center">
                    <div className="w-3/5 bg-card border-4 border-foreground rounded-[2.5rem] shadow-2xl p-4">
                      <div className="aspect-[9/19.5] bg-gradient-to-b from-primary/5 to-secondary/5 rounded-[1.5rem] flex items-center justify-center">
                        <div className="text-center p-6">
                          <feature.icon className="w-12 h-12 text-primary/40 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">Replace with app screenshot</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center text-foreground mb-4">
            Why people love Regimen
          </h2>
          <p className="text-lg text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Join hundreds of users optimizing their health protocols with precision and confidence
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <div 
                key={i} 
                className="p-8 bg-background border border-border rounded-xl hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustBadges.map((badge, i) => (
              <div key={i} className="p-6 text-center bg-card border border-border rounded-xl hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                  <badge.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{badge.title}</h3>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-4xl font-bold text-center text-foreground mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-center text-muted-foreground mb-12">
            Everything you need to know about Regimen
          </p>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`item-${i}`} 
                className="bg-background border border-border rounded-lg px-6 hover:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-secondary text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to optimize your health?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of people taking control of their health protocols
          </p>
          <Button 
            asChild
            size="lg"
            variant="secondary"
            className="bg-white text-primary hover:bg-white/90 shadow-lg"
          >
            <a href="https://getregimen.app" target="_blank" rel="noopener noreferrer">
              Download the app
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
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
