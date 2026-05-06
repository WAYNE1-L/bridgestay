/**
 * SubletMapView — Leaflet-based map showing all filtered sublet listings.
 *
 * Rendered in /sublets when the user switches to "Map view".
 * Uses react-leaflet v4 + OpenStreetMap tiles (no API key required).
 *
 * Default-icon fix: Leaflet's bundled marker PNGs use relative paths that
 * break under Vite's asset pipeline. We override the default icon with
 * the exact same images but resolved via import (Vite turns them into
 * content-hashed URLs at build time). This runs once at module load.
 */

import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { MockSublet } from "@/lib/subletMockData";

// ── Default-icon fix ──────────────────────────────────────────────────────────
const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;
// ─────────────────────────────────────────────────────────────────────────────

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  sublets: MockSublet[];
  onSelectSublet?: (id: string) => void;
};

export function SubletMapView({ sublets }: Props) {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-2">
      {/* Helper line */}
      <p className="text-xs text-neutral-400">
        {language === "cn"
          ? "标记位置为粗略位置 (演示数据)"
          : "Pin locations are approximate (demo data)"}
      </p>

      <MapContainer
        center={[40.7649, -111.8421]}
        zoom={13}
        style={{ height: 600, width: "100%" }}
        className="rounded-xl overflow-hidden border border-neutral-200"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {sublets.map((sublet) => (
          <Marker
            key={sublet.id}
            position={[sublet.latitude, sublet.longitude]}
          >
            <Popup minWidth={200}>
              <div className="space-y-1.5 py-0.5">
                <p className="font-semibold text-sm leading-snug">
                  {language === "cn" && sublet.titleZh
                    ? sublet.titleZh
                    : sublet.title}
                </p>
                <p className="text-base font-bold tabular-nums text-neutral-900">
                  {fmtUsd(sublet.monthlyRent)}
                  <span className="text-xs font-normal text-neutral-500 ml-1">
                    {language === "cn" ? "/月" : "/mo"}
                  </span>
                </p>
                <p className="text-xs text-neutral-600">
                  {sublet.bedrooms === 0
                    ? language === "cn"
                      ? "单间"
                      : "Studio"
                    : `${sublet.bedrooms} ${language === "cn" ? "卧" : "bd"}`}
                  {" · "}
                  {sublet.bathrooms}{" "}
                  {language === "cn" ? "卫" : "ba"}
                </p>
                <Button
                  size="sm"
                  className="w-full mt-1 bg-orange-500 hover:bg-orange-600 text-white text-xs"
                  onClick={() => setLocation(`/sublets/${sublet.id}`)}
                >
                  {language === "cn" ? "查看详情" : "View details"}
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
