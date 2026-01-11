// Centralized constants for the application

// Admin configuration
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";

// Session durations
export const ADMIN_SESSION_DURATION_HOURS = 1; // 60 minutes
export const TRUSTED_DEVICE_DAYS = 30;

// App URLs
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Cookie names
export const ADMIN_SESSION_COOKIE = "admin_session_id";
export const DEVICE_VERIFICATION_COOKIE = "device_verification_pending";
