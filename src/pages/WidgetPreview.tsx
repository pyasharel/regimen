import { ArrowLeft, Clock, Check, Syringe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import logoIcon from '@/assets/logo-regimen-icon-final.png';

const WidgetPreview = () => {
  const navigate = useNavigate();

  // Brand colors from design system
  const coral = '#FF6F61'; // hsl(6 100% 69%)
  const purple = '#8B5CF6'; // hsl(258 90% 66%)
  const success = '#10B981'; // hsl(142 71% 45%)

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
          
          {/* Small Widget - Next Dose */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Small Widget — Next Dose</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Shows countdown: "2h 45m" for today, "Tomorrow 9am" or "In 3 days" for future doses
            </p>
            
            {/* Widget mockups */}
            <div className="flex gap-4 flex-wrap">
              {/* Dark mode - Today */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-4 flex flex-col justify-between shadow-xl"
                  style={{ background: 'linear-gradient(145deg, #1a1a1a, #0f0f0f)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <img src={logoIcon} alt="Regimen" className="w-5 h-5 rounded-md" />
                    <span className="text-[10px] font-medium" style={{ color: coral }}>REGIMEN</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Next dose in</div>
                    <div 
                      className="text-3xl font-bold tracking-tight"
                      style={{ 
                        background: `linear-gradient(135deg, ${coral}, ${purple})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      2h 45m
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Syringe className="w-3 h-3" style={{ color: coral }} />
                      <span className="text-xs text-white/80">Semaglutide</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Today</p>
              </div>
              
              {/* Dark mode - Tomorrow */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-4 flex flex-col justify-between shadow-xl"
                  style={{ background: 'linear-gradient(145deg, #1a1a1a, #0f0f0f)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <img src={logoIcon} alt="Regimen" className="w-5 h-5 rounded-md" />
                    <span className="text-[10px] font-medium" style={{ color: coral }}>REGIMEN</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Next dose</div>
                    <div 
                      className="text-2xl font-bold tracking-tight"
                      style={{ 
                        background: `linear-gradient(135deg, ${coral}, ${purple})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      Tomorrow
                    </div>
                    <div className="text-sm text-white/60">at 9:00 AM</div>
                    <div className="flex items-center gap-1.5">
                      <Syringe className="w-3 h-3" style={{ color: coral }} />
                      <span className="text-xs text-white/80">Test Cyp</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Tomorrow</p>
              </div>

              {/* Light mode */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-4 flex flex-col justify-between shadow-xl border"
                  style={{ background: 'linear-gradient(145deg, #ffffff, #fafafa)', borderColor: '#e5e5e5' }}
                >
                  <div className="flex items-center gap-1.5">
                    <img src={logoIcon} alt="Regimen" className="w-5 h-5 rounded-md" />
                    <span className="text-[10px] font-medium" style={{ color: coral }}>REGIMEN</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: '#6B7280' }}>Next dose in</div>
                    <div 
                      className="text-3xl font-bold tracking-tight"
                      style={{ 
                        background: `linear-gradient(135deg, ${coral}, ${purple})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      2h 45m
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Syringe className="w-3 h-3" style={{ color: coral }} />
                      <span className="text-xs" style={{ color: '#374151' }}>Semaglutide</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Light mode</p>
              </div>
            </div>
          </div>

          {/* Medium Widget - Today's Checklist */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Medium Widget — Today's Doses</h3>
            </div>
            <p className="text-xs text-muted-foreground">Interactive checklist — tap to mark doses as taken directly from widget</p>
            
            <div 
              className="w-[329px] h-[155px] rounded-[22px] p-4 flex flex-col shadow-xl"
              style={{ background: 'linear-gradient(145deg, #1a1a1a, #0f0f0f)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <img src={logoIcon} alt="Regimen" className="w-5 h-5 rounded-md" />
                  <span className="text-[10px] font-medium text-white/60">TODAY'S DOSES</span>
                </div>
                <span className="text-[10px] font-medium" style={{ color: success }}>2/3 done</span>
              </div>
              
              <div className="flex-1 flex gap-2">
                {/* Dose 1 - Taken */}
                <div 
                  className="flex-1 rounded-xl p-2.5 flex flex-col justify-between"
                  style={{ backgroundColor: `${success}15`, border: `1px solid ${success}30` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: '#9CA3AF' }}>8:00 AM</span>
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: success }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white truncate">Test Cyp</div>
                    <div className="text-[10px]" style={{ color: '#9CA3AF' }}>0.35ml</div>
                  </div>
                </div>
                
                {/* Dose 2 - Taken */}
                <div 
                  className="flex-1 rounded-xl p-2.5 flex flex-col justify-between"
                  style={{ backgroundColor: `${success}15`, border: `1px solid ${success}30` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: '#9CA3AF' }}>8:00 AM</span>
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: success }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white truncate">BPC-157</div>
                    <div className="text-[10px]" style={{ color: '#9CA3AF' }}>250mcg</div>
                  </div>
                </div>
                
                {/* Dose 3 - Pending (tappable) */}
                <div 
                  className="flex-1 rounded-xl p-2.5 flex flex-col justify-between"
                  style={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: '#9CA3AF' }}>9:00 PM</span>
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ border: `2px solid ${coral}40` }}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white truncate">Semaglutide</div>
                    <div className="text-[10px]" style={{ color: '#9CA3AF' }}>0.5mg</div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">Tap unchecked doses to mark as taken</p>
          </div>

          {/* Large Widget - Estimated Levels */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Large Widget — Estimated Levels</h3>
            </div>
            <p className="text-xs text-muted-foreground">Shows your primary compound's estimated blood levels (matches in-app style)</p>
            
            <div 
              className="w-[329px] h-[329px] rounded-[22px] p-4 flex flex-col shadow-xl"
              style={{ background: 'linear-gradient(145deg, #1a1a1a, #0f0f0f)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <img src={logoIcon} alt="Regimen" className="w-5 h-5 rounded-md" />
                  <span className="text-[10px] font-medium text-white/60">ESTIMATED LEVELS</span>
                </div>
                <span className="text-[10px] font-medium" style={{ color: coral }}>Test Cypionate</span>
              </div>
              
              {/* Level indicator - matching app style */}
              <div className="flex-1 flex flex-col justify-center items-center gap-4">
                {/* Circular progress with gradient */}
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#27272a"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={`url(#brandGradient)`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${72 * 2.64} ${100 * 2.64}`}
                    />
                    <defs>
                      <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={coral} />
                        <stop offset="100%" stopColor={purple} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span 
                      className="text-3xl font-bold"
                      style={{ 
                        background: `linear-gradient(135deg, ${coral}, ${purple})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      ~68mg
                    </span>
                    <span className="text-[10px]" style={{ color: '#6B7280' }}>in system</span>
                  </div>
                </div>
                
                {/* Status badge & stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">3d 14h</div>
                    <div className="text-[10px]" style={{ color: '#6B7280' }}>Since last dose</div>
                  </div>
                  <div className="w-px h-8" style={{ backgroundColor: '#27272a' }} />
                  <div className="text-center">
                    <div 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${success}20`, color: success }}
                    >
                      Optimal
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>Level status</div>
                  </div>
                </div>
              </div>
              
              {/* Mini chart with brand gradient */}
              <div className="mt-2 h-12 flex items-end gap-0.5">
                {[65, 100, 85, 70, 60, 95, 80, 72, 68, 90, 75, 72].map((h, i) => (
                  <div 
                    key={i} 
                    className="flex-1 rounded-t"
                    style={{ 
                      height: `${h}%`,
                      background: `linear-gradient(to top, ${coral}60, ${purple}80)`
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px]" style={{ color: '#52525b' }}>7 days ago</span>
                <span className="text-[8px]" style={{ color: '#52525b' }}>Now</span>
              </div>
            </div>
            
            {/* Level status explanations */}
            <div className="bg-card border border-border rounded-xl p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Level Status States:</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${coral}20`, color: coral }}>Peak</span>
                  <span className="text-muted-foreground">Just after dosing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${success}20`, color: success }}>Optimal</span>
                  <span className="text-muted-foreground">Within target range</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>Declining</span>
                  <span className="text-muted-foreground">Below 50% of peak</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>Low</span>
                  <span className="text-muted-foreground">Below 25%, dose soon</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOCK SCREEN WIDGETS */}
        <div className="space-y-6 pt-4 border-t border-border">
          <h2 className="text-lg font-bold text-primary">Lock Screen Widgets</h2>
          <p className="text-xs text-muted-foreground -mt-4">Lock screen widgets use iOS's tinted monochrome style</p>
          
          {/* Circular Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Circular Widget — Next Dose</h3>
            </div>
            <p className="text-xs text-muted-foreground">Limited space (76×76px) — can show time OR medication, not both elegantly</p>
            
            <div className="flex gap-4 items-center">
              {/* Time-focused */}
              <div className="space-y-1.5">
                <div className="w-[76px] h-[76px] rounded-full bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-white/70 mb-0.5" />
                  <span className="text-lg font-bold text-white leading-none">9:00</span>
                  <span className="text-[8px] text-white/50 uppercase">pm</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Time</p>
              </div>
              
              {/* Countdown-focused */}
              <div className="space-y-1.5">
                <div className="w-[76px] h-[76px] rounded-full bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center border border-white/10">
                  <span className="text-[8px] text-white/50 uppercase">in</span>
                  <span className="text-xl font-bold text-white leading-none">2h</span>
                  <span className="text-xs text-white/70">45m</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Countdown</p>
              </div>
              
              {/* Medication name */}
              <div className="space-y-1.5">
                <div className="w-[76px] h-[76px] rounded-full bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center border border-white/10 p-1">
                  <Syringe className="w-4 h-4 text-white/70 mb-1" />
                  <span className="text-[9px] font-medium text-white leading-tight text-center">Sema</span>
                  <span className="text-[8px] text-white/50">9 PM</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Med + time</p>
              </div>
            </div>
          </div>

          {/* Rectangular Widget - Multiple Meds */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Rectangular Widget — Today's Schedule</h3>
            </div>
            <p className="text-xs text-muted-foreground">Shows multiple medications with times (dosage optional based on space)</p>
            
            <div className="space-y-3">
              {/* 3 medications layout */}
              <div className="w-[170px] h-[54px] rounded-2xl bg-black/80 backdrop-blur-xl px-3 py-2 flex items-center gap-2 border border-white/10">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white/50">8 AM</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-white/30 flex items-center justify-center">
                      <Check className="w-1.5 h-1.5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white/50">8 AM</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-white/30 flex items-center justify-center">
                      <Check className="w-1.5 h-1.5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white font-medium">9 PM</span>
                    <div className="w-2.5 h-2.5 rounded-full border border-white/40" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/50">Next</div>
                  <div className="text-xs font-semibold text-white">Sema</div>
                </div>
              </div>
              
              {/* Alternative: Compact cards */}
              <div className="w-[170px] h-[54px] rounded-2xl bg-black/80 backdrop-blur-xl px-2.5 py-2 flex items-center gap-1.5 border border-white/10">
                <div className="flex-1 flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-1.5 h-1.5 text-white" />
                  </div>
                  <div className="text-[8px] text-white/50 truncate">Test</div>
                </div>
                <div className="flex-1 flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-1.5 h-1.5 text-white" />
                  </div>
                  <div className="text-[8px] text-white/50 truncate">BPC</div>
                </div>
                <div className="flex-1 flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full border border-white/40 flex-shrink-0" />
                  <div className="text-[8px] text-white font-medium truncate">Sema</div>
                </div>
              </div>
              
              {/* Detailed single med */}
              <div className="w-[170px] h-[54px] rounded-2xl bg-black/80 backdrop-blur-xl px-3 py-2 flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-2">
                  <Syringe className="w-4 h-4 text-white/70" />
                  <div>
                    <div className="text-xs font-semibold text-white">Semaglutide</div>
                    <div className="text-[9px] text-white/50">0.5mg injection</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">2h</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Inline Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Inline Widget — Above Clock</h3>
            </div>
            <p className="text-xs text-muted-foreground">Appears above the clock on lock screen</p>
            
            <div className="flex items-center gap-2 py-1 px-3 rounded-full bg-black/60 w-fit border border-white/10">
              <Syringe className="w-3 h-3 text-white/70" />
              <span className="text-xs text-white/90 font-medium">Semaglutide in 2h 45m</span>
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
              <span>Estimated levels</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lock Screen Circular</span>
              <span>Next dose time</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lock Screen Rectangular</span>
              <span>Multiple meds schedule</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            All widgets support light & dark mode. Lock screen widgets automatically adapt to iOS's tinted style.
          </p>
        </div>

        {/* Design notes */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-medium">Design Notes:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>Small widget</strong>: Focus on one medication — space is too tight for multiples</li>
            <li>• <strong>Time display</strong>: Shows "2h 45m" for today, "Tomorrow 9am" or "In 3 days" for future</li>
            <li>• <strong>Lock screen circular</strong>: Can fit time OR abbreviated name, not both well</li>
            <li>• <strong>Level status</strong>: Peak → Optimal → Declining → Low based on half-life calculation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WidgetPreview;
