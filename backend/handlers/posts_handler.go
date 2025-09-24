package handlers

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

type PostOverview struct {
	ID          string  `json:"id"`
	Description string  `json:"description"`
	Location    string  `json:"location"`
	User        string  `json:"user"`
	UploadedAt  string  `json:"uploaded_at"`
	CoverImage  string  `json:"cover_image"`
	Satellite   string  `json:"satellite"`
	Timestamp   float64 `json:"timestamp"`
	ComputedAt  string  `json:"computed_at"`
}

type ImageGroup struct {
	Type   string   `json:"type"`
	Images []string `json:"images"`
}

type PostDetail struct {
	ID          string                 `json:"id"`
	Info        map[string]interface{} `json:"info"`
	Metadata    map[string]interface{} `json:"metadata"`
	Cbor        interface{}            `json:"cbor"`
	Images      []string               `json:"images"`
	ImageGroups []ImageGroup           `json:"imageGroups"`
}

var dataDir = "../data"

func getPostDirs() []string {
	files, err := ioutil.ReadDir(dataDir)
	if err != nil {
		return []string{}
	}
	var dirs []string
	for _, f := range files {
		if f.IsDir() {
			dirs = append(dirs, f.Name())
		}
	}
	return dirs
}

func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func groupImagesByType(images []string) []ImageGroup {
	groups := make(map[string][]string)

	for _, img := range images {
		imgLower := strings.ToLower(img)
		if strings.Contains(imgLower, "projected") {
			groups["Projected"] = append(groups["Projected"], img)
		} else if strings.Contains(imgLower, "avhrr") {
			groups["AVHRR"] = append(groups["AVHRR"], img)
		} else if strings.Contains(imgLower, "msa") {
			groups["MSA"] = append(groups["MSA"], img)
		} else if strings.Contains(imgLower, "msu-mr") && !strings.Contains(imgLower, "rgb") {
			groups["MSU-MR"] = append(groups["MSU-MR"], img)
		} else {
			groups["Other"] = append(groups["Other"], img)
		}
	}

	var result []ImageGroup
	for groupType, groupImages := range groups {
		if len(groupImages) > 0 {
			result = append(result, ImageGroup{
				Type:   groupType,
				Images: groupImages,
			})
		}
	}

	return result
}

// GetPosts handles listing all satellite data posts
func GetPosts(c *gin.Context) {
	posts := []PostOverview{}
	for _, id := range getPostDirs() {
		infoPath := filepath.Join(dataDir, id, "info.json")
		metaPath := filepath.Join(dataDir, id, "metadata.json")

		var info map[string]interface{}
		var meta map[string]interface{}

		if data, err := ioutil.ReadFile(infoPath); err == nil {
			json.Unmarshal(data, &info)
		}
		if data, err := ioutil.ReadFile(metaPath); err == nil {
			json.Unmarshal(data, &meta)
		}

		post := PostOverview{
			ID:          id,
			Description: getString(info, "description"),
			Location:    getString(info, "location"),
			User:        getString(info, "user"),
			UploadedAt:  getString(info, "uploaded_at"),
			CoverImage:  getString(info, "cover_image"),
		}

		if sample, ok := meta["sample_json"].(map[string]interface{}); ok {
			post.Satellite = getString(sample, "satellite")
			if ts, ok := sample["timestamp"].(float64); ok {
				post.Timestamp = ts
			}
		}
		if computed, ok := meta["computed_at"].(string); ok {
			post.ComputedAt = computed
		}

		posts = append(posts, post)
	}
	c.JSON(200, posts)
}

// GetPostDetail handles retrieving detailed information about a specific post
func GetPostDetail(c *gin.Context) {
	id := c.Param("id")
	dir := filepath.Join(dataDir, id)
	infoPath := filepath.Join(dir, "info.json")
	metaPath := filepath.Join(dir, "metadata.json")
	cborPath := filepath.Join(dir, "product.cbor")
	uploadDir := filepath.Join(dir, "upload_data")

	var info, meta map[string]interface{}
	var cborData interface{}
	var images []string

	// Read info.json
	if data, err := ioutil.ReadFile(infoPath); err == nil {
		if err := json.Unmarshal(data, &info); err != nil {
			info = map[string]interface{}{"error": "Failed to parse info.json"}
		}
	} else {
		info = map[string]interface{}{"error": "info.json not found"}
	}

	// Read metadata.json
	if data, err := ioutil.ReadFile(metaPath); err == nil {
		if err := json.Unmarshal(data, &meta); err != nil {
			meta = map[string]interface{}{"error": "Failed to parse metadata.json"}
		}
	} else {
		meta = map[string]interface{}{"error": "metadata.json not found"}
	}

	// Try to read CBOR - skip if it causes any issues
	if _, err := os.Stat(cborPath); err == nil {
		cborData = map[string]interface{}{"message": "CBOR file exists but parsing is disabled"}
	} else {
		cborData = map[string]interface{}{"error": "product.cbor not found"}
	}

	// Scan for images in upload_data and MSU-MR subdirectory
	var scanImages func(string)
	scanImages = func(dir string) {
		if files, err := ioutil.ReadDir(dir); err == nil {
			for _, f := range files {
				if f.IsDir() {
					// Recurse into subdirectories like MSU-MR
					scanImages(filepath.Join(dir, f.Name()))
				} else if strings.HasSuffix(strings.ToLower(f.Name()), ".png") {
					// Get relative path from upload_data
					relPath, _ := filepath.Rel(uploadDir, filepath.Join(dir, f.Name()))
					images = append(images, relPath)
				}
			}
		}
	}
	scanImages(uploadDir)

	// Group images by type
	imageGroups := groupImagesByType(images)

	detail := PostDetail{
		ID:          id,
		Info:        info,
		Metadata:    meta,
		Cbor:        cborData,
		Images:      images,
		ImageGroups: imageGroups,
	}
	c.JSON(200, detail)
}

// GetImage handles serving satellite images
func GetImage(c *gin.Context) {
	id := c.Param("id")
	filename := c.Param("filename")
	imagePath := filepath.Join(dataDir, id, "upload_data", filename[1:]) // remove leading /
	if _, err := os.Stat(imagePath); err == nil {
		c.File(imagePath)
	} else {
		c.JSON(404, gin.H{"error": "Image not found"})
	}
}
