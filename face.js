import {FilesetResolver,FaceDetector} from './vendor/vision.mjs';
let detector;
export async function detectFaces(canvas){
 detector??=FaceDetector.createFromOptions(await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'),{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'},runningMode:'IMAGE',minDetectionConfidence:.5});
 const result=(await detector).detect(canvas);
 return result.detections.map(d=>{const b=d.boundingBox;return {x:b.originX/canvas.width,y:b.originY/canvas.height,w:b.width/canvas.width,h:b.height/canvas.height};});
}
