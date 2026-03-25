/**
 * Point Class
 * A "Point" is a 2D-vector (x, y)
 * Just like the mathematical vector, you can substract and add vectors
 * There are also a lot helper functions for vector operations
 * 
 * This is helpful for future simplifying code related with axis computation.
 */
export class Point{
	public x : number;
	public y : number;
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	// ---- Setters ----
	
	public set coord({x = 0, y = 0}) {
		this.x = x;
		this.y = y;
	}

	// ---- Getters ----

	/**
	 * @returns ||`this`|| (the modulo, or length of `this`) 
	 */
	public get modulo(){
		return Math.sqrt(this.x**2 + this.y**2);
	}

	/**
	 * @returns the angle between x-axis and `this`, in degrees
	 */
	public get angle() {
		const angle : number = Math.atan2(this.y, this.x);
		return angle * 180 / Math.PI;
	}

	// ---- Other Methods ----

	/**
	 * @description Multiplying a point by a scalar `k`
	 * @param k 
	 * @returns `k` * `this`
	 */
	public scale(k : number){
		return new Point(k*this.x, k*this.y);
	}

	/**
	 * @description Add two points
	 * @param P 
	 * @returns `this` + `P`
	 */
	public add(P : Point) {
		return new Point(this.x + P.x, this.y + P.y);
	}

	/**
	 * @description Subtracting two points
	 * @param P 
	 * @returns `this` - `P`
	 */
	public subtract(P : Point) {
		return this.add(P.scale(-1));
	}

	/**
	 * @param P 
	 * @returns the distance from `this` to `P`
	 */
	public distance_to(P : Point) {
		return this.subtract(P).modulo;
	}

	/**
	 * @param Ps 
	 * @returns the `P : Point` in `Ps` that is closest to this point
	 */
	public closest(Ps : Point[]) : Point {
		const res = 
			Ps.reduce((a, b)=>{
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
	public angle_between(P : Point) {
		return P.subtract(this).angle;
	}
}