import { execFile } from "child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "util";
import OpenAI from "openai";
import type { RenderScene } from "@/lib/remotion/types";

const execFileAsync = promisify(execFile);

type NarrationInput = {
  storyboardId: string;
  productName: string;
  scenes: RenderScene[];
};

export async function ensureNarrationAudio(input: NarrationInput): Promise<string | undefined> {
  const narration = buildNarrationText(input);
  if (!narration) return undefined;

  const publicDir = path.join(process.cwd(), "public", "generated", "tts");
  await fs.mkdir(publicDir, { recursive: true });

  if (process.env.OPENAI_TTS_ENABLED === "true" && process.env.OPENAI_API_KEY?.trim()) {
    const mp3Path = path.join(publicDir, `${input.storyboardId}.mp3`);
    await synthesizeWithOpenAI(narration, mp3Path);
    return `/generated/tts/${input.storyboardId}.mp3`;
  }

  if (process.platform === "win32") {
    const wavPath = path.join(publicDir, `${input.storyboardId}.wav`);
    await synthesizeWithWindowsSpeech(narration, wavPath);
    return `/generated/tts/${input.storyboardId}.wav`;
  }

  return undefined;
}

export function buildNarrationText(input: NarrationInput): string {
  const lines = input.scenes
    .map((scene) => scene.narration || scene.onScreenText)
    .map(cleanNarrationLine)
    .filter(Boolean);

  return Array.from(new Set(lines)).join(" ");
}

async function synthesizeWithOpenAI(text: string, outputPath: string) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const speech = await client.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || "tts-1",
    voice: process.env.OPENAI_TTS_VOICE || "alloy",
    input: text,
    response_format: "mp3"
  });
  const buffer = Buffer.from(await speech.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
}

async function synthesizeWithWindowsSpeech(text: string, outputPath: string) {
  const tempDir = path.join(process.cwd(), "storage", "tts");
  await fs.mkdir(tempDir, { recursive: true });
  const textPath = path.join(tempDir, `${path.basename(outputPath)}.txt`);
  const scriptPath = path.join(tempDir, "synthesize-windows-speech.ps1");
  await fs.writeFile(textPath, text, "utf8");

  const script = buildWindowsSpeechScript();
  await fs.writeFile(scriptPath, script, "utf8");

  await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, textPath, outputPath], {
    windowsHide: true,
    timeout: 120_000
  });
}

export function buildWindowsSpeechScript() {
  return [
    "param([string]$TextPath, [string]$OutputPath)",
    "Add-Type -AssemblyName System.Speech",
    "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$preferredVoice = $env:LOCAL_TTS_VOICE",
    "if ([string]::IsNullOrWhiteSpace($preferredVoice)) {",
    "  $voice = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo } | Where-Object { $_.Culture.Name -like 'ko*' -or $_.Name -match 'Heami|Hyeri|SunHi|Korean|Yuna' } | Select-Object -First 1",
    "  if ($voice) { $preferredVoice = $voice.Name }",
    "}",
    "if (-not [string]::IsNullOrWhiteSpace($preferredVoice)) {",
    "  try { $synth.SelectVoice($preferredVoice) } catch { }",
    "}",
    "$synth.Rate = -1",
    "$synth.Volume = 96",
    "$text = [System.IO.File]::ReadAllText($TextPath, [System.Text.Encoding]::UTF8)",
    "$text = $text -replace '([.!?。！？])\\s*', '$1 '",
    "$text = $text -replace '(하세요|보세요|확인하세요)\\s+', '$1. '",
    "$synth.SetOutputToWaveFile($OutputPath)",
    "$synth.Speak($text)",
    "$synth.Dispose()"
  ].join("\n");
}

function cleanNarrationLine(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .trim()
    .slice(0, 220);
}
