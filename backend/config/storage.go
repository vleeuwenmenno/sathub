package config

type StorageConfig struct {
	Type        string
	Endpoint    string
	Bucket      string
	AccessKey   string
	SecretKey   string
	Region      string
	ExternalURL string
}

var storageConfig *StorageConfig

// GetStorageConfig returns the storage configuration
func GetStorageConfig() *StorageConfig {
	if storageConfig == nil {
		storageType := getEnv("STORAGE_TYPE", "minio")
		endpoint := getEnv("MINIO_ENDPOINT", "http://obj.sathub.local")
		bucket := getEnv("MINIO_BUCKET", "sathub-images")
		accessKey := getEnv("MINIO_ACCESS_KEY", "minioadmin")
		secretKey := getEnv("MINIO_SECRET_KEY", "minioadmin")
		region := getEnv("MINIO_REGION", "us-east-1")

		// Determine external URL based on environment
		externalURL := getEnv("MINIO_EXTERNAL_URL", "https://obj.sathub.local:9999")
		if frontendURL := getEnv("FRONTEND_URL", ""); frontendURL != "" {
			// If we're in production (FRONTEND_URL is set to production domain)
			if frontendURL == "https://sathub.de" {
				externalURL = "https://obj.sathub.de"
			}
		}

		storageConfig = &StorageConfig{
			Type:        storageType,
			Endpoint:    endpoint,
			Bucket:      bucket,
			AccessKey:   accessKey,
			SecretKey:   secretKey,
			Region:      region,
			ExternalURL: externalURL,
		}
	}
	return storageConfig
}
