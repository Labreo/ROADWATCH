export interface TierDetails {
  classification: string;
  agency: string;
  managerTitle: string;
}

export interface RegionTemplate {
  regionCode: string;
  regionName: string;
  currency: string;
  currencySymbol: string;
  fieldManagerTitle: string;
  formatManagerName: (name: string) => string;
  tiers: {
    municipal: TierDetails;
    state_highway: TierDetails;
    national_highway: TierDetails;
    pwd_default: TierDetails;
  };
}

export const globalTemplates: Record<string, RegionTemplate> = {
  IN: {
    regionCode: 'IN',
    regionName: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    fieldManagerTitle: 'Executive Engineer',
    formatManagerName: (name: string) => {
      const clean = name.replace(/^(Er\.|Eng\.|Superintendent)\s*/i, '').trim();
      return `Er. ${clean}`;
    },
    tiers: {
      municipal: {
        classification: 'Municipal Road',
        agency: 'City Municipal Corporation',
        managerTitle: 'Executive Engineer'
      },
      state_highway: {
        classification: 'State Highway',
        agency: 'State Public Works Department (PWD)',
        managerTitle: 'Division Chief'
      },
      national_highway: {
        classification: 'National Highway',
        agency: 'National Highways Authority of India (NHAI)',
        managerTitle: 'Project Director'
      },
      pwd_default: {
        classification: 'PWD Secondary Road',
        agency: 'Public Works Department',
        managerTitle: 'Assistant Engineer'
      }
    }
  },
  GB: {
    regionCode: 'GB',
    regionName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    fieldManagerTitle: 'Road Manager',
    formatManagerName: (name: string) => {
      const clean = name.replace(/^(Er\.|Eng\.|Superintendent)\s*/i, '').replace(/\s*\(C\.Eng\)$/i, '').trim();
      return `${clean} (C.Eng)`;
    },
    tiers: {
      municipal: {
        classification: 'B-Road / Local Street',
        agency: 'Borough Council Highways Division',
        managerTitle: 'Highways Officer'
      },
      state_highway: {
        classification: 'A-Road / Primary Route',
        agency: 'County Council Highway Authority',
        managerTitle: 'Section Engineer'
      },
      national_highway: {
        classification: 'Motorway / Trunk Road',
        agency: 'National Highways',
        managerTitle: 'Route Manager'
      },
      pwd_default: {
        classification: 'Local Unclassified Road',
        agency: 'Local Highway Authority',
        managerTitle: 'Duty Engineer'
      }
    }
  },
  US: {
    regionCode: 'US',
    regionName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    fieldManagerTitle: 'Highway Superintendent',
    formatManagerName: (name: string) => {
      const clean = name.replace(/^(Er\.|Eng\.|Superintendent)\s*/i, '').replace(/,\s*P\.E\.$/i, '').trim();
      return `${clean}, P.E.`;
    },
    tiers: {
      municipal: {
        classification: 'City Street / County Road',
        agency: 'Department of Public Works (DPW)',
        managerTitle: 'Superintendent of Streets'
      },
      state_highway: {
        classification: 'State Route',
        agency: 'State Department of Transportation (DOT)',
        managerTitle: 'Resident Engineer'
      },
      national_highway: {
        classification: 'Interstate Highway',
        agency: 'Federal Highway Administration (FHWA) / State DOT',
        managerTitle: 'District Engineer'
      },
      pwd_default: {
        classification: 'Unincorporated Public Way',
        agency: 'County Road Commission',
        managerTitle: 'Operations Manager'
      }
    }
  },
  KE: {
    regionCode: 'KE',
    regionName: 'Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    fieldManagerTitle: 'Regional Manager',
    formatManagerName: (name: string) => {
      const clean = name.replace(/^(Er\.|Eng\.|Superintendent)\s*/i, '').trim();
      return `Eng. ${clean}`;
    },
    tiers: {
      municipal: {
        classification: 'Class C / Secondary Road',
        agency: 'Kenya Rural Roads Authority (KeRRA) / County Government',
        managerTitle: 'County Superintendent'
      },
      state_highway: {
        classification: 'Class B / Primary Road',
        agency: 'Kenya Urban Roads Authority (KURA)',
        managerTitle: 'Urban Roads Engineer'
      },
      national_highway: {
        classification: 'Class A / National Trunk Road',
        agency: 'Kenya National Highways Authority (KeNHA)',
        managerTitle: 'Regional Director'
      },
      pwd_default: {
        classification: 'Class D / Local Road',
        agency: 'County Department of Infrastructure',
        managerTitle: 'Sub-County Engineer'
      }
    }
  }
};

export const globalPolygonRecords = {
  US: {
    type: 'Polygon' as const,
    coordinates: [[[-125.0, 24.5], [-66.9, 24.5], [-66.9, 49.4], [-125.0, 49.4], [-125.0, 24.5]]] as [number, number][][]
  },
  GB: {
    type: 'Polygon' as const,
    coordinates: [[[-8.6, 49.8], [1.8, 49.8], [1.8, 60.9], [-8.6, 60.9], [-8.6, 49.8]]] as [number, number][][]
  },
  KE: {
    type: 'Polygon' as const,
    coordinates: [[[33.8, -4.7], [41.9, -4.7], [41.9, 5.5], [33.8, 5.5], [33.8, -4.7]]] as [number, number][][]
  },
  IN: {
    type: 'Polygon' as const,
    coordinates: [[[68.1, 6.8], [97.4, 6.8], [97.4, 35.7], [68.1, 35.7], [68.1, 6.8]]] as [number, number][][]
  }
};
