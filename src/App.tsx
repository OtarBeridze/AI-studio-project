/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plane, MapPin, Search, Calendar, Users, ArrowRightLeft, ChevronLeft, ChevronRight, Plus, Minus, ChevronDown, Wifi, WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DayPicker } from 'react-day-picker';
import { format, startOfToday, addDays } from 'date-fns';
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
  const [originCode, setOriginCode] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [suggestions, setSuggestions] = useState<{
    name: string, 
    iataCode: string, 
    subType: string,
    cityName: string,
    countryName: string,
    regionName?: string
  }[]>([]);
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('Cheapest');
  const [stopsFilter, setStopsFilter] = useState<string[]>(['Nonstop', '1 stop', '2+ stops']);
  const [flights, setFlights] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [amadeusStatus, setAmadeusStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const departurePickerRef = useRef<HTMLDivElement>(null);
  const returnPickerRef = useRef<HTMLDivElement>(null);
  const passengerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (fromRef.current && !fromRef.current.contains(target)) {
        // Only clear active field if we're not clicking into another field that handles it
        if (toRef.current && !toRef.current.contains(target)) {
          setActiveField(null);
        }
      }
      
      if (departurePickerRef.current && !departurePickerRef.current.contains(target)) {
        setShowDeparturePicker(false);
      }
      
      if (returnPickerRef.current && !returnPickerRef.current.contains(target)) {
        setShowReturnPicker(false);
      }
      
      if (passengerRef.current && !passengerRef.current.contains(target)) {
        setShowPassengerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/amadeus-status');
        const data = await response.json();
        if (data.status === 'connected') {
          setAmadeusStatus('connected');
        } else {
          setAmadeusStatus('error');
        }
      } catch (err) {
        setAmadeusStatus('error');
      }
    };
    checkStatus();
  }, []);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleCityChange = (value: string, field: 'from' | 'to') => {
    if (field === 'from') setFrom(value);
    else setTo(value);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length >= 3) {
      setIsSuggestionsLoading(true);
      setActiveField(field);
      
      searchTimeout.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/city-search?keyword=${encodeURIComponent(value)}&subType=AIRPORT`);
          const data = await response.json();
          
          if (data.data) {
            const filtered = data.data
              .filter((loc: any) => loc.subType === 'AIRPORT')
              .map((loc: any) => {
                return {
                  name: loc.name,
                  iataCode: loc.iataCode,
                  subType: loc.subType,
                  cityName: loc.address.cityName,
                  countryName: loc.address.countryName,
                  regionName: loc.address.regionCode || loc.address.stateCode
                };
              });
            
            setSuggestions(filtered);
            setActiveField(filtered.length > 0 ? field : null);
          }
        } catch (err) {
          console.error("City search error:", err);
        } finally {
          setIsSuggestionsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setActiveField(null);
      setIsSuggestionsLoading(false);
    }
  };

  const selectSuggestion = (suggestion: any) => {
    const displayName = `${suggestion.cityName} (${suggestion.iataCode})`;
    if (activeField === 'from') {
      setFrom(displayName);
      setOriginCode(suggestion.iataCode);
    } else if (activeField === 'to') {
      setTo(displayName);
      setDestinationCode(suggestion.iataCode);
    }
    setActiveField(null);
  };

  const handleSwap = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let currentOriginCode = originCode;
    let currentDestinationCode = destinationCode;

    setIsSearching(true);
    setError(null);
    
    try {
      // Resolve origin if missing
      if (!currentOriginCode && from) {
        const response = await fetch(`/api/city-search?keyword=${from}`);
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          currentOriginCode = data.data[0].iataCode;
        }
      }

      // Resolve destination if missing
      if (!currentDestinationCode && to) {
        const response = await fetch(`/api/city-search?keyword=${to}`);
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          currentDestinationCode = data.data[0].iataCode;
        }
      }

      if (!currentOriginCode || !currentDestinationCode || !departureDate) {
        setError("Please select origin, destination, and a departure date to search.");
        setIsSearching(false);
        return;
      }

      const params = new URLSearchParams({
        originLocationCode: currentOriginCode,
        destinationLocationCode: currentDestinationCode,
        departureDate: format(departureDate, 'yyyy-MM-dd'),
        adults: adults.toString(),
        children: children.toString(),
      });

      if (tripType === 'round-trip') {
        // If return date is missing for round trip, default to 7 days after departure
        const searchReturnDate = returnDate || addDays(departureDate, 7);
        params.append('returnDate', format(searchReturnDate, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/flight-search?${params.toString()}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.data) {
        const mappedFlights = data.data.map((offer: any) => {
          const itinerary = offer.itineraries[0];
          const segment = itinerary.segments[0];
          const arrivalSegment = itinerary.segments[itinerary.segments.length - 1];
          
          // Helper to parse duration PT2H5M -> 2 hr 5 min
          const durationMatch = itinerary.duration.match(/PT(\d+H)?(\d+M)?/);
          const hours = durationMatch[1] ? durationMatch[1].replace('H', '') : '0';
          const mins = durationMatch[2] ? durationMatch[2].replace('M', '') : '0';
          const durationStr = `${hours} hr ${mins} min`;
          const durationMinutes = parseInt(hours) * 60 + parseInt(mins);

          return {
            id: offer.id,
            airline: data.dictionaries.carriers[segment.carrierCode] || segment.carrierCode,
            logo: `https://api.duffel.com/img/airlines/for_80x80_pixel_background/${segment.carrierCode}.png`, // Using a common airline logo API
            departureTime: format(new Date(segment.departure.at), 'h:mm a'),
            departureDateFormatted: format(new Date(segment.departure.at), 'd MMM'),
            arrivalTime: format(new Date(arrivalSegment.arrival.at), 'h:mm a'),
            duration: durationStr,
            durationMinutes: durationMinutes,
            price: parseFloat(offer.price.total),
            stops: itinerary.segments.length > 1 
              ? itinerary.segments.length === 2 ? '1 stop' : '2+ stops'
              : 'Nonstop',
            class: offer.travelerPricings[0].fareDetailsBySegment[0].cabin,
            airportCodes: `${segment.departure.iataCode}–${arrivalSegment.arrival.iataCode}`,
            co2: 'N/A', // Amadeus doesn't provide CO2 in the basic search
            emissionsDiff: 'avg emissions',
            operatedBy: segment.operating?.carrierCode ? `Operated by ${data.dictionaries.carriers[segment.operating.carrierCode] || segment.operating.carrierCode}` : ''
          };
        });
        setFlights(mappedFlights);
        setShowResults(true);
        window.scrollTo({ top: 300, behavior: 'smooth' });
      } else {
        setFlights([]);
        setError("No flights found for this search.");
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.message || "An error occurred while searching for flights.");
    } finally {
      setIsSearching(false);
    }
  };

  const filteredFlights = flights.filter(flight => {
    if (stopsFilter.length === 0) return true;
    return stopsFilter.includes(flight.stops);
  });

  const sortedFlights = [...filteredFlights].sort((a, b) => {
    if (sortBy === 'Cheapest') return a.price - b.price;
    if (sortBy === 'Fastest') return a.durationMinutes - b.durationMinutes;
    return 0;
  });

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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
            {amadeusStatus === 'loading' && (
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            {amadeusStatus === 'connected' && (
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
            {amadeusStatus === 'error' && (
              <div className="w-2 h-2 rounded-full bg-rose-500" />
            )}
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Amadeus: {amadeusStatus}
            </span>
          </div>
          <a href="#" className="hover:text-indigo-600 transition-colors">Discover</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">My Bookings</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Support</a>
        </div>
        <button className="px-5 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-all">
          Sign In
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24">
        <AnimatePresence mode="wait">
          {!showResults && (
            <motion.div 
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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
          )}
        </AnimatePresence>

        {/* Search Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200 p-6"
        >
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Top Row: Selectors */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="relative">
                <div 
                  className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                  onClick={() => {
                    const newType = tripType === 'one-way' ? 'round-trip' : 'one-way';
                    setTripType(newType);
                    if (newType === 'one-way') setReturnDate(undefined);
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span className="font-medium">{tripType === 'one-way' ? 'One way' : 'Round trip'}</span>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              <div className="relative" ref={passengerRef}>
                <div 
                  className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                  onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
                >
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{adults + children}</span>
                  <ChevronDown className="w-4 h-4" />
                </div>

                <AnimatePresence>
                  {showPassengerDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-50 top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 min-w-[200px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">Adults</p>
                            <p className="text-xs text-slate-400">Age 12+</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              type="button"
                              onClick={() => setAdults(Math.max(1, adults - 1))}
                              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold w-4 text-center">{adults}</span>
                            <button 
                              type="button"
                              onClick={() => setAdults(adults + 1)}
                              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">Children</p>
                            <p className="text-xs text-slate-400">Age 2-11</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              type="button"
                              onClick={() => setChildren(Math.max(0, children - 1))}
                              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold w-4 text-center">{children}</span>
                            <button 
                              type="button"
                              onClick={() => setChildren(children + 1)}
                              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded transition-colors">
                <span className="font-medium">Economy</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Middle Row: Inputs */}
            <div className="flex flex-col lg:flex-row items-stretch gap-2">
              <div className="flex-1 flex items-center border border-slate-300 rounded-lg focus-within:ring-1 focus-within:ring-indigo-500 transition-all relative" ref={fromRef}>
                <div className="pl-4 pr-2">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Where from (departure city)"
                  value={from}
                  onChange={(e) => handleCityChange(e.target.value, 'from')}
                  className="w-full py-3 pr-4 focus:outline-none text-slate-800 font-medium bg-transparent"
                />
                
                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                  {activeField === 'from' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute z-[100] w-full md:w-[450px] top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto"
                    >
                      {isSuggestionsLoading ? (
                        <div className="px-4 py-12 flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                          <span className="text-sm text-slate-400 font-medium">Searching locations...</span>
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="py-2">
                          {suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              onClick={() => selectSuggestion(suggestion)}
                              className="px-6 py-4 hover:bg-slate-50 cursor-pointer flex items-start gap-5 transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div className="mt-1">
                                <Plane className="w-6 h-6 text-slate-600" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="text-[16px] font-bold text-slate-900">{suggestion.iataCode}</span>
                                  <span className="text-[16px] font-medium text-slate-800">{suggestion.name}</span>
                                </div>
                                <span className="text-[14px] text-slate-500 mt-0.5 leading-tight">
                                  {suggestion.cityName}{suggestion.regionName ? `, ${suggestion.regionName}` : ''}, {suggestion.countryName}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-10 text-center">
                          <span className="text-sm text-slate-400">No locations found</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-center -mx-2 z-10">
                <button 
                  type="button"
                  onClick={handleSwap}
                  className="p-2 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:rotate-180 duration-300"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 flex items-center border border-slate-300 rounded-lg focus-within:ring-1 focus-within:ring-indigo-500 transition-all relative" ref={toRef}>
                <div className="pl-4 pr-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Where to (destination city)"
                  value={to}
                  onChange={(e) => handleCityChange(e.target.value, 'to')}
                  className="w-full py-3 pr-4 focus:outline-none text-slate-800 font-medium bg-transparent"
                />

                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                  {activeField === 'to' && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute z-[100] w-full md:w-[450px] top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto"
                    >
                      {isSuggestionsLoading ? (
                        <div className="px-4 py-12 flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                          <span className="text-sm text-slate-400 font-medium">Searching locations...</span>
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="py-2">
                          {suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              onClick={() => selectSuggestion(suggestion)}
                              className="px-6 py-4 hover:bg-slate-50 cursor-pointer flex items-start gap-5 transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div className="mt-1">
                                <Plane className="w-6 h-6 text-slate-600" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="text-[16px] font-bold text-slate-900">{suggestion.iataCode}</span>
                                  <span className="text-[16px] font-medium text-slate-800">{suggestion.name}</span>
                                </div>
                                <span className="text-[14px] text-slate-500 mt-0.5 leading-tight">
                                  {suggestion.cityName}{suggestion.regionName ? `, ${suggestion.regionName}` : ''}, {suggestion.countryName}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-10 text-center">
                          <span className="text-sm text-slate-400">No locations found</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1 flex items-center border border-slate-300 rounded-lg divide-x divide-slate-300">
                <div 
                  className="flex-1 flex items-center px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors relative group rounded-l-lg" 
                  ref={departurePickerRef} 
                  onClick={() => setShowDeparturePicker(!showDeparturePicker)}
                >
                  <Calendar className={`w-4 h-4 mr-3 transition-colors ${departureDate ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                      Departure – Select Date <span className="text-rose-500">*</span>
                    </span>
                    <span className={`font-medium whitespace-nowrap ${departureDate ? 'text-slate-800' : 'text-slate-400'}`}>
                      {departureDate ? format(departureDate, 'EEE, MMM d') : 'Select date'}
                    </span>
                  </div>
                  
                  <AnimatePresence>
                    {showDeparturePicker && (
                      <motion.div
                        key="departure-picker"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 z-50 bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 w-[90vw] max-w-[640px] lg:w-[640px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DayPicker
                          mode="single"
                          numberOfMonths={2}
                          pagedNavigation
                          weekStartsOn={1}
                          selected={departureDate}
                          onSelect={(date) => {
                            if (date) {
                              setDepartureDate(date);
                              setShowDeparturePicker(false);
                              if (returnDate && returnDate < date) setReturnDate(undefined);
                            }
                          }}
                          disabled={{ before: startOfToday() }}
                          classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-8 sm:space-y-0",
                            month: "space-y-4",
                            month_caption: "flex justify-center pt-1 relative items-center mb-6",
                            caption_label: "text-base font-bold text-slate-900",
                            nav: "flex items-center",
                            button_previous: "absolute left-2 top-2 h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all z-10 shadow-sm",
                            button_next: "absolute right-2 top-2 h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all z-10 shadow-sm",
                            month_grid: "w-full border-collapse",
                            weekdays: "flex mb-2",
                            weekday: "text-slate-500 w-9 font-semibold text-[13px] text-center",
                            week: "flex w-full mt-1",
                            day: "h-9 w-9 p-0 font-medium hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center text-sm text-slate-700",
                            selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-lg font-bold",
                            today: "text-blue-600 font-bold",
                            outside: "text-slate-300 opacity-50",
                            disabled: "text-slate-200 opacity-50 cursor-not-allowed",
                            range_middle: "aria-selected:bg-slate-100 aria-selected:text-slate-900",
                            hidden: "invisible",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div 
                  className={`flex-1 flex items-center px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors relative group rounded-r-lg ${tripType === 'one-way' ? 'opacity-50' : ''}`} 
                  ref={returnPickerRef} 
                  onClick={() => tripType === 'round-trip' && setShowReturnPicker(!showReturnPicker)}
                >
                  <Calendar className={`w-4 h-4 mr-3 transition-colors ${returnDate ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Return</span>
                    <span className={`font-medium whitespace-nowrap ${returnDate ? 'text-slate-800' : 'text-slate-400'}`}>
                      {returnDate ? format(returnDate, 'EEE, MMM d') : 'Select date'}
                    </span>
                  </div>

                  <AnimatePresence>
                    {showReturnPicker && (
                      <motion.div
                        key="return-picker"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 z-50 bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 w-[90vw] max-w-[640px] lg:w-[640px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DayPicker
                          mode="single"
                          numberOfMonths={2}
                          pagedNavigation
                          weekStartsOn={1}
                          selected={returnDate}
                          onSelect={(date) => {
                            if (date) {
                              setReturnDate(date);
                              setShowReturnPicker(false);
                            }
                          }}
                          disabled={{ before: departureDate || startOfToday() }}
                          classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-8 sm:space-y-0",
                            month: "space-y-4",
                            month_caption: "flex justify-center pt-1 relative items-center mb-6",
                            caption_label: "text-base font-bold text-slate-900",
                            nav: "flex items-center",
                            button_previous: "absolute left-2 top-2 h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all z-10 shadow-sm",
                            button_next: "absolute right-2 top-2 h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all z-10 shadow-sm",
                            month_grid: "w-full border-collapse",
                            weekdays: "flex mb-2",
                            weekday: "text-slate-500 w-9 font-semibold text-[13px] text-center",
                            week: "flex w-full mt-1",
                            day: "h-9 w-9 p-0 font-medium hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center text-sm text-slate-700",
                            selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-lg font-bold",
                            today: "text-blue-600 font-bold",
                            outside: "text-slate-300 opacity-50",
                            disabled: "text-slate-200 opacity-50 cursor-not-allowed",
                            range_middle: "aria-selected:bg-slate-100 aria-selected:text-slate-900",
                            hidden: "invisible",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            {/* Search Button (Floating or integrated) */}
            <div className="flex flex-col items-center gap-4 -mb-10">
              <button
                type="submit"
                disabled={isSearching}
                className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition-all active:scale-95 disabled:opacity-70"
              >
                <Search className="w-4 h-4" />
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Search Results */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-12 space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h2 className="text-2xl font-bold text-slate-800">
                  Available Flights <span className="text-slate-400 font-normal ml-2">({sortedFlights.length} results)</span>
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  {/* Stops Filter */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Stops</span>
                    <div className="flex items-center gap-1">
                      {['Nonstop', '1 stop', '2+ stops'].map(stop => (
                        <button
                          key={stop}
                          type="button"
                          onClick={() => {
                            if (stopsFilter.includes(stop)) {
                              // Don't allow empty filter if you want to always show something, 
                              // or allow it to show "all"
                              setStopsFilter(stopsFilter.filter(s => s !== stop));
                            } else {
                              setStopsFilter([...stopsFilter, stop]);
                            }
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            stopsFilter.includes(stop) 
                              ? 'bg-indigo-600 text-white shadow-sm' 
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {stop}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 font-medium">Sort by:</span>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/20 shadow-sm"
                    >
                      <option>Cheapest</option>
                      <option>Fastest</option>
                      <option>Best Value</option>
                    </select>
                  </div>
                </div>
              </div>

              {sortedFlights.map((flight) => (
                <motion.div
                  key={flight.id}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6 transition-all hover:shadow-md"
                >
                  {/* Airline Info */}
                  <div className="flex items-center gap-4 w-full md:w-48">
                    <img 
                      src={flight.logo} 
                      alt={flight.airline} 
                      className="w-10 h-10 rounded-full object-cover border border-slate-100"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">{flight.departureTime} – {flight.arrivalTime}</h3>
                      <p className="text-xs font-medium text-indigo-600 mt-0.5">{flight.departureDateFormatted}</p>
                      <p className="text-sm text-slate-500">{flight.airline} {flight.operatedBy && `· ${flight.operatedBy}`}</p>
                    </div>
                  </div>

                  {/* Flight Duration & Codes */}
                  <div className="flex-1 flex items-center justify-between w-full px-4">
                    <div className="text-center md:text-left">
                      <p className="text-sm font-bold text-slate-800">{flight.duration}</p>
                      <p className="text-sm text-slate-400 font-medium">{flight.airportCodes}</p>
                    </div>

                    <div className="flex flex-col items-center gap-1 px-8 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{flight.stops}</p>
                    </div>

                    {/* Emissions */}
                    <div className="text-center md:text-right">
                      <p className="text-sm font-bold text-slate-800">{flight.co2}</p>
                      <div className="flex items-center justify-end gap-1">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${flight.emissionsDiff.startsWith('-') ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                          {flight.emissionsDiff}
                        </span>
                        <div className="w-3 h-3 rounded-full border border-slate-300 flex items-center justify-center text-[8px] text-slate-400">i</div>
                      </div>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="w-full md:w-40 flex flex-row md:flex-col items-center justify-between md:justify-center gap-1 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0">
                    <div className="text-left md:text-center">
                      <p className="text-xl font-bold text-green-600">€{flight.price}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tripType === 'round-trip' ? 'round trip' : 'one way'}</p>
                    </div>
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Featured Destinations */}
        {!showResults && (
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
        )}
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-slate-200 py-12 px-8 text-center text-slate-400 text-sm">
        <p>© 2026 SkyBound Flights. All rights reserved.</p>
      </footer>
    </div>
  );
}
