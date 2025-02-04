import {
  Background,
  ConnectionLineType,
  ConnectionMode,
  ControlButton,
  Controls,
  DefaultEdgeOptions,
  MiniMap,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  Panel,
  EdgeTypes,
  EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./nodeStyles.css";
import ShapeNode from "./shape-node";
import Sidebar from "./Sidebar/Sidebar";
import MiniMapNode from "./minimap-node";
import { useDiagram } from "@/hooks/useDiagram";
import { CornerUpLeft, CornerUpRight } from "react-feather";
import useUndoRedo from "@/hooks/useUndoRedo";
import {
  PanelGroup,
  PanelResizeHandle,
  Panel as ResizablePanel,
} from "react-resizable-panels";
const JsonViewer = dynamic(() => import("./JsonViewer/JsonViewer"), {
  ssr: false,
});
import { useCallback, useRef, useState } from "react";
import { useWindowSize } from "@/hooks/useWindowSize";
import dynamic from "next/dynamic";
import { EditableEdge } from "./edges/EditableEdge";
import EdgeToolbar from "./EdgeToolbar/EdgeToolbar";
import { ConnectionLine } from "./edges/ConnectionLine";
import savedDiagramJson from "../json-diagrams/default.json";
import { About } from "./About";
import { useTheme } from "@/hooks/useTheme";
import { Menu } from "./Menu";
import VideoStream from "./VideoStream";
import DataChart from "./Chart";

const nodeTypes: NodeTypes = {
  shape: ShapeNode,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "editable-edge",
  style: { strokeWidth: 2 },
};

const Flow = () => {
  const diagram = useDiagram();
  const { getSnapshotJson, takeSnapshot } = useUndoRedo();
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(false);
  const [width] = useWindowSize();
  const themeHook = useTheme();

  const getDefaultSize = (w: number) => {
    if (w < 1024) {
      return 33;
    } else return 20;
  };

  const getParsedJson = () => {
    return parseJson(getSnapshotJson());
  };

  const parsedJson = JSON.parse(getParsedJson());
  const showDataChart = parsedJson.nodes.some(
    (node: any) =>
      node.category === "output" &&
      node.contents &&
      node.contents.includes("Graph")
  );
  const showVideoStream = parsedJson.nodes.some(
    (node: any) =>
      node.category === "output" &&
      node.contents &&
      node.contents.includes("Video")
  );

  const toggleRightSidebar = () => {
    setIsRightSidebarOpen(!isRightSidebarOpen);
  };

  const toggleLeftSidebar = () => {
    setIsLeftSidebarOpen(!isLeftSidebarOpen);
  };

  const EditableEdgeWrapper = useCallback(
    (props: EdgeProps) => {
      return <EditableEdge {...props} useDiagram={diagram} />;
    },
    [diagram]
  );
  const edgeTypes: EdgeTypes = {
    "editable-edge": EditableEdgeWrapper,
  };

  return (
    <div className="w-full h-full">
      <PanelGroup direction="horizontal">
        {isLeftSidebarOpen ? (
          <ResizablePanel
            order={1}
            className="bg-white dark:bg-black"
            defaultSize={getDefaultSize(width)}
            minSize={getDefaultSize(width)}
          >
            <About onClick={toggleLeftSidebar} />
          </ResizablePanel>
        ) : null}
        <PanelResizeHandle
          className={`w-1 cursor-col-resize ${
            isLeftSidebarOpen === true
              ? "bg-stone-600 visible"
              : "bg-transparent hidden"
          }`}
        />
        <ResizablePanel order={2}>
          <PanelGroup direction="horizontal">
            <ResizablePanel minSize={30} order={1}>
              <ReactFlow
                className={themeHook.theme || "light"}
                onConnect={diagram.onConnect}
                onConnectStart={diagram.onConnectStart}
                connectionLineComponent={ConnectionLine}
                proOptions={{ hideAttribution: true }}
                onPaneClick={diagram.onPaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultNodes={savedDiagramJson.nodes}
                defaultEdges={savedDiagramJson.edges}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineType={ConnectionLineType.SmoothStep}
                //fitView
                connectionMode={ConnectionMode.Loose}
                panOnScroll={true}
                onDrop={diagram.onDrop}
                snapToGrid={false}
                snapGrid={[10, 10]}
                onDragOver={diagram.onDragOver}
                zoomOnDoubleClick={false}
                onNodesChange={diagram.onNodesChange}
                onNodeDragStart={diagram.onNodeDragStart}
                onSelectionDragStart={diagram.onSelectionDragStart}
                onNodesDelete={diagram.onNodesDelete}
                onNodeClick={diagram.onNodeClick}
                onEdgesDelete={diagram.onEdgesDelete}
                onEdgeClick={diagram.onEdgeClick}
                elevateEdgesOnSelect
                elevateNodesOnSelect
                maxZoom={10}
                minZoom={0.1}
                multiSelectionKeyCode={["Meta", "Control"]}
              >
                <Background
                  color="grey"
                  bgColor={themeHook.theme === "dark" ? "black" : "white"}
                />
                <Panel position="top-left" className="bg-transparent">
                  <div className="flex flex-row gap-2">
                    <Sidebar title={"source"} />
                    <Sidebar title={"event"} />
                    <Sidebar title={"output"} />
                  </div>
                </Panel>
                {diagram.editingEdgeId ? (
                  <Panel position="top-center">
                    <EdgeToolbar
                      takeSnapshot={takeSnapshot}
                      useDiagram={diagram}
                    />
                  </Panel>
                ) : null}
                <Panel position="top-right">
                  <Menu
                    themeHook={themeHook}
                    diagram={diagram}
                    isRightSidebarOpen={isRightSidebarOpen}
                    toggleRightSidebar={toggleRightSidebar}
                    toggleLeftSidebar={toggleLeftSidebar}
                    onSave={() => {
                      const yoloConfig = getParsedJson();
                      saveConfigToFile(yoloConfig);
                    }}
                  />
                </Panel>
                <Controls className="" showInteractive={false}>
                  <ControlButton onClick={() => diagram.undo()} title="Undo">
                    <CornerUpLeft fillOpacity={0} />
                  </ControlButton>
                  <ControlButton onClick={() => diagram.redo()} title="Redo">
                    <CornerUpRight fillOpacity={0} />
                  </ControlButton>
                </Controls>
                {showDataChart && <DataChart />}
                {showVideoStream && <VideoStream />}
                {/* <MiniMap
                  zoomable
                  pannable
                  draggable
                  nodeComponent={MiniMapNode}
                /> */}
                <diagram.HelperLines
                  horizontal={diagram.helperLineHorizontal}
                  vertical={diagram.helperLineVertical}
                />
                <diagram.Markers />
              </ReactFlow>
            </ResizablePanel>
            <PanelResizeHandle
              className={`w-1 cursor-col-resize ${
                isRightSidebarOpen === true
                  ? "bg-stone-600 visible"
                  : "bg-transparent hidden"
              }`}
            />
            {isRightSidebarOpen ? (
              <ResizablePanel
                order={2}
                defaultSize={getDefaultSize(width)}
                minSize={getDefaultSize(width)}
              >
                <JsonViewer
                  jsonString={getParsedJson()}
                  toggleRightSidebar={toggleRightSidebar}
                />
              </ResizablePanel>
            ) : null}
          </PanelGroup>
        </ResizablePanel>
      </PanelGroup>
    </div>
  );
};

function parseJson(input: any) {
  const inputJson = JSON.parse(input);
  const nodes = inputJson.nodes;
  const edges = inputJson.edges;
  if (!nodes || !edges) return JSON.stringify({ nodes: [] });
  const connectedNodeIds = new Set();
  edges.forEach((edge: any) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const simplifiedNodes = nodes
    .filter((node: any) => connectedNodeIds.has(node.id))
    .map((node: any) => {
      const {
        id,
        category,
        data: { contents },
      } = node;
      return {
        id,
        category,
        contents: category === "source" ? contents : JSON.stringify(contents),
      };
    });
  return JSON.stringify({ nodes: simplifiedNodes });
}

const DiagramFrame = () => {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
};

const saveConfigToFile = async (config: string) => {
  const response = await fetch("/api/saveConfig", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ config }),
  });

  if (response.ok) {
    console.log("Config saved successfully");
  } else {
    console.error("Failed to save config");
  }
};

export default DiagramFrame;
