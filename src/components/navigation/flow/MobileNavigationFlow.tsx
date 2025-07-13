import React, { useCallback } from 'react';
import { ReactFlow, Controls, Background, MiniMap } from '@xyflow/react';
import { NavigationFlowProvider, useNavigationFlow } from './NavigationFlowProvider';
import { NavigationNode } from './NavigationNode';
import { ConnectionEdge } from './ConnectionEdge';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  navigation: NavigationNode,
};

const edgeTypes = {
  connection: ConnectionEdge,
};

const FlowComponent: React.FC = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, selectedNode } = useNavigationFlow();

  const getNodeClassName = useCallback((node: any) => {
    return node.data.isCenter ? 'center-node' : 'nav-node';
  }, []);

  return (
    <div className="w-full h-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2, minZoom: 0.5 }}
        className="bg-gradient-to-br from-background to-muted/20"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--muted-foreground))" size={1} />
        <Controls className="!bg-card !border-border [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
        <MiniMap 
          nodeClassName={getNodeClassName}
          className="!bg-card !border-border"
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
};

export const MobileNavigationFlow: React.FC = () => {
  return (
    <NavigationFlowProvider>
      <FlowComponent />
    </NavigationFlowProvider>
  );
};