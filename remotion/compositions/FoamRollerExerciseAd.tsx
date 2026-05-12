import { AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type FoamRollerExerciseAdProps = {
  narrationAudioUrl?: string;
};

type SceneType = "hook" | "calf" | "back" | "quad" | "proof" | "cta";

type AdScene = {
  type: SceneType;
  start: number;
  end: number;
  title: string;
  sub: string;
};

const durationSec = 29;

const scenes: AdScene[] = [
  { type: "hook", start: 0, end: 3, title: "폼롤러, 그냥 두면 안 씁니다", sub: "이 3동작이면 바로 루틴이 됩니다" },
  { type: "calf", start: 3, end: 8.5, title: "1. 종아리부터 굴리세요", sub: "앉아서 천천히 앞뒤로" },
  { type: "back", start: 8.5, end: 14, title: "2. 등 상부는 짧게", sub: "누워서 어깨 아래쪽만 가볍게" },
  { type: "quad", start: 14, end: 19.5, title: "3. 허벅지 앞쪽까지", sub: "운동 전후 5분 루틴으로" },
  { type: "proof", start: 19.5, end: 24, title: "한 개로 3가지 사용 장면", sub: "사진이 아니라, 어떻게 쓰는지가 구매 포인트" },
  { type: "cta", start: 24, end: 29, title: "집에서 바로 따라 할 폼롤러", sub: "옵션과 가격은 링크에서 확인하세요" }
];

const personShots = {
  calf: staticFile("demo-assets/foam-roller-person/calf.jpg"),
  back: staticFile("demo-assets/foam-roller-person/upper-back.jpg"),
  quad: staticFile("demo-assets/foam-roller-person/quad.jpg")
};

export function FoamRollerExerciseAd({ narrationAudioUrl }: FoamRollerExerciseAdProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const second = frame / fps;
  const scene = scenes.find((item) => second >= item.start && second < item.end) ?? scenes[scenes.length - 1];
  const local = second - scene.start;
  const sceneLength = Math.max(1, scene.end - scene.start);
  const fade = interpolate(local, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0c0a", color: "white", fontFamily: "Inter, Arial, sans-serif" }}>
      {narrationAudioUrl ? <Audio src={narrationAudioUrl} volume={0.94} /> : null}
      <SceneVisual scene={scene.type} local={local} sceneLength={sceneLength} second={second} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.22) 42%, rgba(0,0,0,0.84) 100%)"
        }}
      />
      <Header scene={scene} />
      <div style={{ position: "absolute", left: 62, right: 62, bottom: scene.type === "cta" ? 260 : 172, opacity: fade }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
            padding: "12px 18px",
            borderRadius: 999,
            background: "rgba(244,201,93,0.94)",
            color: "#101614",
            fontSize: 28,
            fontWeight: 950
          }}
        >
          실제 사용 루틴
        </div>
        <div
          style={{
            maxWidth: 900,
            fontSize: fitTitle(scene.title),
            lineHeight: 1.05,
            fontWeight: 980,
            letterSpacing: 0,
            wordBreak: "keep-all",
            textShadow: "0 8px 30px rgba(0,0,0,0.55)"
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            marginTop: 20,
            maxWidth: 820,
            fontSize: 36,
            lineHeight: 1.25,
            fontWeight: 760,
            color: "rgba(255,255,255,0.88)",
            wordBreak: "keep-all",
            textShadow: "0 6px 22px rgba(0,0,0,0.5)"
          }}
        >
          {scene.sub}
        </div>
      </div>
      {scene.type === "cta" ? <CtaButton local={local} /> : null}
      <SafetyNote />
      <Progress frame={frame} fps={fps} />
    </AbsoluteFill>
  );
}

function SceneVisual({
  scene,
  local,
  sceneLength,
  second
}: {
  scene: SceneType;
  local: number;
  sceneLength: number;
  second: number;
}) {
  if (scene === "hook") {
    return <HookVisual local={local} />;
  }
  if (scene === "proof") {
    return <ProofVisual local={local} />;
  }
  if (scene === "cta") {
    return (
      <>
        <PhotoVisual
          src={personShots.quad}
          local={local}
          sceneLength={sceneLength}
          scene="cta"
          zoomFrom={1.03}
          zoomTo={1.12}
          xFrom={0}
          xTo={-22}
        />
        <CutFlash local={local} />
      </>
    );
  }
  const src = scene === "calf" ? personShots.calf : scene === "back" ? personShots.back : personShots.quad;
  const xWave = Math.sin(second * 2.7) * 10;
  return (
    <>
      <PhotoVisual
        src={src}
        local={local}
        sceneLength={sceneLength}
        scene={scene}
        zoomFrom={1.04}
        zoomTo={1.14}
        xFrom={scene === "back" ? -24 : 18}
        xTo={scene === "back" ? 22 + xWave : -24 + xWave}
      />
      <MotionEcho src={src} scene={scene} local={local} sceneLength={sceneLength} />
      <RollingCue scene={scene} local={local} />
      <CutFlash local={local} />
    </>
  );
}

function HookVisual({ local }: { local: number }) {
  const shots = [
    { src: personShots.calf, label: "종아리" },
    { src: personShots.back, label: "등" },
    { src: personShots.quad, label: "허벅지" }
  ];
  return (
    <AbsoluteFill style={{ background: "#101614" }}>
      {shots.map((shot, index) => {
        const appear = interpolate(local, [index * 0.42, index * 0.42 + 0.3], [0, 1], { extrapolateRight: "clamp" });
        return (
          <div
            key={shot.label}
            style={{
              position: "absolute",
              top: index * 640,
              left: 0,
              width: "100%",
              height: 640,
              overflow: "hidden",
              opacity: appear,
              transform: `translateY(${(1 - appear) * 36}px)`
            }}
          >
            <Img
              src={shot.src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${1.06 + index * 0.015}) translateY(${index === 1 ? -18 : 0}px)`,
                filter: "saturate(1.04) contrast(1.04)"
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 56,
                top: 52,
                padding: "12px 20px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.58)",
                fontSize: 34,
                fontWeight: 920
              }}
            >
              {shot.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function ProofVisual({ local }: { local: number }) {
  const shots = [
    { src: personShots.calf, label: "앉아서 종아리" },
    { src: personShots.back, label: "누워서 등" },
    { src: personShots.quad, label: "엎드려 허벅지" }
  ];
  return (
    <AbsoluteFill style={{ background: "#11130f" }}>
      {shots.map((shot, index) => {
        const scale = interpolate(local, [index * 0.45, index * 0.45 + 0.35], [0.92, 1], { extrapolateRight: "clamp" });
        const opacity = interpolate(local, [index * 0.45, index * 0.45 + 0.28], [0, 1], { extrapolateRight: "clamp" });
        return (
          <div
            key={shot.label}
            style={{
              position: "absolute",
              left: 72,
              right: 72,
              top: 256 + index * 344,
              height: 300,
              borderRadius: 10,
              overflow: "hidden",
              opacity,
              transform: `scale(${scale})`,
              boxShadow: "0 28px 70px rgba(0,0,0,0.38)"
            }}
          >
            <Img src={shot.src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.02) contrast(1.04)" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.62), transparent 62%)" }} />
            <div
              style={{
                position: "absolute",
                left: 34,
                top: 36,
                fontSize: 42,
                lineHeight: 1.08,
                fontWeight: 950,
                textShadow: "0 6px 20px rgba(0,0,0,0.5)"
              }}
            >
              {shot.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function PhotoVisual({
  src,
  local,
  sceneLength,
  scene,
  zoomFrom,
  zoomTo,
  xFrom,
  xTo
}: {
  src: string;
  local: number;
  sceneLength: number;
  scene: SceneType;
  zoomFrom: number;
  zoomTo: number;
  xFrom: number;
  xTo: number;
}) {
  const roll = isExerciseScene(scene) ? Math.sin(local * Math.PI * 1.55) * rollAmplitude(scene) : 0;
  const bounce = isExerciseScene(scene) ? Math.sin(local * Math.PI * 3.1) * 2.5 : 0;
  const scale = interpolate(local, [0, sceneLength], [zoomFrom, zoomTo], { extrapolateRight: "clamp" });
  const x = interpolate(local, [0, sceneLength], [xFrom, xTo], { extrapolateRight: "clamp" });
  const y = interpolate(local, [0, sceneLength], [0, -18], { extrapolateRight: "clamp" });
  return (
    <Img
      src={src}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${scale}) translate(${x + roll}px, ${y + bounce}px)`,
        filter: "saturate(1.04) contrast(1.05)",
        transformOrigin: "center"
      }}
    />
  );
}

function MotionEcho({
  src,
  scene,
  local,
  sceneLength
}: {
  src: string;
  scene: SceneType;
  local: number;
  sceneLength: number;
}) {
  const direction = Math.sin(local * Math.PI * 1.55);
  const fade = interpolate(local, [0.2, 0.7, sceneLength - 0.5, sceneLength], [0, 0.16, 0.16, 0], { extrapolateRight: "clamp" });
  const offset = direction * rollAmplitude(scene) * -0.85;
  return (
    <Img
      src={src}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: fade,
        transform: `scale(1.12) translateX(${offset}px)`,
        filter: "blur(2px) saturate(1.08) contrast(1.06)",
        mixBlendMode: "screen"
      }}
    />
  );
}

function RollingCue({ scene, local }: { scene: SceneType; local: number }) {
  const progress = ((local * 0.95) % 1) * 100;
  const isForward = Math.sin(local * Math.PI * 1.55) >= 0;
  const placement = cuePlacement(scene);
  return (
    <div
      style={{
        position: "absolute",
        left: placement.left,
        top: placement.top,
        width: placement.width,
        height: 86,
        borderRadius: 999,
        background: "rgba(0,0,0,0.48)",
        border: "2px solid rgba(244,201,93,0.84)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.28)",
        overflow: "hidden",
        opacity: interpolate(local, [0, 0.35], [0, 1], { extrapolateRight: "clamp" })
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 26,
          right: 26,
          top: 39,
          height: 8,
          borderRadius: 999,
          background: "rgba(255,255,255,0.34)"
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 25,
          left: `calc(${progress}% - 19px)`,
          width: 38,
          height: 38,
          borderRadius: 999,
          background: "#f4c95d",
          boxShadow: "0 0 24px rgba(244,201,93,0.76)"
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          fontSize: 28,
          fontWeight: 980,
          letterSpacing: 0,
          color: "white",
          textShadow: "0 4px 12px rgba(0,0,0,0.46)"
        }}
      >
        <span style={{ color: isForward ? "#f4c95d" : "rgba(255,255,255,0.62)" }}>앞으로</span>
        <span style={{ color: "rgba(255,255,255,0.58)" }}>↔</span>
        <span style={{ color: isForward ? "rgba(255,255,255,0.62)" : "#f4c95d" }}>뒤로</span>
      </div>
    </div>
  );
}

function CutFlash({ local }: { local: number }) {
  const opacity = interpolate(local, [0, 0.08, 0.22], [0.32, 0.14, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "white", opacity, pointerEvents: "none" }} />;
}

function Header({ scene }: { scene: AdScene }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: 56,
        right: 56,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 28,
        fontWeight: 900,
        color: "rgba(255,255,255,0.9)",
        textShadow: "0 5px 18px rgba(0,0,0,0.45)"
      }}
    >
      <span>FOAM ROLLER ROUTINE</span>
      <span>{scene.type.toUpperCase()}</span>
    </div>
  );
}

function CtaButton({ local }: { local: number }) {
  const pop = interpolate(local, [0.25, 0.55], [0.92, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 86,
        right: 86,
        bottom: 148,
        height: 104,
        borderRadius: 8,
        background: "#f4c95d",
        color: "#101614",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 42,
        fontWeight: 980,
        transform: `scale(${pop})`,
        boxShadow: "0 22px 50px rgba(0,0,0,0.28)"
      }}
    >
      옵션 · 가격 확인하기
    </div>
  );
}

function SafetyNote() {
  return (
    <div
      style={{
        position: "absolute",
        left: 62,
        right: 62,
        bottom: 82,
        fontSize: 24,
        lineHeight: 1.25,
        color: "rgba(255,255,255,0.7)",
        textShadow: "0 4px 16px rgba(0,0,0,0.55)"
      }}
    >
      무리하거나 불편하면 즉시 중단하세요.
    </div>
  );
}

function Progress({ frame, fps }: { frame: number; fps: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 62,
        right: 62,
        bottom: 50,
        height: 8,
        borderRadius: 999,
        background: "rgba(255,255,255,0.2)"
      }}
    >
      <div
        style={{
          width: `${Math.min(100, ((frame + 1) / (durationSec * fps)) * 100)}%`,
          height: "100%",
          borderRadius: 999,
          background: "#f4c95d"
        }}
      />
    </div>
  );
}

function fitTitle(text: string): number {
  if (text.length <= 13) return 82;
  if (text.length <= 18) return 74;
  return 62;
}

function isExerciseScene(scene: SceneType): boolean {
  return scene === "calf" || scene === "back" || scene === "quad";
}

function rollAmplitude(scene: SceneType): number {
  if (scene === "back") return 18;
  if (scene === "quad") return 24;
  return 28;
}

function cuePlacement(scene: SceneType): { left: number; top: number; width: number } {
  if (scene === "back") return { left: 108, top: 900, width: 420 };
  if (scene === "quad") return { left: 118, top: 980, width: 430 };
  return { left: 92, top: 1020, width: 440 };
}
