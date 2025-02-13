'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as faceapi from 'face-api.js';

export default function FaceDetection() {
  const webcamRef = useRef<Webcam | null>(null);
  const [uploadResultMessage, setUploadResultMessage] = useState('Please look at the camera');
  const [isAuth, setAuth] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [isTimeout, setTimeoutStatus] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load models once
    const loadModels = async () => {
      await faceapi.tf.setBackend('webgl'); // WebGL for better performance
      await faceapi.tf.ready(); // Ensure TensorFlow is ready

      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/face-api/models');
        console.log('Face API models loaded successfully');
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();
  }, []);

  const captureAndSendImage = useCallback(async () => {
    if (!webcamRef.current || isTimeout) return;

    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert image to Blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const faceDetected = await detectFaceLocally(blob);
      if (faceDetected) {
        console.log('Face detected');
        
        const visitorImageName = uuidv4();

        try {
          // Upload to S3
          await fetch(`https://iti80r2th2.execute-api.us-east-1.amazonaws.com/dev/fixhr-visitor-images/${visitorImageName}.jpg`, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            body: blob,
          });

          // Authenticate user
          const response = await authenticate(visitorImageName);
          if (response?.Message === 'Success') {
            try {
              const { data: employeeData } = await axios.get(`https://web.fixhr.app/api/face-detection/employee/${response.FaceId}`);

              if (employeeData.status) {
                setAuth(true);
                setEmployee(employeeData.data);
                setUploadResultMessage(employeeData.data.attendance_marked 
                  ? `Hi ${employeeData.data.name}, welcome to work!`
                  : `Attendance has already been marked.`
                );
              } else {
                setUploadResultMessage('Employee not found.');
                setAuth(false);
              }
            } catch (error) {
              console.error('Error calling Laravel API:', error);
            }
          } else {
            setUploadResultMessage('Authentication failed.');
            setAuth(false);
          }
        } catch (error) {
          console.error('Error uploading or authenticating:', error);
        }
      } else {
        setUploadResultMessage('No face detected. Please adjust your position.');
      }
    }, 'image/jpeg');
  }, [isTimeout]);

  const detectFaceLocally = async (imageBlob: Blob) => {
    const image = await blobToImage(imageBlob);
    const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions({
      inputSize: 128, // Faster than 160
      scoreThreshold: 0.5,
    }));

    return detections.length > 0;
  };

  async function authenticate(visitorImageName: string) {
    try {
      const response = await fetch(`https://iti80r2th2.execute-api.us-east-1.amazonaws.com/dev/employee?objectKey=${visitorImageName}.jpg`, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }

  const blobToImage = (blob: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (!isAuth) {
        captureAndSendImage();
      }
    }, 5000); // Capture image every 5 seconds

    setIntervalId(id);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuth, captureAndSendImage]);

  useEffect(() => {
    if (isAuth && intervalId) {
      clearInterval(intervalId);
    }
  }, [isAuth, intervalId]);

  return (
    <div className="flex items-start justify-center min-h-screen p-8 bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col items-center sm:items-start sm:col-span-2">
          <div className="w-450 h-150 rounded-xl overflow-hidden">
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="webcam" />
          </div>
        </div>

        {isAuth ? (
          <div className="sm:col-span-1 flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-green-500 mb-2">{uploadResultMessage}</h3>
            <h2 className="text-2xl font-bold text-gray-800">
              <span>{employee?.employeeId} -</span> {employee?.name}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{employee?.designation}</p>

            <div className="grid grid-cols-1 gap-4">
              <div><p className="text-sm font-medium text-gray-600">Department</p><p className="text-base text-gray-900">{employee?.department}</p></div>
              <div><p className="text-sm font-medium text-gray-600">Email</p><p className="text-base text-gray-900">{employee?.email}</p></div>
              <div><p className="text-sm font-medium text-gray-600">Phone</p><p className="text-base text-gray-900">{employee?.phone}</p></div>
              <div><p className="text-sm font-medium text-gray-600">Location</p><p className="text-base text-gray-900">{employee?.address}</p></div>
            </div>
          </div>
        ) : (
          <div className="sm:col-span-1 flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-red-500 mb-2">{uploadResultMessage}</h3>
          </div>
        )}
      </div>
    </div>
  );
}