# Ground Track Feature Documentation

## Overview

The ground track feature automatically calculates satellite pass trajectories from CBOR data and makes them available via API. This enables visualization of satellite passes on maps.

## Architecture

### Backend Components

1. **Worker Process** (`backend/worker/ground_track_processor.go`)

   - Runs as a background service alongside the API
   - Checks for new posts every 5 minutes
   - Processes posts with CBOR data that don't have ground tracks yet
   - Calculates latitude/longitude/altitude for each timestamp using SGP4 orbital propagation

2. **Database Model** (`backend/models/ground_track.go`)

   - `PostGroundTrack` table stores calculated tracks
   - One track per post (unique index on `post_id`)
   - Stores full track as JSON array plus start/end coordinates for quick queries

3. **API Endpoint** (`backend/handlers/ground_track_handler.go`)
   - `GET /api/posts/:id/ground-track`
   - Public endpoint (optional auth)
   - Returns track points with metadata

### Dependencies

- `github.com/joshuaferrara/go-satellite` - SGP4 orbit propagation from TLE

## How It Works

### 1. Data Flow

```
Post Created with CBOR → Worker Detects New Post → Extract TLE + Timestamps →
Calculate SGP4 Positions → Store in Database → Available via API
```

### 2. CBOR Data Requirements

The CBOR data must contain:

- `tle.line1` - TLE line 1 (orbital elements)
- `tle.line2` - TLE line 2 (orbital elements)
- `timestamps` - Array of Unix timestamps (one per scan line)

### 3. Calculation Process

For each valid timestamp:

1. Parse TLE to get orbital elements
2. Propagate satellite position using SGP4 algorithm
3. Convert ECI (Earth-Centered Inertial) coordinates to LLA (Lat/Lon/Alt)
4. Store as `GroundTrackPoint` with:
   - `lat` - Latitude in degrees
   - `lon` - Longitude in degrees
   - `alt` - Altitude in kilometers
   - `time` - Unix timestamp

Invalid timestamps (value = -1) are skipped.

## API Response Format

```json
{
  "success": true,
  "message": "Ground track retrieved successfully",
  "data": {
    "post_id": "602e3664-f0d6-4eda-8a66-c0393c887c3f",
    "start_lat": 46.04662058212647,
    "start_lon": -349.3058886082331,
    "end_lat": 60.629037409622065,
    "end_lon": -356.9450516406776,
    "point_count": 181,
    "processed_at": "2025-10-06T12:11:06.349177Z",
    "track_points": [
      {
        "lat": 46.04662058212647,
        "lon": -349.3058886082331,
        "alt": 828.6541473582993,
        "time": 1758806974.40099
      }
      // ... more points
    ]
  }
}
```

## Frontend Integration

### Example: Fetching Ground Track

```typescript
// In your React component or API client
const response = await api.get(`/posts/${postId}/ground-track`);
const { track_points, start_lat, start_lon, end_lat, end_lon } =
  response.data.data;
```

### Visualization Options

1. **Leaflet with Polar Projection**

   ```bash
   npm install leaflet proj4 proj4leaflet
   ```

   - Use `EPSG:3995` (Arctic Polar Stereographic) or `EPSG:3031` (Antarctic)
   - Plot track_points as polyline

2. **Mapbox GL JS**

   - Supports custom projections
   - Can render ground track as GeoJSON LineString

3. **Cesium**
   - 3D globe visualization
   - Can show altitude variation

### Sample Leaflet Code

```typescript
import L from "leaflet";
import "proj4leaflet";

// Create polar map
const map = L.map("map", {
  crs: L.CRS.EPSG3995, // Arctic polar
  center: [90, 0],
  zoom: 3,
});

// Add ground track
const trackLine = L.polyline(
  track_points.map((p) => [p.lat, p.lon]),
  { color: "red", weight: 2 }
).addTo(map);

// Fit map to track bounds
map.fitBounds(trackLine.getBounds());
```

## Database Schema

```sql
CREATE TABLE post_ground_tracks (
    id SERIAL PRIMARY KEY,
    post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
    track_data TEXT NOT NULL,  -- JSON array of track points
    start_lat DOUBLE PRECISION,
    start_lon DOUBLE PRECISION,
    end_lat DOUBLE PRECISION,
    end_lon DOUBLE PRECISION,
    processed_at TIMESTAMP,
    created_at TIMESTAMP
);

CREATE INDEX idx_post_ground_tracks_post_id ON post_ground_tracks(post_id);
CREATE INDEX idx_post_ground_tracks_start_lat ON post_ground_tracks(start_lat);
CREATE INDEX idx_post_ground_tracks_start_lon ON post_ground_tracks(start_lon);
```

## Performance Considerations

- Ground tracks are calculated **once** and cached in the database
- Worker processes posts in batches to avoid overwhelming the system
- API responses can be large (181+ points) - consider pagination for future
- Longitude values may exceed ±180° (e.g., -349°) - normalize for display if needed

## Future Enhancements

1. **Real-time Processing** - Trigger calculation immediately after post creation via job queue
2. **Ground Track Simplification** - Use Douglas-Peucker algorithm to reduce point count
3. **Swath Visualization** - Calculate satellite footprint/coverage area from scan angle
4. **Pass Predictions** - Use TLE to predict future passes over specific locations
5. **Multiple Satellites** - Show multiple satellite tracks on one map
6. **Coverage Analysis** - Calculate which areas were imaged during pass

## Troubleshooting

### Ground track not available

- Check worker logs: `docker compose logs worker`
- Verify CBOR data contains TLE and timestamps
- Manually trigger: restart worker to reprocess

### Incorrect coordinates

- Verify TLE epoch matches timestamp range
- Check timestamp format (must be Unix time in seconds)
- Longitude normalization may be needed (±180° wrapping)

### Worker not processing

- Ensure worker container is running: `docker compose ps`
- Check for compilation errors: `docker compose logs worker`
- Verify database migration ran: `post_ground_tracks` table exists

## Testing

```bash
# Check worker status
docker compose logs worker --tail=50

# Query database
docker compose exec postgres psql -U sathub -d sathub -c \
  "SELECT post_id, point_count, processed_at FROM
   (SELECT post_id, LENGTH(track_data) as point_count, processed_at
    FROM post_ground_tracks) t;"

# Test API endpoint
curl -k https://api.sathub.local:9999/api/posts/602e3664-f0d6-4eda-8a66-c0393c887c3f/ground-track | jq .
```

## References

- [SGP4 Orbital Propagation](https://en.wikipedia.org/wiki/Simplified_perturbations_models)
- [TLE Format](https://en.wikipedia.org/wiki/Two-line_element_set)
- [go-satellite Library](https://github.com/joshuaferrara/go-satellite)
- [Leaflet Polar Projections](https://github.com/kartena/Proj4Leaflet)
