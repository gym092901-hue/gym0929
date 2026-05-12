"use client";

import {
  BadgeCheck,
  BarChart3,
  Clapperboard,
  Download,
  FileCheck2,
  Film,
  Gauge,
  KeyRound,
  LinkIcon,
  Loader2,
  MessageSquareText,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Upload
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { normalizeProductUrl } from "@/lib/utils/url";

type Workspace = {
  id: string;
  sourceUrl: string;
  status: string;
  productName?: string | null;
  evidence: Array<{ id: string; kind: string; text: string; url?: string | null }>;
  assets: Array<{ id: string; role: string; url?: string | null; altText?: string | null }>;
  truthSnapshots: Array<{ payload: ProductTruthPayload }>;
  claims: Array<{ id: string; text: string; claimType: string; safe: boolean }>;
  potential?: {
    score: number;
    grade: string;
    breakdown: Record<string, number>;
    penalties: Record<string, number>;
    rationale: string;
  } | null;
  pains: Array<{ id: string; text: string; buyingMotive: string }>;
  angles: Array<{
    id: string;
    angle: string;
    targetCustomer: string;
    customerPain: string;
    buyingMotive: string;
    corePromise: string;
    score: number;
    riskFlags: string[];
  }>;
  hooks: Array<{
    id: string;
    text: string;
    pattern: string;
    score: number;
    decision: string;
    rejectionReason?: string | null;
  }>;
  storyboards: Array<{
    id: string;
    durationSec: number;
    renderVariant: string;
    proofScenes: Array<{
      id: string;
      type: string;
      durationSec: number;
      onScreenText: string;
      narration: string;
      requiresUserShot: boolean;
      shotRequest?: string | null;
    }>;
    renders: Array<{ id: string; status: string; filePath?: string | null }>;
  }>;
  shotRequests: Array<{ id: string; description: string; reason: string; status: string }>;
  compliance: Array<{ id: string; verdict: string; requiredFixes: string[]; targetType: string }>;
  renders: Array<{ id: string; status: string; variant: string; durationSec: number; error?: string | null }>;
  packages: Array<{ payload: ConversionPayload }>;
  performance: Array<{ id: string; views?: number; retentionRate?: number; clickThroughRate?: number; purchases?: number }>;
  improvements: Array<{ id: string; payload: { recommendations?: string[]; nextTests?: string[] } }>;
};

type ProductTruthPayload = {
  productName?: string | null;
  price?: { rawText?: string; amount?: number | null };
  missingInfo?: string[];
  allowedClaims?: Array<{ text: string; evidenceIds: string[] }>;
};

type ConversionPayload = {
  titles?: Array<{ videoRenderId: string; text: string; score: number }>;
  descriptions?: Array<{ videoRenderId: string; text: string }>;
  pinnedComments?: Array<{ videoRenderId: string; text: string }>;
  hashtags?: string[];
  productTagPriority?: Array<{ label: string; url: string; priority: number; reason: string }>;
  manualUploadChecklist?: string[];
};

type CoupangConfigStatus = {
  configured: boolean;
  missing: string[];
};

const navItems = [
  ["수집", Search],
  ["근거", FileCheck2],
  ["점수", Gauge],
  ["각도", Sparkles],
  ["후킹", MessageSquareText],
  ["기획", Clapperboard],
  ["렌더", Film],
  ["업로드", Upload]
] as const;

export function ProductWorkspace() {
  const [url, setUrl] = useState("");
  const [sellerProductId, setSellerProductId] = useState("");
  const [coupangConfig, setCoupangConfig] = useState<CoupangConfigStatus | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [performance, setPerformance] = useState({
    views: "",
    retentionRate: "",
    clickThroughRate: "",
    purchases: "",
    notes: ""
  });

  const truth = workspace?.truthSnapshots[0]?.payload;
  const conversion = workspace?.packages[0]?.payload;
  const keptHooks = useMemo(() => workspace?.hooks.filter((hook) => hook.decision === "keep") ?? [], [workspace]);

  useEffect(() => {
    const productId = window.localStorage.getItem("shorts-commerce-product-id");
    void loadCoupangConfig();
    if (!productId) return;
    void loadProduct(productId);
  }, []);

  async function loadCoupangConfig() {
    try {
      const response = await fetch("/api/coupang/config");
      const data = await parseResponse<CoupangConfigStatus>(response);
      setCoupangConfig(data);
    } catch {
      setCoupangConfig({ configured: false, missing: ["COUPANG_ACCESS_KEY", "COUPANG_SECRET_KEY", "COUPANG_VENDOR_ID"] });
    }
  }

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

  async function ingest(event: FormEvent) {
    event.preventDefault();
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeProductUrl(url);
    } catch (caught) {
      setError(toErrorMessage(caught));
      return;
    }
    setBusy("상세페이지 수집");
    setError(null);
    setWorkspace(null);
    window.localStorage.removeItem("shorts-commerce-product-id");
    try {
      setUrl(normalizedUrl);
      const response = await fetch("/api/products/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl })
      });
      const data = await parseResponse<Workspace>(response);
      setWorkspace(data);
      window.localStorage.setItem("shorts-commerce-product-id", data.id);
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function ingestCoupangSellerProduct(event: FormEvent) {
    event.preventDefault();
    const cleanId = sellerProductId.trim();
    if (!/^\d+$/.test(cleanId)) {
      setError("쿠팡 sellerProductId는 숫자만 입력해야 합니다.");
      return;
    }

    setBusy("쿠팡 WING API 조회");
    setError(null);
    setWorkspace(null);
    window.localStorage.removeItem("shorts-commerce-product-id");
    try {
      const response = await fetch("/api/coupang/seller-product", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sellerProductId: cleanId })
      });
      const data = await parseResponse<Workspace>(response);
      setWorkspace(data);
      window.localStorage.setItem("shorts-commerce-product-id", data.id);
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(null);
      void loadCoupangConfig();
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
      const data = await parseResponse<Workspace>(response);
      setWorkspace(data);
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  const actionDisabled = Boolean(busy || !workspace);

  return (
    <div className="page-shell">
      <div className="app-frame">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <Play size={18} />
            </div>
            Shorts Commerce
          </div>
          <nav className="nav-list">
            {navItems.map(([label, Icon], index) => (
              <a key={label} className={`nav-item ${index === 0 ? "active" : ""}`} href={`#${label}`}>
                <Icon size={17} />
                {label}
              </a>
            ))}
          </nav>
        </aside>
        <main className="main">
          <section className="topbar">
            <p className="eyebrow">Evidence-first sales design</p>
            <h1>상세페이지 근거로 쇼츠 판매 설계</h1>
            <p className="muted">
              자동 업로드 없이, 상품 사실과 사용 증거를 먼저 잠그고 20~35초 9:16 영상 변형을 생성합니다.
            </p>
          </section>

          <section className="panel" id="수집">
            <h2>상품 URL</h2>
            <form className="form-row" onSubmit={ingest}>
              <input
                className="input"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                type="text"
                required
              />
              <button className="button" disabled={Boolean(busy)}>
                {busy === "상세페이지 수집" ? <Loader2 size={18} /> : <Search size={18} />}
                수집
              </button>
            </form>
            <div className="grid" style={{ marginTop: 18 }}>
              <div>
                <h3>쿠팡 WING Open API</h3>
                <p className="muted">판매자센터 등록상품 데이터 소스</p>
              </div>
              <form className="form-row" onSubmit={ingestCoupangSellerProduct}>
                <input
                  className="input"
                  value={sellerProductId}
                  onChange={(event) => setSellerProductId(event.target.value)}
                  placeholder="sellerProductId"
                  inputMode="numeric"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  type="text"
                  required
                />
                <button className="button secondary" disabled={Boolean(busy)}>
                  {busy === "쿠팡 WING API 조회" ? <Loader2 size={18} /> : <KeyRound size={18} />}
                  WING API 조회
                </button>
              </form>
              {coupangConfig ? (
                coupangConfig.configured ? (
                  <p className="status-pass">쿠팡 WING API 환경변수가 설정되어 있습니다.</p>
                ) : (
                  <p className="status-warn">필요한 환경변수: {coupangConfig.missing.join(", ")}</p>
                )
              ) : null}
            </div>
            {error ? <p className="status-fail">{error}</p> : null}
            {busy ? <p className="muted">{busy} 진행 중입니다.</p> : null}
          </section>

          {workspace ? (
            <>
              <section className="panel">
                <div className="stat-grid">
                  <div className="stat">
                    <span className="muted">상태</span>
                    <strong>{workspace.status}</strong>
                  </div>
                  <div className="stat">
                    <span className="muted">근거</span>
                    <strong>{workspace.evidence.length}</strong>
                  </div>
                  <div className="stat">
                    <span className="muted">이미지</span>
                    <strong>{workspace.assets.length}</strong>
                  </div>
                  <div className="stat">
                    <span className="muted">영상 후보</span>
                    <strong>{workspace.storyboards.length}</strong>
                  </div>
                </div>
                <div className="footer-actions" style={{ marginTop: 16 }}>
                  <button
                    className="button secondary"
                    disabled={actionDisabled}
                    onClick={() => runAction("판매 설계 전체 실행", `/api/products/${workspace.id}/run-planning`)}
                  >
                    <Sparkles size={18} />
                    판매 설계 실행
                  </button>
                  <button
                    className="button"
                    disabled={actionDisabled || workspace.storyboards.length === 0}
                    onClick={() => runAction("MP4 3개 렌더", `/api/products/${workspace.id}/render`)}
                  >
                    <Film size={18} />
                    MP4 3개 렌더
                  </button>
                </div>
              </section>

              <section className="grid two">
                <div className="panel" id="근거">
                  <h2>ProductTruth</h2>
                  {truth ? (
                    <div className="grid">
                      <div>
                        <h3>{truth.productName ?? workspace.productName ?? "상품명 미확인"}</h3>
                        <p className="muted">{truth.price?.rawText || "가격 근거 없음"}</p>
                      </div>
                      <div className="pill-row">
                        {(truth.missingInfo ?? []).map((item) => (
                          <span className="pill status-warn" key={item}>
                            {item} 필요
                          </span>
                        ))}
                      </div>
                      <ul className="list">
                        {(truth.allowedClaims ?? []).slice(0, 5).map((claim) => (
                          <li className="list-item" key={claim.text}>
                            <BadgeCheck size={16} /> {claim.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <button
                      className="button secondary"
                      disabled={actionDisabled}
                      onClick={() => runAction("ProductTruth 생성", `/api/products/${workspace.id}/extract-truth`)}
                    >
                      <FileCheck2 size={18} />
                      근거 추출
                    </button>
                  )}
                </div>

                <div className="panel" id="점수">
                  <h2>쇼츠 판매 가능성</h2>
                  {workspace.potential ? (
                    <div className="grid">
                      <div className="score">{workspace.potential.score}</div>
                      <p>{workspace.potential.rationale}</p>
                      <div className="pill-row">
                        {Object.entries(workspace.potential.breakdown).map(([key, value]) => (
                          <span className="pill" key={key}>
                            {key} {Math.round(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      className="button secondary"
                      disabled={actionDisabled || !truth}
                      onClick={() => runAction("판매 가능성 점수화", `/api/products/${workspace.id}/score-potential`)}
                    >
                      <Gauge size={18} />
                      점수화
                    </button>
                  )}
                </div>
              </section>

              <section className="grid two">
                <div className="panel" id="각도">
                  <h2>판매 각도</h2>
                  <div className="footer-actions">
                    <button
                      className="button ghost"
                      disabled={actionDisabled || !truth}
                      onClick={() => runAction("판매 각도 생성", `/api/products/${workspace.id}/generate-angles`)}
                    >
                      재생성
                    </button>
                  </div>
                  <ul className="list">
                    {workspace.angles.slice(0, 8).map((angle) => (
                      <li className="list-item" key={angle.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <strong>{angle.angle}</strong>
                          <span className="score">{angle.score}</span>
                        </div>
                        <p className="muted">{angle.customerPain}</p>
                        <p>{angle.corePromise}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="panel" id="후킹">
                  <h2>후킹 후보</h2>
                  <div className="footer-actions">
                    <button
                      className="button ghost"
                      disabled={actionDisabled || workspace.angles.length === 0}
                      onClick={() => runAction("후킹 30개 생성", `/api/products/${workspace.id}/generate-hooks`)}
                    >
                      30개 생성
                    </button>
                  </div>
                  <ul className="list">
                    {workspace.hooks.slice(0, 10).map((hook) => (
                      <li className="list-item" key={hook.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <strong>{hook.text}</strong>
                          <span className={hook.decision === "keep" ? "status-pass" : "status-warn"}>
                            {hook.score}
                          </span>
                        </div>
                        <p className="muted">
                          {hook.pattern} · {hook.decision}
                          {hook.rejectionReason ? ` · ${hook.rejectionReason}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="muted">통과 후킹 {keptHooks.length}개</p>
                </div>
              </section>

              <section className="panel" id="기획">
                <h2>스토리보드</h2>
                <div className="footer-actions">
                  <button
                    className="button ghost"
                    disabled={actionDisabled || workspace.hooks.length === 0}
                    onClick={() => runAction("스토리보드 생성", `/api/products/${workspace.id}/generate-storyboards`)}
                  >
                    기획안 생성
                  </button>
                </div>
                <div className="grid three">
                  {workspace.storyboards.slice(0, 5).map((storyboard) => (
                    <div className="list-item" key={storyboard.id}>
                      <h3>Variant {storyboard.renderVariant}</h3>
                      <p className="muted">{storyboard.durationSec}초 · 9:16</p>
                      <div className="timeline">
                        {storyboard.proofScenes.map((scene) => (
                          <div className="scene" key={scene.id}>
                            <div className="scene-time">{scene.durationSec}s</div>
                            <div>
                              <strong>{scene.type}</strong>
                              <p>{scene.onScreenText}</p>
                              {scene.requiresUserShot ? <p className="status-warn">{scene.shotRequest}</p> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid two">
                <div className="panel" id="렌더">
                  <h2>렌더와 다운로드</h2>
                  <ul className="list">
                    {workspace.renders.map((render) => (
                      <li className="list-item" key={render.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <div>
                            <strong>Variant {render.variant}</strong>
                            <p className="muted">
                              {render.status} · {render.durationSec}초
                            </p>
                            {render.error ? <p className="status-fail">{render.error}</p> : null}
                          </div>
                          {render.status === "complete" ? (
                            <a className="button secondary" href={`/api/renders/${render.id}/download`}>
                              <Download size={18} />
                              MP4
                            </a>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {workspace.renders.length === 0 ? <p className="muted">아직 렌더된 영상이 없습니다.</p> : null}
                </div>

                <div className="panel">
                  <h2>촬영 컷 요청</h2>
                  <ul className="list">
                    {workspace.shotRequests.map((request) => (
                      <li className="list-item" key={request.id}>
                        <strong>{request.description}</strong>
                        <p className="muted">{request.reason}</p>
                      </li>
                    ))}
                  </ul>
                  {workspace.shotRequests.length === 0 ? <p className="muted">현재 추가 촬영 요청이 없습니다.</p> : null}
                </div>
              </section>

              <section className="grid two" id="업로드">
                <div className="panel">
                  <h2>수동 업로드 패키지</h2>
                  {conversion ? (
                    <div className="grid">
                      <h3>제목 후보</h3>
                      <ul className="list">
                        {(conversion.titles ?? []).map((title) => (
                          <li className="list-item" key={`${title.videoRenderId}-${title.text}`}>
                            {title.text} <span className="muted">({title.score})</span>
                          </li>
                        ))}
                      </ul>
                      <h3>해시태그</h3>
                      <div className="pill-row">
                        {(conversion.hashtags ?? []).map((tag) => (
                          <span className="pill" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3>체크리스트</h3>
                      <ul className="list">
                        {(conversion.manualUploadChecklist ?? []).map((item) => (
                          <li className="list-item" key={item}>
                            <ShieldCheck size={16} /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <button
                      className="button secondary"
                      disabled={actionDisabled || workspace.storyboards.length === 0}
                      onClick={() => runAction("업로드 패키지 생성", `/api/products/${workspace.id}/conversion-package`)}
                    >
                      <LinkIcon size={18} />
                      패키지 생성
                    </button>
                  )}
                </div>

                <div className="panel">
                  <h2>성과 입력</h2>
                  <form className="grid" onSubmit={submitPerformance}>
                    <input
                      className="input"
                      placeholder="조회수"
                      inputMode="numeric"
                      value={performance.views}
                      onChange={(event) => setPerformance((prev) => ({ ...prev, views: event.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="유지율 %"
                      inputMode="decimal"
                      value={performance.retentionRate}
                      onChange={(event) => setPerformance((prev) => ({ ...prev, retentionRate: event.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="클릭률 %"
                      inputMode="decimal"
                      value={performance.clickThroughRate}
                      onChange={(event) => setPerformance((prev) => ({ ...prev, clickThroughRate: event.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="구매 수"
                      inputMode="numeric"
                      value={performance.purchases}
                      onChange={(event) => setPerformance((prev) => ({ ...prev, purchases: event.target.value }))}
                    />
                    <textarea
                      className="textarea"
                      placeholder="댓글 반응이나 업로드 메모"
                      value={performance.notes}
                      onChange={(event) => setPerformance((prev) => ({ ...prev, notes: event.target.value }))}
                    />
                    <button className="button" disabled={actionDisabled}>
                      <BarChart3 size={18} />
                      개선안 생성
                    </button>
                  </form>
                  <ul className="list" style={{ marginTop: 16 }}>
                    {workspace.improvements.map((item) => (
                      <li className="list-item" key={item.id}>
                        {(item.payload.recommendations ?? []).map((recommendation) => (
                          <p key={recommendation}>{recommendation}</p>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
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
