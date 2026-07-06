'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, Contractor, Authority, Road } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

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
}

// Indian currency formatting helper matching requirements (e.g. ₹4.50Cr or ₹75.00Lakh)
export function formatFlowAmount(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)}Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)}Lakh`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val).replace('INR', '₹');
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
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    visible: boolean;
    title: string;
    subtitle: string;
    details: string;
    detailsList?: { label: string; value: string }[];
  }>({
    x: 0,
    y: 0,
    visible: false,
    title: '',
    subtitle: '',
    details: ''
  });

  // Safe dimensions extraction for WebViews and responsive grids
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setDimensions({
        width: width > 0 ? width : 850,
        height: 380
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX - rect.left + 16,
      y: e.clientY - rect.top + 16
    }));
  };

  const graph = useMemo(() => {
    // 1. Gather all nodes and aggregate values
    const nodesMap = new Map<string, Omit<SankeyNode, 'x' | 'y' | 'height'>>();
    const linksMap = new Map<string, SankeyLink>();

    // Color definitions for visual aesthetic
    const colColors = [
      '#06b6d4', // Col 0: Funding Source (Cyan)
      '#818cf8', // Col 1: Authority (Indigo)
      '#f472b6', // Col 2: Project Title (Pink)
      '#34d399'  // Col 3: Contractor Outflow (Emerald)
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

    // Populate graph nodes & links based on project data
    projects.forEach((p) => {
      // Map allocation source fallback (Municipal General Tier)
      const projectFundSources = p.fundSources && p.fundSources.length > 0
        ? p.fundSources
        : [{ source: 'Municipal General Tier' as const, amount: p.budgetAllocated }];

      const auth = authorities.find((a) => a.id === p.authorityId);
      const authName = auth ? auth.departmentCode : `Authority ${p.authorityId}`;
      const contractor = contractors.find((c) => c.id === p.contractorId);
      const contractorName = contractor ? contractor.name : `Contractor ${p.contractorId}`;

      // Source Nodes & Links (Funding Source -> Authority)
      projectFundSources.forEach((fs) => {
        const sourceId = `source-${fs.source}`;
        const authId = `auth-${p.authorityId}`;

        const sNode = getOrAddNode(sourceId, fs.source, 0);
        sNode.outgoingVal += fs.amount;

        const aNode = getOrAddNode(authId, authName, 1, auth);
        aNode.incomingVal += fs.amount;

        addLink(sourceId, authId, fs.source, authName, fs.amount, colColors[0]);
      });

      // Authority -> Project
      const authId = `auth-${p.authorityId}`;
      const projectId = `project-${p.id}`;

      const aNode = nodesMap.get(authId);
      if (aNode) {
        aNode.outgoingVal += p.budgetAllocated;
      }

      const pNode = getOrAddNode(projectId, p.title, 2, p);
      pNode.incomingVal += p.budgetAllocated;

      addLink(authId, projectId, authName, p.title, p.budgetAllocated, colColors[1]);

      // Project -> Contractor
      const contractorId = `contractor-${p.contractorId}`;

      pNode.outgoingVal += p.budgetSpent;

      const cNode = getOrAddNode(contractorId, contractorName, 3, contractor);
      cNode.incomingVal += p.budgetSpent;

      addLink(projectId, contractorId, p.title, contractorName, p.budgetSpent, colColors[2]);
    });

    // Clean nodes list and filter out empty nodes to prevent division by zero or loop issues
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
      // Keep link only if both source and target exist in final nodes
      const hasSource = nodes.some((n) => n.id === l.source);
      const hasTarget = nodes.some((n) => n.id === l.target);
      return hasSource && hasTarget;
    });

    // 2. Perform simple horizontal and vertical placement layout
    const paddingLeft = 16;
    const paddingRight = 16;
    const paddingTop = 24;
    const paddingBottom = 24;
    const nodeWidth = 14;
    const verticalGap = 16;

    const colNodes: SankeyNode[][] = [[], [], [], []];
    nodes.forEach((n) => {
      colNodes[n.column].push(n);
    });

    // Sort nodes in each column for a stable layout
    colNodes[0].sort((a, b) => a.name.localeCompare(b.name));
    colNodes[1].sort((a, b) => a.name.localeCompare(b.name));
    colNodes[2].sort((a, b) => {
      const pA = a.originalData as Project;
      const pB = b.originalData as Project;
      return new Date(pA.startDate).getTime() - new Date(pB.startDate).getTime();
    });
    colNodes[3].sort((a, b) => a.name.localeCompare(b.name));

    // Calculate vertical scaling for each column
    const columnScales = colNodes.map((column) => {
      const colSum = column.reduce((sum, n) => sum + n.value, 0);
      const totalGaps = column.length > 1 ? (column.length - 1) * verticalGap : 0;
      const availableHeight = dimensions.height - paddingTop - paddingBottom - totalGaps;
      return colSum > 0 && availableHeight > 0 ? availableHeight / colSum : 0;
    });

    // Set horizontal and vertical positions of each node
    colNodes.forEach((column, colIdx) => {
      const x = paddingLeft + colIdx * (dimensions.width - paddingLeft - paddingRight - nodeWidth) / 3;
      const scale = columnScales[colIdx];
      let currentY = paddingTop;

      column.forEach((node) => {
        node.x = x;
        node.y = currentY;
        node.height = Math.max(8, node.value * scale); // Ensure minimum visible height of 8px
        currentY += node.height + verticalGap;
      });
    });

    // 3. Track current alignment ports on each node for incoming and outgoing ribbons
    const nodesLookup = new Map<string, SankeyNode>();
    nodes.forEach((n) => nodesLookup.set(n.id, n));

    const leftConnectionOffsets = new Map<string, number>();
    const rightConnectionOffsets = new Map<string, number>();

    nodes.forEach((n) => {
      leftConnectionOffsets.set(n.id, 0);
      rightConnectionOffsets.set(n.id, 0);
    });

    // Sort links by vertical position of target for source nodes, and source position for target nodes
    links.sort((a, b) => {
      const uA = nodesLookup.get(a.source)!;
      const uB = nodesLookup.get(b.source)!;
      const vA = nodesLookup.get(a.target)!;
      const vB = nodesLookup.get(b.target)!;
      
      if (uA.column !== uB.column) return uA.column - uB.column;
      if (uA.y !== uB.y) return uA.y - uB.y;
      return vA.y - vB.y;
    });

    // Map calculated curved path strings to links
    const linkPaths = links.map((link) => {
      const u = nodesLookup.get(link.source)!;
      const v = nodesLookup.get(link.target)!;

      const sScale = columnScales[u.column];
      const tScale = columnScales[v.column];

      const hSource = link.value * sScale;
      const hTarget = link.value * tScale;

      const sOffset = rightConnectionOffsets.get(link.source) || 0;
      const tOffset = leftConnectionOffsets.get(link.target) || 0;

      const x1 = u.x + nodeWidth;
      const y1 = u.y + sOffset;

      const x2 = v.x;
      const y2 = v.y + tOffset;

      // Increment offsets for stacking
      rightConnectionOffsets.set(link.source, sOffset + hSource);
      leftConnectionOffsets.set(link.target, tOffset + hTarget);

      // Generate curved cubic Bezier ribbon coordinates
      const ctrlX1 = x1 + (x2 - x1) / 2;
      const ctrlX2 = x2 - (x2 - x1) / 2;

      const d = `
        M ${x1} ${y1}
        C ${ctrlX1} ${y1}, ${ctrlX2} ${y2}, ${x2} ${y2}
        L ${x2} ${y2 + Math.max(2, hTarget)}
        C ${ctrlX2} ${y2 + Math.max(2, hTarget)}, ${ctrlX1} ${y1 + Math.max(2, hSource)}, ${x1} ${y1 + Math.max(2, hSource)}
        Z
      `;

      return {
        ...link,
        path: d,
        hSource,
        hTarget
      };
    });

    return {
      nodes,
      links: linkPaths,
      colColors
    };
  }, [projects, contractors, authorities, dimensions]);

  // Dynamic hover highlighting logic
  const activeLinkIds = useMemo(() => {
    if (hoveredLinkId) return new Set([hoveredLinkId]);
    if (hoveredNodeId) {
      return new Set(
        graph.links
          .filter((l) => l.source === hoveredNodeId || l.target === hoveredNodeId)
          .map((l) => l.id)
      );
    }
    return null;
  }, [hoveredNodeId, hoveredLinkId, graph.links]);

  const activeNodeIds = useMemo(() => {
    if (hoveredNodeId) return new Set([hoveredNodeId]);
    if (hoveredLinkId) {
      const link = graph.links.find((l) => l.id === hoveredLinkId);
      if (link) return new Set([link.source, link.target]);
    }
    return null;
  }, [hoveredNodeId, hoveredLinkId, graph.links]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full overflow-hidden bg-slate-950/30 border border-slate-800/40 rounded-xl p-4 min-h-[410px] select-none"
    >
      {/* Column Headers */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        <span className="text-[9px] text-cyan-400 font-black uppercase tracking-wider">Funding Tier</span>
        <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wider">Allocated Budget</span>
        <span className="text-[9px] text-pink-400 font-black uppercase tracking-wider">Active Projects</span>
        <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider">Outflow payouts</span>
      </div>

      {graph.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-xs text-muted-foreground italic">
          No project funding details mapped for this selection.
        </div>
      ) : (
        <svg
          width="100%"
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="overflow-visible"
        >
          {/* Curved Flow Links / Ribbons */}
          <g>
            {graph.links.map((link) => {
              const isActive = activeLinkIds === null || activeLinkIds.has(link.id);
              const isHovered = hoveredLinkId === link.id;

              return (
                <path
                  key={link.id}
                  d={link.path}
                  fill={link.color}
                  opacity={isActive ? (isHovered ? 0.75 : 0.35) : 0.08}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredLinkId(link.id);
                    setTooltip({
                      x: 0,
                      y: 0,
                      visible: true,
                      title: 'Capital Flow Connection',
                      subtitle: `${link.sourceName} ➔ ${link.targetName}`,
                      details: `Transferred flow: ${formatFlowAmount(link.value)}`
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredLinkId(null);
                    setTooltip((prev) => ({ ...prev, visible: false }));
                  }}
                />
              );
            })}
          </g>

          {/* Node Rectangles */}
          <g>
            {graph.nodes.map((node) => {
              const isActive = activeNodeIds === null || activeNodeIds.has(node.id);
              const isHovered = hoveredNodeId === node.id;
              const fill = graph.colColors[node.column];

              return (
                <g key={node.id} className="transition-all duration-200">
                  {/* Glowing background on hover */}
                  {isHovered && (
                    <rect
                      x={node.x - 2}
                      y={node.y - 2}
                      width={18}
                      height={node.height + 4}
                      fill={fill}
                      opacity={0.15}
                      rx={3}
                    />
                  )}

                  {/* Node Rect */}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={14}
                    height={node.height}
                    fill={fill}
                    opacity={isActive ? 0.9 : 0.25}
                    rx={2}
                    className="cursor-pointer transition-all duration-200 hover:brightness-110"
                    onMouseEnter={() => {
                      setHoveredNodeId(node.id);

                      // Build descriptive tooltip metadata
                      let title = '';
                      let subtitle = '';
                      let details = '';
                      let detailsList: { label: string; value: string }[] = [];

                      if (node.column === 0) {
                        title = 'Funding Source Tier';
                        subtitle = node.name;
                        details = `Total Sanctioned Flow: ${formatFlowAmount(node.value)}`;
                      } else if (node.column === 1) {
                        const auth = node.originalData as Authority;
                        title = 'Supervising Budget Authority';
                        subtitle = auth ? auth.name : node.name;
                        details = `Allocated Budget: ${formatFlowAmount(node.value)}`;
                        if (auth) {
                          detailsList = [
                            { label: 'Code', value: auth.departmentCode },
                            { label: 'Email', value: auth.contactEmail }
                          ];
                        }
                      } else if (node.column === 2) {
                        const proj = node.originalData as Project;
                        title = 'Active Project Binding';
                        subtitle = proj.title;
                        details = `Allocated: ${formatFlowAmount(proj.budgetAllocated)}`;
                        detailsList = [
                          { label: 'Spent Outflow', value: formatFlowAmount(proj.budgetSpent) },
                          { label: 'Completion Delay', value: `${proj.delayDays} Days` },
                          { label: 'Status', value: proj.status.replace('_', ' ') }
                        ];
                      } else if (node.column === 3) {
                        const contractor = node.originalData as Contractor;
                        title = 'Contractor Payout Outflow';
                        subtitle = node.name;
                        details = `Aggregate Received Payout: ${formatFlowAmount(node.value)}`;
                        if (contractor) {
                          detailsList = [
                            { label: 'Rating Score', value: `${contractor.rating.toFixed(2)}/5` },
                            { label: 'Contracts Handled', value: `${contractor.projectsCompleted} completed` },
                            { label: 'Audit Alert', value: contractor.blacklisted ? '⚠️ Blacklisted' : '✅ Active' }
                          ];
                        }
                      }

                      setTooltip({
                        x: 0,
                        y: 0,
                        visible: true,
                        title,
                        subtitle,
                        details,
                        detailsList
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredNodeId(null);
                      setTooltip((prev) => ({ ...prev, visible: false }));
                    }}
                  />

                  {/* Node Label Text */}
                  {node.height > 12 && (
                    <text
                      x={node.column === 3 ? node.x - 8 : node.x + 22}
                      y={node.y + node.height / 2 + 3}
                      fill={isActive ? '#cbd5e1' : '#475569'}
                      fontSize={9}
                      fontWeight={isHovered ? 800 : 600}
                      textAnchor={node.column === 3 ? 'end' : 'start'}
                      className="pointer-events-none transition-all duration-200 line-clamp-1 truncate select-none font-sans"
                    >
                      {node.name.length > 22 ? `${node.name.slice(0, 20)}...` : node.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {/* Interactive Tooltip Element */}
      <AnimatePresence>
        {tooltip.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y,
              pointerEvents: 'none',
              zIndex: 50
            }}
            className="w-[260px] bg-slate-900/95 backdrop-blur border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-[10px] space-y-2"
          >
            <div className="space-y-0.5">
              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold block">
                {tooltip.title}
              </span>
              <h5 className="font-extrabold text-slate-200 text-xs leading-snug break-words">
                {tooltip.subtitle}
              </h5>
            </div>

            <div className="h-px bg-slate-800/60" />

            <div className="font-extrabold text-emerald-400">
              {tooltip.details}
            </div>

            {tooltip.detailsList && tooltip.detailsList.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-800/40">
                {tooltip.detailsList.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[9px]">
                    <span className="text-slate-500 font-bold">{item.label}</span>
                    <span className="text-slate-300 font-extrabold text-right max-w-[150px] truncate">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
