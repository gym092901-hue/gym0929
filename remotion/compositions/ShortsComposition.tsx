import { AbsoluteFill, Audio, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderScene, ShortsRenderProps } from "../../lib/remotion/types";

export function ShortsComposition({ productName, variant, scenes, narrationAudioUrl }: ShortsRenderProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = getCurrentScene(scenes, frame, fps);
  const sceneStart = getSceneStartFrame(scenes, scene.index, fps);
  const localFrame = frame - sceneStart;
  const fade = interpolate(localFrame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const sceneFrames = Math.max(1, scene.item.durationSec * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#17211b", color: "white", fontFamily: "Inter, Arial, sans-serif" }}>
      <SceneMedia scene={scene.item} localFrame={localFrame} sceneFrames={sceneFrames} />
      {narrationAudioUrl ? <Audio src={narrationAudioUrl} volume={0.9} /> : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.26), rgba(0,0,0,0.72))"
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: 0.88,
          fontSize: 30,
          fontWeight: 800
        }}
      >
        <span>{variant}</span>
        <span>{scene.item.type.toUpperCase()}</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 210,
          opacity: fade
        }}
      >
        <div
          style={{
            display: "inline-flex",
            marginBottom: 24,
            borderRadius: 999,
            background: "rgba(255,255,255,0.16)",
            padding: "12px 18px",
            fontSize: 28,
            fontWeight: 800
          }}
        >
          {productName}
        </div>
        <div
          style={{
            fontSize: fitFontSize(scene.item.onScreenText),
            lineHeight: 1.08,
            fontWeight: 900,
            textShadow: "0 7px 30px rgba(0,0,0,0.44)",
            wordBreak: "keep-all"
          }}
        >
          {scene.item.onScreenText}
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 34,
            lineHeight: 1.28,
            color: "rgba(255,255,255,0.86)",
            wordBreak: "keep-all"
          }}
        >
          {scene.item.requiresUserShot ? scene.item.shotRequest ?? "촬영 컷 필요" : scene.item.narration}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          bottom: 92,
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.18)"
        }}
      >
        <div
          style={{
            width: `${Math.min(100, ((frame + 1) / Math.max(1, scenes.reduce((sum, item) => sum + item.durationSec * fps, 0))) * 100)}%`,
            height: "100%",
            borderRadius: 999,
            background: "#f4c95d"
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function SceneMedia({
  scene,
  localFrame,
  sceneFrames
}: {
  scene: RenderScene;
  localFrame: number;
  sceneFrames: number;
}) {
  const media = scene.assetMedia?.[0] ?? scene.assetUrls.map((url) => ({ url, kind: inferMediaKind(url) }))[0];
  const pan = interpolate(localFrame, [0, sceneFrames], [0, -28], { extrapolateRight: "clamp" });
  const scale = interpolate(localFrame, [0, sceneFrames], [1.03, 1.14], { extrapolateRight: "clamp" });

  if (media?.url && (media.kind === "video" || inferMediaKind(media.url) === "video")) {
    return (
      <Video
        src={media.url}
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.68,
          filter: "saturate(1.08) contrast(1.08)"
        }}
      />
    );
  }

  if (media?.url) {
    return (
      <Img
        src={media.url}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.6,
          filter: "saturate(1.02) contrast(1.08)",
          transform: `scale(${scale}) translateX(${pan}px)`,
          transformOrigin: "center"
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(140deg, #17211b 0%, #284339 45%, #f4c95d 46%, #f4c95d 48%, #163329 49%, #0f1d18 100%)",
        transform: `scale(${scale}) translateX(${pan}px)`
      }}
    />
  );
}

function getCurrentScene(scenes: ShortsRenderProps["scenes"], frame: number, fps: number) {
  let cursor = 0;
  for (let index = 0; index < scenes.length; index += 1) {
    const length = scenes[index].durationSec * fps;
    if (frame < cursor + length) {
      return { item: scenes[index], index };
    }
    cursor += length;
  }
  return { item: scenes[scenes.length - 1], index: scenes.length - 1 };
}

function getSceneStartFrame(scenes: ShortsRenderProps["scenes"], targetIndex: number, fps: number): number {
  return scenes.slice(0, targetIndex).reduce((sum, scene) => sum + scene.durationSec * fps, 0);
}

function fitFontSize(text: string): number {
  if (text.length <= 14) return 88;
  if (text.length <= 24) return 76;
  if (text.length <= 38) return 62;
  return 52;
}

function inferMediaKind(url: string): string {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? "video" : "image";
}
