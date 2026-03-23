/// <reference path="./svg.d.ts" />
/// <reference path="./svg.draggable.js" />
/// <reference path="framework.ts" />
// This constant sets the number of tasks per trial. You can change it while you are experimenting, but it should be set back to 10 for the actual Bakeoff.
const tasksLength = 10;
// Documentation on the main SVG.js library is here: https://svgjs.dev/docs/3.2
// Documentation on the "draggable" SVG.js plugin is here:
// https://github.com/svgdotjs/svg.draggable.js
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    subtract(P) {
        return new Point(this.x - P.x, this.y - P.y);
    }
    add(P) {
        return new Point(this.x + P.x, this.y + P.y);
    }
    modulo() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    angle() {
        const angle = Math.atan2(this.y, this.x);
        return angle * 180 / Math.PI;
    }
    distance_to(P) {
        return this.subtract(P).modulo();
    }
    angle_between(P) {
        return P.subtract(this).angle();
    }
}
class PivotBox {
    constructor(box) {
        this.box = box;
    }
    set_pivot1(x, y) {
        this.pivot1 = new Point(x, y);
    }
    set_pivot2(x, y) {
        this.pivot2 = new Point(x, y);
    }
    side_length() {
        return Math.sin(1 / 4 * Math.PI) * this.pivot1.distance_to(this.pivot2);
    }
    rotation() {
        return this.pivot1.angle_between(this.pivot2) - 45;
    }
    render() {
        const size = this.side_length();
        const position = { x: this.pivot1.x, y: this.pivot1.y };
        const rotation = this.rotation();
        this.box.size(size, size);
        this.box.transform({ position: position, rotate: rotation, origin: "top left" });
    }
}
// As before, we add our parts within a "load" event to make sure the HTML stuff has loaded first. 
window.addEventListener("load", (e) => {
    // =========== This part is required: =========== 
    // Initialize the "judge" object with the number of tasks per trial and your team name. 
    // The third parameter sets the trial engine in "verbose" mode or not -- if it is set to "true", all the events will be logged to the Console. (You may wish to set it to "false" if you find these logs overwhelming.)
    const trial = new Trial(tasksLength, "teamName", true);
    document.getElementById("main").style.alignItems = "flex-start";
    document.getElementById("main").style.justifyContent = "flex-end";
    // You also need to add some way for the user to indicate they are done with their task. 
    // Whatever it is, it should call the trial.submitPosition() method.
    // Within the "trackpad + click" constraints, this can be whatever you want it to be (e.g. a button, some kind of swipe gesture, double-clicking on the square itself...). Consider what you've learned about Fitts's Law. :)
    // Here is a bare version, just using an HTML button:
    let appArea = document.getElementById("applicationArea");
    let toolbar = document.createElement("div");
    toolbar.style.flex = "1";
    toolbar.style.width = "100%";
    appArea.appendChild(toolbar);
    let submitButton = document.createElement("button");
    submitButton.innerText = "yes, that looks good";
    toolbar.appendChild(submitButton);
    submitButton.addEventListener("click", (e) => {
        trial.submitPosition();
    });
    // =========== /end required =========== 
    // ====== Getting the manipulable elements =============
    // Ask the trial engine for the stuff you can manipulate:
    let applicationElements = trial.getElements();
    // applicationElements.svg is the overall svg drawable area you can add things to:
    // Documentation is here: https://svgjs.dev/docs/3.2/container-elements/#svg-svg
    let svg = applicationElements.svg;
    svg.node.style.margin = "2em";
    svg.node.style.marginRight = "0";
    // The main thing you are likely to want to do with it is adding new elements.
    // For example, if you wanted to add a new rectangle for a toolbox at the location 5,10 on the screen,
    // you could call: applicationElements.svg.rect(10, 10).move(5,10);
    // applicationElements.grid is the svg group containing the lines drawn in the background.
    let grid = applicationElements.grid;
    // You could add other background-y things to this group. You also may remove the grid lines with grid.clear() (but I can't personally think of a good reason why you would want to?).
    // =========== Custom Cursor ==========
    let closer_to_pivot1 = false;
    let offsetX = 0;
    let offsetY = 0;
    let cursor_hori = svg.line([[0, 0], [2 * canvasSize, 0]]).fill("none").stroke("#ff0000");
    let cursor_verti = svg.line([[0, 0], [0, 2 * canvasSize]]).fill("none").stroke("#ff0000");
    cursor_hori.opacity(0);
    cursor_verti.opacity(0);
    let follower = svg.polygon("0,0 0,1, 1,0").fill("#8e8e8e").stroke("none");
    follower.attr('pointer-events', 'none');
    document.addEventListener("mousemove", (e) => {
        if (document.pointerLockElement == box.node) {
            offsetX = Math.min(Math.max(0, offsetX + e.movementX), canvasSize);
            offsetY = Math.min(Math.max(0, offsetY + e.movementY), canvasSize);
            cursor_hori.transform({ position: { x: 0, y: offsetY }, origin: "center" });
            cursor_verti.transform({ position: { x: offsetX, y: 0 }, origin: "center" });
            if (closer_to_pivot1) {
                pivot_box.set_pivot1(offsetX, offsetY);
            }
            else {
                pivot_box.set_pivot2(offsetX, offsetY);
            }
            pivot_box.render();
            const x = pivot_box.pivot1.x;
            const y = pivot_box.pivot1.y;
            follower.size(pivot_box.side_length(), pivot_box.side_length());
            follower.transform({ position: { x, y }, rotate: pivot_box.rotation(), origin: "top left" }); // "cx"/"cy" are the x and y positions of the center point of the shape
        }
    });
    // And applicationElements.box is the box itself. :) You can change it with any of the things at https://svgjs.dev/docs/3.2/manipulating/
    let box = applicationElements.box;
    box.fill("#11eaea");
    const defualt_size = defaultSquarePosition.size;
    const default_pivot1 = new Point(defaultSquarePosition.location.x, defaultSquarePosition.location.y - defualt_size / 2);
    const default_pivot2 = new Point(defaultSquarePosition.location.x, defaultSquarePosition.location.y + defualt_size / 2);
    // Reinterpretate the box as a "pivot box" (a box defined by two pivots)
    let pivot_box = new PivotBox(box);
    pivot_box.set_pivot1(default_pivot1.x, default_pivot1.y);
    pivot_box.set_pivot2(default_pivot2.x, default_pivot2.y);
    pivot_box.render();
    // ====== Manipulating them =============
    // For example, you could add a button that just randomly re-sizes/positions the box:
    let randomnessButton = document.createElement("button");
    document.getElementById("applicationArea").appendChild(randomnessButton);
    randomnessButton.innerText = "go wild";
    randomnessButton.addEventListener("click", (e) => {
        // To change the box's size, I recommend box.size(), like this:
        let size = randomBetween(10, 100); // randomBetween function is provided by the framework, because I use it there myself
        box.size(size, size); // two arguments because the first is width and the second is height. But these are squares, so I repeat it.
        // (there is also box.scale(number), but it will change the local coordinates, affecting the translation/rotations as well)
        // For translation and rotation, I recommend box.transform(), https://svgjs.dev/docs/3.2/manipulating/#transforming:
        let rotation = randomBetween(0, 90);
        let position = { x: randomBetween(size, canvasSize - size), y: randomBetween(size, canvasSize - size) };
        box.transform({ rotate: rotation, position: position, origin: "center" });
        // ...and you do have to do both of them in the *same* transform() call. Otherwise, things get weird: if you do the rotation before the position, the position will be in the new, rotated coordinates; if you do the position before the rotation, the position overrides/re-sets the rotation.
    });
    // ====== SVG element events =============
    // You can also add event handlers to svg elements. The syntax is similar (but not identical, unfortunately) to the baseline HTML event handlers: https://svgjs.dev/docs/3.2/events/#element-on
    svg.node.addEventListener("mousedown", (e) => {
        box.node.requestPointerLock();
        const cursor = new Point(e.offsetX, e.offsetY);
        if (cursor.distance_to(pivot_box.pivot1) < cursor.distance_to(pivot_box.pivot2)) {
            closer_to_pivot1 = true;
            offsetX = pivot_box.pivot1.x;
            offsetY = pivot_box.pivot1.y;
        }
        else {
            closer_to_pivot1 = false;
            offsetX = pivot_box.pivot2.x;
            offsetY = pivot_box.pivot2.y;
        }
        cursor_hori.transform({ position: { x: 0, y: offsetY }, origin: "center" });
        cursor_verti.transform({ position: { x: offsetX, y: 0 }, origin: "center" });
        cursor_hori.opacity(1);
        cursor_verti.opacity(1);
    });
    document.addEventListener("mouseup", () => {
        document.exitPointerLock();
        cursor_hori.opacity(0);
        cursor_verti.opacity(0);
    });
    box.on("mousemove", (e) => {
    });
    // ====== Dragging elements =============
    // Because the "draggable" plugin is included, you can also set any svg element (shapee or group) to "draggable" -- this does exactly what you hope it does (i.e., it makes it so that you can click and drag the element). 
    // Documentation here: https://github.com/svgdotjs/svg.draggable.js ... but it really is just this:
    // Of course, once the box has been dragged, you might want to know its location (e.g. in case you want to move anything else along with it). In this example, I add a new rectangle to the svg drawing:
    // ...and then I update its location whenever the box is being dragged:
    // ====== Trial engine events =============
    // The trial engine also has some events you can add handlers for:
    //	"newTask" // a new task has begun
    //	| "start" // a new trial has started
    //	| "testOver" // we are out of tasks for this trial
    //	| "stop"; // the trial has been stopped (e.g. with the stop button)
    // trial.on(eventName, callback) will allow you to register a callback (handler) to any of the above.
    trial.addEventListener("start", () => {
        console.log("starting!");
    });
    // Lastly, trial.getTaskNumber() will return the number (integer) of the current task
    trial.addEventListener("newTask", () => {
        console.log(trial.getTaskNumber());
    });
});
