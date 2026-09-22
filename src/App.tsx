import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SiteProvider, useSite } from './context/SiteContext';

// Common Public Shell
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { DonationModal } from './components/common/DonationModal';
import { AssistantChatWidget } from './components/public/AssistantChatWidget';
import { MaintenanceDisplay } from './components/maintenance/MaintenanceDisplay';

// Public Views
import { HomeView } from './components/public/HomeView';
import { AboutView } from './components/public/AboutView';
import { ProgramsView } from './components/public/ProgramsView';
import { ProgramDetailView } from './components/public/ProgramDetailView';
import { StoriesView } from './components/public/StoriesView';
import { StoryDetailView } from './components/public/StoryDetailView';
import { AmbassadorsView } from './components/public/AmbassadorsView';
import { AmbassadorDetailView } from './components/public/AmbassadorDetailView';
import { GetInvolvedView } from './components/public/GetInvolvedView';
import { DonateView } from './components/public/DonateView';
import { ContactView } from './components/public/ContactView';
import { AmbassadorOnboardingView } from './components/public/AmbassadorOnboardingView';

// Admin CMS
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminAcceptInvite } from './components/admin/AdminAcceptInvite';
import { Shield, Wrench, ArrowRight } from 'lucide-react';

function MainRouter() {
  const { currentView, getMaintenanceForView, navigateTo, refetchAll } = useSite();
  const { isAuthenticated, user } = useAuth();

  // Standalone Views (No public navbar/footer shell - NEVER blocked by maintenance)
  if (currentView === 'admin') {
    return <AdminLayout />;
  }

  if (currentView === 'accept-invite') {
    return <AdminAcceptInvite />;
  }

  if (currentView === 'ambassador-onboarding') {
    return <AmbassadorOnboardingView />;
  }

  // Check Maintenance State
  const maintenanceStatus = getMaintenanceForView(currentView);

  // If in maintenance and user is not authenticated admin, show Maintenance Display
  if (maintenanceStatus.inMaintenance) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Admin Bypass Warning Banner if logged in */}
        {isAuthenticated && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>
                Visualização Administrativa: Esta seção está em <strong>MANUTENÇÃO</strong> para o público externo.
              </span>
            </div>
            <button
              onClick={() => navigateTo('admin')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black/20 hover:bg-black/30 text-white transition-colors"
            >
              <span>Ir para Central de Manutenção</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <MaintenanceDisplay
          config={maintenanceStatus.config}
          pageTitle={maintenanceStatus.pageTitle}
          onNavigateHome={() => navigateTo('home')}
          onRefresh={refetchAll}
        />
      </div>
    );
  }

  // Public Institutional Views
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-amber-500 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {currentView === 'home' && <HomeView />}
        {currentView === 'about' && <AboutView />}
        {currentView === 'programs' && <ProgramsView />}
        {currentView === 'program-detail' && <ProgramDetailView />}
        {currentView === 'stories' && <StoriesView />}
        {currentView === 'story-detail' && <StoryDetailView />}
        {currentView === 'ambassadors' && <AmbassadorsView />}
        {currentView === 'ambassador-detail' && <AmbassadorDetailView />}
        {currentView === 'get-involved' && <GetInvolvedView />}
        {currentView === 'donate' && <DonateView />}
        {currentView === 'contact' && <ContactView />}
      </main>

      <Footer />
      <DonationModal />
      <AssistantChatWidget />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SiteProvider>
          <MainRouter />
        </SiteProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
