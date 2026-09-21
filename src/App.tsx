import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SiteProvider, useSite } from './context/SiteContext';

// Common Public Shell
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { DonationModal } from './components/common/DonationModal';
import { AssistantChatWidget } from './components/public/AssistantChatWidget';

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

function MainRouter() {
  const { currentView } = useSite();

  // Standalone Views (No public navbar/footer shell)
  if (currentView === 'admin') {
    return <AdminLayout />;
  }

  if (currentView === 'accept-invite') {
    return <AdminAcceptInvite />;
  }

  if (currentView === 'ambassador-onboarding') {
    return <AmbassadorOnboardingView />;
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
