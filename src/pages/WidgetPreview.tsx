import { ArrowLeft, Clock, Check, Droplet, TrendingUp, Calendar, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const WidgetPreview = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Widget Designs</h1>
        </div>
      </div>

      <div className="p-4 space-y-8">
        {/* Introduction */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">
            Preview of iOS widgets for your home screen and lock screen
          </p>
        </div>

        {/* HOME SCREEN WIDGETS */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-primary">Home Screen Widgets</h2>
          
          {/* Small Widget - Next Dose Countdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Small Widget — Next Dose</h3>
            </div>
            <p className="text-xs text-muted-foreground">Shows countdown to your next scheduled dose</p>
            
            {/* Widget mockup */}
            <div className="flex gap-4">
              {/* Dark mode */}
              <div className="w-[155px] h-[155px] rounded-[22px] bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 flex flex-col justify-between shadow-xl border border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">R</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">REGIMEN</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Next dose in</div>
                  <div className="text-3xl font-bold text-white tracking-tight">2h 45m</div>
                  <div className="flex items-center gap-1.5">
                    <Droplet className="w-3 h-3 text-violet-400" />
                    <span className="text-xs text-zinc-300">Semaglutide</span>
                  </div>
                </div>
              </div>
              
              {/* Light mode */}
              <div className="w-[155px] h-[155px] rounded-[22px] bg-gradient-to-br from-white to-zinc-50 p-4 flex flex-col justify-between shadow-xl border border-zinc-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">R</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">REGIMEN</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Next dose in</div>
                  <div className="text-3xl font-bold text-zinc-900 tracking-tight">2h 45m</div>
                  <div className="flex items-center gap-1.5">
                    <Droplet className="w-3 h-3 text-violet-500" />
                    <span className="text-xs text-zinc-600">Semaglutide</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">Dark & Light mode</p>
          </div>

          {/* Medium Widget - Today's Checklist */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Medium Widget — Today's Doses</h3>
            </div>
            <p className="text-xs text-muted-foreground">Interactive checklist — tap to mark doses as taken</p>
            
            <div className="w-[329px] h-[155px] rounded-[22px] bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 flex flex-col shadow-xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">R</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">TODAY'S DOSES</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">2/3 done</span>
              </div>
              
              <div className="flex-1 flex gap-2">
                {/* Dose 1 - Taken */}
                <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">8:00 AM</span>
                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white truncate">Test Cyp</div>
                    <div className="text-[10px] text-zinc-400">0.35ml</div>
                  </div>
                </div>
                
                {/* Dose 2 - Taken */}
                <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">8:00 AM</span>
                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white truncate">BPC-157</div>
                    <div className="text-[10px] text-zinc-400">250mcg</div>
                  </div>
                </div>
                
                {/* Dose 3 - Pending */}
                <div className="flex-1 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">9:00 PM</span>
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white truncate">Semaglutide</div>
                    <div className="text-[10px] text-zinc-400">0.5mg</div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">Tap unchecked doses to mark as taken</p>
          </div>

          {/* Large Widget - Compound Levels */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Large Widget — Estimated Levels</h3>
            </div>
            <p className="text-xs text-muted-foreground">Shows your primary compound's estimated blood levels</p>
            
            <div className="w-[329px] h-[329px] rounded-[22px] bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 flex flex-col shadow-xl border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">R</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">ESTIMATED LEVELS</span>
                </div>
                <span className="text-[10px] text-violet-400 font-medium">Test Cypionate</span>
              </div>
              
              {/* Level indicator */}
              <div className="flex-1 flex flex-col justify-center items-center gap-4">
                {/* Circular progress */}
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgb(39 39 42)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${72 * 2.64} ${100 * 2.64}`}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">72%</span>
                    <span className="text-[10px] text-zinc-500">of peak</span>
                  </div>
                </div>
                
                {/* Stats row */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">3d 14h</div>
                    <div className="text-[10px] text-zinc-500">Since last dose</div>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div className="text-center">
                    <div className="text-lg font-semibold text-emerald-400">Stable</div>
                    <div className="text-[10px] text-zinc-500">Level status</div>
                  </div>
                </div>
              </div>
              
              {/* Mini chart preview */}
              <div className="mt-2 h-12 flex items-end gap-0.5">
                {[65, 100, 85, 70, 60, 95, 80, 72, 68, 90, 75, 72].map((h, i) => (
                  <div 
                    key={i} 
                    className="flex-1 rounded-t bg-gradient-to-t from-violet-600/40 to-violet-500/60"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-zinc-600">7 days ago</span>
                <span className="text-[8px] text-zinc-600">Now</span>
              </div>
            </div>
          </div>
        </div>

        {/* LOCK SCREEN WIDGETS */}
        <div className="space-y-6 pt-4 border-t border-border">
          <h2 className="text-lg font-bold text-primary">Lock Screen Widgets</h2>
          <p className="text-xs text-muted-foreground -mt-4">Lock screen widgets are always displayed in a tinted monochrome style by iOS</p>
          
          {/* Circular Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Circular Widget — Next Dose Time</h3>
            </div>
            
            <div className="flex gap-4 items-center">
              {/* On dark lock screen */}
              <div className="relative">
                <div className="w-[76px] h-[76px] rounded-full bg-zinc-900/80 backdrop-blur-xl flex flex-col items-center justify-center border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-zinc-300 mb-0.5" />
                  <span className="text-lg font-bold text-white leading-none">2:45</span>
                  <span className="text-[8px] text-zinc-400 uppercase">pm</span>
                </div>
              </div>
              
              {/* Alternative - countdown */}
              <div className="relative">
                <div className="w-[76px] h-[76px] rounded-full bg-zinc-900/80 backdrop-blur-xl flex flex-col items-center justify-center border border-white/10">
                  <span className="text-[8px] text-zinc-500 uppercase">in</span>
                  <span className="text-xl font-bold text-white leading-none">2h</span>
                  <span className="text-xs text-zinc-300">45m</span>
                </div>
              </div>
              
              {/* With icon */}
              <div className="relative">
                <div className="w-[76px] h-[76px] rounded-full bg-zinc-900/80 backdrop-blur-xl flex flex-col items-center justify-center border border-white/10">
                  <Droplet className="w-4 h-4 text-zinc-300 mb-1" />
                  <span className="text-sm font-bold text-white leading-none">9 PM</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">Different display options</p>
          </div>

          {/* Rectangular Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Rectangular Widget — Today's Schedule</h3>
            </div>
            
            <div className="space-y-3">
              {/* Option 1 - Schedule list */}
              <div className="w-[170px] h-[54px] rounded-2xl bg-zinc-900/80 backdrop-blur-xl px-3 py-2 flex items-center gap-3 border border-white/10">
                <div className="flex flex-col items-center justify-center">
                  <Calendar className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">Next: 9:00 PM</span>
                    <span className="text-[10px] text-zinc-500">2/3</span>
                  </div>
                  <div className="text-xs font-semibold text-white truncate">Semaglutide 0.5mg</div>
                </div>
              </div>
              
              {/* Option 2 - Compact multi-dose */}
              <div className="w-[170px] h-[54px] rounded-2xl bg-zinc-900/80 backdrop-blur-xl px-3 py-2 flex items-center gap-2 border border-white/10">
                <div className="flex-1 flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60 flex items-center justify-center">
                    <Check className="w-2 h-2 text-white" />
                  </div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60 flex items-center justify-center">
                    <Check className="w-2 h-2 text-white" />
                  </div>
                  <div className="w-3 h-3 rounded-full border border-zinc-500" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">9:00 PM</div>
                  <div className="text-xs font-semibold text-white">Sema 0.5mg</div>
                </div>
              </div>
              
              {/* Option 3 - Minimal countdown */}
              <div className="w-[170px] h-[54px] rounded-2xl bg-zinc-900/80 backdrop-blur-xl px-3 py-2 flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-zinc-300" />
                  <div>
                    <div className="text-xs font-semibold text-white">Semaglutide</div>
                    <div className="text-[10px] text-zinc-400">0.5mg injection</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">2h</div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">Different layout options for rectangular lock screen widget</p>
          </div>
          
          {/* Inline Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Inline Widget — Above Time</h3>
            </div>
            <p className="text-xs text-muted-foreground">This appears above the clock on the lock screen</p>
            
            <div className="flex items-center gap-2 py-1 px-3 rounded-full bg-zinc-900/60 w-fit border border-white/10">
              <Droplet className="w-3 h-3 text-zinc-300" />
              <span className="text-xs text-zinc-200 font-medium">Semaglutide in 2h 45m</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold">Widget Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Home Screen Small</span>
              <span>Next dose countdown</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Home Screen Medium</span>
              <span>Interactive checklist ✓</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Home Screen Large</span>
              <span>Estimated levels graph</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lock Screen Circular</span>
              <span>Next dose time</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lock Screen Rectangular</span>
              <span>Today's schedule</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            All widgets support light & dark mode. Lock screen widgets automatically adapt to iOS's tinted appearance.
          </p>
        </div>

        {/* Next steps */}
        <div className="text-center space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Like these designs? I'll guide you through building them in Xcode step-by-step.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WidgetPreview;
