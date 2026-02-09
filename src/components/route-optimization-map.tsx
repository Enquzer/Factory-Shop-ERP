'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck } from 'lucide-react';
import { getMultiPointRoute, getRoadRoute } from '@/lib/road-routing';

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

    const syncMap = async () => {
      if (!mapRef.current || !layerGroupRef.current) return;

      const layerGroup = layerGroupRef.current;
      layerGroup.clearLayers();
      
      const bounds: L.LatLngExpression[] = [];
      const depotPosition: [number, number] = [9.033, 38.750];
      bounds.push(depotPosition);

      // Helper for valid coords
      const isValid = (lat: any, lng: any) => {
        const pLat = parseFloat(lat);
        const pLng = parseFloat(lng);
        return !isNaN(pLat) && !isNaN(pLng) && pLat !== 0;
      };

      // 1. Add Depot Marker (Dispatch Center)
      L.marker(depotPosition, {
        zIndexOffset: 1500,
        icon: L.divIcon({
          className: 'depot-icon-premium',
          html: `
            <div class="flex flex-col items-center">
              <div style="background-color: white; width: 48px; height: 48px; border-radius: 50%; border: 4px solid #4f46e5; box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                 <img src="/logo.png" alt="Depot" style="width: 32px; height: 32px; object-contain;" />
                 <div style="position: absolute; bottom: 0; left: 0; right: 0; background: #4f46e5; color: white; font-size: 7px; font-weight: 900; text-align: center; padding: 1px 0;">HUB</div>
              </div>
              <div style="margin-top: 4px; background: white; padding: 2px 8px; border-radius: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); font-size: 9px; font-weight: 800; color: #4f46e5; border: 1px solid #eef2ff; white-space: nowrap;">
                DISPATCH CENTER
              </div>
            </div>`,
          iconSize: [48, 70],
          iconAnchor: [24, 48]
        })
      })
      .bindPopup(`
        <div style="padding: 12px; font-family: sans-serif; min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <img src="/logo.png" style="width: 24px; height: 24px;" />
            <div style="font-weight: 900; color: #4338ca; font-size: 15px;">Main Factory Depot</div>
          </div>
          <div style="font-size: 11px; color: #6b7280; font-weight: 500; line-height: 1.4;">Central Distribution Point for all eCommerce orders. All routes start and end here.</div>
        </div>
      `)
      .addTo(layerGroup);

      // 2. Render Clusters
      const clusterColors = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
      
      if (optimizationData.clusters?.length > 0) {
        const clusterPromises = optimizationData.clusters.map(async (cluster: any, idx: number) => {
          const color = clusterColors[idx % clusterColors.length];
          
          // Order Markers with Sequence Numbers
          cluster.orderDetails?.forEach((order: any, orderIdx: number) => {
            if (isValid(order.latitude, order.longitude)) {
              const pLat = parseFloat(order.latitude);
              const pLng = parseFloat(order.longitude);
              
              L.marker([pLat, pLng], {
                icon: L.divIcon({
                  className: 'order-icon-premium',
                  html: `
                    <div class="flex flex-col items-center">
                      <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 15px ${color}60; display: flex; align-items: center; justify-content: center; position: relative; transition: all 0.3s ease;">
                        <span style="color: white; font-size: 14px; font-weight: 900;">${orderIdx + 1}</span>
                        <div style="position: absolute; -top: -10px; background: #1e293b; color: white; font-size: 8px; font-weight: 900; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); white-space: nowrap; text-transform: uppercase;">Stop ${orderIdx + 1}</div>
                      </div>
                      <div style="width: 2px; height: 6px; background: ${color}; margin-top: -2px;"></div>
                    </div>`,
                  iconSize: [32, 45],
                  iconAnchor: [16, 32]
                })
              })
              .bindPopup(`
                <div style="width: 250px; font-family: ui-sans-serif, system-ui; padding: 16px; border-radius: 20px; background: white; border: 1px solid #f1f5f9; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="background: ${color}; color: white; width: 24px; height: 24px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900;">${orderIdx + 1}</div>
                      <div style="display: flex; flex-col; gap: 0;">
                        <span style="color: ${color}; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">STOP ${orderIdx + 1}</span>
                        <span style="color: #64748b; font-size: 9px; font-weight: 700; text-transform: uppercase;">CLUSTER ROUTE ${idx + 1}</span>
                      </div>
                    </div>
                    <span style="font-size: 10px; color: #94a3b8; font-family: monospace; background: #f8fafc; padding: 2px 6px; border-radius: 4px;">#${String(order.id || '').substring(0, 8)}</span>
                  </div>
                  <div style="font-weight: 900; color: #0f172a; font-size: 16px; margin-bottom: 8px; line-height: 1.2;">${order.customerName}</div>
                  <div style="font-size: 12px; color: #475569; margin-bottom: 16px; display: flex; align-items: start; gap: 8px; line-height: 1.5;">
                    <div style="background: ${color}10; color: ${color}; padding: 4px; border-radius: 6px; margin-top: 2px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </div>
                    <span>${order.deliveryAddress}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                    <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">EST. Order Value</div>
                    <div style="font-size: 16px; font-weight: 900; color: #059669;">ETB ${Number(order.totalAmount || 0).toLocaleString()}</div>
                  </div>
                </div>
              `, { className: 'premium-map-popup', maxWidth: 350 })
              .addTo(layerGroup);
              bounds.push([pLat, pLng]);
            }
          });

          // Cluster Route (Road-following Milk Run Path)
          if (cluster.orders?.length > 0) {
            const orderPoints = cluster.orders
              .filter((p: any) => isValid(p.lat, p.lng))
              .map((p: any) => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));
            
            if (orderPoints.length > 0) {
              const fullPathCoords = [
                { lat: depotPosition[0], lng: depotPosition[1] },
                ...orderPoints,
                { lat: depotPosition[0], lng: depotPosition[1] }
              ];

              try {
                const route = await getMultiPointRoute(fullPathCoords);

                if (route && route.coordinates?.length > 0) {
                  const routeCoords = route.coordinates;
                  
                  // 1. Ultra-Bold Road Path with Glow
                  L.polyline(routeCoords, { color, weight: 22, opacity: 0.12, lineJoin: 'round', lineCap: 'round' }).addTo(layerGroup);
                  L.polyline(routeCoords, { color, weight: 12, opacity: 0.85, lineJoin: 'round', lineCap: 'round' }).addTo(layerGroup);
                  L.polyline(routeCoords, { color: 'white', weight: 2, opacity: 0.4, dashArray: '10, 20', lineJoin: 'round', lineCap: 'round' }).addTo(layerGroup);

                  // 2. Distance Labels & NEXT indicators
                  if (route.legs) {
                    route.legs.forEach((leg: any, legIdx: number) => {
                      const distKm = (leg.distance / 1000).toFixed(1);
                      if (parseFloat(distKm) > 0.1) {
                         const startPoint = fullPathCoords[legIdx];
                         const endPoint = fullPathCoords[legIdx + 1];
                         const midLat = (startPoint.lat + endPoint.lat) / 2;
                         const midLng = (startPoint.lng + endPoint.lng) / 2;

                         L.marker([midLat, midLng], {
                           icon: L.divIcon({
                             className: 'leg-dist-marker',
                             html: `
                               <div style="background: white; border: 2px solid ${color}; border-radius: 20px; padding: 2px 8px; font-size: 10px; font-weight: 900; color: ${color}; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 4px; transform: scale(0.9);">
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
                                className: 'next-tag-marker',
                                html: `<div style="background: #1e293b; color: white; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 900; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transform: translateY(-22px) rotate(-5deg);">NEXT</div>`,
                                iconSize: [50, 20],
                                iconAnchor: [25, 20]
                              })
                            }).addTo(layerGroup);
                         }
                      }
                    });
                  }
                  
                  routeCoords.forEach((p: any) => bounds.push(p as L.LatLngExpression));
                }
              } catch (err) {
                console.warn('Routing failed, using fallback:', err);
                const straightPoints = fullPathCoords.map(p => [p.lat, p.lng] as any);
                L.polyline(straightPoints, { color, weight: 10, opacity: 0.7, dashArray: '5, 10' }).addTo(layerGroup);
              }
            }
          }
        });
        await Promise.all(clusterPromises);
      }

    // 3. Unclustered Orders (Pending, but not near others)
    optimizationData.unclusteredOrders?.forEach((order: any) => {
      if (isValid(order.latitude, order.longitude)) {
        const pLat = parseFloat(order.latitude);
        const pLng = parseFloat(order.longitude);
        L.marker([pLat, pLng], {
          icon: L.divIcon({
            className: 'unclustered-icon-premium',
            html: `
              <div style="background-color: #f8fafc; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        })
        .bindPopup(`
           <div style="padding: 12px; min-width: 200px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 800;">PENDING - SOLITARY</span>
              <span style="font-size: 9px; color: #9ca3af; font-family: monospace;">#${String(order.id).substring(0, 8)}</span>
            </div>
            <div style="font-weight: 800; color: #1e293b; font-size: 13px; margin-bottom: 4px;">${order.customerName}</div>
            <div style="font-size: 10px; color: #64748b; line-height: 1.4;">${order.deliveryAddress}</div>
            <div style="margin-top: 10px; font-size: 10px; color: #94a3b8; font-style: italic; border-top: 1px dashed #e2e8f0; pt-2;">This order is too far from others to be clustered effectively.</div>
           </div>
        `)
        .addTo(layerGroup);
        bounds.push([pLat, pLng]);
      }
    });

    // 4. Drivers
    drivers?.forEach(driver => {
      let loc = driver.current_location || driver.currentLocation;
      let hasGps = true;

      if (!loc || !isValid(loc.lat, loc.lng)) {
        loc = { lat: depotPosition[0], lng: depotPosition[1] };
        hasGps = false;
      }

      const dLat = parseFloat(loc.lat as any);
      const dLng = parseFloat(loc.lng as any);
      const vehicleType = driver.vehicle_type || 'car';
      const status = driver.status || 'available';
      
      const getVehicleContent = (type: string) => {
        switch (type) {
          case 'motorbike': return '🏍️';
          case 'car': return '🚗';
          case 'van': return '🚐';
          case 'truck': return '🚚';
          default: return '🚗';
        }
      };

      const statusColor = !hasGps ? '#94a3b8' : (status === 'available' ? '#10b981' : (status === 'busy' ? '#f59e0b' : '#9ca3af'));
      const borderColor = status === 'busy' ? '#4f46e5' : '#ffffff';

      const driverIcon = L.divIcon({
        className: 'driver-icon-premium',
        html: `
          <div class="flex flex-col items-center">
            <div class="relative group">
              <div style="background-color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid ${borderColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.25); position: relative; z-index: 10; ${!hasGps ? 'opacity: 0.6;' : ''}">
                <span style="font-size: 20px;">${getVehicleContent(vehicleType)}</span>
              </div>
              <div style="position: absolute; -top: 2px; -right: 2px; width: 12px; height: 12px; background-color: ${statusColor}; border: 2px solid white; border-radius: 50%; z-index: 20; ${hasGps && (status === 'available' || status === 'busy') ? 'animation: pulse 2s infinite;' : ''}"></div>
              ${!hasGps ? '<div style="position: absolute; -bottom: -2px; -right: -2px; background: white; border-radius: 50%; padding: 1px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>' : ''}
            </div>
            <div style="background: ${borderColor}; color: white; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; margin-top: -6px; position: relative; z-index: 15; text-transform: uppercase; letter-spacing: -0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              ${driver.first_name || 'DRIVER'}
            </div>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 45]
      });

      const assignedOrders = driver.assigned_orders || driver.assignedOrders || [];
      
      // Render Active Delivery Markers for this driver
      assignedOrders.forEach((order: any) => {
        if (isValid(order.latitude, order.longitude)) {
          const oLat = parseFloat(order.latitude);
          const oLng = parseFloat(order.longitude);
          
          L.marker([oLat, oLng], {
            icon: L.divIcon({
              className: 'in-transit-order-icon',
              html: `
                <div style="background-color: #4f46e5; width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3); display: flex; align-items: center; justify-content: center; position: relative;">
                  <div style="position: absolute; inset: -4px; border: 2px solid #4f46e5; border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.5;"></div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          })
          .bindPopup(`
            <div style="padding: 10px; width: 220px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800;">IN TRANSIT</span>
                <span style="font-size: 10px; color: #9ca3af; font-family: monospace;">#${String(order.id || '').substring(0, 8)}</span>
              </div>
              <div style="font-weight: 800; color: #111827; font-size: 14px; margin-bottom: 4px;">${order.customerName}</div>
              <div style="font-size: 11px; color: #4b5563; margin-bottom: 12px;">Assigned to: <b>${driver.first_name} ${driver.last_name}</b></div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f3f4f6; padding-top: 8px;">
                <div style="font-size: 10px; font-weight: 600; color: #6b7280;">Value</div>
                <div style="font-size: 14px; font-weight: 800; color: #059669;">ETB ${Number(order.totalAmount || 0).toLocaleString()}</div>
              </div>
            </div>
          `)
          .addTo(layerGroup);
          // Only push order to bounds if driver has GPS, otherwise map might zoom out too much
          if (hasGps) bounds.push([oLat, oLng]);
          
          // Draw road route if we have GPS
          if (hasGps) {
            const drawActiveDeliveryPath = async () => {
              try {
                const route = await getRoadRoute({ lat: dLat, lng: dLng }, { lat: oLat, lng: oLng });
                
                if (route && route.coordinates?.length > 0) {
                  L.polyline(route.coordinates, {
                    color: '#4f46e5',
                    weight: 3,
                    opacity: 0.6,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: '1, 10'
                  }).addTo(layerGroup);
                }
              } catch (e) {
                // Final fallback if routing fails
                L.polyline([[dLat, dLng], [oLat, oLng]], {
                  color: '#4f46e5', weight: 2, opacity: 0.3, dashArray: '5, 10'
                }).addTo(layerGroup);
              }
            };
            drawActiveDeliveryPath();
          }
        }
      });

      const ordersHtml = assignedOrders.length > 0 
        ? `<div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
             <div style="font-size: 10px; font-weight: 800; color: #4f46e5; margin-bottom: 4px;">ACTIVE ASSIGNMENTS (${assignedOrders.length})</div>
             <div style="display: flex; flex-wrap: wrap; gap: 4px;">
               ${assignedOrders.map((order: any) => `<span style="background: #f3f4f6; padding: 1px 5px; border-radius: 3px; font-size: 9px; color: #374151; font-weight: 700;">#${String(order.id || '').substring(0, 8)}</span>`).join('')}
             </div>
           </div>`
        : `<div style="font-size: 10px; color: #9ca3af; margin-top: 4px; font-style: italic;">No active orders currently</div>`;

      L.marker([dLat, dLng], { icon: driverIcon, zIndexOffset: 2000 })
        .bindPopup(`
          <div style="width: 200px; padding: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="font-size: 24px;">${getVehicleContent(vehicleType)}</div>
              <div>
                <div style="font-weight: 900; font-size: 14px; color: #111827;">${driver.first_name} ${driver.last_name}</div>
                <div style="font-size: 10px; font-weight: 700; color: ${statusColor}; text-transform: uppercase;">${status} ${!hasGps ? '(NO GPS)' : ''}</div>
              </div>
            </div>
            ${!hasGps ? '<div style="background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; margin-bottom: 8px;">Waiting for first GPS signal...</div>' : ''}
            <div style="font-size: 11px; color: #6b7280; font-family: monospace;">${driver.licensePlate || 'N/A'} • ${driver.phone || 'No Phone'}</div>
            ${ordersHtml}
          </div>
        `)
        .addTo(layerGroup);
      
      if (hasGps) bounds.push([dLat, dLng]);
    });

      // 5. Fit bounds if we have points
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
    };

    syncMap();

  }, [isReady, optimizationData, drivers]);

  return (
    <div className="relative h-full w-full group">
      <div 
        ref={mapContainerRef} 
        className="h-full w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-50"
        style={{ minHeight: '500px' }}
      />
      
      {/* Premium HUD Overlay - Moved to bottom left to avoid covering zoom controls */}
      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-3">
        <div className="bg-white/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white shadow-xl flex items-center gap-3 transform transition-all hover:scale-105">
          <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 tracking-widest leading-none">REAL-TIME</span>
            <span className="text-sm font-black text-slate-800 tracking-tight">FLEET TELEMETRY</span>
          </div>
        </div>
      </div>

      {/* Stats HUD Overlay */}
      <div className="absolute bottom-6 right-6 z-[1000] bg-slate-900/90 backdrop-blur-xl px-6 py-4 rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-8 text-white transition-opacity duration-300 opacity-0 group-hover:opacity-100">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Drivers Active</span>
          <span className="text-xl font-black">{drivers?.filter(d => d.status !== 'offline').length || 0}</span>
        </div>
        <div className="w-px h-8 bg-white/10"></div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Orders Tracked</span>
          <span className="text-xl font-black">{(optimizationData?.clusters?.reduce((sum: number, c: any) => sum + c.orders.length, 0) || 0) + (optimizationData?.unclusteredOrders?.length || 0)}</span>
        </div>
      </div>
      
      {!optimizationData?.clusters?.length && !optimizationData?.unclusteredOrders?.length && drivers?.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm pointer-events-none z-[1000]">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center border-4 border-white">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Truck className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-xl font-black text-slate-800">No Fleet Activity Found</p>
            <p className="text-sm text-slate-400 mt-2">Initialize drivers or increase search radius</p>
          </div>
        </div>
      )}
    </div>
  );
}

