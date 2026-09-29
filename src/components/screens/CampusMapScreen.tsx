import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import L from 'leaflet';
import { storage } from '../../services/storage';
import { CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG } from '../../data/campusData';

interface CampusMapScreenProps {
  onBack: () => void;
}

export const CampusMapScreen: React.FC<CampusMapScreenProps> = ({ onBack }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Campus Center Pin
      const centerIcon = L.divIcon({
        className: 'center-pin',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #10A37F, #1A7F64);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
          ">
            <div style="
              width: 14px;
              height: 14px;
              background: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
      });

      L.marker([CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG], { icon: centerIcon })
        .addTo(map)
        .bindPopup(`<b>Mangalore University Campus Center</b><br/>Mangalagangotri, Konaje`);

      // Add markers for any entities with lat/lng
      const departments = storage.getDepartments();
      Object.values(departments).forEach(dept => {
        if (dept.lat != null && dept.lng != null && (dept.lat !== CAMPUS_CENTER_LAT || dept.lng !== CAMPUS_CENTER_LNG)) {
          const pinIcon = L.divIcon({
            className: 'building-pin',
            html: `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                background: #EF4444;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2px solid white;
                box-shadow: 0 3px 10px rgba(0,0,0,0.5);
              ">
                <div style="
                  width: 8px;
                  height: 8px;
                  background: white;
                  border-radius: 50%;
                  transform: rotate(45deg);
                "></div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          L.marker([dept.lat, dept.lng], { icon: pinIcon })
            .addTo(map)
            .bindPopup(`<b>${dept.name}</b><br/>${dept.location || ''}`);
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="h-14 px-4 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center gap-3 z-10">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-[#2A2A2A] text-white transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-semibold text-base">Campus Map</h2>
          <p className="text-[11px] text-neutral-400">Mangalagangotri, Konaje</p>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Info card */}
        <div className="absolute left-4 right-4 bottom-5 z-20 pointer-events-auto">
          <div className="bg-[#1A1A1A]/95 backdrop-blur-md p-4 rounded-2xl border border-[#2A2A2A] shadow-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-[#10A37F] shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-300 leading-relaxed">
              Showing the general campus location only — specific building pins (departments, hostels, offices) will appear here once verified GPS coordinates are registered in the administration panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
