package main

import (
	"os"

	"sathub-ui-backend/config"
	"sathub-ui-backend/seed"
	"sathub-ui-backend/utils"

	"github.com/spf13/cobra"
)

var (
	testScenario85 bool
	testScenario90 bool
)

var rootCmd = &cobra.Command{
	Use:   "seed",
	Short: "SatHub Database Seeder",
	Long:  `Seed the SatHub database with test data and scenarios.`,
	Run:   runSeed,
}

func init() {
	// Initialize logger
	utils.InitLogger()

	// Add flags
	rootCmd.Flags().BoolVar(&testScenario85, "test-85", false, "Run the 85% uptime test scenario instead of full seeding")
	rootCmd.Flags().BoolVar(&testScenario90, "test-90", false, "Run the 90.5% uptime test scenario (adds to existing 85% scenario)")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		utils.Logger.Fatal().Err(err).Msg("Failed to execute command")
		os.Exit(1)
	}
}

func runSeed(cmd *cobra.Command, args []string) {
	utils.Logger.Info().Msg("Starting database seeding")

	// Set database path for seeding (use local path if not set)
	if os.Getenv("DB_PATH") == "" {
		os.Setenv("DB_PATH", "./sathub.db")
	}

	// Initialize database
	config.InitDatabase()
	defer config.CloseDatabase()

	// Run seeding based on flag
	var err error
	if testScenario90 {
		utils.Logger.Info().Msg("Running 90% uptime test scenario")
		err = seed.TestScenario90PercentUptime()
	} else if testScenario85 {
		utils.Logger.Info().Msg("Running 85% uptime test scenario")
		err = seed.TestScenario85PercentUptime()
	} else {
		utils.Logger.Info().Msg("Running auto-seed for essential data")
		err = seed.AutoSeed()
	}

	if err != nil {
		utils.Logger.Fatal().Err(err).Msg("Seeding failed")
	}

	utils.Logger.Info().Str("db_path", os.Getenv("DB_PATH")).Msg("Database seeding completed successfully")
}
