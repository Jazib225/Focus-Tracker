// Type declarations for @mediapipe/face_mesh
declare module '@mediapipe/face_mesh' {
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }

  export interface Results {
    multiFaceLandmarks: NormalizedLandmark[][];
    image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
  }

  export interface FaceMeshOptions {
    locateFile?: (file: string) => string;
  }

  export interface FaceMeshConfig {
    maxNumFaces?: number;
    refineLandmarks?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class FaceMesh {
    constructor(options?: FaceMeshOptions);
    setOptions(options: FaceMeshConfig): Promise<void>;
    onResults(callback: (results: Results) => void): void;
    send(inputs: { image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement }): Promise<void>;
    close(): void;
  }

  export const FACEMESH_TESSELATION: [number, number][];
  export const FACEMESH_RIGHT_EYE: [number, number][];
  export const FACEMESH_LEFT_EYE: [number, number][];
  export const FACEMESH_FACE_OVAL: [number, number][];
  export const FACEMESH_LIPS: [number, number][];
}
