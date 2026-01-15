import { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  SelectionMode,
  ConnectionMode,
  Node,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Feature, useAppStore } from '@/store/app-store';
import { themeOptions } from '@/config/theme-options';
import {
  TaskNode,
  DependencyEdge,
  GraphControls,
  GraphLegend,
  GraphFilterControls,
} from './components';
import {
  useGraphNodes,
  useGraphLayout,
  useGraphFilter,
  type TaskNodeData,
  type GraphFilterState,
  type NodeActionCallbacks,
} from './hooks';
import { cn } from '@/lib/utils';
import { useDebounceValue } from 'usehooks-ts';
import { SearchX, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define custom node and edge types - using any to avoid React Flow's strict typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = {
  task: TaskNode,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes: any = {
  dependency: DependencyEdge,
};

interface BackgroundSettings {
  cardOpacity: number;
  cardGlassmorphism: boolean;
  cardBorderEnabled: boolean;
  cardBorderOpacity: number;
}

interface GraphCanvasProps {
  features: Feature[];
  runningAutoTasks: string[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onNodeDoubleClick?: (featureId: string) => void;
  nodeActionCallbacks?: NodeActionCallbacks;
  onCreateDependency?: (sourceId: string, targetId: string) => Promise<boolean>;
  onAddFeature?: () => void;
  backgroundStyle?: React.CSSProperties;
  backgroundSettings?: BackgroundSettings;
  className?: string;
}

function GraphCanvasInner({
  features,
  runningAutoTasks,
  searchQuery,
  onSearchQueryChange,
  onNodeDoubleClick,
  nodeActionCallbacks,
  onCreateDependency,
  onAddFeature,
  backgroundStyle,
  backgroundSettings,
  className,
}: GraphCanvasProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');

  // Determine React Flow color mode based on current theme
  const effectiveTheme = useAppStore((state) => state.getEffectiveTheme());
  const [systemColorMode, setSystemColorMode] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (effectiveTheme !== 'system') return;
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemColorMode(mql.matches ? 'dark' : 'light');
    update();

    // Safari < 14 fallback
    if (mql.addEventListener) {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    }
    // eslint-disable-next-line deprecation/deprecation
    mql.addListener(update);
    // eslint-disable-next-line deprecation/deprecation
    return () => mql.removeListener(update);
  }, [effectiveTheme]);

  const themeOption = themeOptions.find((t) => t.value === effectiveTheme);
  const colorMode =
    effectiveTheme === 'system' ? systemColorMode : themeOption?.isDark ? 'dark' : 'light';

  // Filter state (category, status, and negative toggle are local to graph view)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isNegativeFilter, setIsNegativeFilter] = useState(false);

  // Debounce search query for performance with large graphs
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 200);

  // Combined filter state
  const filterState: GraphFilterState = {
    searchQuery: debouncedSearchQuery,
    selectedCategories,
    selectedStatuses,
    isNegativeFilter,
  };

  // Calculate filter results
  const filterResult = useGraphFilter(features, filterState, runningAutoTasks);

  // Transform features to nodes and edges with filter results
  const { nodes: initialNodes, edges: initialEdges } = useGraphNodes({
    features,
    runningAutoTasks,
    filterResult,
    actionCallbacks: nodeActionCallbacks,
    backgroundSettings,
  });

  // Apply layout
  const { layoutedNodes, layoutedEdges, runLayout } = useGraphLayout({
    nodes: initialNodes,
    edges: initialEdges,
  });

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Track if initial layout has been applied
  const hasInitialLayout = useRef(false);
  // Track the previous node IDs to detect new nodes
  const prevNodeIds = useRef<Set<string>>(new Set());

  // Update nodes/edges when features change, but preserve user positions
  useEffect(() => {
    const currentNodeIds = new Set(layoutedNodes.map((n) => n.id));
    const isInitialRender = !hasInitialLayout.current;

    // Check if there are new nodes that need layout
    const hasNewNodes = layoutedNodes.some((n) => !prevNodeIds.current.has(n.id));

    if (isInitialRender) {
      // Apply full layout for initial render
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      hasInitialLayout.current = true;
    } else if (hasNewNodes) {
      // New nodes added - need to re-layout but try to preserve existing positions
      setNodes((currentNodes) => {
        const positionMap = new Map(currentNodes.map((n) => [n.id, n.position]));
        return layoutedNodes.map((node) => ({
          ...node,
          position: positionMap.get(node.id) || node.position,
        }));
      });
      setEdges(layoutedEdges);
    } else {
      // No new nodes - just update data without changing positions
      setNodes((currentNodes) => {
        const positionMap = new Map(currentNodes.map((n) => [n.id, n.position]));
        return layoutedNodes.map((node) => ({
          ...node,
          position: positionMap.get(node.id) || node.position,
        }));
      });
      // Update edges without triggering re-render of nodes
      setEdges(layoutedEdges);
    }

    // Update prev node IDs for next comparison
    prevNodeIds.current = currentNodeIds;
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // Handle layout direction change
  const handleRunLayout = useCallback(
    (direction: 'LR' | 'TB') => {
      setLayoutDirection(direction);
      runLayout(direction);
    },
    [runLayout]
  );

  // Handle clear all filters
  const handleClearFilters = useCallback(() => {
    onSearchQueryChange('');
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setIsNegativeFilter(false);
  }, [onSearchQueryChange]);

  // Handle node double click
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<TaskNodeData>) => {
      onNodeDoubleClick?.(node.id);
    },
    [onNodeDoubleClick]
  );

  // Handle edge connection (creating dependencies)
  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // In React Flow, dragging from source handle to target handle means:
      // - source = the node being dragged FROM (the prerequisite/dependency)
      // - target = the node being dragged TO (the dependent task)
      await onCreateDependency?.(connection.source, connection.target);
    },
    [onCreateDependency]
  );

  // Allow any connection between different nodes
  const isValidConnection = useCallback(
    (connection: Connection | { source: string; target: string }) => {
      // Don't allow self-connections
      if (connection.source === connection.target) return false;
      return true;
    },
    []
  );

  // Get fitView from React Flow for orientation change handling
  const { fitView } = useReactFlow();

  // Handle orientation changes on mobile devices
  // When rotating from landscape to portrait, the view may incorrectly zoom in
  // This effect listens for orientation changes and calls fitView to correct the viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Track the previous orientation to detect changes
    let previousWidth = window.innerWidth;
    let previousHeight = window.innerHeight;

    // Track timeout IDs for cleanup
    let orientationTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let resizeTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleOrientationChange = () => {
      // Clear any pending timeout
      if (orientationTimeoutId) {
        clearTimeout(orientationTimeoutId);
      }
      // Small delay to allow the browser to complete the orientation change
      orientationTimeoutId = setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
        orientationTimeoutId = null;
      }, 100);
    };

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;

      // Detect orientation change by checking if width and height swapped significantly
      // This happens when device rotates between portrait and landscape
      const widthDiff = Math.abs(currentWidth - previousHeight);
      const heightDiff = Math.abs(currentHeight - previousWidth);

      // If the dimensions are close to being swapped (within 100px tolerance)
      // it's likely an orientation change
      const isOrientationChange = widthDiff < 100 && heightDiff < 100;

      if (isOrientationChange) {
        // Clear any pending timeout
        if (resizeTimeoutId) {
          clearTimeout(resizeTimeoutId);
        }
        // Delay fitView to allow browser to complete the layout
        resizeTimeoutId = setTimeout(() => {
          fitView({ padding: 0.2, duration: 300 });
          resizeTimeoutId = null;
        }, 150);
      }

      previousWidth = currentWidth;
      previousHeight = currentHeight;
    };

    // Listen for orientation change event (mobile specific)
    window.addEventListener('orientationchange', handleOrientationChange);
    // Also listen for resize as a fallback (some browsers don't fire orientationchange)
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
      // Clear any pending timeouts
      if (orientationTimeoutId) {
        clearTimeout(orientationTimeoutId);
      }
      if (resizeTimeoutId) {
        clearTimeout(resizeTimeoutId);
      }
    };
  }, [fitView]);

  // MiniMap node color based on status
  const minimapNodeColor = useCallback((node: Node<TaskNodeData>) => {
    const data = node.data as TaskNodeData | undefined;
    const status = data?.status;
    switch (status) {
      case 'completed':
      case 'verified':
        return 'var(--status-success)';
      case 'in_progress':
        return 'var(--status-in-progress)';
      case 'waiting_approval':
        return 'var(--status-waiting)';
      default:
        if (data?.isBlocked) return 'rgb(249, 115, 22)'; // orange-500
        if (data?.error) return 'var(--status-error)';
        return 'var(--muted-foreground)';
    }
  }, []);

  return (
    <div className={cn('w-full h-full', className)} style={backgroundStyle}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isLocked ? undefined : onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={handleNodeDoubleClick}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode={colorMode}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        selectionMode={SelectionMode.Partial}
        connectionMode={ConnectionMode.Loose}
        proOptions={{ hideAttribution: true }}
        className="graph-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--border)"
          className="opacity-50"
        />

        <MiniMap
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="border-border! rounded-lg shadow-lg"
          style={{ backgroundColor: 'color-mix(in oklch, var(--popover) 90%, transparent)' }}
        />

        <GraphControls
          isLocked={isLocked}
          onToggleLock={() => setIsLocked(!isLocked)}
          onRunLayout={handleRunLayout}
          layoutDirection={layoutDirection}
        />

        <GraphFilterControls
          filterState={filterState}
          availableCategories={filterResult.availableCategories}
          hasActiveFilter={filterResult.hasActiveFilter}
          onCategoriesChange={setSelectedCategories}
          onStatusesChange={setSelectedStatuses}
          onNegativeFilterChange={setIsNegativeFilter}
          onClearFilters={handleClearFilters}
        />

        <GraphLegend />

        {/* Add Feature Button */}
        <Panel position="top-right">
          <Button variant="default" size="sm" onClick={onAddFeature} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Feature
          </Button>
        </Panel>

        {/* Empty state when all nodes are filtered out */}
        {filterResult.hasActiveFilter && filterResult.matchedNodeIds.size === 0 && (
          <Panel position="top-center" className="mt-20">
            <div
              className="flex flex-col items-center gap-3 p-6 rounded-lg backdrop-blur-sm border border-border shadow-lg text-popover-foreground"
              style={{ backgroundColor: 'color-mix(in oklch, var(--popover) 95%, transparent)' }}
            >
              <SearchX className="w-10 h-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">No matching tasks</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your filters or search query
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-1">
                Clear Filters
              </Button>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

// Wrap with provider for hooks to work
export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
