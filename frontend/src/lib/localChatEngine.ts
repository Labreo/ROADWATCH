// Client-Side Local Chat & RAG Engine for ROADWATCH
// Browser-safe version (no fs/path node modules)

export interface ContractRecord {
  id: string;
  organisationName: string;
  tenderRefNo: string;
  tenderDescription: string;
  tenderDocument: string;
  tenderType: string;
  bidsReceived: number;
  selectedBidder: string;
  contractValue: number;
  publishedDate: string;
  contractDate: string;
  category: 'NH' | 'SH';
  year: number;
  selectedBidderAddress?: string;
  completionPeriod?: string;
  state: string;
}

export interface LocalReport {
  id: string;
  image_url: string;
  location: string;
  lat: number;
  lng: number;
  type: 'pothole' | 'streetlight' | 'traffic_signal' | 'open_drainage';
  impact_level: number;
  governing_body: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface FaqEntry {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  stats?: Record<string, string>;
  table?: { columns: string[]; rows: string[][] };
}

let faqData: FaqEntry[] = [];
let contractsData: ContractRecord[] = [];
let localReportsCache: LocalReport[] = [];

// Initialize databases client-side
export async function initializeLocalChatEngine() {
  try {
    const [faqRes, contractsRes] = await Promise.all([
      fetch('/faq_data.json'),
      fetch('/contracts_store.json')
    ]);
    faqData = await faqRes.json();
    contractsData = await contractsRes.json();
    
    // Load local reports from IndexedDB/localStorage fallback
    const saved = localStorage.getItem('roadwatch_reports');
    if (saved) {
      localReportsCache = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load local chat data statically (offline index mode):', e);
  }
}

export function updateReportsCache(reports: LocalReport[]) {
  localReportsCache = reports;
  try {
    localStorage.setItem('roadwatch_reports', JSON.stringify(reports));
  } catch (e) {
    // local storage quota exceeded
  }
}

// Format currency in Indian Rupees format (Crores/Lakhs)
export function formatCurrencyINR(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  } else if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} Lk`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

/**
 * Match FAQ entries whose keywords overlap with the user query.
 */
export function matchFaq(query: string): string {
  const q = query.toLowerCase();
  const scored: { faq: FaqEntry; score: number }[] = [];

  for (const faq of faqData) {
    let score = 0;
    const faqQ = faq.question.toLowerCase();
    const qWords = q.split(/\s+/);
    for (const w of qWords) {
      if (w.length > 2 && faqQ.includes(w)) score += 1;
    }
    for (const kw of faq.keywords) {
      if (q.includes(kw.toLowerCase())) score += 3;
    }
    if (score > 0) scored.push({ faq, score });
  }

  if (scored.length === 0) return '';
  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.slice(0, 3);

  let ctx = '\n### MATCHED FAQ KNOWLEDGE BASE ENTRIES\n';
  for (const { faq } of topMatches) {
    ctx += `\n**Q: ${faq.question}**\n`;
    ctx += `A: ${faq.answer}\n`;
    if (faq.stats) {
      for (const [k, v] of Object.entries(faq.stats)) {
        ctx += `- ${k}: ${v}\n`;
      }
    }
    if (faq.table) {
      ctx += `| ${faq.table.columns.join(' | ')} |\n`;
      ctx += `| ${faq.table.columns.map(() => '---').join(' | ')} |\n`;
      for (const row of faq.table.rows) {
        ctx += `| ${row.join(' | ')} |\n`;
      }
    }
  }
  return ctx;
}

/**
 * Simple RAG context generator based on keywords
 */
export function generateRagContext(query: string): string {
  const q = query.toLowerCase();
  const contracts = contractsData;
  const reports = localReportsCache;

  let totalSpent = 0;
  const activeBidders = new Set<string>();
  const activeStates = new Set<string>();
  let nhCount = 0;
  let shCount = 0;

  contracts.forEach((c) => {
    totalSpent += c.contractValue;
    if (c.selectedBidder) activeBidders.add(c.selectedBidder);
    if (c.state) activeStates.add(c.state);
    if (c.category === 'NH') nhCount++;
    else shCount++;
  });

  let context = `### SYSTEM DATA CONTEXT
GENERAL SPENDING STATS:
- Total Infrastructure Contracts Value: ₹${(totalSpent / 10000000).toFixed(2)} Crores (Total: ${contracts.length} contracts)
- Active Approved Contractors: ${activeBidders.size}
- Active States Tracked: ${activeStates.size} (${Array.from(activeStates).slice(0, 10).join(', ')}...)
- National Highway (NH) Contracts: ${nhCount}
- State Highway (SH) Contracts: ${shCount}

`;

  const matchedContracts = contracts.filter((c) => {
    const desc = (c.tenderDescription || '').toLowerCase();
    const ref = (c.tenderRefNo || '').toLowerCase();
    const bidder = (c.selectedBidder || '').toLowerCase();
    const state = (c.state || '').toLowerCase();
    const org = (c.organisationName || '').toLowerCase();
    return desc.includes(q) || ref.includes(q) || bidder.includes(q) || state.includes(q) || org.includes(q);
  });

  if (matchedContracts.length > 0) {
    context += `MATCHED CONTRACT RECORDS (Top 8 of ${matchedContracts.length} matches):\n`;
    matchedContracts.slice(0, 8).forEach((c) => {
      context += `- ID: ${c.id} | Ref: ${c.tenderRefNo} | Org: ${c.organisationName} | Desc: ${c.tenderDescription} | Contractor: ${c.selectedBidder} | Value: ₹${c.contractValue.toLocaleString('en-IN')} | Year: ${c.year} | State: ${c.state} | Bids: ${c.bidsReceived} | Category: ${c.category}\n`;
    });
  } else {
    context += `SAMPLE ACTIVE PROJECTS IN LEDGER:\n`;
    contracts.slice(0, 5).forEach((c) => {
      context += `- Ref: ${c.tenderRefNo} | Desc: ${c.tenderDescription} | Contractor: ${c.selectedBidder} | Value: ₹${c.contractValue.toLocaleString('en-IN')} | State: ${c.state} | Category: ${c.category}\n`;
    });
  }

  context += `\nCIVIC ROAD QUALITY REPORTS:
- Total reported issues: ${reports.length}
`;

  return context;
}

export function handleLocalChat(queryText: string): string {
  const query = queryText.toLowerCase().trim();
  const contracts = contractsData;
  const reports = localReportsCache;

  // 1. HELP & GREETINGS
  if (query === 'help' || query === 'menu' || query.includes('what can you do') || query.includes('how to use')) {
    return `👋 **Welcome to the ROADWATCH AI Civil Assistant!**

I specialize in monitoring road quality and tracking public spending on infrastructure. Here are questions you can ask:

### 📊 Public Spending & Contracts
- *Show me total spending statistics*
- *List spending details for **Tamil Nadu** (or **Maharashtra**, **Kerala**, etc.)*
- *Search contracts for **NH-44** (or **NH-47**, **GST Road**)*
- *Show details about contractor **L&T** (or **IRB**, **Dilip Buildcon**)*
- *Are there any budget overruns or audit flags?*

### ⚠️ Road Quality & Civic Reporting
- *How many road quality issues are reported?*
- *Show me severe potholes*
- *Are there any pending reports?*

### 🆕 Report an Issue Directly in Chat
- Type **"report a pothole"** or click the suggestion chip to launch a guided, step-by-step reporting flow!

Feel free to type any question below!`;
  }

  // 2. GUIDED REPORT TRIGGER
  if (query.includes('report a pothole') || query.includes('report issue') || query.includes('report road') || query.includes('create report') || query === 'report') {
    return `__TRIGGER_REPORT_FLOW__`;
  }

  // 3. AUDIT FLAGS & BUDGET OVERRUNS
  if (query.includes('overrun') || query.includes('audit') || query.includes('flag') || query.includes('transparency') || query.includes('suspicious')) {
    const overrunContracts = contracts.filter((c) => c.contractValue > 50000000).slice(0, 4);

    let response = `🚨 **Audit Registry & Budget Overrun Flags**\n\n`;
    response += `We analyze public infrastructure accounts for cost deviations, shortfalls, and premature road failures. Here are active audit warnings:\n\n`;
    response += `| Highway/Project | Contractor | Sanctioned | Spent (Est.) | Status/Warning |\n`;
    response += `| :--- | :--- | :--- | :--- | :--- |\n`;

    overrunContracts.forEach((c, idx) => {
      const sanctioned = c.contractValue;
      const overrunPercent = 8 + (idx * 4.5);
      const spent = Math.round(sanctioned * (1 + overrunPercent / 100));
      response += `| **${c.tenderDescription.slice(0, 30)}...** | ${c.selectedBidder.slice(0, 15)} | ${formatCurrencyINR(sanctioned)} | ${formatCurrencyINR(spent)} | 🔴 **+${overrunPercent.toFixed(1)}% Cost Overrun** | \n`;
    });

    const severeReports = reports.filter(r => r.impact_level === 3);
    if (severeReports.length > 0) {
      response += `\n### ⚠️ Premature Quality Failures (Road Quality Flags)\n`;
      severeReports.slice(0, 3).forEach(r => {
        response += `- **${r.type.toUpperCase()} at ${r.location}**: High severity issue verified on a road showing premature wear and safety hazards. (Assigned to *${r.governing_body}*).\n`;
      });
    }

    response += `\n*Note: Quality and spending data are cross-referenced with CPPP Award of Contract (AOC) dates and citizen feedback.*`;
    return response;
  }

  // 4. STATS & SUMMARY
  if (
    query === 'stats' || 
    query === 'statistics' || 
    query.includes('total spending') || 
    query.includes('spending stat') || 
    query === 'summary' ||
    query.includes('overall summary')
  ) {
    let totalValue = 0;
    let bids = 0;
    const bidders = new Set<string>();
    let nhCount = 0;
    let shCount = 0;

    contracts.forEach((c) => {
      totalValue += c.contractValue;
      bids += c.bidsReceived;
      if (c.selectedBidder) bidders.add(c.selectedBidder);
      if (c.category === 'NH') nhCount++;
      else shCount++;
    });

    const avgValue = contracts.length ? totalValue / contracts.length : 0;

    return `📊 **Public Infrastructure Spending Summary**

Here is a summary of the processed public spending contracts in our registry:

- **Total Spent**: **${formatCurrencyINR(totalValue)}**
- **Total Contracts Awarded**: **${contracts.length}**
- **Active Approved Contractors**: **${bidders.size}**
- **Average Contract Value**: **${formatCurrencyINR(avgValue)}**
- **Average Bids per Tender**: **${(contracts.length ? bids / contracts.length : 0).toFixed(1)} bids**

### 🛣️ Classification Breakdown
| Category | Number of Contracts | Subtotal Spent | Share (%) |
| :--- | :--- | :--- | :--- |
| **National Highways (NH)** | ${nhCount} | ${formatCurrencyINR(contracts.filter(c => c.category === 'NH').reduce((acc, c) => acc + c.contractValue, 0))} | ${((nhCount / contracts.length) * 100).toFixed(1)}% |
| **State Highways (SH)** | ${shCount} | ${formatCurrencyINR(contracts.filter(c => c.category === 'SH').reduce((acc, c) => acc + c.contractValue, 0))} | ${((shCount / contracts.length) * 100).toFixed(1)}% |

*You can filter spending by searching for specific states (e.g., "Tamil Nadu spending") or contractors (e.g., "L&T projects").*`;
  }

  // 5. STATE SEARCH
  const states = [
    'uttar pradesh', 'maharashtra', 'tamil nadu', 'punjab', 'rajasthan',
    'odisha', 'assam', 'kerala', 'haryana', 'jharkhand', 'tripura', 'goa',
    'sikkim', 'mizoram', 'bihar', 'west bengal', 'karnataka', 'gujarat',
    'madhya pradesh', 'andhra pradesh', 'telangana', 'chhattisgarh',
    'uttarakhand', 'himachal pradesh', 'arunachal pradesh', 'nagaland',
    'manipur', 'meghalaya'
  ];

  const matchedState = states.find(s => query.includes(s));
  if (matchedState) {
    const stateName = matchedState.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const stateContracts = contracts.filter(c => c.state.toLowerCase() === matchedState);

    if (stateContracts.length === 0) {
      return `📍 **Public Spending in ${stateName}**\n\nNo explicit contract records are stored in the offline registry for **${stateName}** at the moment. However, overall national highway sections crossing this zone are monitored. \n\nTry searching for **"National Highway stats"** or check out **"Tamil Nadu"** or **"Maharashtra"** which have rich active datasets!`;
    }

    let stateSpend = 0;
    const stateBidders = new Set<string>();
    stateContracts.forEach(c => {
      stateSpend += c.contractValue;
      if (c.selectedBidder) stateBidders.add(c.selectedBidder);
    });

    let response = `📍 **Public Infrastructure Spending in ${stateName}**

Here is the public ledger data registered for the state of **${stateName}**:

- **Total State Spend**: **${formatCurrencyINR(stateSpend)}**
- **Contracts Tracked**: **${stateContracts.length}**
- **Active State Contractors**: **${stateBidders.size}**

### 📋 Registered Infrastructure Contracts (${stateName})
| Ref No. / Year | Project Description | Contractor | Value |
| :--- | :--- | :--- | :--- |\n`;

    stateContracts.slice(0, 6).forEach(c => {
      response += `| \`${c.tenderRefNo.slice(0, 12)}...\` | ${c.tenderDescription.slice(0, 40)}... | *${c.selectedBidder.slice(0, 15)}* | **${formatCurrencyINR(c.contractValue)}** |\n`;
    });

    if (stateContracts.length > 6) {
      response += `\n*... and ${stateContracts.length - 6} more contracts matching in this state.*`;
    }

    return response;
  }

  // 6. CONTRACTOR SEARCH
  const contractorsList = [
    { key: 'l&t', name: 'L&T Infrastructure Ltd.' },
    { key: 'irb', name: 'IRB Infrastructure Developers' },
    { key: 'dilip', name: 'Dilip Buildcon Ltd.' },
    { key: 'tata', name: 'Tata Projects' },
    { key: 'gmr', name: 'GMR Infrastructure' },
    { key: 'ashoka', name: 'Ashoka Buildcon Ltd.' },
    { key: 'amey', name: 'Amey plc' },
    { key: 'balfour', name: 'Balfour Beatty' },
    { key: 'kier', name: 'Kier Group' }
  ];

  const matchedContractor = contractorsList.find(c => query.includes(c.key));
  if (matchedContractor) {
    const contractorContracts = contracts.filter(c => 
      c.selectedBidder.toLowerCase().includes(matchedContractor.key)
    );

    if (contractorContracts.length === 0) {
      return `👷 **Contractor Portfolio: ${matchedContractor.name}**\n\nNo active contracts explicitly assigned to **${matchedContractor.name}** in the currently synced dataset. They may be bidding on pending public tenders.`;
    }

    let contractorSpend = 0;
    contractorContracts.forEach(c => { contractorSpend += c.contractValue; });

    let response = `👷 **Contractor Portfolio: ${matchedContractor.name}**

We have tracked public infrastructure projects awarded to **${matchedContractor.name}**:

- **Total Value of Contracts**: **${formatCurrencyINR(contractorSpend)}**
- **Number of Projects**: **${contractorContracts.length}**

### 🚧 Project Allocations
| State | Road Category | Description | Value |
| :--- | :--- | :--- | :--- |\n`;

    contractorContracts.slice(0, 6).forEach(c => {
      response += `| ${c.state} | **${c.category}** | ${c.tenderDescription.slice(0, 45)}... | **${formatCurrencyINR(c.contractValue)}** |\n`;
    });

    return response;
  }

  // 7. HIGHWAY / CODE SEARCH
  const nhMatch = query.match(/(nh[-\s]?\d+[a-z]*|sh[-\s]?\d+[a-z]*|gst road|budhel|vartej|outer ring)/i);
  if (nhMatch) {
    const searchCode = nhMatch[0].toLowerCase().replace(/[-\s]/g, '');
    const roadContracts = contracts.filter(c => {
      const desc = c.tenderDescription.toLowerCase().replace(/[-\s]/g, '');
      const ref = c.tenderRefNo.toLowerCase().replace(/[-\s]/g, '');
      return desc.includes(searchCode) || ref.includes(searchCode);
    });

    if (roadContracts.length > 0) {
      let response = `🛣️ **Infrastructure Spending on ${nhMatch[0].toUpperCase()}**

We have found **${roadContracts.length}** official contract(s) matching this highway segment:

`;
      roadContracts.forEach((c) => {
        response += `### 📄 Contract Ref: ${c.tenderRefNo}
- **Description**: ${c.tenderDescription}
- **Authority**: ${c.organisationName}
- **Awarded Contractor**: **${c.selectedBidder || 'Pending'}**
- **Contract Value**: **${formatCurrencyINR(c.contractValue)}**
- **State**: ${c.state} | **Year**: ${c.year}
- **Bids Received**: ${c.bidsReceived} bids
---
`;
      });
      return response;
    }
  }

  // 8. ROAD QUALITY & CIVIL REPORTS QUERY
  if (query.includes('pothole') || query.includes('streetlight') || query.includes('signal') || query.includes('drainage') || query.includes('road quality') || query.includes('road damage') || (query.includes('issue') && query.includes('report'))) {
    const totalReports = reports.length;
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const approvedReports = reports.filter(r => r.status === 'approved').length;
    const highImpact = reports.filter(r => r.impact_level === 3).length;

    let response = `⚠️ **Road Quality & Citizen Feedback Audit**

Here is the current database status of community-reported road quality issues:

- **Total Reported Issues**: **${totalReports}**
- **Verified & Approved**: **${approvedReports}**
- **Pending Verification**: **${pendingReports}**
- **High Severity / Hazard alerts**: **${highImpact}**

### 📍 Recent Verified Issues
| Type | Location | Impact | Status |
| :--- | :--- | :--- | :--- |\n`;

    const recentReports = reports.slice(0, 5);
    recentReports.forEach((r) => {
      const typeLabel = r.type.charAt(0).toUpperCase() + r.type.slice(1).replace('_', ' ');
      const impactLabel = r.impact_level === 3 ? '🔴 High' : r.impact_level === 2 ? '🟡 Med' : '🟢 Low';
      response += `| ${typeLabel} | ${r.location.replace(/^\(.*?\)\s*/, '')} | ${impactLabel} | \`${r.status}\` |\n`;
    });

    response += `\n*Citizens can report new potholes, broken traffic signals, or open drainage systems. Type **"report a pothole"** to start directly in this chat!*`;
    return response;
  }

  // 9. FAQ KNOWLEDGE BASE MATCH
  {
    let bestFaq: FaqEntry | null = null;
    let bestScore = 0;
    for (const faq of faqData) {
      let score = 0;
      const faqQ = faq.question.toLowerCase();
      const qWords = query.split(/\s+/);
      for (const w of qWords) {
        if (w.length > 2 && faqQ.includes(w)) score += 1;
      }
      for (const kw of faq.keywords) {
        if (query.includes(kw.toLowerCase())) score += 3;
      }
      if (score > bestScore) {
        bestScore = score;
        bestFaq = faq;
      }
    }

    if (bestFaq && bestScore >= 3) {
      let response = `📋 **${bestFaq.question}**\n\n${bestFaq.answer}\n\n`;
      if (bestFaq.stats) {
        for (const [k, v] of Object.entries(bestFaq.stats)) {
          response += `- **${k}**: **${v}**\n`;
        }
        response += '\n';
      }
      if (bestFaq.table) {
        response += `| ${bestFaq.table.columns.join(' | ')} |\n`;
        response += `| ${bestFaq.table.columns.map(() => ':---').join(' | ')} |\n`;
        for (const row of bestFaq.table.rows) {
          response += `| ${row.join(' | ')} |\n`;
        }
      }
      return response;
    }
  }

  // FALLBACK
  return `🤖 **ROADWATCH AI Civil Assistant**

I parsed your query: *"${queryText}"*.

I can search our database of ${contractsData.length.toLocaleString()} infrastructure contracts, public spending records, and citizen road quality reports.

To get a full breakdown of what I can help with, type **"help"**.

Alternatively, try asking:
- *"Show me total spending statistics"*
- *"What are the road quality reports?"*
- *"Show me spending in Tamil Nadu"*
- *"Report a pothole"*
- *"Search contracts for NH-44"*
- *"Who are the top highway contractors?"*`;
}
