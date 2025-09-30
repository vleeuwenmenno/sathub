# CBOR File Upload Implementation Plan

## Overview
Separate CBOR file upload from post creation to enable proper validation of SatDump CBOR files. This will follow the same pattern as image uploads.

## Current State Analysis
- CBOR data is currently included in the CreatePost JSON request as `[]byte`
- No validation of CBOR format or SatDump structure
- Images are uploaded separately via UploadPostImage endpoint

## Proposed Changes

### Backend Changes

1. **Add CBOR Library Dependency**
   - Add `github.com/fxamacker/cbor/v2` to go.mod for CBOR parsing/validation

2. **Update Post Model**
   - Change `CBOR []byte` field to `CBORURL string` to store file URL instead of raw bytes
   - Add migration to handle existing data

3. **Create UploadPostCBOR Handler**
   - New endpoint: `POST /api/posts/{postId}/cbor`
   - Accept multipart/form-data with CBOR file
   - Validate CBOR format and SatDump structure
   - Upload to storage (MinIO/S3)
   - Update post record with CBOR URL

4. **CBOR Validation Logic**
   - Parse CBOR file
   - Validate required fields: `instrument`, `type`
   - For `type: "image"`, validate image product structure
   - Check for proper data types and structure

5. **Update CreatePost Handler**
   - Remove CBOR field from PostRequest
   - Keep post creation logic unchanged

### Client Changes

1. **Update API Client**
   - Remove CBOR from CreatePost request
   - Add UploadCBOR method similar to UploadImage
   - Update post creation flow: CreatePost → UploadCBOR → UploadImages

2. **Update Watcher Logic**
   - Modify processSatellitePass to upload CBOR separately
   - Maintain existing CBOR reading logic for validation

### Frontend Changes

1. **Update Types**
   - Remove CBOR from post creation types
   - Add CBOR URL to post response types

2. **Update API Calls**
   - Modify post creation flow if needed

## SatDump CBOR Format Requirements

Based on SatDump documentation:

### Common Fields (Required)
- `instrument`: string - instrument name (e.g., "avhrr", "modis")
- `type`: string - product type (e.g., "image")

### Optional Fields
- `tle`: TLE struct for processing

### Image Products (type: "image")
- `bit_depth`: number - actual bit depth
- `needs_correlation`: boolean
- `save_as_matrix`: boolean (optional)
- `images`: array of image channel objects
- `has_timestamps`: boolean (optional)
- `timestamps_type`: string (optional)
- `timestamps`: array (optional)
- `projection_cfg`: object (optional)
- `calibration`: object (optional)

## Implementation Steps

1. Add CBOR library dependency
2. Update Post model to use CBOR URL
3. Create CBOR validation utilities
4. Implement UploadPostCBOR handler
5. Update CreatePost to remove CBOR field
6. Modify client to upload CBOR separately
7. Update frontend types
8. Test the complete flow

## API Endpoints

### New Endpoint
```
POST /api/posts/{postId}/cbor
Content-Type: multipart/form-data
Authorization: Station {token}

Form field: cbor (file)
Response: CBOR file URL
```

### Updated CreatePost
```
POST /api/posts
Content-Type: application/json
Authorization: Station {token}

Body: {
  "timestamp": "2023-01-01T12:00:00Z",
  "satellite_name": "NOAA 19",
  "metadata": "{\"key\": \"value\"}"
}
```

## Migration Strategy

For existing posts with CBOR data:
1. Create migration to extract CBOR data to files
2. Upload to storage
3. Update CBORURL field
4. Remove old CBOR column

## Testing

1. Unit tests for CBOR validation
2. Integration tests for upload flow
3. End-to-end tests with actual SatDump data
4. Backward compatibility tests