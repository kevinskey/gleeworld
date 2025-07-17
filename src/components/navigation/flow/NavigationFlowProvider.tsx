import React, { createContext, useContext, useCallback, useState } from 'react';
import { Node, Edge, useNodesState, useEdgesState, addEdge, Connection } from '@xyflow/react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/constants/permissions';

interface NavigationFlowContextType {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  selectedNode: string | null;
  setSelectedNode: (nodeId: string | null) => void;
  navigateToNode: (nodeId: string) => void;
}

const NavigationFlowContext = createContext<NavigationFlowContextType | null>(null);

export const useNavigationFlow = () => {
  const context = useContext(NavigationFlowContext);
  if (!context) {
    throw new Error('useNavigationFlow must be used within NavigationFlowProvider');
  }
  return context;
};

export const NavigationFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Create initial nodes based on user permissions
  const createInitialNodes = useCallback((): Node[] => {
    const baseNodes: Node[] = [
      {
        id: 'dashboard',
        type: 'navigation',
        position: { x: 250, y: 50 },
        data: { 
          label: 'Dashboard', 
          icon: 'Home',
          href: '/dashboard',
          isCenter: true
        }
      }
    ];

    const navigationItems = [
      {
        id: 'library',
        label: 'Library',
        icon: 'Library',
        href: '/library',
        permission: 'view_library',
        position: { x: 100, y: 150 }
      },
      {
        id: 'contracts',
        label: 'Contracts',
        icon: 'FileText',
        href: '/?tab=contracts',
        permission: 'view_own_contracts',
        position: { x: 400, y: 150 }
      },
      {
        id: 'calendar',
        label: 'Calendar',
        icon: 'Calendar',
        href: '/?tab=calendar',
        permission: 'view_calendar',
        position: { x: 50, y: 250 }
      },
      {
        id: 'finance',
        label: 'Finance',
        icon: 'DollarSign',
        href: '/?tab=finance',
        permission: 'view_finance',
        position: { x: 200, y: 250 }
      },
      {
        id: 'admin',
        label: 'Admin',
        icon: 'Settings',
        href: '/?tab=admin',
        permission: 'admin_access',
        position: { x: 450, y: 250 }
      }
    ];

    const permittedNodes = navigationItems
      .filter(item => !item.permission || hasPermission(user?.role || 'user', item.permission))
      .map(item => ({
        id: item.id,
        type: 'navigation',
        position: item.position,
        data: {
          label: item.label,
          icon: item.icon,
          href: item.href
        }
      }));

    return [...baseNodes, ...permittedNodes];
  }, [user]);

  const createInitialEdges = useCallback((nodes: Node[]): Edge[] => {
    const centerNode = nodes.find(n => n.data.isCenter);
    if (!centerNode) return [];

    return nodes
      .filter(n => !n.data.isCenter)
      .map((node, index) => ({
        id: `e-${centerNode.id}-${node.id}`,
        source: centerNode.id,
        target: node.id,
        type: 'connection',
        animated: false,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 }
      }));
  }, []);

  const initialNodes = createInitialNodes();
  const initialEdges = createInitialEdges(initialNodes);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const navigateToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node?.data.href && typeof node.data.href === 'string') {
      window.location.href = node.data.href;
    }
  }, [nodes]);

  return (
    <NavigationFlowContext.Provider
      value={{
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        selectedNode,
        setSelectedNode,
        navigateToNode
      }}
    >
      {children}
    </NavigationFlowContext.Provider>
  );
};