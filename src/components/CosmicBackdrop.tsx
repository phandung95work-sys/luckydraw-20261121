import React, { useEffect, useRef } from 'react';

interface CosmicBackdropProps {
  isSpinning: boolean;
  celebrateKey: number;
  backdropOpacity: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  isConfetti: boolean;
  rot: number;
  vRot: number;
}

export const CosmicBackdrop: React.FC<CosmicBackdropProps> = ({
  isSpinning,
  celebrateKey,
  backdropOpacity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spinningRef = useRef(isSpinning);
  const particlesRef = useRef<FireworkParticle[]>([]);

  useEffect(() => {
    spinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    if (celebrateKey === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    const palette = ['#FFE89E', '#F5C443', '#FFD166', '#FFF8DC', '#C92A42', '#34D399'];

    const spawnBurst = (cx: number, cy: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const speed = 2.2 + Math.random() * 6.8;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.4,
          life: 0,
          maxLife: 85 + Math.random() * 65,
          color: palette[Math.floor(Math.random() * palette.length)],
          size: 2 + Math.random() * 3.5,
          isConfetti: Math.random() > 0.55,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.22,
        });
      }
    };

    // Multi-wave stage fireworks
    spawnBurst(w * 0.22, h * 0.32, 55);
    spawnBurst(w * 0.78, h * 0.32, 55);
    spawnBurst(w * 0.5, h * 0.24, 70);

    const t1 = window.setTimeout(() => {
      spawnBurst(w * 0.34, h * 0.26, 55);
      spawnBurst(w * 0.66, h * 0.26, 55);
    }, 420);

    const t2 = window.setTimeout(() => {
      spawnBurst(w * 0.5, h * 0.34, 65);
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [celebrateKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let stars: Star[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      const count = Math.min(220, Math.floor((window.innerWidth * window.innerHeight) / 7200));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: (0.7 + Math.random() * 1.9) * dpr,
        alpha: 0.25 + Math.random() * 0.75,
        twinkleSpeed: 0.6 + Math.random() * 2.1,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    window.addEventListener('resize', resize);

    const drawCornerMesh = (w: number, h: number, time: number) => {
      const glow = 0.24 + Math.sin(time * 1.4) * 0.06;
      ctx.save();
      ctx.strokeStyle = `rgba(232, 184, 78, ${glow})`;
      ctx.lineWidth = 1.1;

      const corners = [
        // top-left
        [
          [0, 0], [w * 0.09, h * 0.03], [w * 0.14, 0], [w * 0.05, h * 0.14],
          [0, h * 0.2], [w * 0.11, h * 0.12], [w * 0.03, h * 0.29],
        ],
        // top-right
        [
          [w, 0], [w * 0.91, h * 0.03], [w * 0.86, 0], [w * 0.95, h * 0.14],
          [w, h * 0.2], [w * 0.89, h * 0.12], [w * 0.97, h * 0.29],
        ],
        // bottom-left
        [
          [0, h], [w * 0.08, h * 0.97], [w * 0.14, h], [w * 0.04, h * 0.84],
          [0, h * 0.78], [w * 0.1, h * 0.87], [w * 0.03, h * 0.69],
        ],
        // bottom-right
        [
          [w, h], [w * 0.92, h * 0.97], [w * 0.86, h], [w * 0.96, h * 0.84],
          [w, h * 0.78], [w * 0.9, h * 0.87], [w * 0.97, h * 0.69],
        ],
      ];

      const edges = [
        [0, 1], [1, 2], [0, 3], [1, 3], [1, 5], [2, 5],
        [3, 4], [3, 5], [4, 6], [3, 6], [5, 6],
      ];

      corners.forEach((pts, cIdx) => {
        ctx.beginPath();
        edges.forEach(([a, b]) => {
          ctx.moveTo(pts[a][0], pts[a][1]);
          ctx.lineTo(pts[b][0], pts[b][1]);
        });
        ctx.stroke();

        pts.forEach(([px, py], idx) => {
          if (idx === 0) return;
          const pulse = 0.55 + 0.45 * Math.sin(time * 2 + idx + cIdx);
          const rad = (idx === 3 || idx === 5 ? 3.2 : 1.8) * (window.devicePixelRatio || 1);
          const grad = ctx.createRadialGradient(px, py, 0, px, py, rad * 4.5);
          grad.addColorStop(0, `rgba(255, 240, 185, ${0.8 * pulse})`);
          grad.addColorStop(1, 'rgba(255, 210, 90, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, rad * 4.5, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.restore();
    };

    const drawParticleWaves = (w: number, h: number, time: number, boost: number) => {
      ctx.save();
      const ribbons = 7;
      const dotsPerRibbon = 76;
      const baseY = h * 0.62;

      for (let r = 0; r < ribbons; r++) {
        const offsetR = (r - ribbons / 2) * (h * 0.014);
        for (let i = 0; i <= dotsPerRibbon; i++) {
          const t = i / dotsPerRibbon;
          const x = t * w;
          const wave1 = Math.sin(t * 5.2 + time * (0.65 + boost * 0.8) + r * 0.32) * (h * 0.075);
          const wave2 = Math.cos(t * 9.5 - time * 0.4 + r * 0.2) * (h * 0.025);
          const y = baseY + offsetR + wave1 + wave2;

          // Fade slightly toward very center so stage text remains high contrast
          const distFromCenter = Math.abs(t - 0.5) * 2;
          const alpha = (0.14 + distFromCenter * 0.34) * (1 - Math.abs(r - ribbons / 2) / ribbons);
          const size = (1.1 + distFromCenter * 1.4) * (window.devicePixelRatio || 1);

          ctx.fillStyle = `rgba(248, 208, 108, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    let lastTime = performance.now();
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const time = now * 0.001;
      const w = canvas.width;
      const h = canvas.height;
      const boost = spinningRef.current ? 1 : 0;

      ctx.clearRect(0, 0, w, h);

      // Ambient gold radial aurora behind stage center
      const centerGlow = ctx.createRadialGradient(
        w * 0.5,
        h * 0.44,
        w * 0.02,
        w * 0.5,
        h * 0.44,
        w * (spinningRef.current ? 0.48 : 0.38)
      );
      centerGlow.addColorStop(0, `rgba(229, 173, 58, ${spinningRef.current ? 0.22 : 0.13})`);
      centerGlow.addColorStop(0.45, `rgba(165, 110, 32, ${spinningRef.current ? 0.09 : 0.05})`);
      centerGlow.addColorStop(1, 'rgba(3, 9, 23, 0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, w, h);

      // Stars
      for (const s of stars) {
        const a = s.alpha * (0.45 + 0.55 * Math.sin(time * s.twinkleSpeed + s.phase));
        ctx.fillStyle = `rgba(255, 244, 210, ${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      drawParticleWaves(w, h, time, boost);
      drawCornerMesh(w, h, time);

      // Fireworks / confetti
      const nextParticles: FireworkParticle[] = [];
      for (const p of particlesRef.current) {
        p.life += dt * 60;
        if (p.life >= p.maxLife) continue;

        p.vy += 0.095;
        p.vx *= 0.988;
        p.vy *= 0.988;
        p.x += p.vx * (window.devicePixelRatio || 1);
        p.y += p.vy * (window.devicePixelRatio || 1);
        p.rot += p.vRot;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.isConfetti) {
          const s = p.size * (window.devicePixelRatio || 1);
          ctx.fillRect(-s, -s * 0.45, s * 2, s * 0.9);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (window.devicePixelRatio || 1) * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        nextParticles.push(p);
      }
      particlesRef.current = nextParticles;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#030917]">
      {/* Deep navy radial base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 50% 35%, #0c224d 0%, #06132e 55%, #020713 100%)',
        }}
      />

      {/* Optional subtle blend of actual provided backdrop */}
      {backdropOpacity > 0 && (
        <img
          src="./backdrop.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center mix-blend-screen transition-opacity duration-700"
          style={{ opacity: backdropOpacity }}
        />
      )}

      {/* Animated constellation, waves & fireworks canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};
