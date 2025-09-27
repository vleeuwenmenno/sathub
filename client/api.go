package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
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
	CBOR          []byte `json:"cbor,omitempty"`
}

// PostResponse represents the API response for a created post
type PostResponse struct {
	ID            uint            `json:"id"`
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
func NewAPIClient(baseURL, stationToken string) *APIClient {
	return &APIClient{
		baseURL:      strings.TrimSuffix(baseURL, "/"),
		stationToken: stationToken,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
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
func (c *APIClient) UploadImage(postID uint, imagePath string) error {
	url := fmt.Sprintf("%s/api/posts/%d/images", c.baseURL, postID)

	file, err := os.Open(imagePath)
	if err != nil {
		return fmt.Errorf("failed to open image file: %w", err)
	}
	defer file.Close()

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add the image file
	filename := filepath.Base(imagePath)
	part, err := writer.CreateFormFile("image", filename)
	if err != nil {
		return fmt.Errorf("failed to create form file: %w", err)
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
