import json
from ultralytics import YOLO
import cv2
import math
import time
import os
import AVFoundation

# Function to load configuration from yoloConfig.json


def load_config():
    with open('../yoloConfig.json', 'r') as f:
        return json.load(f)

# Function to get webcam index based on device name


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


# Initial load of configuration
config = load_config()
nodes = config['nodes']

# Find the source node and get the webcam information
source_node = next(node for node in nodes if node['category'] == 'source')
webcam_info = source_node['contents']

# Find the event node and get the object to detect
event_node = next(node for node in nodes if node['category'] == 'event')
object_to_detect = event_node['contents'].strip('"')

# Enumerate video devices and find the index of the selected webcam
webcam_index = get_camera_index_by_label(webcam_info)
print(webcam_index)
if webcam_index is None:
    raise Exception("Webcam not found")

# Start webcam
cap = cv2.VideoCapture(webcam_index)
cap.set(3, 640)
cap.set(4, 480)

# Wait for the webcam to initialize
while not cap.isOpened():
    print("Waiting for the webcam to initialize...")
    time.sleep(1)
    cap = cv2.VideoCapture(webcam_index)
    cap.set(3, 640)
    cap.set(4, 480)

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

# Index of the object to detect
object_class_index = classNames.index(object_to_detect)

# Track the last modification time of the config file
last_mod_time = os.path.getmtime('../yoloConfig.json')

while True:
    # Check if the config file has been modified
    current_mod_time = os.path.getmtime('../yoloConfig.json')
    if current_mod_time != last_mod_time:
        last_mod_time = current_mod_time
        config = load_config()
        nodes = config['nodes']

        # Update the source node and webcam information
        source_node = next(
            node for node in nodes if node['category'] == 'source')
        new_webcam_info = source_node['contents']

        # Update the event node and object to detect
        event_node = next(
            node for node in nodes if node['category'] == 'event')
        object_to_detect = event_node['contents'].strip('"')
        object_class_index = classNames.index(object_to_detect)

        # Check if the webcam has changed
        if new_webcam_info != webcam_info:
            print(f"Changing webcam from {webcam_info} to {new_webcam_info}")
            webcam_info = new_webcam_info
            new_webcam_index = get_camera_index_by_label(webcam_info)
            if new_webcam_index is None:
                raise Exception("Webcam not found")

            # Release the current webcam and start the new one
            cap.release()
            cap = cv2.VideoCapture(new_webcam_index)
            cap.set(3, 640)
            cap.set(4, 480)

            # Wait for the new webcam to initialize
            while not cap.isOpened():
                print("Waiting for the new webcam to initialize...")
                time.sleep(1)
                cap = cv2.VideoCapture(new_webcam_index)
                cap.set(3, 640)
                cap.set(4, 480)

    success, img = cap.read()
    if not success:
        print("Failed to capture image")
        continue

    results = model(img, stream=True)

    # Coordinates
    for r in results:
        boxes = r.boxes

        for box in boxes:
            # Class name
            cls = int(box.cls[0])
            if cls == object_class_index:
                # Bounding box
                x1, y1, x2, y2 = box.xyxy[0]
                x1, y1, x2, y2 = int(x1), int(y1), int(
                    x2), int(y2)  # Convert to int values

                # Put box in cam
                cv2.rectangle(img, (x1, y1), (x2, y2), (255, 0, 255), 3)

                # Confidence
                confidence = math.ceil((box.conf[0] * 100)) / 100
                print("Confidence --->", confidence)

                # Object details
                org = [x1, y1]
                font = cv2.FONT_HERSHEY_SIMPLEX
                fontScale = 1
                color = (255, 0, 0)
                thickness = 2

                cv2.putText(img, classNames[cls], org,
                            font, fontScale, color, thickness)

    cv2.imshow('Webcam', img)
    if cv2.waitKey(1) == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
