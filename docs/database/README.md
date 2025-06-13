# Database Documentation

## Overview
This directory contains all database-related documentation for the LEARN-X platform.

## Structure

- **[schema/](./schema/)** - Database schema definitions and ERD diagrams
  - Core schemas (users, courses, modules)
  - Feature schemas (file processing, analytics)
  - Storage configurations
  - [Schema README](./schema/README.md)

- **[migrations/](./migrations/)** - Database migration scripts and guides
  - Complete initial migration
  - Feature-specific migrations
  - [Migration README](./migrations/README.md)

## Database Stack

- **PostgreSQL** - Primary database (via Supabase)
- **Redis** - Caching and queue management
- **Supabase** - Database hosting, authentication, and real-time features

## Key Schema Files

### Core Database
- `schema/SUPABASE_SCHEMA.sql` - Main database schema
- `schema/COURSE_SCHEMA.sql` - Course management tables
- `schema/ANALYTICS_SCHEMA.sql` - Analytics tracking

### Storage & Files
- `schema/FILE_PROCESSING_SCHEMA.sql` - File processing pipeline
- `schema/STORAGE_BUCKETS.sql` - Storage configuration
- `schema/SUPABASE_STORAGE_AVATARS.sql` - Avatar storage

### Migrations
- `migrations/COMPLETE_MIGRATION.sql` - Full database setup
- `migrations/PERSONAS_MIGRATION.sql` - Persona features

## Quick Links

- [System Design](../architecture/SYSTEM_DESIGN.md) - Overall system architecture
- [Technical Architecture](../architecture/TECHNICAL_ARCHITECTURE.md) - Database integration details
- [API Design](../architecture/API_DESIGN.md) - API endpoints and data flow