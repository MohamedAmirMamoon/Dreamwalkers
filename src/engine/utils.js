export const utils = {
    withGrid(n) {
        return n *16;
    },
    asGridCoord(x,y) {
        return `${x*16},${y*16}`
    },
    nextPosition(initialX, initialY, direction) {
        let x = initialX;
        let y = initialY;
        const size = 16;
        if (direction === "left") { 
            x -= size;
        } 
        else if (direction === "right") {
            x += size;
        } 
        else if (direction === "up") {
            y -= size;
        } 
        else if (direction === "down") {
            y += size;
        }
        return {x,y};
    },
    oppositeDirection(direction) {
        if (direction === "left") { return "right" }
        if (direction === "right") { return "left" }
        if (direction === "up") { return "down" }
        return "up"
    },

    //Resolve an absolute-from-root asset path (e.g. "/images/x.png") against
    //Vite's configured base, so builds served from a subpath (GitHub Pages'
    ///Dreamwalkers/) load their assets instead of 404ing at the domain root.
    //Guarded for Node (import.meta.env is undefined in the smoke harness).
    assetUrl(path) {
        const base = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "/";
        return base.replace(/\/$/, "") + path;
    },

    emitEvent(name, detail) {
        const event = new CustomEvent(name, {
          detail
        });
        document.dispatchEvent(event);
    }
}