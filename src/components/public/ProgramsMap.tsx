import React, { useState, useMemo } from 'react';
import {
  Globe,
  MapPin,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Heart,
  ShieldCheck,
  CheckCircle2,
  X,
  Layers,
  Activity,
  Compass,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useTranslation } from '../../i18n/useTranslation';
import {
  HUMANITARIAN_PROJECT_LOCATIONS,
  ACTIVE_COUNTRIES,
  CountryProjectSummary,
} from '../../data/humanitarianProjects';
import { HumanitarianProjectLocation } from '../../types';

interface ProgramsMapProps {
  selectedCategory: string;
  onSelectCategory?: (category: string) => void;
}

// Geographic to Equirectangular SVG (1000 x 500) coordinate projection
function projectCoord(lat: number, lng: number): [number, number] {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

// Region viewBox presets
const REGION_VIEWS = {
  global: { x: 0, y: 0, w: 1000, h: 500, label: 'Global' },
  americas: { x: 160, y: 80, w: 340, h: 360, label: 'Americas' },
  europeAfrica: { x: 420, y: 60, w: 320, h: 360, label: 'Europe & Africa' },
};

export function ProgramsMap({ selectedCategory, onSelectCategory }: ProgramsMapProps) {
  const { navigateTo, openDonationModal, language } = useSite();
  const { t } = useTranslation();

  const [activeRegionView, setActiveRegionView] = useState<'global' | 'americas' | 'europeAfrica'>('global');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);

  // Current language helper
  const langKey = (language === 'pt' ? 'pt' : language === 'es' ? 'es' : 'en') as 'en' | 'pt' | 'es';

  // Filter projects by category if selected
  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'All') return HUMANITARIAN_PROJECT_LOCATIONS;
    const cat = selectedCategory.toLowerCase();
    return HUMANITARIAN_PROJECT_LOCATIONS.filter((p) => {
      if (cat.includes('peace') || cat.includes('paz')) return p.programSlug === 'peace-ambassadors';
      if (cat.includes('educ') || cat.includes('youth') || cat.includes('joven')) return p.programSlug === 'educational-volunteers';
      if (cat.includes('social') || cat.includes('cuidado')) return p.programSlug === 'social-workers-and-counselors';
      if (cat.includes('relief') || cat.includes('disaster') || cat.includes('socorro')) return p.programSlug === 'emergency-relief-disaster-response';
      return true;
    });
  }, [selectedCategory]);

  // Selected country data
  const selectedCountryData = useMemo(() => {
    if (!selectedCountryCode) return null;
    return ACTIVE_COUNTRIES.find((c) => c.countryCode === selectedCountryCode) || null;
  }, [selectedCountryCode]);

  // Projects in selected country
  const selectedCountryProjects = useMemo(() => {
    if (!selectedCountryCode) return [];
    return HUMANITARIAN_PROJECT_LOCATIONS.filter((p) => p.countryCode === selectedCountryCode);
  }, [selectedCountryCode]);

  // Base viewBox calculation
  const currentViewBox = useMemo(() => {
    const base = REGION_VIEWS[activeRegionView];
    const w = base.w / zoomLevel;
    const h = base.h / zoomLevel;
    const x = base.x + (base.w - w) / 2;
    const y = base.y + (base.h - h) / 2;
    return `${Math.max(0, x)} ${Math.max(0, y)} ${w} ${h}`;
  }, [activeRegionView, zoomLevel]);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, z + 0.3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(1, z - 0.3));
  const handleReset = () => {
    setActiveRegionView('global');
    setZoomLevel(1);
    setSelectedCountryCode(null);
  };

  const handleSelectCountry = (countryCode: string) => {
    if (selectedCountryCode === countryCode) {
      setSelectedCountryCode(null);
      return;
    }
    setSelectedCountryCode(countryCode);
    const country = ACTIVE_COUNTRIES.find((c) => c.countryCode === countryCode);
    if (country) {
      if (country.region === 'Americas') {
        setActiveRegionView('americas');
      } else if (country.region === 'Europe' || country.region === 'Africa') {
        setActiveRegionView('europeAfrica');
      }
    }
  };

  // Status badge styler
  const getStatusBadge = (status: HumanitarianProjectLocation['status']) => {
    switch (status) {
      case 'diplomatic_hub':
        return {
          color: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
          dot: 'bg-amber-400',
          label: t('programs.mapHubHeadquarters') || 'Diplomatic Hub',
        };
      case 'rapid_response':
        return {
          color: 'border-rose-400/40 bg-rose-500/10 text-rose-300',
          dot: 'bg-rose-400',
          label: t('programs.mapHubReliefCorridor') || 'Rapid Relief Corridor',
        };
      default:
        return {
          color: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
          dot: 'bg-sky-400',
          label: t('programs.mapHubFieldMission') || 'Active Field Mission',
        };
    }
  };

  return (
    <div id="humanitarian-interactive-map" className="relative bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-8">
      {/* Top Header Bar */}
      <div className="p-6 sm:p-8 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" />
              {t('programs.mapBadge') || 'Interactive Operational Map'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif-heading text-white">
              {t('programs.mapTitle') || 'Global Humanitarian Footprint & Active Missions'}
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              {t('programs.mapSubtitle') ||
                "Explore ADMIR's ongoing humanitarian projects, regional diplomatic liaison chanceries, and rapid emergency relief corridors worldwide."}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-6 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 shrink-0">
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black text-amber-400">8</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('programs.mapActiveCountries') || 'Active Nations'}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black text-sky-400">10</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('programs.mapFieldMissions') || 'Field Deployments'}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">4</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('programs.mapStrategicSectors') || 'Strategic Sectors'}
              </div>
            </div>
          </div>
        </div>

        {/* Map Interactive Controls Toolbar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          {/* Region Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              id="map-btn-view-global"
              type="button"
              onClick={() => {
                setActiveRegionView('global');
                setZoomLevel(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeRegionView === 'global'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🌍 {t('programs.mapAllRegions') || 'Global View'}
            </button>
            <button
              id="map-btn-view-americas"
              type="button"
              onClick={() => {
                setActiveRegionView('americas');
                setZoomLevel(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeRegionView === 'americas'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🌎 {t('programs.mapAmericas') || 'Americas'}
            </button>
            <button
              id="map-btn-view-europe-africa"
              type="button"
              onClick={() => {
                setActiveRegionView('europeAfrica');
                setZoomLevel(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeRegionView === 'europeAfrica'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🌍 {t('programs.mapEurope') || 'Europe'} & {t('programs.mapAfrica') || 'Africa'}
            </button>
          </div>

          {/* Map Legend */}
          <div className="hidden md:flex items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <span>{t('programs.mapHubHeadquarters') || 'Diplomatic Hub'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
              <span>{t('programs.mapHubFieldMission') || 'Active Field Mission'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
              <span>{t('programs.mapHubReliefCorridor') || 'Rapid Relief Corridor'}</span>
            </span>
          </div>

          {/* Zoom / Reset Controls */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 ml-auto">
            <button
              id="map-btn-zoom-in"
              type="button"
              onClick={handleZoomIn}
              title="Zoom in"
              aria-label="Zoom in"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              id="map-btn-zoom-out"
              type="button"
              onClick={handleZoomOut}
              title="Zoom out"
              aria-label="Zoom out"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              id="map-btn-reset"
              type="button"
              onClick={handleReset}
              title={t('programs.mapResetView') || 'Reset Map View'}
              aria-label="Reset map"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="relative w-full h-[420px] sm:h-[500px] lg:h-[540px] bg-slate-950 overflow-hidden select-none">
        {/* SVG World Map */}
        <svg
          viewBox={currentViewBox}
          className="w-full h-full transition-all duration-700 ease-out"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="ADMIR Global Humanitarian Projects Map"
        >
          <defs>
            {/* Radial glow gradient */}
            <radialGradient id="hubGlowAmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hubGlowSky" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hubGlowRose" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="corridorLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Graticule Latitude & Longitude Guidelines */}
          <g className="opacity-20 stroke-slate-700" strokeWidth="0.5" strokeDasharray="3,3">
            {/* Equator */}
            <line x1="0" y1="250" x2="1000" y2="250" stroke="#38bdf8" strokeWidth="0.7" />
            {/* Tropics */}
            <line x1="0" y1="185" x2="1000" y2="185" />
            <line x1="0" y1="315" x2="1000" y2="315" />
            {/* Meridians */}
            <line x1="250" y1="0" x2="250" y2="500" />
            <line x1="500" y1="0" x2="500" y2="500" stroke="#f59e0b" strokeWidth="0.7" />
            <line x1="750" y1="0" x2="750" y2="500" />
          </g>

          {/* World Continents Outlines */}
          <g className="fill-slate-900/90 stroke-slate-800" strokeWidth="1">
            {/* North America */}
            <path
              id="map-continent-na"
              d="M 120 70 L 160 50 L 220 50 L 290 60 L 320 100 L 310 130 L 285 142 L 270 180 L 280 200 L 260 230 L 230 220 L 200 200 L 170 170 L 140 130 Z"
              className="hover:fill-slate-800/80 transition-colors"
            />
            {/* Alaska & Northern Archipelago */}
            <path d="M 80 60 L 120 50 L 120 80 L 90 90 Z" />
            <path d="M 280 30 L 340 30 L 320 60 L 290 55 Z" />

            {/* Central America & Caribbean Bridge */}
            <path
              id="map-continent-ca"
              d="M 255 220 L 280 225 L 290 235 L 280 240 L 270 230 Z"
              className="fill-slate-900 stroke-slate-700"
            />
            {/* Caribbean Islands / Haiti */}
            <circle cx="299.1" cy="198.3" r="3.5" className="fill-amber-500/30 stroke-amber-400/80" />

            {/* South America */}
            <path
              id="map-continent-sa"
              d="M 285 240 L 340 240 L 390 270 L 380 340 L 350 400 L 320 440 L 310 400 L 300 320 L 280 260 Z"
              className="hover:fill-slate-800/80 transition-colors"
            />

            {/* Europe */}
            <path
              id="map-continent-eu"
              d="M 470 90 L 520 80 L 580 90 L 570 140 L 530 150 L 510 130 L 480 140 L 460 120 Z"
              className="hover:fill-slate-800/80 transition-colors"
            />
            {/* British Isles & Scandinavia */}
            <path d="M 470 95 L 485 90 L 480 115 L 465 110 Z" />
            <path d="M 520 50 L 550 40 L 560 85 L 530 80 Z" />

            {/* Africa */}
            <path
              id="map-continent-af"
              d="M 460 160 L 540 150 L 590 190 L 610 240 L 590 320 L 540 380 L 510 370 L 480 290 L 450 210 Z"
              className="hover:fill-slate-800/80 transition-colors"
            />

            {/* Asia & Middle East */}
            <path
              id="map-continent-as"
              d="M 580 90 L 670 70 L 780 80 L 850 120 L 880 180 L 840 240 L 760 260 L 700 240 L 630 200 L 580 150 Z"
              className="hover:fill-slate-800/80 transition-colors"
            />
            {/* Indian Subcontinent */}
            <path d="M 700 200 L 740 210 L 720 270 L 690 230 Z" />
            {/* Southeast Asia & Japan */}
            <path d="M 800 240 L 840 280 L 820 310 L 780 260 Z" />
            <path d="M 860 130 L 880 150 L 870 190 L 850 160 Z" />

            {/* Oceania / Australia */}
            <path
              id="map-continent-oc"
              d="M 820 340 L 890 330 L 910 380 L 860 410 L 810 380 Z"
              className="hover:fill-slate-800/80 transition-colors"
            />
            <path d="M 920 400 L 940 400 L 930 430 Z" />
          </g>

          {/* Highlighted Country Landmass Overlays for Active ADMIR Nations */}
          {ACTIVE_COUNTRIES.map((ac) => {
            const isSelected = selectedCountryCode === ac.countryCode;
            const coords = projectCoord(ac.center.lat, ac.center.lng);
            return (
              <g key={`country-highlight-${ac.countryCode}`}>
                {/* Visual pulse aura around country zone */}
                <circle
                  cx={coords[0]}
                  cy={coords[1]}
                  r={isSelected ? 32 : 22}
                  className={`transition-all duration-500 pointer-events-none ${
                    isSelected
                      ? 'fill-amber-500/20 stroke-amber-400 stroke-1'
                      : 'fill-amber-500/5 stroke-amber-500/20 stroke-0.5'
                  }`}
                />
              </g>
            );
          })}

          {/* Diplomatic Mission Liaison Arcs / Corridors */}
          <g className="stroke-amber-400/40" strokeWidth="1" strokeDasharray="4,4" fill="none">
            {/* Washington DC to Geneva Liaison */}
            <path d="M 286 142 Q 400 90 517 122" className="animate-pulse" />
            {/* Washington DC to Panama Logistics Corridor */}
            <path d="M 286 142 Q 260 180 279 225" />
            {/* Panama to Haiti Rapid Relief */}
            <path d="M 279 225 Q 290 210 299 198" stroke="#f43f5e" strokeWidth="1.2" />
            {/* Panama to Bogotá Corridor */}
            <path d="M 279 225 Q 285 230 294 237" />
            {/* Washington DC to Miami */}
            <path d="M 286 142 L 277 178" />
            {/* Miami to Haiti */}
            <path d="M 277 178 Q 288 185 299 198" />
            {/* Bogotá to Curitiba & Manaus */}
            <path d="M 294 237 Q 310 250 333 259" />
            <path d="M 333 259 Q 350 290 363 321" />
            {/* Geneva to Dakar West Africa Hub */}
            <path d="M 517 122 Q 480 160 452 209" />
            {/* Geneva to Nairobi East Africa */}
            <path d="M 517 122 Q 570 180 602 254" />
          </g>

          {/* Interactive Project Location Markers */}
          {HUMANITARIAN_PROJECT_LOCATIONS.map((loc) => {
            const [x, y] = projectCoord(loc.coordinates.lat, loc.coordinates.lng);
            const isSelected = selectedCountryCode === loc.countryCode;
            const isHovered = hoveredLocationId === loc.id;
            const isFiltered = filteredProjects.some((fp) => fp.id === loc.id);

            // Styling based on mission status
            const isHub = loc.status === 'diplomatic_hub';
            const isRelief = loc.status === 'rapid_response';
            const mainColor = isHub ? '#f59e0b' : isRelief ? '#f43f5e' : '#38bdf8';

            return (
              <g
                key={loc.id}
                id={`map-marker-${loc.id}`}
                className={`cursor-pointer transition-transform duration-300 ${
                  isFiltered ? 'opacity-100' : 'opacity-30'
                }`}
                onMouseEnter={() => setHoveredLocationId(loc.id)}
                onMouseLeave={() => setHoveredLocationId(null)}
                onClick={() => handleSelectCountry(loc.countryCode)}
              >
                {/* Animated pulse ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered || isSelected ? 16 : 10}
                  fill="none"
                  stroke={mainColor}
                  strokeWidth="1.5"
                  className={isSelected ? 'animate-ping' : ''}
                  opacity={isSelected ? 0.8 : 0.4}
                />

                {/* Marker Outer Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered || isSelected ? 8 : 5.5}
                  fill={mainColor}
                  filter="url(#glow)"
                  className="transition-all duration-300"
                />

                {/* Marker Inner Dot */}
                <circle cx={x} cy={y} r={isHovered || isSelected ? 3.5 : 2} fill="#ffffff" />

                {/* Marker City/Country Label */}
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  className={`text-[9px] font-bold font-sans tracking-wide transition-all select-none pointer-events-none ${
                    isHovered || isSelected
                      ? 'fill-amber-300 font-extrabold'
                      : 'fill-slate-300 opacity-80'
                  }`}
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                >
                  {loc.city.split('&')[0].trim()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Country / Project Floating Card */}
        {selectedCountryData && (
          <div
            id="map-country-detail-panel"
            className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md bg-slate-900/95 backdrop-blur-md rounded-2xl border border-amber-500/40 p-5 shadow-2xl z-20 max-h-[85%] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedCountryData.flag}</span>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    {selectedCountryData.country}
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      {selectedCountryProjects.length}{' '}
                      {selectedCountryProjects.length === 1 ? 'Mission' : 'Missions'}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-400">{selectedCountryData.region} Region</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCountryCode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of projects in this country */}
            <div className="mt-3.5 space-y-3.5">
              {selectedCountryProjects.map((project) => {
                const badge = getStatusBadge(project.status);
                return (
                  <div
                    key={project.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-amber-500/30 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        {project.city}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${badge.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug">
                      {project.projectTitle[langKey]}
                    </h4>

                    <div className="text-xs text-slate-300 leading-relaxed flex items-start gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{project.focusArea[langKey]}</span>
                    </div>

                    <div className="text-xs text-emerald-400 leading-relaxed flex items-start gap-1.5 pt-1 border-t border-slate-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{project.beneficiariesScope[langKey]}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => navigateTo('program-detail', project.programSlug)}
                        className="flex-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{t('programs.mapExploreMission') || 'Explore Program Details'}</span>
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openDonationModal(100, project.projectTitle[langKey])
                        }
                        className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title={t('programs.mapSupportMission') || 'Donate to This Mission'}
                      >
                        <Heart className="w-3 h-3 fill-current" />
                        <span>{t('programs.donate') || 'Donate'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Country Quick-Select Bar */}
      <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-500" />
          <span>{t('programs.mapSelectCountry') || 'Select Country / Mission Hub'}:</span>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-thin">
          {ACTIVE_COUNTRIES.map((c) => {
            const isSelected = selectedCountryCode === c.countryCode;
            return (
              <button
                key={c.countryCode}
                id={`map-country-pill-${c.countryCode}`}
                type="button"
                onClick={() => handleSelectCountry(c.countryCode)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-400/50'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <span className="text-base">{c.flag}</span>
                <span>{c.country}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isSelected ? 'bg-amber-800 text-amber-100' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {c.projectsCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
