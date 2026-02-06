"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  shopLocation?: { lat: number; lng: number; name: string } | null;
  userLocation?: { lat: number; lng: number } | null;
  routePoints?: [number, number][]; 
  distance?: number;
  routingStatus?: "pending" | "road" | "straight" | "error";
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
  isSelected?: boolean;
}

export default function LocationMap({ 
    shopLocation, 
    userLocation, 
    routePoints, 
    distance, 
    routingStatus, 
    onLocationSelect, 
    className,
    isSelected = true 
}: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const shopMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const mapKey = useRef<string>('map-' + Date.now());

  // Reset map key on unmount to ensure clean state
  useEffect(() => {
    return () => {
      mapKey.current = 'map-' + Date.now();
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    // Check if map already exists or container not ready
    if (!containerRef.current || mapRef.current) {
      return;
    }

    // Additional safety check to ensure container is not already initialized
    if (containerRef.current.querySelector('.leaflet-container')) {
      console.warn('Map container already has leaflet map initialized');
      return;
    }

    try {
      const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true
      }).setView([9.0192, 38.7525], 13);
      
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      map.on('click', (e) => {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
      });

      const resizeObserver = new ResizeObserver(() => {
          if (mapRef.current && typeof window !== 'undefined') {
              mapRef.current.invalidateSize();
          }
      });
      
      if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
      }

      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
        resizeObserver.disconnect();
        
        if (mapRef.current) {
            const mapInstance = mapRef.current;
            mapRef.current = null; // Clear ref immediately
            
            // Use setTimeout to ensure we're not in the middle of a render cycle
            setTimeout(() => {
              try {
                mapInstance.off();
                mapInstance.remove();
              } catch (e) {
                console.warn("Error during map removal:", e);
              }
            }, 0);
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      // Clear the ref if initialization failed
      mapRef.current = null;
    }
  }, [onLocationSelect]);

  // Update Markers and Polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // --- BOLD ICONS AT PATH ENDPOINTS ---
    
    // BOLD SHOP ICON (Red Square with Shop/Factory)
    // Dynamic color based on isSelected
    const shopBGColor = isSelected ? '#be123c' : '#f97316'; // rose-700 : orange-500
    
    const boldShopIcon = L.divIcon({
      html: `
        <div class="flex flex-col items-center">
            <div class="relative w-12 h-12 rounded-xl border-[4px] border-white shadow-[0_8px_20px_rgba(0,0,0,0.3)] flex items-center justify-center z-50 transition-colors duration-300" style="background-color: ${shopBGColor}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <div class="w-3 h-3 rotate-45 -mt-2 border-r-[4px] border-b-[4px] border-white z-40 transition-colors duration-300" style="background-color: ${shopBGColor}"></div>
        </div>
      `,
      className: '',
      iconSize: [48, 56],
      iconAnchor: [24, 56],
      popupAnchor: [0, -56]
    });

    // BOLD CUSTOMER ICON (Blue Circle with Destination)
    const boldCustomerIcon = L.divIcon({
      html: `
        <div class="flex flex-col items-center custom-bounce">
            <div class="relative w-12 h-12 bg-blue-600 rounded-full border-[4px] border-white shadow-[0_8px_20px_rgba(0,0,0,0.3)] flex items-center justify-center z-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div class="w-3 h-3 bg-blue-600 rotate-45 -mt-2 border-r-[4px] border-b-[4px] border-white z-40"></div>
        </div>
        <style>
          @keyframes custom-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .custom-bounce { animation: custom-bounce 1.5s infinite ease-in-out; }
        </style>
      `,
      className: '',
      iconSize: [48, 56],
      iconAnchor: [24, 56],
      popupAnchor: [0, -56]
    });

    // Place Markers DIRECTLY on the coordinate points of the path
    if (shopLocation) {
      const shopPos: L.LatLngExpression = [shopLocation.lat, shopLocation.lng];
      if (!shopMarkerRef.current) {
        shopMarkerRef.current = L.marker(shopPos, { icon: boldShopIcon, zIndexOffset: 100 }).addTo(map);
      } else {
        shopMarkerRef.current.setLatLng(shopPos).setIcon(boldShopIcon);
      }
    }

    if (userLocation) {
      const userPos: L.LatLngExpression = [userLocation.lat, userLocation.lng];
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userPos, { 
          icon: boldCustomerIcon,
          draggable: true,
          zIndexOffset: 1000
        }).addTo(map);
        
        userMarkerRef.current.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng();
          onLocationSelect(lat, lng);
        });
      } else {
        userMarkerRef.current.setLatLng(userPos).setIcon(boldCustomerIcon);
      }
    }

    // Polyline Management
    if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
    }

    let points: L.LatLngExpression[] = [];
    if (routePoints && routePoints.length > 1) {
        points = routePoints;
    } else if (shopLocation && userLocation) {
        points = [[shopLocation.lat, shopLocation.lng], [userLocation.lat, userLocation.lng]];
    }

    if (points.length >= 2) {
      polylineRef.current = L.polyline(points, { 
        color: routingStatus === 'road' ? '#2563eb' : '#94a3b8',
        weight: 10,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: routingStatus === 'road' ? '' : '10, 10'
      }).addTo(map);

      try {
        const bounds = L.latLngBounds(points);
        if (bounds.isValid() && mapRef.current) {
            // Disable animation for fitBounds to avoid the "Cannot read properties of undefined (reading '_leaflet_pos')" error
            // This error typically happens during zoom transitions when the map is undergoing rapid updates or removal
            map.fitBounds(bounds, { padding: [80, 80], animate: false });
        }
      } catch (e) {
        console.error("FitBounds error:", e);
      }
    }

  }, [shopLocation, userLocation, routePoints, routingStatus, onLocationSelect, isSelected]);

  return (
    <div className={className || "relative h-[480px] w-full rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-100"}>
      <div key={mapKey.current} ref={containerRef} style={{ height: "100%", width: "100%" }} />
      
      {/* HUD Overlays */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-3">
      </div>

      {distance && distance > 0 && (
          <div className={`absolute top-6 right-6 z-[1000] text-white px-6 py-3 rounded-2xl shadow-2xl font-black border-[3px] border-white/40 text-xl flex flex-col items-center ${routingStatus === 'road' ? 'bg-blue-600' : 'bg-slate-700'}`}>
              <span className="text-[10px] opacity-70 font-bold uppercase tracking-tighter mb-0.5">EST. DISTANCE</span>
              <span>{distance.toFixed(1)} KM</span>
          </div>
      )}

      {/* Helper Footer */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-xl px-10 py-3 rounded-full text-xs text-center border-2 border-white/50 shadow-2xl text-slate-700 font-extrabold whitespace-nowrap">
        Tap the map or drag the <span className="text-blue-600">Blue Pin</span> to choose delivery spot
      </div>
    </div>
  );
}
