"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Point = void 0;
/**
 * Point Class
 * A "Point" is a 2D-vector (x, y)
 * Just like the mathematical vector, you can substract and add vectors
 * There are also a lot helper functions for vector operations
 *
 * This is helpful for future simplifying code related with axis computation.
 */
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    // ---- Setters ----
    set coord({ x = 0, y = 0 }) {
        this.x = x;
        this.y = y;
    }
    // ---- Getters ----
    /**
     * @returns ||`this`|| (the modulo, or length of `this`)
     */
    get modulo() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    /**
     * @returns the angle between x-axis and `this`, in degrees
     */
    get angle() {
        const angle = Math.atan2(this.y, this.x);
        return angle * 180 / Math.PI;
    }
    // ---- Other Methods ----
    /**
     * @description Multiplying a point by a scalar `k`
     * @param k
     * @returns `k` * `this`
     */
    scale(k) {
        return new Point(k * this.x, k * this.y);
    }
    /**
     * @description Add two points
     * @param P
     * @returns `this` + `P`
     */
    add(P) {
        return new Point(this.x + P.x, this.y + P.y);
    }
    /**
     * @description Subtracting two points
     * @param P
     * @returns `this` - `P`
     */
    subtract(P) {
        return this.add(P.scale(-1));
    }
    /**
     * @param P
     * @returns the distance from `this` to `P`
     */
    distance_to(P) {
        return this.subtract(P).modulo;
    }
    /**
     * @param Ps
     * @returns the `P : Point` in `Ps` that is closest to this point
     */
    closest(Ps) {
        const res = Ps.reduce((a, b) => {
            // We take the "closer" one
            if (this.distance_to(a) < this.distance_to(b)) {
                return a;
            }
            return b;
        }, Ps[0]);
        return res;
    }
    /**
     * @param P
     * @returns the angle between `P` and `this`, in degrees
     */
    angle_between(P) {
        return P.subtract(this).angle;
    }
}
exports.Point = Point;
