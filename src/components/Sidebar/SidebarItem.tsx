import { type DragEvent, useRef } from "react";
import Shape from "../shape";
import { type ShapeType } from "../shape/types";

type SidebarItemProps = {
  type: ShapeType;
  category: "source" | "event" | "output";
};

function SidebarItem({ type, category }: SidebarItemProps) {
  const dragImageRef = useRef<HTMLDivElement>(null);

  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer?.setData("application/reactflow", type);
    event.dataTransfer?.setData("application/reactflowCategory", category);

    if (dragImageRef.current) {
      event.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
    }
  };

  return (
    <div
      className="sidebar-item flex justify-center"
      draggable
      onDragStart={onDragStart}
    >
      <Shape
        type={type}
        fill="transparent"
        strokeWidth={1}
        width={28}
        height={28}
      />
      <div className="sidebar-item-drag-image" ref={dragImageRef}>
        <Shape
          type={type}
          width={80}
          height={80}
          fill="#3F8AE2"
          fillOpacity={0.7}
          stroke="#3F8AE2"
          strokeWidth={2}
        />
      </div>
    </div>
  );
}

export default SidebarItem;
