"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    GoogleMap,
    useJsApiLoader,
    Polygon,
    InfoWindow,
    DrawingManager,
    Autocomplete,
} from "@react-google-maps/api";

const STATUS_COLORS = {
    AVAILABLE: "#009688",
    SOLD: "#ef4444",
    BLOCKED: "#FBB03B",
};

const MAP_LIBRARIES = ["drawing", "places"];

const DEFAULT_CENTER = { lat: 28.996119, lng: 77.081654 };

const MAP_CONTAINER_STYLE = {
    width: "100%",
    height: "100%",
    borderRadius: "12px",
};

export default function GoogleMapComponent({
    properties = [],
    onPropertyCreated,
    onPropertyClick,
    highlightPropertyId,
    isDrawing,
    setIsDrawing,
    drawColor = "#009688",
}) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: MAP_LIBRARIES,
    });

    const mapRef = useRef(null);
    const drawingManagerRef = useRef(null);
    const autocompleteRef = useRef(null);
    const [activeInfoWindow, setActiveInfoWindow] = useState(null); // property id
    const [mapType, setMapType] = useState("hybrid");

    // Map options
    const mapOptions = useMemo(
        () => ({
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            mapTypeControl: true,
            mapTypeControlOptions: isLoaded
                ? {
                    style: window.google?.maps?.MapTypeControlStyle?.HORIZONTAL_BAR,
                    position: window.google?.maps?.ControlPosition?.TOP_RIGHT,
                    mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain"],
                }
                : undefined,
            mapTypeId: mapType,
            gestureHandling: "greedy",
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }],
                },
            ],
        }),
        [isLoaded, mapType]
    );

    // Handle map load
    const onMapLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    // Handle drawing manager load
    const onDrawingManagerLoad = useCallback((dm) => {
        drawingManagerRef.current = dm;
    }, []);

    // Handle polygon complete (drawn by user)
    const onPolygonComplete = useCallback(
        (polygon) => {
            const path = polygon.getPath();
            const coordinates = [];
            for (let i = 0; i < path.getLength(); i++) {
                const point = path.getAt(i);
                coordinates.push([point.lng(), point.lat()]);
            }
            // Close the polygon
            if (coordinates.length > 0) {
                coordinates.push(coordinates[0]);
            }

            // Remove the drawn polygon (it will be rendered from state after save)
            polygon.setMap(null);

            if (onPropertyCreated) {
                onPropertyCreated(coordinates);
            }
            if (setIsDrawing) {
                setIsDrawing(false);
            }
        },
        [onPropertyCreated, setIsDrawing]
    );

    // Fly to highlighted property
    useEffect(() => {
        if (!mapRef.current || !highlightPropertyId) return;

        const prop = properties.find((p) => p.id === highlightPropertyId);
        if (prop?.center) {
            mapRef.current.panTo({ lat: prop.center[1], lng: prop.center[0] });
            mapRef.current.setZoom(17);
        }
    }, [highlightPropertyId, properties]);

    // Autocomplete handlers
    const onAutocompleteLoad = useCallback((ac) => {
        autocompleteRef.current = ac;
    }, []);

    const onPlaceChanged = useCallback(() => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place?.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                mapRef.current?.panTo({ lat, lng });
                mapRef.current?.setZoom(17);
            }
        }
    }, []);

    // Get color for a property
    const getPropertyColor = useCallback((prop) => {
        if (prop.inventoryItem) {
            return STATUS_COLORS[prop.inventoryItem.status] || prop.color || "#009688";
        }
        return prop.color || "#009688";
    }, []);

    if (loadError) {
        return (
            <div className="w-full h-full bg-red-50 rounded-xl flex items-center justify-center border-2 border-dashed border-red-200">
                <div className="text-center p-6">
                    <p className="text-red-600 font-bold text-lg">Failed to load Google Maps</p>
                    <p className="text-red-400 text-sm mt-2">{loadError.message}</p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="w-full h-full bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-[#009688] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-gray-500 font-medium">Loading Google Maps...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={DEFAULT_CENTER}
                zoom={13}
                options={mapOptions}
                onLoad={onMapLoad}
                mapTypeId={mapType}
            >
                {/* Search Box */}
                <div className="absolute top-3 left-14 z-10" style={{ width: 300 }}>
                    <Autocomplete
                        onLoad={onAutocompleteLoad}
                        onPlaceChanged={onPlaceChanged}
                        options={{
                            componentRestrictions: { country: "in" },
                            fields: ["geometry", "name", "formatted_address"],
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Search places..."
                            className="w-full px-4 py-2.5 pl-10 text-sm bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-[#009688]/30 focus:border-[#009688] text-gray-800 font-medium"
                            style={{
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            }}
                        />
                    </Autocomplete>
                    <svg
                        className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>

                {/* Drawing Manager - only active when isDrawing */}
                {isDrawing && (
                    <DrawingManager
                        onLoad={onDrawingManagerLoad}
                        onPolygonComplete={onPolygonComplete}
                        options={{
                            drawingMode: window.google?.maps?.drawing?.OverlayType?.POLYGON,
                            drawingControl: false,
                            polygonOptions: {
                                fillColor: drawColor,
                                fillOpacity: 0.25,
                                strokeColor: drawColor,
                                strokeWeight: 3,
                                editable: false,
                                clickable: true,
                            },
                        }}
                    />
                )}

                {/* Render property polygons */}
                {properties.map((prop) => {
                    if (!prop.coordinates || !Array.isArray(prop.coordinates) || prop.coordinates.length < 3) {
                        return null;
                    }

                    const color = getPropertyColor(prop);
                    const isHighlighted = highlightPropertyId === prop.id;
                    const paths = prop.coordinates.map((c) => ({ lat: c[1], lng: c[0] }));

                    return (
                        <Polygon
                            key={prop.id}
                            paths={paths}
                            options={{
                                fillColor: color,
                                fillOpacity: isHighlighted ? 0.45 : 0.2,
                                strokeColor: isHighlighted ? "#8DC63F" : color,
                                strokeWeight: isHighlighted ? 4 : 2,
                                strokeOpacity: 1,
                                clickable: true,
                            }}
                            onClick={() => {
                                setActiveInfoWindow(
                                    activeInfoWindow === prop.id ? null : prop.id
                                );
                                if (onPropertyClick) onPropertyClick(prop);
                            }}
                        />
                    );
                })}

                {/* Info Windows */}
                {properties.map((prop) => {
                    if (activeInfoWindow !== prop.id || !prop.center) return null;

                    const inv = prop.inventoryItem;
                    const color = getPropertyColor(prop);

                    return (
                        <InfoWindow
                            key={`info-${prop.id}`}
                            position={{ lat: prop.center[1], lng: prop.center[0] }}
                            onCloseClick={() => setActiveInfoWindow(null)}
                            options={{
                                maxWidth: 280,
                                pixelOffset: new window.google.maps.Size(0, -5),
                            }}
                        >
                            <div style={{ fontFamily: "system-ui, sans-serif", padding: "4px 0" }}>
                                <div
                                    style={{
                                        fontWeight: 800,
                                        fontSize: "15px",
                                        color: "#333",
                                        marginBottom: "6px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: "50%",
                                            backgroundColor: color,
                                            display: "inline-block",
                                            flexShrink: 0,
                                        }}
                                    />
                                    {prop.name}
                                </div>

                                {inv && (
                                    <>
                                        <div
                                            style={{
                                                fontSize: "12px",
                                                color: "#666",
                                                marginBottom: "8px",
                                            }}
                                        >
                                            {inv.project?.name || ""}{" "}
                                            {inv.plotNumber ? `• Plot ${inv.plotNumber}` : ""}
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "8px",
                                                marginBottom: "6px",
                                                alignItems: "center",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    background: `${STATUS_COLORS[inv.status] || "#009688"}20`,
                                                    color: STATUS_COLORS[inv.status] || "#009688",
                                                    padding: "2px 10px",
                                                    borderRadius: "4px",
                                                    fontWeight: 700,
                                                    textTransform: "uppercase",
                                                    fontSize: "10px",
                                                }}
                                            >
                                                {inv.status}
                                            </span>
                                            {inv.propertyType && (
                                                <span
                                                    style={{
                                                        color: "#999",
                                                        fontSize: "10px",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {inv.propertyType}
                                                </span>
                                            )}
                                        </div>
                                        {inv.size && (
                                            <div style={{ fontSize: "12px", color: "#666" }}>
                                                Size: <strong>{inv.size}</strong>
                                            </div>
                                        )}
                                        {inv.totalPrice && (
                                            <div
                                                style={{
                                                    fontSize: "13px",
                                                    color: "#009688",
                                                    fontWeight: 700,
                                                    marginTop: "4px",
                                                }}
                                            >
                                                ₹{Number(inv.totalPrice).toLocaleString("en-IN")}
                                            </div>
                                        )}
                                    </>
                                )}

                                {prop.description && (
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: "#888",
                                            marginTop: "6px",
                                            fontStyle: "italic",
                                        }}
                                    >
                                        {prop.description}
                                    </div>
                                )}
                            </div>
                        </InfoWindow>
                    );
                })}

                {/* Property Labels (center markers) */}
                {properties.map((prop) => {
                    if (!prop.center) return null;
                    const color = getPropertyColor(prop);

                    return (
                        <PropertyLabel
                            key={`label-${prop.id}`}
                            position={{ lat: prop.center[1], lng: prop.center[0] }}
                            name={prop.name}
                            color={color}
                            map={mapRef.current}
                        />
                    );
                })}
            </GoogleMap>
        </div>
    );
}

// Custom overlay for property name labels at center
function PropertyLabel({ position, name, color, map }) {
    const overlayRef = useRef(null);

    useEffect(() => {
        if (!map || !window.google) return;

        class LabelOverlay extends window.google.maps.OverlayView {
            constructor(pos, text, bgColor) {
                super();
                this.pos = pos;
                this.text = text;
                this.bgColor = bgColor;
                this.div = null;
            }

            onAdd() {
                this.div = document.createElement("div");
                this.div.style.position = "absolute";
                this.div.style.transform = "translate(-50%, -50%)";
                this.div.style.whiteSpace = "nowrap";
                this.div.style.pointerEvents = "none";
                this.div.innerHTML = `<div style="
                    background: ${this.bgColor};
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 800;
                    white-space: nowrap;
                    text-transform: uppercase;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    letter-spacing: 0.5px;
                    font-family: system-ui, sans-serif;
                ">${this.text}</div>`;

                const panes = this.getPanes();
                panes.overlayLayer.appendChild(this.div);
            }

            draw() {
                const projection = this.getProjection();
                if (!projection) return;
                const pos = projection.fromLatLngToDivPixel(
                    new window.google.maps.LatLng(this.pos.lat, this.pos.lng)
                );
                if (pos) {
                    this.div.style.left = pos.x + "px";
                    this.div.style.top = pos.y + "px";
                }
            }

            onRemove() {
                if (this.div) {
                    this.div.parentNode.removeChild(this.div);
                    this.div = null;
                }
            }
        }

        const overlay = new LabelOverlay(position, name, color);
        overlay.setMap(map);
        overlayRef.current = overlay;

        return () => {
            if (overlayRef.current) {
                overlayRef.current.setMap(null);
                overlayRef.current = null;
            }
        };
    }, [map, position, name, color]);

    return null;
}
