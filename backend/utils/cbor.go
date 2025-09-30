package utils

import (
	"fmt"

	"github.com/fxamacker/cbor/v2"
)

// SatDumpProduct represents the structure of a SatDump CBOR product file
type SatDumpProduct struct {
	Instrument string                 `cbor:"instrument" json:"instrument"`
	Type       string                 `cbor:"type" json:"type"`
	TLE        map[string]interface{} `cbor:"tle,omitempty" json:"tle,omitempty"`
	// Image product specific fields
	BitDepth         interface{}            `cbor:"bit_depth,omitempty" json:"bit_depth,omitempty"`
	NeedsCorrelation interface{}            `cbor:"needs_correlation,omitempty" json:"needs_correlation,omitempty"`
	SaveAsMatrix     interface{}            `cbor:"save_as_matrix,omitempty" json:"save_as_matrix,omitempty"`
	Images           []interface{}          `cbor:"images,omitempty" json:"images,omitempty"`
	HasTimestamps    interface{}            `cbor:"has_timestamps,omitempty" json:"has_timestamps,omitempty"`
	TimestampsType   interface{}            `cbor:"timestamps_type,omitempty" json:"timestamps_type,omitempty"`
	Timestamps       []interface{}          `cbor:"timestamps,omitempty" json:"timestamps,omitempty"`
	ProjectionCfg    map[string]interface{} `cbor:"projection_cfg,omitempty" json:"projection_cfg,omitempty"`
	Calibration      map[string]interface{} `cbor:"calibration,omitempty" json:"calibration,omitempty"`
	// Allow additional unknown fields
	AdditionalFields map[string]interface{} `cbor:",toarray"`
}

// SatDumpImage represents an image channel in SatDump products
type SatDumpImage struct {
	File        string    `cbor:"file" json:"file"`
	Name        string    `cbor:"name" json:"name"`
	IFOVY       *float64  `cbor:"ifov_y,omitempty" json:"ifov_y,omitempty"`
	IFOVX       *float64  `cbor:"ifov_x,omitempty" json:"ifov_x,omitempty"`
	OffsetX     *float64  `cbor:"offset_x,omitempty" json:"offset_x,omitempty"`
	Wavenumbers []float64 `cbor:"wavenumbers,omitempty" json:"wavenumbers,omitempty"`
}

// ValidateSatDumpCBOR validates that the provided CBOR data conforms to SatDump format
func ValidateSatDumpCBOR(cborData []byte) (*SatDumpProduct, error) {
	if len(cborData) == 0 {
		return nil, fmt.Errorf("CBOR data is empty")
	}

	var product SatDumpProduct
	if err := cbor.Unmarshal(cborData, &product); err != nil {
		return nil, fmt.Errorf("failed to parse CBOR data: %w", err)
	}

	// Validate required fields
	if product.Instrument == "" {
		return nil, fmt.Errorf("missing required field: instrument")
	}

	if product.Type == "" {
		return nil, fmt.Errorf("missing required field: type")
	}

	// Validate type-specific requirements
	switch product.Type {
	case "image":
		if err := validateImageProduct(&product); err != nil {
			return nil, fmt.Errorf("invalid image product: %w", err)
		}
	default:
		// For now, only support image type. Other types can be added later
		return nil, fmt.Errorf("unsupported product type: %s", product.Type)
	}

	return &product, nil
}

// DecodeCBORToJSON decodes CBOR data to a JSON-compatible interface{}
func DecodeCBORToJSON(cborData []byte, result interface{}) error {
	if err := cbor.Unmarshal(cborData, result); err != nil {
		return err
	}

	// Convert the result to JSON-compatible format
	*result.(*interface{}) = convertToJSONCompatible(*result.(*interface{}))
	return nil
}

// convertToJSONCompatible recursively converts map[interface{}]interface{} to map[string]interface{}
func convertToJSONCompatible(data interface{}) interface{} {
	switch v := data.(type) {
	case map[interface{}]interface{}:
		result := make(map[string]interface{})
		for key, value := range v {
			strKey := fmt.Sprintf("%v", key) // Convert key to string
			result[strKey] = convertToJSONCompatible(value)
		}
		return result
	case []interface{}:
		result := make([]interface{}, len(v))
		for i, item := range v {
			result[i] = convertToJSONCompatible(item)
		}
		return result
	default:
		return v
	}
}

// validateImageProduct validates image product specific requirements
func validateImageProduct(product *SatDumpProduct) error {
	if len(product.Images) == 0 {
		return fmt.Errorf("image product must have at least one image channel")
	}

	// For now, we'll be more lenient with image validation since the structure might vary
	// Just ensure we have some images defined
	return nil
}
