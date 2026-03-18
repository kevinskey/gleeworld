declare module '@dnd-kit/sortable' {
  export function useSortable(args: any): any;
}

declare module 'react-dropzone' {
  export function useDropzone(options?: any): any;
}

declare module 'recharts' {
  import * as React from 'react';
  export const ResponsiveContainer: React.ComponentType<any>;
  export const CartesianGrid: React.ComponentType<any>;
  export const Tooltip: React.ComponentType<any>;
  export const Legend: React.ComponentType<any>;
  export const XAxis: React.ComponentType<any>;
  export const YAxis: React.ComponentType<any>;
  export const PieChart: React.ComponentType<any>;
  export const Pie: React.ComponentType<any>;
  export const Cell: React.ComponentType<any>;
  export const BarChart: React.ComponentType<any>;
  export const Bar: React.ComponentType<any>;
  export const LineChart: React.ComponentType<any>;
  export const Line: React.ComponentType<any>;
  export const AreaChart: React.ComponentType<any>;
  export const Area: React.ComponentType<any>;
  export const ComposedChart: React.ComponentType<any>;
  export const ScatterChart: React.ComponentType<any>;
  export const Scatter: React.ComponentType<any>;
  export const RadarChart: React.ComponentType<any>;
  export const Radar: React.ComponentType<any>;
  export const PolarGrid: React.ComponentType<any>;
  export const PolarAngleAxis: React.ComponentType<any>;
  export const PolarRadiusAxis: React.ComponentType<any>;
  export const Treemap: React.ComponentType<any>;
  export const FunnelChart: React.ComponentType<any>;
  export const Funnel: React.ComponentType<any>;
  export const LabelList: React.ComponentType<any>;
}

interface ObjectConstructor {
  values(o: any): any[];
  entries(o: any): [string, any][];
}
