/* =========================================================
   PROGRESSIVE WAVE vs STANDING WAVE
   FINAL CONSOLIDATED SCRIPT.JS

   ✓ Progressive wave
   ✓ Standing wave
   ✓ Particle motion
   ✓ Phase comparison
   ✓ Energy visualization
   ✓ Nodes / antinodes
   ✓ Play / pause / reset
   ✓ 60-second simulation limit
   ✓ Reset → fresh 60-second run
   ✓ Speed / amplitude / frequency / wavelength
   ✓ Responsive Retina canvas
   ✓ Touch-friendly scrolling / pinch zoom
   ✓ Tabs
   ✓ Accordions
   ✓ Global controls
   ✓ Accessibility
   ========================================================= */

"use strict";


/* =========================================================
   1. PHYSICS
   ========================================================= */

const PHYSICS = {

    TWO_PI: Math.PI * 2,

    PARTICLE_COUNT: 64,

    DEFAULT_SPEED: 1,
    DEFAULT_AMPLITUDE: 45,
    DEFAULT_FREQUENCY: 0.5,
    DEFAULT_WAVELENGTH: 260,

    MAX_DELTA_TIME: 0.05,
    MAX_TIME: 60,

    PARTICLE_RADIUS: 4,
    HIGHLIGHT_RADIUS: 8

};


/* =========================================================
   2. HELPERS
   ========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function formatNumber(value, decimals = 2) {

    return Number.isFinite(value)
        ? Number(value).toFixed(decimals)
        : "—";

}


function isTextInput(element) {

    if (!element) {
        return false;
    }

    return (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT"
    );

}


/* =========================================================
   3. CANVASES
   ========================================================= */

const progressiveCanvas =
    getElement("progressiveCanvas");

const progressiveCtx =
    progressiveCanvas
        ? progressiveCanvas.getContext("2d")
        : null;

const progressiveContainer =
    getElement("progressiveCanvasContainer");


const standingCanvas =
    getElement("standingCanvas");

const standingCtx =
    standingCanvas
        ? standingCanvas.getContext("2d")
        : null;

const standingContainer =
    getElement("standingCanvasContainer");


/* =========================================================
   4. PROGRESSIVE STATE
   ========================================================= */

const progressiveState = {

    running: false,
    finished: false,

    time: 0,
    lastTimestamp: null,
    animationFrame: null,

    speed: PHYSICS.DEFAULT_SPEED,
    amplitude: PHYSICS.DEFAULT_AMPLITUDE,
    frequency: PHYSICS.DEFAULT_FREQUENCY,
    wavelength: PHYSICS.DEFAULT_WAVELENGTH,

    showDirection: false,
    showPhase: false,
    showEnergy: false,

    particles: [],

    greenIndex: 22,
    redIndex: 23,

    width: 0,
    height: 0,
    dpr: 1,

    equilibriumY: 0,

    leftMargin: 28,
    rightMargin: 28

};


/* =========================================================
   5. STANDING STATE
   ========================================================= */

const standingState = {

    running: false,
    finished: false,

    time: 0,
    lastTimestamp: null,
    animationFrame: null,

    speed: PHYSICS.DEFAULT_SPEED,
    amplitude: PHYSICS.DEFAULT_AMPLITUDE,
    frequency: PHYSICS.DEFAULT_FREQUENCY,
    wavelength: PHYSICS.DEFAULT_WAVELENGTH,

    showNodes: false,
    showPhase: false,
    showEnergy: false,

    particles: [],

    greenIndex: 18,
    redIndex: 19,

    width: 0,
    height: 0,
    dpr: 1,

    equilibriumY: 0,

    leftMargin: 28,
    rightMargin: 28

};


/* =========================================================
   6. CANVAS SETUP
   ========================================================= */

function setupCanvas(canvas, container, state) {

    if (!canvas || !container) {
        return;
    }

    const rect =
        container.getBoundingClientRect();

    state.width =
        Math.max(1, rect.width);

    state.height =
        Math.max(1, rect.height);

    state.dpr =
        Math.min(
            window.devicePixelRatio || 1,
            3
        );

    canvas.width =
        Math.round(
            state.width * state.dpr
        );

    canvas.height =
        Math.round(
            state.height * state.dpr
        );

    canvas.style.width =
        `${state.width}px`;

    canvas.style.height =
        `${state.height}px`;

    const ctx =
        canvas.getContext("2d");

    ctx.setTransform(
        state.dpr,
        0,
        0,
        state.dpr,
        0,
        0
    );

    state.equilibriumY =
        state.height / 2;

}


/* =========================================================
   7. CREATE PARTICLES
   ========================================================= */

function createParticles(state) {

    state.particles = [];

    const count =
        PHYSICS.PARTICLE_COUNT;

    for (let i = 0; i < count; i++) {

        state.particles.push({

            index: i,

            x: i / (count - 1),

            canvasX: 0,
            canvasY: 0,

            displacement: 0,
            velocity: 0,
            localAmplitude: 0,

            highlighted: false,
            color: null

        });

    }

}


/* =========================================================
   8. PROGRESSIVE X POSITION
   ========================================================= */

function progressiveXToCanvas(x) {

    const left =
        progressiveState.leftMargin;

    const right =
        progressiveState.width -
        progressiveState.rightMargin;

    return (
        left +
        x * (right - left)
    );

}


/* =========================================================
   9. STANDING X POSITION
   ========================================================= */

function standingXToCanvas(x) {

    const left =
        standingState.leftMargin;

    const right =
        standingState.width -
        standingState.rightMargin;

    return (
        left +
        x * (right - left)
    );

}


/* =========================================================
   10. PROGRESSIVE PHYSICS
   ========================================================= */

function getProgressiveWaveNumber() {

    return (
        PHYSICS.TWO_PI /
        progressiveState.wavelength
    );

}


function getProgressiveAngularFrequency() {

    return (
        PHYSICS.TWO_PI *
        progressiveState.frequency
    );

}


function getProgressiveWaveSpeed() {

    return (
        progressiveState.frequency *
        progressiveState.wavelength
    );

}


/*
 * y = A sin(kx - ωt)
 */

function getProgressiveDisplacement(x, time) {

    const A =
        progressiveState.amplitude;

    const k =
        getProgressiveWaveNumber();

    const omega =
        getProgressiveAngularFrequency();

    return (
        A *
        Math.sin(
            k * x -
            omega * time
        )
    );

}


/*
 * dy/dt =
 *
 * -Aω cos(kx - ωt)
 */

function getProgressiveVelocity(x, time) {

    const A =
        progressiveState.amplitude;

    const k =
        getProgressiveWaveNumber();

    const omega =
        getProgressiveAngularFrequency();

    return (
        -A *
        omega *
        Math.cos(
            k * x -
            omega * time
        )
    );

}


/* =========================================================
   11. STANDING PHYSICS
   ========================================================= */

function getStandingWaveNumber() {

    return (
        PHYSICS.TWO_PI /
        standingState.wavelength
    );

}


function getStandingAngularFrequency() {

    return (
        PHYSICS.TWO_PI *
        standingState.frequency
    );

}


/*
 * y = 2A cos(kx) sin(ωt)
 */

function getStandingDisplacement(x, time) {

    const A =
        standingState.amplitude;

    const k =
        getStandingWaveNumber();

    const omega =
        getStandingAngularFrequency();

    return (
        2 *
        A *
        Math.cos(k * x) *
        Math.sin(omega * time)
    );

}


/*
 * dy/dt =
 *
 * 2Aω cos(kx) cos(ωt)
 */

function getStandingVelocity(x, time) {

    const A =
        standingState.amplitude;

    const k =
        getStandingWaveNumber();

    const omega =
        getStandingAngularFrequency();

    return (
        2 *
        A *
        omega *
        Math.cos(k * x) *
        Math.cos(omega * time)
    );

}


function getStandingLocalAmplitude(x) {

    const A =
        standingState.amplitude;

    const k =
        getStandingWaveNumber();

    return Math.abs(
        2 *
        A *
        Math.cos(k * x)
    );

}


/* =========================================================
   12. UPDATE PROGRESSIVE PARTICLES
   ========================================================= */

function updateProgressiveParticles() {

    for (
        const particle
        of progressiveState.particles
    ) {

        const x =
            particle.canvasX;

        particle.displacement =
            getProgressiveDisplacement(
                x,
                progressiveState.time
            );

        particle.velocity =
            getProgressiveVelocity(
                x,
                progressiveState.time
            );

        particle.localAmplitude =
            progressiveState.amplitude;

        particle.canvasY =
            progressiveState.equilibriumY -
            particle.displacement;

    }

}


/* =========================================================
   13. UPDATE STANDING PARTICLES
   ========================================================= */

function updateStandingParticles() {

    for (
        const particle
        of standingState.particles
    ) {

        /*
         * Convert canvas position into
         * physical x measured from the
         * left edge of the wave region.
         */

        const x =
            particle.canvasX -
            standingState.leftMargin;

        particle.displacement =
            getStandingDisplacement(
                x,
                standingState.time
            );

        particle.velocity =
            getStandingVelocity(
                x,
                standingState.time
            );

        particle.localAmplitude =
            getStandingLocalAmplitude(x);

        particle.canvasY =
            standingState.equilibriumY -
            particle.displacement;

    }

}


/* =========================================================
   14. UPDATE PARTICLE POSITIONS
   ========================================================= */

function updateProgressivePositions() {

    for (
        const particle
        of progressiveState.particles
    ) {

        particle.canvasX =
            progressiveXToCanvas(
                particle.x
            );

    }

    updateProgressiveParticles();

}


function updateStandingPositions() {

    for (
        const particle
        of standingState.particles
    ) {

        particle.canvasX =
            standingXToCanvas(
                particle.x
            );

    }

    chooseStandingHighlights();

    updateStandingParticles();

}


/* =========================================================
   15. PROGRESSIVE HIGHLIGHTS
   ========================================================= */

function chooseProgressiveHighlights() {

    const particles =
        progressiveState.particles;

    if (particles.length < 2) {
        return;
    }

    particles.forEach(p => {

        p.highlighted = false;
        p.color = null;

    });

    let index =
        Math.min(
            Math.max(
                0,
                Math.floor(
                    particles.length / 2
                )
            ),
            particles.length - 2
        );

    progressiveState.greenIndex =
        index;

    progressiveState.redIndex =
        index + 1;

    particles[index].highlighted =
        true;

    particles[index].color =
        "green";

    particles[index + 1].highlighted =
        true;

    particles[index + 1].color =
        "red";

}


/* =========================================================
   16. STANDING HIGHLIGHTS
   ========================================================= */

function getStandingLoopIndex(x) {

    const lambda =
        standingState.wavelength;

    return Math.floor(
        (
            x -
            lambda / 4
        ) /
        (lambda / 2)
    );

}


function chooseStandingHighlights() {

    const particles =
        standingState.particles;

    if (particles.length < 2) {
        return;
    }

    particles.forEach(p => {

        p.highlighted = false;
        p.color = null;

    });

    let best = null;

    const centre =
        standingState.width / 2;

    for (
        let i = 0;
        i < particles.length - 1;
        i++
    ) {

        const p1 =
            particles[i];

        const p2 =
            particles[i + 1];

        const x1 =
            p1.canvasX -
            standingState.leftMargin;

        const x2 =
            p2.canvasX -
            standingState.leftMargin;

        if (
            getStandingLoopIndex(x1) !==
            getStandingLoopIndex(x2)
        ) {
            continue;
        }

        const a1 =
            getStandingLocalAmplitude(x1);

        const a2 =
            getStandingLocalAmplitude(x2);

        if (
            a1 <
            standingState.amplitude * 0.15 ||
            a2 <
            standingState.amplitude * 0.15
        ) {
            continue;
        }

        const pairCentre =
            (
                p1.canvasX +
                p2.canvasX
            ) / 2;

        const distance =
            Math.abs(
                pairCentre -
                centre
            );

        if (
            !best ||
            distance < best.distance
        ) {

            best = {
                p1,
                p2,
                distance
            };

        }

    }

    if (!best) {

        const index =
            Math.floor(
                particles.length * 0.45
            );

        best = {

            p1:
                particles[index],

            p2:
                particles[index + 1]

        };

    }

    if (best.p1) {

        best.p1.highlighted =
            true;

        best.p1.color =
            "green";

        standingState.greenIndex =
            best.p1.index;

    }

    if (best.p2) {

        best.p2.highlighted =
            true;

        best.p2.color =
            "red";

        standingState.redIndex =
            best.p2.index;

    }

}


/* =========================================================
   17. BACKGROUND
   ========================================================= */

function drawBackground(
    ctx,
    width,
    height,
    colors
) {

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            height
        );

    gradient.addColorStop(
        0,
        colors[0]
    );

    gradient.addColorStop(
        0.5,
        colors[1]
    );

    gradient.addColorStop(
        1,
        colors[2]
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );

}


/* =========================================================
   18. EQUILIBRIUM LINE
   ========================================================= */

function drawEquilibriumLine(
    ctx,
    state,
    label
) {

    const y =
        state.equilibriumY;

    ctx.save();

    ctx.beginPath();

    ctx.setLineDash([
        7,
        6
    ]);

    ctx.moveTo(
        20,
        y
    );

    ctx.lineTo(
        state.width - 20,
        y
    );

    ctx.strokeStyle =
        "#aab5ad";

    ctx.lineWidth =
        1;

    ctx.stroke();

    ctx.restore();

    ctx.save();

    ctx.fillStyle =
        "#7c877d";

    ctx.font =
        "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    ctx.textAlign =
        "left";

    ctx.textBaseline =
        "bottom";

    ctx.fillText(
        label,
        24,
        y - 6
    );

    ctx.restore();

}


/* =========================================================
   19. GENERIC PARTICLE DRAWING
   ========================================================= */

function drawParticle(
    ctx,
    particle,
    radius,
    color
) {

    ctx.beginPath();

    ctx.arc(
        particle.canvasX,
        particle.canvasY,
        radius,
        0,
        PHYSICS.TWO_PI
    );

    ctx.fillStyle =
        color;

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
        particle.canvasX - 1,
        particle.canvasY - 1,
        1.2,
        0,
        PHYSICS.TWO_PI
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.fill();

}


/* =========================================================
   20. HIGHLIGHT PARTICLE
   ========================================================= */

function drawHighlightedParticle(
    ctx,
    particle,
    color,
    label
) {

    if (!particle) {
        return;
    }

    const radius =
        PHYSICS.HIGHLIGHT_RADIUS;

    ctx.save();

    ctx.shadowBlur =
        13;

    ctx.shadowColor =
        color;

    ctx.beginPath();

    ctx.arc(
        particle.canvasX,
        particle.canvasY,
        radius,
        0,
        PHYSICS.TWO_PI
    );

    ctx.fillStyle =
        color;

    ctx.fill();

    ctx.restore();

    ctx.beginPath();

    ctx.arc(
        particle.canvasX,
        particle.canvasY,
        radius + 1,
        0,
        PHYSICS.TWO_PI
    );

    ctx.strokeStyle =
        "#ffffff";

    ctx.lineWidth =
        2;

    ctx.stroke();

    ctx.save();

    ctx.font =
        "bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillStyle =
        color;

    ctx.fillText(
        label,
        particle.canvasX,
        particle.canvasY +
        (
            color === "#20b94f"
                ? -18
                : 24
        )
    );

    ctx.restore();

}


/* =========================================================
   21. DRAW PROGRESSIVE MEDIUM
   ========================================================= */

function drawProgressiveMedium() {

    const ctx =
        progressiveCtx;

    const particles =
        progressiveState.particles;

    if (particles.length < 2) {
        return;
    }

    ctx.save();

    ctx.beginPath();

    particles.forEach(
        (particle, index) => {

            if (index === 0) {

                ctx.moveTo(
                    particle.canvasX,
                    particle.canvasY
                );

            } else {

                ctx.lineTo(
                    particle.canvasX,
                    particle.canvasY
                );

            }

        }
    );

    ctx.strokeStyle =
        "#8eaa8b";

    ctx.lineWidth =
        2;

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.stroke();

    ctx.restore();

}


/* =========================================================
   22. DRAW PROGRESSIVE WAVE
   ========================================================= */

function drawProgressiveProfile() {

    const ctx =
        progressiveCtx;

    const left =
        progressiveState.leftMargin;

    const right =
        progressiveState.width -
        progressiveState.rightMargin;

    const step =
        Math.max(
            2,
            progressiveState.width / 180
        );

    ctx.save();

    ctx.beginPath();

    let first =
        true;

    for (
        let x = left;
        x <= right;
        x += step
    ) {

        const y =
            progressiveState.equilibriumY -
            getProgressiveDisplacement(
                x,
                progressiveState.time
            );

        if (first) {

            ctx.moveTo(
                x,
                y
            );

            first = false;

        } else {

            ctx.lineTo(
                x,
                y
            );

        }

    }

    ctx.strokeStyle =
        "#4e8f42";

    ctx.lineWidth =
        2.5;

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.stroke();

    ctx.restore();

}


/* =========================================================
   23. PROGRESSIVE DIRECTION
   ========================================================= */

function drawProgressiveDirection() {

    if (
        !progressiveState.showDirection
    ) {
        return;
    }

    const ctx =
        progressiveCtx;

    const width =
        progressiveState.width;

    const y =
        25;

    const start =
        Math.max(
            25,
            width * 0.55
        );

    const end =
        Math.min(
            width - 25,
            width * 0.84
        );

    ctx.save();

    ctx.strokeStyle =
        "#4e8f42";

    ctx.fillStyle =
        "#4e8f42";

    ctx.lineWidth =
        2.5;

    ctx.beginPath();

    ctx.moveTo(
        start,
        y
    );

    ctx.lineTo(
        end,
        y
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        end,
        y
    );

    ctx.lineTo(
        end - 9,
        y - 6
    );

    ctx.lineTo(
        end - 9,
        y + 6
    );

    ctx.closePath();

    ctx.fill();

    ctx.font =
        "bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "Wave travels →",
        (start + end) / 2,
        y - 8
    );

    ctx.restore();

}


/* =========================================================
   24. PROGRESSIVE ENERGY
   ========================================================= */

function drawProgressiveEnergy() {

    if (
        !progressiveState.showEnergy
    ) {
        return;
    }

    const ctx =
        progressiveCtx;

    const width =
        progressiveState.width;

    const y =
        progressiveState.height - 25;

    const travelWidth =
        Math.max(
            40,
            width - 80
        );

    const x =
        40 +
        (
            progressiveState.time *
            0.25 %
            1
        ) *
        travelWidth;

    ctx.save();

    ctx.strokeStyle =
        "#e39a24";

    ctx.fillStyle =
        "#e39a24";

    ctx.lineWidth =
        2;

    ctx.beginPath();

    ctx.moveTo(
        35,
        y
    );

    ctx.lineTo(
        width - 35,
        y
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        5,
        0,
        PHYSICS.TWO_PI
    );

    ctx.fill();

    ctx.beginPath();

    ctx.moveTo(
        width - 35,
        y
    );

    ctx.lineTo(
        width - 45,
        y - 5
    );

    ctx.lineTo(
        width - 45,
        y + 5
    );

    ctx.closePath();

    ctx.fill();

    ctx.font =
        "bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "Energy transfer →",
        width / 2,
        y - 7
    );

    ctx.restore();

}


/* =========================================================
   25. PROGRESSIVE PHASE
   ========================================================= */

function drawProgressivePhase() {

    if (
        !progressiveState.showPhase
    ) {
        return;
    }

    const green =
        progressiveState.particles[
            progressiveState.greenIndex
        ];

    const red =
        progressiveState.particles[
            progressiveState.redIndex
        ];

    if (!green || !red) {
        return;
    }

    const ctx =
        progressiveCtx;

    const deltaX =
        Math.abs(
            red.canvasX -
            green.canvasX
        );

    let phase =
        getProgressiveWaveNumber() *
        deltaX;

    phase =
        phase %
        PHYSICS.TWO_PI;

    const degrees =
        phase *
        180 /
        Math.PI;

    ctx.save();

    ctx.setLineDash([
        4,
        4
    ]);

    ctx.strokeStyle =
        "rgba(70,90,70,0.35)";

    ctx.lineWidth =
        1;

    ctx.beginPath();

    ctx.moveTo(
        green.canvasX,
        35
    );

    ctx.lineTo(
        green.canvasX,
        progressiveState.height - 70
    );

    ctx.moveTo(
        red.canvasX,
        35
    );

    ctx.lineTo(
        red.canvasX,
        progressiveState.height - 70
    );

    ctx.stroke();

    ctx.setLineDash([]);

    const boxWidth =
        200;

    const boxHeight =
        40;

    const centre =
        (
            green.canvasX +
            red.canvasX
        ) / 2;

    const boxX =
        Math.max(
            8,
            Math.min(
                progressiveState.width -
                boxWidth -
                8,
                centre -
                boxWidth / 2
            )
        );

    const boxY =
        progressiveState.height -
        58;

    ctx.fillStyle =
        "rgba(255,255,255,0.94)";

    ctx.fillRect(
        boxX,
        boxY,
        boxWidth,
        boxHeight
    );

    ctx.strokeStyle =
        "#cbd8c7";

    ctx.strokeRect(
        boxX,
        boxY,
        boxWidth,
        boxHeight
    );

    ctx.fillStyle =
        "#4c5d4d";

    ctx.font =
        "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillText(
        `Phase difference: ${degrees.toFixed(1)}°`,
        boxX + boxWidth / 2,
        boxY + 16
    );

    ctx.fillText(
        "Adjacent particles have different phases",
        boxX + boxWidth / 2,
        boxY + 31
    );

    ctx.restore();

    const element =
        getElement(
            "progressivePhaseDifference"
        );

    if (element) {

        element.textContent =
            `Δφ = ${degrees.toFixed(1)}°`;

    }

}


/* =========================================================
   26. DRAW PROGRESSIVE
   ========================================================= */

function drawProgressiveWave() {

    if (!progressiveCtx) {
        return;
    }

    updateProgressivePositions();

    drawBackground(
        progressiveCtx,
        progressiveState.width,
        progressiveState.height,
        [
            "#ffffff",
            "#f8fbf7",
            "#f1f6ef"
        ]
    );

    drawEquilibriumLine(
        progressiveCtx,
        progressiveState,
        "Equilibrium"
    );

    drawProgressiveDirection();

    drawProgressiveMedium();

    drawProgressiveProfile();

    for (
        const particle
        of progressiveState.particles
    ) {

        if (
            particle.highlighted
        ) {
            continue;
        }

        drawParticle(
            progressiveCtx,
            particle,
            PHYSICS.PARTICLE_RADIUS,
            "#647d64"
        );

    }

    drawHighlightedParticle(
        progressiveCtx,
        progressiveState.particles[
            progressiveState.greenIndex
        ],
        "#20b94f",
        "Particle A"
    );

    drawHighlightedParticle(
        progressiveCtx,
        progressiveState.particles[
            progressiveState.redIndex
        ],
        "#ed3d3d",
        "Particle B"
    );

    drawProgressivePhase();

    drawProgressiveEnergy();

    updateProgressiveInfo();

}


/* =========================================================
   27. STANDING NODES
   ========================================================= */

function getStandingNodePositions() {

    const nodes = [];

    const lambda =
        standingState.wavelength;

    const left =
        standingState.leftMargin;

    const right =
        standingState.width -
        standingState.rightMargin;

    /*
     * Physical x is measured from
     * the left edge of the wave region.
     */

    for (
        let x = lambda / 4;
        x <= right - left;
        x += lambda / 2
    ) {

        nodes.push(
            left + x
        );

    }

    return nodes;

}


/* =========================================================
   28. STANDING ANTINODES
   ========================================================= */

function getStandingAntinodePositions() {

    const antinodes = [];

    const lambda =
        standingState.wavelength;

    const left =
        standingState.leftMargin;

    const right =
        standingState.width -
        standingState.rightMargin;

    for (
        let x = 0;
        x <= right - left;
        x += lambda / 2
    ) {

        antinodes.push(
            left + x
        );

    }

    return antinodes;

}


/* =========================================================
   29. DRAW STANDING NODES
   ========================================================= */

function drawStandingNodes() {

    if (
        !standingState.showNodes
    ) {
        return;
    }

    const ctx =
        standingCtx;

    const y =
        standingState.equilibriumY;

    const nodes =
        getStandingNodePositions();

    ctx.save();

    for (
        const x
        of nodes
    ) {

        ctx.beginPath();

        ctx.setLineDash([
            4,
            5
        ]);

        ctx.moveTo(
            x,
            38
        );

        ctx.lineTo(
            x,
            standingState.height - 42
        );

        ctx.strokeStyle =
            "rgba(56,111,164,0.28)";

        ctx.lineWidth =
            1;

        ctx.stroke();

        ctx.setLineDash([]);

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            6,
            0,
            PHYSICS.TWO_PI
        );

        ctx.fillStyle =
            "#386fa4";

        ctx.fill();

        ctx.strokeStyle =
            "#ffffff";

        ctx.lineWidth =
            2;

        ctx.stroke();

        ctx.fillStyle =
            "#386fa4";

        ctx.font =
            "bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "N",
            x,
            30
        );

    }

    ctx.restore();

}


/* =========================================================
   30. DRAW STANDING ANTINODES
   ========================================================= */

function drawStandingAntinodes() {

    if (
        !standingState.showNodes
    ) {
        return;
    }

    const ctx =
        standingCtx;

    const y =
        standingState.equilibriumY;

    const antinodes =
        getStandingAntinodePositions();

    ctx.save();

    for (
        const x
        of antinodes
    ) {

        if (
            x <
            standingState.leftMargin ||
            x >
            standingState.width -
            standingState.rightMargin
        ) {
            continue;
        }

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            5,
            0,
            PHYSICS.TWO_PI
        );

        ctx.fillStyle =
            "#4f84ae";

        ctx.globalAlpha =
            0.75;

        ctx.fill();

        ctx.globalAlpha =
            1;

        ctx.fillStyle =
            "#386fa4";

        ctx.font =
            "bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "A",
            x,
            standingState.height - 25
        );

    }

    ctx.restore();

}


/* =========================================================
   31. STANDING NODE INFORMATION
   ========================================================= */

function drawStandingNodeInformation() {

    if (
        !standingState.showNodes
    ) {
        return;
    }

    const ctx =
        standingCtx;

    const boxWidth =
        205;

    const boxHeight =
        38;

    const x =
        Math.max(
            8,
            standingState.width -
            boxWidth -
            10
        );

    const y =
        8;

    ctx.save();

    ctx.fillStyle =
        "rgba(255,255,255,0.92)";

    ctx.fillRect(
        x,
        y,
        boxWidth,
        boxHeight
    );

    ctx.strokeStyle =
        "#c8d9e7";

    ctx.strokeRect(
        x,
        y,
        boxWidth,
        boxHeight
    );

    ctx.fillStyle =
        "#3d6382";

    ctx.font =
        "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "N = Node     A = Antinode",
        x + boxWidth / 2,
        y + 15
    );

    ctx.fillText(
        "Node spacing = λ / 2",
        x + boxWidth / 2,
        y + 30
    );

    ctx.restore();

}


/* =========================================================
   32. STANDING PHASE
   ========================================================= */

function drawStandingPhase() {

    if (
        !standingState.showPhase
    ) {
        return;
    }

    const green =
        standingState.particles[
            standingState.greenIndex
        ];

    const red =
        standingState.particles[
            standingState.redIndex
        ];

    if (!green || !red) {
        return;
    }

    const ctx =
        standingCtx;

    ctx.save();

    ctx.setLineDash([
        4,
        4
    ]);

    ctx.strokeStyle =
        "rgba(60,90,110,0.32)";

    ctx.lineWidth =
        1;

    ctx.beginPath();

    ctx.moveTo(
        green.canvasX,
        45
    );

    ctx.lineTo(
        green.canvasX,
        standingState.height - 65
    );

    ctx.moveTo(
        red.canvasX,
        45
    );

    ctx.lineTo(
        red.canvasX,
        standingState.height - 65
    );

    ctx.stroke();

    ctx.setLineDash([]);

    const boxWidth =
        210;

    const boxHeight =
        40;

    const centre =
        (
            green.canvasX +
            red.canvasX
        ) / 2;

    const boxX =
        Math.max(
            8,
            Math.min(
                standingState.width -
                boxWidth -
                8,
                centre -
                boxWidth / 2
            )
        );

    const boxY =
        standingState.height -
        58;

    ctx.fillStyle =
        "rgba(255,255,255,0.94)";

    ctx.fillRect(
        boxX,
        boxY,
        boxWidth,
        boxHeight
    );

    ctx.strokeStyle =
        "#c8d9e7";

    ctx.strokeRect(
        boxX,
        boxY,
        boxWidth,
        boxHeight
    );

    ctx.fillStyle =
        "#3c607c";

    ctx.font =
        "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "Same phase: Δφ = 0°",
        boxX + boxWidth / 2,
        boxY + 16
    );

    ctx.fillText(
        "Particles between adjacent nodes",
        boxX + boxWidth / 2,
        boxY + 31
    );

    ctx.restore();

    const phaseElement =
        getElement(
            "standingPhaseDifference"
        );

    if (phaseElement) {

        phaseElement.textContent =
            "Δφ = 0°";

    }

}


/* =========================================================
   33. STANDING ENERGY
   ========================================================= */

function drawStandingEnergy() {

    if (
        !standingState.showEnergy
    ) {
        return;
    }

    const ctx =
        standingCtx;

    const width =
        standingState.width;

    const y =
        standingState.height -
        20;

    ctx.save();

    ctx.strokeStyle =
        "#d48a28";

    ctx.fillStyle =
        "#d48a28";

    ctx.lineWidth =
        2;

    ctx.beginPath();

    ctx.moveTo(
        45,
        y
    );

    ctx.lineTo(
        width - 45,
        y
    );

    ctx.stroke();

    const spacing =
        Math.max(
            90,
            standingState.wavelength / 2
        );

    const direction =
        Math.sin(
            getStandingAngularFrequency() *
            standingState.time
        ) >= 0
            ? -1
            : 1;

    for (
        let x = 70;
        x < width - 50;
        x += spacing
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            y
        );

        ctx.lineTo(
            x,
            y + direction * 8
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
            x,
            y + direction * 8
        );

        ctx.lineTo(
            x - 4,
            y + direction * 2
        );

        ctx.lineTo(
            x + 4,
            y + direction * 2
        );

        ctx.closePath();

        ctx.fill();

    }

    ctx.font =
        "bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "No net energy transmission along the string",
        width / 2,
        y - 7
    );

    ctx.restore();

}


/* =========================================================
   34. DRAW STANDING WAVE
   ========================================================= */

function drawStandingWave() {

    if (!standingCtx) {
        return;
    }

    updateStandingPositions();

    drawBackground(
        standingCtx,
        standingState.width,
        standingState.height,
        [
            "#ffffff",
            "#f8fbfe",
            "#f0f6fb"
        ]
    );

    drawEquilibriumLine(
        standingCtx,
        standingState,
        "Equilibrium"
    );

    drawStandingNodes();

    drawStandingAntinodes();

    drawStandingNodeInformation();

    /*
     * Medium.
     */

    const particles =
        standingState.particles;

    if (particles.length > 1) {

        standingCtx.save();

        standingCtx.beginPath();

        particles.forEach(
            (particle, index) => {

                if (index === 0) {

                    standingCtx.moveTo(
                        particle.canvasX,
                        particle.canvasY
                    );

                } else {

                    standingCtx.lineTo(
                        particle.canvasX,
                        particle.canvasY
                    );

                }

            }
        );

        standingCtx.strokeStyle =
            "#91abc0";

        standingCtx.lineWidth =
            2;

        standingCtx.lineCap =
            "round";

        standingCtx.lineJoin =
            "round";

        standingCtx.stroke();

        standingCtx.restore();

    }

    /*
     * Smooth mathematical profile.
     */

    const left =
        standingState.leftMargin;

    const right =
        standingState.width -
        standingState.rightMargin;

    const step =
        Math.max(
            2,
            standingState.width / 180
        );

    standingCtx.save();

    standingCtx.beginPath();

    let first = true;

    for (
        let canvasX = left;
        canvasX <= right;
        canvasX += step
    ) {

        const x =
            canvasX -
            standingState.leftMargin;

        const y =
            standingState.equilibriumY -
            getStandingDisplacement(
                x,
                standingState.time
            );

        if (first) {

            standingCtx.moveTo(
                canvasX,
                y
            );

            first = false;

        } else {

            standingCtx.lineTo(
                canvasX,
                y
            );

        }

    }

    standingCtx.strokeStyle =
        "#386fa4";

    standingCtx.lineWidth =
        2.5;

    standingCtx.lineCap =
        "round";

    standingCtx.lineJoin =
        "round";

    standingCtx.stroke();

    standingCtx.restore();

    /*
     * Normal particles.
     */

    particles.forEach(
        particle => {

            if (
                particle.highlighted
            ) {
                return;
            }

            const ratio =
                standingState.amplitude > 0
                    ? particle.localAmplitude /
                      (
                          2 *
                          standingState.amplitude
                      )
                    : 0;

            const brightness =
                Math.round(
                    135 -
                    ratio * 35
                );

            drawParticle(
                standingCtx,
                particle,
                PHYSICS.PARTICLE_RADIUS,
                `rgb(${brightness - 15}, ${brightness + 5}, ${brightness + 25})`
            );

        }
    );

    /*
     * Highlighted particles.
     */

    drawHighlightedParticle(
        standingCtx,
        particles[
            standingState.greenIndex
        ],
        "#20b94f",
        "Particle A"
    );

    drawHighlightedParticle(
        standingCtx,
        particles[
            standingState.redIndex
        ],
        "#ed3d3d",
        "Particle B"
    );

    drawStandingPhase();

    drawStandingEnergy();

    updateStandingInfo();

}


/* =========================================================
   35. MOTION DESCRIPTION
   ========================================================= */

function getMotionDescription(velocity) {

    if (
        Math.abs(velocity) < 0.5
    ) {

        return "At rest";

    }

    return velocity > 0
        ? "↑ Up"
        : "↓ Down";

}


/* =========================================================
   36. PROGRESSIVE INFORMATION
   ========================================================= */

function updateProgressiveInfo() {

    const green =
        progressiveState.particles[
            progressiveState.greenIndex
        ];

    const red =
        progressiveState.particles[
            progressiveState.redIndex
        ];

    if (!green || !red) {
        return;
    }

    const values = {

        progressiveGreenX:
            formatNumber(
                green.canvasX,
                1
            ),

        progressiveGreenY:
            formatNumber(
                green.displacement,
                1
            ),

        progressiveGreenAmplitude:
            `A = ${formatNumber(
                progressiveState.amplitude,
                0
            )}`,

        progressiveGreenMotion:
            getMotionDescription(
                green.velocity
            ),

        progressiveRedX:
            formatNumber(
                red.canvasX,
                1
            ),

        progressiveRedY:
            formatNumber(
                red.displacement,
                1
            ),

        progressiveRedAmplitude:
            `A = ${formatNumber(
                progressiveState.amplitude,
                0
            )}`,

        progressiveRedMotion:
            getMotionDescription(
                red.velocity
            )

    };

    Object.entries(values).forEach(
        ([id, value]) => {

            const element =
                getElement(id);

            if (element) {
                element.textContent =
                    value;
            }

        }
    );

    const time =
        getElement(
            "progressiveTime"
        );

    if (time) {

        time.textContent =
            `t = ${formatNumber(
                progressiveState.time,
                2
            )} s`;

    }

}


/* =========================================================
   37. STANDING INFORMATION
   ========================================================= */

function updateStandingInfo() {

    const green =
        standingState.particles[
            standingState.greenIndex
        ];

    const red =
        standingState.particles[
            standingState.redIndex
        ];

    if (!green || !red) {
        return;
    }

    const values = {

        standingGreenX:
            formatNumber(
                green.canvasX,
                1
            ),

        standingGreenY:
            formatNumber(
                green.displacement,
                1
            ),

        standingGreenAmplitude:
            formatNumber(
                green.localAmplitude,
                1
            ),

        standingGreenMotion:
            getMotionDescription(
                green.velocity
            ),

        standingRedX:
            formatNumber(
                red.canvasX,
                1
            ),

        standingRedY:
            formatNumber(
                red.displacement,
                1
            ),

        standingRedAmplitude:
            formatNumber(
                red.localAmplitude,
                1
            ),

        standingRedMotion:
            getMotionDescription(
                red.velocity
            )

    };

    Object.entries(values).forEach(
        ([id, value]) => {

            const element =
                getElement(id);

            if (element) {
                element.textContent =
                    value;
            }

        }
    );

    const time =
        getElement(
            "standingTime"
        );

    if (time) {

        time.textContent =
            `t = ${formatNumber(
                standingState.time,
                2
            )} s`;

    }

}


/* =========================================================
   38. SLIDER DISPLAY
   ========================================================= */

function updateProgressiveSliderDisplays() {

    const values = {

        progressiveSpeedValue:
            `${progressiveState.speed.toFixed(1)}×`,

        progressiveAmplitudeValue:
            progressiveState.amplitude.toFixed(0),

        progressiveFrequencyValue:
            `${progressiveState.frequency.toFixed(1)} Hz`,

        progressiveWavelengthValue:
            progressiveState.wavelength.toFixed(0)

    };

    Object.entries(values).forEach(
        ([id, value]) => {

            const element =
                getElement(id);

            if (element) {
                element.textContent =
                    value;
            }

        }
    );

}


function updateStandingSliderDisplays() {

    const values = {

        standingSpeedValue:
            `${standingState.speed.toFixed(1)}×`,

        standingAmplitudeValue:
            standingState.amplitude.toFixed(0),

        standingFrequencyValue:
            `${standingState.frequency.toFixed(1)} Hz`,

        standingWavelengthValue:
            standingState.wavelength.toFixed(0)

    };

    Object.entries(values).forEach(
        ([id, value]) => {

            const element =
                getElement(id);

            if (element) {
                element.textContent =
                    value;
            }

        }
    );

}


/* =========================================================
   39. PROGRESSIVE ANIMATION
   ========================================================= */

function progressiveAnimationLoop(timestamp) {

    if (
        !progressiveState.running
    ) {
        return;
    }

    if (
        progressiveState.lastTimestamp ===
        null
    ) {

        progressiveState.lastTimestamp =
            timestamp;

    }

    let dt =
        (
            timestamp -
            progressiveState.lastTimestamp
        ) / 1000;

    dt =
        Math.min(
            dt,
            PHYSICS.MAX_DELTA_TIME
        );

    progressiveState.lastTimestamp =
        timestamp;

    progressiveState.time +=
        dt *
        progressiveState.speed;

    /*
     * HARD 60-SECOND LIMIT.
     */

    if (
        progressiveState.time >=
        PHYSICS.MAX_TIME
    ) {

        progressiveState.time =
            PHYSICS.MAX_TIME;

        progressiveState.running =
            false;

        progressiveState.finished =
            true;

        progressiveState.animationFrame =
            null;

        progressiveState.lastTimestamp =
            null;

        drawProgressiveWave();

        updatePlayPauseButtons();

        updateAccessibilityStatus();

        return;

    }

    drawProgressiveWave();

    progressiveState.animationFrame =
        requestAnimationFrame(
            progressiveAnimationLoop
        );

}


/* =========================================================
   40. STANDING ANIMATION
   ========================================================= */

function standingAnimationLoop(timestamp) {

    if (
        !standingState.running
    ) {
        return;
    }

    if (
        standingState.lastTimestamp ===
        null
    ) {

        standingState.lastTimestamp =
            timestamp;

    }

    let dt =
        (
            timestamp -
            standingState.lastTimestamp
        ) / 1000;

    dt =
        Math.min(
            dt,
            PHYSICS.MAX_DELTA_TIME
        );

    standingState.lastTimestamp =
        timestamp;

    standingState.time +=
        dt *
        standingState.speed;

    /*
     * HARD 60-SECOND LIMIT.
     */

    if (
        standingState.time >=
        PHYSICS.MAX_TIME
    ) {

        standingState.time =
            PHYSICS.MAX_TIME;

        standingState.running =
            false;

        standingState.finished =
            true;

        standingState.animationFrame =
            null;

        standingState.lastTimestamp =
            null;

        drawStandingWave();

        updatePlayPauseButtons();

        updateAccessibilityStatus();

        return;

    }

    drawStandingWave();

    standingState.animationFrame =
        requestAnimationFrame(
            standingAnimationLoop
        );

}


/* =========================================================
   41. PLAY / PAUSE PROGRESSIVE
   ========================================================= */

function playProgressiveWave() {

    if (
        progressiveState.running
    ) {
        return;
    }

    /*
     * Cannot continue after 60 s.
     * Reset is required for a new run.
     */

    if (
        progressiveState.finished ||
        progressiveState.time >=
        PHYSICS.MAX_TIME
    ) {

        return;

    }

    progressiveState.running =
        true;

    progressiveState.lastTimestamp =
        null;

    progressiveState.animationFrame =
        requestAnimationFrame(
            progressiveAnimationLoop
        );

    updatePlayPauseButtons();

}


function pauseProgressiveWave() {

    progressiveState.running =
        false;

    if (
        progressiveState.animationFrame !==
        null
    ) {

        cancelAnimationFrame(
            progressiveState.animationFrame
        );

    }

    progressiveState.animationFrame =
        null;

    progressiveState.lastTimestamp =
        null;

    drawProgressiveWave();

    updatePlayPauseButtons();

}


/* =========================================================
   42. PLAY / PAUSE STANDING
   ========================================================= */

function playStandingWave() {

    if (
        standingState.running
    ) {
        return;
    }

    if (
        standingState.finished ||
        standingState.time >=
        PHYSICS.MAX_TIME
    ) {

        return;

    }

    standingState.running =
        true;

    standingState.lastTimestamp =
        null;

    standingState.animationFrame =
        requestAnimationFrame(
            standingAnimationLoop
        );

    updatePlayPauseButtons();

}


function pauseStandingWave() {

    standingState.running =
        false;

    if (
        standingState.animationFrame !==
        null
    ) {

        cancelAnimationFrame(
            standingState.animationFrame
        );

    }

    standingState.animationFrame =
        null;

    standingState.lastTimestamp =
        null;

    drawStandingWave();

    updatePlayPauseButtons();

}


/* =========================================================
   43. RESET PROGRESSIVE
   ========================================================= */

function resetProgressiveWave() {

    pauseProgressiveWave();

    progressiveState.time =
        0;

    progressiveState.finished =
        false;

    progressiveState.speed =
        PHYSICS.DEFAULT_SPEED;

    progressiveState.amplitude =
        PHYSICS.DEFAULT_AMPLITUDE;

    progressiveState.frequency =
        PHYSICS.DEFAULT_FREQUENCY;

    progressiveState.wavelength =
        PHYSICS.DEFAULT_WAVELENGTH;

    setSliderValue(
        "progressiveSpeed",
        progressiveState.speed
    );

    setSliderValue(
        "progressiveAmplitude",
        progressiveState.amplitude
    );

    setSliderValue(
        "progressiveFrequency",
        progressiveState.frequency
    );

    setSliderValue(
        "progressiveWavelength",
        progressiveState.wavelength
    );

    updateProgressiveSliderDisplays();

    chooseProgressiveHighlights();

    drawProgressiveWave();

    updatePlayPauseButtons();

}


/* =========================================================
   44. RESET STANDING
   ========================================================= */

function resetStandingWave() {

    pauseStandingWave();

    standingState.time =
        0;

    standingState.finished =
        false;

    standingState.speed =
        PHYSICS.DEFAULT_SPEED;

    standingState.amplitude =
        PHYSICS.DEFAULT_AMPLITUDE;

    standingState.frequency =
        PHYSICS.DEFAULT_FREQUENCY;

    standingState.wavelength =
        PHYSICS.DEFAULT_WAVELENGTH;

    setSliderValue(
        "standingSpeed",
        standingState.speed
    );

    setSliderValue(
        "standingAmplitude",
        standingState.amplitude
    );

    setSliderValue(
        "standingFrequency",
        standingState.frequency
    );

    setSliderValue(
        "standingWavelength",
        standingState.wavelength
    );

    updateStandingSliderDisplays();

    chooseStandingHighlights();

    drawStandingWave();

    updatePlayPauseButtons();

}


/* =========================================================
   45. SET SLIDER
   ========================================================= */

function setSliderValue(
    id,
    value
) {

    const slider =
        getElement(id);

    if (slider) {
        slider.value =
            value;
    }

}


/* =========================================================
   46. GLOBAL RESET
   ========================================================= */

function resetEntireSimulation() {

    resetProgressiveWave();

    resetStandingWave();

    hideFinishedMessages();

    updateComparisonPanel();

    updatePhysicsRelationship();

    updatePlayPauseButtons();

    updateAccessibilityStatus();

}


/* =========================================================
   47. GLOBAL CONTROLS
   ========================================================= */

function setupGlobalControls() {

    const reset =
        getElement("resetAll");

    if (reset) {

        reset.addEventListener(
            "click",
            resetEntireSimulation
        );

    }

    const play =
        getElement("playAll");

    if (play) {

        play.addEventListener(
            "click",
            () => {

                playProgressiveWave();
                playStandingWave();

            }
        );

    }

    const pause =
        getElement("pauseAll");

    if (pause) {

        pause.addEventListener(
            "click",
            () => {

                pauseProgressiveWave();
                pauseStandingWave();

            }
        );

    }

}


/* =========================================================
   48. PROGRESSIVE CONTROLS
   ========================================================= */

function setupProgressiveControls() {

    const play =
        getElement(
            "progressivePlay"
        );

    const pause =
        getElement(
            "progressivePause"
        );

    const reset =
        getElement(
            "progressiveReset"
        );

    if (play) {

        play.addEventListener(
            "click",
            playProgressiveWave
        );

    }

    if (pause) {

        pause.addEventListener(
            "click",
            pauseProgressiveWave
        );

    }

    if (reset) {

        reset.addEventListener(
            "click",
            resetProgressiveWave
        );

    }

    bindRange(
        "progressiveSpeed",
        value => {

            progressiveState.speed =
                value;

            updateProgressiveSliderDisplays();

        }
    );

    bindRange(
        "progressiveAmplitude",
        value => {

            progressiveState.amplitude =
                value;

            drawProgressiveWave();

        }
    );

    bindRange(
        "progressiveFrequency",
        value => {

            progressiveState.frequency =
                value;

            drawProgressiveWave();

        }
    );

    bindRange(
        "progressiveWavelength",
        value => {

            progressiveState.wavelength =
                value;

            drawProgressiveWave();

        }
    );

    bindToggle(
        "progressivePhaseToggle",
        value => {

            progressiveState.showPhase =
                value;

            drawProgressiveWave();

        }
    );

    bindToggle(
        "progressiveEnergyToggle",
        value => {

            progressiveState.showEnergy =
                value;

            drawProgressiveWave();

        }
    );

    bindToggle(
        "progressiveDirectionToggle",
        value => {

            progressiveState.showDirection =
                value;

            drawProgressiveWave();

        }
    );

}


/* =========================================================
   49. STANDING CONTROLS
   ========================================================= */

function setupStandingControls() {

    const play =
        getElement(
            "standingPlay"
        );

    const pause =
        getElement(
            "standingPause"
        );

    const reset =
        getElement(
            "standingReset"
        );

    if (play) {

        play.addEventListener(
            "click",
            playStandingWave
        );

    }

    if (pause) {

        pause.addEventListener(
            "click",
            pauseStandingWave
        );

    }

    if (reset) {

        reset.addEventListener(
            "click",
            resetStandingWave
        );

    }

    bindRange(
        "standingSpeed",
        value => {

            standingState.speed =
                value;

            updateStandingSliderDisplays();

        }
    );

    bindRange(
        "standingAmplitude",
        value => {

            standingState.amplitude =
                value;

            drawStandingWave();

        }
    );

    bindRange(
        "standingFrequency",
        value => {

            standingState.frequency =
                value;

            drawStandingWave();

        }
    );

    bindRange(
        "standingWavelength",
        value => {

            standingState.wavelength =
                value;

            chooseStandingHighlights();

            drawStandingWave();

        }
    );

    bindToggle(
        "standingNodesToggle",
        value => {

            standingState.showNodes =
                value;

            drawStandingWave();

        }
    );

    bindToggle(
        "standingPhaseToggle",
        value => {

            standingState.showPhase =
                value;

            drawStandingWave();

        }
    );

    bindToggle(
        "standingEnergyToggle",
        value => {

            standingState.showEnergy =
                value;

            drawStandingWave();

        }
    );

}


/* =========================================================
   50. RANGE BINDING
   ========================================================= */

function bindRange(
    id,
    callback
) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.addEventListener(
        "input",
        () => {

            callback(
                Number(
                    element.value
                )
            );

        }
    );

}


/* =========================================================
   51. TOGGLE BINDING
   ========================================================= */

function bindToggle(
    id,
    callback
) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.addEventListener(
        "change",
        () => {

            callback(
                element.checked
            );

        }
    );

}


/* =========================================================
   52. ACCORDIONS
   ========================================================= */

function setupAccordion(
    buttonId,
    contentId
) {

    const button =
        getElement(buttonId);

    const content =
        getElement(contentId);

    if (!button || !content) {
        return;
    }

    button.addEventListener(
        "click",
        () => {

            const open =
                button.getAttribute(
                    "aria-expanded"
                ) === "true";

            button.setAttribute(
                "aria-expanded",
                String(!open)
            );

            content.hidden =
                open;

        }
    );

}


function initializeAccordions() {

    setupAccordion(
        "physicsRelationshipButton",
        "physicsRelationshipContent"
    );

    setupAccordion(
        "learningObjectiveButton",
        "learningObjectiveContent"
    );

}


/* =========================================================
   53. TABS
   ========================================================= */

function setupSimulationTabs() {

    const buttons =
        document.querySelectorAll(
            "[data-simulation-tab]"
        );

    const panels =
        document.querySelectorAll(
            "[data-simulation-panel]"
        );

    if (!buttons.length) {
        return;
    }

    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        button.getAttribute(
                            "data-simulation-tab"
                        );

                    buttons.forEach(
                        item => {

                            item.classList.toggle(
                                "active",
                                item === button
                            );

                        }
                    );

                    panels.forEach(
                        panel => {

                            panel.hidden =
                                panel.getAttribute(
                                    "data-simulation-panel"
                                ) !== target;

                        }
                    );

                    requestAnimationFrame(
                        resizeAllSimulations
                    );

                }
            );

        }
    );

}


/* =========================================================
   54. TOUCH SUPPORT
   ========================================================= */

function setupTouchSupport() {

    document
        .querySelectorAll(
            "canvas"
        )
        .forEach(
            canvas => {

                /*
                 * Vertical swiping continues to scroll
                 * the page.
                 *
                 * Pinch zoom remains available.
                 */

                canvas.style.touchAction =
                    "pan-y pinch-zoom";

                canvas.style.webkitUserSelect =
                    "none";

                canvas.style.userSelect =
                    "none";

            }
        );

    document
        .querySelectorAll(
            'input[type="range"]'
        )
        .forEach(
            range => {

                range.style.touchAction =
                    "pan-y";

            }
        );

    document
        .querySelectorAll(
            "button"
        )
        .forEach(
            button => {

                button.style.touchAction =
                    "manipulation";

            }
        );

}


/* =========================================================
   55. RESIZE
   ========================================================= */

let resizeFrame =
    null;


function resizeAllSimulations() {

    setupCanvas(
        progressiveCanvas,
        progressiveContainer,
        progressiveState
    );

    setupCanvas(
        standingCanvas,
        standingContainer,
        standingState
    );

    updateProgressivePositions();

    updateStandingPositions();

    drawProgressiveWave();

    drawStandingWave();

}


window.addEventListener(
    "resize",
    () => {

        if (
            resizeFrame !== null
        ) {

            cancelAnimationFrame(
                resizeFrame
            );

        }

        resizeFrame =
            requestAnimationFrame(
                () => {

                    resizeFrame =
                        null;

                    resizeAllSimulations();

                }
            );

    },
    {
        passive: true
    }
);


window.addEventListener(
    "orientationchange",
    () => {

        setTimeout(
            resizeAllSimulations,
            150
        );

    },
    {
        passive: true
    }
);


/* =========================================================
   56. FINISHED MESSAGE
   ========================================================= */

function hideFinishedMessages() {

    const ids = [

        "progressiveFinished",
        "standingFinished",
        "simulationFinished"

    ];

    ids.forEach(
        id => {

            const element =
                getElement(id);

            if (element) {

                element.hidden =
                    true;

            }

        }
    );

}


function showFinishedMessage(
    type
) {

    const ids =
        type === "progressive"
            ? [
                "progressiveFinished",
                "simulationFinished"
            ]
            : [
                "standingFinished",
                "simulationFinished"
            ];

    ids.forEach(
        id => {

            const element =
                getElement(id);

            if (element) {

                element.hidden =
                    false;

            }

        }
    );

}


/* =========================================================
   57. PLAY / PAUSE BUTTON STATE
   ========================================================= */

function updatePlayPauseButtons() {

    const progressPlay =
        getElement(
            "progressivePlay"
        );

    const progressPause =
        getElement(
            "progressivePause"
        );

    const standingPlay =
        getElement(
            "standingPlay"
        );

    const standingPause =
        getElement(
            "standingPause"
        );

    if (progressPlay) {

        progressPlay.disabled =
            progressiveState.finished;

    }

    if (progressPause) {

        progressPause.disabled =
            !progressiveState.running;

    }

    if (standingPlay) {

        standingPlay.disabled =
            standingState.finished;

    }

    if (standingPause) {

        standingPause.disabled =
            !standingState.running;

    }

}


/* =========================================================
   58. PHYSICS RELATIONSHIP
   ========================================================= */

function updatePhysicsRelationship() {

    const progressiveEquation =
        getElement(
            "progressiveEquation"
        );

    const standingEquation =
        getElement(
            "standingEquation"
        );

    const progressiveSpeed =
        getElement(
            "progressiveSpeedInfo"
        );

    const standingRelationship =
        getElement(
            "standingRelationship"
        );

    if (progressiveEquation) {

        progressiveEquation.textContent =
            "y = A sin(kx − ωt)";

    }

    if (standingEquation) {

        standingEquation.textContent =
            "y = 2A cos(kx) sin(ωt)";

    }

    if (progressiveSpeed) {

        progressiveSpeed.textContent =
            `v = fλ = ${formatNumber(
                getProgressiveWaveSpeed(),
                1
            )} units/s`;

    }

    if (standingRelationship) {

        standingRelationship.textContent =
            "Nodes remain fixed while particles oscillate about equilibrium.";

    }

}


/* =========================================================
   59. COMPARISON CARDS
   ========================================================= */

function updateComparisonPanel() {

    const progressiveCard =
        getElement(
            "progressiveKeyDifference"
        );

    const standingCard =
        getElement(
            "standingKeyDifference"
        );

    if (progressiveCard) {

        progressiveCard.textContent =
            "The waveform propagates through the medium.";

    }

    if (standingCard) {

        standingCard.textContent =
            "The waveform pattern remains fixed with nodes and antinodes.";

    }

}


/* =========================================================
   60. LEARNING OBJECTIVES
   ========================================================= */

function updateLearningObjectives() {

    const element =
        getElement(
            "learningObjectiveContent"
        );

    if (!element) {
        return;
    }

    /*
     * Do not overwrite detailed HTML content.
     */

    if (
        element.textContent.trim()
    ) {
        return;
    }

    element.innerHTML = `

        <ul>

            <li>
                Distinguish a progressive wave
                from a standing wave.
            </li>

            <li>
                Observe particles oscillating
                as the wave disturbance travels.
            </li>

            <li>
                Identify nodes and antinodes
                in a standing wave.
            </li>

            <li>
                Compare the phase relationship
                between neighbouring particles.
            </li>

            <li>
                Understand energy transfer in
                progressive and standing waves.
            </li>

        </ul>

    `;

}


/* =========================================================
   61. ACCESSIBILITY STATUS
   ========================================================= */

function updateAccessibilityStatus() {

    const status =
        getElement(
            "simulationStatus"
        );

    if (!status) {
        return;
    }

    const progressiveText =
        progressiveState.finished
            ? "Progressive wave finished at 60 seconds"
            : progressiveState.running
                ? "Progressive wave running"
                : "Progressive wave paused";

    const standingText =
        standingState.finished
            ? "Standing wave finished at 60 seconds"
            : standingState.running
                ? "Standing wave running"
                : "Standing wave paused";

    status.textContent =
        `${progressiveText}. ${standingText}.`;

}


/* =========================================================
   62. VISIBILITY
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            pauseProgressiveWave();

            pauseStandingWave();

        }

    }
);


/* =========================================================
   63. KEYBOARD
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const active =
            document.activeElement;

        if (
            event.code === "Space"
        ) {

            if (
                isTextInput(active) ||
                active?.tagName === "BUTTON"
            ) {

                return;

            }

            event.preventDefault();

            const running =
                progressiveState.running ||
                standingState.running;

            if (running) {

                pauseProgressiveWave();

                pauseStandingWave();

            } else {

                playProgressiveWave();

                playStandingWave();

            }

        }


        if (
            event.key.toLowerCase() === "r"
        ) {

            if (
                isTextInput(active)
            ) {

                return;

            }

            resetEntireSimulation();

        }

    }
);


/* =========================================================
   64. PERIODIC INFORMATION UPDATE
   ========================================================= */

function informationLoop() {

    updatePhysicsRelationship();

    updateComparisonPanel();

    updateAccessibilityStatus();

    requestAnimationFrame(
        informationLoop
    );

}


/* =========================================================
   65. INITIALIZATION
   ========================================================= */

function initializeSimulation() {

    /*
     * Create particles.
     */

    if (progressiveCanvas) {

        createParticles(
            progressiveState
        );

        chooseProgressiveHighlights();

    }

    if (standingCanvas) {

        createParticles(
            standingState
        );

        chooseStandingHighlights();

    }


    /*
     * Canvas.
     */

    resizeAllSimulations();


    /*
     * Controls.
     */

    setupProgressiveControls();

    setupStandingControls();

    setupGlobalControls();

    setupSimulationTabs();

    setupTouchSupport();

    initializeAccordions();


    /*
     * Educational information.
     */

    updateLearningObjectives();

    updateComparisonPanel();

    updatePhysicsRelationship();


    /*
     * Initial slider labels.
     */

    updateProgressiveSliderDisplays();

    updateStandingSliderDisplays();


    /*
     * Initial state.
     */

    hideFinishedMessages();

    updatePlayPauseButtons();

    updateAccessibilityStatus();


    /*
     * Start lightweight information loop.
     */

    requestAnimationFrame(
        informationLoop
    );


    /*
     * Final layout resize.
     */

    requestAnimationFrame(
        resizeAllSimulations
    );

}


/* =========================================================
   66. VERIFY IMPORTANT ELEMENTS
   ========================================================= */

function verifySimulationElements() {

    const required = [

        "progressiveCanvas",
        "standingCanvas",

        "progressivePlay",
        "progressivePause",
        "progressiveReset",

        "standingPlay",
        "standingPause",
        "standingReset",

        "progressiveSpeed",
        "progressiveAmplitude",
        "progressiveFrequency",
        "progressiveWavelength",

        "standingSpeed",
        "standingAmplitude",
        "standingFrequency",
        "standingWavelength"

    ];

    const missing = [];

    required.forEach(
        id => {

            if (!getElement(id)) {

                missing.push(id);

            }

        }
    );

    if (missing.length) {

        console.warn(
            "Wave Simulation: missing elements:",
            missing
        );

    }

}


/* =========================================================
   67. START
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            verifySimulationElements();

            initializeSimulation();

        },
        {
            once: true
        }
    );

} else {

    verifySimulationElements();

    initializeSimulation();

}


/* =========================================================
   68. PUBLIC API
   ========================================================= */

window.WaveSimulation = {

    progressive:
        progressiveState,

    standing:
        standingState,

    playProgressive:
        playProgressiveWave,

    pauseProgressive:
        pauseProgressiveWave,

    resetProgressive:
        resetProgressiveWave,

    playStanding:
        playStandingWave,

    pauseStanding:
        pauseStandingWave,

    resetStanding:
        resetStandingWave,

    playAll:
        () => {

            playProgressiveWave();
            playStandingWave();

        },

    pauseAll:
        () => {

            pauseProgressiveWave();
            pauseStandingWave();

        },

    resetAll:
        resetEntireSimulation

};


/* =========================================================
   END OF CONSOLIDATED SCRIPT.JS
   ========================================================= */
