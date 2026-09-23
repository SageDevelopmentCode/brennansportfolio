"use client";

import {
  buildGraphData,
  formatEventYear,
  type HistoryEvent,
  type HistoryGraphNode,
  type HistoryLink,
} from "@/lib/history";
import { useMemo } from "react";

type HistoryEventGraphProps = {
  events: HistoryEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

function truncateTitle(title: string, maxLength = 22): string {
  if (title.length <= maxLength) return title;
  return `${title.slice(0, maxLength - 1)}…`;
}

function ChronologicalEdge({
  source,
  target,
}: {
  source: HistoryGraphNode;
  target: HistoryGraphNode;
}) {
  return (
    <line
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      className="history-graph-edge-chronological"
    />
  );
}

function ThematicEdge({
  source,
  target,
  label,
}: {
  source: HistoryGraphNode;
  target: HistoryGraphNode;
  label?: string;
}) {
  const midX = (source.x + target.x) / 2;
  const controlY = Math.min(source.y, target.y) - 70;
  const path = `M ${source.x} ${source.y} Q ${midX} ${controlY} ${target.x} ${target.y}`;

  return (
    <g>
      <path d={path} className="history-graph-edge-thematic" fill="none" />
      {label ? (
        <text
          x={midX}
          y={controlY - 8}
          textAnchor="middle"
          className="history-graph-edge-label"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

function GraphNode({
  node,
  isSelected,
  onSelect,
}: {
  node: HistoryGraphNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const { event, x, y } = node;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={`history-graph-node ${isSelected ? "history-graph-node-selected" : ""}`}
    >
      <circle r={28} className="history-graph-node-circle" />
      <text
        y={-4}
        textAnchor="middle"
        className="history-graph-node-emoji"
        aria-hidden
      >
        {event.emoji ?? "📌"}
      </text>
      <text y={14} textAnchor="middle" className="history-graph-node-year">
        {formatEventYear(event.year)}
      </text>
      <foreignObject x={-60} y={36} width={120} height={40}>
        <button
          type="button"
          onClick={() => onSelect(event.id)}
          className="history-graph-node-label"
          aria-pressed={isSelected}
        >
          {truncateTitle(event.title)}
        </button>
      </foreignObject>
    </g>
  );
}

export function HistoryEventGraph({
  events,
  selectedId,
  onSelect,
}: HistoryEventGraphProps) {
  const graphData = useMemo(() => buildGraphData(events), [events]);

  const nodeById = useMemo(
    () => new Map(graphData.nodes.map((node) => [node.event.id, node])),
    [graphData.nodes],
  );

  function renderLink(link: HistoryLink) {
    const source = nodeById.get(link.source);
    const target = nodeById.get(link.target);
    if (!source || !target) return null;

    if (link.type === "chronological") {
      return (
        <ChronologicalEdge
          key={`${link.type}-${link.source}-${link.target}`}
          source={source}
          target={target}
        />
      );
    }

    return (
      <ThematicEdge
        key={`${link.type}-${link.source}-${link.target}`}
        source={source}
        target={target}
        label={link.label}
      />
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <p className="mt-6 text-sm text-[var(--history-muted)]">
        Add events to see the graph.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div className="history-graph-shell overflow-x-auto">
        <svg
          viewBox={`0 0 ${graphData.width} ${graphData.height}`}
          className="history-graph-svg"
          role="img"
          aria-label="History events graph"
        >
          <g className="history-graph-edges">
            {graphData.links.map(renderLink)}
          </g>
          <g className="history-graph-nodes">
            {graphData.nodes.map((node) => (
              <GraphNode
                key={node.event.id}
                node={node}
                isSelected={selectedId === node.event.id}
                onSelect={(id) =>
                  onSelect(selectedId === id ? null : id)
                }
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--history-muted)]">
        <div className="flex items-center gap-2">
          <span className="history-graph-legend-line history-graph-legend-chronological" />
          Chronological
        </div>
        <div className="flex items-center gap-2">
          <span className="history-graph-legend-line history-graph-legend-thematic" />
          Thematic
        </div>
      </div>
    </div>
  );
}
