import { useHelperLines } from "@/hooks/useHelperLines";
import {
  Edge,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesDelete,
  OnNodeDrag,
  OnNodesDelete,
  SelectionDragHandler,
  addEdge,
  useReactFlow as useReactFlowHook,
  useStore,
} from "@xyflow/react";
import {
  DragEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import useUndoRedo from "./useUndoRedo";
import { useAppStore } from "@/components/store";
import { DEFAULT_ALGORITHM } from "@/components/edges/EditableEdge/constants";
import { ControlPointData } from "@/components/edges/EditableEdge";
import { MarkerDefinition } from "@/components/edges/MarkerDefinition";
import { debounce } from "lodash";

export const useDiagram = () => {
  const useReactFlow = useReactFlowHook;
  const {
    screenToFlowPosition,
    setNodes,
    setEdges,
    getEdges,
    getEdge,
    getNodes,
  } = useReactFlow();
  const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo();
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const connectingNodeId = useRef(null);
  const {
    HelperLines,
    handleHelperLines,
    helperLineHorizontal,
    helperLineVertical,
  } = useHelperLines();
  const onDragOver: DragEventHandler<HTMLDivElement> = (evt) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "move";
  };
  const [selectedNodeId, setSelectedNodeId] = useState<string>();

  const selectAllNodes = () => {
    setNodes((nodes) => nodes.map((node) => ({ ...node, selected: true })));
    setEdges((edges) => edges.map((edge) => ({ ...edge, selected: true })));
    /* setEdges((edges) =>
      edges.map((edge) => {
        //if (!isEditableEdge(edge)) return edge;

        const points = (edge.data?.points as ControlPointData[]) ?? [];
        const updatedPoints = points.map((point) => ({
          ...point,
          selected: true,
        }));
        const updatedData = { ...edge.data, points: updatedPoints };

        return { ...edge, data: updatedData };
      })
    ); */
  };

  const deselectAll = () => {
    setNodes((nodes) => nodes.map((node) => ({ ...node, selected: false })));
    setEdges((edges) => edges.map((edge) => ({ ...edge, selected: false })));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === "a") {
        event.preventDefault();
        selectAllNodes();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /*   useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (selectedNodeId) {
      const selectedNode = getNode(selectedNodeId);
      if (selectedNode) {
        timeoutId = setTimeout(() => {
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === selectedNodeId ? { ...node, selected: true } : node
            )
          );
        }, 0);
      }
    }

    // Clean up the timeout when the component unmounts or when selectedNodeId changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [getNode, selectedNodeId, setNodes]); */

  const uploadJson = (jsonString: string) => {
    const diagramData = JSON.parse(jsonString);
    if (diagramData.nodes && diagramData.edges) {
      setNodes(diagramData.nodes);
      setEdges(diagramData.edges);
    } else {
      console.error(
        'Invalid JSON format. Expected an object with "nodes" and "edges" arrays.'
      );
    }
  };

  // this function is called when a node from the sidebar is dropped onto the react flow pane
  const onDrop: DragEventHandler<HTMLDivElement> = (evt) => {
    takeSnapshot();
    evt.preventDefault();
    const type = evt.dataTransfer.getData("application/reactflow");
    const category = evt.dataTransfer.getData("application/reactflowCategory");

    // this will convert the pixel position of the node to the react flow coordinate system
    // so that a node is added at the correct position even when viewport is translated and/or zoomed in
    const position = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
    const color =
      category === "source"
        ? "#438D57"
        : category === "event"
        ? "#3F8AE2"
        : "#EBC347";
    const newNode = {
      id: Date.now().toString(),
      type: "shape",
      category,
      position,
      style: { width: 100, height: 100 },
      data: {
        type,
        color,
      },
      selected: true,
    };

    setNodes((nodes) =>
      nodes.map((n) => ({ ...n, selected: false })).concat([newNode])
    );
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const debouncedFunction = debounce(() => {
        handleHelperLines(changes, getNodes());
      }, 1); // 100ms delay

      debouncedFunction();
    },
    [getNodes, handleHelperLines]
  );

  // Inefficient method of dragging nodes
  /*   const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const debouncedFunction = debounce(() => {
        setNodes((nodes) =>
          applyNodeChanges(handleHelperLines(changes, nodes), nodes)
        );
      }, 1); // 100ms delay

      debouncedFunction();
    },
    [setNodes, handleHelperLines]
  ); */

  const onConnect: OnConnect = useCallback(
    (connection) => {
      console.log("onConnect", connection);
      takeSnapshot();
      const { connectionLinePath } = useAppStore.getState();
      const edge = {
        ...connection,
        id: `${Date.now()}-${connection.source}-${connection.target}`,
        type: "editable-edge",
        selected: true,
        animated: true,
        data: {
          algorithm: DEFAULT_ALGORITHM,
          points: connectionLinePath.map(
            (point, i) =>
              ({
                ...point,
                id: window.crypto.randomUUID(),
                prev: i === 0 ? undefined : connectionLinePath[i - 1],
                active: true,
              } as ControlPointData)
          ),
        },
      };
      setEdges((edges) => addEdge({ ...edge, type: "editable-edge" }, edges));
    },
    [setEdges, takeSnapshot]
  );

  const onConnectStart = useCallback((_: any, { nodeId }: any) => {
    connectingNodeId.current = nodeId;
  }, []);

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!connectingNodeId.current) return;
      takeSnapshot();
      event.preventDefault();
      const targetIsPane = (event.target as Element)?.classList.contains(
        "react-flow__pane"
      );

      const targetIsHandle = (event.target as Element)?.classList.contains(
        "react-flow__handle"
      );
      if (targetIsPane && !targetIsHandle) {
        const position = screenToFlowPosition({
          x: "clientX" in event ? event.clientX : event.touches[0].clientX,
          y: "clientY" in event ? event.clientY : event.touches[0].clientY,
        });

        const newNode = {
          id: Date.now().toString(),
          type: "shape",
          position,
          style: { width: 100, height: 100 },
          data: {
            type: "rectangle",
            color: "#3F8AE2",
          },
          selected: true,
        };

        setNodes((nodes) =>
          nodes.map((n) => ({ ...n, selected: false })).concat([{ ...newNode }])
        );

        /* const newEdge = {
          id: `${connectingNodeId.current}-${newNode.id}`,
          source: connectingNodeId.current,
          target: newNode.id,
          animated: true,
        }; */
        const { connectionLinePath } = useAppStore.getState();

        const edge = {
          id: `${Date.now()}-${connectingNodeId.current}-${newNode.id}`,
          source: connectingNodeId.current,
          target: newNode.id,
          type: "editable-edge",
          selected: false,
          data: {
            algorithm: DEFAULT_ALGORITHM,
            points: connectionLinePath.map(
              (point, i) =>
                ({
                  ...point,
                  id: window.crypto.randomUUID(),
                  prev: i === 0 ? undefined : connectionLinePath[i - 1],
                  active: true,
                } as ControlPointData)
            ),
          },
        };
        setEdges((edges) => addEdge({ ...edge, type: "editable-edge" }, edges));
        setSelectedNodeId(newNode.id);
      }
    },
    [screenToFlowPosition, setEdges, setNodes, takeSnapshot]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent>, edge: Edge) => {
      setEditingEdgeId(edge.id);
    },
    []
  );

  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onSelectionDragStart: SelectionDragHandler = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onNodesDelete: OnNodesDelete = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onEdgesDelete: OnEdgesDelete = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(undefined);
    setEditingEdgeId(null);
  }, []);

  const onNodeClick = useCallback((_event: any) => {
    setEditingEdgeId(null);
  }, []);

  const Markers = () => {
    return getEdges().map((edge, index) => {
      return (
        <MarkerDefinition
          key={index}
          id={`marker-${edge.id}`}
          color={`${edge.style?.stroke || "#a5a4a5"}`}
        />
      );
    });
  };

  return {
    onDragOver,
    onDrop,
    onNodesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    selectedNodeId,
    setSelectedNodeId,
    HelperLines,
    helperLineHorizontal,
    helperLineVertical,
    onNodeDragStart,
    onSelectionDragStart,
    onNodesDelete,
    onEdgesDelete,
    undo,
    redo,
    canRedo,
    canUndo,
    onEdgeClick,
    editingEdgeId,
    setEditingEdgeId,
    onPaneClick,
    onNodeClick,
    useReactFlow,
    Markers,
    getEdge,
    setEdges,
    useStore,
    deselectAll,
    uploadJson,
  };
};
