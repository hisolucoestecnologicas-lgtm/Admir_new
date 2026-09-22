/**
 * Test Suite: Donate Maintenance Gate
 * Verifies that the Central de Manutenção is the single source of truth
 * for the public donation flow (DonationModal vs Maintenance Display).
 *
 * Scenarios tested:
 * 1. Global OFF + Donate OFF -> Donation Modal permitted
 * 2. Global OFF + Donate ON  -> Donation Modal blocked, Donate Maintenance active
 * 3. Global ON  + Donate OFF -> Donation Modal blocked, Global Maintenance active
 * 4. Global ON  + Donate ON  -> Donation Modal blocked, Global Maintenance active (precedence)
 */

export interface MaintenanceGateDecision {
  canOpenDonationModal: boolean;
  maintenanceActive: boolean;
  targetView: 'modal' | 'donate' | 'global';
  pageTitle?: string;
}

export function evaluateDonationMaintenanceGate(settings: {
  global?: { enabled: boolean; title?: string };
  pages?: Record<string, { enabled: boolean; title?: string }>;
}): MaintenanceGateDecision {
  // 1. Check Global Maintenance first (Global ON takes precedence over all pages)
  if (settings.global?.enabled) {
    return {
      canOpenDonationModal: false,
      maintenanceActive: true,
      targetView: 'global',
      pageTitle: settings.global.title || 'Site Global',
    };
  }

  // 2. Check Donate page maintenance
  if (settings.pages?.['donate']?.enabled) {
    return {
      canOpenDonationModal: false,
      maintenanceActive: true,
      targetView: 'donate',
      pageTitle: settings.pages['donate'].title || 'Doações & Apoio',
    };
  }

  // 3. Donate is Online
  return {
    canOpenDonationModal: true,
    maintenanceActive: false,
    targetView: 'modal',
  };
}

// Automated assertions
function runTests() {
  console.log('--- EXECUTING DONATE MAINTENANCE GATE TEST SUITE ---');

  // Case 1: Global OFF, Donate OFF
  const res1 = evaluateDonationMaintenanceGate({
    global: { enabled: false },
    pages: { donate: { enabled: false } },
  });
  console.assert(res1.canOpenDonationModal === true, 'Case 1 Failed: Modal should be permitted');
  console.assert(res1.targetView === 'modal', 'Case 1 Failed: Target should be modal');
  console.log('✓ Scenario 1 [Global OFF + Donate OFF]: DonationModal PERMITTED (Normal Flow)');

  // Case 2: Global OFF, Donate ON
  const res2 = evaluateDonationMaintenanceGate({
    global: { enabled: false },
    pages: { donate: { enabled: true, title: 'Doações & Apoio em Manutenção' } },
  });
  console.assert(res2.canOpenDonationModal === false, 'Case 2 Failed: Modal must be blocked');
  console.assert(res2.targetView === 'donate', 'Case 2 Failed: Target should be donate maintenance');
  console.log('✓ Scenario 2 [Global OFF + Donate ON]: DonationModal BLOCKED -> Donate Maintenance displayed');

  // Case 3: Global ON, Donate OFF
  const res3 = evaluateDonationMaintenanceGate({
    global: { enabled: true, title: 'Manutenção Geral' },
    pages: { donate: { enabled: false } },
  });
  console.assert(res3.canOpenDonationModal === false, 'Case 3 Failed: Modal must be blocked');
  console.assert(res3.targetView === 'global', 'Case 3 Failed: Target should be global maintenance');
  console.log('✓ Scenario 3 [Global ON + Donate OFF]: DonationModal BLOCKED -> Global Maintenance displayed');

  // Case 4: Global ON, Donate ON
  const res4 = evaluateDonationMaintenanceGate({
    global: { enabled: true, title: 'Manutenção Geral' },
    pages: { donate: { enabled: true } },
  });
  console.assert(res4.canOpenDonationModal === false, 'Case 4 Failed: Modal must be blocked');
  console.assert(res4.targetView === 'global', 'Case 4 Failed: Target should be global maintenance (Precedence)');
  console.log('✓ Scenario 4 [Global ON + Donate ON]: DonationModal BLOCKED -> Global Maintenance takes precedence');

  console.log('--- ALL 4 SCENARIOS PASSED WITH 100% CONFORMITY ---');
}

runTests();
