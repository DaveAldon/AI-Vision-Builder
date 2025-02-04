"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartContainer } from "./ui/chart";
import { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3009");

export default function DataChart() {
  const [graphData, setGraphData] = useState<any[]>([]);

  useEffect(() => {
    socket.on("graph_data", (data) => {
      setGraphData((prevData) => {
        const newData = [...prevData, ...data];
        if (newData.length > 100) {
          return newData.slice(newData.length - 100);
        }
        return newData;
      });
    });

    return () => {
      socket.off("graph_data");
    };
  }, []);

  // Group data by category
  const groupedData = graphData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="p-0 gap-4 flex flex-col w-64 bg-sidebar rounded-md absolute right-6 bottom-6">
      <ChartContainer
        config={{
          score: {
            label: "Score",
            color: "hsl(var(--chart-1))",
          },
        }}
        className="h-[150px]"
      >
        <LineChart
          className="bg-gray-100 dark:bg-gray-900 rounded-md p-2"
          width={600}
          height={300}
          data={graphData}
          margin={{
            top: 24,
            left: -30,
            right: 10,
          }}
        >
          <YAxis />
          <Tooltip />
          {Object.keys(groupedData).map((category) => (
            <Line
              key={category}
              type="linear"
              dataKey="count"
              data={groupedData[category]}
              name={category}
              stroke={groupedData[category][0].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
