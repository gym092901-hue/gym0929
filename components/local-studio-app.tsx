"use client";

import {
  BarChart3,
  CheckCircle2,
  Clapperboard,
  Clipboard,
  Download,
  Film,
  Loader2,
  Play,
  Sparkles,
  Upload
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Workspace = {
  id: string;
  status: string;
  productName?: string | null;
  evidence: Array<{ id: string; kind: string; text: string }>;
  assets: Array<{ id: string; kind: string; role: string; url?: string | null; altText?: string | null }>;
  storyboards: Array<{ id: string; durationSec: number; renderVariant: string }>;
  shotRequests: Array<{ id: string; description: string; reason: string; status: string }>;
  renders: Array<{ id: string; status: string; variant: string; durationSec: number; error?: string | null }>;
  promptRuns: Array<{
    id: string;
    task: string;
    status: string;
    output?: ProductionWorkflowPayload | null;
  }>;
};

type ProductionWorkflowPayload = {
  imageGenerationMode: string;
  videoGenerationMode: string;
  phases: Array<{ id: string; label: string; status: string; detail: string }>;
  scenePackages: Array<{
    sceneId: string;
    onScreenText: string;
    chatGptImagePrompt: string;
    veoPrompt: string;
    missingInputs: string[];
    nextAction: string;
    anatomyReport: { verdict: string; score: number; requiredFixes: string[] };
  }>;
  renderReadiness: {
    scenePackageCount: number;
    imageReadyCount: number;
    videoReadyCount: number;
    readyForFinalRender: boolean;
  };
  manualChecklist: string[];
};

type ManualProductForm = {
  productName: string;
  priceText: string;
  purchaseLink: string;
  description: string;
  benefits: string;
  usage: string;
  cautions: string;
};

const emptyManualProduct: ManualProductForm = {
  productName: "",
  priceText: "",
  purchaseLink: "",
  description: "",
  benefits: "",
  usage: "",
  cautions: ""
};

export function LocalStudioApp() {
  const [manualProduct, setManualProduct] = useState<ManualProductForm>(emptyManualProduct);
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [generatedAssets, setGeneratedAssets] = useState<File[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [performance, setPerformance] = useState({
    views: "",
    retentionRate: "",
    clickThroughRate: "",
    purchases: "",
    notes: ""
  });

  const productionPackage = useMemo(
    () => workspace?.promptRuns.find((run) => run.task === "production_workflow_package")?.output ?? null,
    [workspace]
  );

  useEffect(() => {
    const productId = window.localStorage.getItem("shorts-commerce-product-id");
    if (productId) void loadProduct(productId);
  }, []);

  async function loadProduct(productId: string) {
    setBusy("작업 불러오기");
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}`);
      const data = await parseResponse<Workspace>(response);
      setWorkspace(data);
      window.localStorage.setItem("shorts-commerce-product-id", data.id);
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function ingestManual(event: FormEvent) {
    event.preventDefault();
    if (!manualProduct.productName.trim()) {
      setError("상품명을 입력하세요.");
      return;
    }
    if (!manualProduct.description.trim() && !manualProduct.benefits.trim() && !manualProduct.usage.trim() && sourceFiles.length === 0) {
      setError("상세 설명, 장점, 사용법, 이미지/영상 중 하나 이상을 입력하세요.");
      return;
    }

    setBusy("상품 자료 저장");
    setError(null);
    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(manualProduct)) {
        formData.append(key, value);
      }
      for (const file of sourceFiles) {
        formData.append("images", file);
      }

      const response = await fetch("/api/products/manual", { method: "POST", body: formData });
      const data = await parseResponse<Workspace>(response);
      setWorkspace(data);
      window.localStorage.setItem("shorts-commerce-product-id", data.id);
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function runAction(label: string, endpoint: string) {
    if (!workspace) return;
    setBusy(label);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data = await parseResponse<Workspace>(response);
      setWorkspace(data);
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function uploadGeneratedAssets(event: FormEvent) {
    event.preventDefault();
    if (!workspace) return;
    if (generatedAssets.length === 0) {
      setError("업로드할 이미지나 영상을 선택하세요.");
      return;
    }

    setBusy("생성 자료 업로드");
    setError(null);
    try {
      const formData = new FormData();
      for (const asset of generatedAssets) {
        formData.append("assets", asset);
      }
      const response = await fetch(`/api/products/${workspace.id}/assets`, { method: "POST", body: formData });
      const data = await parseResponse<Workspace>(response);
      setWorkspace(data);
      setGeneratedAssets([]);
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function submitPerformance(event: FormEvent) {
    event.preventDefault();
    if (!workspace) return;

    setBusy("성과 반영");
    setError(null);
    try {
      const response = await fetch(`/api/products/${workspace.id}/performance`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          views: numberOrUndefined(performance.views),
          retentionRate: numberOrUndefined(performance.retentionRate),
          clickThroughRate: numberOrUndefined(performance.clickThroughRate),
          purchases: numberOrUndefined(performance.purchases),
          notes: performance.notes || undefined
        })
      });
      await parseResponse<Workspace>(response);
      await loadProduct(workspace.id);
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1200);
  }

  function updateManualProduct(key: keyof ManualProductForm, value: string) {
    setManualProduct((prev) => ({ ...prev, [key]: value }));
  }

  const actionDisabled = Boolean(busy || !workspace);

  return (
    <div className="desktop-shell">
      <header className="desktop-header">
        <div>
          <p className="eyebrow">Local Shorts Production App</p>
          <h1>쇼츠 판매 영상 제작</h1>
        </div>
        <div className="header-status">
          {busy ? <Loader2 size={18} /> : <CheckCircle2 size={18} />}
          {busy ?? "대기 중"}
        </div>
      </header>

      {error ? <p className="status-fail app-alert">{error}</p> : null}

      <main className="production-layout">
        <section className="panel">
          <div className="section-heading">
            <span className="step-badge">1</span>
            <div>
              <h2>상품 자료</h2>
              <p className="muted">상세페이지 사실, 가격, 사용법, 이미지/영상만 넣습니다.</p>
            </div>
          </div>
          <form className="grid" onSubmit={ingestManual}>
            <div className="grid two">
              <label className="field">
                <span className="field-label">상품명</span>
                <input className="input" value={manualProduct.productName} onChange={(event) => updateManualProduct("productName", event.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">가격</span>
                <input className="input" value={manualProduct.priceText} onChange={(event) => updateManualProduct("priceText", event.target.value)} />
              </label>
            </div>
            <label className="field">
              <span className="field-label">구매 링크</span>
              <input className="input" value={manualProduct.purchaseLink} onChange={(event) => updateManualProduct("purchaseLink", event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">상세페이지 사실</span>
              <textarea className="textarea compact" value={manualProduct.description} onChange={(event) => updateManualProduct("description", event.target.value)} />
            </label>
            <div className="grid two">
              <label className="field">
                <span className="field-label">장점/특징</span>
                <textarea className="textarea compact" value={manualProduct.benefits} onChange={(event) => updateManualProduct("benefits", event.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">사용법/사용 장면</span>
                <textarea className="textarea compact" value={manualProduct.usage} onChange={(event) => updateManualProduct("usage", event.target.value)} />
              </label>
            </div>
            <label className="field">
              <span className="field-label">주의사항</span>
              <textarea className="textarea compact" value={manualProduct.cautions} onChange={(event) => updateManualProduct("cautions", event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">상품 이미지/사용 영상</span>
              <input
                className="input"
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(event) => setSourceFiles(Array.from(event.target.files ?? []))}
              />
              <span className="muted">{sourceFiles.length > 0 ? `${sourceFiles.length}개 선택됨` : "선택된 파일 없음"}</span>
            </label>
            <button className="button" disabled={Boolean(busy)}>
              <Upload size={18} />
              상품 작업 시작
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <span className="step-badge">2</span>
            <div>
              <h2>판매 설계</h2>
              <p className="muted">각도, 후킹, 스토리보드, 제작 패키지를 한 흐름으로 준비합니다.</p>
            </div>
          </div>
          <div className="stat-grid compact-stats">
            <div className="stat">
              <span className="muted">상태</span>
              <strong>{workspace?.status ?? "-"}</strong>
            </div>
            <div className="stat">
              <span className="muted">근거</span>
              <strong>{workspace?.evidence.length ?? 0}</strong>
            </div>
            <div className="stat">
              <span className="muted">자료</span>
              <strong>{workspace?.assets.length ?? 0}</strong>
            </div>
            <div className="stat">
              <span className="muted">기획</span>
              <strong>{workspace?.storyboards.length ?? 0}</strong>
            </div>
          </div>
          <div className="action-grid">
            <button
              className="button secondary"
              disabled={actionDisabled}
              onClick={() => runAction("판매 설계 실행", `/api/products/${workspace?.id}/run-planning`)}
            >
              <Sparkles size={18} />
              판매 설계 실행
            </button>
            <button
              className="button secondary"
              disabled={actionDisabled || !workspace?.storyboards.length}
              onClick={() => runAction("제작 패키지 준비", `/api/products/${workspace?.id}/production-workflow`)}
            >
              <Clapperboard size={18} />
              제작 패키지 준비
            </button>
          </div>
        </section>

        <section className="panel wide-panel">
          <div className="section-heading">
            <span className="step-badge">3</span>
            <div>
              <h2>이미지와 실사용 영상</h2>
              <p className="muted">ChatGPT Pro 이미지를 만들고, Veo3 영상이나 직접 촬영 영상을 업로드합니다.</p>
            </div>
          </div>

          {productionPackage ? (
            <div className="grid">
              <div className="stat-grid compact-stats">
                <div className="stat">
                  <span className="muted">이미지</span>
                  <strong>{productionPackage.imageGenerationMode}</strong>
                </div>
                <div className="stat">
                  <span className="muted">영상</span>
                  <strong>{productionPackage.videoGenerationMode}</strong>
                </div>
                <div className="stat">
                  <span className="muted">장면</span>
                  <strong>{productionPackage.renderReadiness.scenePackageCount}</strong>
                </div>
                <div className="stat">
                  <span className="muted">렌더</span>
                  <strong>{productionPackage.renderReadiness.readyForFinalRender ? "ready" : "waiting"}</strong>
                </div>
              </div>

              <div className="scene-package-grid">
                {productionPackage.scenePackages.slice(0, 5).map((scene, index) => (
                  <div className="list-item" key={scene.sceneId}>
                    <div className="scene-title-row">
                      <h3>{index + 1}. {scene.onScreenText}</h3>
                      <span className={scene.anatomyReport.verdict === "pass" ? "status-pass" : "status-warn"}>
                        anatomy {scene.anatomyReport.score}
                      </span>
                    </div>
                    <p className="muted">{scene.nextAction}</p>
                    <div className="prompt-box">
                      <div className="prompt-header">
                        <strong>ChatGPT Pro 이미지</strong>
                        <button className="button ghost" onClick={() => copyText(`image-${scene.sceneId}`, scene.chatGptImagePrompt)}>
                          <Clipboard size={16} />
                          {copied === `image-${scene.sceneId}` ? "복사됨" : "복사"}
                        </button>
                      </div>
                      <textarea className="textarea compact" readOnly value={scene.chatGptImagePrompt} />
                    </div>
                    <div className="prompt-box">
                      <div className="prompt-header">
                        <strong>Veo3 영상</strong>
                        <button className="button ghost" onClick={() => copyText(`veo-${scene.sceneId}`, scene.veoPrompt)}>
                          <Clipboard size={16} />
                          {copied === `veo-${scene.sceneId}` ? "복사됨" : "복사"}
                        </button>
                      </div>
                      <textarea className="textarea compact" readOnly value={scene.veoPrompt} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted">제작 패키지를 준비하면 장면별 ChatGPT Pro 이미지 프롬프트와 Veo3 프롬프트가 여기에 표시됩니다.</p>
          )}

          <form className="upload-strip" onSubmit={uploadGeneratedAssets}>
            <label className="field">
              <span className="field-label">생성 이미지/영상 업로드</span>
              <input
                className="input"
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(event) => setGeneratedAssets(Array.from(event.target.files ?? []))}
              />
            </label>
            <button className="button secondary" disabled={actionDisabled || generatedAssets.length === 0}>
              <Upload size={18} />
              업로드 연결
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <span className="step-badge">4</span>
            <div>
              <h2>최종 MP4</h2>
              <p className="muted">3개 이상 9:16 쇼츠를 렌더하고 사람이 확인합니다.</p>
            </div>
          </div>
          <button
            className="button"
            disabled={actionDisabled || !workspace?.storyboards.length}
            onClick={() => runAction("MP4 렌더", `/api/products/${workspace?.id}/render`)}
          >
            <Film size={18} />
            MP4 렌더
          </button>
          <ul className="list render-list">
            {(workspace?.renders ?? []).map((render) => (
              <li className="list-item" key={render.id}>
                <div>
                  <strong>Variant {render.variant}</strong>
                  <p className="muted">{render.status} · {render.durationSec}초</p>
                  {render.error ? <p className="status-fail">{render.error}</p> : null}
                </div>
                {render.status === "complete" ? (
                  <a className="button secondary" href={`/api/renders/${render.id}/download`}>
                    <Download size={18} />
                    다운로드
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="section-heading">
            <span className="step-badge">5</span>
            <div>
              <h2>성과 입력</h2>
              <p className="muted">업로드 후 숫자를 넣으면 다음 개선안을 만듭니다.</p>
            </div>
          </div>
          <form className="grid" onSubmit={submitPerformance}>
            <div className="grid two">
              <input className="input" placeholder="조회수" value={performance.views} onChange={(event) => setPerformance((prev) => ({ ...prev, views: event.target.value }))} />
              <input className="input" placeholder="유지율 %" value={performance.retentionRate} onChange={(event) => setPerformance((prev) => ({ ...prev, retentionRate: event.target.value }))} />
              <input className="input" placeholder="클릭률 %" value={performance.clickThroughRate} onChange={(event) => setPerformance((prev) => ({ ...prev, clickThroughRate: event.target.value }))} />
              <input className="input" placeholder="구매 수" value={performance.purchases} onChange={(event) => setPerformance((prev) => ({ ...prev, purchases: event.target.value }))} />
            </div>
            <textarea className="textarea compact" placeholder="댓글 반응이나 업로드 메모" value={performance.notes} onChange={(event) => setPerformance((prev) => ({ ...prev, notes: event.target.value }))} />
            <button className="button secondary" disabled={actionDisabled}>
              <BarChart3 size={18} />
              개선안 생성
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "요청에 실패했습니다.");
  }
  return data as T;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
