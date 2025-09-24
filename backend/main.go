package main

import (
	"log"
	"os"
	"satdump-ui-backend/config"
	"satdump-ui-backend/handlers"
	"satdump-ui-backend/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	config.InitDatabase()
	defer config.CloseDatabase()

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

			// Protected auth routes
			protected := auth.Group("")
			protected.Use(middleware.AuthRequired())
			{
				protected.GET("/profile", handlers.GetProfile)
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

		// Public station routes (no authentication required)
		publicStations := api.Group("/stations")
		{
			publicStations.GET("/global", handlers.GetGlobalStations)
			publicStations.GET("/user/:userId", handlers.GetUserStations)
			publicStations.GET("/:id/picture", middleware.OptionalAuth(), handlers.GetStationPicture)
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
