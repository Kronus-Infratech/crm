"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
    GoogleMap,
    useJsApiLoader,
    Polygon,
    InfoWindow,
    Autocomplete,
} from "@react-google-maps/api";

const STATUS_COLORS = {
    AVAILABLE: "#009688",
    SOLD: "#ef4444",
    BLOCKED: "#FBB03B",
};

const MAP_LIBRARIES = ["drawing", "places", "marker"];

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
    const autocompleteRef = useRef(null);
    const [activeInfoWindow, setActiveInfoWindow] = useState(null); // property id
    const [mapType, setMapType] = useState("hybrid");

    // Track vertex markers placed during manual drawing
    const vertexMarkersRef = useRef([]);
    const drawingPolygonRef = useRef(null);
    const guideLineRef = useRef(null);
    const drawingPathRef = useRef([]);
    const mapClickListenerRef = useRef(null);
    const mouseMoveListenerRef = useRef(null);
    const firstMarkerClickListenerRef = useRef(null);

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

    // Clear all drawing artifacts
    const clearDrawingArtifacts = useCallback(() => {
        vertexMarkersRef.current.forEach((m) => m.cleanup());
        vertexMarkersRef.current = [];
        if (drawingPolygonRef.current) {
            drawingPolygonRef.current.setMap(null);
            drawingPolygonRef.current = null;
        }
        if (guideLineRef.current) {
            guideLineRef.current.setMap(null);
            guideLineRef.current = null;
        }
        drawingPathRef.current = [];
        if (firstMarkerClickListenerRef.current) {
            window.google.maps.event.removeListener(firstMarkerClickListenerRef.current);
            firstMarkerClickListenerRef.current = null;
        }
    }, []);

    // Create a square vertex marker with optional "close" indicator for first point
    const createVertexMarker = useCallback((latLng, color, map, isFirst = false) => {
        // Use a custom overlay for the square marker
        class SquareMarker extends window.google.maps.OverlayView {
            constructor(pos, col, first) {
                super();
                this.pos = pos;
                this.col = col;
                this.isFirst = first;
                this.div = null;
            }
            onAdd() {
                this.div = document.createElement("div");
                this.div.style.position = "absolute";
                const size = this.isFirst ? "14px" : "12px";
                this.div.style.width = size;
                this.div.style.height = size;
                this.div.style.backgroundColor = this.isFirst ? "white" : this.col;
                this.div.style.border = this.isFirst ? `3px solid ${this.col}` : "2px solid white";
                this.div.style.borderRadius = this.isFirst ? "50%" : "0";
                this.div.style.boxShadow = "0 1px 4px rgba(0,0,0,0.4)";
                this.div.style.transform = "translate(-50%, -50%)";
                this.div.style.pointerEvents = "none";
                this.div.style.zIndex = "999";
                this.div.style.cursor = this.isFirst ? "pointer" : "default";
                this.getPanes().overlayMouseTarget.appendChild(this.div);
            }
            draw() {
                const proj = this.getProjection();
                if (!proj) return;
                const p = proj.fromLatLngToDivPixel(
                    new window.google.maps.LatLng(this.pos.lat(), this.pos.lng())
                );
                if (p) {
                    this.div.style.left = p.x + "px";
                    this.div.style.top = p.y + "px";
                }
            }
            onRemove() {
                if (this.div) {
                    this.div.parentNode?.removeChild(this.div);
                    this.div = null;
                }
            }
        }

        const sq = new SquareMarker(latLng, color, isFirst);
        sq.setMap(map);

        // For the first marker, also create an invisible but clickable google marker
        // so we can detect clicks on it to close the polygon
        let clickMarker = null;
        if (isFirst) {
            clickMarker = new window.google.maps.Marker({
                position: latLng,
                map,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: "transparent",
                    fillOpacity: 0,
                    strokeWeight: 0,
                },
                clickable: true,
                zIndex: 1000,
                cursor: "pointer",
            });
        }

        return {
            clickMarker,
            cleanup: () => {
                sq.setMap(null);
                if (clickMarker) clickMarker.setMap(null);
            },
        };
    }, []);

    // Finish the polygon drawing
    const finishDrawing = useCallback(() => {
        const map = mapRef.current;
        const path = drawingPathRef.current;
        if (path.length < 3) {
            toast.error("Need at least 3 points to form a boundary");
            return;
        }

        const coordinates = path.map((p) => [p.lng(), p.lat()]);
        coordinates.push(coordinates[0]); // close polygon

        clearDrawingArtifacts();
        if (map) map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });

        if (onPropertyCreated) {
            onPropertyCreated(coordinates);
        }
        if (setIsDrawing) {
            setIsDrawing(false);
        }
    }, [clearDrawingArtifacts, onPropertyCreated, setIsDrawing]);

    // Manual drawing mode: Leaflet-style
    // - Click to add vertices (square markers)
    // - Mouse move shows a dashed guide line from last vertex to cursor
    // - First vertex is a circle "close" target; clicking it finishes the polygon
    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;
        const map = mapRef.current;

        // Clean up previous listeners
        if (mapClickListenerRef.current) {
            window.google.maps.event.removeListener(mapClickListenerRef.current);
            mapClickListenerRef.current = null;
        }
        if (mouseMoveListenerRef.current) {
            window.google.maps.event.removeListener(mouseMoveListenerRef.current);
            mouseMoveListenerRef.current = null;
        }
        if (firstMarkerClickListenerRef.current) {
            window.google.maps.event.removeListener(firstMarkerClickListenerRef.current);
            firstMarkerClickListenerRef.current = null;
        }

        if (!isDrawing) {
            clearDrawingArtifacts();
            map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
            return;
        }

        // Enable drawing mode
        map.setOptions({ draggableCursor: "crosshair", disableDoubleClickZoom: true });

        const handleClick = (e) => {
            if (!e.latLng) return;
            const latLng = e.latLng;
            const isFirst = drawingPathRef.current.length === 0;

            drawingPathRef.current.push(latLng);

            // Add square vertex marker (circle for first point)
            const markerObj = createVertexMarker(latLng, drawColor, map, isFirst);
            vertexMarkersRef.current.push(markerObj);

            // If this is the first marker, attach a click listener to close polygon
            if (isFirst && markerObj.clickMarker) {
                firstMarkerClickListenerRef.current = markerObj.clickMarker.addListener("click", () => {
                    if (drawingPathRef.current.length >= 3) {
                        finishDrawing();
                    }
                });
            }

            // Update or create the preview polygon
            if (drawingPolygonRef.current) {
                drawingPolygonRef.current.setPath(drawingPathRef.current);
            } else {
                drawingPolygonRef.current = new window.google.maps.Polygon({
                    paths: drawingPathRef.current,
                    fillColor: drawColor,
                    fillOpacity: 0.15,
                    strokeColor: drawColor,
                    strokeWeight: 3,
                    editable: false,
                    clickable: false,
                    map,
                });
            }
        };

        const handleMouseMove = (e) => {
            if (!e.latLng || drawingPathRef.current.length === 0) return;

            const lastPoint = drawingPathRef.current[drawingPathRef.current.length - 1];
            const firstPoint = drawingPathRef.current[0];
            const guidePath = [lastPoint, e.latLng, firstPoint];

            if (guideLineRef.current) {
                guideLineRef.current.setPath(guidePath);
            } else {
                guideLineRef.current = new window.google.maps.Polyline({
                    path: guidePath,
                    strokeColor: drawColor,
                    strokeWeight: 2,
                    strokeOpacity: 0.5,
                    icons: [
                        {
                            icon: {
                                path: "M 0,-1 0,1",
                                strokeOpacity: 0.6,
                                scale: 3,
                            },
                            offset: "0",
                            repeat: "12px",
                        },
                    ],
                    clickable: false,
                    map,
                });
            }
        };

        mapClickListenerRef.current = map.addListener("click", handleClick);
        mouseMoveListenerRef.current = map.addListener("mousemove", handleMouseMove);

        return () => {
            if (mapClickListenerRef.current) {
                window.google.maps.event.removeListener(mapClickListenerRef.current);
                mapClickListenerRef.current = null;
            }
            if (mouseMoveListenerRef.current) {
                window.google.maps.event.removeListener(mouseMoveListenerRef.current);
                mouseMoveListenerRef.current = null;
            }
            if (firstMarkerClickListenerRef.current) {
                window.google.maps.event.removeListener(firstMarkerClickListenerRef.current);
                firstMarkerClickListenerRef.current = null;
            }
            map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
        };
    }, [isDrawing, isLoaded, drawColor, clearDrawingArtifacts, createVertexMarker, finishDrawing]);

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
                <div className="absolute top-3 left-2 sm:left-14 z-10 w-50 sm:w-75">
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

                {/* Drawing is handled via manual click listeners — no DrawingManager needed */}

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
