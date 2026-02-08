'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DriverMapProps {
  driverLocation?: { lat: number; lng: number };
  pickupLocation?: { lat: number; lng: number; name: string };
  deliveryLocation?: { lat: number; lng: number; name: string };
}

export default function DriverMap({ driverLocation, pickupLocation, deliveryLocation }: DriverMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Fix leaflet icons
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapContainerRef.current).setView([9.033, 38.750], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    // Driver Location
    if (driverLocation) {
      const dLat = driverLocation.lat;
      const dLng = driverLocation.lng;
      L.marker([dLat, dLng], {
        icon: L.divIcon({
          className: 'driver-icon',
          html: `<div style="background-color: #3b82f6; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);">
                  <svg style="margin:2px;" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                 </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).bindPopup("You are here").addTo(layerGroup);
      bounds.push([dLat, dLng]);
    }

    // Pickup Location
    if (pickupLocation) {
      const pLat = pickupLocation.lat;
      const pLng = pickupLocation.lng;
      L.marker([pLat, pLng], {
        icon: L.divIcon({
          className: 'pickup-icon',
          html: `<div style="background-color: #10b981; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [20, 20]
        })
      }).bindPopup(`<b>Pickup:</b> ${pickupLocation.name}`).addTo(layerGroup);
      bounds.push([pLat, pLng]);
    }

    // Delivery Location
    if (deliveryLocation) {
      const dLat = deliveryLocation.lat;
      const dLng = deliveryLocation.lng;
      L.marker([dLat, dLng], {
        icon: L.divIcon({
          className: 'delivery-icon',
          html: `<div style="background-color: #ef4444; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [20, 20]
        })
      }).bindPopup(`<b>Deliver To:</b> ${deliveryLocation.name}`).addTo(layerGroup);
      bounds.push([dLat, dLng]);
    }

    // Draw lines
    if (pickupLocation && deliveryLocation) {
       L.polyline([[pickupLocation.lat, pickupLocation.lng], [deliveryLocation.lat, deliveryLocation.lng]], {
         color: '#6366f1',
         weight: 4,
         opacity: 0.6,
         dashArray: '10, 10'
       }).addTo(layerGroup);
    }
    
    // Fit bounds
    if (bounds.length > 0) {
      const latLngBounds = L.latLngBounds(bounds);
      mapRef.current.fitBounds(latLngBounds, { padding: [50, 50] });
    }

  }, [driverLocation, pickupLocation, deliveryLocation]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
}
