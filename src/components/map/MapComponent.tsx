'use client'

import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '400px', borderRadius: '16px' };

export default function MapComponent({ apiKey, lat, lng }: { apiKey: string, lat: number, lng: number }) {
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: apiKey })

  const center = { lat, lng };

  return isLoaded ? (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10}>
      <Marker position={center} />
    </GoogleMap>
  ) : <div className="w-full h-[400px] bg-slate-200 animate-pulse rounded-2xl" />;
}