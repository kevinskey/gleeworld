import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  Edge,
} from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface MusicFlowEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  style?: React.CSSProperties;
  markerEnd?: any;
  data?: any;
}

export const MusicFlowEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: MusicFlowEdgeProps) => {
  const { setEdges } = useReactFlow();
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges: Edge[]) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          stroke: '#3b82f6', // Blue color
          strokeWidth: 3,
          filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))',
        }} 
      />
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-auto"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <Button
            variant="destructive"
            size="sm"
            onClick={onEdgeClick}
            className="w-6 h-6 p-0 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

MusicFlowEdge.displayName = 'MusicFlowEdge';