/** Dimensionless illustrative mechanics, not fitted paper data. */
export const jForce = (extension: number): number => extension <= 0 ? 0 : .04 * extension + .96 * extension ** 6;
export function antagonistForces(prestretch: number, displacement: number) {
  const left = jForce(prestretch + displacement), right = jForce(prestretch - displacement);
  return {left, right, applied: left - right};
}
export const STANCE_FRACTION = .62;
export function runningForces(cycle: number, prestretch: number, pace: number) {
  const p = ((cycle % 1) + 1) % 1, stance = p < STANCE_FRACTION, u = Math.min(p / STANCE_FRACTION, 1);
  const compression = stance ? .23 * Math.sin(Math.PI * u) : 0;
  const target = (1.7 + 1.6 * (pace - .8)) * compression;
  const passive = stance ? antagonistForces(prestretch, compression).applied : 0;
  return {stance, u, compression, target, passive, active: target - passive};
}
