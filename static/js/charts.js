/* ── CHARTS — Chart.js wrappers for the Binance dark theme ─────────────────── */
const Charts = (() => {
  const registry = {};

  function destroy(id) {
    if (registry[id]) { try { registry[id].destroy(); } catch {} delete registry[id]; }
  }

  const defaults = (overrides={}) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e2329',
        borderColor: '#2b3139',
        borderWidth: 1,
        titleColor: '#848e9c',
        bodyColor: '#eaecef',
        bodyFont: { family: "'JetBrains Mono',monospace", size: 12 },
        padding: 10,
      }
    },
    scales: {
      x: { grid:{color:'rgba(43,49,57,.6)'}, ticks:{color:'#474d57',font:{size:9}}, border:{display:false} },
      y: { grid:{color:'rgba(43,49,57,.6)'}, ticks:{color:'#474d57',font:{size:9}}, border:{display:false} },
    },
    ...overrides,
  });

  function area(canvasId, labels, values, color='#02c076', opts={}) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const h   = canvas.closest('.chart-wrap')?.clientHeight || 180;
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,   color+'50');
    grad.addColorStop(1,   color+'00');

    const cfg = defaults({
      scales: {
        x: { grid:{color:'rgba(43,49,57,.6)'}, ticks:{color:'#474d57',font:{size:9},maxTicksLimit:8}, border:{display:false} },
        y: { grid:{color:'rgba(43,49,57,.6)'}, ticks:{color:'#474d57',font:{size:9},
          callback: opts.yFmt || (v=>v)}, border:{display:false}, ...opts.yAxis },
      },
      plugins: {
        legend: {display:false},
        tooltip: { callbacks: { label: ctx => {
          const v = ctx.parsed.y;
          return opts.yFmt ? ' '+opts.yFmt(v) : ' '+v.toLocaleString();
        }}}
      },
      ...(opts.extra||{})
    });

    // Reference line
    if (opts.refLine !== undefined) {
      cfg.plugins.annotation = { annotations: { refLine: {
        type:'line', yMin:opts.refLine, yMax:opts.refLine,
        borderColor:'#f6465d', borderWidth:1.5, borderDash:[5,4],
      }}};
    }

    registry[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data:values, borderColor:color, borderWidth:2.5,
        fill:true, backgroundColor:grad, pointRadius:0, tension:0.4 }] },
      options: cfg,
    });
    return registry[canvasId];
  }

  function dualLine(canvasId, labels, lineA, lineB) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId); if (!canvas) return;
    registry[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [
        { data:lineA.data, borderColor:lineA.color, borderWidth:2.5, fill:false, pointRadius:0, tension:0.4, yAxisID:'yL', label:lineA.label },
        { data:lineB.data, borderColor:lineB.color, borderWidth:2, fill:false, pointRadius:0, tension:0.4, yAxisID:'yR', borderDash:[6,3], label:lineB.label },
      ]},
      options: defaults({
        scales: {
          x:  { grid:{color:'rgba(43,49,57,.6)'}, ticks:{color:'#474d57',font:{size:9}}, border:{display:false} },
          yL: { grid:{color:'rgba(43,49,57,.6)'}, position:'left',  ticks:{color:'#474d57',font:{size:9},callback:v=>`₨${(v/1000).toFixed(0)}K`}, border:{display:false} },
          yR: { grid:{display:false}, position:'right', ticks:{color:'#474d57',font:{size:9}}, border:{display:false} },
        },
      }),
    });
  }

  function hbar(canvasId, labels, values, colors, opts={}) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId); if (!canvas) return;
    const cfg = defaults({
      indexAxis: 'y',
      scales: {
        x: { grid:{color:'rgba(43,49,57,.6)'}, ticks:{color:'#474d57',font:{size:9},callback:v=>v+(opts.suffix||'%')}, border:{display:false} },
        y: { grid:{display:false}, ticks:{color:'#848e9c',font:{size:10}}, border:{display:false} },
      },
      plugins: {
        legend:{display:false},
        tooltip:{ callbacks:{ label:ctx=>` ${ctx.parsed.x.toFixed(1)}${opts.suffix||'%'}` }}
      },
    });
    if (opts.refLine !== undefined) {
      cfg.plugins.annotation = { annotations: { ref: {
        type:'line', xMin:opts.refLine, xMax:opts.refLine,
        borderColor:'#f6465d', borderWidth:1.5, borderDash:[5,4],
      }}};
    }
    registry[canvasId] = new Chart(canvas.getContext('2d'), {
      type:'bar',
      data:{ labels, datasets:[{ data:values, backgroundColor:colors, borderRadius:4, borderSkipped:false }]},
      options: cfg,
    });
  }

  function vbar(canvasId, labels, values, colors, opts={}) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId); if (!canvas) return;
    const cfg = defaults({
      scales: {
        x: { grid:{display:false}, ticks:{color:'#848e9c',font:{size:10}}, border:{display:false} },
        y: { grid:{color:'rgba(43,49,57,.6)'}, ticks:{color:'#474d57',font:{size:9},callback:opts.yFmt||(v=>v)}, border:{display:false} },
      },
      plugins: {
        legend:{display:false},
        tooltip:{ callbacks:{ label:ctx=>` ${opts.yFmt?opts.yFmt(ctx.parsed.y):ctx.parsed.y}` }}
      },
    });
    if (opts.refLine !== undefined) {
      cfg.plugins.annotation = { annotations: { ref: {
        type:'line', yMin:opts.refLine, yMax:opts.refLine,
        borderColor:'#f6465d', borderWidth:1.5, borderDash:[5,4],
      }}};
    }
    registry[canvasId] = new Chart(canvas.getContext('2d'), {
      type:'bar',
      data:{ labels, datasets:[{ data:values, backgroundColor:colors, borderRadius:4 }]},
      options: cfg,
    });
  }

  function doughnut(canvasId, labels, values, colors) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId); if (!canvas) return;
    registry[canvasId] = new Chart(canvas.getContext('2d'), {
      type:'doughnut',
      data:{ labels, datasets:[{ data:values, backgroundColor:colors, borderWidth:2, borderColor:'#1e2329' }]},
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#1e2329', borderColor:'#2b3139', borderWidth:1,
          bodyColor:'#eaecef', bodyFont:{family:"'JetBrains Mono',monospace",size:12},
          callbacks:{ label:ctx=>` ${fmtPKR(ctx.raw)}` }
        }},
        animation:{duration:400},
      }
    });
  }

  const fmtPKR = n => n>=1e7?`₨${(n/1e7).toFixed(2)}Cr`:n>=1e5?`₨${(n/1e5).toFixed(2)}L`:`₨${Math.round(n).toLocaleString()}`;

  return { area, dualLine, hbar, vbar, doughnut };
})();
window.Charts = Charts;
