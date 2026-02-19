"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const STATUS_COLORS = {
    AVAILABLE: "#009688",
    SOLD: "#ef4444",
    BLOCKED: "#FBB03B",
};

export default function LeafletMap({
    properties = [],
    onPropertyCreated,
    onPropertyClick,
    highlightPropertyId,
    isDrawing,
    setIsDrawing,
    drawColor = "#009688",
}) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(null);
    const drawControlRef = useRef(null);
    const polygonLayersRef = useRef({});
    const [mapReady, setMapReady] = useState(false);

    // Initialize map
    useEffect(() => {
        if (mapRef.current && !mapInstanceRef.current) {
            const map = L.map(mapRef.current, {
                center: [28.996119, 77.081654],  // Default center (Delhi)
                zoom: 13,
                zoomControl: true,
                attributionControl: true,
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 22,
            }).addTo(map);

            // Satellite layer option
            const satellite = L.tileLayer(
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                {
                    attribution: "&copy; Esri",
                    maxZoom: 22,
                }
            );

            const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 22,
            });

            L.control.layers(
                { Streets: streets.addTo(map), Satellite: satellite },
                {},
                { position: "topright" }
            ).addTo(map);

            // Drawn items layer
            const drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);
            drawnItemsRef.current = drawnItems;

            // Draw events
            map.on(L.Draw.Event.CREATED, (e) => {
                const layer = e.layer;
                const latlngs = layer.getLatLngs()[0];
                const coordinates = latlngs.map((ll) => [ll.lng, ll.lat]);
                // Close the polygon
                if (coordinates.length > 0) {
                    coordinates.push(coordinates[0]);
                }

                if (onPropertyCreated) {
                    onPropertyCreated(coordinates);
                }

                // Remove the temporary drawing
                // The actual polygon will be rendered from state after save
            });

            map.on(L.Draw.Event.DRAWSTART, () => { });
            map.on(L.Draw.Event.DRAWSTOP, () => {
                if (setIsDrawing) setIsDrawing(false);
            });

            mapInstanceRef.current = map;
            setMapReady(true);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                setMapReady(false);
            }
        };
    }, []);

    // Handle draw toggle
    useEffect(() => {
        if (!mapInstanceRef.current || !mapReady) return;

        const map = mapInstanceRef.current;

        if (isDrawing) {
            // Enable polygon drawing
            const drawHandler = new L.Draw.Polygon(map, {
                shapeOptions: {
                    color: drawColor,
                    weight: 3,
                    fillOpacity: 0.25,
                    fillColor: drawColor,
                },
                allowIntersection: false,
                showArea: true,
            });
            drawHandler.enable();

            // Store ref to disable later
            map._currentDrawHandler = drawHandler;
        } else {
            // Disable drawing
            if (map._currentDrawHandler) {
                map._currentDrawHandler.disable();
                map._currentDrawHandler = null;
            }
        }
    }, [isDrawing, mapReady, drawColor]);

    // Render property polygons
    useEffect(() => {
        if (!mapInstanceRef.current || !mapReady) return;

        const map = mapInstanceRef.current;

        // Clear existing polygon layers
        Object.values(polygonLayersRef.current).forEach((layer) => {
            map.removeLayer(layer);
        });
        polygonLayersRef.current = {};

        properties.forEach((prop) => {
            if (!prop.coordinates || !Array.isArray(prop.coordinates) || prop.coordinates.length < 3) return;

            const latlngs = prop.coordinates.map((c) => [c[1], c[0]]); // [lat, lng]
            const statusColor = prop.inventoryItem
                ? STATUS_COLORS[prop.inventoryItem.status] || prop.color || "#009688"
                : prop.color || "#009688";

            const isHighlighted = highlightPropertyId === prop.id;

            const polygon = L.polygon(latlngs, {
                color: isHighlighted ? "#8DC63F" : statusColor,
                weight: isHighlighted ? 4 : 2,
                fillOpacity: isHighlighted ? 0.4 : 0.2,
                fillColor: statusColor,
            }).addTo(map);

            // Popup content
            const inv = prop.inventoryItem;
            let popupContent = `<div style="min-width: 180px; font-family: system-ui, sans-serif;">
                <div style="font-weight: 800; font-size: 14px; color: #333; margin-bottom: 4px;">${prop.name}</div>`;

            if (inv) {
                popupContent += `
                    <div style="font-size: 11px; color: #666; margin-bottom: 6px;">
                        ${inv.project?.name || ""} ${inv.plotNumber ? `• Plot ${inv.plotNumber}` : ""}
                    </div>
                    <div style="display: flex; gap: 8px; font-size: 11px; margin-bottom: 4px;">
                        <span style="background: ${STATUS_COLORS[inv.status] || "#009688"}20; color: ${STATUS_COLORS[inv.status] || "#009688"}; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase; font-size: 10px;">
                        ${inv.status}
                        </span>
                        <span style="color: #999; font-size: 10px; font-weight: 600;">${inv.propertyType || ""}</span>
                    </div>`;

                if (inv.size) {
                    popupContent += `<div style="font-size: 11px; color: #666;">Size: <strong>${inv.size}</strong></div>`;
                }
                if (inv.totalPrice) {
                    popupContent += `<div style="font-size: 11px; color: #009688; font-weight: 700;">₹${Number(inv.totalPrice).toLocaleString("en-IN")}</div>`;
                }
            }

            if (prop.description) {
                popupContent += `<div style="font-size: 11px; color: #888; margin-top: 4px; font-style: italic;">${prop.description}</div>`;
            }

            popupContent += "</div>";

            polygon.bindPopup(popupContent);

            polygon.on("click", () => {
                if (onPropertyClick) onPropertyClick(prop);
            });

            // Label at center
            if (prop.center) {
                const label = L.marker([prop.center[1], prop.center[0]], {
                    icon: L.divIcon({
                        className: "map-property-label",
                        html: `<div style="
                            background: ${statusColor};
                            color: white;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 10px;
                            font-weight: 800;
                            white-space: nowrap;
                            text-transform: uppercase;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                            letter-spacing: 0.5px;
                            ">${prop.name}</div>`,
                        iconSize: null,
                        iconAnchor: [40, 10],
                    }),
                }).addTo(map);

                polygonLayersRef.current[prop.id + "_label"] = label;
            }

            polygonLayersRef.current[prop.id] = polygon;
        });
    }, [properties, highlightPropertyId, mapReady]);

    // Fly to highlighted property
    useEffect(() => {
        if (!mapInstanceRef.current || !highlightPropertyId || !mapReady) return;

        const prop = properties.find((p) => p.id === highlightPropertyId);
        if (prop?.center) {
            mapInstanceRef.current.flyTo([prop.center[1], prop.center[0]], 17, {
                duration: 1.2,
            });
        }
    }, [highlightPropertyId, properties, mapReady]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapRef} className="w-full h-full rounded-xl" style={{ minHeight: "500px" }} />
            <style jsx global>{`
                .map-property-label {
                background: none !important;
                border: none !important;
                }
                .leaflet-draw-toolbar {
                display: none !important;
                }
            `}
            </style>
        </div>
    );
}
