'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LocationTracker({ driverId }: { driverId: string }) {
  const supabase = createClient()

  useEffect(() => {
    if (!driverId) return

    // This runs every time the driver moves or every 30 seconds
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Send this to Supabase
        await supabase.from('driver_locations').upsert({
          driver_id: driverId,
          location: `POINT(${longitude} ${latitude})`,
          updated_at: new Date().toISOString()
        })
      },
      (error) => console.error("GPS Error:", error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [driverId, supabase])

  return null // This component is silent!
}