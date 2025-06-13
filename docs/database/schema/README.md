# Database Schema Documentation

This directory contains all database schema definitions for the LEARN-X platform.

## Schema Files

### Core Schemas
- **SUPABASE_SCHEMA.sql** - Main Supabase database schema with core tables
- **COURSE_SCHEMA.sql** - Course management schema (courses, modules, enrollments)
- **ANALYTICS_SCHEMA.sql** - Analytics and tracking schema

### Feature Schemas
- **FILE_PROCESSING_SCHEMA.sql** - File processing pipeline schema
- **COURSE_FILES_STORAGE.sql** - Course file storage relationships
- **FILE_POSITION_FUNCTION.sql** - Database function for managing file positions

### Storage Schemas
- **STORAGE_BUCKETS.sql** - Storage bucket configurations
- **SUPABASE_STORAGE.sql** - General Supabase storage setup
- **SUPABASE_STORAGE_AVATARS.sql** - Avatar-specific storage configuration

## Database Technology

- **Primary Database**: PostgreSQL (via Supabase)
- **Caching Layer**: Redis
- **Real-time**: Supabase Realtime subscriptions

## Schema Conventions

1. All tables use `snake_case` naming
2. Primary keys are typically `id` (UUID)
3. Timestamps: `created_at`, `updated_at`
4. Foreign keys follow pattern: `{table}_id`
5. RLS (Row Level Security) policies are defined for each table

## Quick Reference

For complete system architecture, see:
- [Technical Architecture](../../architecture/TECHNICAL_ARCHITECTURE.md)
- [System Design](../../architecture/SYSTEM_DESIGN.md)