/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  Info, 
  MessageCircle, 
  User, 
  Zap,
  Clock,
  ChevronLeft,
  Check,
  CalendarDays,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type SlotStatus = 'available' | 'booked' | 'selected';

interface TimeSlot {
  id: string;
  time: string;
  status: SlotStatus;
  isPeak: boolean;
}

interface CourtInfo {
  name: string;
  surface: string;
  pricingType: 'tiered' | 'fixed';
  fixedPrice?: number;
  offPeakPrice?: number;
  peakPrice?: number;
  offPeakHours?: string;
  peakHours?: string;
}

// --- Mock Data Generation ---

const generateSlots = (): TimeSlot[] => {
  const hours = [
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
    '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
    '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
    '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM',
    '03:00 AM', '03:30 AM', '04:00 AM'
  ];
  
  return hours.map((time, index) => {
    // Peak hours: 5:00 PM onwards
    const isPeak = index >= 10; 
    return {
      id: `slot-${index}`,
      time,
      status: Math.random() > 0.85 ? 'booked' : 'available',
      isPeak,
    };
  });
};

// --- Components ---

const CourtDetailsCard = ({ court }: { court: CourtInfo }) => {
  return (
    <div className="px-6 mb-8">
      <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-600 group-hover:text-[#2DD4BF] transition-colors">
            <Info size={20} />
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-3xl font-black text-white tracking-tighter mb-1">{court.name}</h2>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">{court.surface}</p>
        </div>

        {court.pricingType === 'tiered' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Off-Peak</div>
                <div className="text-lg font-black text-white tracking-tighter leading-none mb-1">PKR {court.offPeakPrice?.toLocaleString()}/HR</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{court.offPeakHours}</div>
              </div>
            </div>

            <div className="flex items-start gap-4 border-l border-white/5 pl-0 sm:pl-6">
              <div className="w-10 h-10 rounded-2xl bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black text-[#2DD4BF] uppercase tracking-widest mb-1">Peak Hours</div>
                <div className="text-lg font-black text-white tracking-tighter leading-none mb-1">PKR {court.peakPrice?.toLocaleString()}/HR</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{court.peakHours}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shrink-0">
              <Zap size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Fixed Rate</div>
              <div className="text-2xl font-black text-white tracking-tighter leading-none mb-1">PKR {court.fixedPrice?.toLocaleString()}/HR</div>
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Standard Pricing All Day</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [selectedSport, setSelectedSport] = useState('Futsal');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const slots = useMemo(() => generateSlots(), [selectedSport, selectedDate]);
  const sports = ['Padel', 'Pickleball', 'Futsal'];

  const courts: Record<string, CourtInfo> = {
    'Futsal': {
      name: 'COURT 01',
      surface: 'Premium Synthetic Surface',
      pricingType: 'tiered',
      offPeakPrice: 4000,
      peakPrice: 6000,
      offPeakHours: '12:00 PM - 05:00 PM',
      peakHours: '05:00 PM - 04:00 AM'
    },
    'Padel': {
      name: 'PADEL ARENA',
      surface: 'Panoramic Glass Court',
      pricingType: 'fixed',
      fixedPrice: 5000
    },
    'Pickleball': {
      name: 'PICKLE ZONE',
      surface: 'Professional Hard Court',
      pricingType: 'tiered',
      offPeakPrice: 3000,
      peakPrice: 4500,
      offPeakHours: '12:00 PM - 04:00 PM',
      peakHours: '04:00 PM - 12:00 AM'
    }
  };

  const activeCourt = courts[selectedSport] || courts['Futsal'];

  const toggleSlot = (slotId: string, status: SlotStatus) => {
    if (status === 'booked') return;
    setSelectedSlots(prev => 
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    );
  };

  const totalCalculation = useMemo(() => {
    return selectedSlots.reduce((acc, slotId) => {
      const slot = slots.find(s => s.id === slotId);
      if (!slot) return acc;
      
      if (activeCourt.pricingType === 'tiered') {
        const price = slot.isPeak ? (activeCourt.peakPrice || 0) : (activeCourt.offPeakPrice || 0);
        return acc + price / 2;
      } else {
        return acc + (activeCourt.fixedPrice || 0) / 2;
      }
    }, 0);
  }, [selectedSlots, slots, activeCourt]);

  // Calendar helper
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const days = [];
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
    
    return days;
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-mono selection:bg-[#2DD4BF]/30 overflow-x-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-6 h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2DD4BF] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.3)]">
              <Zap size={18} className="text-black" />
            </div>
            <span className="text-lg font-black tracking-tighter text-white">IBEX</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-500 hover:text-[#2DD4BF] transition-colors">
              <User size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className={`transition-all duration-500 w-full ${selectedSlots.length > 0 ? 'pb-[26rem]' : 'pb-32'}`}>
        {/* Hero Section */}
        <div className="px-6 pt-10 mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black tracking-tighter text-white mb-2 leading-none"
          >
            RESERVE<br />YOUR SPOT.
          </motion.h1>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">Premium Court Booking System</p>
        </div>

        {/* Sport Selector */}
        <div className="px-6 mb-8 overflow-x-auto no-scrollbar flex gap-3">
          {sports.map(sport => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`flex-none px-8 py-3 rounded-full text-xs font-black border transition-all ${
                selectedSport === sport 
                  ? 'bg-[#2DD4BF] border-[#2DD4BF] text-black shadow-[0_0_20px_rgba(45,212,191,0.2)]' 
                  : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/20'
              }`}
            >
              {sport.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Date Selector Trigger */}
        <div className="px-6 mb-8">
          <button 
            onClick={() => setIsDatePickerOpen(true)}
            className="w-full bg-zinc-900/40 border border-white/5 rounded-3xl p-6 flex items-center justify-between hover:border-[#2DD4BF]/30 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-[#2DD4BF]/10 rounded-2xl flex items-center justify-center text-[#2DD4BF] group-hover:bg-[#2DD4BF] group-hover:text-black transition-all">
                <CalendarDays size={28} />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Active Date</div>
                <div className="text-xl font-black text-white tracking-tighter">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                </div>
              </div>
            </div>
            <ChevronRight size={24} className="text-zinc-800 group-hover:text-[#2DD4BF] transition-all" />
          </button>
        </div>

        {/* Dynamic Court Details Card */}
        <CourtDetailsCard court={activeCourt} />

        {/* Legend */}
        <div className="px-6 mb-6 flex flex-wrap gap-6 text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-800" />
            Available
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
            Selected
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-900/40 border border-rose-500/20" />
            Occupied
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
            Peak Slot
          </div>
        </div>

        {/* Timeline Grid - Reverting to the 2-column "Awesome" Layout */}
        <div className="px-6 grid grid-cols-2 gap-4">
          {slots.map((slot) => {
            const isSelected = selectedSlots.includes(slot.id);
            const isBooked = slot.status === 'booked';
            
            return (
              <button
                key={slot.id}
                onClick={() => toggleSlot(slot.id, slot.status)}
                disabled={isBooked}
                className={`
                  relative h-28 rounded-3xl border transition-all duration-300 flex flex-col items-start justify-between p-5 overflow-hidden
                  ${isBooked 
                    ? 'bg-zinc-900/20 border-white/5 opacity-50 cursor-not-allowed' 
                    : isSelected
                      ? 'bg-[#2DD4BF] border-[#2DD4BF] text-black scale-[0.98] shadow-[0_10px_30px_rgba(45,212,191,0.2)]'
                      : 'bg-zinc-900/40 border-white/10 hover:border-white/20 active:scale-95'
                  }
                `}
              >
                {/* Booked Pattern Overlay */}
                {isBooked && (
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #fff 10px, #fff 11px)' }} />
                )}

                <div className="flex justify-between w-full items-start">
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${isSelected ? 'text-black/60' : 'text-zinc-700'}`}>
                    {slot.time.split(' ')[1]}
                  </span>
                  {isSelected && <Check size={16} className="text-black" />}
                  {slot.isPeak && !isSelected && !isBooked && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                  )}
                </div>

                <div className="flex flex-col items-start">
                  <span className={`text-2xl font-black leading-none mb-1 tracking-tighter ${isSelected ? 'text-black' : 'text-white'}`}>
                    {slot.time.split(' ')[0]}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-black/40' : isBooked ? 'text-rose-500/50' : 'text-zinc-700'}`}>
                    {isBooked ? 'OCCUPIED' : isSelected ? 'READY' : 'SELECT'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Date Picker Modal */}
      <AnimatePresence>
        {isDatePickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDatePickerOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-900 rounded-[3rem] border border-white/10 p-8 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Select Date</h3>
                <button 
                  onClick={() => setIsDatePickerOpen(false)}
                  className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                  <div key={d} className="text-center text-[10px] font-black text-zinc-700 py-2">{d}</div>
                ))}
                {calendarDays.map((date, i) => (
                  <button
                    key={i}
                    disabled={!date}
                    onClick={() => {
                      if (date) {
                        setSelectedDate(date);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    className={`
                      h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-all
                      ${!date ? 'opacity-0 pointer-events-none' : ''}
                      ${date?.toDateString() === selectedDate.toDateString() 
                        ? 'bg-[#2DD4BF] text-black shadow-[0_0_20px_rgba(45,212,191,0.4)]' 
                        : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    {date?.getDate()}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Bar */}
      <AnimatePresence>
        {selectedSlots.length > 0 && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[60] p-6"
          >
            <div className="w-full max-w-7xl mx-auto bg-white rounded-[3.5rem] p-8 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] text-black border border-black/5">
              {/* Expanded Info Section */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Sport & Date</div>
                    <div className="text-sm font-black tracking-tight">{selectedSport.toUpperCase()} • {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Duration</div>
                  <div className="text-sm font-black tracking-tight">{selectedSlots.length * 30} MINS</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Reservation</div>
                  <div className="text-3xl font-black tracking-tighter leading-none">
                    {selectedSlots.length} <span className="text-zinc-300">SLOTS</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Total</div>
                  <div className="text-3xl font-black tracking-tighter leading-none">
                    PKR {totalCalculation.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Validation Message */}
              {selectedSlots.length < 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-rose-50 rounded-2xl flex items-center gap-3 text-rose-600"
                >
                  <Info size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Minimum 2 slots (60 mins) required</span>
                </motion.div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedSlots([])}
                  className="w-16 h-16 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black transition-colors"
                >
                  <ChevronLeft size={28} />
                </button>
                <button 
                  disabled={selectedSlots.length < 2}
                  className={`flex-1 h-16 rounded-full font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 ${
                    selectedSlots.length < 2 
                      ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed' 
                      : 'bg-black text-white hover:bg-zinc-800 shadow-xl'
                  }`}
                >
                  {selectedSlots.length < 2 ? 'SELECT MORE SLOTS' : 'CONFIRM BOOKING'}
                  <ChevronRight size={20} className={selectedSlots.length < 2 ? 'text-zinc-200' : 'text-[#2DD4BF]'} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl z-50 active:scale-90 transition-transform">
        <MessageCircle size={28} fill="white" className="text-white" />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
