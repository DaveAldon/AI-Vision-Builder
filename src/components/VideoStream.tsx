import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const VideoStream = () => {
  const [frame, setFrame] = useState("");

  useEffect(() => {
    const socket = io("http://localhost:3009"); // Specify the server URL

    socket.on("frame", (frameData) => {
      let byteArray = new Uint8Array(frameData);
      let binaryData = "";
      for (let i = 0; i < byteArray.length; i++) {
        binaryData += String.fromCharCode(byteArray[i]);
      }
      setFrame(btoa(binaryData)); // Update frame data
    });

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="w-64 absolute bottom-48 right-6 rounded-md overflow-hidden">
      {frame ? (
        <img
          id="video-frame"
          src={`data:image/jpeg;base64,${frame}`}
          alt="YOLO Stream"
          style={{ width: "100%" }}
        />
      ) : (
        <p>Loading webcam feed...</p>
      )}
    </div>
  );
};

export default VideoStream;
