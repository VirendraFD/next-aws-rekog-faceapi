'use client';
import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios'; 
import * as faceapi from 'face-api.js';

export default function FaceDetection() {
  
  const webcamRef = useRef<Webcam | null>(null);
  const [uploadResultMessage, setUploadResultMessage] = useState('Please look at the camera');
  const [isAuth, setAuth] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAdddress] = useState('');
  const [isTimeout, setTimeoutStatus] = useState(false);


  useEffect(() => {

    // Load models once when the component mounts
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/face-api/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/face-api/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/face-api/models');
        console.log('Models loaded successfully');
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();

    // Periodically capture images and attempt face detection
    const interval = setInterval(() => {
      if (webcamRef.current && !isAuth) {
        captureAndSendImage();
      }
    }, 30000); // Capture frame every 30 seconds

    return () => clearInterval(interval);
  }, [webcamRef]);

  

  const captureAndSendImage = async () => {
    
    if (!webcamRef.current || isTimeout) return;

    // Capture the image from the webcam
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      return;
    }

    // Convert base64 image to Blob
    const blob = dataURItoBlob(imageSrc);
    const visitorImageName = uuidv4();
    
    try {
    
      const faceDetected = await detectFaceLocally(blob); // Check if face is detected
      if (faceDetected) {
        console.log('face detected');//
          // Upload to AWS S3
          await fetch(`https://iti80r2th2.execute-api.us-east-1.amazonaws.com/dev/fixhr-visitor-images/${visitorImageName}.jpg`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'image/jpeg',
            },
            body: blob,
          });
    
          // Authenticate the visitor
          const response = await authenticate(visitorImageName);
          if (response?.Message === 'Success') {

            try {//
              const { data: employee } = await axios.get(`https://web.fixhr.app/api/face-detection/employee/${response.FaceId}`);
              
              
              if (employee.status === true) {
                setAuth(true);
                setEmployeeId(employee.data.employeeId);
                setName(employee.data.name);
                setDepartment(employee.data.department);
                setDesignation(employee.data.designation);
                setPhone(employee.data.phone);
                setEmail(employee.data.email);
                setAdddress(employee.data.address);
                if(employee.data.attendance_marked){
                  setUploadResultMessage(`Hi ${employee.name} , welcome to work!`);
                }else{
                  setUploadResultMessage(`Attendance has already been marked.!`);
                }
              } else {
                setUploadResultMessage('Employee not found.');
                setAuth(false);
              }
            } catch (error) {
              console.error('Error calling Laravel API:', error);
            }

          } else {
            setAuth(false);
            setUploadResultMessage('Authentication failed.');
          }
        
      } else {
        console.log('No face detected by face api. Please adjust your position.');
      }
    } catch (error) {
      console.error('Error during face detection or authentication:', error);
    }
    
    
  };

  const detectFaceLocally = async (imageBlob: Blob) => {
    // Convert Blob to HTMLImageElement
    const image = await blobToImage(imageBlob);

    // Detect faces in an image
    const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions());

    return detections.length > 0;
  };
  

  async function authenticate(visitorImageName: string) {
    const requestUrl = `https://iti80r2th2.execute-api.us-east-1.amazonaws.com/dev/employee?` +
      new URLSearchParams({ objectKey: `${visitorImageName}.jpg` });

    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
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

  // Utility function to convert base64 to Blob
  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  return (
    <div className="flex items-start justify-center min-h-screen p-8 bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Left Profile Photo - Larger Size */}
        <div className="flex flex-col items-center sm:items-start sm:col-span-2">

        {!isAuth && (
        <h3 className="ml-20 text-lg font-semibold text-red-500 mb-2 text-center">
          Please Look at the Camera
        </h3>
      )}
          

          <div className="w-450 h-150 rounded-xl overflow-hidden">
            
             <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="webcam"
        />
          </div>
        </div>

        {/* Right Basic Details */}
        {isAuth ? (<div className="sm:col-span-1 flex flex-col justify-center">
          <h3 className="text-lg font-semibold text-green-500 mb-2">
            {uploadResultMessage}
          </h3>
          <h2 className="text-2xl font-bold text-gray-800">
            <span> {employeeId} -</span> {name}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {designation}
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Department</p>
              <p className="text-base text-gray-900">{department}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Email</p>
              <p className="text-base text-gray-900">{email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Phone</p>
              <p className="text-base text-gray-900">{phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Location</p>
              <p className="text-base text-gray-900">{address}</p>
            </div>
          </div>
        </div>): ''}
        
      </div>
    </div>
  );
}