export const APP_NAME = 'Fraser Valley Real Estate Photography';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REALTOR_ACCESS: '/realtor-access',
  PUBLIC_LISTING: '/listing/:slug',
  PUBLIC_LISTING_DOWNLOAD: '/listing/:slug/download',
  DASHBOARD: '/dashboard',
  DASHBOARD_LISTINGS: '/dashboard/listings',
  DASHBOARD_LISTINGS_NEW: '/dashboard/listings/new',
  DASHBOARD_LISTING_DETAIL: '/dashboard/listings/:id',
  DASHBOARD_LISTING_EDIT: '/dashboard/listings/:id/edit',
  DASHBOARD_LISTING_MEDIA: '/dashboard/listings/:id/media',
  DASHBOARD_LISTING_SHARE: '/dashboard/listings/:id/share',
  DASHBOARD_LISTING_ACTIVITY: '/dashboard/listings/:id/activity',
  DASHBOARD_REALTORS: '/dashboard/realtors',
  DASHBOARD_REALTORS_NEW: '/dashboard/realtors/new',
  DASHBOARD_REALTOR_DETAIL: '/dashboard/realtors/:id',
  DASHBOARD_REALTOR_EDIT: '/dashboard/realtors/:id/edit',
  DASHBOARD_ANALYTICS: '/dashboard/analytics',
  DASHBOARD_SETTINGS: '/dashboard/settings',
  ADMIN_USERS: '/admin/users',
  ADMIN_LISTINGS: '/admin/listings',
  ADMIN_SETTINGS: '/admin/settings',
  REALTOR_LISTINGS: '/realtor/listings',
  REALTOR_LISTING_DETAIL: '/realtor/listings/:id',
  REALTOR_LISTING_ANALYTICS: '/realtor/listings/:id/analytics',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  PHOTOGRAPHER: 'photographer',
  REALTOR: 'realtor',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
