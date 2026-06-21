  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));

  // ---------- hero particle network ----------
  (function () {
    const canvas = document.getElementById('particleCanvas');
    const hero = document.getElementById('top');
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W, H, DPR;
    function resize() {
      const rect = hero.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    const COUNT = window.innerWidth < 700 ? 36 : 64;
    const LINK_DIST = 130;
    const dots = [];

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function makeDot() {
      return {
        x: 0, y: 0,
        scatterX: 0, scatterY: 0,
        vx: 0, vy: 0,
        r: rand(1.3, 2.4),
        baseAlpha: rand(0.35, 0.85)
      };
    }

    for (let i = 0; i < COUNT; i++) dots.push(makeDot());

    // assign random scatter positions (normalized 0-1) and start dots there directly
    function scatterDots() {
      dots.forEach(d => {
        d.scatterX = rand(0.04, 0.96);
        d.scatterY = rand(0.08, 0.92);
        d.x = d.scatterX;
        d.y = d.scatterY;
        d.vx = 0; d.vy = 0;
      });
    }
    scatterDots();

    // ---------- shape pool: 12 formations, one picked at random per mouseleave ----------
    // each generator returns { targets: [{x,y,hub}], links: [[i,j], ...] }
    // x/y normalized 0-1 within the hero bounds, links drawn between target indices
    const N = dots.length;

    function fillRemainder(targets, anchors, spread) {
      // distribute any leftover dots as small satellites around the nearest anchor
      let idx = targets.length;
      let a = 0;
      while (idx < N) {
        const anchor = anchors[a % anchors.length];
        const angle = rand(0, Math.PI * 2);
        const dist = rand(spread * 0.3, spread);
        targets.push({ x: anchor.x + Math.cos(angle) * dist, y: anchor.y + Math.sin(angle) * dist, hub: false });
        idx++; a++;
      }
      return targets;
    }

    const shapeBuilders = [

      // 1. hub & satellite network
      function networkGraph() {
        const hubs = [
          { x: 0.50, y: 0.46 }, { x: 0.28, y: 0.28 }, { x: 0.74, y: 0.26 },
          { x: 0.22, y: 0.68 }, { x: 0.78, y: 0.70 }, { x: 0.50, y: 0.82 }
        ];
        const targets = hubs.map(h => ({ x: h.x, y: h.y, hub: true }));
        fillRemainder(targets, hubs, 0.10);
        return { targets, links: [[0,1],[0,2],[0,3],[0,4],[0,5],[1,2],[3,4]] };
      },

      // 2. circuit grid (rows/columns like a PCB)
      function circuitGrid() {
        const cols = 5, rows = 4;
        const hubs = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            hubs.push({ x: 0.18 + c * 0.16, y: 0.22 + r * 0.2, hub: (r + c) % 3 === 0 });
          }
        }
        const targets = hubs.slice(0, Math.min(hubs.length, N));
        fillRemainder(targets, hubs, 0.05);
        const links = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const i = r * cols + c;
            if (i + 1 < targets.length) links.push([i, i + 1]);
          }
        }
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows - 1; r++) {
            const i = r * cols + c, j = (r + 1) * cols + c;
            if (j < targets.length && (r + c) % 2 === 0) links.push([i, j]);
          }
        }
        return { targets, links };
      },

      // 3. ring
      function ring() {
        const count = Math.min(16, N);
        const cx = 0.5, cy = 0.5, rx = 0.30, ry = 0.30;
        const hubs = [];
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          hubs.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, hub: i % 4 === 0 });
        }
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.04);
        const links = hubs.map((_, i) => [i, (i + 1) % count]);
        return { targets, links };
      },

      // 4. binary tree
      function binaryTree() {
        const hubs = [
          { x: 0.5, y: 0.16, hub: true },
          { x: 0.30, y: 0.40, hub: true }, { x: 0.70, y: 0.40, hub: true },
          { x: 0.18, y: 0.64, hub: false }, { x: 0.42, y: 0.64, hub: false },
          { x: 0.58, y: 0.64, hub: false }, { x: 0.82, y: 0.64, hub: false },
          { x: 0.12, y: 0.86, hub: false }, { x: 0.30, y: 0.86, hub: false },
          { x: 0.70, y: 0.86, hub: false }, { x: 0.88, y: 0.86, hub: false }
        ];
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.045);
        const links = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7],[3,8],[6,9],[6,10]];
        return { targets, links };
      },

      // 5. request/response arc
      function requestArc() {
        const count = Math.min(14, N);
        const hubs = [];
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          hubs.push({ x: 0.14 + t * 0.72, y: 0.5 - Math.sin(t * Math.PI) * 0.30, hub: i % 5 === 0 });
        }
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.04);
        const links = hubs.slice(0, -1).map((_, i) => [i, i + 1]);
        return { targets, links };
      },

      // 6. hexagon outline
      function hexagon() {
        const hubs = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          hubs.push({ x: 0.5 + Math.cos(a) * 0.30, y: 0.5 + Math.sin(a) * 0.30, hub: true });
        }
        hubs.push({ x: 0.5, y: 0.5, hub: true });
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.06);
        const links = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[6,0],[6,2],[6,4]];
        return { targets, links };
      },

      // 7. radial star burst
      function starBurst() {
        const spikes = 7;
        const hubs = [{ x: 0.5, y: 0.5, hub: true }];
        for (let i = 0; i < spikes; i++) {
          const a = (i / spikes) * Math.PI * 2;
          hubs.push({ x: 0.5 + Math.cos(a) * 0.32, y: 0.5 + Math.sin(a) * 0.32, hub: i % 2 === 0 });
        }
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.045);
        const links = hubs.slice(1).map((_, i) => [0, i + 1]);
        return { targets, links };
      },

      // 8. double orbit
      function doubleOrbit() {
        const inner = 6, outer = 9;
        const hubs = [{ x: 0.5, y: 0.5, hub: true }];
        for (let i = 0; i < inner; i++) {
          const a = (i / inner) * Math.PI * 2;
          hubs.push({ x: 0.5 + Math.cos(a) * 0.16, y: 0.5 + Math.sin(a) * 0.16, hub: false });
        }
        for (let i = 0; i < outer; i++) {
          const a = (i / outer) * Math.PI * 2 + 0.3;
          hubs.push({ x: 0.5 + Math.cos(a) * 0.32, y: 0.5 + Math.sin(a) * 0.32, hub: i % 3 === 0 });
        }
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.035);
        const links = [];
        for (let i = 1; i <= inner; i++) links.push([0, i]);
        for (let i = 0; i < inner; i++) links.push([1 + i, 1 + ((i + 1) % inner)]);
        return { targets, links };
      },

      // 9. sine wave
      function wave() {
        const count = Math.min(16, N);
        const hubs = [];
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          hubs.push({ x: 0.10 + t * 0.80, y: 0.5 + Math.sin(t * Math.PI * 2.4) * 0.22, hub: i % 4 === 0 });
        }
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.035);
        const links = hubs.slice(0, -1).map((_, i) => [i, i + 1]);
        return { targets, links };
      },

      // 10. triangle grid
      function triangleGrid() {
        const hubs = [
          { x: 0.5, y: 0.18, hub: true },
          { x: 0.30, y: 0.42, hub: false }, { x: 0.70, y: 0.42, hub: false },
          { x: 0.18, y: 0.66, hub: true }, { x: 0.50, y: 0.66, hub: false }, { x: 0.82, y: 0.66, hub: true },
          { x: 0.34, y: 0.88, hub: false }, { x: 0.66, y: 0.88, hub: false }
        ];
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.045);
        const links = [[0,1],[0,2],[1,2],[1,3],[1,4],[2,4],[2,5],[3,4],[4,5],[3,6],[4,6],[4,7],[5,7]];
        return { targets, links };
      },

      // 11. spiral
      function spiral() {
        const count = Math.min(18, N);
        const hubs = [];
        for (let i = 0; i < count; i++) {
          const t = i / count;
          const a = t * Math.PI * 5;
          const r = 0.04 + t * 0.30;
          hubs.push({ x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r, hub: i % 5 === 0 });
        }
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.03);
        const links = hubs.slice(0, -1).map((_, i) => [i, i + 1]);
        return { targets, links };
      },

      // 12. server stack
      function serverStack() {
        const rows = 4, perRow = 4;
        const hubs = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < perRow; c++) {
            hubs.push({ x: 0.30 + c * 0.14, y: 0.24 + r * 0.18, hub: c === 0 || c === perRow - 1 });
          }
        }
        const targets = hubs.slice();
        fillRemainder(targets, hubs, 0.04);
        const links = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < perRow - 1; c++) {
            const i = r * perRow + c;
            links.push([i, i + 1]);
          }
        }
        return { targets, links };
      }
    ];

    let currentShape = shapeBuilders[0]();

    function pickRandomShape() {
      const i = Math.floor(rand(0, shapeBuilders.length));
      currentShape = shapeBuilders[Math.min(i, shapeBuilders.length - 1)]();
    }

    let mode = 'scatter'; // 'scatter' | 'cursor' | 'network'
    let mouse = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, active: false };
    let switchedAt = performance.now();

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      mouse.vx = nx - (mouse.x === -9999 ? nx : mouse.x);
      mouse.vy = ny - (mouse.y === -9999 ? ny : mouse.y);
      mouse.px = mouse.x; mouse.py = mouse.y;
      mouse.x = nx; mouse.y = ny;
      mouse.active = true;
      if (mode !== 'cursor') { mode = 'cursor'; switchedAt = performance.now(); }
    });

    hero.addEventListener('mouseleave', () => {
      mouse.active = false;
      mode = 'network';
      switchedAt = performance.now();
      pickRandomShape();
    });

    // aspect ratio correction so radial pull/spray reads as circular, not stretched
    function ar() { return H > 0 && W > 0 ? (W / H) : 1; }

    function step() {
      const w = W, h = H;
      ctx.clearRect(0, 0, w, h);

      if (mode === 'network') {
        const targets = currentShape.targets;
        const links = currentShape.links;
        const t = Math.min(1, (performance.now() - switchedAt) / 900);
        const ease = 1 - Math.pow(1 - t, 3);
        ctx.strokeStyle = 'rgba(201, 165, 132, 0.22)';
        ctx.lineWidth = 1;
        links.forEach(([a, b]) => {
          const ta = targets[a], tb = targets[b];
          if (!ta || !tb) return;
          ctx.beginPath();
          ctx.moveTo(ta.x * w, ta.y * h);
          ctx.lineTo(tb.x * w, tb.y * h);
          ctx.globalAlpha = ease;
          ctx.stroke();
        });
        ctx.globalAlpha = 1;

        dots.forEach((d, i) => {
          const tgt = targets[i] || targets[i % targets.length];
          d.x += (tgt.x - d.x) * 0.06;
          d.y += (tgt.y - d.y) * 0.06;
          d.vx *= 0.8; d.vy *= 0.8;
        });
      } else if (mode === 'cursor' && mouse.active) {
        // wind-spray physics: cursor motion pushes nearby dots outward along
        // its direction of travel, like a comet trail — not a magnet to a point
        const a = ar();
        const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
        const dirX = speed > 0.0001 ? mouse.vx / speed : 0;
        const dirY = speed > 0.0001 ? mouse.vy / speed : 0;
        const kick = Math.min(speed * 14, 0.9);

        dots.forEach(d => {
          const dx = (d.x - mouse.x) * a;
          const dy = (d.y - mouse.y);
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
          const radius = 0.22;
          if (dist < radius) {
            const falloff = 1 - dist / radius;
            // push outward away from cursor, biased along travel direction
            const nx = dx / dist, ny = dy / dist;
            d.vx += (nx * 0.6 + dirX * 0.9) * falloff * kick * 0.05;
            d.vy += (ny * 0.6 + dirY * 0.9) * falloff * kick * 0.05;
          }
          // gentle drag + return toward scatter so the field never empties out
          d.vx *= 0.90;
          d.vy *= 0.90;
          d.vx += (d.scatterX - d.x) * 0.0025;
          d.vy += (d.scatterY - d.y) * 0.0025;
          d.x += d.vx;
          d.y += d.vy;
        });

        mouse.vx *= 0.5; mouse.vy *= 0.5;
      } else {
        dots.forEach(d => {
          d.vx *= 0.9; d.vy *= 0.9;
          d.x += (d.scatterX - d.x) * 0.02 + d.vx;
          d.y += (d.scatterY - d.y) * 0.02 + d.vy;
        });
      }

      // proximity links (subtle web between nearby dots)
      const wpx = dots.map(d => d.x * w);
      const hpx = dots.map(d => d.y * h);
      ctx.lineWidth = 1;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = wpx[i] - wpx[j];
          const dy = hpx[i] - hpx[j];
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const al = (1 - dist / LINK_DIST) * (mode === 'network' ? 0.16 : 0.08);
            ctx.strokeStyle = `rgba(154, 149, 138, ${al})`;
            ctx.beginPath();
            ctx.moveTo(wpx[i], hpx[i]);
            ctx.lineTo(wpx[j], hpx[j]);
            ctx.stroke();
          }
        }
      }

      // dots — drawn as short streaks along velocity when moving fast (comet effect)
      dots.forEach((d, i) => {
        const x = d.x * w, y = d.y * h;
        const isHub = mode === 'network' && currentShape.targets[i] && currentShape.targets[i].hub;
        const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy) * w;

        if (!isHub && speed > 1.2) {
          // streak: short line along the direction of motion
          const len = Math.min(speed * 1.8, 26);
          const dirx = d.vx === 0 && d.vy === 0 ? 0 : d.vx / (Math.sqrt(d.vx * d.vx + d.vy * d.vy) || 1);
          const diry = d.vx === 0 && d.vy === 0 ? 0 : d.vy / (Math.sqrt(d.vx * d.vx + d.vy * d.vy) || 1);
          const grad = ctx.createLinearGradient(x - dirx * len, y - diry * len, x, y);
          grad.addColorStop(0, `rgba(201, 165, 132, 0)`);
          grad.addColorStop(1, `rgba(245, 243, 238, ${Math.min(d.baseAlpha + 0.15, 0.95)})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = d.r * 1.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - dirx * len, y - diry * len);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, isHub ? d.r * 2.1 : d.r, 0, Math.PI * 2);
          ctx.fillStyle = isHub
            ? `rgba(201, 165, 132, 0.9)`
            : `rgba(245, 243, 238, ${d.baseAlpha * 0.55})`;
          ctx.fill();
        }
      });

      requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', resize);

    if (!reduceMotion) {
      requestAnimationFrame(step);
    } else {
      step_static();
    }

    function step_static() {
      const w = W, h = H;
      ctx.clearRect(0, 0, w, h);
      dots.forEach(d => {
        const x = d.scatterX * w, y = d.scatterY * h;
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 243, 238, ${d.baseAlpha * 0.5})`;
        ctx.fill();
      });
    }
  })();
