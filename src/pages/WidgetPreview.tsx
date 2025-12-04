import { ArrowLeft, Check, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import appIcon from '@/assets/app-icon-1024.png';
import horizontalLogo from '@/assets/regimen-horizontal-transparent.png';

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
              Tap to mark as taken (iOS 17+). Shows day/time if not today.
            </p>
            
            <div className="flex gap-4 flex-wrap">
              {/* Today - hours away */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-3 flex flex-col justify-between"
                  style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
                >
                  <div className="flex items-center justify-between">
                    <img src={appIcon} alt="Regimen" className="w-7 h-7" />
                    <span className="text-[9px] font-medium text-[#FF6F61] uppercase tracking-wider">Next Dose</span>
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="text-[28px] font-bold text-white leading-none">2h 15m</div>
                    <div className="text-[11px] text-[#9CA3AF]">Today at 6:00 PM</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-white">Tirzepatide</div>
                      <div className="text-[10px] text-[#6B7280]">2 mg</div>
                    </div>
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ border: '2px solid #FF6F61' }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF6F61]/30" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Today (tappable)</p>
              </div>
              
              {/* Tomorrow */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-3 flex flex-col justify-between"
                  style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
                >
                  <div className="flex items-center justify-between">
                    <img src={appIcon} alt="Regimen" className="w-7 h-7" />
                    <span className="text-[9px] font-medium text-[#FF6F61] uppercase tracking-wider">Next Dose</span>
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="text-[22px] font-bold text-white leading-tight">Tomorrow</div>
                    <div className="text-[13px] text-[#9CA3AF]">8:00 AM</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-white">Test Cyp</div>
                      <div className="text-[10px] text-[#6B7280]">100 mg • 0.35ml</div>
                    </div>
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ border: '2px solid #3f3f46' }}
                    />
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
                  <div className="flex items-center justify-between">
                    <img src={appIcon} alt="Regimen" className="w-7 h-7" />
                    <span className="text-[9px] font-medium text-[#FF6F61] uppercase tracking-wider">Next Dose</span>
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="text-[20px] font-bold text-white leading-tight">Monday</div>
                    <div className="text-[13px] text-[#9CA3AF]">Dec 9 • 8:00 AM</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-white">Semaglutide</div>
                      <div className="text-[10px] text-[#6B7280]">0.5 mg</div>
                    </div>
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ border: '2px solid #3f3f46' }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Days away</p>
              </div>

              {/* Light mode variant */}
              <div className="space-y-1.5">
                <div 
                  className="w-[155px] h-[155px] rounded-[22px] p-3 flex flex-col justify-between"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5' }}
                >
                  <div className="flex items-center justify-between">
                    <img src={appIcon} alt="Regimen" className="w-7 h-7" />
                    <span className="text-[9px] font-medium text-[#FF6F61] uppercase tracking-wider">Next Dose</span>
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="text-[28px] font-bold text-[#0F0F0F] leading-none">2h 15m</div>
                    <div className="text-[11px] text-[#6B7280]">Today at 6:00 PM</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-[#0F0F0F]">Tirzepatide</div>
                      <div className="text-[10px] text-[#9CA3AF]">2 mg</div>
                    </div>
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ border: '2px solid #FF6F61' }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF6F61]/30" />
                    </div>
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
              <h3 className="font-semibold text-sm">Medium Widget — Today's Doses</h3>
            </div>
            <p className="text-xs text-muted-foreground">Interactive — tap to mark doses as taken</p>
            
            <div 
              className="w-[329px] h-[155px] rounded-[22px] p-3 flex flex-col"
              style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img src={appIcon} alt="Regimen" className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Today's Doses</span>
                </div>
                <span className="text-[10px] font-medium text-[#10B981]">2 of 4 taken</span>
              </div>
              
              <div className="flex-1 grid grid-cols-4 gap-2">
                {/* Taken */}
                <div 
                  className="rounded-xl p-2 flex flex-col justify-between"
                  style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-[#6B7280]">8 AM</span>
                    <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-white truncate">NAD+</div>
                    <div className="text-[8px] text-[#6B7280]">50mg</div>
                  </div>
                </div>
                
                {/* Taken */}
                <div 
                  className="rounded-xl p-2 flex flex-col justify-between"
                  style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-[#6B7280]">8 AM</span>
                    <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-white truncate">BPC-157</div>
                    <div className="text-[8px] text-[#6B7280]">2mg</div>
                  </div>
                </div>
                
                {/* Pending */}
                <div 
                  className="rounded-xl p-2 flex flex-col justify-between"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #333333' }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-[#FF6F61]">9 PM</span>
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ border: '2px solid #FF6F6140' }}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-white truncate">BPC-157</div>
                    <div className="text-[8px] text-[#6B7280]">2mg</div>
                  </div>
                </div>
                
                {/* Pending */}
                <div 
                  className="rounded-xl p-2 flex flex-col justify-between"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #333333' }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-[#FF6F61]">9 PM</span>
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ border: '2px solid #FF6F6140' }}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-white truncate">NAD+</div>
                    <div className="text-[8px] text-[#6B7280]">50mg</div>
                  </div>
                </div>
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
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <img src={appIcon} alt="Regimen" className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Estimated Levels</span>
                </div>
              </div>
              
              {/* Compound name and status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF6F61]" />
                  <span className="text-sm font-semibold text-white">Tirzepatide</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FF6F61]/20 text-[#FF6F61]">LEVELS</span>
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
                  <div className="text-lg font-bold text-white">Mon, Dec 8</div>
                  <div className="text-[9px] text-[#6B7280]">8:00 AM</div>
                </div>
              </div>
              
              {/* Chart area - matching app style */}
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
                    
                    {/* Sawtooth pattern with gradient fill - matching app */}
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
            <p className="text-xs text-muted-foreground">Shows all upcoming doses across all compounds</p>
            
            <div 
              className="w-[329px] h-[329px] rounded-[22px] p-4 flex flex-col"
              style={{ backgroundColor: '#0F0F0F', border: '1px solid #262626' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src={appIcon} alt="Regimen" className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Upcoming</span>
                </div>
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
                    <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white">Test Cyp</div>
                      <div className="text-[9px] text-[#6B7280]">100 mg • 0.35ml</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-white">Tomorrow</div>
                    <div className="text-[9px] text-[#6B7280]">8:00 AM</div>
                  </div>
                </div>
                
                {/* Day after */}
                <div 
                  className="rounded-xl p-2.5 flex items-center justify-between"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white">NAD+</div>
                      <div className="text-[9px] text-[#6B7280]">50 mg</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-white">Friday</div>
                    <div className="text-[9px] text-[#6B7280]">8:00 AM</div>
                  </div>
                </div>
                
                {/* Another */}
                <div 
                  className="rounded-xl p-2.5 flex items-center justify-between"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white">Tirzepatide</div>
                      <div className="text-[9px] text-[#6B7280]">2 mg</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-white">Monday</div>
                    <div className="text-[9px] text-[#6B7280]">Dec 9 • 8 AM</div>
                  </div>
                </div>
                
                {/* Another */}
                <div 
                  className="rounded-xl p-2.5 flex items-center justify-between"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #262626' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                    <div>
                      <div className="text-[11px] font-semibold text-white">Test Cyp</div>
                      <div className="text-[9px] text-[#6B7280]">100 mg</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-white">Thursday</div>
                    <div className="text-[9px] text-[#6B7280]">Dec 12 • 8 AM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOCK SCREEN WIDGETS */}
        <section className="space-y-6 pt-6 border-t border-border">
          <h2 className="text-lg font-bold text-primary">Lock Screen Widgets</h2>
          <p className="text-xs text-muted-foreground -mt-4">iOS renders these in monochrome, tinted to user's color</p>
          
          {/* Circular Widget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-semibold text-sm">Circular Widget — Next Dose</h3>
            </div>
            
            <div className="flex gap-4 flex-wrap">
              {/* With icon and time today */}
              <div className="space-y-1.5">
                <div 
                  className="w-[50px] h-[50px] rounded-full flex flex-col items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  {/* Monochrome icon representation */}
                  <div className="w-4 h-4 mb-0.5 opacity-80">
                    <svg viewBox="0 0 24 24" fill="white">
                      <path d="M12 2L8 6H4V10L2 12L4 14V18H8L12 22L16 18H20V14L22 12L20 10V6H16L12 2Z" opacity="0.3"/>
                      <path d="M12 5L9 8H6V11L4 13L6 15V18H9L12 21L15 18H18V15L20 13L18 11V8H15L12 5Z"/>
                    </svg>
                  </div>
                  <span className="text-[8px] text-white font-semibold">2h</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Today</p>
              </div>
              
              {/* With medication name and day */}
              <div className="space-y-1.5">
                <div 
                  className="w-[50px] h-[50px] rounded-full flex flex-col items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-[7px] text-white/70 uppercase">Mon</span>
                  <span className="text-[9px] text-white font-bold">8 AM</span>
                  <span className="text-[6px] text-white/60 truncate max-w-[40px]">Tirz</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Other day</p>
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
              {/* Multiple medications with icon */}
              <div className="space-y-1.5">
                <div 
                  className="w-[158px] h-[50px] rounded-2xl px-3 flex items-center gap-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  {/* Monochrome app icon */}
                  <div className="w-7 h-7 opacity-80">
                    <svg viewBox="0 0 100 100" fill="white">
                      <path d="M50 10 L80 30 L80 50 L50 70 L20 50 L20 30 Z" opacity="0.2"/>
                      <path d="M50 25 L70 38 L70 52 L50 65 L30 52 L30 38 Z" opacity="0.4"/>
                      <path d="M50 40 L60 47 L60 57 L50 64 L40 57 L40 47 Z" opacity="0.7"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white font-semibold truncate">Tirzepatide</span>
                      <span className="text-[9px] text-white/70">2mg</span>
                    </div>
                    <div className="text-[9px] text-white/60">Mon, 8 AM</div>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Single dose</p>
              </div>
              
              {/* Two medications */}
              <div className="space-y-1.5">
                <div 
                  className="w-[158px] h-[50px] rounded-2xl px-2.5 flex items-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white font-medium">Test Cyp</span>
                      <span className="text-[8px] text-white/60">Tomorrow 8AM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white font-medium">Tirz</span>
                      <span className="text-[8px] text-white/60">Mon 8AM</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Multiple doses</p>
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
                  <div className="w-3 h-3 opacity-80">
                    <svg viewBox="0 0 24 24" fill="white">
                      <path d="M12 2L8 6H4V10L2 12L4 14V18H8L12 22L16 18H20V14L22 12L20 10V6H16L12 2Z" opacity="0.3"/>
                      <path d="M12 5L9 8H6V11L4 13L6 15V18H9L12 21L15 18H18V15L20 13L18 11V8H15L12 5Z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-white font-medium">Tirz • 6 PM</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Today</p>
              </div>
              
              {/* Other day */}
              <div className="space-y-1.5">
                <div 
                  className="h-[22px] px-2 rounded-full flex items-center gap-1.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="w-3 h-3 opacity-80">
                    <svg viewBox="0 0 24 24" fill="white">
                      <path d="M12 2L8 6H4V10L2 12L4 14V18H8L12 22L16 18H20V14L22 12L20 10V6H16L12 2Z" opacity="0.3"/>
                      <path d="M12 5L9 8H6V11L4 13L6 15V18H9L12 21L15 18H18V15L20 13L18 11V8H15L12 5Z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] text-white font-medium">Test Cyp • Mon 8 AM</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center">Other day</p>
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Implementation Notes</h3>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li>• <strong>Small widget:</strong> Interactive on iOS 17+ — tap the circle to mark dose as taken</li>
            <li>• <strong>Time display:</strong> Shows "2h 15m" if today, "Tomorrow 8 AM" if tomorrow, "Mon, Dec 9 • 8 AM" if further</li>
            <li>• <strong>Large widget:</strong> User chooses in widget settings: Estimated Levels OR Upcoming Schedule</li>
            <li>• <strong>Levels widget:</strong> User selects which compound to track in widget configuration</li>
            <li>• <strong>Lock screen:</strong> iOS automatically applies monochrome tint based on user's wallpaper</li>
            <li>• <strong>Both themes:</strong> Widgets support light and dark mode automatically</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default WidgetPreview;
