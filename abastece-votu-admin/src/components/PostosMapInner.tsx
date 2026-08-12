import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

// Fix default marker icons (Leaflet + Vite)
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Posto = { id: string; nome: string; endereco: string; lat: number | null; lng: number | null };

const VOTUPORANGA: [number, number] = [-20.4231, -49.9748];

export default function PostosMap() {
  const [postos, setPostos] = useState<Posto[]>([]);

  useEffect(() => {
    supabase
      .from("postos")
      .select("id,nome,endereco,lat,lng")
      .eq("ativo", true)
      .then(({ data }) => setPostos((data ?? []) as Posto[]));
  }, []);

  return (
    <MapContainer
      center={VOTUPORANGA}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {postos
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => (
          <Marker key={p.id} position={[Number(p.lat), Number(p.lng)]} icon={icon}>
            <Popup>
              <strong>{p.nome}</strong>
              <br />
              {p.endereco}
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
