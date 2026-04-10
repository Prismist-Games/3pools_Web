import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

// --- Geometry helpers ---

const DIMENSION_LABELS = ['健康', '香气', '口感', '味道', '外观'];
const DIMENSION_ICONS = ['💚', '🌸', '👅', '🍴', '👁️'];

const CENTER_X = 200;
const CENTER_Y = 200;
const MAX_RADIUS = 150;
const GRID_RINGS = 5; // 0, 2, 4, 6, 8, 10 → 5 rings at 20%, 40%, 60%, 80%, 100%

// Pentagon vertex angle: starting from top (-90°), going clockwise
const vertexAngle = (i) => (-Math.PI / 2) + (2 * Math.PI * i / 5);

// Get (x, y) for a given axis index and value (0-10)
const getPoint = (axisIndex, value) => {
    const angle = vertexAngle(axisIndex);
    const r = (value / 10) * MAX_RADIUS;
    return [CENTER_X + r * Math.cos(angle), CENTER_Y + r * Math.sin(angle)];
};

// Build polygon points string from an array of 5 values
const polygonPoints = (values) =>
    values.map((v, i) => getPoint(i, v).join(',')).join(' ');

// Shoelace formula for polygon area (given array of [x,y] vertices)
const polygonArea = (pts) => {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += pts[i][0] * pts[j][1];
        area -= pts[j][0] * pts[i][1];
    }
    return Math.abs(area) / 2;
};

// Ray-casting point-in-polygon test
const pointInPolygon = (px, py, polygon) => {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        if (((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
};

// Find intersection of segment (p1→p2) with segment (p3→p4), returns t parameter on first segment or null
const segmentIntersect = (p1, p2, p3, p4) => {
    const dx1 = p2[0] - p1[0], dy1 = p2[1] - p1[1];
    const dx2 = p4[0] - p3[0], dy2 = p4[1] - p3[1];
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((p3[0] - p1[0]) * dy2 - (p3[1] - p1[1]) * dx2) / denom;
    const u = ((p3[0] - p1[0]) * dy1 - (p3[1] - p1[1]) * dx1) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return t;
    return null;
};

// Reflect velocity vector off an edge (given as two points)
const reflectVelocity = (vx, vy, edgeP1, edgeP2) => {
    // Edge direction
    const ex = edgeP2[0] - edgeP1[0];
    const ey = edgeP2[1] - edgeP1[1];
    const len = Math.sqrt(ex * ex + ey * ey);
    // Outward normal (perpendicular, pointing outward from polygon center)
    let nx = -ey / len;
    let ny = ex / len;
    // Ensure normal points outward (away from center)
    const midX = (edgeP1[0] + edgeP2[0]) / 2;
    const midY = (edgeP1[1] + edgeP2[1]) / 2;
    if (nx * (midX - CENTER_X) + ny * (midY - CENTER_Y) < 0) {
        nx = -nx;
        ny = -ny;
    }
    // Reflect: v' = v - 2(v·n)n
    const dot = vx * nx + vy * ny;
    return [vx - 2 * dot * nx, vy - 2 * dot * ny];
};

// Generate random point inside a polygon (rejection sampling)
const randomPointInPolygon = (polygon) => {
    // Bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of polygon) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    for (let tries = 0; tries < 1000; tries++) {
        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);
        if (pointInPolygon(x, y, polygon)) return [x, y];
    }
    // Fallback: center
    return [CENTER_X, CENTER_Y];
};

const DispatchJudgment = ({ onClose }) => {
    const { t } = useLanguage();

    // Input state
    const [heroStats, setHeroStats] = useState([7, 5, 3, 6, 4]);
    const [missionReqs, setMissionReqs] = useState([6, 6, 6, 6, 6]);

    // Ball animation state
    const [ballPos, setBallPos] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [result, setResult] = useState(null); // 'success' | 'failure' | null

    const ballRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
    const animFrameRef = useRef(null);
    const startTimeRef = useRef(0);
    // Store snapshot of polygon data for animation (avoids stale closure issues)
    const animDataRef = useRef(null);

    // Compute polygons (for rendering)
    const missionPolygon = missionReqs.map((v, i) => getPoint(i, v));
    const overlapValues = missionReqs.map((m, i) => Math.min(m, heroStats[i]));
    const overlapPolygon = overlapValues.map((v, i) => getPoint(i, v));

    // Overlap percentage
    const missionArea = polygonArea(missionPolygon);
    const overlapArea = polygonArea(overlapPolygon);
    const overlapPct = missionArea > 0 ? Math.round((overlapArea / missionArea) * 100) : 0;

    // Update an input value
    const updateHero = (idx, val) => {
        const v = Math.max(0, Math.min(10, Number(val) || 0));
        setHeroStats(prev => { const next = [...prev]; next[idx] = v; return next; });
    };
    const updateMission = (idx, val) => {
        const v = Math.max(0, Math.min(10, Number(val) || 0));
        setMissionReqs(prev => { const next = [...prev]; next[idx] = v; return next; });
    };

    // Animation loop — reads from refs to avoid stale closures
    // Uses linear deceleration (sliding friction) for natural "glide to stop" feel
    const animateStep = useCallback(() => {
        const ball = ballRef.current;
        const { missionPoly, overlapPoly } = animDataRef.current;
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

        // Proportional friction: deceleration scales with speed
        // Fast → slows noticeably; slow → barely decelerates, creating a long gentle glide
        const FRICTION = 0.994;
        const STOP_THRESHOLD = 0.12; // ~7 px/sec, barely visible crawl

        // Stop condition: speed too low to perceive, or safety timeout
        const elapsed = Date.now() - startTimeRef.current;
        if (speed <= STOP_THRESHOLD || elapsed > 15000) {
            ball.vx = 0;
            ball.vy = 0;
            setBallPos([ball.x, ball.y]);
            const inOverlap = pointInPolygon(ball.x, ball.y, overlapPoly);
            setResult(inOverlap ? 'success' : 'failure');
            setIsAnimating(false);
            return;
        }

        // Apply proportional friction
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;

        // Proposed new position
        let newX = ball.x + ball.vx;
        let newY = ball.y + ball.vy;

        // Check collision with mission polygon edges
        const n = missionPoly.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const t = segmentIntersect(
                [ball.x, ball.y], [newX, newY],
                missionPoly[i], missionPoly[j]
            );
            if (t !== null && t > 0) {
                // Move ball to just before intersection
                newX = ball.x + (newX - ball.x) * t * 0.95;
                newY = ball.y + (newY - ball.y) * t * 0.95;
                // Reflect velocity with energy loss (restitution)
                const [rvx, rvy] = reflectVelocity(ball.vx, ball.vy, missionPoly[i], missionPoly[j]);
                const RESTITUTION = 0.94;
                ball.vx = rvx * RESTITUTION;
                ball.vy = rvy * RESTITUTION;
                break;
            }
        }

        // Extra safety: if new position is outside polygon, push toward center
        if (!pointInPolygon(newX, newY, missionPoly)) {
            const dx = CENTER_X - newX;
            const dy = CENTER_Y - newY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                newX += dx / dist * 3;
                newY += dy / dist * 3;
            }
        }

        ball.x = newX;
        ball.y = newY;
        setBallPos([ball.x, ball.y]);

        animFrameRef.current = requestAnimationFrame(animateStep);
    }, []);

    // Start judgment
    const startJudgment = useCallback(() => {
        const missionPoly = missionReqs.map((v, i) => getPoint(i, v));
        const overlapVals = missionReqs.map((m, i) => Math.min(m, heroStats[i]));
        const overlapPoly = overlapVals.map((v, i) => getPoint(i, v));

        // Check mission polygon has non-zero area
        if (polygonArea(missionPoly) < 1) return;

        // Snapshot polygon data for animation
        animDataRef.current = { missionPoly, overlapPoly };

        setResult(null);
        setIsAnimating(true);
        startTimeRef.current = Date.now();

        // Random start position inside mission polygon
        const [sx, sy] = randomPointInPolygon(missionPoly);

        // Random direction, higher initial speed for dramatic start
        const angle = Math.random() * 2 * Math.PI;
        const initSpeed = 3 + Math.random() * 2; // 3-5 px per frame
        ballRef.current = {
            x: sx, y: sy,
            vx: initSpeed * Math.cos(angle),
            vy: initSpeed * Math.sin(angle),
        };
        setBallPos([sx, sy]);

        animFrameRef.current = requestAnimationFrame(animateStep);
    }, [missionReqs, heroStats, animateStep]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []);

    // Concentric pentagon grid rings
    const gridRings = [];
    for (let ring = 1; ring <= GRID_RINGS; ring++) {
        const val = (ring / GRID_RINGS) * 10;
        const pts = Array.from({ length: 5 }, (_, i) => getPoint(i, val).join(',')).join(' ');
        gridRings.push(pts);
    }

    // Axis lines from center to each vertex (at max)
    const axisLines = Array.from({ length: 5 }, (_, i) => getPoint(i, 10));

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-auto flex flex-col md:flex-row">

                {/* Left: Input Panel */}
                <div className="w-full md:w-72 flex-shrink-0 p-5 border-b md:border-b-0 md:border-r border-gray-700">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-white">{t('派遣判定')}</h2>
                        <button onClick={onClose}
                            className="text-gray-400 hover:text-white text-xl leading-none transition-colors">
                            &times;
                        </button>
                    </div>

                    {/* Hero Stats */}
                    <div className="mb-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400 mb-2">{t('英雄数值')}</h3>
                        <div className="space-y-1.5">
                            {DIMENSION_LABELS.map((label, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-base w-6 text-center">{DIMENSION_ICONS[i]}</span>
                                    <span className="text-xs text-gray-300 w-10">{t(label)}</span>
                                    <input
                                        type="range" min="0" max="10" step="1"
                                        value={heroStats[i]}
                                        onChange={(e) => updateHero(i, e.target.value)}
                                        disabled={isAnimating}
                                        className="flex-1 h-1.5 accent-amber-500"
                                    />
                                    <span className="text-xs font-bold text-amber-400 w-5 text-right">{heroStats[i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mission Requirements */}
                    <div className="mb-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-400 mb-2">{t('任务要求')}</h3>
                        <div className="space-y-1.5">
                            {DIMENSION_LABELS.map((label, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-base w-6 text-center">{DIMENSION_ICONS[i]}</span>
                                    <span className="text-xs text-gray-300 w-10">{t(label)}</span>
                                    <input
                                        type="range" min="0" max="10" step="1"
                                        value={missionReqs[i]}
                                        onChange={(e) => updateMission(i, e.target.value)}
                                        disabled={isAnimating}
                                        className="flex-1 h-1.5 accent-blue-500"
                                    />
                                    <span className="text-xs font-bold text-blue-400 w-5 text-right">{missionReqs[i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Start button */}
                    <button
                        onClick={startJudgment}
                        disabled={isAnimating}
                        className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
                            isAnimating
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-amber-500 text-gray-900 hover:bg-amber-400 active:scale-95'
                        }`}
                    >
                        {isAnimating ? t('判定中...') : t('开始判定')}
                    </button>

                    {/* Result display */}
                    {result && (
                        <div className={`mt-3 p-3 rounded-lg text-center font-bold text-sm border ${
                            result === 'success'
                                ? 'bg-green-900/50 border-green-500 text-green-400'
                                : 'bg-red-900/50 border-red-500 text-red-400'
                        }`}>
                            {result === 'success' ? t('判定成功') : t('判定失败')}
                        </div>
                    )}

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="w-full mt-3 py-2 rounded-lg font-bold text-xs text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-colors"
                    >
                        {t('关闭')}
                    </button>
                </div>

                {/* Right: Visualization Panel */}
                <div className="flex-1 flex items-center justify-center p-4 min-h-[420px]">
                    <svg viewBox="0 0 400 400" className="w-full h-full max-w-[400px] max-h-[400px]">
                        {/* Background */}
                        <rect x="0" y="0" width="400" height="400" fill="transparent" />

                        {/* Concentric grid rings */}
                        {gridRings.map((pts, i) => (
                            <polygon
                                key={`ring-${i}`}
                                points={pts}
                                fill="none"
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth="1"
                            />
                        ))}

                        {/* Axis lines */}
                        {axisLines.map(([x, y], i) => (
                            <line
                                key={`axis-${i}`}
                                x1={CENTER_X} y1={CENTER_Y}
                                x2={x} y2={y}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="1"
                            />
                        ))}

                        {/* Mission polygon (outer boundary) */}
                        <polygon
                            points={polygonPoints(missionReqs)}
                            fill="rgba(255,255,255,0.03)"
                            stroke="rgba(148,163,184,0.6)"
                            strokeWidth="2"
                            strokeDasharray="6 3"
                        />

                        {/* Overlap area */}
                        <polygon
                            points={polygonPoints(overlapValues)}
                            fill="rgba(234,179,8,0.15)"
                            stroke="none"
                        />

                        {/* Hero polygon */}
                        <polygon
                            points={polygonPoints(heroStats)}
                            fill="rgba(234,179,8,0.25)"
                            stroke="rgb(234,179,8)"
                            strokeWidth="2"
                        />

                        {/* Vertex dots and labels */}
                        {DIMENSION_LABELS.map((label, i) => {
                            const [lx, ly] = getPoint(i, 11.5);
                            const [dx, dy] = getPoint(i, 10);
                            return (
                                <g key={`label-${i}`}>
                                    <circle cx={dx} cy={dy} r="2" fill="rgba(255,255,255,0.3)" />
                                    <text
                                        x={lx} y={ly}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="text-[11px] font-bold"
                                        fill="rgba(255,255,255,0.7)"
                                    >
                                        {DIMENSION_ICONS[i]}
                                    </text>
                                    <text
                                        x={lx} y={ly + 14}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="text-[9px]"
                                        fill="rgba(255,255,255,0.4)"
                                    >
                                        {t(label)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Tick marks along axes */}
                        {Array.from({ length: 5 }, (_, axisIdx) =>
                            Array.from({ length: GRID_RINGS }, (_, ring) => {
                                const val = ((ring + 1) / GRID_RINGS) * 10;
                                const [tx, ty] = getPoint(axisIdx, val);
                                return (
                                    <circle
                                        key={`tick-${axisIdx}-${ring}`}
                                        cx={tx} cy={ty} r="1.5"
                                        fill="rgba(255,255,255,0.12)"
                                    />
                                );
                            })
                        )}

                        {/* Bouncing ball */}
                        {ballPos && (
                            <>
                                {/* Ball glow */}
                                <circle
                                    cx={ballPos[0]} cy={ballPos[1]} r="10"
                                    fill={result === 'success' ? 'rgba(74,222,128,0.3)' : result === 'failure' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.15)'}
                                />
                                {/* Ball */}
                                <circle
                                    cx={ballPos[0]} cy={ballPos[1]} r="5"
                                    fill={result === 'success' ? '#4ade80' : result === 'failure' ? '#f87171' : '#e2e8f0'}
                                    stroke={result === 'success' ? '#22c55e' : result === 'failure' ? '#ef4444' : '#94a3b8'}
                                    strokeWidth="1.5"
                                />
                            </>
                        )}

                        {/* Overlap percentage */}
                        <text
                            x="30" y="380"
                            className="text-[28px] font-black"
                            fill="rgba(234,179,8,0.8)"
                        >
                            {overlapPct}%
                        </text>
                        <text
                            x="30" y="395"
                            className="text-[9px]"
                            fill="rgba(255,255,255,0.3)"
                        >
                            {t('覆盖率')}
                        </text>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default DispatchJudgment;
