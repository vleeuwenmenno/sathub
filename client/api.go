package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// PostRequest represents the request body for creating a post
type PostRequest struct {
	Timestamp     string `json:"timestamp"`
	SatelliteName string `json:"satellite_name"`
	Metadata      string `json:"metadata,omitempty"`
}

// PostResponse represents the API response for a created post
type PostResponse struct {
	ID            string          `json:"id"`
	StationID     string          `json:"station_id"`
	StationName   string          `json:"station_name"`
	Timestamp     string          `json:"timestamp"`
	SatelliteName string          `json:"satellite_name"`
	Metadata      string          `json:"metadata"`
	Images        []ImageResponse `json:"images"`
	CreatedAt     string          `json:"created_at"`
	UpdatedAt     string          `json:"updated_at"`
}

// ImageResponse represents an image in responses
type ImageResponse struct {
	ID       uint   `json:"id"`
	Filename string `json:"filename"`
	ImageURL string `json:"image_url"`
}

// APIClient handles communication with the SatHub API
type APIClient struct {
	baseURL      string
	stationToken string
	httpClient   *http.Client
}

// NewAPIClient creates a new API client
func NewAPIClient(baseURL, stationToken string, insecure bool) *APIClient {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: insecure,
		},
	}

	return &APIClient{
		baseURL:      strings.TrimSuffix(baseURL, "/"),
		stationToken: stationToken,
		httpClient: &http.Client{
			Timeout:   30 * time.Second,
			Transport: transport,
		},
	}
}

// CreatePost sends a post creation request to the API
func (c *APIClient) CreatePost(req PostRequest) (*PostResponse, error) {
	url := fmt.Sprintf("%s/api/posts", c.baseURL)

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Station %s", c.stationToken))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var apiResp struct {
		Data PostResponse `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &apiResp.Data, nil
}

// UploadImage uploads an image for a post
func (c *APIClient) UploadImage(postID string, imagePath string) error {
	url := fmt.Sprintf("%s/api/posts/%s/images", c.baseURL, postID)

	file, err := os.Open(imagePath)
	if err != nil {
		return fmt.Errorf("failed to open image file: %w", err)
	}
	defer file.Close()

	// Read first 512 bytes to detect content type
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file header: %w", err)
	}
	contentType := http.DetectContentType(buffer[:n])

	// Reset file pointer to beginning
	if _, err := file.Seek(0, 0); err != nil {
		return fmt.Errorf("failed to reset file pointer: %w", err)
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Create form file part with proper headers
	filename := filepath.Base(imagePath)
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="image"; filename="%s"`, filename))
	h.Set("Content-Type", contentType)
	part, err := writer.CreatePart(h)
	if err != nil {
		return fmt.Errorf("failed to create form part: %w", err)
	}

	if _, err := io.Copy(part, file); err != nil {
		return fmt.Errorf("failed to copy file data: %w", err)
	}

	writer.Close()

	httpReq, err := http.NewRequest("POST", url, &buf)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", writer.FormDataContentType())
	httpReq.Header.Set("Authorization", fmt.Sprintf("Station %s", c.stationToken))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("image upload failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// UploadCBOR uploads a CBOR file for a post
func (c *APIClient) UploadCBOR(postID string, cborPath string) error {
	url := fmt.Sprintf("%s/api/posts/%s/cbor", c.baseURL, postID)

	file, err := os.Open(cborPath)
	if err != nil {
		return fmt.Errorf("failed to open CBOR file: %w", err)
	}
	defer file.Close()

	// Read first 512 bytes to detect content type (though CBOR is application/cbor)
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file header: %w", err)
	}
	contentType := http.DetectContentType(buffer[:n])
	// Override with CBOR content type if detected as something else
	if contentType != "application/cbor" {
		contentType = "application/cbor"
	}

	// Reset file pointer to beginning
	if _, err := file.Seek(0, 0); err != nil {
		return fmt.Errorf("failed to reset file pointer: %w", err)
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Create form file part with proper headers
	filename := filepath.Base(cborPath)
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="cbor"; filename="%s"`, filename))
	h.Set("Content-Type", contentType)
	part, err := writer.CreatePart(h)
	if err != nil {
		return fmt.Errorf("failed to create form part: %w", err)
	}

	if _, err := io.Copy(part, file); err != nil {
		return fmt.Errorf("failed to copy file data: %w", err)
	}

	writer.Close()

	httpReq, err := http.NewRequest("POST", url, &buf)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", writer.FormDataContentType())
	httpReq.Header.Set("Authorization", fmt.Sprintf("Station %s", c.stationToken))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("CBOR upload failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// UploadCADU uploads a CADU file for a post
func (c *APIClient) UploadCADU(postID string, caduPath string) error {
	url := fmt.Sprintf("%s/api/posts/%s/cadu", c.baseURL, postID)

	file, err := os.Open(caduPath)
	if err != nil {
		return fmt.Errorf("failed to open CADU file: %w", err)
	}
	defer file.Close()

	// Read first 512 bytes to detect content type (though CADU is application/octet-stream)
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file header: %w", err)
	}
	contentType := http.DetectContentType(buffer[:n])
	// Override with octet-stream for CADU files
	contentType = "application/octet-stream"

	// Reset file pointer to beginning
	if _, err := file.Seek(0, 0); err != nil {
		return fmt.Errorf("failed to reset file pointer: %w", err)
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Create form file part with proper headers
	filename := filepath.Base(caduPath)
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="cadu"; filename="%s"`, filename))
	h.Set("Content-Type", contentType)
	part, err := writer.CreatePart(h)
	if err != nil {
		return fmt.Errorf("failed to create form part: %w", err)
	}

	if _, err := io.Copy(part, file); err != nil {
		return fmt.Errorf("failed to copy file data: %w", err)
	}

	writer.Close()

	httpReq, err := http.NewRequest("POST", url, &buf)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", writer.FormDataContentType())
	httpReq.Header.Set("Authorization", fmt.Sprintf("Station %s", c.stationToken))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("CADU upload failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// StationHealth sends a health check to update station last seen
func (c *APIClient) StationHealth() error {
	url := fmt.Sprintf("%s/api/stations/health", c.baseURL)

	httpReq, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", fmt.Sprintf("Station %s", c.stationToken))

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("health check failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
