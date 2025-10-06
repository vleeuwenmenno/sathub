# Database Cloning Script

This script helps you clone your production database to your local development environment for testing and debugging.

## Prerequisites

1. **Production database proxy** running on port `5555`:
   ```bash
   ssh -L 5555:localhost:5432 your-prod-server
   ```

2. **Development database** running on port `5432`:
   ```bash
   docker compose up -d postgres
   ```

3. **PostgreSQL client tools** installed:
   - `pg_dump`
   - `psql`

## Usage

### Basic Usage

```bash
./scripts/clone-prod-db.sh
```

The script will:
1. ✅ Check connections to both databases
2. 📦 Create a backup from production (port 5555)
3. 🗑️  Drop and recreate the development database (port 5432)
4. 📥 Restore the backup to development
5. ✅ Verify the data was copied correctly
6. 🧹 Clean up temporary files

### With Password

If your databases require a password, set the `PGPASSWORD` environment variable:

```bash
PGPASSWORD="your_password" ./scripts/clone-prod-db.sh
```

Or create a `.pgpass` file in your home directory:
```bash
echo "localhost:5555:sathub:sathub:your_password" >> ~/.pgpass
echo "localhost:5432:sathub:sathub:your_password" >> ~/.pgpass
chmod 600 ~/.pgpass
```

## What It Does

- **Creates a temporary backup** of the production database in `/tmp/`
- **Terminates connections** to the development database before dropping it
- **Drops and recreates** the development database (⚠️ **ALL LOCAL DATA WILL BE LOST**)
- **Restores** all tables, data, and constraints from production
- **Verifies** the clone by counting tables, posts, and users
- **Cleans up** the temporary backup file

## Safety Features

- ✅ Checks database connectivity before proceeding
- ⚠️  Displays a warning and requires explicit confirmation
- 📊 Shows verification statistics after restore
- 🧹 Automatically cleans up temporary files

## After Cloning

After the database is cloned, you may want to:

1. **Restart backend services** to pick up the new data:
   ```bash
   docker compose restart backend worker
   ```

2. **Reprocess ground tracks** if needed:
   ```bash
   # The worker will automatically process posts without ground tracks
   docker compose logs -f worker
   ```

3. **Clear MinIO data** if you want to re-upload images:
   ```bash
   docker compose down minio
   docker volume rm sathub_minio_data
   docker compose up -d minio
   ```

## Configuration

If you need to change the database ports or names, edit the script variables at the top:

```bash
# Production database
PROD_HOST="localhost"
PROD_PORT="5555"
PROD_DB="sathub"
PROD_USER="sathub"

# Development database
DEV_HOST="localhost"
DEV_PORT="5432"
DEV_DB="sathub"
DEV_USER="sathub"
```

## Troubleshooting

### "Cannot connect to production database"
- Make sure your SSH tunnel is active: `ssh -L 5555:localhost:5432 your-server`
- Check if the port is correct: `psql -h localhost -p 5555 -U sathub -d sathub`

### "Cannot connect to development database"
- Make sure Docker containers are running: `docker compose up -d`
- Check if PostgreSQL is ready: `docker compose logs postgres`

### "Backup failed"
- Check disk space: `df -h /tmp`
- Verify production database connectivity
- Check permissions for `/tmp` directory

### "Restore failed"
- The script will show detailed error messages
- Check if the development database was created: `psql -h localhost -p 5432 -U sathub -l`
- Look for schema conflicts or version mismatches

## Warning ⚠️

This script **WILL DELETE ALL DATA** in your development database. Make sure you:
- ✅ Are targeting the correct database
- ✅ Have no important local test data you want to keep
- ✅ Understand the consequences

The script requires explicit `yes` confirmation before proceeding.

## Example Output

```
╔════════════════════════════════════════╗
║  SatHub Database Cloning Tool         ║
╚════════════════════════════════════════╝

Step 1: Checking production database
✓ Connected to localhost:5555

Step 2: Checking development database
✓ Connected to localhost:5432

⚠️  WARNING ⚠️
This will:
  1. Create a backup from: localhost:5555/sathub
  2. Drop and recreate: localhost:5432/sathub
  3. Restore data to development database

ALL DATA IN YOUR DEVELOPMENT DATABASE WILL BE LOST!

Are you sure you want to continue? (yes/no): yes

Step 3: Creating backup from production database
✓ Backup created successfully (45M)

Step 4: Resetting development database
✓ Database reset complete

Step 5: Restoring backup to development database
✓ Restore completed successfully

Step 6: Verifying data
✓ Database verification:
  Tables: 15
  Posts: 1234
  Users: 56

Step 7: Cleanup
✓ Cleanup complete

╔════════════════════════════════════════╗
║  Database cloning completed! 🎉        ║
╚════════════════════════════════════════╝
```
