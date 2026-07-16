// ---------------------------------------------------------------------------
// Grounded reply engine
// ---------------------------------------------------------------------------
// Generates a correct, data-grounded chat answer for off-script judge questions
// straight from the mock dataset + transparency engine. Runs BEFORE the canned
// demo-script matcher so that a question about (say) Link Road returns a Link
// Road answer instead of the hardcoded S.V. Road fraud narrative.
//
// Returns null when nothing confidently matches — the caller then falls through
// to the scripted scenarios (findBestDemoReply) or the live LLM. S.V. Road
// (id 3) budget/status intents deliberately return null so the choreographed
// scenario-a / scenario-b demo flows still own that road.
// ---------------------------------------------------------------------------

import { roads, projects, contractors, getAuthority } from '@/data/mockData';
import {
  calculateRoadTransparency,
  getScoreGrade,
  getCitywideTransparencyData,
} from '@/services/transparencyEngine';
import { formatCurrency } from '@/services/regionAwareFormat';
import { DemoMessage } from '@/data/demoScripts';
import { Citation } from '@/components/chat/CitationRenderer';
import { complaints as mockComplaints } from '@/data/mockData';

// The scripted-demo road: leave its budget/status flows to the canned scenarios.
const SCRIPTED_ROAD_ID = 3; // S.V. Road

const BUDGET_INTENT = /budget|spend|spent|money|crore|₹|tender|sanction|cost|financ|ledger|utilis|utiliz/i;
const STATUS_INTENT = /status|why|damag|condition|health|score|grade|repair|state of/i;
const CITYWIDE_INTENT = /citywide|city.?wide|overall|entire city|all roads|total budget|city budget|utilization rate|utilisation rate|across the city/i;

function prettyStatus(s: string): string {
  return s.replace(/_/g, ' ');
}

function roadCitation(roadId: number): Citation | null {
  const road = roads.find(r => r.id === roadId);
  if (!road) return null;
  return {
    type: 'road',
    id: road.id,
    name: road.name,
    code: road.roadCode,
    status: road.status,
    length: road.lengthKm,
  };
}

function contractorCitation(id: number): Citation | null {
  const c = contractors.find(co => co.id === id);
  if (!c) return null;
  return {
    type: 'contractor',
    id: c.id,
    name: c.name,
    rating: c.rating,
    blacklisted: c.blacklisted,
  };
}

// Loose match: road name substring, road code (with/without dashes), or the
// S.V. Road spelling variants.
function findNamedRoad(q: string) {
  const lower = q.toLowerCase();
  return roads.find(r =>
    lower.includes(r.name.toLowerCase()) ||
    lower.includes(r.roadCode.toLowerCase()) ||
    lower.includes(r.roadCode.toLowerCase().replace(/-/g, ' ')) ||
    (/s\.?\s?v\.?\s?road/i.test(q) && r.id === SCRIPTED_ROAD_ID)
  );
}

// Match a contractor by a distinctive word from its name (>=4 chars) appearing
// in the query. "Metro Highway Builders" → matches on "metro"/"highway".
function findNamedContractor(q: string) {
  const lower = q.toLowerCase();
  return contractors.find(c => {
    const words = c.name.toLowerCase().split(/\W+/).filter(w => w.length >= 4 &&
      !['ltd', 'inc', 'corp', 'group', 'infrastructure', 'construction', 'projects', 'works', 'civil'].includes(w));
    return words.some(w => lower.includes(w));
  });
}

// --- Builders --------------------------------------------------------------

function buildRoadBudget(roadId: number): DemoMessage | null {
  const road = roads.find(r => r.id === roadId);
  if (!road) return null;
  const roadProjects = projects.filter(p => p.roadId === road.id);
  if (roadProjects.length === 0) return null;

  const t = calculateRoadTransparency(road, projects, contractors, mockComplaints);
  const grade = getScoreGrade(t.transparencyScore);
  const util = t.totalSanctioned > 0
    ? Math.round((t.totalSpent / t.totalSanctioned) * 100)
    : 0;
  const authority = getAuthority(road.authorityId);
  const topContractor = t.contractorSpendingBreakdown[0];

  const projectLines = roadProjects
    .map(p => `- **${p.title}**: ${formatCurrency(p.budgetSpent)} spent of ${formatCurrency(p.budgetAllocated)} sanctioned — _${prettyStatus(p.status)}_${p.delayDays > 0 ? ` (delayed ${p.delayDays} days)` : ''}`)
    .join('\n');

  const anomalyLines = t.scoreDeductions.length > 0
    ? '\n\n**Flagged by the Road Accountability Division:**\n' +
      t.scoreDeductions.slice(0, 3).map(d => `- ${d.reason} (−${d.points} pts)`).join('\n')
    : '';

  const content =
    `**Financial ledger for ${road.name} (${road.roadCode})** — managed by **${authority?.name ?? 'the municipal authority'}**.\n\n` +
    `Total **${formatCurrency(t.totalSpent)} spent of ${formatCurrency(t.totalSanctioned)} sanctioned** across ${roadProjects.length} project${roadProjects.length > 1 ? 's' : ''} — **${util}% utilisation**. ` +
    `Transparency score **${t.transparencyScore}/100 (Grade ${grade.grade})**.\n\n` +
    `**Project breakdown:**\n${projectLines}` +
    (topContractor ? `\n\n**Primary contractor:** ${topContractor.contractorName} (${formatCurrency(topContractor.totalReceived)} received).` : '') +
    anomalyLines;

  const citations: Citation[] = [];
  const rc = roadCitation(road.id);
  if (rc) citations.push(rc);
  if (topContractor) {
    const cc = contractorCitation(topContractor.contractorId);
    if (cc) citations.push(cc);
  }

  return {
    role: 'assistant',
    content,
    citations,
    suggestedActions: [
      { type: 'navigate_to_road', target_id: road.id, label: 'View Budget Details' },
    ],
    suggestedPrompts: [
      `Why is ${road.name} in ${prettyStatus(road.status)} condition?`,
      'What is the citywide budget utilization rate?',
      'Which contractors are blacklisted in Mumbai?',
    ],
  };
}

function buildRoadStatus(roadId: number): DemoMessage | null {
  const road = roads.find(r => r.id === roadId);
  if (!road) return null;
  const roadProjects = projects.filter(p => p.roadId === road.id);

  const t = calculateRoadTransparency(road, projects, contractors, mockComplaints);
  const grade = getScoreGrade(t.transparencyScore);
  const authority = getAuthority(road.authorityId);
  const worst = t.anomalies[0];
  const topContractor = t.contractorSpendingBreakdown[0];

  const content =
    `**${road.name} (${road.roadCode})** is currently rated **${prettyStatus(road.status).toUpperCase()}**. ` +
    `It is a ${road.roadType} road of ${road.lengthKm} km, last relaid on **${road.lastRelayingDate}**, ` +
    `overseen by **${authority?.name ?? 'the municipal authority'}**.\n\n` +
    `Transparency score **${t.transparencyScore}/100 (Grade ${grade.grade})** across ${roadProjects.length} tracked project${roadProjects.length === 1 ? '' : 's'} ` +
    `(${formatCurrency(t.totalSpent)} spent of ${formatCurrency(t.totalSanctioned)} sanctioned).` +
    (worst ? `\n\n**Key issue:** ${worst.description}` : '') +
    (topContractor ? `\n\n**Primary contractor:** ${topContractor.contractorName}.` : '');

  const citations: Citation[] = [];
  const rc = roadCitation(road.id);
  if (rc) citations.push(rc);

  return {
    role: 'assistant',
    content,
    citations,
    suggestedActions: [
      { type: 'navigate_to_road', target_id: road.id, label: 'View Road Details' },
    ],
    suggestedPrompts: [
      `What is the budget for ${road.name}?`,
      'Show me the citywide spending analysis',
    ],
  };
}

function buildContractor(id: number): DemoMessage | null {
  const c = contractors.find(co => co.id === id);
  if (!c) return null;
  const works = projects.filter(p => p.contractorId === c.id);
  const totalReceived = works.reduce((sum, p) => sum + p.budgetSpent, 0);

  const workLines = works.length > 0
    ? '\n\n**Active/awarded works:**\n' +
      works.map(p => {
        const road = roads.find(r => r.id === p.roadId);
        return `- **${p.title}**${road ? ` (${road.name})` : ''}: ${formatCurrency(p.budgetSpent)} of ${formatCurrency(p.budgetAllocated)} — _${prettyStatus(p.status)}_`;
      }).join('\n')
    : '';

  const content =
    `**${c.name}** — rating **${c.rating.toFixed(2)}/5**. ` +
    `${c.projectsCompleted} projects completed, ${c.projectsDelayed} delayed. ` +
    `Licence ${c.licenseNumber}, registered ${c.registrationDate}.\n\n` +
    (c.blacklisted
      ? `⛔ **BLACKLISTED.** ${c.blacklistedReason ?? 'Flagged for non-compliance.'}`
      : `✅ **Active / not blacklisted.** Total disbursed to date: ${formatCurrency(totalReceived)}.`) +
    workLines;

  const citations: Citation[] = [];
  const cc = contractorCitation(c.id);
  if (cc) citations.push(cc);

  return {
    role: 'assistant',
    content,
    citations,
    suggestedActions: [
      { type: 'navigate_to_contractor', target_id: c.id, label: 'Open Contractor Scorecard' },
    ],
    suggestedPrompts: [
      'Which contractors are blacklisted in Mumbai?',
      'What is the citywide budget utilization rate?',
    ],
  };
}

function buildCitywide(): DemoMessage {
  const data = getCitywideTransparencyData(roads, projects, contractors, mockComplaints);
  const util = data.totalSanctioned > 0
    ? Math.round((data.totalSpent / data.totalSanctioned) * 100)
    : 0;
  const blacklisted = contractors.filter(c => c.blacklisted);

  const content =
    `**Citywide infrastructure spend (Mumbai region).**\n\n` +
    `Total **${formatCurrency(data.totalSpent)} spent of ${formatCurrency(data.totalSanctioned)} sanctioned** — **${util}% utilisation** across ${roads.length} tracked roads. ` +
    `Average transparency score **${data.averageScore}/100**.\n\n` +
    `**Blacklisted contractors:** ${blacklisted.length > 0 ? blacklisted.map(c => c.name).join(', ') : 'none'}.`;

  return {
    role: 'assistant',
    content,
    suggestedActions: [],
    suggestedPrompts: [
      'Which contractors are blacklisted in Mumbai?',
      'What is the budget for Link Road?',
    ],
  };
}

// --- Entry point -----------------------------------------------------------

export function buildGroundedReply(query: string): DemoMessage | null {
  const q = query.toLowerCase();

  // Citywide budget query — before named lookups so "all roads" doesn't hit a
  // partial road-name match.
  if (CITYWIDE_INTENT.test(q) && BUDGET_INTENT.test(q)) {
    return buildCitywide();
  }

  const road = findNamedRoad(query);
  if (road) {
    // Reserve the scripted road's budget/status intents for the canned demo.
    const isScripted = road.id === SCRIPTED_ROAD_ID;
    if (BUDGET_INTENT.test(q)) {
      return isScripted ? null : buildRoadBudget(road.id);
    }
    if (STATUS_INTENT.test(q)) {
      return isScripted ? null : buildRoadStatus(road.id);
    }
  }

  const contractor = findNamedContractor(query);
  if (contractor) {
    return buildContractor(contractor.id);
  }

  return null;
}
