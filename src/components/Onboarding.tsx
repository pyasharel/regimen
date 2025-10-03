import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Syringe, TrendingUp, Calendar } from "lucide-react";

const slides = [
  {
    icon: Calendar,
    title: "Welcome to Regimen",
    description: "Take control of your health optimization journey with precision tracking",
  },
  {
    icon: Syringe,
    title: "Never Miss a Dose",
    description: "Smart reminders and dose calculations keep you on track every single day",
  },
  {
    icon: TrendingUp,
    title: "See Your Results",
    description: "Track progress with detailed analytics and AI-powered insights",
  },
];

export const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/today");
    }
  };

  const handleSkip = () => {
    navigate("/today");
  };

  const Slide = slides[currentSlide];

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background px-6 py-12">
      {/* Skip button */}
      {currentSlide < slides.length - 1 && (
        <button
          onClick={handleSkip}
          className="self-end text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center space-y-8 text-center animate-fade-in">
        {/* Icon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
          <Slide.icon className="h-12 w-12 text-white" />
        </div>

        {/* Title */}
        <h1 className="max-w-md text-3xl font-bold">{Slide.title}</h1>

        {/* Description */}
        <p className="max-w-sm text-lg text-muted-foreground">{Slide.description}</p>
      </div>

      {/* Bottom section */}
      <div className="w-full max-w-md space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Next/Get Started button */}
        <Button onClick={handleNext} className="w-full" size="lg">
          {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
        </Button>
      </div>
    </div>
  );
};
