export const locale = {
  code: 'en-KE',
  name: 'English (Kenya)',
  currency: {
    code: 'KES',
    symbol: 'KSh',
    format: (value: number, short?: boolean): string => {
      const formatted = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        maximumFractionDigits: 0
      }).format(value);
      if (short) {
        if (value >= 1000000) return `KSh ${(value / 1000000).toFixed(2)} M`;
        if (value >= 1000) return `KSh ${(value / 1000).toFixed(2)} K`;
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
  distanceUnit: 'km',
  roadClassification: {
    label: 'Road Classification',
    tiers: {
      class_a: { classification: 'Class A / National Trunk Road', agency: 'Kenya National Highways Authority (KeNHA)', managerTitle: 'Regional Director' },
      class_b: { classification: 'Class B / Primary Road', agency: 'Kenya Urban Roads Authority (KURA)', managerTitle: 'Urban Roads Engineer' },
      class_c: { classification: 'Class C / Secondary Road', agency: 'Kenya Rural Roads Authority (KeRRA) / County Government', managerTitle: 'County Superintendent' },
      class_d: { classification: 'Class D / Local Road', agency: 'County Department of Infrastructure', managerTitle: 'Sub-County Engineer' }
    }
  },
  managerTitle: 'Regional Manager',
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
      roadLength: 'Road Length (km)',
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
    'What is the budget for the A104 upgrade?',
    'List contractors with low ratings',
    'How many complaints were filed this month?',
    'Show the digital twin for Thika Road',
    'Compare spending across Nairobi projects',
    'Which authorities have the most overdue repairs?',
    'What is the transparency score for Mombasa Road?'
  ],
  regions: [
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KSh KES', locale: 'en-KE', timezone: 'Africa/Nairobi' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: '£ GBP', locale: 'en-GB', timezone: 'Europe/London' },
    { code: 'US', name: 'United States', flag: '🇺🇸', currency: '$ USD', locale: 'en-US', timezone: 'America/Detroit' },
    { code: 'IN', name: 'India', flag: '🇮🇳', currency: '₹ INR', locale: 'en-IN', timezone: 'Asia/Kolkata' }
  ]
};
