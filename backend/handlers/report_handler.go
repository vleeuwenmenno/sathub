package handlers

import (
	"fmt"
	"net/http"
	"sathub-ui-backend/config"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/models"
	"sathub-ui-backend/utils"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateReportRequest represents the request to create a new report
type CreateReportRequest struct {
	TargetType string `json:"target_type" binding:"required"`
	TargetID   string `json:"target_id" binding:"required"`
	Title      string `json:"title" binding:"required,min=1,max=255"`
	Message    string `json:"message" binding:"required,min=1"`
}

// ReportResponse represents a report in responses
type ReportResponse struct {
	ID         string `json:"id"`
	UserID     string `json:"user_id"`
	Username   string `json:"username"`
	TargetType string `json:"target_type"`
	TargetID   string `json:"target_id"`
	Title      string `json:"title"`
	Message    string `json:"message"`
	Status     string `json:"status"`
	ReviewedBy string `json:"reviewed_by,omitempty"`
	ReviewedAt string `json:"reviewed_at,omitempty"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

// ReportsResponse represents paginated report data
type ReportsResponse struct {
	Reports    []ReportResponse `json:"reports"`
	Pagination PaginationMeta   `json:"pagination"`
}

// UpdateReportStatusRequest represents the request to update a report's status
type UpdateReportStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// CreateReport handles creating a new report (user endpoint)
func CreateReport(c *gin.Context) {
	var req CreateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Validate target type
	validTypes := models.ValidTargetTypes()
	isValidType := false
	for _, validType := range validTypes {
		if req.TargetType == validType {
			isValidType = true
			break
		}
	}
	if !isValidType {
		utils.ValidationErrorResponse(c, fmt.Sprintf("Invalid target type. Must be one of: %v", validTypes))
		return
	}

	// Get current user
	currentUserID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(currentUserID)
	if err != nil {
		utils.InternalErrorResponse(c, "Invalid user ID")
		return
	}

	db := config.GetDB()

	// Verify target exists based on type
	switch req.TargetType {
	case "post":
		var post models.Post
		if err := db.Where("id = ?", req.TargetID).First(&post).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.NotFoundResponse(c, "Post not found")
				return
			}
			utils.InternalErrorResponse(c, "Database error")
			return
		}
	case "station":
		var station models.Station
		if err := db.Where("id = ?", req.TargetID).First(&station).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.NotFoundResponse(c, "Station not found")
				return
			}
			utils.InternalErrorResponse(c, "Database error")
			return
		}
	case "user":
		targetUserID, err := uuid.Parse(req.TargetID)
		if err != nil {
			utils.ValidationErrorResponse(c, "Invalid target user ID")
			return
		}
		var user models.User
		if err := db.First(&user, targetUserID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.NotFoundResponse(c, "User not found")
				return
			}
			utils.InternalErrorResponse(c, "Database error")
			return
		}
	case "comment":
		targetCommentID, err := uuid.Parse(req.TargetID)
		if err != nil {
			utils.ValidationErrorResponse(c, "Invalid target comment ID")
			return
		}
		var comment models.Comment
		if err := db.First(&comment, targetCommentID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.NotFoundResponse(c, "Comment not found")
				return
			}
			utils.InternalErrorResponse(c, "Database error")
			return
		}
	}

	// Create the report
	report := models.Report{
		UserID:     userID,
		TargetType: req.TargetType,
		TargetID:   req.TargetID,
		Title:      req.Title,
		Message:    req.Message,
		Status:     "pending",
	}

	if err := db.Create(&report).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to create report")
		return
	}

	// Send notifications to all admins
	go func() {
		// Get the reporter's username for the notification
		var reporter models.User
		if err := db.First(&reporter, userID).Error; err == nil {
			// Send in-app notifications to admins
			message := fmt.Sprintf("New report submitted by %s: %s", reporter.Username, report.Title)
			if err := utils.SendNotificationToAdmins(db, "report", message, report.ID.String()); err != nil {
				utils.Logger.Error().Err(err).Msg("Failed to send in-app notifications to admins")
			}

			// Send email notifications to admins
			var admins []models.User
			if err := db.Where("role = ?", "admin").Find(&admins).Error; err == nil {
				for _, admin := range admins {
					if admin.Email.Valid {
						if err := utils.SendReportNotificationEmail(
							admin.Email.String,
							reporter.Username,
							report.TargetType,
							report.Title,
							report.Message,
							admin.Language,
						); err != nil {
							utils.Logger.Error().Err(err).Str("admin_email", admin.Email.String).Msg("Failed to send report notification email")
						}
					}
				}
			}
		}
	}()

	utils.SuccessResponse(c, http.StatusCreated, "Report created successfully", gin.H{
		"id": report.ID.String(),
	})
}

// GetReports handles fetching reports with filtering and pagination (admin only)
func GetReports(c *gin.Context) {
	db := config.GetDB()

	// Parse query parameters
	page := 1
	limit := 20
	status := c.Query("status")
	targetType := c.Query("target_type")
	targetID := c.Query("target_id")
	userID := c.Query("user_id")

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := fmt.Sscanf(pageStr, "%d", &page); err != nil || p != 1 {
			page = 1
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := fmt.Sscanf(limitStr, "%d", &limit); err != nil || l != 1 {
			limit = 20
		}
		// Cap limit at 100
		if limit > 100 {
			limit = 100
		}
	}

	offset := (page - 1) * limit

	// Build query
	query := db.Model(&models.Report{}).Preload("User")

	// Add filters
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if targetType != "" {
		query = query.Where("target_type = ?", targetType)
	}
	if targetID != "" {
		query = query.Where("target_id = ?", targetID)
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to count reports")
		return
	}

	// Get paginated results
	var reports []models.Report
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&reports).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to fetch reports")
		return
	}

	// Convert to response format
	reportResponses := make([]ReportResponse, len(reports))
	for i, report := range reports {
		response := ReportResponse{
			ID:         report.ID.String(),
			UserID:     report.UserID.String(),
			TargetType: report.TargetType,
			TargetID:   report.TargetID,
			Title:      report.Title,
			Message:    report.Message,
			Status:     report.Status,
			CreatedAt:  report.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:  report.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if report.User.Username != "" {
			response.Username = report.User.Username
		}

		if report.ReviewedBy != nil {
			response.ReviewedBy = report.ReviewedBy.String()
		}

		if report.ReviewedAt != nil {
			response.ReviewedAt = report.ReviewedAt.Format("2006-01-02T15:04:05Z07:00")
		}

		reportResponses[i] = response
	}

	// Calculate total pages
	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := ReportsResponse{
		Reports: reportResponses,
		Pagination: PaginationMeta{
			Page:  page,
			Limit: limit,
			Total: int(total),
			Pages: totalPages,
		},
	}

	utils.SuccessResponse(c, http.StatusOK, "Reports retrieved successfully", response)
}

// UpdateReportStatus handles updating a report's status (admin only)
func UpdateReportStatus(c *gin.Context) {
	reportIDStr := c.Param("id")
	if reportIDStr == "" {
		utils.ValidationErrorResponse(c, "Report ID is required")
		return
	}

	// Parse report ID
	reportID, err := uuid.Parse(reportIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid report ID format")
		return
	}

	var req UpdateReportStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	// Validate status
	validStatuses := models.ValidStatuses()
	isValidStatus := false
	for _, validStatus := range validStatuses {
		if req.Status == validStatus {
			isValidStatus = true
			break
		}
	}
	if !isValidStatus {
		utils.ValidationErrorResponse(c, fmt.Sprintf("Invalid status. Must be one of: %v", validStatuses))
		return
	}

	db := config.GetDB()

	// Find the report
	var report models.Report
	if err := db.First(&report, reportID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Report not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Get current admin user ID
	currentUserID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.UnauthorizedResponse(c, "User not authenticated")
		return
	}

	adminUserID, err := uuid.Parse(currentUserID)
	if err != nil {
		utils.InternalErrorResponse(c, "Invalid admin user ID")
		return
	}

	// Update the report
	oldStatus := report.Status
	report.Status = req.Status
	report.ReviewedBy = &adminUserID
	now := time.Now()
	report.ReviewedAt = &now

	if err := db.Save(&report).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to update report status")
		return
	}

	// Log the status update
	utils.LogAuditEvent(c, models.ActionAdminReportUpdate, models.TargetTypeReport, reportID.String(), models.AuditMetadata{
		"target_type": report.TargetType,
		"target_id":   report.TargetID,
		"old_status":  oldStatus,
		"new_status":  req.Status,
	})

	utils.SuccessResponse(c, http.StatusOK, "Report status updated successfully", nil)
}

// DeleteReport handles deleting a report (admin only)
func DeleteReport(c *gin.Context) {
	reportIDStr := c.Param("id")
	if reportIDStr == "" {
		utils.ValidationErrorResponse(c, "Report ID is required")
		return
	}

	// Parse report ID
	reportID, err := uuid.Parse(reportIDStr)
	if err != nil {
		utils.ValidationErrorResponse(c, "Invalid report ID format")
		return
	}

	db := config.GetDB()

	// Find the report
	var report models.Report
	if err := db.First(&report, reportID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "Report not found")
			return
		}
		utils.InternalErrorResponse(c, "Database error")
		return
	}

	// Delete the report
	if err := db.Delete(&report).Error; err != nil {
		utils.InternalErrorResponse(c, "Failed to delete report")
		return
	}

	// Log the deletion
	utils.LogAuditEvent(c, models.ActionAdminReportDelete, models.TargetTypeReport, reportID.String(), models.AuditMetadata{
		"target_type": report.TargetType,
		"target_id":   report.TargetID,
	})

	utils.SuccessResponse(c, http.StatusOK, "Report deleted successfully", nil)
}
