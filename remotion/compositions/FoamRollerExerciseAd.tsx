import { AbsoluteFill, Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type FoamRollerExerciseAdProps = {
  narrationAudioUrl?: string;
};

const scenes = [
  { type: "hook", start: 0, end: 3, title: "폼롤러, 이렇게 쓰면 바로 루틴이 됩니다", sub: "사진만 보지 말고 동작을 먼저 보세요" },
  { type: "calf", start: 3, end: 8, title: "1. 종아리 롤링", sub: "발목부터 무릎 아래까지 천천히" },
  { type: "back", start: 8, end: 13, title: "2. 등 상부 롤링", sub: "어깨 아래쪽을 짧게 굴려 확인" },
  { type: "thigh", start: 13, end: 18, title: "3. 허벅지 앞쪽 롤링", sub: "운동 전후 5분 루틴으로 활용" },
  { type: "proof", start: 18, end: 22, title: "하나로 3가지 루틴", sub: "종아리 · 등 · 허벅지까지 한 번에" },
  { type: "cta", start: 22, end: 27, title: "집에 하나 두면 운동 루틴이 쉬워집니다", sub: "옵션과 가격은 링크에서 확인하세요" }
];

export function FoamRollerExerciseAd({ narrationAudioUrl }: FoamRollerExerciseAdProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const second = frame / fps;
  const scene = scenes.find((item) => second >= item.start && second < item.end) ?? scenes[scenes.length - 1];
  const local = second - scene.start;
  const fade = interpolate(local, [0, 0.35], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#101614", color: "white", fontFamily: "Inter, Arial, sans-serif" }}>
      {narrationAudioUrl ? <Audio src={narrationAudioUrl} volume={0.92} /> : null}
      <Background second={second} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.68))"
        }}
      />
      <div style={{ position: "absolute", inset: 0, opacity: fade }}>
        {scene.type === "hook" ? <HookScene second={second} /> : null}
        {scene.type === "calf" ? <CalfScene second={second} /> : null}
        {scene.type === "back" ? <BackScene second={second} /> : null}
        {scene.type === "thigh" ? <ThighScene second={second} /> : null}
        {scene.type === "proof" ? <ProofScene second={second} /> : null}
        {scene.type === "cta" ? <CtaScene second={second} /> : null}
      </div>
      <TopBar sceneType={scene.type} />
      <SceneText title={scene.title} sub={scene.sub} sceneType={scene.type} />
      <Progress frame={frame} fps={fps} />
    </AbsoluteFill>
  );
}

function Background({ second }: { second: number }) {
  const drift = Math.sin(second * 0.8) * 18;
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 35% 25%, rgba(244,201,93,0.28), transparent 28%), linear-gradient(135deg, #123029, #17211b 55%, #0d1512)",
        transform: `translateX(${drift}px) scale(1.04)`
      }}
    />
  );
}

function HookScene({ second }: { second: number }) {
  const lift = Math.sin(second * 4) * 16;
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top: 420, height: 540 }}>
      <FoamRoller x={330} y={270 + lift} width={330} />
      <div style={{ position: "absolute", left: 48, top: 60, fontSize: 58, fontWeight: 900, lineHeight: 1.08 }}>
        종아리
        <br />
        등
        <br />
        허벅지
      </div>
    </div>
  );
}

function CalfScene({ second }: { second: number }) {
  const roll = Math.sin(second * 3.6) * 100;
  return (
    <ExerciseStage>
      <FoamRoller x={330 + roll} y={480} width={320} />
      <Limb x={190 + roll * 0.45} y={360} rotation={8} length={590} color="#f0d4bd" />
      <Limb x={235 + roll * 0.45} y={420} rotation={8} length={530} color="#e5c4ab" />
      <Label x={95} y={170} text="천천히 앞뒤로" />
    </ExerciseStage>
  );
}

function BackScene({ second }: { second: number }) {
  const roll = Math.sin(second * 3.2) * 74;
  return (
    <ExerciseStage>
      <FoamRoller x={390 + roll} y={470} width={310} />
      <Torso x={260 + roll * 0.35} y={280} rotation={-6} />
      <Head x={740 + roll * 0.35} y={250} />
      <Label x={95} y={170} text="등 상부를 짧게" />
    </ExerciseStage>
  );
}

function ThighScene({ second }: { second: number }) {
  const roll = Math.sin(second * 3.4) * 90;
  return (
    <ExerciseStage>
      <FoamRoller x={350 + roll} y={500} width={310} />
      <Torso x={260 + roll * 0.28} y={255} rotation={3} />
      <Limb x={270 + roll * 0.55} y={420} rotation={2} length={560} color="#f0d4bd" />
      <Label x={95} y={170} text="운동 전후 5분" />
    </ExerciseStage>
  );
}

function ProofScene({ second }: { second: number }) {
  const pulse = interpolate(Math.sin(second * 4), [-1, 1], [0.94, 1.04]);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {["종아리", "등", "허벅지"].map((text, index) => (
        <div
          key={text}
          style={{
            position: "absolute",
            left: 118,
            right: 118,
            top: 390 + index * 210,
            height: 150,
            borderRadius: 28,
            background: "rgba(255,255,255,0.14)",
            border: "2px solid rgba(255,255,255,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 48px",
            transform: `scale(${index === 1 ? pulse : 1})`
          }}
        >
          <span style={{ fontSize: 54, fontWeight: 900 }}>{text}</span>
          <span style={{ fontSize: 42, color: "#f4c95d", fontWeight: 900 }}>OK</span>
        </div>
      ))}
    </div>
  );
}

function CtaScene({ second }: { second: number }) {
  const bounce = Math.sin(second * 5) * 8;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <FoamRoller x={255} y={560 + bounce} width={560} />
      <div
        style={{
          position: "absolute",
          left: 130,
          right: 130,
          top: 900,
          borderRadius: 28,
          background: "#f4c95d",
          color: "#17211b",
          padding: "34px 42px",
          fontSize: 48,
          fontWeight: 950,
          textAlign: "center"
        }}
      >
        옵션과 가격 확인
      </div>
      <div style={{ position: "absolute", left: 130, right: 130, top: 1090, fontSize: 30, color: "rgba(255,255,255,0.78)" }}>
        무리하거나 불편하면 즉시 중단하세요.
      </div>
    </div>
  );
}

function ExerciseStage({ children }: { children: React.ReactNode }) {
  return <div style={{ position: "absolute", left: 0, right: 0, top: 250, height: 800 }}>{children}</div>;
}

function FoamRoller({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height: 108,
        borderRadius: 60,
        background: "linear-gradient(90deg, #111 0%, #343434 20%, #0c0c0c 48%, #444 80%, #111 100%)",
        boxShadow: "0 32px 70px rgba(0,0,0,0.42)",
        border: "4px solid rgba(255,255,255,0.16)"
      }}
    />
  );
}

function Limb({
  x,
  y,
  rotation,
  length,
  color
}: {
  x: number;
  y: number;
  rotation: number;
  length: number;
  color: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: length,
        height: 86,
        borderRadius: 48,
        background: color,
        transform: `rotate(${rotation}deg)`,
        boxShadow: "0 22px 38px rgba(0,0,0,0.22)"
      }}
    />
  );
}

function Torso({ x, y, rotation }: { x: number; y: number; rotation: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 520,
        height: 190,
        borderRadius: 95,
        background: "#e6c6ad",
        transform: `rotate(${rotation}deg)`,
        boxShadow: "0 28px 50px rgba(0,0,0,0.24)"
      }}
    />
  );
}

function Head({ x, y }: { x: number; y: number }) {
  return <div style={{ position: "absolute", left: x, top: y, width: 118, height: 118, borderRadius: 70, background: "#edcfb7" }} />;
}

function Label({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: "16px 24px",
        borderRadius: 999,
        background: "rgba(244,201,93,0.94)",
        color: "#17211b",
        fontSize: 34,
        fontWeight: 900
      }}
    >
      {text}
    </div>
  );
}

function TopBar({ sceneType }: { sceneType: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 72,
        left: 64,
        right: 64,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 30,
        fontWeight: 850,
        color: "rgba(255,255,255,0.86)"
      }}
    >
      <span>FOAM ROLLER</span>
      <span>{sceneType.toUpperCase()}</span>
    </div>
  );
}

function SceneText({ title, sub, sceneType }: { title: string; sub: string; sceneType: string }) {
  const isCta = sceneType === "cta";
  return (
    <div style={{ position: "absolute", left: 64, right: 64, bottom: isCta ? 310 : 190 }}>
      <div
        style={{
          fontSize: title.length > 22 ? 58 : 74,
          lineHeight: 1.08,
          fontWeight: 950,
          wordBreak: "keep-all",
          textShadow: "0 8px 32px rgba(0,0,0,0.5)"
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 22, fontSize: 34, lineHeight: 1.25, color: "rgba(255,255,255,0.86)", wordBreak: "keep-all" }}>
        {sub}
      </div>
    </div>
  );
}

function Progress({ frame, fps }: { frame: number; fps: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        right: 64,
        bottom: 90,
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,0.2)"
      }}
    >
      <div
        style={{
          width: `${Math.min(100, ((frame + 1) / (27 * fps)) * 100)}%`,
          height: "100%",
          borderRadius: 999,
          background: "#f4c95d"
        }}
      />
    </div>
  );
}
