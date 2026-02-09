'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMultiPointRoute, getStraightLineRoute, getRoadRoute, RoutePoint, RouteGeometry } from '@/lib/road-routing';
import { Truck, MapPin, Package, Clock } from 'lucide-react';

interface DriverMapProps {
  driverLocation?: { lat: number; lng: number };
  pickupLocation?: { lat: number; lng: number; name: string };
  deliveryLocation?: { lat: number; lng: number; name: string };
  secondaryDeliveryLocation?: { lat: number; lng: number; name: string };
  vehicleType?: 'motorbike' | 'car' | 'van' | 'truck';
}

const DriverMap: React.FC<DriverMapProps> = ({ 
  driverLocation, 
  pickupLocation, 
  deliveryLocation,
  secondaryDeliveryLocation,
  vehicleType = 'car'
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const layerGroupsRef = useRef<{
    routeGroup: L.LayerGroup | null;
    markerGroup: L.LayerGroup | null;
  }>({ routeGroup: null, markerGroup: null });

  // Initialize map
  useEffect(() => {
    // Initialize mounted ref
    isMountedRef.current = true;

    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
        dragging: true
      }).setView([9.033, 38.750], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapRef.current = map;

      // Ensure map resizes correctly
      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
      
      // Store observer for cleanup
      // @ts-ignore
      map._resizeObserver = resizeObserver;

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      isMountedRef.current = false;
      
      // Clean up resize observer
      if (mapRef.current && (mapRef.current as any)._resizeObserver) {
        (mapRef.current as any)._resizeObserver.disconnect();
      }

      // Clean up all layer groups
      if (layerGroupsRef.current.routeGroup) {
        layerGroupsRef.current.routeGroup.clearLayers();
        layerGroupsRef.current.routeGroup = null;
      }
      if (layerGroupsRef.current.markerGroup) {
        layerGroupsRef.current.markerGroup.clearLayers();
        layerGroupsRef.current.markerGroup = null;
      }
      
      // Clean up polyline
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      
      // Clean up map
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('Error removing map:', error);
        }
        mapRef.current = null;
      }
    };
  }, []);

  // Handle road routing separately
  useEffect(() => {
    if (!mapRef.current || !pickupLocation || !deliveryLocation) return;
    
    // Check if component is still mounted
    if (!isMountedRef.current) return;
    
    const map = mapRef.current;
    
    // Create or get route layer group
    if (!layerGroupsRef.current.routeGroup) {
      layerGroupsRef.current.routeGroup = L.layerGroup().addTo(map);
    }
    const layerGroup = layerGroupsRef.current.routeGroup;
    
    const drawRoadRoute = async () => {
      // Double-check component is still mounted before async operation
      if (!isMountedRef.current) return;
      
      let routeCoordinates: [number, number][] = [];
      let roadRoute: RouteGeometry | null = null;
      
      try {
        const points: RoutePoint[] = [];
        if (driverLocation) {
          points.push({ lat: driverLocation.lat, lng: driverLocation.lng });
        }
        if (pickupLocation) points.push({ lat: pickupLocation.lat, lng: pickupLocation.lng });
        if (deliveryLocation) points.push({ lat: deliveryLocation.lat, lng: deliveryLocation.lng });
        if (secondaryDeliveryLocation) points.push({ lat: secondaryDeliveryLocation.lat, lng: secondaryDeliveryLocation.lng });

        if (points.length >= 2) {
          roadRoute = await getMultiPointRoute(points);
          if (roadRoute) {
            routeCoordinates = roadRoute.coordinates;
          } else {
            // Fallback to straight lines
            routeCoordinates = points.map(p => [p.lat, p.lng] as [number, number]);
          }
        }
        
        // Check if component is still mounted after async operations
        if (!isMountedRef.current || routeCoordinates.length === 0) return;
        
        // Clear existing polylines
        layerGroup.clearLayers();
        
        // Draw route with multiple layers for visibility
        // Background shadow
        L.polyline(routeCoordinates, {
          color: '#1e40af', weight: 12, opacity: 0.3, lineCap: 'round', lineJoin: 'round'
        }).addTo(layerGroup);
        
        // Main route line
        polylineRef.current = L.polyline(routeCoordinates, {
          color: '#3b82f6', weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round'
        }).addTo(layerGroup);
        
        // Dashed overlay
        L.polyline(routeCoordinates, {
          color: '#ffffff', weight: 2, opacity: 0.7, dashArray: '8, 12', lineCap: 'round'
        }).addTo(layerGroup);

        // Add distance labels on the line if legs are available
        if (roadRoute && roadRoute.legs) {
          roadRoute.legs.forEach((leg: any, legIdx: number) => {
            const distKm = (leg.distance / 1000).toFixed(1);
            if (parseFloat(distKm) > 0.1) {
              const startIdx = Math.min(legIdx, routeCoordinates.length - 2);
              const midLat = (routeCoordinates[startIdx][0] + routeCoordinates[startIdx+1][0]) / 2;
              const midLng = (routeCoordinates[startIdx][1] + routeCoordinates[startIdx+1][1]) / 2;

              L.marker([midLat, midLng], {
                icon: L.divIcon({
                  className: 'route-dist-marker',
                  html: `
                    <div style="background: white; border: 2px solid #3b82f6; border-radius: 20px; padding: 2px 8px; font-size: 10px; font-weight: 900; color: #3b82f6; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 4px; border-radius: 20px; white-space: nowrap;">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      ${distKm} KM
                    </div>`,
                  iconSize: [60, 20],
                  iconAnchor: [30, 10]
                })
              }).addTo(layerGroup);

              if (legIdx === 0) {
                L.marker([midLat, midLng], {
                  icon: L.divIcon({
                    className: 'next-pulse',
                    html: `
                      <div class="relative flex items-center justify-center">
                        <div class="absolute -top-10 bg-slate-900 shadow-xl text-white text-[9px] font-black px-3 py-1 rounded-full border border-white/20 whitespace-nowrap animate-bounce">
                           NEXT STOP
                        </div>
                      </div>`,
                    iconSize: [80, 20],
                    iconAnchor: [40, 20]
                  })
                }).addTo(layerGroup);
              }
            }
          });
        }
        
      } catch (error) {
        console.warn('Road routing failed, using straight line:', error);
        if (!isMountedRef.current) return;
        
        let fallbackPoints: [number, number][] = [];
        if (driverLocation) fallbackPoints.push([driverLocation.lat, driverLocation.lng]);
        if (pickupLocation) fallbackPoints.push([pickupLocation.lat, pickupLocation.lng]);
        if (deliveryLocation) fallbackPoints.push([deliveryLocation.lat, deliveryLocation.lng]);
        
        layerGroup.clearLayers();
        L.polyline(fallbackPoints, { color: '#1e40af', weight: 6, opacity: 0.5, dashArray: '5, 10' }).addTo(layerGroup);
      }
    };
    
    drawRoadRoute();
  }, [pickupLocation, deliveryLocation, driverLocation, secondaryDeliveryLocation]);

  // Handle map markers
  useEffect(() => {
    if (!mapRef.current) return;
    if (!isMountedRef.current) return;

    const map = mapRef.current;
    if (!layerGroupsRef.current.markerGroup) {
      layerGroupsRef.current.markerGroup = L.layerGroup().addTo(map);
    }
    const layerGroup = layerGroupsRef.current.markerGroup;
    layerGroup.clearLayers();

    const bounds: [number, number][] = [];

    if (driverLocation) {
      const getVehicleContent = (type: string) => {
        switch (type) {
          case 'motorbike': return '🏍️';
          case 'car': return '🚗';
          case 'van': return '🚐';
          case 'truck': return '🚚';
          default: return '🚗';
        }
      };

      const driverIcon = L.divIcon({
        className: 'custom-driver-marker',
        html: `
          <div class="flex flex-col items-center">
            <div class="relative">
              <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.3)] border-[3px] border-blue-600 z-10 transition-transform duration-300 hover:scale-110">
                <span class="text-2xl">${getVehicleContent(vehicleType)}</span>
              </div>
              <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse z-20"></div>
            </div>
            <div class="mt-1.5 px-2 py-0.5 bg-blue-600 text-[10px] font-black text-white rounded-md shadow-sm uppercase tracking-tighter">
              DRIVER
            </div>
          </div>
        `,
        iconSize: [48, 65],
        iconAnchor: [24, 65],
      });

      L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon, zIndexOffset: 2000 })
        .addTo(layerGroup)
        .bindPopup(`<b>Driver Location</b><br>Currently in ${vehicleType}`);

      bounds.push([driverLocation.lat, driverLocation.lng]);
    }

    if (pickupLocation) {
      const shopIcon = L.divIcon({
        className: 'custom-shop-marker',
        html: `
          <div class="flex flex-col items-center">
            <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-green-500">
              <img src="/logo.png" alt="Shop" class="w-8 h-8 object-contain" />
            </div>
            <div class="mt-1 text-xs font-semibold text-green-600 bg-white px-2 py-1 rounded shadow max-w-24 text-center truncate">
              ${pickupLocation.name}
            </div>
          </div>
        `,
        iconSize: [48, 68],
        iconAnchor: [24, 68],
      });

      L.marker([pickupLocation.lat, pickupLocation.lng], { icon: shopIcon })
        .addTo(layerGroup)
        .bindPopup(`<b>Pickup Location</b><br>${pickupLocation.name}`);

      bounds.push([pickupLocation.lat, pickupLocation.lng]);
    }

    if (deliveryLocation) {
      const deliveryIcon = L.divIcon({
        className: 'custom-delivery-marker',
        html: `
          <div class="flex flex-col items-center">
            <div class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div class="mt-1 text-xs font-semibold text-red-500 bg-white px-2 py-1 rounded shadow">
              Delivery
            </div>
          </div>
        `,
        iconSize: [40, 60],
        iconAnchor: [20, 60],
      });

      L.marker([deliveryLocation.lat, deliveryLocation.lng], { icon: deliveryIcon })
        .addTo(layerGroup)
        .bindPopup(`<b>Delivery Location</b><br>Destination`);

      bounds.push([deliveryLocation.lat, deliveryLocation.lng]);
    }

    if (secondaryDeliveryLocation) {
      const secondaryIcon = L.divIcon({
        className: 'custom-delivery-marker-secondary',
        html: `
          <div class="flex flex-col items-center opacity-70">
            <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <span class="text-white text-xs font-bold">2</span>
            </div>
            <div class="mt-1 text-[10px] font-bold text-orange-600 bg-white px-1.5 py-0.5 rounded shadow">
              Next Stop
            </div>
          </div>
        `,
        iconSize: [32, 50],
        iconAnchor: [16, 50],
      });

      L.marker([secondaryDeliveryLocation.lat, secondaryDeliveryLocation.lng], { icon: secondaryIcon })
        .addTo(layerGroup)
        .bindPopup(`<b>Secondary Destination</b><br>${secondaryDeliveryLocation.name}`);

      bounds.push([secondaryDeliveryLocation.lat, secondaryDeliveryLocation.lng]);
    }
    
    if (bounds.length > 0) {
      setTimeout(() => {
        if (isMountedRef.current && mapRef.current) {
          try {
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          } catch (error) {
            console.warn('Error fitting bounds:', error);
          }
        }
      }, 100);
    }
  }, [driverLocation, pickupLocation, deliveryLocation, secondaryDeliveryLocation, vehicleType]);

  return (
    <div className="relative w-full h-full rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-50 group">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
      />
      
      {/* Premium HUD Overlay - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 shadow-lg flex items-center gap-2 transform transition-all hover:scale-105">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-700 tracking-wider">LIVE TELEMETRY</span>
            </div>
      </div>

      {/* Helper Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-xl px-6 py-2 rounded-full text-[10px] text-center border-2 border-white/50 shadow-2xl text-slate-700 font-extrabold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Tracking active assignments and real-time GPS position
      </div>
    </div>
  );
};

export default DriverMap;