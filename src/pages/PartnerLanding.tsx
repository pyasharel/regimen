import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, Shield, Bell, Camera, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import appIcon from '@/assets/regimen-app-icon.png';
import todayPreview from '@/assets/today-screen-preview-dark.png';

// Partner-specific configurations
const partnerConfigs: Record<string, {
  name: string;
  code: string;
  headline: string;
  subheadline: string;
  freePeriod: string;
}> = {
  research1: {
    name: 'Research 1 Peptides',
    code: 'TRYREGIMEN',
    headline: 'Track Your Peptide Protocol Like a Pro',
    subheadline: 'Never miss a dose with smart reminders and precise calculations',
    freePeriod: '1 month',
  },
  peptidegang: {
    name: 'Peptide Gang',
    code: 'PEPTIDEGANG',
    headline: 'The #1 Peptide Tracking App',
    subheadline: 'Trusted by thousands of protocol enthusiasts',
    freePeriod: '1 month',
  },
  // Default fallback
  default: {
    name: 'Partner',
    code: 'TRYREGIMEN',
    headline: 'Track Your Protocol Like a Pro',
    subheadline: 'Smart dose tracking, reminders, and progress photos',
    freePeriod: '1 month',
  },
};

const APP_STORE_URL = 'https://apps.apple.com/app/regimen-peptide-tracker/id6753905449';

export default function PartnerLanding() {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const [copied, setCopied] = useState(false);
  
  const config = partnerConfigs[partnerSlug || ''] || partnerConfigs.default;
  
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(config.code);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };
  
  const features = [
    { icon: Bell, title: 'Smart Reminders', description: 'Never miss a dose with customizable notifications' },
    { icon: Shield, title: 'Dose Calculator', description: 'Precise reconstitution & injection calculations' },
    { icon: Camera, title: 'Progress Photos', description: 'Track your transformation with side-by-side comparisons' },
    { icon: TrendingUp, title: 'Cycle Tracking', description: 'Manage on/off cycles with intelligent scheduling' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="px-6 pt-12 pb-8 text-center">
        <img 
          src={appIcon} 
          alt="Regimen App" 
          className="w-20 h-20 mx-auto mb-6 rounded-2xl shadow-lg"
        />
        
        <h1 className="text-3xl font-bold text-foreground mb-3">
          {config.headline}
        </h1>
        
        <p className="text-lg text-muted-foreground mb-6">
          {config.subheadline}
        </p>
        
        {/* Promo Code Card */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            Exclusive offer from {config.name}
          </p>
          <p className="text-2xl font-bold text-primary mb-4">
            {config.freePeriod} FREE
          </p>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-background border-2 border-dashed border-primary rounded-lg px-6 py-3">
              <span className="text-xl font-mono font-bold text-foreground tracking-wider">
                {config.code}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              className="h-12 w-12 rounded-lg"
            >
              {copied ? <Check className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5" />}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Use this code after downloading the app
          </p>
        </div>
        
        {/* CTA Button */}
        <Button
          asChild
          size="lg"
          className="w-full h-14 text-lg font-semibold rounded-xl mb-4"
        >
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-5 w-5" />
            Download Free on App Store
          </a>
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Then enter code <span className="font-mono font-bold">{config.code}</span> in the app
        </p>
      </div>
      
      {/* App Preview */}
      <div className="px-6 py-8">
        <div className="relative mx-auto max-w-[280px]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10" />
          <img 
            src={todayPreview} 
            alt="Regimen App Preview" 
            className="w-full rounded-3xl shadow-2xl border border-border"
          />
        </div>
      </div>
      
      {/* Features Grid */}
      <div className="px-6 py-8">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">
          Everything you need to stay on track
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className="bg-card border border-border rounded-xl p-4"
            >
              <feature.icon className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-semibold text-foreground text-sm mb-1">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* How It Works */}
      <div className="px-6 py-8 bg-muted/50">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">
          How to claim your free month
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Download the app</h3>
              <p className="text-sm text-muted-foreground">Free on the App Store</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Complete quick onboarding</h3>
              <p className="text-sm text-muted-foreground">Takes less than a minute</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Enter code {config.code}</h3>
              <p className="text-sm text-muted-foreground">When prompted to subscribe</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
              4
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Enjoy {config.freePeriod} free!</h3>
              <p className="text-sm text-muted-foreground">Then $39.99/year if you love it</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Final CTA */}
      <div className="px-6 py-8 text-center">
        <Button
          asChild
          size="lg"
          className="w-full h-14 text-lg font-semibold rounded-xl"
        >
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-5 w-5" />
            Get Started Free
          </a>
        </Button>
        
        <p className="text-xs text-muted-foreground mt-4">
          Questions? Email us at hello@getregimen.app
        </p>
      </div>
      
      {/* Footer */}
      <div className="px-6 py-6 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          <a href="/terms" className="underline hover:text-foreground">Terms</a>
          {' • '}
          <a href="/privacy" className="underline hover:text-foreground">Privacy</a>
        </p>
      </div>
    </div>
  );
}
