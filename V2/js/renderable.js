"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossCursor = exports.Cursor = exports.PivotRect = exports.Renderable = void 0;
const Vector = require("./vectors");
/**
 * Rendaerable Abstract Class
 * A "Renderable" is anything that can be rendered in svg canvas
 */
class Renderable {
}
exports.Renderable = Renderable;
/**
 * This is an interpretation of svgdotjs.Rect
 * It defines a rectangle by 2 pivots on a diagonol
 */
class PivotRect extends Renderable {
    // Binding an existing rect
    // this can be understood as "interpretating" rect as a PivotRect 
    /**
     * @param rect The rect to be interpreted as PivotRect
     */
    constructor(rect) {
        super();
        this.pivot1 = new Vector.Point(0, 0);
        this.pivot2 = new Vector.Point(0, 0);
        this.rect = rect;
    }
    /**
     * @description Sets the `x` and `y` of `pivot1`
     * @param {x, y}
     */
    set pivot1_coord({ x = 0, y = 0 }) {
        this.pivot1.coord = { x: x, y: y };
    }
    /**
     * @description Sets the `x` and `y` of `pivot2`
     * @param {x, y}
     */
    set pivot2_coord({ x = 0, y = 0 }) {
        this.pivot2.coord = { x: x, y: y };
    }
    /**
     * @returns the side_length of the rectangle
     */
    get side_length() {
        return Math.sin(1 / 4 * Math.PI) * this.pivot1.distance_to(this.pivot2);
    }
    /**
     * @returns the rotation of this rectangle
     */
    get rotation() {
        return this.pivot1.angle_between(this.pivot2) - 45;
    }
    render() {
        const size = this.side_length;
        const position = { x: this.pivot1.x, y: this.pivot1.y };
        const rotation = this.rotation;
        this.rect.size(size, size);
        this.rect.transform({ position: position, rotate: rotation, origin: "top left" });
    }
}
exports.PivotRect = PivotRect;
/**
 * --- Cursor Class ---
 * Cursor is a special type of shape that "points to" a specific spot in canvas,
 * just like all cursors do
 */
class Cursor extends Renderable {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
    }
    /**
     * @description Points cursor to coordinate `(x, y)`
     *
     * @param x
     * @param y
     */
    point_to(x, y) {
        this.x = x;
        this.y = y;
    }
    ;
}
exports.Cursor = Cursor;
/**
 * --- CrossCursor Class ---
 * A cross cursor is a cursor that looks like a big cross. It is composed of two lines,
 * one horizontal, and one vertical
 */
class CrossCursor extends Cursor {
    /**
     * @description Binds cursor to a canvas, and sets its color
     *
     * @param svg
     * @param color
     */
    constructor(svg, color) {
        super();
        this.cursor_hori = svg.line([[0, 0], [2 * canvasSize, 0]]).fill("none").stroke(color);
        this.cursor_verti = svg.line([[0, 0], [0, 2 * canvasSize]]).fill("none").stroke(color);
    }
    render() {
        this.cursor_hori.transform({ position: { x: 0, y: this.y }, origin: "center" });
        this.cursor_verti.transform({ position: { x: this.x, y: 0 }, origin: "center" });
    }
    hide() {
        this.cursor_hori.opacity(0);
        this.cursor_verti.opacity(0);
    }
    show() {
        this.cursor_hori.opacity(1);
        this.cursor_verti.opacity(1);
    }
}
exports.CrossCursor = CrossCursor;
