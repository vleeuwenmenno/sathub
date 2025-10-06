package handlers

import (
	"fmt"
	"html/template"
	"net/http"
	"os"
	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateShareToken creates a new share token for a post
func CreateShareToken(c *gin.Context) {
	postID := c.Param("id")

	// Parse post ID
	postUUID, err := uuid.Parse(postID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Get user ID from context
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Invalid user ID")
		return
	}

	db := config.GetDB()

	// Check if post exists
	var post models.Post
	if err := db.First(&post, "id = ?", postUUID).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Post not found")
		return
	}

	// Check if user already has a share token for this post
	var existingToken models.ShareToken
	if err := db.Where("post_id = ? AND created_by = ?", postUUID, userID).First(&existingToken).Error; err == nil {
		// Return existing token
		utils.SuccessResponse(c, http.StatusOK, "Share token retrieved", gin.H{
			"token":      existingToken.Token,
			"expires_at": existingToken.ExpiresAt,
			"share_url":  generateShareURL(c, postID, existingToken.Token),
		})
		return
	}

	// Create new share token
	shareToken := models.ShareToken{
		PostID:    postUUID,
		CreatedBy: userID,
		// No expiration - tokens are permanent by default
	}

	if err := shareToken.GenerateToken(); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to generate share token")
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate share token")
		return
	}

	if err := db.Create(&shareToken).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to save share token")
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create share token")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Share token created", gin.H{
		"token":      shareToken.Token,
		"expires_at": shareToken.ExpiresAt,
		"share_url":  generateShareURL(c, postID, shareToken.Token),
	})
}

// GetSharedPost serves a public page with meta tags for social media crawlers
func GetSharedPost(c *gin.Context) {
	shortID := c.Param("id")
	token := c.Query("t") // Shortened from "share" to "t"

	db := config.GetDB()

	// Find post by short ID (first 8 chars of UUID)
	var post models.Post
	if err := db.Where("CAST(id AS TEXT) LIKE ?", shortID+"%").First(&post).Error; err != nil {
		c.HTML(http.StatusNotFound, "", gin.H{})
		return
	}

	// Validate share token
	var shareToken models.ShareToken
	if err := db.Where("post_id = ? AND token = ?", post.ID, token).First(&shareToken).Error; err != nil {
		c.HTML(http.StatusNotFound, "", gin.H{})
		return
	}

	// Check if token is expired
	if shareToken.IsExpired() {
		c.HTML(http.StatusForbidden, "", gin.H{})
		return
	}

	// Fetch first image for preview
	var firstImage models.PostImage
	db.Where("post_id = ?", post.ID).Order("id ASC").First(&firstImage)

	// Get station user
	var station models.Station
	db.Preload("User").First(&station, "id = ?", post.StationID)

	// Get frontend URL
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://sathub.local:9999"
	}

	// Build image URL for preview (use FULL UUID for image access)
	fullUUID := post.ID.String()

	// Construct API URL from the request
	scheme := "https"
	if c.Request.TLS == nil {
		scheme = "http"
	}
	apiURL := fmt.Sprintf("%s://%s", scheme, c.Request.Host)

	var imageURL string
	if firstImage.ID != 0 {
		imageURL = fmt.Sprintf("%s/api/posts/%s/images/%d?t=%s", apiURL, fullUUID, firstImage.ID, token)
	}

	// Detect if it's a crawler or regular browser
	userAgent := strings.ToLower(c.Request.UserAgent())
	isCrawler := strings.Contains(userAgent, "bot") ||
		strings.Contains(userAgent, "crawler") ||
		strings.Contains(userAgent, "spider") ||
		strings.Contains(userAgent, "facebookexternalhit") ||
		strings.Contains(userAgent, "twitterbot") ||
		strings.Contains(userAgent, "whatsapp") ||
		strings.Contains(userAgent, "telegram") ||
		strings.Contains(userAgent, "discord") ||
		strings.Contains(userAgent, "slack")

	if isCrawler {
		// Serve minimal HTML with meta tags for crawlers (use short ID for share link only)
		serveMetaTags(c, post, station, imageURL, frontendURL, fullUUID, shortID, token, apiURL)
	} else {
		// Redirect regular browsers to the frontend post page (no token needed - they'll login)
		redirectURL := fmt.Sprintf("%s/post/%s", frontendURL, fullUUID)
		c.Redirect(http.StatusFound, redirectURL)
	}
}

// serveMetaTags generates HTML with Open Graph and Twitter Card meta tags
func serveMetaTags(c *gin.Context, post models.Post, station models.Station, imageURL, frontendURL, fullUUID, shortID, token, apiURL string) {
	title := fmt.Sprintf("%s - Satellite Pass", post.SatelliteName)
	description := fmt.Sprintf("Satellite pass captured by %s station on %s",
		station.Name, post.Timestamp.Format("Jan 2, 2006 15:04"))

	// Use short ID for the shareable API URL (what bots see and share)
	shareURL := fmt.Sprintf("%s/api/share/%s?t=%s", apiURL, shortID, token)

	// Use full UUID for the frontend redirect URL (where humans go - no token needed)
	redirectURL := fmt.Sprintf("%s/post/%s", frontendURL, fullUUID)

	tmpl := template.Must(template.New("meta").Parse(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}}</title>
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="{{.ShareURL}}">
    <meta property="og:title" content="{{.Title}}">
    <meta property="og:description" content="{{.Description}}">
    {{if .ImageURL}}<meta property="og:image" content="{{.ImageURL}}">{{end}}
    <meta property="og:site_name" content="SatHub">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="{{.ShareURL}}">
    <meta name="twitter:title" content="{{.Title}}">
    <meta name="twitter:description" content="{{.Description}}">
    {{if .ImageURL}}<meta name="twitter:image" content="{{.ImageURL}}">{{end}}
    
    <!-- Telegram -->
    {{if .ImageURL}}<meta property="telegram:image" content="{{.ImageURL}}">{{end}}
    
    <meta http-equiv="refresh" content="0;url={{.RedirectURL}}">
</head>
<body>
    <p>Redirecting to <a href="{{.RedirectURL}}">{{.Title}}</a>...</p>
</body>
</html>`))

	c.Header("Content-Type", "text/html; charset=utf-8")
	tmpl.Execute(c.Writer, gin.H{
		"Title":       title,
		"Description": description,
		"ShareURL":    shareURL,
		"RedirectURL": redirectURL,
		"ImageURL":    imageURL,
	})
}

// GetPostImageWithShare allows accessing post images via share token
func GetPostImageWithShare(c *gin.Context) {
	shortID := c.Param("id")
	shareToken := c.Query("t")

	// If no share token, fall back to regular auth
	if shareToken == "" {
		GetPostImage(c)
		return
	}

	db := config.GetDB()

	// Find post by short ID prefix
	var post models.Post
	if err := db.Where("id LIKE ?", shortID+"%").First(&post).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Post not found")
		return
	}

	// Validate share token
	var token models.ShareToken
	if err := db.Where("post_id = ? AND token = ?", post.ID, shareToken).First(&token).Error; err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid or expired share token")
		return
	}

	// Check if token is expired
	if token.IsExpired() {
		utils.ErrorResponse(c, http.StatusForbidden, "Share token has expired")
		return
	}

	// Use the existing GetPostImage logic but bypass auth
	// Temporarily set a flag to skip auth check
	c.Set("share_token_validated", true)
	GetPostImage(c)
}

// generateShareURL creates the shareable URL with shortened IDs
func generateShareURL(c *gin.Context, postID, token string) string {
	// Construct API URL from the request
	scheme := "https"
	if c.Request.TLS == nil {
		scheme = "http"
	}
	apiURL := fmt.Sprintf("%s://%s", scheme, c.Request.Host)

	// Use first 8 chars of UUID for shorter URLs
	shortID := postID
	if len(postID) >= 8 {
		shortID = postID[:8]
	}
	return fmt.Sprintf("%s/api/share/%s?t=%s", apiURL, shortID, token)
}

// DeleteShareToken deletes a share token (allows users to revoke sharing)
func DeleteShareToken(c *gin.Context) {
	postID := c.Param("id")

	// Parse post ID
	postUUID, err := uuid.Parse(postID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Get user ID from context
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Invalid user ID")
		return
	}

	db := config.GetDB()

	// Delete the share token
	result := db.Where("post_id = ? AND created_by = ?", postUUID, userID).Delete(&models.ShareToken{})
	if result.Error != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete share token")
		return
	}

	if result.RowsAffected == 0 {
		utils.ErrorResponse(c, http.StatusNotFound, "No share token found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Share token deleted successfully", nil)
}

// GetShareToken retrieves the existing share token for a post
func GetShareToken(c *gin.Context) {
	postID := c.Param("id")

	// Parse post ID
	postUUID, err := uuid.Parse(postID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Get user ID from context (uses middleware.OptionalAuth)
	userIDStr, exists := middleware.GetCurrentUserID(c)
	if !exists {
		// Not logged in, can't have a share token
		utils.ErrorResponse(c, http.StatusNotFound, "No share token found")
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Invalid user ID")
		return
	}

	db := config.GetDB()

	// Find existing token
	var shareToken models.ShareToken
	if err := db.Where("post_id = ? AND created_by = ?", postUUID, userID).First(&shareToken).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "No share token found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Share token retrieved", gin.H{
		"token":      shareToken.Token,
		"expires_at": shareToken.ExpiresAt,
		"share_url":  generateShareURL(c, postID, shareToken.Token),
	})
}
