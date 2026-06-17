import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type NormalizedLandmark
} from "@mediapipe/tasks-vision";

export type FaceActionKey = "turn" | "nod" | "blink" | "mouth";

export type FaceAction = {
  key: FaceActionKey;
  label: string;
  hint: string;
};

export const FACE_ACTIONS: FaceAction[] = [
  { key: "turn", label: "左右摇头", hint: "请左右转动头部" },
  { key: "nod", label: "上下点头", hint: "请上下点头" },
  { key: "blink", label: "眨眼", hint: "请眨一下眼" },
  { key: "mouth", label: "张嘴", hint: "请张嘴" }
];

export type ActionDetectionState = {
  completed: FaceActionKey[];
  currentIndex: number;
  message: string;
  hasFace: boolean;
};

type FrameSample = {
  yaw: number;
  pitch: number;
  eye: number;
  mouth: number;
};

export async function createFaceLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm"
  );
  try {
    return await createLandmarkerWithDelegate(fileset, "GPU");
  } catch {
    return await createLandmarkerWithDelegate(fileset, "CPU");
  }
}

function createLandmarkerWithDelegate(
  fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  delegate: "GPU" | "CPU"
) {
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      delegate
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false
  });
}

export class FaceActionDetector {
  private completed: FaceActionKey[] = [];
  private samples: FrameSample[] = [];
  private lastCompletionAt = 0;
  private pendingUntil = 0;

  update(result: FaceLandmarkerResult): ActionDetectionState {
    const landmarks = result.faceLandmarks?.[0];
    if (!landmarks) {
      return this.state("请将人脸置于框内", false);
    }

    const now = performance.now();
    if (this.pendingUntil && now < this.pendingUntil) {
      return this.state("请保持当前姿势", true);
    }
    if (this.pendingUntil && now >= this.pendingUntil) {
      this.pendingUntil = 0;
      this.samples = [];
    }

    this.samples.push(readSample(landmarks));
    this.samples = this.samples.slice(-28);

    const current = FACE_ACTIONS[this.completed.length];
    if (!current) {
      return this.state("认证动作已完成", true);
    }

    const ready = now - this.lastCompletionAt > 700;
    const passed = ready && this.check(current.key);
    if (passed) {
      this.completed.push(current.key);
      this.samples = [];
      this.lastCompletionAt = now;
      this.pendingUntil = now + 1500;
    }

    const next = FACE_ACTIONS[this.completed.length];
    if (passed && next) {
      return this.state("动作已确认，请稍候", true);
    }
    return this.state(next ? next.hint : "认证动作已完成", true);
  }

  getCompletedLabels() {
    return this.completed.map((key) => FACE_ACTIONS.find((item) => item.key === key)!.label);
  }

  isDone() {
    return this.completed.length === FACE_ACTIONS.length;
  }

  private check(key: FaceActionKey) {
    if (this.samples.length < 8) {
      return false;
    }
    const yaws = this.samples.map((sample) => sample.yaw);
    const pitches = this.samples.map((sample) => sample.pitch);
    const eyes = this.samples.map((sample) => sample.eye);
    const mouths = this.samples.map((sample) => sample.mouth);

    if (key === "turn") {
      return Math.min(...yaws) < -0.07 && Math.max(...yaws) > 0.07;
    }
    if (key === "nod") {
      return Math.max(...pitches) - Math.min(...pitches) > 0.08;
    }
    if (key === "blink") {
      return Math.min(...eyes) < 0.012 && Math.max(...eyes) > 0.022;
    }
    return Math.max(...mouths) > 0.055;
  }

  private state(message: string, hasFace: boolean): ActionDetectionState {
    return {
      completed: [...this.completed],
      currentIndex: this.completed.length,
      message,
      hasFace
    };
  }
}

function readSample(points: NormalizedLandmark[]): FrameSample {
  const nose = points[1];
  const leftCheek = points[234];
  const rightCheek = points[454];
  const forehead = points[10];
  const chin = points[152];
  const leftEyeTop = points[159];
  const leftEyeBottom = points[145];
  const rightEyeTop = points[386];
  const rightEyeBottom = points[374];
  const mouthTop = points[13];
  const mouthBottom = points[14];

  const faceWidth = Math.max(distance(leftCheek, rightCheek), 0.001);
  const faceHeight = Math.max(distance(forehead, chin), 0.001);
  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceCenterY = (forehead.y + chin.y) / 2;

  return {
    yaw: (nose.x - faceCenterX) / faceWidth,
    pitch: (nose.y - faceCenterY) / faceHeight,
    eye:
      (Math.abs(leftEyeTop.y - leftEyeBottom.y) + Math.abs(rightEyeTop.y - rightEyeBottom.y)) /
      2,
    mouth: Math.abs(mouthTop.y - mouthBottom.y)
  };
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
