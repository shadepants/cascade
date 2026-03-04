// ─── Cascade Map (Visual DAG) ──────────────────────────────────────────
// Renders the causal graph using @xyflow/react (React Flow).
// Shows how player actions branched into historical consequences.

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GameEvent, CausalChain } from '../types.ts';

interface CascadeMapProps {
  chains: CausalChain[];
  allEvents: GameEvent[];
}

/** 
 * Map our CausalChain structure to React Flow nodes and edges.
 * Uses a simple layered layout (horizontal).
 */
function buildFlowData(chains: CausalChain[], allEvents: GameEvent[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();

  let yOffset = 0;
  const X_GAP = 250;
  const Y_GAP = 100;

  for (const chain of chains) {
    const queue: { eventId: string; depth: number; x: number; y: number }[] = [
      { eventId: chain.rootEventId, depth: 0, x: 0, y: yOffset }
    ];

    while (queue.length > 0) {
      const { eventId, depth, x, y } = queue.shift()!;
      if (visited.has(eventId)) continue;
      visited.add(eventId);

      const event = allEvents.find(e => e.id === eventId);
      if (!event) continue;

      // Create node
      nodes.push({
        id: eventId,
        data: { label: `${event.description} (Year ${event.year})` },
        position: { x, y },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: event.playerCaused ? '#2a4d69' : '#4b86b4',
          color: '#fff',
          border: '1px solid #1a3344',
          borderRadius: '4px',
          padding: '10px',
          width: 200,
          fontSize: '12px',
        },
      });

      // Find children (events caused by this one)
      const children = allEvents.filter(e => e.causedBy === eventId);
      
      children.forEach((child, index) => {
        const childX = x + X_GAP;
        const childY = y + (index - (children.length - 1) / 2) * Y_GAP;
        
        // Add edge
        edges.push({
          id: `e-${eventId}-${child.id}`,
          source: eventId,
          target: child.id,
          animated: true,
          style: { stroke: '#adcbe3' },
        });

        queue.push({ 
          eventId: child.id, 
          depth: depth + 1, 
          x: childX, 
          y: childY 
        });
      });
    }

    yOffset += (chain.totalDepth + 2) * Y_GAP; // avoid overlapping chains
  }

  return { nodes, edges };
}

export function CascadeMap({ chains, allEvents }: CascadeMapProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlowData(chains, allEvents),
    [chains, allEvents]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div style={{ width: '100%', height: '500px', background: '#0a0a0a', borderRadius: '8px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background color="#333" gap={20} />
        <Controls />
        <Panel position="top-right" style={{ color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '5px' }}>
          Causal Graph
        </Panel>
      </ReactFlow>
    </div>
  );
}
