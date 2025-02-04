from ultralytics import YOLO
import zipfile
import os

# Load the YOLO model
model = YOLO("yolo-Weights/yolov8n.pt")
# Train the model
model.train(data='data.yaml', epochs=50)
# Save the trained model
model.save("yolo-Weights/yolov8n-trained.pt")