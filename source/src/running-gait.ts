import {STANCE_FRACTION} from './demo-physics';

/** Prescribed side-view gait for illustration, not measured motion capture. */
export type Point = {x: number; y: number};
const TAU = 2 * Math.PI;
const wrap = (p: number) => ((p % 1) + 1) % 1;
export const GROUND_Y = 264;
const ANKLE_Y = GROUND_Y - 4, HIP_X = 235, CONTACT_X = 60;
export const THIGH_LENGTH = 85, SHIN_LENGTH = 85;
export const UPPER_ARM_LENGTH = 33, FOREARM_LENGTH = 30;
export const GROUND_SPEED = 2 * CONTACT_X / STANCE_FRACTION;

// Heel recovery, forward knee drive, then extension for the next contact.
// Hermite end tangents match the planted foot's velocity against the ground.
const swingKeys = [
  {p: STANCE_FRACTION, x: -60, lift: 0},
  {p: .50, x: -84, lift: 60},
  {p: .62, x: -45, lift: 85},
  {p: .76, x: 40, lift: 35},
  {p: .88, x: 80, lift: 20},
  {p: 1, x: 60, lift: 0},
];
function swingValue(p: number, key: 'x' | 'lift') {
  const i = Math.min(swingKeys.length - 2, swingKeys.findIndex((k, j) => j < swingKeys.length - 1 && p <= swingKeys[j + 1].p));
  const a = swingKeys[i], b = swingKeys[i + 1], dt = b.p - a.p, t = (p - a.p) / dt;
  const slope = (j: number) => j === 0 || j === swingKeys.length - 1
    ? (key === 'x' ? -GROUND_SPEED : 0)
    : (swingKeys[j + 1][key] - swingKeys[j - 1][key]) / (swingKeys[j + 1].p - swingKeys[j - 1].p);
  return (2*t**3 - 3*t**2 + 1)*a[key] + (t**3 - 2*t**2 + t)*dt*slope(i)
    + (-2*t**3 + 3*t**2)*b[key] + (t**3 - t**2)*dt*slope(i + 1);
}

/** One consistent forward knee-bending branch, with rigid limb segments. */
export function kneeBetween(hip: Point, ankle: Point): Point {
  const dx = ankle.x - hip.x, dy = ankle.y - hip.y, d = Math.hypot(dx, dy);
  const along = (THIGH_LENGTH**2 - SHIN_LENGTH**2 + d*d) / (2*d);
  const bend = Math.sqrt(Math.max(0, THIGH_LENGTH**2 - along*along));
  return {x: hip.x + along*dx/d + bend*dy/d, y: hip.y + along*dy/d - bend*dx/d};
}

export function runningPose(cycle: number) {
  const phase = wrap(cycle), supportPhase = phase % .5;
  const restLength = 164, shortening = 25;
  const contactHeight = Math.sqrt(restLength**2 - CONTACT_X**2);
  let hipY: number;
  if (supportPhase < STANCE_FRACTION) {
    const u = supportPhase / STANCE_FRACTION;
    const length = restLength - shortening*Math.sin(Math.PI*u);
    const x = CONTACT_X - GROUND_SPEED*supportPhase;
    hipY = ANKLE_Y - Math.sqrt(length*length - x*x);
  } else {
    const duration = .5 - STANCE_FRACTION, t = (supportPhase - STANCE_FRACTION) / duration;
    const verticalSpeed = (restLength*shortening*Math.PI/STANCE_FRACTION - CONTACT_X*GROUND_SPEED) / contactHeight;
    // Matches both the position and vertical velocity at toe-off/touchdown.
    hipY = ANKLE_Y - contactHeight - verticalSpeed*duration*t*(1 - t);
  }
  const hip = {x: HIP_X, y: hipY};
  const leg = (p: number) => {
    const stance = p < STANCE_FRACTION;
    const lift = stance ? 0 : Math.max(0, swingValue(p, 'lift'));
    const foot = {x: HIP_X + (stance ? CONTACT_X - GROUND_SPEED*p : swingValue(p, 'x')), y: ANKLE_Y - lift};
    const swing = (p - STANCE_FRACTION) / (1 - STANCE_FRACTION);
    const footAngle = stance ? 0 : 24*Math.sin(TAU*swing)*Math.min(1, lift/24);
    return {phase: p, stance, foot, knee: kneeBetween(hip, foot), footAngle};
  };
  const arm = (p: number, near: boolean) => {
    const shoulder = {x: HIP_X + (near ? 16 : 12), y: hipY - 53};
    // Arm swings opposite its same-side leg. Both elbows bend anatomically forward.
    const angle = -.58*Math.cos(TAU*(p + .07));
    const flex = (100 + 5*Math.sin(angle))*Math.PI/180;
    const elbow = {x: shoulder.x + UPPER_ARM_LENGTH*Math.sin(angle), y: shoulder.y + UPPER_ARM_LENGTH*Math.cos(angle)};
    const hand = {x: elbow.x + FOREARM_LENGTH*Math.sin(angle + flex), y: elbow.y + FOREARM_LENGTH*Math.cos(angle + flex)};
    return {shoulder, elbow, hand, angle};
  };
  const farPhase = wrap(phase + .5);
  return {hip, near: leg(phase), far: leg(farPhase), nearArm: arm(phase, true), farArm: arm(farPhase, false), groundOffset: (cycle*GROUND_SPEED)%24};
}
