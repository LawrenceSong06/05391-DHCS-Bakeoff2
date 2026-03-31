/// <reference path="./svg.d.ts" />
/// <reference path="./svg.draggable.js" />
/// <reference path="framework.ts" />

// This constant sets the number of tasks per trial. You can change it while you are experimenting, but it should be set back to 10 for the actual Bakeoff.
const tasksLength = 10;

// Documentation on the main SVG.js library is here: https://svgjs.dev/docs/3.2
// Documentation on the "draggable" SVG.js plugin is here:
// https://github.com/svgdotjs/svg.draggable.js

/*
 * ============= Helper Functions =============
 */ 

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

function is_active(element : HTMLElement) : boolean{
	return element.classList.contains("active");
}

function make_active(element : HTMLElement) : void{
	if (is_active(element)){
		return;
	};
	element.classList.add("active");
}

function make_inactive(element : HTMLElement) : void{
	if (!is_active(element)){
		return;
	}
	element.classList.remove("active");
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
	 * @description Rotating a point by a angle `theta`
	 * @param theta
	 * @returns `R(theta)` @ `this`
	 */
	public rotate(theta : number){
		return new Point(this.x*Math.cos(theta)-this.y*Math.sin(theta),
		 this.x*Math.sin(theta)+this.y*Math.cos(theta));
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

	// Some static methods
	/**
	 * @description Calculate the mid point of two points
	 * @param P
	 * @param Q 
	 * @returns mid point of P and Q 
	 */
	static mid(P : Point, Q : Point) : Point{
		let x = (P.x + Q.x)/2;
		let y = (P.y + Q.y)/2;
		return new Point(x, y);	
	}
}

abstract class Renderable {
	public abstract render() : void;
}

/**
 * Shape Abstract Class
 * A "Shape" is anything that can be rendered in svg canvas
 */
abstract class Shape extends Renderable{
	public abstract set color(color: string);
	public abstract hide() : void;
	public abstract show() : void;
}

/**
 * This is an interpretation of svgdotjs.Rect
 * It defines a rectangle by 2 pivots on a diagonol
 */
class PivotRect extends Shape {
	private rect : svgdotjs.Rect;
	public pivot1 : Point;
	public pivot2 : Point;
	public pivot3 : Point;
	public pivot4 : Point;

	public center : Point;

	// Binding an existing rect
	// this can be understood as "interpretating" rect as a PivotRect 
	/**
	 * @param rect The rect to be interpreted as PivotRect
	 */
	constructor(rect : svgdotjs.Rect) {
		super();
		this.pivot1 = new Point(0,0);
		this.pivot2 = new Point(0,0);
		this.pivot3 = new Point(0,0);
		this.pivot4 = new Point(0,0);
		this.center = new Point(0,0);
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
		this.center = Point.mid(this.pivot1, this.pivot2);
		this.pivot3 = this.center.add(this.center.subtract(this.pivot1).rotate(-Math.PI/2))
		this.pivot4 = this.center.add(this.center.subtract(this.pivot1).rotate(Math.PI/2))
	}

	/**
	 * @description Sets the `x` and `y` of `pivot2`
	 * @param {x, y}  
	 */
	public set pivot2_coord({x = 0, y = 0}){
		this.pivot2.coord = {x: x, y: y};
		this.center = Point.mid(this.pivot1, this.pivot2);
		this.pivot3 = this.center.add(this.center.subtract(this.pivot1).rotate(-Math.PI/2))
		this.pivot4 = this.center.add(this.center.subtract(this.pivot1).rotate(Math.PI/2))
	}

	/**
	 * @description Sets the `x` and `y` of `pivot2`
	 * @param {x, y}  
	 */
	public set pivot3_coord({x = 0, y = 0}){
		this.pivot3.coord = {x: x, y: y};
		this.center = Point.mid(this.pivot3, this.pivot4);
		this.pivot1 = this.center.add(this.center.subtract(this.pivot3).rotate(-Math.PI/2))
		this.pivot2 = this.center.add(this.center.subtract(this.pivot3).rotate(Math.PI/2))
	}

	/**
	 * @description Sets the `x` and `y` of `pivot2`
	 * @param {x, y}  
	 */
	public set pivot4_coord({x = 0, y = 0}){
		this.pivot4.coord = {x: x, y: y};
		this.center = Point.mid(this.pivot3, this.pivot4);
		this.pivot1 = this.center.add(this.center.subtract(this.pivot3).rotate(-Math.PI/2))
		this.pivot2 = this.center.add(this.center.subtract(this.pivot3).rotate(Math.PI/2))

	}

	/**
	 * @description Sets the `x` and `y` of `center`
	 * @param {x, y}
	 */
	public set center_coord({x = 0, y = 0}){
		let dx = x - this.center.x;
		let dy = y - this.center.y;
		this.pivot1.coord = {x: this.pivot1.x + dx, y: this.pivot1.y + dy};
		this.pivot2.coord = {x: this.pivot2.x + dx, y: this.pivot2.y + dy};
		this.pivot3.coord = {x: this.pivot3.x + dx, y: this.pivot3.y + dy};
		this.pivot4.coord = {x: this.pivot4.x + dx, y: this.pivot4.y + dy};

		this.center.coord = {x, y};
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
	public bind_pivots_to(svg : svgdotjs.Svg, rect : svgdotjs.Rect){
		const side_length = rect.width() as number;
		let rot = rect.transform().rotate % 90;
		rot = (rot < 0 ? 90 + rot : rot) / 180 * Math.PI;
		const x_offset = Math.sin(rot) * side_length;

		const pivot1 : Point = new Point(rect.rbox(svg).x + x_offset, rect.rbox(svg).y);
		const center : Point = new Point(rect.rbox(svg).cx, rect.rbox(svg).cy);
		const pivot2 : Point = pivot1.add(center.subtract(pivot1).scale(2));
		const pivot3 : Point = center.add(center.subtract(pivot1).rotate(-Math.PI/2))
		const pivot4 : Point = center.add(center.subtract(pivot1).rotate(Math.PI/2))


		this.pivot1_coord = {x: pivot1.x, y: pivot1.y};
		this.pivot2_coord = {x: pivot2.x, y: pivot2.y};
		this.pivot3_coord = {x: pivot3.x, y: pivot3.y};
		this.pivot4_coord = {x: pivot4.x, y: pivot4.y};
		this.center = Point.mid(pivot1, pivot2);
	}

	public render() : void {
		const size = this.side_length;
		const position = {x: this.pivot1.x, y: this.pivot1.y};
		const rotation = this.rotation;
		
		this.rect.size(size, size);
		this.rect.transform({position: position, rotate: rotation, origin: "top left"})
	}

	public hide(): void {
		this.rect.opacity(0);
	}
	
	public show(): void {
		this.rect.opacity(1);
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
	constructor(svg : svgdotjs.Svg, length = 2*canvasSize){
		super();
		this.cursor_hori = svg.line([[0, 0], [length, 0]]).fill("none").stroke("#000000");
		this.cursor_verti = svg.line([[0, 0], [0, length]]).fill("none").stroke("#000000");
	}

	public set color(color: string) {
		this.cursor_hori.stroke(color);
		this.cursor_verti.stroke(color);
	}

	public render(){
		this.cursor_hori.stroke(this.color);
		this.cursor_verti.stroke(this.color);
		this.cursor_hori.transform({position:{x: this.x, y: this.y}, origin: "center"});
		this.cursor_verti.transform({position:{x: this.x, y: this.y}, origin: "center"});
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

/**
 * A Group is all Shapes that are rendered together with some rules
 */
class Group extends Renderable{
	/**
	 * A Group can have 2 callbacks: 
	 *  - before_render: things to be done before this group is rendered
	 *  - after_render: things to be done after this group is rendered
	 * @default no-op
	 */
	private callbacks = {
		before_render: ()=>{},
		after_render: ()=>{}
	};

	/**
	 * A list of user defined actions to this group that can be retrieved later
	 */
	private actions : ((object)=>{})[] = [];

	// All shapes in this group
	private shapes : Shape[];

	/**
	 * @param shapes shapes to be grouped
	 */
	constructor(shapes : Shape[]){
		super();
		this.shapes = shapes;
	}

	public set before_render(f : () => void){
		this.callbacks.before_render = f;
	}
	
	public set after_render(f : () => void){
		this.callbacks.after_render = f;
	}

	/**
	 * @description add an action to this group
	 * @param action_name the name of the action, which will be used later to retrieve it
	 * @param action the action function
	 */
	public add_action(action_name : string, action : (object) => void){
		this.actions[action_name] = action;
	}

	/**
	 * @description retrieves a previously defined action
	 * @param action_name 
	 * @returns function associoated with `action_name`
	 */
	public action(action_name : string){
		return this.actions[action_name];
	}

	public render(): void {
		this.callbacks.before_render();

		this.shapes.map((x)=>{
			x.render();
		});

		this.callbacks.after_render();
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
	// =========== /end required =========== 

	// ====== Getting the manipulable elements =============
	// Ask the trial engine for the stuff you can manipulate:
	let applicationElements = trial.getElements();

	// applicationElements.svg is the overall svg drawable area you can add things to:
	// Documentation is here: https://svgjs.dev/docs/3.2/container-elements/#svg-svg
	let svg : svgdotjs.Svg = applicationElements.svg;
	svg.node.style.margin = "2em";
	svg.node.style.marginRight = "0";
	svg.node.style.marginBottom = "0";
	// The main thing you are likely to want to do with it is adding new elements.
	// For example, if you wanted to add a new rectangle for a toolbox at the location 5,10 on the screen,
	// you could call: applicationElements.svg.rect(10, 10).move(5,10);

	// applicationElements.grid is the svg group containing the lines drawn in the background.
	let grid : svgdotjs.G = applicationElements.grid;
	// Enhancing all lines associated with multiples of 1/4 canvasSize.
	// those lines will have higher opacity
	for(let i = 1; i < 4; i++){
		const opacity = 0.8 - Math.abs(2-i)/3;
		svg.line(canvasSize*i/4, 0, canvasSize*i/4, canvasSize).stroke("#000000").opacity(opacity).back();
		svg.line(0, canvasSize*i/4, canvasSize, canvasSize*i/4).stroke("#000000").opacity(opacity).back();
	}

	// =========== Constants ==============
	// This is the bounding function that bounds a coordinate in the svg canvas
	const canvasBound = bound(0, canvasSize);
	const regular_view_box = {x: 0, y: 0, width: canvasSize, height: canvasSize};

	// ========== Some Global Variables ==============
	let current_viewbox = {x: 0, y: 0, width: canvasSize, height: canvasSize};
	
	// The system status enum. This will be later used to find 
	// what functionality the user is using
	enum SystemStatus {
		regular, // user is adjusting the pivots
		zooming // user is selecting zoom in area
	};
	let system_status : SystemStatus = SystemStatus.regular;
	
	// This is the live position of the actual cursor in the svg canvas
	// It is activly updating to current position of the actual cursor 
	let cursor_position : Point = new Point(0, 0);
	svg.node.addEventListener("mousemove", (e : MouseEvent) => {
		let zoom_ratio = current_viewbox.width / canvasSize;
		cursor_position.coord = {x: current_viewbox.x + e.offsetX * zoom_ratio, y: current_viewbox.y + e.offsetY * zoom_ratio};
	});

	// The mouse rate is the factor used to adjust mouse speed when adjusting
	// pivots
	let mouse_rate = 1;

	// The tool bar. This is the area where all buttons will be placed.
	let toolbar : HTMLDivElement = document.createElement("div");
	// We want to horizontally list all these buttons
	toolbar.style.flex = "1";
	toolbar.style.width = "100%";
	toolbar.style.display = "flex";
	toolbar.style.flexDirection = "row-reverse";
	toolbar.style.gap = "5px";
	appArea.appendChild(toolbar);

	// The submit button
	let submitButton : HTMLButtonElement = document.createElement("button");
	submitButton.id = "submit";
	submitButton.innerText = "Submit";
	toolbar.appendChild(submitButton);
	
	submitButton.addEventListener("click", (e: PointerEvent) => {
		send_message("Yeah!")
		trial.submitPosition();
	})

	// A message area telling user what is happening in the system
	let message_box : HTMLDivElement = document.createElement("div");
	message_box.id = "message";
	
	let send_message = (msg : string) => {message_box.innerText = msg};
	send_message("You've got this!");

	// The zoom button
	let zoom : HTMLButtonElement = document.createElement("button");
	zoom.id = "zoom"
	toolbar.appendChild(zoom);
	toolbar.appendChild(message_box);
	
	// The selected zoom in are is the box used to highlight the chosen
	// zooming in area
	let selected_zoom_in_area = svg.rect(10,10).fill("#c9ffc898");
	let zoom_in_area_box = new PivotRect(selected_zoom_in_area);
	zoom_in_area_box.hide();

	// Zoom's onclick
	zoom.addEventListener("click", ()=>{
		if(is_active(zoom)){
			make_inactive(zoom);
			if(system_status == SystemStatus.zooming){
				zoom_in_area_box.hide();

				system_status = SystemStatus.regular;

				send_message("Cancelled.");
			}else {
				current_viewbox = regular_view_box;
				svg.viewbox(current_viewbox);

				mouse_rate = 1;

				send_message("Zoomed out.");
			}
		}else{
			zoom_in_area_box.show();

			make_active(zoom);
			system_status = SystemStatus.zooming;

			send_message("Please select an area.")
		}
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
	box.size(defaultSquarePosition.size);
	box.transform({position: defaultSquarePosition.location, rotate: defaultSquarePosition.rotation});
	
	// Reinterpretate the box as a "pivot box" (a box defined by two pivots)
	let pivot_box = new PivotRect(box);
	
	// Setting the default transformation of `box`
	pivot_box.bind_pivots_to(svg, box);

	// Creating the following pivot cursors
	let pivot1_cross  = new CrossCursor(svg, 10);
	let pivot2_cross = new CrossCursor(svg, 10);
	let pivot3_cross = new CrossCursor(svg, 10);
	let pivot4_cross = new CrossCursor(svg, 10);
	let center_cross = new CrossCursor(svg, 10);
	pivot1_cross.color = "#3c00ff"
	pivot2_cross.color = "#3c00ff"
	pivot3_cross.color = "#3c00ff"
	pivot4_cross.color = "#3c00ff"
	center_cross.color = "#3c00ff"

	// These shapes should be rendered together, and thus they should be a group
	let box_group = new Group([pivot_box, pivot1_cross, pivot2_cross, pivot3_cross, pivot4_cross,center_cross]);

	// Before rending, the two pivot_crosses should follow the box
	box_group.before_render = function(){
		pivot1_cross.point_to(pivot_box.pivot1.x, pivot_box.pivot1.y);
		pivot2_cross.point_to(pivot_box.pivot2.x, pivot_box.pivot2.y);
		pivot3_cross.point_to(pivot_box.pivot3.x, pivot_box.pivot3.y);
		pivot4_cross.point_to(pivot_box.pivot4.x, pivot_box.pivot4.y);
		center_cross.point_to(pivot_box.center.x, pivot_box.center.y);
	}
	
	// Define a new action that highlights the cross nearest to the pointer
	box_group.add_action("highlight_nearest_cross", ({x, y})=>{
		const P = new Point(x, y);
		const pivots = [pivot_box.pivot1,pivot_box.pivot2,pivot_box.pivot3,pivot_box.pivot4, pivot_box.center]
		const crosses = [pivot1_cross, pivot2_cross, pivot3_cross, pivot4_cross, center_cross]
		const closest = P.closest(pivots);
		let selected_index = -1
		for(let i=0;i<pivots.length;i++) {
			if(closest == pivots[i]) {
				selected_index = i
				break
			}
		}
		for(let i=0;i<pivots.length;i++) {
			crosses[i].color = selected_index == i?"#ff0000":"#3c00ff"
		}
	});
	box_group.render();
	
	// On every mousemove, update the color of each pivot_crosses
	document.addEventListener("mousemove", (e : MouseEvent)=>{
		if(system_status != SystemStatus.regular){
			return;
		}

		if(document.pointerLockElement === null){
			box_group.action("highlight_nearest_cross")({x: cursor_position.x, y: cursor_position.y});
		}
	});


	// ====== SVG element events =============
	// You can also add event handlers to svg elements. The syntax is similar (but not identical, unfortunately) to the baseline HTML event handlers: https://svgjs.dev/docs/3.2/events/#element-on

	/**
	 * This code block is associated with zoom-in tool.
	 * The expected behavior is:
	 * - when user activated zoom-in, they will need to choose an area to zoom-in
	 * - there will be 64 zoom-in square areas, each containing 4 chunks of 1/4 canvasSize blocks.
	 * - the zoom-in block whose center is nearest to user's cursor will be selected.
	 * - when user presses their mouse button, we will zoom in into the chosen area.
	 */
	{
		// Computing the centers of zoom in areas
		const area_diameter = 1/8 * canvasSize;
		let zoom_in_area_centers = [];
		{
			const step_length = 1/8*canvasSize;
			for(let i = 1; i < 8; i++){
				for(let j = 1; j < 8; j++){
					const x = step_length*i;
					const y = step_length*j;
					zoom_in_area_centers.push(new Point(x, y));
				}
			}
		}

		// Highlight the selected zoom-in area to hint the user
		svg.node.addEventListener("mousemove", ()=>{
			if(system_status != SystemStatus.zooming) {
				return;
			}

			const closest = cursor_position.closest(zoom_in_area_centers);
			let [x1, y1] = [closest.x - area_diameter, closest.y - area_diameter];
			let [x2, y2] = [closest.x + area_diameter, closest.y + area_diameter];
			zoom_in_area_box.pivot1_coord = {x: x1, y: y1};
			zoom_in_area_box.pivot2_coord = {x: x2, y: y2};
			zoom_in_area_box.render();
		});

		// User selected zoom-in area

		svg.node.addEventListener("mousedown", ()=>{
			if(system_status != SystemStatus.zooming) {
				return;
			}

			let [x, y, s] = [zoom_in_area_box.pivot1.x - 5, zoom_in_area_box.pivot1.y - 5, zoom_in_area_box.side_length + 10];
			mouse_rate = s / canvasSize;
			
			current_viewbox = {x, y, width: s, height: s};
			svg.viewbox(current_viewbox);


			send_message("Zoomed in.");
			zoom_in_area_box.hide();
			system_status = SystemStatus.regular;
		});
	}

	
	// ====== Dragging elements =============
	// Because the "draggable" plugin is included, you can also set any svg element (shapee or group) to "draggable" -- this does exactly what you hope it does (i.e., it makes it so that you can click and drag the element). 
	// Documentation here: https://github.com/svgdotjs/svg.draggable.js ... but it really is just this:

	/**
	 * This code block if for the "dragging" behavior of box pivots
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
			if(system_status != SystemStatus.regular){
				return;
			}

			box.node.requestPointerLock();

			// Set the `closest_pivot` so
			// `mousemove` event can know which pivot are we updating 
			closest_pivot = cursor_position.closest([pivot_box.pivot1, pivot_box.pivot2, pivot_box.pivot3, pivot_box.pivot4, pivot_box.center])

			// Re-position the cross cursor to avoid flashing, and then show it 
			cross_cursor.point_to(closest_pivot.x, closest_pivot.y);
			cross_cursor.render();
			cross_cursor.show();
		});
		
		// Whe the mouse is moving, the pivot chosen should follow the mouse, or the cross cursor
		document.addEventListener("mousemove", (e : MouseEvent) => {
			if(system_status != SystemStatus.regular) {
				return;
			}

			// We should only do all these when we are indeed adjusting the box
			if(document.pointerLockElement === box.node) {
				// bound cross cursor's position in canvasBound, so that is does not go out of the canvas
				cross_cursor.point_to(
					canvasBound(cross_cursor.x + e.movementX * mouse_rate), 
					canvasBound(cross_cursor.y + e.movementY * mouse_rate)
				);
				cross_cursor.render();

				// set the pivot position and re-render the box
				if(closest_pivot === pivot_box.pivot1){
					pivot_box.pivot1_coord = {x: cross_cursor.x, y: cross_cursor.y};
				}else if(closest_pivot === pivot_box.pivot2){
					pivot_box.pivot2_coord = {x: cross_cursor.x, y: cross_cursor.y};
				}else if(closest_pivot === pivot_box.pivot3){
					pivot_box.pivot3_coord = {x: cross_cursor.x, y: cross_cursor.y};
				}else if(closest_pivot === pivot_box.pivot4){
					pivot_box.pivot4_coord = {x: cross_cursor.x, y: cross_cursor.y};
				}else{
					pivot_box.center_coord = {x: cross_cursor.x, y: cross_cursor.y};
				}
				box_group.render();
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
		pivot_box.bind_pivots_to(svg, box);
		box_group.render();
	});
	
	// Lastly, trial.getTaskNumber() will return the number (integer) of the current task
	trial.addEventListener("newTask", () => {
		console.log(trial.getTaskNumber());
		pivot_box.bind_pivots_to(svg, box);
		box_group.render();
	});
});
