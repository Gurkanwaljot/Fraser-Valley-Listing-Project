import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { QueryClientProvider } from '@tanstack/react-query';
import theme from './theme';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PageErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import NotFoundPage from './pages/public/NotFoundPage';

const RealtorAccessPage = lazy(() => import('./pages/auth/RealtorAccessPage'));
const DashboardOverview = lazy(() => import('./pages/dashboard/DashboardOverview'));
const ListingsPage = lazy(() => import('./pages/dashboard/ListingsPage'));
const ListingCreatePage = lazy(() => import('./pages/dashboard/ListingCreatePage'));
const ListingDetailPage = lazy(() => import('./pages/dashboard/ListingDetailPage'));
const ListingEditPage = lazy(() => import('./pages/dashboard/ListingEditPage'));
const ListingSharePage = lazy(() => import('./pages/dashboard/ListingSharePage'));
const ListingActivityPage = lazy(() => import('./pages/dashboard/ListingActivityPage'));
const RealtorsPage = lazy(() => import('./pages/dashboard/RealtorsPage'));
const RealtorCreatePage = lazy(() => import('./pages/dashboard/RealtorCreatePage'));
const RealtorDetailPage = lazy(() => import('./pages/dashboard/RealtorDetailPage'));
const RealtorEditPage = lazy(() => import('./pages/dashboard/RealtorEditPage'));
const AnalyticsPage = lazy(() => import('./pages/dashboard/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage'));
const AdminListingsPage = lazy(() => import('./pages/admin/AdminListingsPage'));
const AdminStoragePage = lazy(() => import('./pages/admin/AdminStoragePage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const MediaManagerPage = lazy(() => import('./pages/dashboard/MediaManagerPage'));
const PublicListingPage = lazy(() => import('./pages/public/PublicListingPage'));
const DownloadCenterPage = lazy(() => import('./pages/public/DownloadCenterPage'));
const CloudflareR2SetupGuide = lazy(() => import('./pages/public/CloudflareR2SetupGuide'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const UpdatePasswordPage = lazy(() => import('./pages/auth/UpdatePasswordPage'));
const RealtorPortalPage = lazy(() => import('./pages/realtor/RealtorPortalPage'));
const MarketingKitPage = lazy(() => import('./pages/realtor/MarketingKitPage'));
function DashboardFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <CircularProgress size={32} sx={{ color: 'primary.main' }} />
    </Box>
  );
}

function DownloadRedirect() {
  const [searchParams] = useSearchParams();
  const dl = searchParams.get('dl');
  const t = searchParams.get('t');

  if (dl && t) return <DownloadCenterPage />;
  return <LandingPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <PageErrorBoundary>
                <Suspense fallback={null}>
                  <Routes>
                    {/* Public routes */}
                    <Route element={<PublicLayout />}>
                      <Route path="/" element={<DownloadRedirect />} />
                    </Route>
                    <Route path="/listing/:slug" element={<PublicListingPage />} />
                    <Route path="/listing/:slug/download" element={<DownloadCenterPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
                    <Route path="/realtor-access" element={<RealtorAccessPage />} />
                    <Route path="/setup/r2" element={<CloudflareR2SetupGuide />} />


                    {/* Realtor portal */}
                    <Route
                      path="/realtor/listings"
                      element={
                        <ProtectedRoute requiredRoles={['realtor', 'admin', 'photographer']} redirectTo="/realtor-access">
                          <RealtorPortalPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/realtor/marketing/:slug"
                      element={
                        <ProtectedRoute requiredRoles={['realtor', 'admin', 'photographer']} redirectTo="/realtor-access">
                          <MarketingKitPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Dashboard routes (photographer + admin) */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute requiredRoles={['admin', 'photographer']}>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Suspense fallback={<DashboardFallback />}><DashboardOverview /></Suspense>} />
                      <Route path="listings" element={<Suspense fallback={<DashboardFallback />}><ListingsPage /></Suspense>} />
                      <Route path="listings/new" element={<Suspense fallback={<DashboardFallback />}><ListingCreatePage /></Suspense>} />
                      <Route path="listings/:id" element={<Suspense fallback={<DashboardFallback />}><ListingDetailPage /></Suspense>} />
                      <Route path="listings/:id/edit" element={<Suspense fallback={<DashboardFallback />}><ListingEditPage /></Suspense>} />
                      <Route path="listings/:id/media" element={<Suspense fallback={<DashboardFallback />}><MediaManagerPage /></Suspense>} />
                      <Route path="listings/:id/share" element={<Suspense fallback={<DashboardFallback />}><ListingSharePage /></Suspense>} />
                      <Route path="listings/:id/activity" element={<Suspense fallback={<DashboardFallback />}><ListingActivityPage /></Suspense>} />
                      <Route path="realtors" element={<Suspense fallback={<DashboardFallback />}><RealtorsPage /></Suspense>} />
                      <Route path="realtors/new" element={<Suspense fallback={<DashboardFallback />}><RealtorCreatePage /></Suspense>} />
                      <Route path="realtors/:id" element={<Suspense fallback={<DashboardFallback />}><RealtorDetailPage /></Suspense>} />
                      <Route path="realtors/:id/edit" element={<Suspense fallback={<DashboardFallback />}><RealtorEditPage /></Suspense>} />
                      <Route path="analytics" element={<Suspense fallback={<DashboardFallback />}><AnalyticsPage /></Suspense>} />
                      <Route path="settings" element={<Suspense fallback={<DashboardFallback />}><SettingsPage /></Suspense>} />
                    </Route>

                    {/* Admin routes */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="users" element={<Suspense fallback={<DashboardFallback />}><AdminUsersPage /></Suspense>} />
                      <Route path="listings" element={<Suspense fallback={<DashboardFallback />}><AdminListingsPage /></Suspense>} />
                      <Route path="audit" element={<Suspense fallback={<DashboardFallback />}><AdminAuditPage /></Suspense>} />
                      <Route path="storage" element={<Suspense fallback={<DashboardFallback />}><AdminStoragePage /></Suspense>} />
                      <Route path="analytics" element={<Suspense fallback={<DashboardFallback />}><AdminAnalyticsPage /></Suspense>} />
                    </Route>

                    {/* 404 Fallback */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </PageErrorBoundary>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
