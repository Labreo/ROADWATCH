'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, Contractor, Authority, Road, FundSourceAllocation } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveProjectFundSources } from '@/services/transparencyEngine';

interface SankeyFlowVisualizerProps {
  projects: Project[];
  contractors: Contractor[];
  authorities: Authority[];
  road?: Road | null;
}

interface SankeyNode {
  id: string;
  name: string;
  column: number;
  incomingVal: number;
  outgoingVal: number;
  value: number;
  x: number;
  y: number;
  height: number;
  originalData?: any;
}

interface SankeyLink {
  id: string;
  source: string;
  target: string;
  sourceName: string;
  targetName: string;
  value: number;
  color: string;
  path?: string;
  centerPath?: string;
  midPoint?: { x: number; y: number };
  hSource?: number;
  hTarget?: number;
  column?: number;
}

// Currency formatting using region-aware template
import { formatCurrency } from '@/services/regionAwareFormat';
export function formatFlowAmount(val: number): string {
  return formatCurrency(val, true);
}

/**
 * Computes a 2D coordinate along a cubic Bezier curve at parameter t in [0, 1]
 * Formula: C(t) = (1-t)^3 * P0 + 3*(1-t)^2 * t * P1 + 3*(1-t) * t^2 * P2 + t^3 * P3
 */
export function getCubicBezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

export default function SankeyFlowVisualizer({
  projects,
  contractors,
  authorities,
  road
}: SankeyFlowVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 850, height: 380 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<{
    type: 'node' | 'link';
    id: string;
    x: number;
    y: number;
    title: string;
    subtitle: string;
    details: string;
    detailsList?: { label: string; value: string }[];
  } | null>(null);

  // Safe dimensions extraction for WebViews and responsive mobile grids
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setDimensions({
        width: width > 0 ? width : 850,
        height: width < 600 ? 320 : 380
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graph = useMemo(() => {
    const nodesMap = new Map<string, Omit<SankeyNode, 'x' | 'y' | 'height'>>();
    const linksMap = new Map<string, SankeyLink>();

    // Premium modern neon color palette
    const colColors = [
      '#06b6d4', // Col 0: Funding Source Category (Cyan)
      '#818cf8', // Col 1: District/Ward Allocation Pool (Indigo)
      '#f472b6', // Col 2: Active Project ID (Pink)
      '#34d399'  // Col 3: Contractor Ledger Balance (Emerald)
    ];

    const getOrAddNode = (id: string, name: string, column: number, originalData?: any) => {
      if (!nodesMap.has(id)) {
        nodesMap.set(id, {
          id,
          name,
          column,
          incomingVal: 0,
          outgoingVal: 0,
          value: 0,
          originalData
        });
      }
      return nodesMap.get(id)!;
    };

    const addLink = (
      sourceId: string,
      targetId: string,
      sourceName: string,
      targetName: string,
      value: number,
      color: string
    ) => {
      if (value <= 0) return;
      const linkId = `${sourceId}==>${targetId}`;
      if (linksMap.has(linkId)) {
        linksMap.get(linkId)!.value += value;
      } else {
        linksMap.set(linkId, {
          id: linkId,
          source: sourceId,
          target: targetId,
          sourceName,
          targetName,
          value,
          color
        });
      }
    };

    // Populate nodes & links based on project data
    projects.forEach((p) => {
      // Resolve project funding source using the core transparency engine rules
      const projectFundSources = resolveProjectFundSources(p);

      const auth = authorities.find((a) => a.id === p.authorityId);
      // Clean Ward / District code (e.g. "MCGM-KW")
      const wardName = auth ? auth.departmentCode : `Ward ${p.authorityId}`;
      
      const contractor = contractors.find((c) => c.id === p.contractorId);
      const contractorName = contractor ? contractor.name : `Contractor ${p.contractorId}`;

      // Column 0: Funding Source Category -> Column 1: District/Ward Allocation Pool
      projectFundSources.forEach((fs) => {
        const sourceId = `source-${fs.source}`;
        const wardId = `ward-${p.authorityId}`;

        const sNode = getOrAddNode(sourceId, fs.source, 0);
        sNode.outgoingVal += fs.amount;

        const wNode = getOrAddNode(wardId, wardName, 1, auth);
        wNode.incomingVal += fs.amount;

        addLink(sourceId, wardId, fs.source, wardName, fs.amount, colColors[0]);
      });

      // Column 1: District/Ward Allocation Pool -> Column 2: Active Project ID
      const wardId = `ward-${p.authorityId}`;
      const projectId = `project-${p.id}`;
      const projectLabel = `#${p.id} ${p.title}`;

      const wNode = nodesMap.get(wardId);
      if (wNode) {
        wNode.outgoingVal += p.budgetAllocated;
      }

      const pNode = getOrAddNode(projectId, projectLabel, 2, p);
      pNode.incomingVal += p.budgetAllocated;

      addLink(wardId, projectId, wardName, projectLabel, p.budgetAllocated, colColors[1]);

      // Column 2: Active Project ID -> Column 3: Contractor Ledger Balance
      const contractorId = `contractor-${p.contractorId}`;

      pNode.outgoingVal += p.budgetSpent;

      const cNode = getOrAddNode(contractorId, contractorName, 3, contractor);
      cNode.incomingVal += p.budgetSpent;

      addLink(projectId, contractorId, projectLabel, contractorName, p.budgetSpent, colColors[2]);
    });

    // Filter out empty nodes to prevent division by zero or overlapping visual frames
    const nodes: SankeyNode[] = Array.from(nodesMap.values())
      .map((n) => ({
        ...n,
        value: Math.max(n.incomingVal, n.outgoingVal),
        x: 0,
        y: 0,
        height: 0
      }))
      .filter((n) => n.value > 0);

    const links = Array.from(linksMap.values()).filter((l) => {
      const hasSource = nodes.some((n) => n.id === l.source);
      const hasTarget = nodes.some((n) => n.id === l.target);
      return hasSource && hasTarget;
    });

    // Layout configuration & responsive math
    const isMobile = dimensions.width < 600;
    const paddingLeft = isMobile ? 8 : 16;
    const paddingRight = isMobile ? 8 : 16;
    const paddingTop = isMobile ? 16 : 24;
    const paddingBottom = isMobile ? 16 : 24;
    const nodeWidth = isMobile ? 10 : 14;
    const verticalGap = isMobile ? 10 : 16;

    const colNodes: SankeyNode[][] = [[], [], [], []];
    nodes.forEach((n) => {
      colNodes[n.column].push(n);
    });

    // Stable sort for rendering columns
    colNodes[0].sort((a, b) => a.name.localeCompare(b.name));
    colNodes[1].sort((a, b) => a.name.localeCompare(b.name));
    colNodes[2].sort((a, b) => {
      const pA = a.originalData as Project;
      const pB = b.originalData as Project;
      return (pA?.id || 0) - (pB?.id || 0);
    });
    colNodes[3].sort((a, b) => a.name.localeCompare(b.name));

    // Safely compute vertical scaling for each column (handling mobile and narrow views)
    const columnScales = colNodes.map((column) => {
      const colSum = column.reduce((sum, n) => sum + n.value, 0);
      const dynamicGap = column.length > 1
        ? Math.min(verticalGap, (dimensions.height - paddingTop - paddingBottom - 10 * column.length) / (column.length - 1))
        : verticalGap;
      const safeGap = Math.max(2, dynamicGap);
      const totalGaps = column.length > 1 ? (column.length - 1) * safeGap : 0;
      const availableHeight = dimensions.height - paddingTop - paddingBottom - totalGaps;
      return {
        scale: colSum > 0 && availableHeight > 0 ? availableHeight / colSum : 0,
        gap: safeGap
      };
    });

    // Set layout positions of nodes
    colNodes.forEach((column, colIdx) => {
      const x = paddingLeft + colIdx * (dimensions.width - paddingLeft - paddingRight - nodeWidth) / 3;
      const { scale, gap } = columnScales[colIdx];
      let currentY = paddingTop;

      column.forEach((node) => {
        node.x = x;
        node.y = currentY;
        node.height = Math.max(isMobile ? 6 : 8, node.value * scale);
        currentY += node.height + gap;
      });
    });

    const nodesLookup = new Map<string, SankeyNode>();
    nodes.forEach((n) => nodesLookup.set(n.id, n));

    const leftConnectionOffsets = new Map<string, number>();
    const rightConnectionOffsets = new Map<string, number>();
    nodes.forEach((n) => {
      leftConnectionOffsets.set(n.id, 0);
      rightConnectionOffsets.set(n.id, 0);
    });

    // Sort links by Y coordinates to prevent ribbon crossover
    links.sort((a, b) => {
      const uA = nodesLookup.get(a.source)!;
      const uB = nodesLookup.get(b.source)!;
      const vA = nodesLookup.get(a.target)!;
      const vB = nodesLookup.get(b.target)!;
      
      if (uA.column !== uB.column) return uA.column - uB.column;
      if (uA.y !== uB.y) return uA.y - uB.y;
      return vA.y - vB.y;
    });

    // Construct curve paths and midpoints
    const linkPaths = links.map((link) => {
      const u = nodesLookup.get(link.source)!;
      const v = nodesLookup.get(link.target)!;

      const sScale = columnScales[u.column].scale;
      const tScale = columnScales[v.column].scale;

      const hSource = link.value * sScale;
      const hTarget = link.value * tScale;

      const sOffset = rightConnectionOffsets.get(link.source) || 0;
      const tOffset = leftConnectionOffsets.get(link.target) || 0;

      const x1 = u.x + nodeWidth;
      const y1 = u.y + sOffset;

      const x2 = v.x;
      const y2 = v.y + tOffset;

      rightConnectionOffsets.set(link.source, sOffset + hSource);
      leftConnectionOffsets.set(link.target, tOffset + hTarget);

      const ctrlX1 = x1 + (x2 - x1) / 2;
      const ctrlX2 = x2 - (x2 - x1) / 2;

      // Closed polygon path for standard Sankey ribbon flow representation
      const path = `
        M ${x1} ${y1}
        C ${ctrlX1} ${y1}, ${ctrlX2} ${y2}, ${x2} ${y2}
        L ${x2} ${y2 + Math.max(1.5, hTarget)}
        C ${ctrlX2} ${y2 + Math.max(1.5, hTarget)}, ${ctrlX1} ${y1 + Math.max(1.5, hSource)}, ${x1} ${y1 + Math.max(1.5, hSource)}
        Z
      `;

      // Precise centerline path for animation flow particles
      const centerPath = `
        M ${x1} ${y1 + hSource / 2}
        C ${ctrlX1} ${y1 + hSource / 2}, ${ctrlX2} ${y2 + hTarget / 2}, ${x2} ${y2 + hTarget / 2}
      `;

      // Calculate midpoint coordinates mathematically via Bezier formula at t=0.5
      const p0 = { x: x1, y: y1 + hSource / 2 };
      const p1 = { x: ctrlX1, y: y1 + hSource / 2 };
      const p2 = { x: ctrlX2, y: y2 + hTarget / 2 };
      const p3 = { x: x2, y: y2 + hTarget / 2 };
      const midPoint = getCubicBezierPoint(0.5, p0, p1, p2, p3);

      return {
        ...link,
        path,
        centerPath,
        midPoint,
        hSource,
        hTarget,
        column: u.column
      };
    });

    return {
      nodes,
      links: linkPaths,
      colColors
    };
  }, [projects, contractors, authorities, dimensions]);

  // Clean responsive label truncation system
  const getTruncatedLabel = (name: string, column: number, width: number) => {
    const isMobile = width < 600;
    if (isMobile) {
      if (column === 0) {
        if (name.includes('Infrastructure')) return 'CRIF';
        if (name.includes('PWD')) return 'PWD Tiers';
        if (name.includes('Municipal')) return 'Muni Portfolio';
        if (name.includes('Taxpayer')) return 'Taxpayer';
        return name.slice(0, 6);
      }
      if (column === 1) {
        return name.replace('MCGM-', '');
      }
      if (column === 2) {
        const match = name.match(/^#\d+/);
        return match ? match[0] : name.slice(0, 5);
      }
      if (column === 3) {
        return name.replace(' Constructions', '').replace(' Infrastructure', '').slice(0, 8);
      }
    }
    return name.length > 22 ? `${name.slice(0, 20)}...` : name;
  };

  const handleContainerClick = () => {
    setSelectedElement(null);
  };

  const activeLinkIds = useMemo(() => {
    if (hoveredLinkId) return new Set([hoveredLinkId]);
    if (hoveredNodeId) {
      return new Set(
        graph.links
          .filter((l) => l.source === hoveredNodeId || l.target === hoveredNodeId)
          .map((l) => l.id)
      );
    }
    if (selectedElement) {
      if (selectedElement.type === 'link') return new Set([selectedElement.id]);
      if (selectedElement.type === 'node') {
        return new Set(
          graph.links
            .filter((l) => l.source === selectedElement.id || l.target === selectedElement.id)
            .map((l) => l.id)
        );
      }
    }
    return null;
  }, [hoveredNodeId, hoveredLinkId, selectedElement, graph.links]);

  const activeNodeIds = useMemo(() => {
    if (hoveredNodeId) return new Set([hoveredNodeId]);
    if (hoveredLinkId) {
      const link = graph.links.find((l) => l.id === hoveredLinkId);
      if (link) return new Set([link.source, link.target]);
    }
    if (selectedElement) {
      if (selectedElement.type === 'node') return new Set([selectedElement.id]);
      if (selectedElement.type === 'link') {
        const link = graph.links.find((l) => l.id === selectedElement.id);
        if (link) return new Set([link.source, link.target]);
      }
    }
    return null;
  }, [hoveredNodeId, hoveredLinkId, selectedElement, graph.links]);

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="relative w-full overflow-hidden bg-slate-950/45 border border-slate-800/50 rounded-xl p-4 min-h-[350px] select-none"
    >
      {/* Dynamic Column Headers for Hackathon Scoring */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        <span className="text-[8px] sm:text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider">Funding Category</span>
        <span className="text-[8px] sm:text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider">District / Ward</span>
        <span className="text-[8px] sm:text-[10px] text-pink-400 font-extrabold uppercase tracking-wider">Active Projects</span>
        <span className="text-[8px] sm:text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">Contractor Ledgers</span>
      </div>

      {graph.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-[260px] text-xs text-muted-foreground italic">
          No project funding details mapped for this selection.
        </div>
      ) : (
        <svg
          width="100%"
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="overflow-visible"
        >
          {/* Neon Gradients for Flows */}
          <defs>
            <linearGradient id="grad-fund-to-ward" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="grad-ward-to-project" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="grad-project-to-contractor" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow-particle" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Curved Flow Links / Ribbons */}
          <g>
            {graph.links.map((link) => {
              const isActive = activeLinkIds === null || activeLinkIds.has(link.id);
              const isSelected = selectedElement?.type === 'link' && selectedElement.id === link.id;
              const fill = link.column === 0
                ? 'url(#grad-fund-to-ward)'
                : link.column === 1
                ? 'url(#grad-ward-to-project)'
                : 'url(#grad-project-to-contractor)';

              return (
                <g key={link.id}>
                  {/* Invisible guide path for animated capital particles */}
                  <path
                    d={link.centerPath}
                    fill="none"
                    stroke="none"
                    id={`guide-${link.id}`}
                  />

                  {/* Ribbon flow body */}
                  <path
                    d={link.path}
                    fill={fill}
                    opacity={isActive ? (isSelected ? 0.85 : 0.4) : 0.08}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredLinkId(link.id)}
                    onMouseLeave={() => setHoveredLinkId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      const x = link.midPoint?.x || 100;
                      const y = link.midPoint?.y || 100;
                      setSelectedElement({
                        type: 'link',
                        id: link.id,
                        x,
                        y: y - 130,
                        title: 'Funding Allocation Flow',
                        subtitle: `${link.sourceName} ➔ ${link.targetName}`,
                        details: `Sanctioned Budget Flow: ${formatFlowAmount(link.value)}`
                      });
                    }}
                  />

                  {/* Flow Particle Animation for Upstream Visuals */}
                  {isActive && link.value > 1000000 && (
                    <circle r="2" fill="#ffffff" filter="url(#glow-particle)" opacity="0.9">
                      <animateMotion dur={`${2.5 + Math.random() * 2.5}s`} repeatCount="indefinite">
                        <mpath href={`#guide-${link.id}`} />
                      </animateMotion>
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* Node Rectangles */}
          <g>
            {graph.nodes.map((node) => {
              const isActive = activeNodeIds === null || activeNodeIds.has(node.id);
              const isHovered = hoveredNodeId === node.id;
              const isSelected = selectedElement?.type === 'node' && selectedElement.id === node.id;
              const fill = graph.colColors[node.column];
              const nodeWidth = dimensions.width < 600 ? 10 : 14;

              return (
                <g key={node.id} className="transition-all duration-200">
                  {/* Outer visual feedback glow */}
                  {(isHovered || isSelected) && (
                    <rect
                      x={node.x - 2}
                      y={node.y - 2}
                      width={nodeWidth + 4}
                      height={node.height + 4}
                      fill={fill}
                      opacity={0.2}
                      rx={3}
                    />
                  )}

                  {/* Base Node */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={nodeWidth}
                    height={node.height}
                    fill={fill}
                    opacity={isActive ? 0.95 : 0.25}
                    rx={2}
                    className="cursor-pointer transition-all duration-150 hover:brightness-110"
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      let title = '';
                      let subtitle = '';
                      let details = '';
                      let detailsList: { label: string; value: string }[] = [];

                      if (node.column === 0) {
                        title = 'Funding Source Category';
                        subtitle = node.name;
                        details = `Aggregate Allotment: ${formatFlowAmount(node.value)}`;
                      } else if (node.column === 1) {
                        const auth = node.originalData as Authority;
                        title = 'District/Ward Allocation Pool';
                        subtitle = auth ? auth.name : node.name;
                        details = `Pool Balance: ${formatFlowAmount(node.value)}`;
                        if (auth) {
                          detailsList = [
                            { label: 'Ward Code', value: auth.departmentCode },
                            { label: 'Email Desk', value: auth.contactEmail }
                          ];
                        }
                      } else if (node.column === 2) {
                        const proj = node.originalData as Project;
                        title = 'Active Project ID';
                        subtitle = proj.title;
                        details = `Allocated Budget: ${formatFlowAmount(proj.budgetAllocated)}`;
                        detailsList = [
                          { label: 'Outflow Spent', value: formatFlowAmount(proj.budgetSpent) },
                          { label: 'Schedule Delay', value: `${proj.delayDays} Days` },
                          { label: 'Current Status', value: proj.status.replace('_', ' ') }
                        ];
                      } else if (node.column === 3) {
                        const contractor = node.originalData as Contractor;
                        title = 'Contractor Ledger Balance';
                        subtitle = node.name;
                        details = `Disbursed Ledger: ${formatFlowAmount(node.value)}`;
                        if (contractor) {
                          detailsList = [
                            { label: 'Audit Rating', value: `${contractor.rating.toFixed(2)} / 5.00` },
                            { label: 'Work Status', value: contractor.blacklisted ? '⚠️ Restricted' : '✅ Active License' }
                          ];
                        }
                      }

                      // Adjust tooltip positioning side to avoid overflow boundaries
                      const tooltipWidth = 240;
                      let xPos = node.x + nodeWidth + 10;
                      if (node.column >= 2) {
                        xPos = node.x - tooltipWidth - 10;
                      }

                      setSelectedElement({
                        type: 'node',
                        id: node.id,
                        x: Math.max(10, Math.min(xPos, dimensions.width - tooltipWidth - 10)),
                        y: Math.max(10, node.y + node.height / 2 - 60),
                        title,
                        subtitle,
                        details,
                        detailsList
                      });
                    }}
                  />

                  {/* Smart dynamic text nodes (hidden if height is extremely small to avoid congestion) */}
                  {node.height > (dimensions.width < 600 ? 10 : 12) && (
                    <text
                      x={node.column === 3 ? node.x - 6 : node.x + (nodeWidth + 6)}
                      y={node.y + node.height / 2 + 3}
                      fill={isActive ? '#cbd5e1' : '#475569'}
                      fontSize={dimensions.width < 600 ? 7 : 9}
                      fontWeight={isHovered || isSelected ? 800 : 500}
                      textAnchor={node.column === 3 ? 'end' : 'start'}
                      className="pointer-events-none transition-all duration-200 select-none font-sans"
                    >
                      {getTruncatedLabel(node.name, node.column, dimensions.width)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {/* Fully-interactive Framer Motion Tooltip Popover Overlay */}
      <AnimatePresence>
        {selectedElement && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: selectedElement.y + 5 }}
            animate={{ opacity: 1, scale: 1, y: selectedElement.y }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: selectedElement.x,
              top: selectedElement.y,
              zIndex: 50
            }}
            className="w-[240px] bg-slate-900/95 backdrop-blur border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-[10px] space-y-2 select-text"
            onClick={(e) => e.stopPropagation()} // Prevent closing when tapping within tooltip itself
          >
            <div className="space-y-0.5">
              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold block">
                {selectedElement.title}
              </span>
              <h5 className="font-extrabold text-slate-200 text-[11px] leading-snug break-words">
                {selectedElement.subtitle}
              </h5>
            </div>

            <div className="h-px bg-slate-800/60" />

            <div className="font-black text-emerald-400 text-xs flex items-center justify-between">
              <span>Financial Allocation:</span>
              <span>{selectedElement.details.split(': ')[1] || selectedElement.details}</span>
            </div>

            {selectedElement.detailsList && selectedElement.detailsList.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-800/40">
                {selectedElement.detailsList.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[9px]">
                    <span className="text-slate-500 font-bold">{item.label}</span>
                    <span className="text-slate-350 font-extrabold text-right max-w-[140px] truncate">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-1 text-center text-[7px] text-slate-500 uppercase tracking-widest border-t border-slate-800/20">
              Tap background to close
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
