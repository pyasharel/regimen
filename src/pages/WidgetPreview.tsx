import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import appIcon from '@/assets/app-icon-1024.png';
import wordmarkLogo from '@/assets/regimen-wordmark-transparent.png';
const WidgetPreview = () => {
  const navigate = useNavigate();

  // Monochrome icon SVG component for lock screen widgets
  const MonochromeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 100 100" fill="white">
      {/* Simplified app icon shape - stacked hexagon/pill capsule design */}
      <path d="M50 8 L78 24 V52 L50 68 L22 52 V24 Z" fillOpacity="0.3" />
      <path d="M50 20 L70 32 V48 L50 60 L30 48 V32 Z" fillOpacity="0.6" />
      <path d="M50 32 L60 38 V50 L50 56 L40 50 V38 Z" fillOpacity="0.9" />
    </svg>
  );

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

      <div className="p-4 space-y-10">
        {/* HOME SCREEN WIDGETS */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-primary">Home Screen Widgets</h2>
          
          {/* Small Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Small Widget — Next Dose</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Tapping opens the app (small widgets can't have interactive elements). Shows day/time if not today.
            </p>
            
            <div className="flex gap-4 flex-wrap">
              {/* Today - hours away */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-3 flex flex-col justify-between"
                  style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
                >
                  <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain object-left" />
                  
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-medium text-[#FF6F61] uppercase tracking-wider">Next Dose</div>
                    <div className="text-[26px] font-bold text-white leading-none">2h 15m</div>
                    <div className="text-[11px] text-[#9CA3AF]">Today at 6:00 PM</div>
                  </div>
                  
                  <div>
                    <div className="text-[13px] font-semibold text-white">Tirzepatide</div>
                    <div className="text-[10px] text-[#6B7280]">2 mg</div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Today</p>
              </div>
              
              {/* Tomorrow */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-3 flex flex-col justify-between"
                  style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
                >
                  <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain object-left" />
                  
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-medium text-[#FF6F61] uppercase tracking-wider">Next Dose</div>
                    <div className="text-[22px] font-bold text-white leading-tight">TUE 8 AM</div>
                  </div>
                  
                  <div>
                    <div className="text-[13px] font-semibold text-white">Test Cypionate</div>
                    <div className="text-[10px] text-[#6B7280]">100 mg • 0.35ml</div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Tomorrow</p>
              </div>
              
              {/* Multiple days away */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-3 flex flex-col justify-between"
                  style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
                >
                  <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain object-left" />
                  
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-medium text-[#FF6F61] uppercase tracking-wider">Next Dose</div>
                    <div className="text-[20px] font-bold text-white leading-tight">MON 8 AM</div>
                    <div className="text-[11px] text-[#9CA3AF]">Dec 9</div>
                  </div>
                  
                  <div>
                    <div className="text-[13px] font-semibold text-white">Semaglutide</div>
                    <div className="text-[10px] text-[#6B7280]">0.5 mg</div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Days away</p>
              </div>

              {/* No upcoming doses */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-3 flex flex-col justify-between"
                  style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
                >
                  <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain object-left" />
                  
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-[11px] text-[#6B7280] text-center">All caught up!</div>
                    <div className="text-[10px] text-[#52525b] text-center mt-1">No upcoming doses</div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Empty state</p>
              </div>

              {/* Light mode */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-3 flex flex-col justify-between"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5' }}
                >
                  <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain object-left" style={{ filter: 'brightness(0.2)' }} />
                  
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-medium text-[#FF6F61] uppercase tracking-wider">Next Dose</div>
                    <div className="text-[26px] font-bold text-[#0F0F0F] leading-none">2h 15m</div>
                    <div className="text-[11px] text-[#6B7280]">Today at 6:00 PM</div>
                  </div>
                  
                  <div>
                    <div className="text-[13px] font-semibold text-[#0F0F0F]">Tirzepatide</div>
                    <div className="text-[10px] text-[#9CA3AF]">2 mg</div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Light mode</p>
              </div>
            </div>
          </div>

          {/* Medium Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Medium Widget — Upcoming Doses</h3>
            </div>
            <p className="text-xs text-muted-foreground">Interactive — tap checkboxes to mark doses as taken directly from widget</p>
            
            <div className="flex gap-4 flex-wrap">
              {/* Multiple doses */}
              <div className="space-y-1.5">
                <div 
                  className="w-[329px] h-[155px] rounded-[22px] p-3 flex flex-col"
                  style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain" />
                    <span className="text-[10px] font-medium text-[#FF6F61]">2 of 4 taken</span>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    {/* Taken - Today */}
                    <div 
                      className="rounded-xl p-2 flex flex-col justify-between"
                      style={{ backgroundColor: '#FF6F6115', border: '1px solid #FF6F6130' }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] text-[#6B7280]">Today 8AM</span>
                        <div className="w-4 h-4 rounded-full bg-[#FF6F61] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-white truncate">NAD+</div>
                        <div className="text-[8px] text-[#6B7280]">50mg</div>
                      </div>
                    </div>
                    
                    {/* Taken - Today */}
                    <div 
                      className="rounded-xl p-2 flex flex-col justify-between"
                      style={{ backgroundColor: '#FF6F6115', border: '1px solid #FF6F6130' }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] text-[#6B7280]">Today 8AM</span>
                        <div className="w-4 h-4 rounded-full bg-[#FF6F61] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-white truncate">BPC-157</div>
                        <div className="text-[8px] text-[#6B7280]">2mg</div>
                      </div>
                    </div>
                    
                    {/* Pending - Tomorrow */}
                    <div 
                      className="rounded-xl p-2 flex flex-col justify-between"
                      style={{ backgroundColor: '#1A1A1A', border: '1px solid #333333' }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] text-[#FF6F61]">TUE 8AM</span>
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ border: '2px solid #FF6F6140' }}
                        />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-white truncate">Test Cyp</div>
                        <div className="text-[8px] text-[#6B7280]">100mg</div>
                      </div>
                    </div>
                    
                    {/* Pending - Friday */}
                    <div 
                      className="rounded-xl p-2 flex flex-col justify-between"
                      style={{ backgroundColor: '#1A1A1A', border: '1px solid #333333' }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] text-[#FF6F61]">FRI 8AM</span>
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ border: '2px solid #FF6F6140' }}
                        />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-white truncate">Tirz</div>
                        <div className="text-[8px] text-[#6B7280]">2mg</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Multiple doses today</p>
              </div>

              {/* Single dose */}
              <div className="space-y-1.5">
                <div 
                  className="w-[329px] h-[155px] rounded-[22px] p-3 flex flex-col"
                  style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain" />
                    <span className="text-[10px] font-medium text-[#9CA3AF]">Upcoming</span>
                  </div>
                  
                  <div className="flex-1 flex items-center">
                    <div 
                      className="w-full rounded-xl p-3 flex items-center justify-between"
                      style={{ backgroundColor: '#1A1A1A', border: '1px solid #333333' }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-5 h-5 rounded-full"
                          style={{ border: '2px solid #FF6F6140' }}
                        />
                        <div>
                          <div className="text-[12px] font-semibold text-white">Tirzepatide</div>
                          <div className="text-[10px] text-[#6B7280]">2 mg</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-[#FF6F61]">SAT 8 AM</div>
                        <div className="text-[9px] text-[#6B7280]">Dec 7</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Single dose upcoming</p>
              </div>

              {/* No doses */}
              <div className="space-y-1.5">
                <div 
                  className="w-[329px] h-[155px] rounded-[22px] p-3 flex flex-col"
                  style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain" />
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-[12px] text-[#6B7280]">All caught up!</div>
                    <div className="text-[10px] text-[#52525b] mt-1">No doses scheduled this week</div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Empty state</p>
              </div>
            </div>
          </div>

          {/* Large Widget - Option A: Estimated Levels */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Large Widget — Option A: Estimated Levels</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              User selects which compound to display in widget settings. Matches in-app chart style.
            </p>
            
            <div 
              className="w-[329px] h-[329px] rounded-[22px] p-4 flex flex-col"
              style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain" />
                <span className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Levels</span>
              </div>
              
              {/* Compound name */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF6F61]" />
                  <span className="text-sm font-semibold text-white">Tirzepatide</span>
                </div>
                <span className="text-xs text-[#9CA3AF]">2 mg • Weekly</span>
              </div>
              
              {/* Stats row */}
              <div className="flex gap-3 mb-3">
                <div 
                  className="flex-1 rounded-xl p-2.5"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}
                >
                  <div className="text-[9px] text-[#6B7280] mb-0.5">Est. Level</div>
                  <div className="text-lg font-bold text-[#FF6F61]">~1.97 mg</div>
                  <div className="text-[9px] text-[#6B7280]">in system</div>
                </div>
                <div 
                  className="flex-1 rounded-xl p-2.5"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}
                >
                  <div className="text-[9px] text-[#6B7280] mb-0.5">Next Dose</div>
                  <div className="text-lg font-bold text-white">MON</div>
                  <div className="text-[9px] text-[#6B7280]">Dec 9 • 8 AM</div>
                </div>
              </div>
              
              {/* Chart area */}
              <div className="flex-1 relative">
                <div className="absolute inset-0">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 text-[8px] text-[#52525b]">100%</div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[8px] text-[#52525b]">50%</div>
                  <div className="absolute left-0 bottom-4 text-[8px] text-[#52525b]">0%</div>
                  
                  {/* Chart SVG */}
                  <svg className="w-full h-full" viewBox="0 0 280 120" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="20" y1="20" x2="280" y2="20" stroke="#262626" strokeWidth="0.5" />
                    <line x1="20" y1="60" x2="280" y2="60" stroke="#262626" strokeWidth="0.5" />
                    <line x1="20" y1="100" x2="280" y2="100" stroke="#262626" strokeWidth="0.5" />
                    
                    {/* Gradient fill */}
                    <defs>
                      <linearGradient id="levelGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6F61" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#FF6F61" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    
                    {/* Fill area */}
                    <path
                      d="M 30 100 L 30 25 L 70 75 L 70 25 L 110 75 L 110 25 L 150 75 L 150 25 L 190 75 L 190 25 L 230 70 L 230 100 Z"
                      fill="url(#levelGradient)"
                    />
                    
                    {/* Line - solid for current, dashed for projected */}
                    <path
                      d="M 30 25 L 70 75 L 70 25 L 110 75 L 110 25 L 150 75 L 150 25 L 190 75"
                      fill="none"
                      stroke="#FF6F61"
                      strokeWidth="2"
                    />
                    <path
                      d="M 190 75 L 190 25 L 230 70"
                      fill="none"
                      stroke="#FF6F61"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                </div>
              </div>
              
              {/* X-axis dates */}
              <div className="flex justify-between mt-1 px-2">
                <span className="text-[8px] text-[#52525b]">Nov 4</span>
                <span className="text-[8px] text-[#52525b]">Nov 17</span>
                <span className="text-[8px] text-[#52525b]">Dec 1</span>
                <span className="text-[8px] text-[#52525b]">Dec 15</span>
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-[#FF6F61]" />
                  <span className="text-[8px] text-[#6B7280]">Current</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-[#FF6F61]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #FF6F61 0, #FF6F61 2px, transparent 2px, transparent 4px)' }} />
                  <span className="text-[8px] text-[#6B7280]">Projected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Large Widget - Option B: Upcoming Schedule */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Large Widget — Option B: Upcoming Schedule</h3>
            </div>
            <p className="text-xs text-muted-foreground">Shows all upcoming doses across all compounds (users choose which widget option in settings)</p>
            
            <div 
              className="w-[329px] h-[329px] rounded-[22px] p-4 flex flex-col"
              style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <img src={wordmarkLogo} alt="Regimen" className="h-3.5 object-contain" />
                <span className="text-[10px] text-[#FF6F61]">Next 7 days</span>
              </div>
              
              {/* Schedule list */}
              <div className="flex-1 space-y-2 overflow-hidden">
                {/* Today */}
                <div 
                  className="rounded-xl p-2.5 flex items-center justify-between"
                  style={{ backgroundColor: '#FF6F6110', border: '1px solid #FF6F6130' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#FF6F61]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white">BPC-157</div>
                      <div className="text-[9px] text-[#6B7280]">2 mg</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-[#FF6F61]">Today</div>
                    <div className="text-[9px] text-[#6B7280]">9:00 PM</div>
                  </div>
                </div>
                
                {/* Tomorrow */}
                <div 
                  className="rounded-xl p-2.5 flex items-center justify-between"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#FF6F61]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white">Test Cypionate</div>
                      <div className="text-[9px] text-[#6B7280]">100 mg • 0.35ml</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-white">TUE 8 AM</div>
                  </div>
                </div>
                
                {/* Day after */}
                <div 
                  className="rounded-xl p-2.5 flex items-center justify-between"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#FF6F61]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white">NAD+</div>
                      <div className="text-[9px] text-[#6B7280]">50 mg</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-white">FRI 8 AM</div>
                  </div>
                </div>
                
                {/* Another */}
                <div 
                  className="rounded-xl p-2.5 flex items-center justify-between"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#FF6F61]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white">Tirzepatide</div>
                      <div className="text-[9px] text-[#6B7280]">2 mg</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-white">MON 8 AM</div>
                    <div className="text-[9px] text-[#6B7280]">Dec 9</div>
                  </div>
                </div>
                
                {/* Another */}
                <div 
                  className="rounded-xl p-2.5 flex items-center justify-between"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#FF6F61]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white">Test Cypionate</div>
                      <div className="text-[9px] text-[#6B7280]">100 mg</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-white">THU 8 AM</div>
                    <div className="text-[9px] text-[#6B7280]">Dec 12</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOCK SCREEN WIDGETS */}
        <section className="space-y-6 pt-6 border-t border-border">
          <h2 className="text-lg font-bold text-primary">Lock Screen Widgets</h2>
          <p className="text-xs text-muted-foreground -mt-4">iOS renders these in monochrome, tinted to user's wallpaper color. Please provide a white monochrome version of your icon for these widgets.</p>
          
          {/* Circular Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Circular Widget — Next Dose</h3>
            </div>
            <p className="text-xs text-muted-foreground">Limited space - can show time + abbreviated medication name</p>
            
            <div className="flex gap-4 flex-wrap">
              {/* Today */}
              <div className="space-y-1.5">
                <div 
                  className="w-[50px] h-[50px] rounded-full flex flex-col items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <MonochromeIcon className="w-3.5 h-3.5 mb-0.5" />
                  <span className="text-[8px] text-white font-semibold">6 PM</span>
                  <span className="text-[6px] text-white/60">Tirz</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Today</p>
              </div>
              
              {/* Tomorrow */}
              <div className="space-y-1.5">
                <div 
                  className="w-[50px] h-[50px] rounded-full flex flex-col items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-[7px] text-white/70 uppercase">TUE</span>
                  <span className="text-[9px] text-white font-bold">8 AM</span>
                  <span className="text-[6px] text-white/60">Test C</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Tomorrow</p>
              </div>

              {/* Days away */}
              <div className="space-y-1.5">
                <div 
                  className="w-[50px] h-[50px] rounded-full flex flex-col items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-[7px] text-white/70 uppercase">MON</span>
                  <span className="text-[9px] text-white font-bold">8 AM</span>
                  <span className="text-[6px] text-white/60">Sema</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Days away</p>
              </div>
            </div>
          </div>

          {/* Rectangular Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Rectangular Widget — Schedule</h3>
            </div>
            
            <div className="flex gap-4 flex-wrap">
              {/* Single dose with REGIMEN text */}
              <div className="space-y-1.5">
                <div 
                  className="w-[158px] h-[50px] rounded-2xl px-2.5 py-1.5 flex flex-col"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-[7px] text-white/50 font-bold tracking-wider">REGIMEN</span>
                  <div className="flex-1 flex items-center gap-1.5">
                    <MonochromeIcon className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white font-semibold truncate">Tirzepatide</span>
                        <span className="text-[8px] text-white/70">2mg</span>
                      </div>
                      <div className="text-[8px] text-white/60">MON 8 AM</div>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">With branding</p>
              </div>
              
              {/* Two medications with REGIMEN */}
              <div className="space-y-1.5">
                <div 
                  className="w-[158px] h-[50px] rounded-2xl px-2.5 py-1 flex flex-col"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-[7px] text-white/50 font-bold tracking-wider">REGIMEN</span>
                  <div className="flex-1 space-y-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-white font-medium">Test Cyp</span>
                      <span className="text-[7px] text-white/60">TUE 8AM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-white font-medium">Tirz</span>
                      <span className="text-[7px] text-white/60">FRI 8AM</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Multiple doses</p>
              </div>

              {/* Today's dose with REGIMEN */}
              <div className="space-y-1.5">
                <div 
                  className="w-[158px] h-[50px] rounded-2xl px-2.5 py-1.5 flex flex-col"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-[7px] text-white/50 font-bold tracking-wider">REGIMEN</span>
                  <div className="flex-1 flex items-center gap-1.5">
                    <MonochromeIcon className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white font-semibold truncate">BPC-157</span>
                        <span className="text-[8px] text-white/70">2mg</span>
                      </div>
                      <div className="text-[8px] text-white/60">Today 9 PM</div>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Today</p>
              </div>
            </div>
          </div>

          {/* Inline Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Inline Widget — Next Dose</h3>
            </div>
            
            <div className="flex gap-4 flex-wrap">
              {/* Today */}
              <div className="space-y-1.5">
                <div 
                  className="h-[22px] px-2 rounded-full flex items-center gap-1.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <MonochromeIcon className="w-3 h-3" />
                  <span className="text-[11px] text-white font-medium">Tirz • 6 PM</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Today</p>
              </div>
              
              {/* Tomorrow */}
              <div className="space-y-1.5">
                <div 
                  className="h-[22px] px-2 rounded-full flex items-center gap-1.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <MonochromeIcon className="w-3 h-3" />
                  <span className="text-[11px] text-white font-medium">Test • TUE 8 AM</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Tomorrow</p>
              </div>

              {/* Days away */}
              <div className="space-y-1.5">
                <div 
                  className="h-[22px] px-2 rounded-full flex items-center gap-1.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <MonochromeIcon className="w-3 h-3" />
                  <span className="text-[11px] text-white font-medium">Sema • MON 8 AM</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Days away</p>
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Implementation Notes</h3>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li>• <strong>Small widget:</strong> Tapping opens the app (iOS doesn't support interactivity in small widgets)</li>
            <li>• <strong>Medium/Large widgets:</strong> Can have interactive checkboxes to mark doses as taken directly</li>
            <li>• <strong>Time display:</strong> Shows "2h 15m" if today, "TUE 8 AM" if tomorrow/soon, "MON 8 AM • Dec 9" if further</li>
            <li>• <strong>Large widget:</strong> User chooses in widget settings: Estimated Levels OR Upcoming Schedule</li>
            <li>• <strong>Levels widget:</strong> User selects which compound to track in widget configuration</li>
            <li>• <strong>Missed doses:</strong> Only shows medications from current time forward — missed doses are not shown</li>
            <li>• <strong>Lock screen:</strong> iOS automatically applies monochrome tint — please provide white icon asset</li>
            <li>• <strong>Widget options:</strong> Yes, you can offer multiple widget options per size — users pick in widget gallery</li>
            <li>• <strong>Both themes:</strong> Widgets support light and dark mode automatically</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default WidgetPreview;
