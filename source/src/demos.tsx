'use client';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {Play, Pause} from 'lucide-react';
import {antagonistForces, runningForces, STANCE_FRACTION} from './demo-physics';
import './demos.css';
import {runningPose} from './running-gait';

export type DemoKind = 'antagonist' | 'joint' | 'running' | 'coil' | 'curve' | 'lights';
const BLUE = '#24577c', GREEN = '#358879', ORANGE = '#c77940', INK = '#344954', TAU = 2 * Math.PI;
const round = (n: number) => n.toFixed(2);

function useMotion(period: number) {
  const root = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(true), [awake, setAwake] = useState(!document.hidden), [cycle, setCycle] = useState(.09);
  const elapsed = useRef(.09);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {if (media.matches) setPlaying(false);};
    media.addEventListener('change', change);
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), {threshold: .05});
    if (root.current) observer.observe(root.current);
    const visibility = () => setAwake(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => {observer.disconnect(); media.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility);};
  }, []);
  useEffect(() => {
    if (!playing || !visible || !awake) return;
    let frame = 0, last = 0, drawn = 0;
    const tick = (now: number) => {
      if (last) elapsed.current += Math.min(now - last, 100) / (1000 * period);
      last = now;
      if (now - drawn > 30) {setCycle(elapsed.current); drawn = now;}
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, visible, awake, period]);
  return {root, cycle, playing, toggle: () => setPlaying(p => !p)};
}

function Coil({x1, y1, x2, y2, force = 0, color = BLUE, slack = false, turns = 9}: {x1: number; y1: number; x2: number; y2: number; force?: number; color?: string; slack?: boolean; turns?: number}) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy) || 1;
  const path = Array.from({length: 141}, (_, i) => {
    const t = i / 140, core = Math.max(0, Math.min(1, (t - .1) / .8));
    const wave = t < .1 || t > .9 ? 0 : Math.sin(core * turns * TAU) * (slack ? 3.4 : 6.5);
    const sag = slack ? 16 * Math.sin(Math.PI * t) : 0;
    return `${i ? 'L' : 'M'}${round(x1 + dx * t - dy / length * wave)},${round(y1 + dy * t + dx / length * wave + sag)}`;
  }).join(' ');
  return <g opacity={slack ? .52 : 1}><path d={path} fill="none" stroke="#d9e1e3" strokeWidth="6.2" strokeLinecap="round"/><path d={path} fill="none" stroke={color} strokeWidth={2.2 + 1.3 * Math.min(force, 1)} strokeLinecap="round"/><path d={path} fill="none" stroke="white" strokeOpacity=".34" strokeWidth=".65"/></g>;
}

function Arrow({x1, y1, x2, y2, color = BLUE, width = 2}: {x1: number; y1: number; x2: number; y2: number; color?: string; width?: number}) {
  const angle = Math.atan2(y2 - y1, x2 - x1), a = angle + 2.6, b = angle - 2.6;
  if (Math.hypot(x2 - x1, y2 - y1) < 2) return null;
  return <g stroke={color} fill="none" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"><path d={`M${x1} ${y1}L${x2} ${y2}`}/><path d={`M${x2 + 6 * Math.cos(a)} ${y2 + 6 * Math.sin(a)}L${x2} ${y2}L${x2 + 6 * Math.cos(b)} ${y2 + 6 * Math.sin(b)}`}/></g>;
}

function Control({label, value, min = 0, max = .75, step = .01, onChange, output}: {label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void; output: string}) {
  const id = useId();
  return <div className="mechanics-control"><label htmlFor={id}><span>{label}</span><output>{output}</output></label><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/></div>;
}

function Frame({title, subtitle, status, motion, children, controls, details}: {title: string; subtitle: string; status: string; motion: ReturnType<typeof useMotion>; children: ReactNode; controls: ReactNode; details: ReactNode}) {
  return <div ref={motion.root} className="demo research-demo" data-animation={title} data-cycle={round(motion.cycle)}>
    <div className="mechanics-header"><div><div className="mechanics-kicker"><span className={motion.playing ? 'motion-dot' : 'motion-dot paused'}/>{title}</div><p>{subtitle}</p></div><button type="button" className="mechanics-play" onClick={motion.toggle} aria-label={`${motion.playing ? 'Pause' : 'Play'} ${title} animation`}>{motion.playing ? <Pause size={13}/> : <Play size={13}/>}<span>{motion.playing ? 'Pause' : 'Play'}</span></button></div>
    <div className="mechanics-status">{status}<span>Illustrative mechanics</span></div>
    <div className="mechanics-panels">{children}</div><div className="mechanics-controls">{controls}</div>
    <details className="mechanics-details"><summary>Model & paper</summary>{details}<p>Based on <a href="https://arxiv.org/abs/2602.00260" target="_blank" rel="noreferrer">Principles of Use of Tensile J-Curve Materials in Antagonistic Arrangements</a>, Fig. 6. The animation is an explanatory schematic; its normalized curves are not experimental data.</p></details>
  </div>;
}

function ForcePlot({prestretch, displacement, rotary = false}: {prestretch: number; displacement: number; rotary?: boolean}) {
  const plot = {x: 42, y: 35, w: 232, h: 132}, px = (x: number) => plot.x + (x + 1) / 2 * plot.w, py = (y: number) => plot.y + (1 - y) / 2 * plot.h;
  const paths = useMemo(() => [0, prestretch].map(s => Array.from({length: 161}, (_, i) => {
    const x = (2 * i / 160 - 1) * (1 - s);
    return `${i ? 'L' : 'M'}${round(px(x))},${round(py(antagonistForces(s, x).applied))}`;
  }).join(' ')), [prestretch]);
  const f = antagonistForces(prestretch, displacement);
  return <svg className="mechanics-chart" viewBox="0 0 310 290" role="img" aria-label={rotary ? 'Live normalized applied torque versus rotation, with individual ligament tensions' : 'Live net applied force versus displacement, with individual ligament tensions'}>
    <text x="22" y="19" className="chart-title">{rotary ? 'Torque–rotation response' : 'Force–displacement response'}</text>
    <rect x={px(-(1 - prestretch))} y={plot.y} width={(1 - prestretch) * plot.w} height={plot.h} rx="2" fill="#edf3f4"/>
    {[.5, -.5].map(y => <path key={y} d={`M${plot.x} ${py(y)}h${plot.w}`} className="mechanics-grid"/>)}
    <path d={`M${plot.x} ${py(0)}h${plot.w}M${px(0)} ${plot.y}v${plot.h}`} className="mechanics-axis"/>
    <path d={paths[0]} stroke="#b6c4ca" strokeWidth="1.7" strokeDasharray="4 4" fill="none"/><path d={paths[1]} stroke={BLUE} strokeWidth="2.6" fill="none"/>
    <path d={`M${px(displacement)} ${py(0)}V${py(f.applied)}`} stroke={BLUE} strokeDasharray="2 3" opacity=".45"/><circle cx={px(displacement)} cy={py(f.applied)} r="5.5" fill={BLUE} stroke="white" strokeWidth="2"/>
    <text x="27" y={plot.y + 4} textAnchor="end">+1</text><text x="27" y={plot.y + plot.h + 4} textAnchor="end">−1</text><text x={plot.x} y="184" textAnchor="middle">−1</text><text x={px(0)} y="184" textAnchor="middle">0</text><text x={plot.x + plot.w} y="184" textAnchor="middle">+1</text><text x="159" y="201" textAnchor="middle">{rotary ? 'rθ / dmax' : 'Displacement / dmax'}</text>
    <text x="22" y="225" className="chart-small">Ligament tensions / Fmax</text>
    {([{name: 'Left', value: f.left, color: BLUE}, {name: 'Right', value: f.right, color: GREEN}]).map((bar, i) => <g key={bar.name}><text x="22" y={244 + i * 22}>{bar.name}</text><rect x="66" y={235 + i * 22} width="166" height="7" rx="3.5" fill="#e7edef"/><rect x="66" y={235 + i * 22} width={166 * bar.value} height="7" rx="3.5" fill={bar.color}/><text x="267" y={244 + i * 22} textAnchor="end" className="chart-value">{bar.value.toFixed(2)}</text></g>)}
  </svg>;
}

function AntagonistDemo() {
  const [prestretch, setPrestretch] = useState(.2), motion = useMotion(5.8);
  const displacement = .94 * (1 - prestretch) * Math.sin(motion.cycle * TAU), force = antagonistForces(prestretch, displacement);
  const cx = 250 + 75 * displacement, left = 110 - 75 * prestretch, right = 390 + 75 * prestretch;
  const gradient = useId();
  const status = Math.abs(displacement) < .025 ? 'Balanced at the center' : `${displacement > 0 ? 'Left' : 'Right'} ligament stretches · ${displacement > 0 ? 'right' : 'left'} ligament relaxes`;
  return <Frame title="Antagonistic translation" subtitle="Two tensile ligaments. One self-centering motion." status={status} motion={motion}
    controls={<><Control label="Pre-stretch · Δs / dmax" value={prestretch} onChange={setPrestretch} output={prestretch.toFixed(2)}/><div className="mechanics-insight"><strong>{Math.round((1 - prestretch) * 100)}% travel available</strong><span>More pre-stretch stiffens the center and narrows the motion range.</span></div></>}
    details={<p>The external force required to hold the block is Fₘ = F(Δs + dₘ) − F(Δs − dₘ); the ligaments exert the opposite restoring force (Eqs. 3–4). An unloaded ligament goes slack. Here F(e) = 0.04e + 0.96e⁶ for e ≥ 0 and zero otherwise, where e is extension / dmax. Motion stays inside |dₘ| ≤ dmax − Δs. Gray dashed curve: zero pre-stretch. Colored curve: current pre-stretch. Plot force is normalized by the single-ligament Fmax.</p>}>
    <svg className="mechanics-scene" viewBox="0 0 500 290" role="img" aria-label="A block oscillates between two coiled ligaments. The lengthening ligament pulls it back toward the center.">
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#eef2f2"/><stop offset="1" stopColor="#bac9cd"/></linearGradient></defs>
      <path d="M49 151H451" stroke="#dce4e7" strokeWidth="13" strokeLinecap="round"/><path d="M49 150H451" stroke="white" strokeWidth="3"/><path d="M250 66V209" className="mechanics-guide"/>
      <rect x={250 - 75 * (1 - prestretch)} y="210" width={150 * (1 - prestretch)} height="4" rx="2" fill="#d8e5e8"/><circle cx={cx} cy="212" r="4" fill={BLUE}/><text x="250" y="237" textAnchor="middle" className="scene-small">Available displacement</text>
      {[left, right].map((x, i) => <g key={i}><rect x={x - 5} y="93" width="10" height="68" rx="2" fill="#c7d1d5"/><path d={`M${x + (i ? 5 : -5)} 99l${i ? 7 : -7} -7m${i ? -7 : 7} 23l${i ? 7 : -7} -7m${i ? -7 : 7} 23l${i ? 7 : -7} -7m${i ? -7 : 7} 23l${i ? 7 : -7} -7`} stroke="#93a6ae" strokeWidth="1.3"/><text x={x} y="180" textAnchor="middle" className="scene-small">Fixed</text></g>)}
      <Coil x1={left + 5} y1={122} x2={cx - 25} y2={122} force={force.left} color={BLUE} slack={prestretch + displacement < 0}/><Coil x1={cx + 25} y1={122} x2={right - 5} y2={122} force={force.right} color={GREEN} slack={prestretch - displacement < 0}/>
      <rect x={cx - 25} y="105" width="50" height="42" rx="5" fill={`url(#${gradient})`} stroke="#8c9fa8" strokeWidth="1.3"/><circle cx={cx} cy="125" r="4" fill="#f8fbfc" stroke="#80959f"/><circle cx={cx - 14} cy="149" r="5" fill="#7f939d"/><circle cx={cx + 14} cy="149" r="5" fill="#7f939d"/>
      <Arrow x1={cx - 5} y1={93} x2={cx - 5 - 60 * force.left} y2={93} color={BLUE}/><Arrow x1={cx + 5} y1={93} x2={cx + 5 + 60 * force.right} y2={93} color={GREEN}/>
      <text x={(left + cx - 25) / 2} y="73" textAnchor="middle" className="scene-label" style={{fill: BLUE}}>Left ligament</text><text x={(cx + 25 + right) / 2} y="73" textAnchor="middle" className="scene-label" style={{fill: GREEN}}>Right ligament</text><text x="250" y="271" textAnchor="middle" className="scene-equation">Fₘ = F(Δs + dₘ) − F(Δs − dₘ)</text>
    </svg><ForcePlot prestretch={prestretch} displacement={displacement}/>
  </Frame>;
}

function JointDemo() {
  const [prestretch, setPrestretch] = useState(.3), motion = useMotion(6.5);
  const displacement = .92 * (1 - prestretch) * Math.sin(motion.cycle * TAU), theta = 60 * displacement / 48, force = antagonistForces(prestretch, displacement);
  const cx = 250, cy = 166, r = 48, ly = 102 + 60 * (prestretch + displacement), ry = 102 + 60 * (prestretch - displacement), angle = theta * 180 / Math.PI;
  return <Frame title="Antagonistic joint" subtitle="The same J-curve response, translated into rotation." status={`Joint angle ${angle > 0 ? '+' : ''}${Math.round(angle)}° · ${Math.abs(angle) < 2 ? 'centered' : 'passive torque acts toward center'}`} motion={motion}
    controls={<><Control label="Pre-stretch · Δs / dmax" value={prestretch} onChange={setPrestretch} output={prestretch.toFixed(2)}/><div className="mechanics-insight"><strong>Soft near center, firm near the limit</strong><span>Turn up pre-stretch to see the available rotation narrow.</span></div></>}
    details={<p>An ideal tendon route around a joint of radius r converts rotation to extension: dₘ = rθ. The holding torque is τ = r[F(Δs + rθ) − F(Δs − rθ)]; the passive joint torque acts in the opposite direction. This pulley schematic illustrates Fig. 6e using the same normalized, tensile-only material law as the translation demo. The vertical axis is τ / (rFmax), and the horizontal axis is rθ / dmax. The coil ends move by the corresponding arc length.</p>}>
    <svg className="mechanics-scene" viewBox="0 0 500 290" role="img" aria-label="A joint rotates against two oppositely routed tensile ligaments. One stretches as the other relaxes.">
      <path d="M250 30V166" stroke="#d0dadd" strokeWidth="19" strokeLinecap="round"/><path d="M190 30H310" stroke="#879da7" strokeWidth="9" strokeLinecap="round"/><text x="250" y="15" textAnchor="middle" className="scene-small">Fixed upper arm</text>
      <path d={`M${cx - r} ${ly}V${cy}A${r} ${r} 0 0 0 ${cx + r} ${cy}V${ry}`} fill="none" stroke="#8ca0a8" strokeWidth="2"/>
      <Coil x1={cx - r} y1={36} x2={cx - r} y2={ly} color={BLUE} force={force.left} slack={prestretch + displacement < 0}/><Coil x1={cx + r} y1={36} x2={cx + r} y2={ry} color={GREEN} force={force.right} slack={prestretch - displacement < 0}/><circle cx={cx - r} cy={ly} r="3" fill={BLUE}/><circle cx={cx + r} cy={ry} r="3" fill={GREEN}/>
      <path d="M250 172V266" className="mechanics-guide"/><path d={`M${250 + 87 * Math.sin(-.7)} ${166 + 87 * Math.cos(-.7)}A87 87 0 0 0 ${250 + 87 * Math.sin(.7)} ${166 + 87 * Math.cos(.7)}`} fill="none" stroke="#e0e8eb" strokeWidth="3"/>
      <g transform={`rotate(${-angle} ${cx} ${cy})`}><path d={`M${cx} ${cy}V255`} stroke="#8dabb5" strokeWidth="19" strokeLinecap="round"/><path d={`M${cx - 4} ${cy + 19}V245`} stroke="#c7d8dd" strokeWidth="3" strokeLinecap="round"/><circle cx={cx} cy="255" r="8" fill="#f7fafb" stroke="#708f9c" strokeWidth="2"/></g>
      <circle cx={cx} cy={cy} r={r} fill="#eef3f4" stroke="#9cb1ba" strokeWidth="2"/><circle cx={cx} cy={cy} r={r - 7} fill="none" stroke="#d8e3e7" strokeWidth="2"/>
      <g transform={`rotate(${-angle} ${cx} ${cy})`}><path d={`M${cx - 30} ${cy}H${cx + 30}M${cx} ${cy - 30}V${cy + 30}`} stroke="#a6bac3" strokeWidth="5" strokeLinecap="round"/><circle cx={cx} cy={cy - 31} r="3.5" fill={BLUE}/></g><circle cx={cx} cy={cy} r="11" fill="#f8fbfc" stroke="#758f9b" strokeWidth="2"/><circle cx={cx} cy={cy} r="3" fill="#758f9b"/>
      <text x="138" y="78" textAnchor="middle" className="scene-label" style={{fill: BLUE}}>Left</text><path d="M156 82L192 91" className="mechanics-leader"/><text x="362" y="78" textAnchor="middle" className="scene-label" style={{fill: GREEN}}>Right</text><path d="M344 82L308 91" className="mechanics-leader"/>
      <text x="108" y="201" className="scene-small">Tendon routing</text><text x="108" y="219" className="scene-equation">dₘ = rθ</text><path d="M176 198L199 172" className="mechanics-leader"/><text x="369" y="200" textAnchor="middle" className="scene-small">Pivot</text><path d="M349 195L305 173" className="mechanics-leader"/>
    </svg><ForcePlot prestretch={prestretch} displacement={displacement} rotary/>
  </Frame>;
}

function RunningPlot({cycle, prestretch, pace}: {cycle: number; prestretch: number; pace: number}) {
  const px = (x: number) => 38 + 238 * x, py = (y: number) => 125 - 90 * y;
  const traces = useMemo(() => (['target', 'passive', 'active'] as const).map(key => Array.from({length: 161}, (_, i) => `${i ? 'L' : 'M'}${round(px(i / 160))},${round(py(runningForces(i / 160, prestretch, pace)[key]))}`).join(' ')), [prestretch, pace]);
  const f = runningForces(cycle, prestretch, pace), p = cycle % 1;
  const series = [{name: 'Target', key: 'target' as const, color: INK}, {name: 'Passive', key: 'passive' as const, color: GREEN}, {name: 'Active', key: 'active' as const, color: ORANGE}];
  return <svg className="mechanics-chart" viewBox="0 0 310 290" role="img" aria-label="Force sharing across a prescribed stride. Target force equals passive spring force plus active actuator force, including negative actuator force when braking.">
    <text x="22" y="19" className="chart-title">Force in the highlighted leg</text><rect x={px(STANCE_FRACTION)} y="34" width={238 * (1 - STANCE_FRACTION)} height="144" fill="#eff2f3" rx="2"/>
    <path d="M38 35H276M38 80H276" className="mechanics-grid"/><path d="M38 34V178M38 125H276" className="mechanics-axis"/><text x="28" y="38" textAnchor="end">1</text><text x="28" y="128" textAnchor="end">0</text>
    {series.map((s, i) => <path key={s.key} d={traces[i]} fill="none" stroke={s.color} strokeWidth={i === 0 ? 1.8 : 2.5} strokeDasharray={i === 0 ? '4 4' : undefined}/>)}<path d={`M${px(p)} 35V178`} stroke="#9baeb7" strokeWidth="1" strokeDasharray="3 3"/>
    {series.map(s => <circle key={s.key} cx={px(p)} cy={py(f[s.key])} r="3.9" fill={s.color} stroke="white" strokeWidth="1.4"/>)}
    <text x={px(STANCE_FRACTION / 2)} y="195" textAnchor="middle">Stance</text><text x={px((1 + STANCE_FRACTION) / 2)} y="195" textAnchor="middle">Highlighted-leg swing</text><text x="22" y="218" className="chart-small">Normalized force · active can brake (−)</text>
    {series.map((s, i) => {const value = f[s.key], zero = 152, unit = 103; return <g key={s.key}><circle cx="25" cy={235 + i * 20} r="3" fill={s.color}/><text x="35" y={239 + i * 20}>{s.name}</text><path d={`M99 ${235 + i * 20}H259`} stroke="#e1e9ec" strokeWidth="5" strokeLinecap="round"/><path d={`M${zero} ${229 + i * 20}v12`} stroke="#acbbc2"/><path d={`M${zero} ${235 + i * 20}h${value * unit}`} stroke={s.color} strokeWidth="5" strokeLinecap="round"/><text x="291" y={239 + i * 20} textAnchor="end" className="chart-value">{value.toFixed(2)}</text></g>;})}
  </svg>;
}

export function RunningFigure({cycle, prestretch, pace}: {cycle: number; prestretch: number; pace: number}) {
  const pose = runningPose(cycle), f = runningForces(cycle, prestretch, pace);
  const {x: hx, y: hy} = pose.hip, {x: footx, y: footy} = pose.near.foot;
  const ground = 264, groundOffset = pose.groundOffset;
  const fade = (v: number) => {const t = Math.max(0, Math.min(1, v)); return t*t*(3 - 2*t);};
  const mechanicalOpacity = pose.near.stance ? 1 : Math.max(fade(1 - (pose.near.phase - STANCE_FRACTION)/.05), fade((pose.near.phase - .94)/.06));
  const legLength = Math.hypot(footx - hx, footy - hy), legAngle = -Math.atan2(footx - hx, footy - hy)*180/Math.PI;
  const armPath = (arm: typeof pose.nearArm) => `M${arm.shoulder.x} ${arm.shoulder.y}L${arm.elbow.x} ${arm.elbow.y}L${arm.hand.x} ${arm.hand.y}`;
  return (
    <svg className="mechanics-scene running-scene" data-stride={cycle.toFixed(3)} viewBox="0 0 500 290" role="img" aria-label="A running figure with an effective passive spring and an active linear actuator in parallel between hip and stance foot. The mechanism compresses and extends through an animated stance and flight cycle.">
      <path d="M35 264H466" stroke="#8faaa8" strokeWidth="1.6"/><path d="M35 266H466" stroke="#e9eeee" strokeWidth="7"/>
      {Array.from({length: 20}, (_, i) => <path key={i} d={`M${24 * i - groundOffset} 269l-6 8`} stroke="#ccd8d8" strokeWidth="1.1"/>)}<ellipse cx={hx} cy="267" rx={f.stance ? 51 : 37} ry="4" fill="#465d6110"/>
      <g data-limb="far-leg"><path d={`M${hx} ${hy}L${pose.far.knee.x} ${pose.far.knee.y}L${pose.far.foot.x} ${pose.far.foot.y}`} stroke="#b4c3ca" strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx={pose.far.knee.x} cy={pose.far.knee.y} r="5" fill="#a6b9c2"/><path d="M-9 0L2 0L15 1" transform={`translate(${pose.far.foot.x} ${pose.far.foot.y}) rotate(${pose.far.footAngle})`} stroke="#8ca5b0" strokeWidth="7" fill="none" strokeLinecap="round"/></g>
      <g data-limb="far-arm"><path d={armPath(pose.farArm)} stroke="#b4c3ca" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx={pose.farArm.hand.x} cy={pose.farArm.hand.y} r="4.5" fill="#b4c3ca"/></g>
      <path d={`M${hx} ${hy - 1}Q${hx + 5} ${hy - 32} ${hx + 14} ${hy - 56}`} stroke="#637d8a" strokeWidth="23" fill="none" strokeLinecap="round"/>
      <path d={`M${hx + 15} ${hy - 58}l5 -14`} stroke="#8aa1ad" strokeWidth="10" strokeLinecap="round"/><circle cx={hx + 22} cy={hy - 83} r="14" fill="#8aa1ad"/><path d={`M${hx + 34} ${hy - 85}l5 4-5 2`} fill="#8aa1ad"/>
      <g data-limb="near-arm"><path d={armPath(pose.nearArm)} stroke="#557785" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx={pose.nearArm.hand.x} cy={pose.nearArm.hand.y} r="4.5" fill="#557785"/></g>
      <path data-limb="near-leg" d={`M${hx} ${hy}L${pose.near.knee.x} ${pose.near.knee.y}L${footx} ${footy}`} stroke="#7b98a5" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <g opacity={mechanicalOpacity} transform={`translate(${hx} ${hy}) rotate(${legAngle})`}>
        <path d={`M-22 13H22M-22 ${legLength - 12}H22`} stroke="#7e969f" strokeWidth="7" strokeLinecap="round"/><Coil x1={-15} y1={17} x2={-15} y2={legLength - 16} force={f.passive} color={GREEN} turns={7}/>
        <path d={`M15 16V${legLength - 15}`} stroke="#c77940" strokeWidth="5" strokeLinecap="round"/><rect x="7" y="23" width="16" height={Math.max(28, legLength * .43)} rx="4" fill="#ecd9ca" stroke={ORANGE} strokeWidth="1.6"/><path d={`M11 29V${23 + legLength * .43 - 6}`} stroke="white" strokeWidth="2" opacity=".7"/>
        <circle cx="0" cy="0" r="13" fill="#f7faf9" stroke="#536e7a" strokeWidth="2"/><path d="M-6 0H6M0-6V6" stroke="#536e7a" strokeWidth="1.4"/><circle cx="0" cy={legLength} r="5" fill="#f6f9fa" stroke="#68818c" strokeWidth="2"/>
        {f.stance && <><Arrow x1={-29} y1={legLength - 36} x2={-29} y2={legLength - 36 - 48 * f.passive} color={GREEN}/><Arrow x1={31} y1={legLength - 36} x2={31} y2={legLength - 36 - 48 * f.active} color={ORANGE}/></>}
      </g>
      <path d="M-9 0L2 0L15 1" transform={`translate(${footx} ${footy}) rotate(${pose.near.footAngle})`} stroke="#506f79" strokeWidth="7" fill="none" strokeLinecap="round"/>{f.stance && <circle cx={footx} cy={ground} r="3" fill={GREEN}/>}
      <text x="55" y="98" className="scene-label" style={{fill: GREEN}}>Passive spring</text><text x="55" y="115" className="scene-small">Effective J-curve response</text><path d={`M166 111L${hx - 21} ${hy + 56}`} className="mechanics-leader"/>
      <text x="364" y="159" className="scene-label" style={{fill: ORANGE}}>Active actuator</text><text x="364" y="176" className="scene-small">Supplies the difference</text><path d={`M352 171L${hx + 25} ${hy + 78}`} className="mechanics-leader"/>
      <text x="55" y="229" className="scene-equation">Fₜ = Fₚ + Fₐ</text><Arrow x1={371} y1={49} x2={420} y2={49} color="#829a9c"/><text x="395" y="36" textAnchor="middle" className="scene-small">Run direction</text>
    </svg>);
}

function RunningDemo() {
  const [prestretch, setPrestretch] = useState(.6), [pace, setPace] = useState(1.15), motion = useMotion(1.65 / pace);
  const f = runningForces(motion.cycle, prestretch, pace), pose = runningPose(motion.cycle);
  return <Frame title="A spring-assisted running leg" subtitle="A tunable passive spring and an active actuator work in parallel." status={f.stance ? (f.u < .5 ? 'Stance · loading the leg' : 'Stance · returning spring energy') : (pose.far.stance ? 'Opposite-leg stance · highlighted leg swings' : 'Flight · both feet airborne')} motion={motion}
    controls={<><Control label="Passive pre-stretch · Δs / dmax" value={prestretch} onChange={setPrestretch} output={prestretch.toFixed(2)}/><Control label="Running pace · prescribed cycle" value={pace} min={.8} max={1.8} step={.05} onChange={setPace} output={`${pace.toFixed(2)}×`}/></>}
    details={<><p>Fig. 6g and Eq. 5 motivate the parallel architecture: Ftarget = ktarget ΔL = Fspring + Factuator. The green element represents an effective passive leg spring; a tensile ligament would require a transmission to provide this support. The orange actuator supplies the remaining force and can apply a negative force when the passive support exceeds the target.</p><p>This illustration prescribes alternating leg contact, knee flexion, and opposing arm swing with constant anatomical limb lengths. Planted feet move with the ground. The spring–actuator overlay is shown during the highlighted leg’s stance and fades during swing. The graph shows force in that leg only: its swing phase includes opposite-leg stance and brief flight intervals. Pace changes cycle rate and illustrative target stiffness. Passive force uses F(Δs + c) − F(Δs − c), with normalized compression c ≤ 0.23 and the same illustrative J-curve law as above. It demonstrates force sharing, not a validated running simulation or a prediction of energy savings.</p></>}>
    <RunningFigure cycle={motion.cycle} prestretch={prestretch} pace={pace}/><RunningPlot cycle={motion.cycle} prestretch={prestretch} pace={pace}/>
  </Frame>;
}

export default function Demo({kind, type}: {kind?: DemoKind; type?: DemoKind}) {
  const selected = type ?? kind ?? 'antagonist';
  if (selected === 'running' || selected === 'lights') return <RunningDemo/>;
  if (selected === 'joint' || selected === 'coil') return <JointDemo/>;
  return <AntagonistDemo/>;
}
