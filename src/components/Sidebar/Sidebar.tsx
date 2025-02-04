import { RiDragMove2Fill } from "react-icons/ri";
import { ShapeComponents, ShapeType } from "../shape/types";
import SidebarItem from "./SidebarItem";

function Sidebar(props: { title: "source" | "event" | "output" }) {
  return (
    <div className="sidebar bg-gray-900 p-2 rounded-md">
      <div className="sidebar-label flex flex-row gap-1 justify-center items-center capitalize">
        {props.title}
        <RiDragMove2Fill />
      </div>
      <div className="grid grid-cols-1">
        {Object.keys(ShapeComponents).map((type) => (
          <SidebarItem
            category={props.title}
            type={type as ShapeType}
            key={type}
          />
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
