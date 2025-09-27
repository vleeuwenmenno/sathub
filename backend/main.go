package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"satdump-ui-backend/config"
	"satdump-ui-backend/handlers"
	"satdump-ui-backend/middleware"
	"satdump-ui-backend/seed"

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

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:4001"}, // Frontend URLs + backend for proxy
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		AllowCredentials: true,
		ExposeHeaders:    []string{"Content-Length"},
	}))

	// API routes
	api := r.Group("/api")
	{
		// Protected satellite data routes (authentication required)
		posts := api.Group("/posts")
		posts.Use(middleware.AuthRequired())
		{
			posts.GET("", handlers.GetPosts)
			posts.GET("/:id", handlers.GetPostDetail)
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
			publicPosts.GET("/latest", handlers.GetLatestPosts)
			publicPosts.GET("/user/:userId", handlers.GetUserPosts)
			publicPosts.GET("/station/:stationId", middleware.OptionalAuth(), handlers.GetStationPosts)
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

		// Station health routes (station token authentication required)
		stationHealth := api.Group("/stations")
		stationHealth.Use(middleware.StationTokenAuth())
		{
			stationHealth.POST("/health", handlers.StationHealth)
		}

		// Example protected routes (for future use)
		protected := api.Group("/admin")
		protected.Use(middleware.AuthRequired())
		protected.Use(middleware.RequireRole("admin"))
		{
			// Future admin endpoints can be added here
			// protected.GET("/users", handlers.GetUsers)
			// protected.DELETE("/posts/:id", handlers.DeletePost)
		}
	}

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "satdump-ui-backend",
		})
	})

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
