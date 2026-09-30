import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Footprints, MapPin } from 'lucide-react';
import L from 'leaflet';

interface MapScreenProps {
  lat: number;
  lng: number;
  locationName: string;
  onBack: () => void;
}

export const MapScreen: React.FC<MapScreenProps> = ({
  lat,
  lng,
  locationName,
  onBack,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Custom green location marker icon
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: radial-gradient(circle, #10A37F 0%, #1A7F64 100%);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          ">
            <div style="
              width: 10px;
              height: 10px;
              background: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: true,
      });

      const isLight = document.documentElement.classList.contains('light');
      const tileUrl = isLight
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      // CartoDB basemap
      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      L.marker([lat, lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`<b>${locationName}</b><br/>Mangalore University`)
        .openPopup();

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, locationName]);

  const handleStartExternalNavigation = () => {
    const webUri = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(webUri, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="h-14 px-4 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center gap-3 z-10">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-[#2A2A2A] text-white transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 truncate">
          <h2 className="font-semibold text-base truncate">{locationName}</h2>
          <p className="text-[11px] text-neutral-400">Embedded Campus Map</p>
        </div>
      </div>

      {/* Map element */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating bottom card */}
        <div className="absolute left-4 right-4 bottom-5 z-20 pointer-events-auto">
          <div className="bg-[#1A1A1A]/95 backdrop-blur-md p-4 rounded-2xl border border-[#2A2A2A] shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-11 h-11 rounded-full bg-gradient-to-b from-[#10A37F] to-[#1A7F64] flex items-center justify-center shrink-0 shadow-md">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="truncate">
                <p className="font-semibold text-sm text-white truncate">{locationName}</p>
                <p className="text-xs text-neutral-400">Konaje, Mangalagangotri</p>
              </div>
            </div>

            <button
              onClick={handleStartExternalNavigation}
              className="flex items-center gap-2 bg-[#10A37F] hover:bg-[#1A7F64] active:scale-95 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shrink-0"
            >
              <Footprints className="w-4 h-4" />
              <span>Navigate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
