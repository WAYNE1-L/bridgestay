/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: typeof google;
    /** Fired by the Maps JS API when the key is invalid or the API is not enabled. */
    gm_authFailure?: () => void;
  }
}

// VITE_GOOGLE_MAPS_API_KEY is the canonical name.
// VITE_FRONTEND_FORGE_API_KEY is the legacy fallback (same raw Google Maps key,
// old env var name when the Forge proxy was still in use).
const API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.VITE_FRONTEND_FORGE_API_KEY ||
  "";

// Log which path will be used (visible in the browser console on page load).
if (typeof window !== "undefined") {
  console.log(
    `[MapView] ${API_KEY ? "Google Maps (direct maps.googleapis.com)" : "OSM fallback — no API key set"}`
  );
}

// Returns true on success, false on failure. Never hangs.
function loadMapScript(): Promise<boolean> {
  return new Promise(resolve => {
    // If already loaded, resolve immediately.
    if (window.google?.maps) {
      console.log("[MapView] Google Maps already loaded — reusing existing instance");
      resolve(true);
      return;
    }

    if (!API_KEY) {
      console.warn("[MapView] No Google Maps API key found (VITE_GOOGLE_MAPS_API_KEY / VITE_FRONTEND_FORGE_API_KEY) — falling back to OpenStreetMap");
      resolve(false);
      return;
    }

    console.log(`[MapView] Loading Maps JS API — key prefix: ${API_KEY.slice(0, 8)}…`);

    // gm_authFailure fires when the key is rejected by Google (invalid key,
    // Maps JavaScript API not enabled, or billing not set up on the project).
    // It is NOT fired for referrer/IP restrictions — those produce an onerror.
    let authFailed = false;
    window.gm_authFailure = () => {
      authFailed = true;
      console.error(
        "[MapView] gm_authFailure — Google rejected the Maps JS API key.\n" +
        "  Possible causes:\n" +
        "  1. Maps JavaScript API not enabled → https://console.cloud.google.com/apis/library/maps-backend.googleapis.com\n" +
        "  2. Billing not set up on the Google Cloud project\n" +
        "  3. API key restrictions (application/referrer) blocking localhost\n" +
        "     Fix: In Google Cloud Console → Credentials → edit key → remove or add 'http://localhost:*'\n" +
        "  Falling back to OpenStreetMap."
      );
      resolve(false);
    };

    const script = document.createElement("script");
    // Direct Google Maps JavaScript API — no proxy.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.onload = () => {
      if (!authFailed) {
        console.log("[MapView] Maps JS API script loaded successfully");
        resolve(true);
      }
      // If authFailed, gm_authFailure already resolved(false).
      script.remove();
    };
    script.onerror = () => {
      console.warn(
        "[MapView] Maps JS API script failed to load (network error or referrer/IP restriction).\n" +
        "  • If you see a 403 in the Network tab: check API key referrer restrictions in Google Cloud Console\n" +
        "  • If the request never left the browser: check your internet connection\n" +
        "  Falling back to OpenStreetMap."
      );
      script.remove();
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  /** Real coordinates from the DB. Pass null/undefined when geocoding hasn't run. */
  coords?: { lat: number; lng: number } | null;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  /**
   * Full address string used when coords are absent (Priority C fallback).
   * e.g. "123 University Ave, Los Angeles, CA 90024"
   */
  address?: string;
  // Legacy prop — accepted but ignored; use coords instead.
  initialCenter?: { lat: number; lng: number };
}

export function MapView({
  className,
  coords,
  initialZoom = 15,
  onMapReady,
  address,
  initialCenter,
}: MapViewProps) {
  // Resolve explicit coords first; fall back to legacy initialCenter prop.
  const resolvedCoords: { lat: number; lng: number } | null =
    coords ?? initialCenter ?? null;

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState(false);

  // Client-side geocode state — used when coords are absent but address is known.
  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");

  // ── Google Maps init ──────────────────────────────────────────────────────
  const init = usePersistFn(async () => {
    // No API key AND no coords → nothing we can do, go straight to OSM fallback.
    if (!API_KEY) {
      console.warn("[MapView] No API key — skipping Google Maps, falling back to OSM");
      setMapError(true);
      return;
    }
    // API key present but no coords and no address → map can't be centered.
    if (!resolvedCoords && !address) {
      console.warn("[MapView] No coordinates and no address — cannot render map");
      setMapError(true);
      return;
    }

    const loaded = await loadMapScript();
    if (!loaded || !window.google?.maps) {
      setMapError(true);
      return;
    }
    if (!mapContainer.current) return;

    // ── Determine center coordinates ────────────────────────────────────────
    // Priority 1: pre-stored coords from DB (fastest path, no extra request).
    // Priority 2: client-side Google Geocoder using the address string.
    let center: { lat: number; lng: number } | null = resolvedCoords;

    if (!center && address) {
      console.log(`[MapView] No stored coords — geocoding address via Google: "${address}"`);
      try {
        center = await new Promise<{ lat: number; lng: number } | null>((res) => {
          new window.google!.maps.Geocoder().geocode(
            { address },
            (results, status) => {
              if (status === "OK" && results?.[0]?.geometry?.location) {
                const loc = results[0].geometry.location;
                console.log(`[MapView] Google geocode succeeded: ${loc.lat()}, ${loc.lng()}`);
                res({ lat: loc.lat(), lng: loc.lng() });
              } else {
                console.warn(`[MapView] Google geocode failed: status=${status}`);
                res(null);
              }
            }
          );
        });
      } catch (err) {
        console.warn("[MapView] Google geocode threw:", err);
        center = null;
      }
    }

    if (!center) {
      // Geocoding failed — fall through to Nominatim + OSM.
      console.warn("[MapView] Could not resolve coords — falling back to OSM");
      setMapError(true);
      return;
    }

    try {
      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });
      // Drop a marker at the resolved location.
      new window.google.maps.marker.AdvancedMarkerElement({
        map: map.current,
        position: center,
        title: address ?? "Property location",
      });
      if (onMapReady) {
        onMapReady(map.current);
      }
      console.log("[MapView] Google Maps initialized successfully");
    } catch (err) {
      console.warn("[MapView] Map initialization failed:", err);
      setMapError(true);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  // ── Priority C: client-side Nominatim geocode when in fallback + no coords ─
  // Fires only after init() has set mapError=true and we have an address.
  useEffect(() => {
    if (!mapError || resolvedCoords || !address || geocodeStatus !== "idle") return;

    setGeocodeStatus("loading");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "BridgeStay/1.0 contact@bridgestay.dev" },
        signal: controller.signal,
      }
    )
      .then((r) => r.json())
      .then((data: Array<{ lat: string; lon: string }>) => {
        clearTimeout(timer);
        const first = data[0];
        if (first?.lat && first?.lon) {
          setGeocodedCoords({ lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
          setGeocodeStatus("done");
        } else {
          setGeocodeStatus("failed");
        }
      })
      .catch(() => {
        clearTimeout(timer);
        setGeocodeStatus("failed");
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mapError, resolvedCoords, address, geocodeStatus]);

  // ── Fallback rendering ────────────────────────────────────────────────────

  if (mapError) {
    // Merge: prefer DB coords, then client-geocoded coords.
    const effectiveCoords = resolvedCoords ?? geocodedCoords;

    // Priority A/B: coordinates available (from DB or just geocoded) → OSM iframe.
    if (effectiveCoords) {
      const { lat, lng } = effectiveCoords;
      const delta = 0.008;
      const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
      const isFallbackGeocode = !resolvedCoords && geocodedCoords;

      return (
        <div className={cn("w-full", className)}>
          <iframe
            className="w-full h-[400px] border-0 block"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}
            title="Property location"
            loading="lazy"
          />
          {/* When coords came from client geocoding, show the address + open-in-maps links below the iframe */}
          {isFallbackGeocode && address && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/40 border border-t-0 border-border rounded-b-xl text-xs text-muted-foreground">
              <span className="truncate">📍 {address}</span>
              <div className="flex gap-2 shrink-0">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  Google Maps
                </a>
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  OSM
                </a>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Priority C (geocoding in progress) → skeleton loader inside the map area.
    if (geocodeStatus === "loading") {
      return (
        <div
          className={cn(
            "w-full h-[400px] flex flex-col items-center justify-center gap-3 bg-muted/20 rounded-xl border border-border",
            className
          )}
        >
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading map…</p>
        </div>
      );
    }

    // Priority C (geocoding failed but address known) → compact fallback card.
    if (address) {
      const encoded = encodeURIComponent(address);
      return (
        <div
          className={cn(
            "w-full h-[400px] flex flex-col items-center justify-center gap-4 bg-muted/30 rounded-xl border border-border",
            className
          )}
        >
          <div className="text-center px-6 max-w-sm">
            <span className="text-3xl block mb-3">📍</span>
            <p className="font-semibold text-base mb-1">{address}</p>
            <p className="text-xs text-muted-foreground mb-4">
              Map preview unavailable — open in a maps app to see the location
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <a
                href={`https://maps.google.com/?q=${encoded}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Open in Google Maps
              </a>
              <a
                href={`https://www.openstreetmap.org/search?query=${encoded}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                OpenStreetMap
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Priority D: no coordinates, no address → minimal placeholder.
    return (
      <div
        className={cn(
          "w-full h-[400px] flex flex-col items-center justify-center gap-2 bg-muted/30 rounded-xl border border-border text-muted-foreground text-sm",
          className
        )}
      >
        <span className="text-2xl">📍</span>
        <p className="font-medium">Location not available</p>
        <p className="text-xs opacity-60 text-center px-6">
          No address or coordinates were saved with this listing.
        </p>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className={cn("w-full h-[400px]", className)} />
  );
}
