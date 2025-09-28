package utils

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"path/filepath"
	"sathub-ui-backend/config"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var s3Client *s3.Client

// InitStorage initializes the storage client
func InitStorage() {
	cfg := config.GetStorageConfig()

	log.Printf("Initializing storage: type=%s, endpoint=%s, bucket=%s", cfg.Type, cfg.Endpoint, cfg.Bucket)

	// Create S3 client (works with MinIO)
	resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: cfg.Endpoint,
		}, nil
	})

	awsCfg := aws.Config{
		Region:                      cfg.Region,
		Credentials:                 credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
		EndpointResolverWithOptions: resolver,
	}

	s3Client = s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true // Use path-style URLs for MinIO compatibility
	})

	// Ensure bucket exists
	ensureBucketExists(cfg.Bucket)
	log.Println("Storage initialized successfully")
}

// ensureBucketExists creates the bucket if it doesn't exist and sets public read policy
func ensureBucketExists(bucketName string) {
	log.Printf("Checking if bucket %s exists", bucketName)
	_, err := s3Client.HeadBucket(context.TODO(), &s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})

	if err != nil {
		log.Printf("Bucket %s doesn't exist, creating it", bucketName)
		// Bucket doesn't exist, create it
		_, err := s3Client.CreateBucket(context.TODO(), &s3.CreateBucketInput{
			Bucket: aws.String(bucketName),
		})
		if err != nil {
			log.Printf("Failed to create bucket %s: %v", bucketName, err)
			return
		}
		log.Printf("Successfully created bucket %s", bucketName)
	} else {
		log.Printf("Bucket %s already exists", bucketName)
	}

	// Set bucket policy to allow public read access
	policy := `{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": "*",
				"Action": "s3:GetObject",
				"Resource": "arn:aws:s3:::` + bucketName + `/*"
			}
		]
	}`

	log.Printf("Setting public read policy for bucket %s", bucketName)
	_, err = s3Client.PutBucketPolicy(context.TODO(), &s3.PutBucketPolicyInput{
		Bucket: aws.String(bucketName),
		Policy: aws.String(policy),
	})

	if err != nil {
		log.Printf("Failed to set bucket policy for %s: %v", bucketName, err)
	} else {
		log.Printf("Successfully set public read policy for bucket %s", bucketName)
	}
}

// UploadImage uploads an image to storage and returns the URL
func UploadImage(data []byte, filename string, contentType string, postID uint) (string, error) {
	cfg := config.GetStorageConfig()

	// Generate unique filename
	ext := filepath.Ext(filename)
	name := strings.TrimSuffix(filename, ext)
	uniqueName := fmt.Sprintf("%s_%d%s", name, time.Now().UnixNano(), ext)

	key := fmt.Sprintf("images/post-%d/%s", postID, uniqueName)

	log.Printf("Uploading image to MinIO: bucket=%s, key=%s, endpoint=%s", cfg.Bucket, key, cfg.Endpoint)

	// Upload to S3/MinIO
	_, err := s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(cfg.Bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	})

	if err != nil {
		log.Printf("Failed to upload image to MinIO: %v", err)
		return "", fmt.Errorf("failed to upload image: %w", err)
	}

	log.Printf("Successfully uploaded image: %s", key)

	// Return the URL
	url := fmt.Sprintf("%s/%s/%s", cfg.Endpoint, cfg.Bucket, key)
	return url, nil
}

// GetImageURL returns the URL for an image key
func GetImageURL(key string) string {
	cfg := config.GetStorageConfig()
	return fmt.Sprintf("%s/%s/%s", cfg.Endpoint, cfg.Bucket, key)
}

// DeleteImage deletes an image from storage
func DeleteImage(imageURL string) error {
	cfg := config.GetStorageConfig()

	// Extract key from URL
	// URL format: http://minio:9000/bucket/images/filename
	parts := strings.Split(imageURL, "/")
	if len(parts) < 4 {
		return fmt.Errorf("invalid image URL format")
	}

	// Find the bucket and key parts
	bucketIndex := -1
	for i, part := range parts {
		if part == cfg.Bucket {
			bucketIndex = i
			break
		}
	}

	if bucketIndex == -1 || bucketIndex >= len(parts)-1 {
		return fmt.Errorf("could not extract key from URL")
	}

	key := strings.Join(parts[bucketIndex+1:], "/")

	_, err := s3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(cfg.Bucket),
		Key:    aws.String(key),
	})

	return err
}
