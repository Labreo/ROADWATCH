export const locale = {
  code: 'en-GB',
  name: 'English (United Kingdom)',
  currency: {
    code: 'GBP',
    symbol: '£',
    format: (value: number, short?: boolean): string => {
      const formatted = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        maximumFractionDigits: 0
      }).format(value);
      if (short) {
        if (value >= 1000000000) return `£${(value / 1000000000).toFixed(2)} B`;
        if (value >= 1000000) return `£${(value / 1000000).toFixed(2)} M`;
      }
      return formatted;
    }
  },
  dateFormat: 'DD/MM/YYYY',
  numberFormat: {
    decimal: '.',
    group: ',',
    fractionDigits: 2
  },
  distanceUnit: 'mi',
  roadClassification: {
    label: 'Road Classification',
    tiers: {
      motorway: { classification: 'Motorway / Trunk Road', agency: 'National Highways', managerTitle: 'Route Manager' },
      a_road: { classification: 'A-Road / Primary Route', agency: 'Local Councils / County Council Highway Authority', managerTitle: 'Highways Fleet Manager' },
      b_road: { classification: 'B-Road / Local Street', agency: 'Borough Council Highways Division', managerTitle: 'Highways Officer' },
      local: { classification: 'Local Unclassified Road', agency: 'Local Highway Authority', managerTitle: 'Duty Engineer' }
    }
  },
  managerTitle: 'Highways Fleet Manager',
  ui: {
    appName: 'RoadWatch',
    tagline: 'Civic Infrastructure Intelligence Platform',
    nav: {
      dashboard: 'Dashboard',
      roads: 'Roads',
      contractors: 'Contractors',
      budgets: 'Budgets',
      complaints: 'Complaints',
      admin: 'Admin',
      playback: 'Timeline',
      sensors: 'Sensors',
      twin: 'Digital Twin',
      chat: 'AI Assistant',
      regions: 'Regions',
      syncCenter: 'Sync Centre'
    },
    actions: {
      reportIssue: 'Report a Road Issue',
      viewDetails: 'View Details',
      scheduleRepair: 'Schedule Repair',
      trackProgress: 'Track Progress',
      contactAuthority: 'Contact Authority',
      search: 'Search roads...',
      filter: 'Filter by status',
      sync: 'Sync Now',
      retry: 'Retry',
      discard: 'Discard',
      resolve: 'Resolve',
      decline: 'Decline Assignment',
      reassign: 'Reassign'
    },
    status: {
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      under_construction: 'Under Construction',
      pending: 'Pending',
      routed: 'Routed',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      rejected: 'Rejected'
    },
    labels: {
      roadLength: 'Road Length',
      lastMaintained: 'Last Maintained',
      assignedAuthority: 'Assigned Authority',
      contractor: 'Contractor',
      budget: 'Budget',
      spent: 'Spent',
      allocated: 'Allocated',
      status: 'Status',
      priority: 'Priority',
      category: 'Category',
      createdAt: 'Created',
      resolvedAt: 'Resolved',
      estimatedCompletion: 'Estimated Completion',
      delay: 'Delay',
      transparencyScore: 'Transparency Score',
      healthScore: 'Health Score',
      maintenanceFrequency: 'Maintenance Frequency',
      contactInfo: 'Contact Information'
    },
    notifications: {
      complaintAssigned: 'Complaint assigned to {authority}',
      complaintEscalated: 'Complaint escalated to {level}',
      complaintDeclined: 'Complaint reassigned',
      slaBreach: 'SLA breach detected for complaint #{id}',
      syncComplete: 'Sync completed successfully',
      syncFailed: 'Sync failed: {error}',
      conflictDetected: 'Conflict detected for {title}'
    },
    errors: {
      networkError: 'Network error. Queued for offline sync.',
      serverError: 'Server error. Please try again later.',
      notFound: 'Resource not found.',
      unauthorized: 'You do not have permission to perform this action.',
      genericError: 'Something went wrong. Please try again.'
    },
    accessibility: {
      contrastMode: 'High Contrast Mode',
      fontSize: 'Font Size',
      reducedMotion: 'Reduced Motion',
      language: 'Language / Region'
    }
  },
  exampleQueries: [
    'Show me roads in poor condition',
    'What is the budget for the M25 upgrade?',
    'List contractors with low ratings',
    'How many complaints were filed this month?',
    'Show the digital twin for the A406',
    'Compare spending across London projects',
    'Which authorities have the most overdue repairs?',
    'What is the transparency score for the A1?'
  ],
  regions: [
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: '£ GBP', locale: 'en-GB', timezone: 'Europe/London' },
    { code: 'US', name: 'United States', flag: '🇺🇸', currency: '$ USD', locale: 'en-US', timezone: 'America/Detroit' },
    { code: 'IN', name: 'India', flag: '🇮🇳', currency: '₹ INR', locale: 'en-IN', timezone: 'Asia/Kolkata' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KSh KES', locale: 'en-KE', timezone: 'Africa/Nairobi' }
  ]
};
