import {
  NodeResizer,
  useStore,
  Handle,
  Position,
  useKeyPress,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import TextareaAutosize from "react-textarea-autosize";

import Shape from "../shape";
import { type ShapeType } from "../shape/types";
import NodeLabel from "./label";
import ShapeNodeToolbar from "../Toolbar/Toolbar";
import { useEffect, useState } from "react";
import useUndoRedo from "@/hooks/useUndoRedo";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconName, fas } from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";

// from https://g33ktricks.blogspot.com/p/the-rtsp-real-time-streaming-protocol.html
const rtspSources: object[] = [
  { title: "Beach", link: "http://67.53.46.161:65123/mjpg/video.mjpg" },
  {
    title: "Kaiskuru Skistadion Alta",
    link: "http://77.222.181.11:8080/mjpg/video.mjpg",
  },
  {
    title: "Mchcares",
    link: "http://webcam.mchcares.com/mjpg/video.mjpg?timestamp=1566232173730",
  },
  {
    title: "Honjin",
    link: "http://honjin1.miemasu.net/nphMotionJpeg?Resolution=640x480&Quality=Standard",
  },
  {
    title: "Soltorget Pajala, Sweden",
    link: "http://195.196.36.242/mjpg/video.mjpg",
  },
  {
    title: "Tokyo",
    link: "http://61.211.241.239/nphMotionJpeg?Resolution=320x240&Quality=Standard",
  },
  {
    title: "Warehouse",
    link: "http://camera.buffalotrace.com/mjpg/video.mjpg",
  },
  {
    title: "OR Beach",
    link: "http://47.51.131.147/-wvhttp-01-/GetOneShot?image_size=1280x720&frame_count=1000000000",
  },
];

const techOfficeObjects: string[] = [
  "None",
  "person",
  "bicycle",
  "car",
  "motorbike",
  "aeroplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "bottle",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "sofa",
  "pottedplant",
  "bed",
  "diningtable",
  "toilet",
  "tvmonitor",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
];

const outputs: string[] = ["None", "Graph", "Video"];

library.add(fas);

export type ShapeNodeData = {
  type: ShapeType;
  color: string;
};

// this will return the current dimensions of the node (measured internally by react flow)
const useNodeData = (id: string) => {
  const node = useStore((state) => state.nodeLookup.get(id));
  return {
    width: node?.measured?.width || 0,
    height: node?.measured?.height || 0,
    category: (node as any).category,
  };
};

const ShapeNode = ({ id, selected, data }: any) => {
  const { color, type }: { color: string; type: ShapeType } = data as any;
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const { takeSnapshot } = useUndoRedo();
  const { width, height, category } = useNodeData(id);
  const shiftKeyPressed = useKeyPress("Shift");
  const handleStyle = { backgroundColor: color };
  const [webcams, setWebcams] = useState<MediaDeviceInfo[]>([]);
  const [selectedValue, setSelectedValue] = useState<string | undefined>();

  useEffect(() => {
    // Request permission to access the webcam
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => {
        // Once permission is granted, enumerate the devices
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          const videoDevices = devices.filter(
            (device) => device.kind === "videoinput"
          );
          setWebcams(videoDevices);
        });
      })
      .catch((err) => {
        console.error("Error accessing webcam: ", err);
      });
  }, []);

  useEffect(() => {
    if (data.icon) {
      onIconChange(data.icon);
    }
  }, []);

  const onColorChange = (color: string) => {
    takeSnapshot();
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              color,
            },
          };
        }

        return node;
      })
    );
  };

  const onShapeChange = (shape: ShapeType) => {
    takeSnapshot();
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              type: shape,
            },
          };
        }

        return node;
      })
    );
  };

  const onResize = () => {
    updateNodeInternals(id);
  };

  const onTitleChange = (title: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              title,
            },
          };
        }

        return node;
      })
    );
  };

  const onDescriptionChange = (description: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              description,
            },
          };
        }

        return node;
      })
    );
  };

  const onContentsChange = (contents: any) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              contents,
            },
          };
        }

        return node;
      })
    );
  };

  const onIconChange = (icon: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              icon,
            },
          };
        }

        return node;
      })
    );
  };

  const onDeleteNode = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);

  return (
    <>
      {/*  <ShapeNodeToolbar
        onColorChange={onColorChange}
        onShapeChange={onShapeChange}
        activeShape={type}
        activeColor={color}
        onDeleteNode={onDeleteNode}
        onIconChange={onIconChange}
      /> */}
      <NodeResizer
        color={color}
        keepAspectRatio={shiftKeyPressed}
        isVisible={selected}
        onResize={onResize}
        onResizeStart={takeSnapshot}
      />
      <div style={{ position: "relative" }}>
        <input
          className={`absolute bottom-full p-2 text-center w-full text-sm font-bold  ${
            data.title === undefined || data.title === ""
              ? "bg-transparent"
              : "bg-white bg-opacity-10 backdrop-blur-sm rounded-md dark:bg-black"
          }`}
          //placeholder={data.type}
          value={data.title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <Shape
          type={type}
          width={width}
          height={height}
          fill={color}
          strokeWidth={1}
          stroke={color}
          fillOpacity={0.2}
        />
        <TextareaAutosize
          className={`absolute resize-none top-full p-2 text-left w-full text-xs  ${
            data.description === undefined || data.description === ""
              ? "bg-transparent"
              : "bg-white dark:bg-black bg-opacity-10 backdrop-blur-sm rounded-md"
          }`}
          //placeholder={data.type}
          value={selectedValue}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
      <Handle
        style={{ ...handleStyle, left: "23%" }}
        id="top-left"
        type="source"
        position={Position.Top}
      />
      <Handle
        style={handleStyle}
        id="top"
        type="source"
        position={Position.Top}
      />
      <Handle
        style={{ ...handleStyle, left: "auto", right: "20%" }}
        id="top-right"
        type="source"
        position={Position.Top}
      />
      <Handle
        style={{ ...handleStyle, top: "23%" }}
        id="right-top"
        type="source"
        position={Position.Right}
      />
      <Handle
        style={handleStyle}
        id="right"
        type="source"
        position={Position.Right}
      />
      <Handle
        style={{ ...handleStyle, top: "auto", bottom: "20%" }}
        id="right-bottom"
        type="source"
        position={Position.Right}
      />
      <Handle
        style={{ ...handleStyle, left: "23%" }}
        id="bottom-left"
        type="source"
        position={Position.Bottom}
      />
      <Handle
        style={handleStyle}
        id="bottom"
        type="source"
        position={Position.Bottom}
      />
      <Handle
        style={{ ...handleStyle, left: "auto", right: "20%" }}
        id="bottom-right"
        type="source"
        position={Position.Bottom}
      />
      <Handle
        style={{ ...handleStyle, top: "23%" }}
        id="left-top"
        type="source"
        position={Position.Left}
      />
      <Handle
        style={handleStyle}
        id="left"
        type="source"
        position={Position.Left}
      />
      <Handle
        style={{ ...handleStyle, top: "auto", bottom: "20%" }}
        id="left-bottom"
        type="source"
        position={Position.Left}
      />
      {category === "source" ? (
        <select
          className="node-label resize-none p-2 text-center text-sm w-24"
          onChange={(e) => {
            const isHttpLink =
              e.target.value.startsWith("http://") ||
              e.target.value.startsWith("https://");

            if (isHttpLink) {
              setSelectedValue(e.target.value);
              onContentsChange(e.target.value);
            } else {
              const selectedWebcam = webcams.find(
                (webcam) => webcam.deviceId === e.target.value
              );
              const label = isHttpLink
                ? selectedWebcam?.label
                : selectedWebcam?.label.split(" (")[0];
              setSelectedValue(label);
              onContentsChange(label);
            }
          }}
        >
          <option key={"None"} value={"None"}>
            {"None"}
          </option>
          {rtspSources.map((source: any) => (
            <option key={source.link} value={source.link}>
              {`${source.title}`}
            </option>
          ))}
          {webcams.map((webcam) => (
            <option key={webcam.deviceId} value={webcam.deviceId}>
              {webcam.label || `Camera ${webcam.deviceId}`}
            </option>
          ))}
        </select>
      ) : null}
      {category === "event" ? (
        <select
          className="node-label resize-none p-2 text-center text-sm"
          onChange={(e) => {
            setSelectedValue(e.target.value);
            onContentsChange(e.target.value);
          }}
        >
          {techOfficeObjects.map((object) => (
            <option key={object} value={object}>
              {`${object}`}
            </option>
          ))}
        </select>
      ) : null}
      {category === "output" ? (
        <select
          className="node-label resize-none p-2 text-center text-sm"
          onChange={(e) => {
            setSelectedValue(e.target.value);
            onContentsChange(e.target.value);
          }}
        >
          {outputs.map((output) => (
            <option key={output} value={output}>
              {`${output}`}
            </option>
          ))}
        </select>
      ) : null}
      {/* {data.icon ? null : (
        <NodeLabel
          placeholder={data.type}
          data={data.contents}
          onContentsChange={onContentsChange}
        />
      )}
      {data.icon ? (
        <FontAwesomeIcon
          className="h-[50%] w-[50%] node-label"
          icon={["fas", data.icon as IconName]}
          color={color}
        />
      ) : null} */}
    </>
  );
};

export default ShapeNode;
