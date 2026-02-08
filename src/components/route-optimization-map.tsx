'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck } from 'lucide-react';

interface RouteOptimizationMapProps {
  optimizationData: any;
  drivers: any[];
}

export default function RouteOptimizationMap({ optimizationData, drivers }: RouteOptimizationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Fix default icon issue
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const depotPosition: [number, number] = [9.033, 38.750];
    
    // Create map
    const map = L.map(mapContainerRef.current).setView(depotPosition, 12);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Create a layer group for all our markers and lines
    const layerGroup = L.layerGroup().addTo(map);
    
    mapRef.current = map;
    layerGroupRef.current = layerGroup;
    setIsReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Sync Layers
  useEffect(() => {
    console.log('Map Sync Effect:', { isReady, hasMap: !!mapRef.current, hasData: !!optimizationData });
    
    if (!isReady || !mapRef.current || !layerGroupRef.current || !optimizationData) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();
    
    const bounds: L.LatLngExpression[] = [];
    const depotPosition: [number, number] = [9.033, 38.750];
    bounds.push(depotPosition);

    console.log('Rendering clusters:', optimizationData.clusters?.length || 0);
    console.log('Rendering unclustered:', optimizationData.unclusteredOrders?.length || 0);

    if ((!optimizationData.clusters || optimizationData.clusters.length === 0) && 
        (!optimizationData.unclusteredOrders || optimizationData.unclusteredOrders.length === 0)) {
      console.log('Map View: No cluster or order data to display. Only showing Depot.');
    }

    // Helper for valid coords
    const isValid = (lat: any, lng: any) => {
      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      return !isNaN(pLat) && !isNaN(pLng) && pLat !== 0;
    };

    // 1. Add Depot Marker
    L.marker(depotPosition, {
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="background-color: #4f46e5; width: 100%; height: 100%; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4); display: flex; items-center; justify-content: center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    })
    .bindPopup(`
      <div style="padding: 8px; font-family: sans-serif;">
        <div style="font-weight: 800; color: #4338ca; font-size: 14px; margin-bottom: 2px;">Main Factory Depot</div>
        <div style="font-size: 11px; color: #6b7280; font-weight: 500;">Central Distribution Point</div>
      </div>
    `)
    .addTo(layerGroup);

    // 2. Render Clusters
    const clusterColors = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    
    optimizationData.clusters?.forEach((cluster: any, idx: number) => {
      const color = clusterColors[idx % clusterColors.length];
      
      // Order Markers
      cluster.orderDetails?.forEach((order: any) => {
        if (isValid(order.latitude, order.longitude)) {
          const pLat = parseFloat(order.latitude);
          const pLng = parseFloat(order.longitude);
          
          L.marker([pLat, pLng], {
            icon: L.divIcon({
              className: 'order-icon',
              html: `
                <div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 10px; font-weight: 900;">${idx + 1}</span>
                </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          })
          .bindPopup(`
            <div style="width: 220px; font-family: ui-sans-serif, system-ui; padding: 12px; border-radius: 12px; background: white;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700;">ROUTE ${idx + 1}</span>
                <span style="font-size: 10px; color: #9ca3af; font-family: monospace;">#${String(order.id).substring(0, 8)}</span>
              </div>
              <div style="font-weight: 800; color: #111827; font-size: 14px; margin-bottom: 4px; line-height: 1.2;">${order.customerName}</div>
              <div style="font-size: 11px; color: #4b5563; margin-bottom: 12px; display: flex; align-items: start; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>${order.deliveryAddress}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f3f4f6; padding-top: 8px;">
                <div style="font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Value</div>
                <div style="font-size: 14px; font-weight: 800; color: #059669;">ETB ${Number(order.totalAmount).toLocaleString()}</div>
              </div>
            </div>
          `, { className: 'custom-popup', maxWidth: 300 })
          .addTo(layerGroup);
          bounds.push([pLat, pLng]);
        }
      });

      // Cluster Route
      if (cluster.optimizedSequence?.length > 0) {
        const points = cluster.optimizedSequence
          .filter((p: any) => isValid(p.lat, p.lng))
          .map((p: any) => [parseFloat(p.lat), parseFloat(p.lng)]);
        
        if (points.length > 0) {
          // Main route (Milk Run) - only if > 1 point
          if (points.length > 1) {
            L.polyline(points, { 
              color, 
              weight: 5, 
              opacity: 0.7, 
              lineJoin: 'round',
              lineCap: 'round',
            }).addTo(layerGroup);
          }
          
          // Outbound Path (Shop to first order)
          L.polyline([depotPosition, points[0]], { 
            color, 
            weight: 3, 
            opacity: 0.5 
          }).addTo(layerGroup);

          // Return Leg (Last order to Shop) - Dashed
          L.polyline([points[points.length - 1], depotPosition], { 
            color, 
            weight: 2, 
            dashArray: '10, 10', 
            opacity: 0.3 
          }).addTo(layerGroup);
          
          points.forEach((p: any) => bounds.push(p as L.LatLngExpression));
        }
      }
    });

    // 3. Unclustered Orders
    optimizationData.unclusteredOrders?.forEach((order: any) => {
      if (isValid(order.latitude, order.longitude)) {
        const pLat = parseFloat(order.latitude);
        const pLng = parseFloat(order.longitude);
        L.marker([pLat, pLng], {
          icon: L.divIcon({
            className: 'unclustered-icon',
            html: `
              <div style="background-color: #9ca3af; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
                <span style="color: white; font-size: 8px;">?</span>
              </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        })
        .bindPopup(`
           <div style="padding: 8px; min-width: 150px;">
            <div style="font-weight: 700; color: #374151;">${order.customerName}</div>
            <div style="font-size: 10px; color: #6b7280; font-style: italic; margin-top: 4px;">Standalone - No cluster found</div>
           </div>
        `)
        .addTo(layerGroup);
        bounds.push([pLat, pLng]);
      }
    });

    // 4. Drivers
    drivers?.forEach(driver => {
      // API uses current_location (underscore)
      const loc = driver.current_location || driver.currentLocation;
      if (driver.status === 'busy' && loc && isValid(loc.lat, loc.lng)) {
        const dLat = parseFloat(loc.lat);
        const dLng = parseFloat(loc.lng);
        L.marker([dLat, dLng], {
          icon: L.divIcon({
            className: 'driver-icon',
            html: `<div style="background-color: #3b82f6; width: 100%; height: 100%; border-radius: 3px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                  </div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        })
        .bindPopup(`<div style="font-weight: 700;">${driver.first_name} ${driver.last_name}</div><div style="font-size: 11px; color: #3b82f6; font-weight: 600;">IN TRANSIT</div>`)
        .addTo(layerGroup);
        bounds.push([dLat, dLng]);
      }
    });

    // Fit bounds if we have points
    if (bounds.length > 0 && mapRef.current) {
      console.log('Fitting bounds to', bounds.length, 'points');
      try {
        const latLngBounds = L.latLngBounds(bounds as L.LatLngExpression[]);
        if (latLngBounds.isValid()) {
          mapRef.current.fitBounds(latLngBounds, { padding: [50, 50], maxZoom: 15 });
        }
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    }

  }, [isReady, optimizationData, drivers]);

  return (
    <div className="relative h-full w-full">
      <div 
        ref={mapContainerRef} 
        className="h-full w-full rounded-xl overflow-hidden shadow-inner border border-gray-100"
        style={{ minHeight: '400px', backgroundColor: '#f9fafb' }}
      />
      {!optimizationData?.clusters?.length && !optimizationData?.unclusteredOrders?.length && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm pointer-events-none z-[1000]">
          <div className="bg-white p-4 rounded-lg shadow-lg text-center border">
            <p className="text-gray-600 font-medium">No active orders found in this area</p>
            <p className="text-xs text-gray-400 mt-1">Try increasing the clustering radius</p>
          </div>
        </div>
      )}
    </div>
  );
}

