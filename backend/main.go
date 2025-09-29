package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"sathub-ui-backend/config"
	"sathub-ui-backend/handlers"
	"sathub-ui-backend/middleware"
	"sathub-ui-backend/seed"
	"sathub-ui-backend/utils"
	"strings"

	"github.com/dchest/captcha"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Parse command line flags
	seedFlag := flag.Bool("seed", false, "Run database seeding")
	flag.Parse()

	// Load environment variables
	if err := godotenv.Load(".env.development"); err != nil {
		log.Println("Warning: .env.development file not found, using system environment variables")
	}

	// Initialize database
	config.InitDatabase()
	defer config.CloseDatabase()

	// Initialize storage
	utils.InitStorage()

	// Run seeding if flag is provided
	if *seedFlag {
		fmt.Println("Starting database seeding...")
		if err := seed.Database(); err != nil {
			log.Fatalf("Seeding failed: %v", err)
		}
		fmt.Println("Database seeding completed!")
		return
	}

	// Set Gin mode from environment
	if mode := os.Getenv("GIN_MODE"); mode != "" {
		gin.SetMode(mode)
	}

	// Create Gin router
	r := gin.Default()

	// Set maximum multipart memory to 32MB (prevents large file attacks)
	r.MaxMultipartMemory = 32 << 20 // 32 MiB

	// Configure CORS for cross-origin requests
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://sathub.local:9999"
	}

	// Get additional allowed origins from environment
	additionalOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")

	// Configure CORS
	corsConfig := cors.DefaultConfig()
	allowedOrigins := []string{frontendURL}

	// Add localhost origins for development
	if gin.Mode() == gin.DebugMode {
		allowedOrigins = append(allowedOrigins, "http://localhost:5173", "https://localhost:5173", "http://127.0.0.1:5173", "https://127.0.0.1:5173")
	}

	// Add additional origins from environment variable (comma-separated)
	if additionalOrigins != "" {
		for _, origin := range strings.Split(additionalOrigins, ",") {
			origin = strings.TrimSpace(origin)
			if origin != "" {
				allowedOrigins = append(allowedOrigins, origin)
			}
		}
	}

	corsConfig.AllowOrigins = allowedOrigins
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization", "X-Requested-With", "Accept"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"}

	r.Use(cors.New(corsConfig))

	// Captcha routes
	r.GET("/captcha/*path", gin.WrapH(captcha.Server(captcha.StdWidth, captcha.StdHeight)))
	r.GET("/api/captcha/new", func(c *gin.Context) {
		id := captcha.New()
		c.JSON(200, gin.H{"captcha_id": id})
	})

	// Version endpoint (no authentication required)
	r.GET("/api/version", func(c *gin.Context) {
		c.JSON(200, gin.H{"version": VERSION})
	})

	// API routes
	api := r.Group("/api")
	{
		// Health check endpoint
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"service": "sathub-ui-backend",
			})
		})

		// Protected satellite data routes (authentication required)
		posts := api.Group("/posts")
		posts.Use(middleware.AuthRequired())
		{
			posts.GET("", handlers.GetPosts)
			posts.GET("/:id/image/*filename", handlers.GetImage)
		}

		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.POST("/refresh", handlers.RefreshTokens)
			auth.POST("/logout", handlers.Logout)
			auth.POST("/forgot-password", handlers.ForgotPassword)
			auth.POST("/reset-password", handlers.ResetPassword)
			auth.POST("/confirm-email", handlers.ConfirmEmail)
			auth.POST("/resend-confirmation", handlers.ResendConfirmationEmail)
			auth.POST("/confirm-email-change", handlers.ConfirmEmailChange)
			auth.POST("/verify-2fa", middleware.TwoFactorRequired(), handlers.VerifyTwoFactorCode)
			auth.POST("/verify-recovery-code", handlers.VerifyRecoveryCode)

			// Protected auth routes
			protected := auth.Group("")
			protected.Use(middleware.AuthRequired())
			{
				protected.GET("/profile", handlers.GetProfile)
				protected.PUT("/profile", handlers.UpdateProfile)
				protected.POST("/profile/upload-picture", handlers.UploadProfilePicture)
				protected.POST("/enable-2fa", handlers.EnableTwoFactor)
				protected.POST("/verify-2fa-setup", handlers.VerifyTwoFactorSetup)
				protected.POST("/disable-2fa", handlers.DisableTwoFactor)
				protected.POST("/confirm-disable-2fa", handlers.ConfirmDisableTwoFactor)
				protected.GET("/2fa-status", handlers.GetTwoFactorStatus)
				protected.POST("/generate-recovery-codes", handlers.GenerateRecoveryCodes)
				protected.POST("/regenerate-recovery-codes", handlers.RegenerateRecoveryCodes)
			}
		}

		// Station management routes
		stations := api.Group("/stations")
		stations.Use(middleware.AuthRequired())
		{
			stations.GET("", handlers.GetStations)
			stations.POST("", handlers.CreateStation)
			stations.GET("/:id", handlers.GetStation)
			stations.PUT("/:id", handlers.UpdateStation)
			stations.DELETE("/:id", handlers.DeleteStation)
			stations.GET("/:id/token", handlers.GetStationToken)
			stations.POST("/:id/regenerate-token", handlers.RegenerateStationToken)
			stations.POST("/:id/upload-picture", handlers.UploadStationPicture)
		}

		// Protected global station routes (authentication required)
		protectedGlobalStations := api.Group("/stations")
		protectedGlobalStations.Use(middleware.AuthRequired())
		{
			protectedGlobalStations.GET("/global", handlers.GetGlobalStations)
		}

		// Public station routes (no authentication required)
		publicStations := api.Group("/stations")
		{
			publicStations.GET("/user/:userId", handlers.GetUserStations)
			publicStations.GET("/:id/picture", middleware.OptionalAuth(), handlers.GetStationPicture)
		}

		// Public user routes (no authentication required)
		publicUsers := api.Group("/users")
		{
			publicUsers.GET("/:id/profile-picture", handlers.GetProfilePicture)
		}

		// Station details (authentication required)
		api.GET("/stations/:id/details", middleware.AuthRequired(), handlers.GetStationDetails)

		// Protected global user routes (authentication required)
		protectedGlobalUsers := api.Group("/users")
		protectedGlobalUsers.Use(middleware.AuthRequired())
		{
			protectedGlobalUsers.GET("/global", handlers.GetGlobalUsers)
		}

		// Public post routes (no authentication required)
		publicPosts := api.Group("/posts")
		{
			publicPosts.GET("/latest", middleware.OptionalAuth(), handlers.GetLatestPosts)
			publicPosts.GET("/user/:userId", handlers.GetUserPosts)
			publicPosts.GET("/station/:stationId", middleware.OptionalAuth(), handlers.GetStationPosts)
			publicPosts.GET("/:id", middleware.OptionalAuth(), handlers.GetDatabasePostDetail)
			publicPosts.GET("/:id/images/:imageId", middleware.OptionalAuth(), handlers.GetPostImage)
		}

		// Protected post routes (user authentication required)
		protectedPosts := api.Group("/posts")
		protectedPosts.Use(middleware.AuthRequired())
		{
			protectedPosts.DELETE("/:id", handlers.DeletePost)
		}

		// Station post routes (station token authentication required)
		stationPosts := api.Group("/posts")
		stationPosts.Use(middleware.StationTokenAuth())
		{
			stationPosts.POST("", handlers.CreatePost)
			stationPosts.POST("/:postId/images", handlers.UploadPostImage)
		}

		// Like routes (user authentication required)
		likes := api.Group("/likes")
		likes.Use(middleware.AuthRequired())
		{
			likes.POST("/:postId", handlers.LikePost)
			likes.GET("/user/:userId", handlers.GetUserLikedPosts)
		}

		// Public comment routes (no authentication required for viewing)
		publicComments := api.Group("/comments")
		{
			publicComments.GET("/post/:postId", middleware.OptionalAuth(), handlers.GetCommentsForPost)
		}

		// Protected comment routes (user authentication required)
		protectedComments := api.Group("/comments")
		protectedComments.Use(middleware.AuthRequired())
		{
			protectedComments.POST("/post/:postId", handlers.CreateComment)
			protectedComments.PUT("/:commentId", handlers.UpdateComment)
			protectedComments.DELETE("/:commentId", handlers.DeleteComment)
			protectedComments.POST("/likes/:commentId", handlers.LikeComment)
		}

		// Achievement routes (user authentication required)
		achievements := api.Group("/achievements")
		achievements.Use(middleware.AuthRequired())
		{
			achievements.GET("", handlers.GetUserAchievements)
			achievements.GET("/all", handlers.GetAllAchievements)
		}

		// Notification routes (user authentication required)
		notificationHandler := handlers.NewNotificationHandler(config.GetDB())
		notifications := api.Group("/notifications")
		notifications.Use(middleware.AuthRequired())
		{
			notifications.GET("", notificationHandler.GetNotifications)
			notifications.PUT("/:id/read", notificationHandler.MarkAsRead)
			notifications.PUT("/read-all", notificationHandler.MarkAllAsRead)
			notifications.DELETE("/:id", notificationHandler.DeleteNotification)
			notifications.GET("/unread-count", notificationHandler.GetUnreadCount)
		}

		// Station health routes (station token authentication required)
		stationHealth := api.Group("/stations")
		stationHealth.Use(middleware.StationTokenAuth())
		{
			stationHealth.POST("/health", handlers.StationHealth)
		}

		// Admin routes (admin role required)
		admin := api.Group("/admin")
		admin.Use(middleware.AuthRequired())
		admin.Use(middleware.RequireRole("admin"))
		{
			admin.GET("/overview", handlers.GetAdminOverview)
			admin.GET("/users", handlers.GetAllUsers)
			admin.GET("/users/:id", handlers.GetUserDetails)
			admin.PUT("/users/:id/role", handlers.UpdateUserRole)
			admin.PUT("/users/:id/approve", handlers.ApproveUser)
			admin.PUT("/users/:id/ban", handlers.BanUser)
			admin.DELETE("/users/:id", handlers.DeleteUser)
			admin.DELETE("/posts/:id", handlers.AdminDeletePost)
			admin.GET("/invite", handlers.GetAdminInvite)
			admin.GET("/settings/registration", handlers.GetRegistrationSettings)
			admin.PUT("/settings/registration", handlers.UpdateRegistrationSettings)
			admin.GET("/settings/approval", handlers.GetApprovalSettings)
			admin.PUT("/settings/approval", handlers.UpdateApprovalSettings)
			admin.GET("/audit-logs", handlers.GetAuditLogs)
		}

		// Public routes (no authentication required)
		public := api.Group("/")
		{
			public.GET("/settings/registration", handlers.GetRegistrationSettings)
		}
	}

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}

	log.Printf("Starting server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
