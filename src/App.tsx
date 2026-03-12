/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plane, MapPin, Search, Calendar, Users, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';

const CITIES = [
  'London, United Kingdom',
  'Paris, France',
  'New York, USA',
  'Tokyo, Japan',
  'Dubai, UAE',
  'Singapore, Singapore',
  'Barcelona, Spain',
  'Madrid, Spain',
  'Valencia, Spain',
  'Seville, Spain',
  'Zaragoza, Spain',
  'Malaga, Spain',
  'Palma, Spain',
  'Rome, Italy',
  'Milan, Italy',
  'Venice, Italy',
  'Florence, Italy',
  'Naples, Italy',
  'Turin, Italy',
  'Berlin, Germany',
  'Sydney, Australia',
  'Amsterdam, Netherlands',
  'Los Angeles, USA',
  'San Francisco, USA',
  'Chicago, USA',
  'Toronto, Canada',
  'Vancouver, Canada',
  'Istanbul, Turkey',
  'Bangkok, Thailand',
  'Seoul, South Korea',
  'Hong Kong, China'
];

export default function App() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideFrom = fromRef.current && !fromRef.current.contains(event.target as Node);
      const isOutsideTo = toRef.current && !toRef.current.contains(event.target as Node);
      const isOutsideDatePicker = datePickerRef.current && !datePickerRef.current.contains(event.target as Node);
      
      if (isOutsideFrom && isOutsideTo && isOutsideDatePicker) {
        setActiveField(null);
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCityChange = (value: string, field: 'from' | 'to') => {
    if (field === 'from') setFrom(value);
    else setTo(value);

    if (value.length > 2) {
      const filtered = CITIES.filter(city => 
        city.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setActiveField(filtered.length > 0 ? field : null);
    } else {
      setActiveField(null);
    }
  };

  const selectSuggestion = (city: string) => {
    if (activeField === 'from') setFrom(city);
    else if (activeField === 'to') setTo(city);
    setActiveField(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for flights from:', from, 'to:', to);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-slate-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Plane className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">SkyBound</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-indigo-600 transition-colors">Discover</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">My Bookings</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Support</a>
        </div>
        <button className="px-5 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-all">
          Sign In
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
            Where to <span className="text-indigo-600 italic">next?</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Explore the world with SkyBound. Book your next adventure with ease and comfort.
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-10"
        >
          <form onSubmit={handleSearch} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* From Field */}
              <div className="relative group" ref={fromRef}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 ml-1">
                  From
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Departure City"
                    value={from}
                    onChange={(e) => handleCityChange(e.target.value, 'from')}
                    onFocus={() => from.length > 2 && suggestions.length > 0 && setActiveField('from')}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-slate-800 placeholder:text-slate-400"
                    required
                  />
                </div>

                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                  {activeField === 'from' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                    >
                      {suggestions.map((city, index) => (
                        <div
                          key={index}
                          onClick={() => selectSuggestion(city)}
                          className="px-6 py-4 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-none transition-colors"
                        >
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">{city}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Swap Button (Visual only for now) */}
              <div className="hidden lg:flex items-end pb-4 justify-center">
                <button 
                  type="button"
                  className="p-2 rounded-full bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {/* To Field */}
              <div className="relative group" ref={toRef}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 ml-1">
                  To
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Arrival City"
                    value={to}
                    onChange={(e) => handleCityChange(e.target.value, 'to')}
                    onFocus={() => to.length > 2 && suggestions.length > 0 && setActiveField('to')}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-slate-800 placeholder:text-slate-400"
                    required
                  />
                </div>

                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                  {activeField === 'to' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                    >
                      {suggestions.map((city, index) => (
                        <div
                          key={index}
                          onClick={() => selectSuggestion(city)}
                          className="px-6 py-4 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-none transition-colors"
                        >
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">{city}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
                >
                  <Search className="w-5 h-5" />
                  Search Flights
                </button>
              </div>
            </div>

            {/* Extra Options */}
            <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-100">
              <div className="relative" ref={datePickerRef}>
                <div 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition-all cursor-pointer ${
                    selectedDate 
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-medium' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>{selectedDate ? format(selectedDate, 'PPP') : 'Select Dates'}</span>
                </div>

                <AnimatePresence>
                  {showDatePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-4 left-0 z-50 bg-white p-4 rounded-3xl shadow-2xl border border-slate-100"
                    >
                      <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setShowDatePicker(false);
                        }}
                        modifiersClassNames={{
                          selected: 'bg-indigo-600 text-white rounded-lg',
                          today: 'text-indigo-600 font-bold underline'
                        }}
                        styles={{
                          caption: { color: '#4f46e5' },
                          head_cell: { color: '#94a3b8', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' },
                          day: { borderRadius: '8px', transition: 'all 0.2s' }
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <Users className="w-4 h-4" />
                <span>1 Passenger, Economy</span>
              </div>
            </div>
          </form>
        </motion.div>

        {/* Featured Destinations */}
        <section className="mt-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-display font-bold tracking-tight">Popular Destinations</h2>
              <p className="text-slate-500 mt-1">Handpicked locations for your next getaway.</p>
            </div>
            <button className="text-indigo-600 font-semibold text-sm hover:underline">View all</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { city: 'Paris', country: 'France', price: '$420', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80' },
              { city: 'Tokyo', country: 'Japan', price: '$890', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80' },
              { city: 'New York', country: 'USA', price: '$350', img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80' },
            ].map((dest, i) => (
              <motion.div 
                key={dest.city}
                whileHover={{ y: -10 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl mb-4">
                  <img 
                    src={dest.img} 
                    alt={dest.city}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                    From {dest.price}
                  </div>
                </div>
                <h3 className="text-xl font-bold">{dest.city}</h3>
                <p className="text-slate-500 text-sm">{dest.country}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-slate-200 py-12 px-8 text-center text-slate-400 text-sm">
        <p>© 2026 SkyBound Flights. All rights reserved.</p>
      </footer>
    </div>
  );
}
