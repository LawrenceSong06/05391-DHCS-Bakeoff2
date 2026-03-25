/// <reference path="./svg.d.ts" />
/// <reference path="./svg.draggable.js" />
/// <reference path="framework.ts" />

// This constant sets the number of tasks per trial. You can change it while you are experimenting, but it should be set back to 10 for the actual Bakeoff.
const tasksLength = 10;

// Documentation on the main SVG.js library is here: https://svgjs.dev/docs/3.2
// Documentation on the "draggable" SVG.js plugin is here:
// https://github.com/svgdotjs/svg.draggable.js

// Defining a higher-order function "bound" that creates a "bounding" function
// this function can be used conveniently in the future when we are bounding
// a number. e.g. we do not want anything to go outside of the canvas, so we can call
// bound(0, canvasSize)(x) to bound x by [0, canvasSize]
/**
 * @description bound(`lower`, `upper`) returns a function f(x : number) : number that will
 * 				bound `x` in range [lower, upper]. 
 * 
 * @param lower the lower bound
 * @param upper the upper bound
 * 
 * @returns f(x : number) : number that "bounds" x by [lower, upper]. 
 */ 
function bound(lower : number, upper : number) {
	/**
	 * @description "bounds" x by [lower, upper]. 
	 * 
	 * @param x 
	 * 
	 * @returns x if `lower` <= x <= `upper`
	 * @returns `upper` if x > upper
	 * @returns `lower` if x < lower
	 */
	const res = 
		function(x : number) : number {
			return Math.min(Math.max(x, lower), upper);
		};

	return res;
}

/**
 * Point Class
 * A "Point" is a 2D-vector (x, y)
 * Just like the mathematical vector, you can substract and add vectors
 * There are also a lot helper functions for vector operations
 * 
 * This is helpful for future simplifying code related with axis computation.
 */
class Point{
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

/**
 * Shape Abstract Class
 * A "Shape" is anything that can be rendered in svg canvas
 */
abstract class Shape {
	public abstract set color(color: string);
	public abstract render() : void;
}

/**
 * This is an interpretation of svgdotjs.Rect
 * It defines a rectangle by 2 pivots on a diagonol
 */
class PivotRect extends Shape {
	private rect : svgdotjs.Rect;
	public pivot1 : Point;
	public pivot2 : Point;

	// Binding an existing rect
	// this can be understood as "interpretating" rect as a PivotRect 
	/**
	 * @param rect The rect to be interpreted as PivotRect
	 */
	constructor(rect : svgdotjs.Rect) {
		super();
		this.pivot1 = new Point(0,0);
		this.pivot2 = new Point(0,0);
		this.rect = rect; 
	}

	public set color(color : string) {
		this.rect.fill(color);
	}

	/**
	 * @description Sets the `x` and `y` of `pivot1`
	 * @param {x, y}  
	 */
	public set pivot1_coord({x = 0, y = 0}){
		this.pivot1.coord = {x: x, y: y};
	}

	/**
	 * @description Sets the `x` and `y` of `pivot2`
	 * @param {x, y}  
	 */
	public set pivot2_coord({x = 0, y = 0}){
		this.pivot2.coord = {x: x, y: y};
	}

	/**
	 * @returns the side_length of the rectangle
	 */
	public get side_length(){
		return Math.sin(1/4 * Math.PI) * this.pivot1.distance_to(this.pivot2);
	}

	/**
	 * @returns the rotation of this rectangle
	 */
	public get rotation(){
		return this.pivot1.angle_between(this.pivot2) - 45;
	}

	/**
	 * @description Bind pivots to a pivots of `rect` in canvas `svg`
	 * @param svg 
	 * @param rect 
	 */
	public bind(svg : svgdotjs.Svg, rect : svgdotjs.Rect){
		const side_length = rect.width() as number;
		let rot = rect.transform().rotate % 90;
		rot = (rot < 0 ? 90 + rot : rot) / 180 * Math.PI;
		const x_offset = Math.sin(rot) * side_length;

		const pivot1 : Point = new Point(rect.rbox(svg).x + x_offset, rect.rbox(svg).y);
		const center : Point = new Point(rect.rbox(svg).cx, rect.rbox(svg).cy);
		const pivot2 : Point = pivot1.add(center.subtract(pivot1).scale(2));

		this.pivot1_coord = {x: pivot1.x, y: pivot1.y};
		this.pivot2_coord = {x: pivot2.x, y: pivot2.y};
	}

	public render() : void {
		const size = this.side_length;
		const position = {x: this.pivot1.x, y: this.pivot1.y};
		const rotation = this.rotation;
		
		this.rect.size(size, size);
		this.rect.transform({position: position, rotate: rotation, origin: "top left"})
	}
}

/**
 * --- Cursor Class ---
 * Cursor is a special type of shape that "points to" a specific spot in canvas,
 * just like all cursors do
 */
abstract class Cursor extends Shape {
	private position : Point;

	constructor(){
		super();
		this.position = new Point(0, 0);
	}

	public get x(){
		return this.position.x;
	}

	public get y(){
		return this.position.y;
	}

	/**
	 * @description Points cursor to coordinate `(x, y)`
	 * 
	 * @param x 
	 * @param y 
	 */
	public point_to(x : number, y : number) : void {
		this.position.coord = {x, y};
	};

	public abstract render() : void;
	public abstract hide() : void;
	public abstract show() : void;
}

/**
 * --- CrossCursor Class ---
 * A cross cursor is a cursor that looks like a big cross. It is composed of two lines, 
 * one horizontal, and one vertical
 */
class CrossCursor extends Cursor {
	// The two lines
	private cursor_hori : svgdotjs.Line;
	private cursor_verti : svgdotjs.Line;

	/**
	 * @description Binds cursor to a canvas, and sets its color
	 * 
	 * @param svg 
	 * @param color 
	 */
	constructor(svg : svgdotjs.Svg){
		super();
		this.cursor_hori = svg.line([[0, 0], [2*canvasSize, 0]]).fill("none").stroke("#000000");
		this.cursor_verti = svg.line([[0, 0], [0, 2*canvasSize]]).fill("none").stroke("#000000");
	}

	public set color(color: string) {
		this.cursor_hori.stroke(color);
		this.cursor_verti.stroke(color);
	}

	public render(){
		this.cursor_hori.stroke(this.color);
		this.cursor_verti.stroke(this.color);
		this.cursor_hori.transform({position:{x: 0, y: this.y}, origin: "center"});
		this.cursor_verti.transform({position:{x: this.x, y: 0}, origin: "center"});
	}

	public hide(){
		this.cursor_hori.opacity(0);
		this.cursor_verti.opacity(0);
	}

	public show(){
		this.cursor_hori.opacity(1);
		this.cursor_verti.opacity(1);
	}
}

// As before, we add our parts within a "load" event to make sure the HTML stuff has loaded first. 
window.addEventListener("load", (e: Event) => {
	// =========== This part is required: =========== 
	// Initialize the "judge" object with the number of tasks per trial and your team name. 
	// The third parameter sets the trial engine in "verbose" mode or not -- if it is set to "true", all the events will be logged to the Console. (You may wish to set it to "false" if you find these logs overwhelming.)
	const trial : Trial = new Trial(tasksLength, "NAME", true);
	
	document.getElementById("main").style.alignItems = "flex-start";
	document.getElementById("main").style.justifyContent = "flex-end";

	// You also need to add some way for the user to indicate they are done with their task. 
	// Whatever it is, it should call the trial.submitPosition() method.
	// Within the "trackpad + click" constraints, this can be whatever you want it to be (e.g. a button, some kind of swipe gesture, double-clicking on the square itself...). Consider what you've learned about Fitts's Law. :)
	// Here is a bare version, just using an HTML button:
	let appArea = document.getElementById("applicationArea");
	
	let toolbar : HTMLDivElement = document.createElement("div");
	toolbar.style.flex = "1";
	toolbar.style.width = "100%";
	appArea.appendChild(toolbar);
	
	let submitButton : HTMLButtonElement = document.createElement("button");
	submitButton.innerText = "yes, that looks good";
	toolbar.appendChild(submitButton);
	
	submitButton.addEventListener("click", (e: PointerEvent) => {
		trial.submitPosition();
	})
	// =========== /end required =========== 

	// ====== Getting the manipulable elements =============
	// Ask the trial engine for the stuff you can manipulate:
	let applicationElements = trial.getElements();

	// applicationElements.svg is the overall svg drawable area you can add things to:
	// Documentation is here: https://svgjs.dev/docs/3.2/container-elements/#svg-svg
	let svg : svgdotjs.Svg = applicationElements.svg;
	svg.node.style.margin = "2em";
	svg.node.style.marginRight = "0";
	// The main thing you are likely to want to do with it is adding new elements.
	// For example, if you wanted to add a new rectangle for a toolbox at the location 5,10 on the screen,
	// you could call: applicationElements.svg.rect(10, 10).move(5,10);

	// applicationElements.grid is the svg group containing the lines drawn in the background.
	let grid : svgdotjs.G = applicationElements.grid;
	// You could add other background-y things to this group. You also may remove the grid lines with grid.clear() (but I can't personally think of a good reason why you would want to?).

	// =========== Constants ==============
	// This is the bounding function that bounds a coordinate in the svg canvas
	const canvasBound = bound(0, canvasSize);

	// =========== Variables ==============
	// This is the live position of the actual cursor in the svg canvas
	// It is activly updating to current position of the actual cursor 
	let cursor_position : Point = new Point(0, 0);
	svg.node.addEventListener("mousemove", (e : MouseEvent) => {
		cursor_position.coord = {x: e.offsetX, y: e.offsetY};
	});

	// =========== Custom Cursor ==========

	// --- Cross Cursor ---
	// This is one custom curosr called "cross cursor"
	// It looks like a big cross, which will help users to align the rectangles
	// It is shown when user is adjusting pivots of the rectangle
	let cross_cursor : CrossCursor = new CrossCursor(svg);
	cross_cursor.color = "#ff0000";
	cross_cursor.hide();


	// And applicationElements.box is the box itself. :) You can change it with any of the things at https://svgjs.dev/docs/3.2/manipulating/
	let box : svgdotjs.Rect = applicationElements.box;
	box.fill("#11eaea");

	// Reinterpretate the box as a "pivot box" (a box defined by two pivots)
	let pivot_box = new PivotRect(box);
	
	// Setting the default transformation of `box`
	pivot_box.pivot1_coord = {
		x: defaultSquarePosition.location.x, 
		y: defaultSquarePosition.location.y - defaultSquarePosition.size/2
	};
	pivot_box.pivot2_coord = {
		x: defaultSquarePosition.location.x, 
		y: defaultSquarePosition.location.y + defaultSquarePosition.size/2
	};
	pivot_box.render();

	// ====== Manipulating them =============

	


	// ====== SVG element events =============
	// You can also add event handlers to svg elements. The syntax is similar (but not identical, unfortunately) to the baseline HTML event handlers: https://svgjs.dev/docs/3.2/events/#element-on


	// ====== Dragging elements =============
	// Because the "draggable" plugin is included, you can also set any svg element (shapee or group) to "draggable" -- this does exactly what you hope it does (i.e., it makes it so that you can click and drag the element). 
	// Documentation here: https://github.com/svgdotjs/svg.draggable.js ... but it really is just this:

	/**
	 * This code block if for the "dragging" behavior of box
	 * 
	 * The pivot of `box` closest to cursor's position when the dragging starts 
	 * will be chosen to be adjusted
	 * 
	 * The pivots can be dragged at any position from the svg canvas. This is a bit like the
	 * "bubble cursor" we saw in class  
	 */
	{
		// --- Local Variables Needed ---
		// closest_pivot is the pivot that is closest to the cursor.
		let closest_pivot : Point = pivot_box.pivot1;

		// --- The Events ---
		// When the mouse is pressed down, at any position, 
		// the closest pivot to the user's cursor is "chosen" to be adjusted
		svg.node.addEventListener("mousedown",(e : PointerEvent)=>{
			box.node.requestPointerLock();

			// Set the `closest_pivot` so
			// `mousemove` event can know which pivot are we updating 
			closest_pivot = cursor_position.closest([pivot_box.pivot1, pivot_box.pivot2])

			// Re-position the cross cursor to avoid flashing, and then show it 
			cross_cursor.point_to(closest_pivot.x, closest_pivot.y);
			cross_cursor.render();
			cross_cursor.show();
		});
		
		// Whe the mouse is moving, the pivot chosen should follow the mouse, or the cross cursor
		document.addEventListener("mousemove", (e : MouseEvent) => {
			// We should only do all these when we are indeed adjusting the box
			if(document.pointerLockElement === box.node) {
				// bound cross cursor's position in canvasBound, so that is does not go out of the canvas
				cross_cursor.point_to(
					canvasBound(cross_cursor.x + e.movementX), 
					canvasBound(cross_cursor.y + e.movementY)
				);
				cross_cursor.render();

				// set the pivot position and re-render the box
				closest_pivot.coord = {x: cross_cursor.x, y: cross_cursor.y};
				pivot_box.render();	
			}
		});

		// When mouse is up, we should "release" pivot point, and hide the cross cursor
		document.addEventListener("mouseup", () => {
			document.exitPointerLock();
			cross_cursor.hide();
		})
	}

	// ====== Trial engine events =============
	// The trial engine also has some events you can add handlers for:
	//	"newTask" // a new task has begun
	//	| "start" // a new trial has started
	//	| "testOver" // we are out of tasks for this trial
	//	| "stop"; // the trial has been stopped (e.g. with the stop button)
	// trial.on(eventName, callback) will allow you to register a callback (handler) to any of the above.

	trial.addEventListener("start", () => {
		console.log("starting!");
		pivot_box.bind(svg, box);
	});
	
	// Lastly, trial.getTaskNumber() will return the number (integer) of the current task
	trial.addEventListener("newTask", () => {
		console.log(trial.getTaskNumber());
		pivot_box.bind(svg, box);
	});
});
