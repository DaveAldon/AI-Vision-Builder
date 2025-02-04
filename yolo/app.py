from flask import Flask, render_template
from flask_socketio import SocketIO
from flask_cors import CORS
from datetime import datetime
import cv2
import json
import math
import time
import os
import AVFoundation
from ultralytics import YOLO
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
socketio = SocketIO(app, cors_allowed_origins="*")  # Allow all origins


@app.route('/')
def index():
    return render_template('index.html')


def load_config():
    with open('../yoloConfig.json', 'r') as f:
        return json.load(f)


def get_camera_labels():
    devices = AVFoundation.AVCaptureDevice.devicesWithMediaType_(
        AVFoundation.AVMediaTypeVideo)
    camera_labels = {}
    for idx, device in enumerate(devices):
        camera_labels[device.localizedName()] = idx
    return camera_labels


def get_camera_index_by_label(label):
    camera_labels = get_camera_labels()
    for name, index in camera_labels.items():
        if label in name:
            return index
    return None


def video_stream():
    config = load_config()
    nodes = config['nodes']
    source_nodes = [node for node in nodes if node['category'] == 'source']
    webcams_info = [node['contents']
                    for node in source_nodes if 'contents' in node]

    # Initialize multiple capture objects
    caps = []
    for webcam_info in webcams_info:
        if re.match(r'^http?://', webcam_info):
            # If it's an HTTP link, use it directly
            cap = cv2.VideoCapture(webcam_info)
        else:
            # Otherwise, treat it as a webcam label
            webcam_index = get_camera_index_by_label(webcam_info)
            if webcam_index is None:
                raise Exception(f"Webcam '{webcam_info}' not found")
            cap = cv2.VideoCapture(webcam_index)
            cap.set(3, 640)
            cap.set(4, 480)
        caps.append(cap)

    # Model
    model = YOLO("yolo-Weights/yolov8n.pt")

    # Object classes
    classNames = ["person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck", "boat",
                  "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
                  "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella",
                  "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite", "baseball bat",
                  "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
                  "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli",
                  "carrot", "hot dog", "pizza", "donut", "cake", "chair", "sofa", "pottedplant", "bed",
                  "diningtable", "toilet", "tvmonitor", "laptop", "mouse", "remote", "keyboard", "cell phone",
                  "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors",
                  "teddy bear", "hair drier", "toothbrush"]

    # Define colors and assign one per category
    colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300",
              "#387908", "#ff0000", "#00ff00", "#0000ff"]
    category_colors = {classNames[i]: colors[i %
                                             len(colors)] for i in range(len(classNames))}

    while True:
        # Check for new sources in the config file
        new_config = load_config()
        new_nodes = new_config['nodes']
        new_source_nodes = [
            node for node in new_nodes if node['category'] == 'source']
        new_webcams_info = [node['contents']
                            for node in new_source_nodes if 'contents' in node]

        # Add new sources to the capture objects
        for webcam_info in new_webcams_info:
            if webcam_info not in webcams_info:
                webcams_info.append(webcam_info)
                if re.match(r'^http?://', webcam_info):
                    cap = cv2.VideoCapture(webcam_info)
                else:
                    webcam_index = get_camera_index_by_label(webcam_info)
                    if webcam_index is None:
                        raise Exception(f"Webcam '{webcam_info}' not found")
                    cap = cv2.VideoCapture(webcam_index)
                    cap.set(3, 640)
                    cap.set(4, 480)
                caps.append(cap)

        # Remove sources that are no longer in the config
        for i, webcam_info in enumerate(webcams_info):
            if webcam_info not in new_webcams_info:
                caps[i].release()
                del caps[i]
                webcams_info.remove(webcam_info)

        frames = []
        for cap in caps:
            success, img = cap.read()
            if not success:
                print("Failed to capture image")
                continue
            img = cv2.resize(img, (640, 480))  # Resize to a consistent size
            frames.append(img)

        # Combine frames into a grid (e.g., 2x2 for four cameras)
        if len(frames) == 4:  # Example grid arrangement
            top_row = cv2.hconcat([frames[0], frames[1]])
            bottom_row = cv2.hconcat([frames[2], frames[3]])
            combined_frame = cv2.vconcat([top_row, bottom_row])
        elif len(frames) == 2:
            combined_frame = cv2.hconcat(frames)
        else:
            combined_frame = frames[0] if frames else None

        if combined_frame is None:
            continue

        results = model(combined_frame, stream=True)
        object_counts = {className: 0 for className in classNames}

        # Coordinates and detections
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls = int(box.cls[0])
                class_name = classNames[cls]
                object_counts[class_name] += 1

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(combined_frame, (x1, y1),
                              (x2, y2), (255, 0, 255), 3)
                cv2.putText(combined_frame, class_name, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

        # Prepare graph data
        graph_data = [{"category": category, "count": count, "color": category_colors[category]}
                      for category, count in object_counts.items() if count > 0]

        # Emit the frame and graph data
        _, encoded_frame = cv2.imencode('.jpg', combined_frame)
        frame_data = encoded_frame.tobytes()
        socketio.emit('frame', frame_data)
        socketio.emit('graph_data', graph_data)

        time.sleep(0.1)  # Check for new sources every 0.5 seconds

    # Release all cameras
    for cap in caps:
        cap.release()
    cv2.destroyAllWindows()


socketio.start_background_task(video_stream)
socketio.run(app, port=3009, allow_unsafe_werkzeug=True)


socketio.start_background_task(video_stream)
socketio.run(app, port=3009, allow_unsafe_werkzeug=True)
