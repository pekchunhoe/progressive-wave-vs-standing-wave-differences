/* =========================================================
   PROGRESSIVE WAVE vs STANDING WAVE
   SCRIPT.JS — PART 1

   PART 1 CONTENT
   ---------------------------------------------------------
   ✓ Physics constants
   ✓ Simulation state
   ✓ Canvas setup
   ✓ Responsive canvas sizing
   ✓ Particle generation
   ✓ Progressive-wave equation
   ✓ Progressive-wave particle motion
   ✓ Green / red highlighted particles
   ✓ Progressive-wave drawing
   ✓ Play / pause / reset
   ✓ Speed / amplitude / frequency / wavelength controls
   ✓ Real-time particle information

   Standing-wave engine and remaining features are continued
   in PART 2.
   ========================================================= */

"use strict";


/* =========================================================
   1. PHYSICS CONSTANTS
   ========================================================= */

/*
 * Progressive wave:
 *
 *      y = A sin(ωt - kx)
 *
 * where:
 *
 *      A = amplitude
 *      ω = angular frequency
 *      k = wave number
 *      x = position
 *      t = time
 */

const PHYSICS = {

    TWO_PI: Math.PI * 2,

    /*
     * Number of particles used to represent
     * the medium/string.
     */
    PARTICLE_COUNT: 42,

    /*
     * Physical visual range.
     *
     * x is normalized from 0 → 1.
     */
    X_START: 0,
    X_END: 1,

    /*
     * Default simulation values.
     */
    DEFAULT_SPEED: 1,
    DEFAULT_AMPLITUDE: 40,
    DEFAULT_FREQUENCY: 1,
    DEFAULT_WAVELENGTH: 260,

    /*
     * Animation time step.
     */
    MAX_DELTA_TIME: 0.05,

    /*
     * Visual dimensions.
     */
    PARTICLE_RADIUS: 4,
    HIGHLIGHT_RADIUS: 8,

    /*
     * Vertical space reserved inside
     * the canvas for the wave.
     */
    VERTICAL_PADDING: 45
};


/* =========================================================
   2. CANVAS ELEMENTS
   ========================================================= */

const progressiveCanvas =
    document.getElementById("progressiveCanvas");

const progressiveCtx =
    progressiveCanvas.getContext("2d");


/* =========================================================
   3. CANVAS CONTAINER
   ========================================================= */

const progressiveCanvasContainer =
    document.getElementById(
        "progressiveCanvasContainer"
    );


/* =========================================================
   4. PROGRESSIVE WAVE STATE
   ========================================================= */

const progressiveState = {

    /*
     * Animation
     */
    running: false,

    time: 0,

    lastTimestamp: null,

    animationFrame: null,


    /*
     * User controls
     */
    speed: PHYSICS.DEFAULT_SPEED,

    amplitude: PHYSICS.DEFAULT_AMPLITUDE,

    frequency: PHYSICS.DEFAULT_FREQUENCY,

    wavelength: PHYSICS.DEFAULT_WAVELENGTH,


    /*
     * Display options
     */
    showPhase: false,

    showEnergy: false,


    /*
     * Particle positions.
     */
    particles: [],


    /*
     * Highlighted particles.
     *
     * These indices are intentionally adjacent.
     */
    greenIndex: 19,

    redIndex: 20,


    /*
     * Canvas dimensions.
     */
    width: 0,

    height: 0,

    dpr: 1,


    /*
     * Equilibrium position.
     */
    equilibriumY: 0
};


/* =========================================================
   5. DOM ELEMENT HELPERS
   ========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   6. CREATE PROGRESSIVE PARTICLES
   ========================================================= */

function createProgressiveParticles() {

    progressiveState.particles = [];

    const count =
        PHYSICS.PARTICLE_COUNT;

    for (let i = 0; i < count; i++) {

        const normalizedX =
            i / (count - 1);

        progressiveState.particles.push({

            index: i,

            /*
             * Normalized position.
             */
            x: normalizedX,

            /*
             * Actual canvas coordinates.
             */
            canvasX: 0,

            canvasY: 0,

            /*
             * Current displacement.
             */
            displacement: 0,

            /*
             * Current velocity direction.
             */
            velocity: 0,

            /*
             * Highlight status.
             */
            highlighted: false,

            color: null

        });

    }


    /*
     * Highlight two adjacent particles.
     */

    if (
        progressiveState.particles[
            progressiveState.greenIndex
        ]
    ) {

        progressiveState.particles[
            progressiveState.greenIndex
        ].highlighted = true;

        progressiveState.particles[
            progressiveState.greenIndex
        ].color = "green";

    }


    if (
        progressiveState.particles[
            progressiveState.redIndex
        ]
    ) {

        progressiveState.particles[
            progressiveState.redIndex
        ].highlighted = true;

        progressiveState.particles[
            progressiveState.redIndex
        ].color = "red";

    }

}


/* =========================================================
   7. RESPONSIVE CANVAS SIZE
   ========================================================= */

function resizeProgressiveCanvas() {

    if (!progressiveCanvasContainer) {
        return;
    }


    const rect =
        progressiveCanvasContainer.getBoundingClientRect();


    progressiveState.width =
        Math.max(1, rect.width);

    progressiveState.height =
        Math.max(1, rect.height);


    /*
     * Device pixel ratio.
     *
     * This keeps the canvas sharp on Retina/iPad
     * displays.
     */

    progressiveState.dpr =
        Math.min(
            window.devicePixelRatio || 1,
            3
        );


    progressiveCanvas.width =
        Math.round(
            progressiveState.width *
            progressiveState.dpr
        );

    progressiveCanvas.height =
        Math.round(
            progressiveState.height *
            progressiveState.dpr
        );


    progressiveCanvas.style.width =
        `${progressiveState.width}px`;

    progressiveCanvas.style.height =
        `${progressiveState.height}px`;


    /*
     * Draw using CSS-pixel coordinates.
     */

    progressiveCtx.setTransform(
        progressiveState.dpr,
        0,
        0,
        progressiveState.dpr,
        0,
        0
    );


    progressiveState.equilibriumY =
        progressiveState.height / 2;


    /*
     * Update particle canvas positions.
     */

    updateProgressiveParticlePositions();

    drawProgressiveWave();

}


/* =========================================================
   8. NORMALIZED X → CANVAS X
   ========================================================= */

function progressiveXToCanvas(normalizedX) {

    const margin = 28;

    return (
        margin +
        normalizedX *
        (
            progressiveState.width -
            margin * 2
        )
    );

}


/* =========================================================
   9. PHYSICAL WAVE NUMBER
   ========================================================= */

/*
 * k = 2π / λ
 *
 * The wavelength slider is expressed in
 * visual canvas units.
 */

function getProgressiveWaveNumber() {

    return (
        PHYSICS.TWO_PI /
        progressiveState.wavelength
    );

}


/* =========================================================
   10. ANGULAR FREQUENCY
   ========================================================= */

/*
 * ω = 2πf
 */

function getProgressiveAngularFrequency() {

    return (
        PHYSICS.TWO_PI *
        progressiveState.frequency
    );

}


/* =========================================================
   11. PROGRESSIVE WAVE EQUATION
   ========================================================= */

/*
 * y = A sin(ωt - kx)
 *
 * x is measured in canvas pixels.
 */

function getProgressiveDisplacement(
    x,
    time
) {

    const A =
        progressiveState.amplitude;

    const omega =
        getProgressiveAngularFrequency();

    const k =
        getProgressiveWaveNumber();


    return (
        A *
        Math.sin(
            omega * time -
            k * x
        )
    );

}


/* =========================================================
   12. PROGRESSIVE PARTICLE VELOCITY
   ========================================================= */

/*
 * Differentiate:
 *
 * y = A sin(ωt - kx)
 *
 * dy/dt =
 *
 * Aω cos(ωt - kx)
 */

function getProgressiveParticleVelocity(
    x,
    time
) {

    const A =
        progressiveState.amplitude;

    const omega =
        getProgressiveAngularFrequency();

    const k =
        getProgressiveWaveNumber();


    return (
        A *
        omega *
        Math.cos(
            omega * time -
            k * x
        )
    );

}


/* =========================================================
   13. UPDATE PROGRESSIVE PARTICLES
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
            getProgressiveParticleVelocity(
                x,
                progressiveState.time
            );


        /*
         * Canvas Y coordinate is inverted:
         *
         * positive physics displacement
         * = upward on screen.
         */

        particle.canvasY =
            progressiveState.equilibriumY -
            particle.displacement;

    }

}


/* =========================================================
   14. UPDATE PARTICLE CANVAS POSITIONS
   ========================================================= */

function updateProgressiveParticlePositions() {

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


/* =========================================================
   15. DRAW BACKGROUND
   ========================================================= */

function drawProgressiveBackground() {

    const ctx =
        progressiveCtx;

    const width =
        progressiveState.width;

    const height =
        progressiveState.height;


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    /*
     * Main background.
     */

    ctx.fillStyle =
        "#fbfdf9";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /*
     * Very subtle upper/lower regions.
     */

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            height
        );

    gradient.addColorStop(
        0,
        "#ffffff"
    );

    gradient.addColorStop(
        0.5,
        "#f8fbf7"
    );

    gradient.addColorStop(
        1,
        "#f1f6ef"
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
   16. DRAW EQUILIBRIUM LINE
   ========================================================= */

function drawProgressiveEquilibriumLine() {

    const ctx =
        progressiveCtx;

    const width =
        progressiveState.width;

    const y =
        progressiveState.equilibriumY;


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
        width - 20,
        y
    );


    ctx.strokeStyle =
        "#aab5a9";

    ctx.lineWidth =
        1;


    ctx.stroke();

    ctx.restore();


    /*
     * Equilibrium label.
     */

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
        "Equilibrium",
        24,
        y - 6
    );

    ctx.restore();

}


/* =========================================================
   17. DRAW MEDIUM / STRING
   ========================================================= */

function drawProgressiveMedium() {

    const ctx =
        progressiveCtx;


    if (
        progressiveState.particles.length <
        2
    ) {
        return;
    }


    ctx.save();


    /*
     * Draw a subtle connecting line
     * behind the particles.
     */

    ctx.beginPath();


    for (
        let i = 0;
        i <
        progressiveState.particles.length;
        i++
    ) {

        const particle =
            progressiveState.particles[i];


        if (i === 0) {

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
   18. DRAW NORMAL PARTICLES
   ========================================================= */

function drawProgressiveParticles() {

    const ctx =
        progressiveCtx;


    for (
        const particle
        of progressiveState.particles
    ) {

        /*
         * Highlighted particles are drawn separately.
         */

        if (particle.highlighted) {
            continue;
        }


        ctx.beginPath();


        ctx.arc(
            particle.canvasX,
            particle.canvasY,
            PHYSICS.PARTICLE_RADIUS,
            0,
            PHYSICS.TWO_PI
        );


        ctx.fillStyle =
            "#647d64";

        ctx.fill();


        /*
         * Small white centre.
         */

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

}


/* =========================================================
   19. DRAW HIGHLIGHTED PARTICLE
   ========================================================= */

function drawProgressiveHighlightedParticle(
    particle,
    color,
    label
) {

    const ctx =
        progressiveCtx;


    const radius =
        PHYSICS.HIGHLIGHT_RADIUS;


    /*
     * Outer glow.
     */

    ctx.save();


    ctx.shadowBlur =
        12;

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


    /*
     * White border.
     */

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


    /*
     * Label.
     */

    ctx.save();


    ctx.font =
        "bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";


    ctx.textAlign =
        "center";


    /*
     * Green label is placed above.
     * Red label is placed below.
     */

    const labelOffset =
        color === "#20b94f"
            ? -18
            : 24;


    ctx.fillStyle =
        color;


    ctx.fillText(
        label,
        particle.canvasX,
        particle.canvasY + labelOffset
    );


    ctx.restore();

}


/* =========================================================
   20. DRAW PROGRESSIVE WAVE PROFILE
   ========================================================= */

function drawProgressiveWaveProfile() {

    const ctx =
        progressiveCtx;


    if (
        progressiveState.particles.length <
        2
    ) {
        return;
    }


    ctx.save();


    ctx.beginPath();


    for (
        let i = 0;
        i <
        progressiveState.particles.length;
        i++
    ) {

        const particle =
            progressiveState.particles[i];


        if (i === 0) {

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
   21. DRAW WAVE DIRECTION ARROW
   ========================================================= */

function drawProgressiveDirectionArrow() {

    const ctx =
        progressiveCtx;

    const width =
        progressiveState.width;


    const y =
        25;

    const startX =
        Math.max(
            25,
            width * 0.55
        );

    const endX =
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

    ctx.lineCap =
        "round";


    /*
     * Arrow shaft.
     */

    ctx.beginPath();

    ctx.moveTo(
        startX,
        y
    );

    ctx.lineTo(
        endX,
        y
    );

    ctx.stroke();


    /*
     * Arrow head.
     */

    ctx.beginPath();

    ctx.moveTo(
        endX,
        y
    );

    ctx.lineTo(
        endX - 9,
        y - 6
    );

    ctx.lineTo(
        endX - 9,
        y + 6
    );

    ctx.closePath();

    ctx.fill();


    /*
     * Label.
     */

    ctx.font =
        "bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "Wave travels →",
        (startX + endX) / 2,
        y - 8
    );


    ctx.restore();

}


/* =========================================================
   22. DRAW ENERGY TRANSFER
   ========================================================= */

function drawProgressiveEnergyTransfer() {

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


    /*
     * Moving energy marker.
     */

    const travelWidth =
        Math.max(
            40,
            width - 80
        );


    const normalized =
        (
            progressiveState.time *
            0.25
        ) % 1;


    const x =
        40 +
        normalized *
        travelWidth;


    ctx.save();


    ctx.strokeStyle =
        "#e39a24";

    ctx.fillStyle =
        "#e39a24";

    ctx.lineWidth =
        2;


    /*
     * Energy direction line.
     */

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


    /*
     * Moving energy dot.
     */

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        5,
        0,
        PHYSICS.TWO_PI
    );

    ctx.fill();


    /*
     * Arrow head.
     */

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


    /*
     * Text.
     */

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
   23. DRAW PHASE INFORMATION
   ========================================================= */

function drawProgressivePhaseInformation() {

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


    const x1 =
        green.canvasX;

    const x2 =
        red.canvasX;


    const y =
        progressiveState.height -
        52;


    ctx.save();


    /*
     * Vertical guide lines.
     */

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
        x1,
        35
    );

    ctx.lineTo(
        x1,
        progressiveState.height - 70
    );

    ctx.moveTo(
        x2,
        35
    );

    ctx.lineTo(
        x2,
        progressiveState.height - 70
    );

    ctx.stroke();


    /*
     * Phase difference:
     *
     * Δφ = k Δx
     */

    const deltaX =
        Math.abs(
            x2 - x1
        );

    const k =
        getProgressiveWaveNumber();


    let deltaPhi =
        k * deltaX;


    /*
     * Normalize to 0 → 2π.
     */

    deltaPhi =
        (
            deltaPhi %
            PHYSICS.TWO_PI
        );


    /*
     * Convert to degrees.
     */

    const degrees =
        deltaPhi *
        180 /
        Math.PI;


    /*
     * Information box.
     */

    ctx.setLineDash([]);

    ctx.fillStyle =
        "rgba(255,255,255,0.92)";


    const boxWidth =
        185;

    const boxHeight =
        38;

    const boxX =
        Math.max(
            8,
            Math.min(
                progressiveState.width -
                boxWidth -
                8,
                (x1 + x2) / 2 -
                boxWidth / 2
            )
        );


    ctx.fillRect(
        boxX,
        y - 30,
        boxWidth,
        boxHeight
    );


    ctx.strokeStyle =
        "#cbd8c7";

    ctx.strokeRect(
        boxX,
        y - 30,
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
        y - 7
    );


    ctx.fillText(
        "Neighbouring particles have different phases",
        boxX + boxWidth / 2,
        y + 8
    );


    ctx.restore();


    /*
     * Update HTML phase display.
     */

    const phaseElement =
        getElement(
            "progressivePhaseDifference"
        );


    if (phaseElement) {

        phaseElement.textContent =
            `Δφ = ${degrees.toFixed(1)}°`;

    }

}


/* =========================================================
   24. DRAW PROGRESSIVE CANVAS
   ========================================================= */

function drawProgressiveWave() {

    if (!progressiveCtx) {
        return;
    }


    /*
     * Ensure positions are current.
     */

    updateProgressiveParticlePositions();


    drawProgressiveBackground();

    drawProgressiveEquilibriumLine();

    drawProgressiveDirectionArrow();

    /*
     * Draw medium first.
     */

    drawProgressiveMedium();

    /*
     * Draw wave profile.
     */

    drawProgressiveWaveProfile();

    /*
     * Draw normal particles.
     */

    drawProgressiveParticles();


    /*
     * Highlighted particles.
     */

    const green =
        progressiveState.particles[
            progressiveState.greenIndex
        ];

    const red =
        progressiveState.particles[
            progressiveState.redIndex
        ];


    if (green) {

        drawProgressiveHighlightedParticle(
            green,
            "#20b94f",
            "Particle A"
        );

    }


    if (red) {

        drawProgressiveHighlightedParticle(
            red,
            "#ed3d3d",
            "Particle B"
        );

    }


    /*
     * Optional overlays.
     */

    drawProgressivePhaseInformation();

    drawProgressiveEnergyTransfer();


    /*
     * Update HTML information.
     */

    updateProgressiveParticleInformation();

}


/* =========================================================
   25. DETERMINE PARTICLE MOTION
   ========================================================= */

function getMotionDescription(
    velocity
) {

    const threshold =
        0.5;


    if (
        Math.abs(velocity) <
        threshold
    ) {

        return "At rest";

    }


    if (velocity > 0) {

        return "↑ Up";

    }


    return "↓ Down";

}


/* =========================================================
   26. FORMAT NUMBER
   ========================================================= */

function formatNumber(
    value,
    decimals = 1
) {

    if (
        !Number.isFinite(value)
    ) {

        return "—";

    }


    return value.toFixed(
        decimals
    );

}


/* =========================================================
   27. UPDATE PROGRESSIVE PARTICLE INFO
   ========================================================= */

function updateProgressiveParticleInformation() {

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


    /*
     * Green particle.
     */

    const greenX =
        getElement(
            "progressiveGreenX"
        );

    const greenY =
        getElement(
            "progressiveGreenY"
        );

    const greenAmplitude =
        getElement(
            "progressiveGreenAmplitude"
        );

    const greenMotion =
        getElement(
            "progressiveGreenMotion"
        );


    if (greenX) {

        greenX.textContent =
            formatNumber(
                green.canvasX,
                1
            );

    }


    if (greenY) {

        greenY.textContent =
            formatNumber(
                green.displacement,
                1
            );

    }


    if (greenAmplitude) {

        greenAmplitude.textContent =
            `A = ${formatNumber(
                progressiveState.amplitude,
                0
            )}`;

    }


    if (greenMotion) {

        greenMotion.textContent =
            getMotionDescription(
                green.velocity
            );

    }


    /*
     * Red particle.
     */

    const redX =
        getElement(
            "progressiveRedX"
        );

    const redY =
        getElement(
            "progressiveRedY"
        );

    const redAmplitude =
        getElement(
            "progressiveRedAmplitude"
        );

    const redMotion =
        getElement(
            "progressiveRedMotion"
        );


    if (redX) {

        redX.textContent =
            formatNumber(
                red.canvasX,
                1
            );

    }


    if (redY) {

        redY.textContent =
            formatNumber(
                red.displacement,
                1
            );

    }


    if (redAmplitude) {

        redAmplitude.textContent =
            `A = ${formatNumber(
                progressiveState.amplitude,
                0
            )}`;

    }


    if (redMotion) {

        redMotion.textContent =
            getMotionDescription(
                red.velocity
            );

    }


    /*
     * Time display.
     */

    const timeElement =
        getElement(
            "progressiveTime"
        );


    if (timeElement) {

        timeElement.textContent =
            `t = ${formatNumber(
                progressiveState.time,
                2
            )} s`;

    }

}


/* =========================================================
   28. PROGRESSIVE ANIMATION LOOP
   ========================================================= */

function progressiveAnimationLoop(
    timestamp
) {

    if (
        !progressiveState.running
    ) {

        progressiveState.lastTimestamp =
            null;

        return;

    }


    if (
        progressiveState.lastTimestamp ===
        null
    ) {

        progressiveState.lastTimestamp =
            timestamp;

    }


    let deltaTime =
        (
            timestamp -
            progressiveState.lastTimestamp
        ) / 1000;


    /*
     * Prevent a huge time jump when the browser
     * temporarily pauses the animation.
     */

    deltaTime =
        Math.min(
            deltaTime,
            PHYSICS.MAX_DELTA_TIME
        );


    progressiveState.lastTimestamp =
        timestamp;


    /*
     * Advance simulation time.
     */

    progressiveState.time +=
        deltaTime *
        progressiveState.speed;


    /*
     * Update and redraw.
     */

    drawProgressiveWave();


    progressiveState.animationFrame =
        requestAnimationFrame(
            progressiveAnimationLoop
        );

}


/* =========================================================
   29. PLAY PROGRESSIVE WAVE
   ========================================================= */

function playProgressiveWave() {

    if (
        progressiveState.running
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

}


/* =========================================================
   30. PAUSE PROGRESSIVE WAVE
   ========================================================= */

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

}


/* =========================================================
   31. RESET PROGRESSIVE WAVE
   ========================================================= */

function resetProgressiveWave() {

    pauseProgressiveWave();


    progressiveState.time =
        0;


    /*
     * Restore default controls.
     */

    progressiveState.speed =
        PHYSICS.DEFAULT_SPEED;

    progressiveState.amplitude =
        PHYSICS.DEFAULT_AMPLITUDE;

    progressiveState.frequency =
        PHYSICS.DEFAULT_FREQUENCY;

    progressiveState.wavelength =
        PHYSICS.DEFAULT_WAVELENGTH;


    /*
     * Restore sliders.
     */

    const speed =
        getElement(
            "progressiveSpeed"
        );

    const amplitude =
        getElement(
            "progressiveAmplitude"
        );

    const frequency =
        getElement(
            "progressiveFrequency"
        );

    const wavelength =
        getElement(
            "progressiveWavelength"
        );


    if (speed) {

        speed.value =
            progressiveState.speed;

    }


    if (amplitude) {

        amplitude.value =
            progressiveState.amplitude;

    }


    if (frequency) {

        frequency.value =
            progressiveState.frequency;

    }


    if (wavelength) {

        wavelength.value =
            progressiveState.wavelength;

    }


    updateProgressiveSliderDisplays();

    drawProgressiveWave();

}


/* =========================================================
   32. UPDATE SLIDER LABELS
   ========================================================= */

function updateProgressiveSliderDisplays() {

    const speedValue =
        getElement(
            "progressiveSpeedValue"
        );

    const amplitudeValue =
        getElement(
            "progressiveAmplitudeValue"
        );

    const frequencyValue =
        getElement(
            "progressiveFrequencyValue"
        );

    const wavelengthValue =
        getElement(
            "progressiveWavelengthValue"
        );


    if (speedValue) {

        speedValue.textContent =
            `${progressiveState.speed.toFixed(1)}×`;

    }


    if (amplitudeValue) {

        amplitudeValue.textContent =
            progressiveState.amplitude.toFixed(0);

    }


    if (frequencyValue) {

        frequencyValue.textContent =
            `${progressiveState.frequency.toFixed(1)} Hz`;

    }


    if (wavelengthValue) {

        wavelengthValue.textContent =
            progressiveState.wavelength.toFixed(0);

    }

}


/* =========================================================
   33. PROGRESSIVE CONTROL EVENTS
   ========================================================= */

function setupProgressiveControls() {

    /*
     * Play
     */

    const playButton =
        getElement(
            "progressivePlay"
        );


    if (playButton) {

        playButton.addEventListener(
            "click",
            playProgressiveWave
        );

    }


    /*
     * Pause
     */

    const pauseButton =
        getElement(
            "progressivePause"
        );


    if (pauseButton) {

        pauseButton.addEventListener(
            "click",
            pauseProgressiveWave
        );

    }


    /*
     * Reset
     */

    const resetButton =
        getElement(
            "progressiveReset"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetProgressiveWave
        );

    }


    /*
     * Speed
     */

    const speed =
        getElement(
            "progressiveSpeed"
        );


    if (speed) {

        speed.addEventListener(
            "input",
            () => {

                progressiveState.speed =
                    Number(
                        speed.value
                    );

                updateProgressiveSliderDisplays();

            }
        );

    }


    /*
     * Amplitude
     */

    const amplitude =
        getElement(
            "progressiveAmplitude"
        );


    if (amplitude) {

        amplitude.addEventListener(
            "input",
            () => {

                progressiveState.amplitude =
                    Number(
                        amplitude.value
                    );

                updateProgressiveSliderDisplays();

                drawProgressiveWave();

            }
        );

    }


    /*
     * Frequency
     */

    const frequency =
        getElement(
            "progressiveFrequency"
        );


    if (frequency) {

        frequency.addEventListener(
            "input",
            () => {

                progressiveState.frequency =
                    Number(
                        frequency.value
                    );

                updateProgressiveSliderDisplays();

                drawProgressiveWave();

            }
        );

    }


    /*
     * Wavelength
     */

    const wavelength =
        getElement(
            "progressiveWavelength"
        );


    if (wavelength) {

        wavelength.addEventListener(
            "input",
            () => {

                progressiveState.wavelength =
                    Number(
                        wavelength.value
                    );

                updateProgressiveSliderDisplays();

                drawProgressiveWave();

            }
        );

    }


    /*
     * Show phase.
     */

    const phaseToggle =
        getElement(
            "progressivePhaseToggle"
        );


    if (phaseToggle) {

        phaseToggle.addEventListener(
            "change",
            () => {

                progressiveState.showPhase =
                    phaseToggle.checked;

                drawProgressiveWave();

            }
        );

    }


    /*
     * Show energy.
     */

    const energyToggle =
        getElement(
            "progressiveEnergyToggle"
        );


    if (energyToggle) {

        energyToggle.addEventListener(
            "change",
            () => {

                progressiveState.showEnergy =
                    energyToggle.checked;

                drawProgressiveWave();

            }
        );

    }

}


/* =========================================================
   34. RESIZE HANDLING
   ========================================================= */

let progressiveResizeTimer =
    null;


function handleProgressiveResize() {

    /*
     * Avoid excessive canvas redraws during
     * continuous browser resizing.
     */

    if (
        progressiveResizeTimer !==
        null
    ) {

        cancelAnimationFrame(
            progressiveResizeTimer
        );

    }


    progressiveResizeTimer =
        requestAnimationFrame(
            () => {

                progressiveResizeTimer =
                    null;

                resizeProgressiveCanvas();

            }
        );

}


/* =========================================================
   35. INITIALIZE PROGRESSIVE WAVE
   ========================================================= */

function initializeProgressiveWave() {

    if (
        !progressiveCanvas ||
        !progressiveCtx
    ) {

        console.error(
            "Progressive wave canvas was not found."
        );

        return;

    }


    /*
     * Create particles.
     */

    createProgressiveParticles();


    /*
     * Set initial canvas size.
     */

    resizeProgressiveCanvas();


    /*
     * Set slider labels.
     */

    updateProgressiveSliderDisplays();


    /*
     * Connect controls.
     */

    setupProgressiveControls();


    /*
     * Responsive canvas.
     */

    window.addEventListener(
        "resize",
        handleProgressiveResize,
        {
            passive: true
        }
    );


    /*
     * Initial frame.
     */

    drawProgressiveWave();

}


/* =========================================================
   36. START PART 1
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeProgressiveWave,
        {
            once: true
        }
    );

} else {

    initializeProgressiveWave();

}


/* =========================================================
   END OF SCRIPT.JS — PART 1
   ========================================================= */

/* =========================================================
   PROGRESSIVE WAVE vs STANDING WAVE
   SCRIPT.JS — PART 2

   STANDING WAVE ENGINE
   ---------------------------------------------------------
   ✓ Standing-wave equation
   ✓ Superposition of two opposite travelling waves
   ✓ Many medium particles
   ✓ Fixed nodes
   ✓ Antinodes
   ✓ Different particle amplitudes
   ✓ Same-phase particle motion
   ✓ Green / red adjacent highlighted particles
   ✓ Node & antinode labels
   ✓ Phase visualization
   ✓ Energy information
   ✓ Play / pause / reset
   ✓ Speed / amplitude / frequency / wavelength
   ✓ Real-time particle information
   ✓ Responsive canvas
   ✓ Touch-friendly controls
   ✓ Accordion sections
   ========================================================= */


/* =========================================================
   37. STANDING WAVE CANVAS
   ========================================================= */

const standingCanvas =
    document.getElementById("standingCanvas");

const standingCtx =
    standingCanvas
        ? standingCanvas.getContext("2d")
        : null;


const standingCanvasContainer =
    document.getElementById(
        "standingCanvasContainer"
    );


/* =========================================================
   38. STANDING WAVE STATE
   ========================================================= */

const standingState = {

    /*
     * Animation
     */

    running: false,

    time: 0,

    lastTimestamp: null,

    animationFrame: null,


    /*
     * Controls
     */

    speed: PHYSICS.DEFAULT_SPEED,

    amplitude: PHYSICS.DEFAULT_AMPLITUDE,

    frequency: PHYSICS.DEFAULT_FREQUENCY,

    wavelength: PHYSICS.DEFAULT_WAVELENGTH,


    /*
     * Display options
     */

    showNodes: false,

    showPhase: false,

    showEnergy: false,


    /*
     * Medium particles
     */

    particles: [],


    /*
     * Highlighted particles.
     *
     * These will be automatically selected so that
     * both particles are adjacent and located between
     * the same pair of nodes.
     */

    greenIndex: 18,

    redIndex: 19,


    /*
     * Canvas
     */

    width: 0,

    height: 0,

    dpr: 1,


    /*
     * Equilibrium line
     */

    equilibriumY: 0,


    /*
     * Standing-wave visual region.
     */

    leftMargin: 28,

    rightMargin: 28
};


/* =========================================================
   39. CREATE STANDING-WAVE PARTICLES
   ========================================================= */

function createStandingParticles() {

    standingState.particles = [];


    const count =
        PHYSICS.PARTICLE_COUNT;


    for (
        let i = 0;
        i < count;
        i++
    ) {

        const normalizedX =
            i / (count - 1);


        standingState.particles.push({

            index: i,

            /*
             * Normalized x position.
             */

            x: normalizedX,

            /*
             * Canvas coordinates.
             */

            canvasX: 0,

            canvasY: 0,

            /*
             * Current displacement.
             */

            displacement: 0,

            /*
             * Current velocity.
             */

            velocity: 0,

            /*
             * Local amplitude.
             */

            localAmplitude: 0,

            /*
             * Distance from nearest node.
             */

            nodeDistance: 0,

            /*
             * Highlight state.
             */

            highlighted: false,

            color: null

        });

    }


    /*
     * Select highlighted particles.
     *
     * They will be corrected later by
     * chooseStandingHighlightParticles()
     * according to the current wavelength
     * and canvas size.
     */

    chooseStandingHighlightParticles();

}


/* =========================================================
   40. RESPONSIVE STANDING CANVAS
   ========================================================= */

function resizeStandingCanvas() {

    if (
        !standingCanvas ||
        !standingCanvasContainer
    ) {

        return;

    }


    const rect =
        standingCanvasContainer.getBoundingClientRect();


    standingState.width =
        Math.max(
            1,
            rect.width
        );


    standingState.height =
        Math.max(
            1,
            rect.height
        );


    /*
     * Retina / high-DPI support.
     */

    standingState.dpr =
        Math.min(
            window.devicePixelRatio || 1,
            3
        );


    standingCanvas.width =
        Math.round(
            standingState.width *
            standingState.dpr
        );


    standingCanvas.height =
        Math.round(
            standingState.height *
            standingState.dpr
        );


    standingCanvas.style.width =
        `${standingState.width}px`;


    standingCanvas.style.height =
        `${standingState.height}px`;


    standingCtx.setTransform(
        standingState.dpr,
        0,
        0,
        standingState.dpr,
        0,
        0
    );


    standingState.equilibriumY =
        standingState.height / 2;


    updateStandingParticlePositions();

    drawStandingWave();

}


/* =========================================================
   41. STANDING X → CANVAS X
   ========================================================= */

function standingXToCanvas(
    normalizedX
) {

    const left =
        standingState.leftMargin;

    const right =
        standingState.width -
        standingState.rightMargin;


    return (
        left +
        normalizedX *
        (right - left)
    );

}


/* =========================================================
   42. STANDING WAVE NUMBER
   ========================================================= */

function getStandingWaveNumber() {

    return (
        PHYSICS.TWO_PI /
        standingState.wavelength
    );

}


/* =========================================================
   43. STANDING ANGULAR FREQUENCY
   ========================================================= */

function getStandingAngularFrequency() {

    return (
        PHYSICS.TWO_PI *
        standingState.frequency
    );

}


/* =========================================================
   44. TWO OPPOSITE TRAVELLING WAVES
   ========================================================= */

/*
 * Wave 1:
 *
 * y₁ = A sin(ωt - kx)
 *
 * Wave 2:
 *
 * y₂ = A sin(ωt + kx)
 *
 * Their superposition gives:
 *
 * y = 2A cos(kx) sin(ωt)
 */


/* =========================================================
   45. FIRST COMPONENT WAVE
   ========================================================= */

function getStandingWave1(
    x,
    time
) {

    const A =
        standingState.amplitude;

    const omega =
        getStandingAngularFrequency();

    const k =
        getStandingWaveNumber();


    return (
        A *
        Math.sin(
            omega * time -
            k * x
        )
    );

}


/* =========================================================
   46. SECOND COMPONENT WAVE
   ========================================================= */

function getStandingWave2(
    x,
    time
) {

    const A =
        standingState.amplitude;

    const omega =
        getStandingAngularFrequency();

    const k =
        getStandingWaveNumber();


    return (
        A *
        Math.sin(
            omega * time +
            k * x
        )
    );

}


/* =========================================================
   47. STANDING WAVE EQUATION
   ========================================================= */

/*
 * y = 2A cos(kx) sin(ωt)
 */

function getStandingDisplacement(
    x,
    time
) {

    const A =
        standingState.amplitude;

    const omega =
        getStandingAngularFrequency();

    const k =
        getStandingWaveNumber();


    return (
        2 *
        A *
        Math.cos(k * x) *
        Math.sin(omega * time)
    );

}


/* =========================================================
   48. LOCAL PARTICLE AMPLITUDE
   ========================================================= */

/*
 * Local amplitude:
 *
 * A_particle = |2A cos(kx)|
 *
 * This is why particles have different amplitudes.
 */

function getStandingLocalAmplitude(
    x
) {

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
   49. STANDING PARTICLE VELOCITY
   ========================================================= */

/*
 * Differentiate:
 *
 * y = 2A cos(kx) sin(ωt)
 *
 * dy/dt =
 *
 * 2Aω cos(kx) cos(ωt)
 */

function getStandingParticleVelocity(
    x,
    time
) {

    const A =
        standingState.amplitude;

    const omega =
        getStandingAngularFrequency();

    const k =
        getStandingWaveNumber();


    return (
        2 *
        A *
        omega *
        Math.cos(k * x) *
        Math.cos(omega * time)
    );

}


/* =========================================================
   50. UPDATE STANDING PARTICLES
   ========================================================= */

function updateStandingParticles() {

    for (
        const particle
        of standingState.particles
    ) {

        const x =
            particle.canvasX;


        particle.displacement =
            getStandingDisplacement(
                x,
                standingState.time
            );


        particle.velocity =
            getStandingParticleVelocity(
                x,
                standingState.time
            );


        particle.localAmplitude =
            getStandingLocalAmplitude(
                x
            );


        /*
         * Convert physics displacement
         * into screen coordinates.
         */

        particle.canvasY =
            standingState.equilibriumY -
            particle.displacement;

    }

}


/* =========================================================
   51. UPDATE STANDING PARTICLE POSITIONS
   ========================================================= */

function updateStandingParticlePositions() {

    for (
        const particle
        of standingState.particles
    ) {

        particle.canvasX =
            standingXToCanvas(
                particle.x
            );

    }


    /*
     * Select the correct adjacent highlighted
     * particles for the current wavelength.
     */

    chooseStandingHighlightParticles();


    updateStandingParticles();

}


/* =========================================================
   52. FIND STANDING-WAVE NODE POSITIONS
   ========================================================= */

/*
 * Nodes occur where:
 *
 * cos(kx) = 0
 *
 * Therefore:
 *
 * kx = π/2 + nπ
 *
 * x = λ/4 + nλ/2
 *
 * The first node is λ/4 from the chosen
 * x = 0 reference.
 */

function getStandingNodePositions() {

    const nodes = [];


    const lambda =
        standingState.wavelength;


    /*
     * Start at λ/4.
     */

    let x =
        lambda / 4;


    /*
     * Continue until the canvas ends.
     */

    const maxX =
        standingState.width -
        standingState.leftMargin;


    while (
        x <= maxX
    ) {

        if (
            x >= standingState.leftMargin
        ) {

            nodes.push(x);

        }


        x +=
            lambda / 2;

    }


    return nodes;

}


/* =========================================================
   53. FIND ANTINODE POSITIONS
   ========================================================= */

/*
 * Antinodes occur where:
 *
 * |cos(kx)| = 1
 *
 * x = nλ/2
 */

function getStandingAntinodePositions() {

    const antinodes = [];


    const lambda =
        standingState.wavelength;


    let x =
        0;


    const maxX =
        standingState.width -
        standingState.leftMargin;


    while (
        x <= maxX
    ) {

        if (
            x >= standingState.leftMargin
        ) {

            antinodes.push(x);

        }


        x +=
            lambda / 2;

    }


    return antinodes;

}


/* =========================================================
   54. DETERMINE PARTICLE LOOP
   ========================================================= */

/*
 * A "loop" is the region between two adjacent nodes.
 *
 * We use this to guarantee that the green and red
 * particles are in the same phase region.
 */

function getStandingLoopIndex(
    x
) {

    const lambda =
        standingState.wavelength;


    /*
     * Node spacing = λ/2.
     */

    const nodeSpacing =
        lambda / 2;


    /*
     * First node is at λ/4.
     */

    const shiftedX =
        x -
        lambda / 4;


    return Math.floor(
        shiftedX /
        nodeSpacing
    );

}


/* =========================================================
   55. CHOOSE HIGHLIGHTED PARTICLES
   ========================================================= */

function chooseStandingHighlightParticles() {

    if (
        standingState.particles.length <
        2
    ) {

        return;

    }


    /*
     * Remove previous highlights.
     */

    for (
        const particle
        of standingState.particles
    ) {

        particle.highlighted =
            false;

        particle.color =
            null;

    }


    /*
     * Find a useful pair somewhere near
     * the middle of the simulation.
     */

    let selectedGreen =
        null;

    let selectedRed =
        null;


    const middle =
        standingState.width / 2;


    /*
     * Search adjacent particles.
     */

    for (
        let i = 0;
        i <
        standingState.particles.length - 1;
        i++
    ) {

        const p1 =
            standingState.particles[i];

        const p2 =
            standingState.particles[i + 1];


        const loop1 =
            getStandingLoopIndex(
                p1.canvasX
            );

        const loop2 =
            getStandingLoopIndex(
                p2.canvasX
            );


        /*
         * Both particles must be in the
         * same loop between adjacent nodes.
         */

        if (
            loop1 !== loop2
        ) {

            continue;

        }


        /*
         * Avoid choosing particles extremely
         * close to a node.
         */

        const amplitude1 =
            getStandingLocalAmplitude(
                p1.canvasX
            );

        const amplitude2 =
            getStandingLocalAmplitude(
                p2.canvasX
            );


        if (
            amplitude1 <
            standingState.amplitude * 0.15
        ) {

            continue;

        }


        if (
            amplitude2 <
            standingState.amplitude * 0.15
        ) {

            continue;

        }


        /*
         * Prefer a pair close to the centre.
         */

        const pairCentre =
            (
                p1.canvasX +
                p2.canvasX
            ) / 2;


        const distance =
            Math.abs(
                pairCentre -
                middle
            );


        if (
            selectedGreen === null ||
            distance <
            selectedGreen.distance
        ) {

            selectedGreen = {

                p1,
                p2,
                distance

            };

        }

    }


    /*
     * If no suitable pair was found,
     * choose a safe central adjacent pair.
     */

    if (
        selectedGreen === null
    ) {

        const fallback =
            Math.floor(
                standingState.particles.length *
                0.45
            );


        selectedGreen = {

            p1:
                standingState.particles[
                    fallback
                ],

            p2:
                standingState.particles[
                    fallback + 1
                ],

            distance: 0

        };

    }


    selectedRed =
        selectedGreen;


    if (
        selectedGreen.p1
    ) {

        selectedGreen.p1.highlighted =
            true;

        selectedGreen.p1.color =
            "green";

        standingState.greenIndex =
            selectedGreen.p1.index;

    }


    if (
        selectedRed.p2
    ) {

        selectedRed.p2.highlighted =
            true;

        selectedRed.p2.color =
            "red";

        standingState.redIndex =
            selectedRed.p2.index;

    }

}


/* =========================================================
   56. STANDING BACKGROUND
   ========================================================= */

function drawStandingBackground() {

    const ctx =
        standingCtx;


    const width =
        standingState.width;

    const height =
        standingState.height;


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
        "#ffffff"
    );

    gradient.addColorStop(
        0.5,
        "#f8fbfe"
    );

    gradient.addColorStop(
        1,
        "#f0f6fb"
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
   57. STANDING EQUILIBRIUM LINE
   ========================================================= */

function drawStandingEquilibriumLine() {

    const ctx =
        standingCtx;


    const y =
        standingState.equilibriumY;


    const width =
        standingState.width;


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
        width - 20,
        y
    );


    ctx.strokeStyle =
        "#a8b5c0";


    ctx.lineWidth =
        1;


    ctx.stroke();


    ctx.restore();


    ctx.save();


    ctx.fillStyle =
        "#778692";


    ctx.font =
        "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";


    ctx.textAlign =
        "left";


    ctx.textBaseline =
        "bottom";


    ctx.fillText(
        "Equilibrium",
        24,
        y - 6
    );


    ctx.restore();

}


/* =========================================================
   58. DRAW STANDING WAVE PROFILE
   ========================================================= */

function drawStandingWaveProfile() {

    const ctx =
        standingCtx;


    const width =
        standingState.width;


    /*
     * Draw a mathematically smooth standing wave
     * independent of particle spacing.
     */

    const left =
        standingState.leftMargin;


    const right =
        width -
        standingState.rightMargin;


    const step =
        Math.max(
            2,
            width / 180
        );


    ctx.save();


    ctx.beginPath();


    let firstPoint =
        true;


    for (
        let x = left;
        x <= right;
        x += step
    ) {

        const displacement =
            getStandingDisplacement(
                x,
                standingState.time
            );


        const y =
            standingState.equilibriumY -
            displacement;


        if (firstPoint) {

            ctx.moveTo(
                x,
                y
            );

            firstPoint =
                false;

        } else {

            ctx.lineTo(
                x,
                y
            );

        }

    }


    ctx.strokeStyle =
        "#386fa4";


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
   59. DRAW STANDING MEDIUM
   ========================================================= */

function drawStandingMedium() {

    const ctx =
        standingCtx;


    if (
        standingState.particles.length <
        2
    ) {

        return;

    }


    ctx.save();


    ctx.beginPath();


    for (
        let i = 0;
        i <
        standingState.particles.length;
        i++
    ) {

        const particle =
            standingState.particles[i];


        if (i === 0) {

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


    ctx.strokeStyle =
        "#91abc0";


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
   60. DRAW NORMAL STANDING PARTICLES
   ========================================================= */

function drawStandingParticles() {

    const ctx =
        standingCtx;


    for (
        const particle
        of standingState.particles
    ) {

        if (
            particle.highlighted
        ) {

            continue;

        }


        /*
         * Particle colour becomes slightly darker
         * when its local amplitude is larger.
         */

        const amplitudeRatio =
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
                amplitudeRatio * 35
            );


        const particleColour =
            `rgb(${brightness - 15}, ${brightness + 5}, ${brightness + 25})`;


        ctx.beginPath();


        ctx.arc(
            particle.canvasX,
            particle.canvasY,
            PHYSICS.PARTICLE_RADIUS,
            0,
            PHYSICS.TWO_PI
        );


        ctx.fillStyle =
            particleColour;


        ctx.fill();


        /*
         * Small highlight.
         */

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

}


/* =========================================================
   61. DRAW HIGHLIGHTED STANDING PARTICLE
   ========================================================= */

function drawStandingHighlightedParticle(
    particle,
    color,
    label
) {

    const ctx =
        standingCtx;


    if (!particle) {
        return;
    }


    const radius =
        PHYSICS.HIGHLIGHT_RADIUS;


    ctx.save();


    /*
     * Glow.
     */

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


    /*
     * White outer border.
     */

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


    /*
     * Label.
     */

    ctx.save();


    ctx.font =
        "bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";


    ctx.textAlign =
        "center";


    const labelOffset =
        color === "#20b94f"
            ? -18
            : 24;


    ctx.fillStyle =
        color;


    ctx.fillText(
        label,
        particle.canvasX,
        particle.canvasY + labelOffset
    );


    ctx.restore();

}


/* =========================================================
   62. DRAW NODES
   ========================================================= */

function drawStandingNodes() {

    if (
        !standingState.showNodes
    ) {

        return;

    }


    const ctx =
        standingCtx;


    const nodes =
        getStandingNodePositions();


    const y =
        standingState.equilibriumY;


    ctx.save();


    for (
        const x
        of nodes
    ) {

        /*
         * Vertical guide.
         */

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


        /*
         * Node marker.
         */

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


        /*
         * Node label.
         */

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
   63. DRAW ANTINODES
   ========================================================= */

function drawStandingAntinodes() {

    if (
        !standingState.showNodes
    ) {

        return;

    }


    const ctx =
        standingCtx;


    const antinodes =
        getStandingAntinodePositions();


    const y =
        standingState.equilibriumY;


    ctx.save();


    for (
        const x
        of antinodes
    ) {

        /*
         * Ignore antinodes outside useful
         * visible region.
         */

        if (
            x <
            standingState.leftMargin ||
            x >
            standingState.width -
            standingState.rightMargin
        ) {

            continue;

        }


        /*
         * Antinode marker.
         */

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


        /*
         * Label.
         */

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
   64. DRAW NODE / ANTINODE EXPLANATION
   ========================================================= */

function drawStandingNodeInformation() {

    if (
        !standingState.showNodes
    ) {

        return;

    }


    const ctx =
        standingCtx;


    const width =
        standingState.width;


    ctx.save();


    const boxWidth =
        205;

    const boxHeight =
        38;


    const x =
        Math.max(
            8,
            width -
            boxWidth -
            10
        );


    const y =
        8;


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
   65. DRAW STANDING PHASE INFORMATION
   ========================================================= */

function drawStandingPhaseInformation() {

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


    if (
        !green ||
        !red
    ) {

        return;

    }


    const ctx =
        standingCtx;


    /*
     * Vertical guides through highlighted particles.
     */

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


    /*
     * Information box.
     */

    const boxWidth =
        210;

    const boxHeight =
        40;


    const centreX =
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
                centreX -
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


    /*
     * Update HTML.
     */

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
   66. DRAW STANDING ENERGY INFORMATION
   ========================================================= */

function drawStandingEnergyInformation() {

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


    /*
     * A standing wave does not have a net
     * energy flow along the string.
     *
     * We show energy oscillating locally rather
     * than travelling continuously from left to right.
     */

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


    /*
     * Draw local double arrows.
     */

    const spacing =
        Math.max(
            90,
            standingState.wavelength / 2
        );


    for (
        let x = 70;
        x < width - 50;
        x += spacing
    ) {

        const local =
            Math.sin(
                getStandingAngularFrequency() *
                standingState.time
            );


        const direction =
            local >= 0
                ? -1
                : 1;


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


    /*
     * Text.
     */

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
   67. DRAW STANDING WAVE
   ========================================================= */

function drawStandingWave() {

    if (
        !standingCtx
    ) {

        return;

    }


    updateStandingParticlePositions();


    /*
     * Background.
     */

    drawStandingBackground();


    /*
     * Equilibrium.
     */

    drawStandingEquilibriumLine();


    /*
     * Nodes and antinodes are drawn behind
     * the actual wave.
     */

    drawStandingNodes();

    drawStandingAntinodes();

    drawStandingNodeInformation();


    /*
     * Medium and wave.
     */

    drawStandingMedium();

    drawStandingWaveProfile();


    /*
     * Normal particles.
     */

    drawStandingParticles();


    /*
     * Highlighted particles.
     */

    const green =
        standingState.particles[
            standingState.greenIndex
        ];


    const red =
        standingState.particles[
            standingState.redIndex
        ];


    if (green) {

        drawStandingHighlightedParticle(
            green,
            "#20b94f",
            "Particle A"
        );

    }


    if (red) {

        drawStandingHighlightedParticle(
            red,
            "#ed3d3d",
            "Particle B"
        );

    }


    /*
     * Optional overlays.
     */

    drawStandingPhaseInformation();

    drawStandingEnergyInformation();


    /*
     * Update HTML information.
     */

    updateStandingParticleInformation();

}


/* =========================================================
   68. STANDING PARTICLE MOTION DESCRIPTION
   ========================================================= */

function getStandingMotionDescription(
    velocity
) {

    const threshold =
        0.5;


    if (
        Math.abs(velocity) <
        threshold
    ) {

        return "At rest";

    }


    if (
        velocity > 0
    ) {

        return "↑ Up";

    }


    return "↓ Down";

}


/* =========================================================
   69. UPDATE STANDING PARTICLE INFORMATION
   ========================================================= */

function updateStandingParticleInformation() {

    const green =
        standingState.particles[
            standingState.greenIndex
        ];


    const red =
        standingState.particles[
            standingState.redIndex
        ];


    if (
        !green ||
        !red
    ) {

        return;

    }


    /*
     * GREEN PARTICLE
     */

    const greenX =
        getElement(
            "standingGreenX"
        );


    const greenY =
        getElement(
            "standingGreenY"
        );


    const greenAmplitude =
        getElement(
            "standingGreenAmplitude"
        );


    const greenMotion =
        getElement(
            "standingGreenMotion"
        );


    if (greenX) {

        greenX.textContent =
            formatNumber(
                green.canvasX,
                1
            );

    }


    if (greenY) {

        greenY.textContent =
            formatNumber(
                green.displacement,
                1
            );

    }


    if (greenAmplitude) {

        greenAmplitude.textContent =
            formatNumber(
                green.localAmplitude,
                1
            );

    }


    if (greenMotion) {

        greenMotion.textContent =
            getStandingMotionDescription(
                green.velocity
            );

    }


    /*
     * RED PARTICLE
     */

    const redX =
        getElement(
            "standingRedX"
        );


    const redY =
        getElement(
            "standingRedY"
        );


    const redAmplitude =
        getElement(
            "standingRedAmplitude"
        );


    const redMotion =
        getElement(
            "standingRedMotion"
        );


    if (redX) {

        redX.textContent =
            formatNumber(
                red.canvasX,
                1
            );

    }


    if (redY) {

        redY.textContent =
            formatNumber(
                red.displacement,
                1
            );

    }


    if (redAmplitude) {

        redAmplitude.textContent =
            formatNumber(
                red.localAmplitude,
                1
            );

    }


    if (redMotion) {

        redMotion.textContent =
            getStandingMotionDescription(
                red.velocity
            );

    }


    /*
     * Time.
     */

    const timeElement =
        getElement(
            "standingTime"
        );


    if (timeElement) {

        timeElement.textContent =
            `t = ${formatNumber(
                standingState.time,
                2
            )} s`;

    }

}


/* =========================================================
   70. STANDING ANIMATION LOOP
   ========================================================= */

function standingAnimationLoop(
    timestamp
) {

    if (
        !standingState.running
    ) {

        standingState.lastTimestamp =
            null;

        return;

    }


    if (
        standingState.lastTimestamp ===
        null
    ) {

        standingState.lastTimestamp =
            timestamp;

    }


    let deltaTime =
        (
            timestamp -
            standingState.lastTimestamp
        ) / 1000;


    /*
     * Prevent a large jump after the browser
     * has been inactive.
     */

    deltaTime =
        Math.min(
            deltaTime,
            PHYSICS.MAX_DELTA_TIME
        );


    standingState.lastTimestamp =
        timestamp;


    /*
     * Advance simulation time.
     */

    standingState.time +=
        deltaTime *
        standingState.speed;


    /*
     * Draw next frame.
     */

    drawStandingWave();


    standingState.animationFrame =
        requestAnimationFrame(
            standingAnimationLoop
        );

}


/* =========================================================
   71. PLAY STANDING WAVE
   ========================================================= */

function playStandingWave() {

    if (
        standingState.running
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

}


/* =========================================================
   72. PAUSE STANDING WAVE
   ========================================================= */

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

}


/* =========================================================
   73. RESET STANDING WAVE
   ========================================================= */

function resetStandingWave() {

    pauseStandingWave();


    standingState.time =
        0;


    /*
     * Restore defaults.
     */

    standingState.speed =
        PHYSICS.DEFAULT_SPEED;


    standingState.amplitude =
        PHYSICS.DEFAULT_AMPLITUDE;


    standingState.frequency =
        PHYSICS.DEFAULT_FREQUENCY;


    standingState.wavelength =
        PHYSICS.DEFAULT_WAVELENGTH;


    /*
     * Restore sliders.
     */

    const speed =
        getElement(
            "standingSpeed"
        );


    const amplitude =
        getElement(
            "standingAmplitude"
        );


    const frequency =
        getElement(
            "standingFrequency"
        );


    const wavelength =
        getElement(
            "standingWavelength"
        );


    if (speed) {

        speed.value =
            standingState.speed;

    }


    if (amplitude) {

        amplitude.value =
            standingState.amplitude;

    }


    if (frequency) {

        frequency.value =
            standingState.frequency;

    }


    if (wavelength) {

        wavelength.value =
            standingState.wavelength;

    }


    /*
     * Update display.
     */

    updateStandingSliderDisplays();


    /*
     * Recalculate highlighted particles.
     */

    chooseStandingHighlightParticles();


    drawStandingWave();

}


/* =========================================================
   74. UPDATE STANDING SLIDER LABELS
   ========================================================= */

function updateStandingSliderDisplays() {

    const speedValue =
        getElement(
            "standingSpeedValue"
        );


    const amplitudeValue =
        getElement(
            "standingAmplitudeValue"
        );


    const frequencyValue =
        getElement(
            "standingFrequencyValue"
        );


    const wavelengthValue =
        getElement(
            "standingWavelengthValue"
        );


    if (speedValue) {

        speedValue.textContent =
            `${standingState.speed.toFixed(1)}×`;

    }


    if (amplitudeValue) {

        amplitudeValue.textContent =
            standingState.amplitude.toFixed(0);

    }


    if (frequencyValue) {

        frequencyValue.textContent =
            `${standingState.frequency.toFixed(1)} Hz`;

    }


    if (wavelengthValue) {

        wavelengthValue.textContent =
            standingState.wavelength.toFixed(0);

    }

}


/* =========================================================
   75. STANDING CONTROL EVENTS
   ========================================================= */

function setupStandingControls() {

    /*
     * PLAY
     */

    const playButton =
        getElement(
            "standingPlay"
        );


    if (playButton) {

        playButton.addEventListener(
            "click",
            playStandingWave
        );

    }


    /*
     * PAUSE
     */

    const pauseButton =
        getElement(
            "standingPause"
        );


    if (pauseButton) {

        pauseButton.addEventListener(
            "click",
            pauseStandingWave
        );

    }


    /*
     * RESET
     */

    const resetButton =
        getElement(
            "standingReset"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetStandingWave
        );

    }


    /*
     * SPEED
     */

    const speed =
        getElement(
            "standingSpeed"
        );


    if (speed) {

        speed.addEventListener(
            "input",
            () => {

                standingState.speed =
                    Number(
                        speed.value
                    );


                updateStandingSliderDisplays();

            }
        );

    }


    /*
     * AMPLITUDE
     */

    const amplitude =
        getElement(
            "standingAmplitude"
        );


    if (amplitude) {

        amplitude.addEventListener(
            "input",
            () => {

                standingState.amplitude =
                    Number(
                        amplitude.value
                    );


                updateStandingSliderDisplays();

                drawStandingWave();

            }
        );

    }


    /*
     * FREQUENCY
     */

    const frequency =
        getElement(
            "standingFrequency"
        );


    if (frequency) {

        frequency.addEventListener(
            "input",
            () => {

                standingState.frequency =
                    Number(
                        frequency.value
                    );


                updateStandingSliderDisplays();

                drawStandingWave();

            }
        );

    }


    /*
     * WAVELENGTH
     */

    const wavelength =
        getElement(
            "standingWavelength"
        );


    if (wavelength) {

        wavelength.addEventListener(
            "input",
            () => {

                standingState.wavelength =
                    Number(
                        wavelength.value
                    );


                updateStandingSliderDisplays();


                /*
                 * Wavelength changes the locations
                 * of nodes and antinodes.
                 */

                chooseStandingHighlightParticles();

                drawStandingWave();

            }
        );

    }


    /*
     * SHOW NODES / ANTINODES
     */

    const nodesToggle =
        getElement(
            "standingNodesToggle"
        );


    if (nodesToggle) {

        nodesToggle.addEventListener(
            "change",
            () => {

                standingState.showNodes =
                    nodesToggle.checked;


                drawStandingWave();

            }
        );

    }


    /*
     * SHOW PHASE
     */

    const phaseToggle =
        getElement(
            "standingPhaseToggle"
        );


    if (phaseToggle) {

        phaseToggle.addEventListener(
            "change",
            () => {

                standingState.showPhase =
                    phaseToggle.checked;


                drawStandingWave();

            }
        );

    }


    /*
     * SHOW ENERGY
     */

    const energyToggle =
        getElement(
            "standingEnergyToggle"
        );


    if (energyToggle) {

        energyToggle.addEventListener(
            "change",
            () => {

                standingState.showEnergy =
                    energyToggle.checked;


                drawStandingWave();

            }
        );

    }

}


/* =========================================================
   76. STANDING RESIZE HANDLING
   ========================================================= */

let standingResizeTimer =
    null;


function handleStandingResize() {

    if (
        standingResizeTimer !==
        null
    ) {

        cancelAnimationFrame(
            standingResizeTimer
        );

    }


    standingResizeTimer =
        requestAnimationFrame(
            () => {

                standingResizeTimer =
                    null;

                resizeStandingCanvas();

            }
        );

}


/* =========================================================
   77. INITIALIZE STANDING WAVE
   ========================================================= */

function initializeStandingWave() {

    if (
        !standingCanvas ||
        !standingCtx
    ) {

        console.error(
            "Standing wave canvas was not found."
        );

        return;

    }


    /*
     * Create particles.
     */

    createStandingParticles();


    /*
     * Size canvas.
     */

    resizeStandingCanvas();


    /*
     * Slider displays.
     */

    updateStandingSliderDisplays();


    /*
     * Controls.
     */

    setupStandingControls();


    /*
     * Resize listener.
     */

    window.addEventListener(
        "resize",
        handleStandingResize,
        {
            passive: true
        }
    );


    /*
     * Initial frame.
     */

    drawStandingWave();

}


/* =========================================================
   78. INITIALIZE STANDING WAVE
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeStandingWave,
        {
            once: true
        }
    );

} else {

    initializeStandingWave();

}


/* =========================================================
   79. ACCORDION / EDUCATIONAL SECTIONS
   ========================================================= */

function setupAccordion(
    buttonId,
    contentId
) {

    const button =
        getElement(buttonId);


    const content =
        getElement(contentId);


    if (
        !button ||
        !content
    ) {

        return;

    }


    button.addEventListener(
        "click",
        () => {

            const isOpen =
                button.getAttribute(
                    "aria-expanded"
                ) === "true";


            button.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );


            if (isOpen) {

                content.hidden =
                    true;

            } else {

                content.hidden =
                    false;

            }

        }
    );

}


/* =========================================================
   80. INITIALIZE ACCORDIONS
   ========================================================= */

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


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAccordions,
        {
            once: true
        }
    );

} else {

    initializeAccordions();

}


/* =========================================================
   81. PAGE VISIBILITY HANDLING
   ========================================================= */

/*
 * If the user changes browser tabs, pause the animations
 * to prevent a large time jump and unnecessary CPU usage.
 *
 * The current time is preserved.
 */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            if (
                progressiveState.running
            ) {

                pauseProgressiveWave();

                progressiveState.wasRunningBeforeHidden =
                    true;

            }


            if (
                standingState.running
            ) {

                pauseStandingWave();

                standingState.wasRunningBeforeHidden =
                    true;

            }

        } else {

            /*
             * Do not automatically restart.
             *
             * The user can press Play again.
             */

            progressiveState.wasRunningBeforeHidden =
                false;

            standingState.wasRunningBeforeHidden =
                false;

        }

    }
);


/* =========================================================
   82. FINAL INITIALIZATION CHECK
   ========================================================= */

function verifySimulationElements() {

    const requiredElements = [

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


    for (
        const id
        of requiredElements
    ) {

        if (
            !getElement(id)
        ) {

            missing.push(id);

        }

    }


    if (
        missing.length > 0
    ) {

        console.warn(
            "Some simulation elements were not found:",
            missing
        );

    }

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        verifySimulationElements,
        {
            once: true
        }
    );

} else {

    verifySimulationElements();

}


/* =========================================================
   END OF SCRIPT.JS — PART 2
   ========================================================= */

/* =========================================================
   PROGRESSIVE WAVE vs STANDING WAVE
   SCRIPT.JS — PART 3
   =========================================================
   FINAL UI + COMPARISON + PROGRESSIVE WAVE
   + EDUCATIONAL INDICATORS
   + TOUCH FRIENDLY INTERACTION
   + 60 SECOND LIMIT
   + FINAL INITIALIZATION
   ========================================================= */

"use strict";


/* =========================================================
   83. SAFE ELEMENT HELPER
   ========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   84. NUMBER FORMATTER
   ========================================================= */

function formatNumber(
    value,
    decimals = 2
) {

    if (
        !Number.isFinite(value)
    ) {

        return "0";

    }


    return Number(value).toFixed(
        decimals
    );

}


/* =========================================================
   85. PHYSICS CONSTANTS
   ========================================================= */

const PHYSICS = {

    TWO_PI:
        Math.PI * 2,

    DEFAULT_SPEED:
        1,

    DEFAULT_AMPLITUDE:
        45,

    DEFAULT_FREQUENCY:
        0.5,

    DEFAULT_WAVELENGTH:
        260,

    PARTICLE_COUNT:
        64,

    PARTICLE_RADIUS:
        4,

    HIGHLIGHT_RADIUS:
        8,

    MAX_DELTA_TIME:
        0.05,

    MAX_TIME:
        60

};


/* =========================================================
   86. PROGRESSIVE WAVE CANVAS
   ========================================================= */

const progressiveCanvas =
    document.getElementById(
        "progressiveCanvas"
    );


const progressiveCtx =
    progressiveCanvas
        ? progressiveCanvas.getContext("2d")
        : null;


const progressiveCanvasContainer =
    document.getElementById(
        "progressiveCanvasContainer"
    );


/* =========================================================
   87. PROGRESSIVE WAVE STATE
   ========================================================= */

const progressiveState = {

    running:
        false,

    finished:
        false,

    time:
        0,

    lastTimestamp:
        null,

    animationFrame:
        null,

    speed:
        PHYSICS.DEFAULT_SPEED,

    amplitude:
        PHYSICS.DEFAULT_AMPLITUDE,

    frequency:
        PHYSICS.DEFAULT_FREQUENCY,

    wavelength:
        PHYSICS.DEFAULT_WAVELENGTH,

    showDirection:
        false,

    showPhase:
        false,

    showEnergy:
        false,

    particles:
        [],

    greenIndex:
        22,

    redIndex:
        23,

    width:
        0,

    height:
        0,

    dpr:
        1,

    equilibriumY:
        0,

    leftMargin:
        28,

    rightMargin:
        28

};


/* =========================================================
   88. CREATE PROGRESSIVE PARTICLES
   ========================================================= */

function createProgressiveParticles() {

    progressiveState.particles =
        [];


    const count =
        PHYSICS.PARTICLE_COUNT;


    for (
        let i = 0;
        i < count;
        i++
    ) {

        progressiveState.particles.push({

            index:
                i,

            x:
                i / (count - 1),

            canvasX:
                0,

            canvasY:
                0,

            displacement:
                0,

            velocity:
                0,

            localAmplitude:
                progressiveState.amplitude,

            highlighted:
                false,

            color:
                null

        });

    }


    chooseProgressiveHighlightParticles();

}


/* =========================================================
   89. RESIZE PROGRESSIVE CANVAS
   ========================================================= */

function resizeProgressiveCanvas() {

    if (
        !progressiveCanvas ||
        !progressiveCanvasContainer
    ) {

        return;

    }


    const rect =
        progressiveCanvasContainer
            .getBoundingClientRect();


    progressiveState.width =
        Math.max(
            1,
            rect.width
        );


    progressiveState.height =
        Math.max(
            1,
            rect.height
        );


    progressiveState.dpr =
        Math.min(
            window.devicePixelRatio || 1,
            3
        );


    progressiveCanvas.width =
        Math.round(
            progressiveState.width *
            progressiveState.dpr
        );


    progressiveCanvas.height =
        Math.round(
            progressiveState.height *
            progressiveState.dpr
        );


    progressiveCanvas.style.width =
        `${progressiveState.width}px`;


    progressiveCanvas.style.height =
        `${progressiveState.height}px`;


    progressiveCtx.setTransform(
        progressiveState.dpr,
        0,
        0,
        progressiveState.dpr,
        0,
        0
    );


    progressiveState.equilibriumY =
        progressiveState.height / 2;


    updateProgressiveParticlePositions();


    drawProgressiveWave();

}


/* =========================================================
   90. PROGRESSIVE X POSITION
   ========================================================= */

function progressiveXToCanvas(
    normalizedX
) {

    const left =
        progressiveState.leftMargin;

    const right =
        progressiveState.width -
        progressiveState.rightMargin;


    return (
        left +
        normalizedX *
        (
            right -
            left
        )
    );

}


/* =========================================================
   91. PROGRESSIVE WAVE NUMBER
   ========================================================= */

function getProgressiveWaveNumber() {

    return (
        PHYSICS.TWO_PI /
        progressiveState.wavelength
    );

}


/* =========================================================
   92. PROGRESSIVE ANGULAR FREQUENCY
   ========================================================= */

function getProgressiveAngularFrequency() {

    return (
        PHYSICS.TWO_PI *
        progressiveState.frequency
    );

}


/* =========================================================
   93. PROGRESSIVE WAVE SPEED
   ========================================================= */

function getProgressiveWaveSpeed() {

    return (
        progressiveState.frequency *
        progressiveState.wavelength
    );

}


/* =========================================================
   94. PROGRESSIVE WAVE EQUATION
   ========================================================= */

/*
 * y = A sin(kx - ωt)
 *
 * The wave pattern travels toward +x.
 */

function getProgressiveDisplacement(
    x,
    time
) {

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


/* =========================================================
   95. PROGRESSIVE PARTICLE VELOCITY
   ========================================================= */

function getProgressiveParticleVelocity(
    x,
    time
) {

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
   96. UPDATE PROGRESSIVE PARTICLES
   ========================================================= */

function updateProgressiveParticles() {

    for (
        const particle
        of progressiveState.particles
    ) {

        particle.displacement =
            getProgressiveDisplacement(
                particle.canvasX,
                progressiveState.time
            );


        particle.velocity =
            getProgressiveParticleVelocity(
                particle.canvasX,
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
   97. UPDATE PROGRESSIVE PARTICLE POSITIONS
   ========================================================= */

function updateProgressiveParticlePositions() {

    for (
        const particle
        of progressiveState.particles
    ) {

        particle.canvasX =
            progressiveXToCanvas(
                particle.x
            );

    }


    chooseProgressiveHighlightParticles();


    updateProgressiveParticles();

}


/* =========================================================
   98. CHOOSE PROGRESSIVE HIGHLIGHT PARTICLES
   ========================================================= */

/*
 * For a progressive wave, adjacent particles do NOT
 * generally have the same phase.
 *
 * The two highlighted particles are deliberately
 * adjacent so students can compare their motion.
 */

function chooseProgressiveHighlightParticles() {

    if (
        progressiveState.particles.length <
        2
    ) {

        return;

    }


    for (
        const particle
        of progressiveState.particles
    ) {

        particle.highlighted =
            false;

        particle.color =
            null;

    }


    const preferredIndex =
        Math.floor(
            progressiveState.particles.length *
            0.48
        );


    let index =
        Math.max(
            1,
            Math.min(
                progressiveState.particles.length - 2,
                preferredIndex
            )
        );


    progressiveState.greenIndex =
        index;

    progressiveState.redIndex =
        index + 1;


    progressiveState.particles[
        progressiveState.greenIndex
    ].highlighted =
        true;


    progressiveState.particles[
        progressiveState.greenIndex
    ].color =
        "green";


    progressiveState.particles[
        progressiveState.redIndex
    ].highlighted =
        true;


    progressiveState.particles[
        progressiveState.redIndex
    ].color =
        "red";

}


/* =========================================================
   99. DRAW PROGRESSIVE BACKGROUND
   ========================================================= */

function drawProgressiveBackground() {

    const ctx =
        progressiveCtx;


    const width =
        progressiveState.width;

    const height =
        progressiveState.height;


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
        "#ffffff"
    );


    gradient.addColorStop(
        0.5,
        "#f8fbfe"
    );


    gradient.addColorStop(
        1,
        "#f0f6fb"
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
   100. DRAW PROGRESSIVE EQUILIBRIUM
   ========================================================= */

function drawProgressiveEquilibriumLine() {

    const ctx =
        progressiveCtx;


    const y =
        progressiveState.equilibriumY;


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
        progressiveState.width - 20,
        y
    );


    ctx.strokeStyle =
        "#a8b5c0";


    ctx.lineWidth =
        1;


    ctx.stroke();


    ctx.restore();


    ctx.save();


    ctx.fillStyle =
        "#778692";


    ctx.font =
        "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";


    ctx.textAlign =
        "left";


    ctx.textBaseline =
        "bottom";


    ctx.fillText(
        "Equilibrium",
        24,
        y - 6
    );


    ctx.restore();

}


/* =========================================================
   101. DRAW PROGRESSIVE WAVE PROFILE
   ========================================================= */

function drawProgressiveWaveProfile() {

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

        const displacement =
            getProgressiveDisplacement(
                x,
                progressiveState.time
            );


        const y =
            progressiveState.equilibriumY -
            displacement;


        if (first) {

            ctx.moveTo(
                x,
                y
            );


            first =
                false;

        } else {

            ctx.lineTo(
                x,
                y
            );

        }

    }


    ctx.strokeStyle =
        "#386fa4";


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
   102. DRAW PROGRESSIVE MEDIUM
   ========================================================= */

function drawProgressiveMedium() {

    const ctx =
        progressiveCtx;


    if (
        progressiveState.particles.length <
        2
    ) {

        return;

    }


    ctx.save();


    ctx.beginPath();


    for (
        let i = 0;
        i <
        progressiveState.particles.length;
        i++
    ) {

        const particle =
            progressiveState.particles[i];


        if (
            i === 0
        ) {

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


    ctx.strokeStyle =
        "#91abc0";


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
   103. DRAW PROGRESSIVE PARTICLES
   ========================================================= */

function drawProgressiveParticles() {

    const ctx =
        progressiveCtx;


    for (
        const particle
        of progressiveState.particles
    ) {

        if (
            particle.highlighted
        ) {

            continue;

        }


        ctx.beginPath();


        ctx.arc(
            particle.canvasX,
            particle.canvasY,
            PHYSICS.PARTICLE_RADIUS,
            0,
            PHYSICS.TWO_PI
        );


        ctx.fillStyle =
            "#6f8ea7";


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

}


/* =========================================================
   104. DRAW PROGRESSIVE HIGHLIGHT
   ========================================================= */

function drawProgressiveHighlightedParticle(
    particle,
    color,
    label
) {

    if (!particle) {

        return;

    }


    const ctx =
        progressiveCtx;


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


    ctx.fillStyle =
        color;


    ctx.font =
        "bold 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";


    ctx.textAlign =
        "center";


    ctx.fillText(
        label,
        particle.canvasX,
        particle.canvasY - 18
    );


    ctx.restore();

}


/* =========================================================
   105. DRAW PROGRESSIVE DIRECTION ARROW
   ========================================================= */

function drawProgressiveDirection() {

    if (
        !progressiveState.showDirection
    ) {

        return;

    }


    const ctx =
        progressiveCtx;


    const y =
        progressiveState.height -
        28;


    const startX =
        progressiveState.width * 0.25;


    const endX =
        progressiveState.width * 0.75;


    ctx.save();


    ctx.strokeStyle =
        "#386fa4";


    ctx.fillStyle =
        "#386fa4";


    ctx.lineWidth =
        2.5;


    ctx.beginPath();


    ctx.moveTo(
        startX,
        y
    );


    ctx.lineTo(
        endX,
        y
    );


    ctx.stroke();


    ctx.beginPath();


    ctx.moveTo(
        endX,
        y
    );


    ctx.lineTo(
        endX - 12,
        y - 7
    );


    ctx.lineTo(
        endX - 12,
        y + 7
    );


    ctx.closePath();


    ctx.fill();


    ctx.font =
        "bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";


    ctx.textAlign =
        "center";


    ctx.fillText(
        "Wave propagation direction →",
        (
            startX +
            endX
        ) / 2,
        y - 8
    );


    ctx.restore();

}


/* =========================================================
   106. PROGRESSIVE PHASE DIFFERENCE
   ========================================================= */

function getProgressivePhaseDifference() {

    const green =
        progressiveState.particles[
            progressiveState.greenIndex
        ];


    const red =
        progressiveState.particles[
            progressiveState.redIndex
        ];


    if (
        !green ||
        !red
    ) {

        return 0;

    }


    const dx =
        red.canvasX -
        green.canvasX;


    const k =
        getProgressiveWaveNumber();


    let phase =
        k * dx;


    /*
     * Normalize to -π ... π.
     */

    while (
        phase > Math.PI
    ) {

        phase -=
            PHYSICS.TWO_PI;

    }


    while (
        phase < -Math.PI
    ) {

        phase +=
            PHYSICS.TWO_PI;

    }


    return phase;

}


/* =========================================================
   107. DRAW PROGRESSIVE PHASE INFORMATION
   ========================================================= */

function drawProgressivePhaseInformation() {

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


    if (
        !green ||
        !red
    ) {

        return;

    }


    const phase =
        getProgressivePhaseDifference();


    const phaseDegrees =
        phase *
        180 /
        Math.PI;


    const ctx =
        progressiveCtx;


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
        42
    );


    ctx.lineTo(
        green.canvasX,
        progressiveState.height - 62
    );


    ctx.moveTo(
        red.canvasX,
        42
    );


    ctx.lineTo(
        red.canvasX,
        progressiveState.height - 62
    );


    ctx.stroke();


    ctx.restore();


    const boxWidth =
        215;


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
        `Adjacent particles: Δφ ≈ ${formatNumber(
            Math.abs(phaseDegrees),
            1
        )}°`,
        boxX + boxWidth / 2,
        boxY + 16
    );


    ctx.fillText(
        "Phase changes continuously along the wave",
        boxX + boxWidth / 2,
        boxY + 31
    );


    const element =
        getElement(
            "progressivePhaseDifference"
        );


    if (element) {

        element.textContent =
            `Δφ ≈ ${formatNumber(
                Math.abs(phaseDegrees),
                1
            )}°`;

    }

}


/* =========================================================
   108. DRAW PROGRESSIVE ENERGY
   ========================================================= */

function drawProgressiveEnergyInformation() {

    if (
        !progressiveState.showEnergy
    ) {

        return;

    }


    const ctx =
        progressiveCtx;


    const y =
        progressiveState.height -
        20;


    const startX =
        50;


    const endX =
        progressiveState.width -
        50;


    ctx.save();


    ctx.strokeStyle =
        "#d48a28";


    ctx.fillStyle =
        "#d48a28";


    ctx.lineWidth =
        2;


    ctx.beginPath();


    ctx.moveTo(
        startX,
        y
    );


    ctx.lineTo(
        endX,
        y
    );


    ctx.stroke();


    ctx.beginPath();


    ctx.moveTo(
        endX,
        y
    );


    ctx.lineTo(
        endX - 10,
        y - 6
    );


    ctx.lineTo(
        endX - 10,
        y + 6
    );


    ctx.closePath();


    ctx.fill();


    ctx.font =
        "bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";


    ctx.textAlign =
        "center";


    ctx.fillText(
        "Energy is transferred in the direction of propagation →",
        progressiveState.width / 2,
        y - 7
    );


    ctx.restore();

}


/* =========================================================
   109. UPDATE PROGRESSIVE INFORMATION
   ========================================================= */

function updateProgressiveParticleInformation() {

    const green =
        progressiveState.particles[
            progressiveState.greenIndex
        ];


    const red =
        progressiveState.particles[
            progressiveState.redIndex
        ];


    if (
        !green ||
        !red
    ) {

        return;

    }


    const greenY =
        getElement(
            "progressiveGreenY"
        );


    const greenMotion =
        getElement(
            "progressiveGreenMotion"
        );


    const redY =
        getElement(
            "progressiveRedY"
        );


    const redMotion =
        getElement(
            "progressiveRedMotion"
        );


    if (greenY) {

        greenY.textContent =
            formatNumber(
                green.displacement,
                1
            );

    }


    if (greenMotion) {

        greenMotion.textContent =
            getProgressiveMotionDescription(
                green.velocity
            );

    }


    if (redY) {

        redY.textContent =
            formatNumber(
                red.displacement,
                1
            );

    }


    if (redMotion) {

        redMotion.textContent =
            getProgressiveMotionDescription(
                red.velocity
            );

    }


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


    const waveSpeed =
        getElement(
            "progressiveWaveSpeed"
        );


    if (waveSpeed) {

        waveSpeed.textContent =
            `${formatNumber(
                getProgressiveWaveSpeed(),
                1
            )} units/s`;

    }

}


/* =========================================================
   110. PROGRESSIVE MOTION DESCRIPTION
   ========================================================= */

function getProgressiveMotionDescription(
    velocity
) {

    const threshold =
        0.5;


    if (
        Math.abs(velocity) <
        threshold
    ) {

        return "At rest";

    }


    if (
        velocity > 0
    ) {

        return "↑ Up";

    }


    return "↓ Down";

}


/* =========================================================
   111. DRAW PROGRESSIVE WAVE
   ========================================================= */

function drawProgressiveWave() {

    if (
        !progressiveCtx
    ) {

        return;

    }


    updateProgressiveParticlePositions();


    drawProgressiveBackground();

    drawProgressiveEquilibriumLine();

    drawProgressiveMedium();

    drawProgressiveWaveProfile();

    drawProgressiveParticles();


    const green =
        progressiveState.particles[
            progressiveState.greenIndex
        ];


    const red =
        progressiveState.particles[
            progressiveState.redIndex
        ];


    drawProgressiveHighlightedParticle(
        green,
        "#20b94f",
        "Particle A"
    );


    drawProgressiveHighlightedParticle(
        red,
        "#ed3d3d",
        "Particle B"
    );


    drawProgressiveDirection();

    drawProgressivePhaseInformation();

    drawProgressiveEnergyInformation();

    updateProgressiveParticleInformation();

}


/* =========================================================
   112. PROGRESSIVE PLAY
   ========================================================= */

function playProgressiveWave() {

    if (
        progressiveState.running
    ) {

        return;

    }


    /*
     * Once 60 seconds has been reached,
     * user must reset before running again.
     */

    if (
        progressiveState.finished
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


/* =========================================================
   113. PROGRESSIVE PAUSE
   ========================================================= */

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
   114. PROGRESSIVE RESET
   ========================================================= */

function resetProgressiveWave() {

    pauseProgressiveWave();


    progressiveState.finished =
        false;


    progressiveState.time =
        0;


    progressiveState.speed =
        PHYSICS.DEFAULT_SPEED;


    progressiveState.amplitude =
        PHYSICS.DEFAULT_AMPLITUDE;


    progressiveState.frequency =
        PHYSICS.DEFAULT_FREQUENCY;


    progressiveState.wavelength =
        PHYSICS.DEFAULT_WAVELENGTH;


    const speed =
        getElement(
            "progressiveSpeed"
        );


    const amplitude =
        getElement(
            "progressiveAmplitude"
        );


    const frequency =
        getElement(
            "progressiveFrequency"
        );


    const wavelength =
        getElement(
            "progressiveWavelength"
        );


    if (speed) {

        speed.value =
            progressiveState.speed;

    }


    if (amplitude) {

        amplitude.value =
            progressiveState.amplitude;

    }


    if (frequency) {

        frequency.value =
            progressiveState.frequency;

    }


    if (wavelength) {

        wavelength.value =
            progressiveState.wavelength;

    }


    updateProgressiveSliderDisplays();


    drawProgressiveWave();


    updatePlayPauseButtons();

}


/* =========================================================
   115. PROGRESSIVE ANIMATION LOOP
   ========================================================= */

function progressiveAnimationLoop(
    timestamp
) {

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


    let delta =
        (
            timestamp -
            progressiveState.lastTimestamp
        ) / 1000;


    delta =
        Math.min(
            delta,
            PHYSICS.MAX_DELTA_TIME
        );


    progressiveState.lastTimestamp =
        timestamp;


    progressiveState.time +=
        delta *
        progressiveState.speed;


    /*
     * Hard 60-second stopping point.
     */

    if (
        progressiveState.time >=
        PHYSICS.MAX_TIME
    ) {

        progressiveState.time =
            PHYSICS.MAX_TIME;


        progressiveState.finished =
            true;


        progressiveState.running =
            false;


        progressiveState.animationFrame =
            null;


        progressiveState.lastTimestamp =
            null;


        drawProgressiveWave();


        updatePlayPauseButtons();


        showSimulationFinishedMessage(
            "progressive"
        );


        return;

    }


    drawProgressiveWave();


    progressiveState.animationFrame =
        requestAnimationFrame(
            progressiveAnimationLoop
        );

}


/* =========================================================
   116. STANDING 60-SECOND LIMIT
   ========================================================= */

function standingAnimationLoopWithLimit(
    timestamp
) {

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


    let delta =
        (
            timestamp -
            standingState.lastTimestamp
        ) / 1000;


    delta =
        Math.min(
            delta,
            PHYSICS.MAX_DELTA_TIME
        );


    standingState.lastTimestamp =
        timestamp;


    standingState.time +=
        delta *
        standingState.speed;


    if (
        standingState.time >=
        PHYSICS.MAX_TIME
    ) {

        standingState.time =
            PHYSICS.MAX_TIME;


        standingState.running =
            false;


        standingState.animationFrame =
            null;


        standingState.lastTimestamp =
            null;


        drawStandingWave();


        showSimulationFinishedMessage(
            "standing"
        );


        return;

    }


    drawStandingWave();


    standingState.animationFrame =
        requestAnimationFrame(
            standingAnimationLoopWithLimit
        );

}


/* =========================================================
   117. REPLACE STANDING LOOP
   ========================================================= */

function restartStandingAnimationFunction() {

    if (
        !standingState.running
    ) {

        return;

    }


    if (
        standingState.animationFrame !==
        null
    ) {

        cancelAnimationFrame(
            standingState.animationFrame
        );

    }


    standingState.lastTimestamp =
        null;


    standingState.animationFrame =
        requestAnimationFrame(
            standingAnimationLoopWithLimit
        );

}


/* =========================================================
   118. STANDING PLAY OVERRIDE
   ========================================================= */

function playStandingWaveWithLimit() {

    if (
        standingState.running
    ) {

        return;

    }


    if (
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
            standingAnimationLoopWithLimit
        );


    updatePlayPauseButtons();

}


/* =========================================================
   119. STANDING PAUSE OVERRIDE
   ========================================================= */

function pauseStandingWaveWithUI() {

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
   120. STANDING RESET OVERRIDE
   ========================================================= */

function resetStandingWaveWithUI() {

    pauseStandingWaveWithUI();


    standingState.time =
        0;


    standingState.speed =
        PHYSICS.DEFAULT_SPEED;


    standingState.amplitude =
        PHYSICS.DEFAULT_AMPLITUDE;


    standingState.frequency =
        PHYSICS.DEFAULT_FREQUENCY;


    standingState.wavelength =
        PHYSICS.DEFAULT_WAVELENGTH;


    const speed =
        getElement(
            "standingSpeed"
        );


    const amplitude =
        getElement(
            "standingAmplitude"
        );


    const frequency =
        getElement(
            "standingFrequency"
        );


    const wavelength =
        getElement(
            "standingWavelength"
        );


    if (speed) {

        speed.value =
            standingState.speed;

    }


    if (amplitude) {

        amplitude.value =
            standingState.amplitude;

    }


    if (frequency) {

        frequency.value =
            standingState.frequency;

    }


    if (wavelength) {

        wavelength.value =
            standingState.wavelength;

    }


    updateStandingSliderDisplays();


    chooseStandingHighlightParticles();


    drawStandingWave();


    updatePlayPauseButtons();

}


/* =========================================================
   121. PROGRESSIVE SLIDER DISPLAY
   ========================================================= */

function updateProgressiveSliderDisplays() {

    const speedValue =
        getElement(
            "progressiveSpeedValue"
        );


    const amplitudeValue =
        getElement(
            "progressiveAmplitudeValue"
        );


    const frequencyValue =
        getElement(
            "progressiveFrequencyValue"
        );


    const wavelengthValue =
        getElement(
            "progressiveWavelengthValue"
        );


    if (speedValue) {

        speedValue.textContent =
            `${progressiveState.speed.toFixed(1)}×`;

    }


    if (amplitudeValue) {

        amplitudeValue.textContent =
            progressiveState.amplitude.toFixed(0);

    }


    if (frequencyValue) {

        frequencyValue.textContent =
            `${progressiveState.frequency.toFixed(1)} Hz`;

    }


    if (wavelengthValue) {

        wavelengthValue.textContent =
            progressiveState.wavelength.toFixed(0);

    }

}


/* =========================================================
   122. PROGRESSIVE CONTROL SETUP
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


    const speed =
        getElement(
            "progressiveSpeed"
        );


    if (speed) {

        speed.addEventListener(
            "input",
            () => {

                progressiveState.speed =
                    Number(
                        speed.value
                    );


                updateProgressiveSliderDisplays();

            }
        );

    }


    const amplitude =
        getElement(
            "progressiveAmplitude"
        );


    if (amplitude) {

        amplitude.addEventListener(
            "input",
            () => {

                progressiveState.amplitude =
                    Number(
                        amplitude.value
                    );


                updateProgressiveSliderDisplays();


                drawProgressiveWave();

            }
        );

    }


    const frequency =
        getElement(
            "progressiveFrequency"
        );


    if (frequency) {

        frequency.addEventListener(
            "input",
            () => {

                progressiveState.frequency =
                    Number(
                        frequency.value
                    );


                updateProgressiveSliderDisplays();


                drawProgressiveWave();

            }
        );

    }


    const wavelength =
        getElement(
            "progressiveWavelength"
        );


    if (wavelength) {

        wavelength.addEventListener(
            "input",
            () => {

                progressiveState.wavelength =
                    Number(
                        wavelength.value
                    );


                updateProgressiveSliderDisplays();


                drawProgressiveWave();

            }
        );

    }


    const direction =
        getElement(
            "progressiveDirectionToggle"
        );


    if (direction) {

        direction.addEventListener(
            "change",
            () => {

                progressiveState.showDirection =
                    direction.checked;


                drawProgressiveWave();

            }
        );

    }


    const phase =
        getElement(
            "progressivePhaseToggle"
        );


    if (phase) {

        phase.addEventListener(
            "change",
            () => {

                progressiveState.showPhase =
                    phase.checked;


                drawProgressiveWave();

            }
        );

    }


    const energy =
        getElement(
            "progressiveEnergyToggle"
        );


    if (energy) {

        energy.addEventListener(
            "change",
            () => {

                progressiveState.showEnergy =
                    energy.checked;


                drawProgressiveWave();

            }
        );

    }

}


/* =========================================================
   123. REBIND STANDING CONTROLS
   ========================================================= */

/*
 * Part 2 may already have created listeners.
 *
 * Instead of creating duplicate listeners,
 * use this helper only when elements have not
 * previously been initialized.
 */

function setupStandingControlsFinal() {

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

        play.onclick =
            playStandingWaveWithLimit;

    }


    if (pause) {

        pause.onclick =
            pauseStandingWaveWithUI;

    }


    if (reset) {

        reset.onclick =
            resetStandingWaveWithUI;

    }

}


/* =========================================================
   124. GLOBAL PLAY / PAUSE UI
   ========================================================= */

function updatePlayPauseButtons() {

    const progressivePlay =
        getElement(
            "progressivePlay"
        );


    const progressivePause =
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


    if (
        progressivePlay
    ) {

        progressivePlay.disabled =
            progressiveState.running ||
            progressiveState.finished;

    }


    if (
        progressivePause
    ) {

        progressivePause.disabled =
            !progressiveState.running;

    }


    if (
        standingPlay
    ) {

        standingPlay.disabled =
            standingState.running ||
            standingState.time >=
            PHYSICS.MAX_TIME;

    }


    if (
        standingPause
    ) {

        standingPause.disabled =
            !standingState.running;

    }

}


/* =========================================================
   125. SIMULATION FINISHED MESSAGE
   ========================================================= */

function showSimulationFinishedMessage(
    type
) {

    const id =
        type === "progressive"
            ? "progressiveFinished"
            : "standingFinished";


    const element =
        getElement(id);


    if (element) {

        element.hidden =
            false;


        element.textContent =
            "Simulation stopped at 60 s. Press Reset to run again.";

    }


    updatePlayPauseButtons();

}


/* =========================================================
   126. HIDE FINISHED MESSAGES
   ========================================================= */

function hideSimulationFinishedMessages() {

    const progressive =
        getElement(
            "progressiveFinished"
        );


    const standing =
        getElement(
            "standingFinished"
        );


    if (progressive) {

        progressive.hidden =
            true;

    }


    if (standing) {

        standing.hidden =
            true;

    }

}


/* =========================================================
   127. COMPARISON ENGINE
   ========================================================= */

function updateComparisonPanel() {

    const progressiveSpeed =
        getProgressiveWaveSpeed();


    const standingSpeed =
        standingState.frequency *
        standingState.wavelength;


    const values = {

        progressiveSpeed,

        standingSpeed,

        progressiveFrequency:
            progressiveState.frequency,

        standingFrequency:
            standingState.frequency,

        progressiveWavelength:
            progressiveState.wavelength,

        standingWavelength:
            standingState.wavelength

    };


    const waveSpeed =
        getElement(
            "comparisonWaveSpeed"
        );


    if (waveSpeed) {

        waveSpeed.textContent =
            formatNumber(
                progressiveSpeed,
                1
            );

    }


    const particleMotion =
        getElement(
            "comparisonParticleMotion"
        );


    if (particleMotion) {

        particleMotion.textContent =
            "Perpendicular to propagation";

    }


    const energyTransfer =
        getElement(
            "comparisonEnergyTransfer"
        );


    if (energyTransfer) {

        energyTransfer.textContent =
            "Yes";

    }


    const nodes =
        getElement(
            "comparisonNodes"
        );


    if (nodes) {

        nodes.textContent =
            "No fixed nodes";

    }


    const antinodes =
        getElement(
            "comparisonAntinodes"
        );


    if (antinodes) {

        antinodes.textContent =
            "No fixed antinodes";

    }


    return values;

}


/* =========================================================
   128. PHYSICS RELATIONSHIP TEXT
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
            "progressiveRelationship"
        );


    const standingRelationship =
        getElement(
            "standingRelationship"
        );


    if (
        progressiveEquation
    ) {

        progressiveEquation.textContent =
            "y = A sin(kx − ωt)";

    }


    if (
        standingEquation
    ) {

        standingEquation.textContent =
            "y = 2A cos(kx) sin(ωt)";

    }


    if (
        progressiveSpeed
    ) {

        progressiveSpeed.textContent =
            `v = fλ = ${formatNumber(
                getProgressiveWaveSpeed(),
                1
            )} units/s`;

    }


    if (
        standingRelationship
    ) {

        standingRelationship.textContent =
            "Nodes remain fixed while particles oscillate about equilibrium.";

    }

}


/* =========================================================
   129. LEARNING OBJECTIVE UPDATE
   ========================================================= */

function updateLearningObjectives() {

    const objectives =
        getElement(
            "learningObjectiveContent"
        );


    if (
        !objectives
    ) {

        return;

    }


    /*
     * Only update if the element is empty.
     *
     * This prevents overwriting detailed content
     * already supplied in HTML.
     */

    if (
        objectives.textContent.trim() !== ""
    ) {

        return;

    }


    objectives.innerHTML = `

        <ul>

            <li>
                Distinguish a progressive wave from a stationary wave.
            </li>

            <li>
                Observe that particles of the medium oscillate
                while the wave disturbance travels.
            </li>

            <li>
                Identify fixed nodes and antinodes in a stationary wave.
            </li>

            <li>
                Compare the phase relationship between adjacent particles.
            </li>

            <li>
                Understand that a progressive wave transfers energy,
                while an ideal stationary wave has no net energy transfer
                along the medium.
            </li>

        </ul>

    `;

}


/* =========================================================
   130. COMPARISON CARDS
   ========================================================= */

function updateComparisonCards() {

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
   131. GLOBAL RESET
   ========================================================= */

function resetEntireSimulation() {

    resetProgressiveWave();


    resetStandingWaveWithUI();


    hideSimulationFinishedMessages();


    updateComparisonPanel();


    updatePhysicsRelationship();


    updatePlayPauseButtons();

}


/* =========================================================
   132. GLOBAL CONTROL SETUP
   ========================================================= */

function setupGlobalControls() {

    const resetAll =
        getElement(
            "resetAll"
        );


    if (resetAll) {

        resetAll.addEventListener(
            "click",
            resetEntireSimulation
        );

    }


    const playAll =
        getElement(
            "playAll"
        );


    if (playAll) {

        playAll.addEventListener(
            "click",
            () => {

                playProgressiveWave();

                playStandingWaveWithLimit();

            }
        );

    }


    const pauseAll =
        getElement(
            "pauseAll"
        );


    if (pauseAll) {

        pauseAll.addEventListener(
            "click",
            () => {

                pauseProgressiveWave();

                pauseStandingWaveWithUI();

            }
        );

    }

}


/* =========================================================
   133. TAB / VIEW SWITCHING
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


    if (
        !buttons.length
    ) {

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


                    /*
                     * Resize after changing panel.
                     */

                    requestAnimationFrame(
                        () => {

                            resizeProgressiveCanvas();

                            resizeStandingCanvas();

                        }
                    );

                }
            );

        }
    );

}


/* =========================================================
   134. TOUCH-FRIENDLY SLIDER SUPPORT
   ========================================================= */

/*
 * Range inputs normally work well on iOS,
 * but this explicitly preserves touch behaviour.
 */

function setupTouchFriendlyRanges() {

    const ranges =
        document.querySelectorAll(
            'input[type="range"]'
        );


    ranges.forEach(
        range => {

            range.style.touchAction =
                "pan-y";


            range.addEventListener(
                "touchstart",
                () => {

                    range.focus();

                },
                {
                    passive: true
                }
            );

        }
    );

}


/* =========================================================
   135. CANVAS TOUCH SCROLL SUPPORT
   ========================================================= */

/*
 * Do NOT prevent normal page scrolling.
 *
 * Users should be able to swipe vertically over
 * the simulation areas to continue scrolling the page.
 */

function setupCanvasTouchScrolling() {

    const canvases =
        document.querySelectorAll(
            "canvas"
        );


    canvases.forEach(
        canvas => {

            canvas.style.touchAction =
                "pan-y pinch-zoom";

        }
    );

}


/* =========================================================
   136. PREVENT UNWANTED DOUBLE-TAP ZOOM
   ========================================================= */

/*
 * Do not globally disable zoom.
 *
 * This is intentionally limited to buttons.
 */

const buttons =
    document.querySelectorAll(
        "button"
    );


buttons.forEach(
    button => {

        button.style.touchAction =
            "manipulation";

    }
);


/* =========================================================
   137. RESIZE BOTH SIMULATIONS
   ========================================================= */

function resizeAllSimulations() {

    resizeProgressiveCanvas();

    resizeStandingCanvas();


    updateComparisonPanel();

    updatePhysicsRelationship();

}


/* =========================================================
   138. DEBOUNCED RESIZE
   ========================================================= */

let globalResizeFrame =
    null;


window.addEventListener(
    "resize",
    () => {

        if (
            globalResizeFrame !==
            null
        ) {

            cancelAnimationFrame(
                globalResizeFrame
            );

        }


        globalResizeFrame =
            requestAnimationFrame(
                () => {

                    globalResizeFrame =
                        null;


                    resizeAllSimulations();

                }
            );

    },
    {
        passive: true
    }
);


/* =========================================================
   139. ORIENTATION CHANGE
   ========================================================= */

window.addEventListener(
    "orientationchange",
    () => {

        setTimeout(
            () => {

                resizeAllSimulations();

            },
            150
        );

    },
    {
        passive: true
    }
);


/* =========================================================
   140. STOP ANIMATION WHEN PAGE IS HIDDEN
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            if (
                progressiveState.running
            ) {

                pauseProgressiveWave();

            }


            if (
                standingState.running
            ) {

                pauseStandingWaveWithUI();

            }

        }

    }
);


/* =========================================================
   141. KEYBOARD ACCESS
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
         * Space:
         * Play / pause both simulations.
         */

        if (
            event.code ===
            "Space"
        ) {

            const active =
                document.activeElement;


            /*
             * Do not interfere with sliders,
             * buttons or text inputs.
             */

            if (
                active &&
                (
                    active.tagName ===
                    "INPUT" ||
                    active.tagName ===
                    "BUTTON" ||
                    active.tagName ===
                    "TEXTAREA"
                )
            ) {

                return;

            }


            event.preventDefault();


            const isRunning =
                progressiveState.running ||
                standingState.running;


            if (isRunning) {

                pauseProgressiveWave();

                pauseStandingWaveWithUI();

            } else {

                playProgressiveWave();

                playStandingWaveWithLimit();

            }

        }


        /*
         * R:
         * Reset.
         */

        if (
            event.key.toLowerCase() ===
            "r"
        ) {

            const active =
                document.activeElement;


            if (
                active &&
                (
                    active.tagName ===
                    "INPUT" ||
                    active.tagName ===
                    "TEXTAREA"
                )
            ) {

                return;

            }


            resetEntireSimulation();

        }

    }
);


/* =========================================================
   142. AUTO-UPDATE PHYSICS INFORMATION
   ========================================================= */

function physicsInformationLoop() {

    updateComparisonPanel();

    updatePhysicsRelationship();


    requestAnimationFrame(
        physicsInformationLoop
    );

}


/* =========================================================
   143. ACCESSIBILITY STATUS
   ========================================================= */

function updateAccessibilityStatus() {

    const status =
        getElement(
            "simulationStatus"
        );


    if (!status) {

        return;

    }


    let progressiveText =
        progressiveState.running
            ? "Progressive wave running"
            : "Progressive wave paused";


    let standingText =
        standingState.running
            ? "Standing wave running"
            : "Standing wave paused";


    if (
        progressiveState.finished
    ) {

        progressiveText =
            "Progressive wave finished at 60 seconds";

    }


    if (
        standingState.time >=
        PHYSICS.MAX_TIME
    ) {

        standingText =
            "Standing wave finished at 60 seconds";

    }


    status.textContent =
        `${progressiveText}. ${standingText}.`;

}


/* =========================================================
   144. STATUS LOOP
   ========================================================= */

function statusLoop() {

    updateAccessibilityStatus();


    requestAnimationFrame(
        statusLoop
    );

}


/* =========================================================
   145. INITIALIZE PROGRESSIVE WAVE
   ========================================================= */

function initializeProgressiveWaveFinal() {

    if (
        !progressiveCanvas ||
        !progressiveCtx
    ) {

        console.warn(
            "Progressive wave canvas not found."
        );


        return;

    }


    createProgressiveParticles();


    resizeProgressiveCanvas();


    updateProgressiveSliderDisplays();


    setupProgressiveControls();


    drawProgressiveWave();

}


/* =========================================================
   146. INITIALIZE STANDING WAVE FINAL
   ========================================================= */

function initializeStandingWaveFinal() {

    if (
        !standingCanvas ||
        !standingCtx
    ) {

        console.warn(
            "Standing wave canvas not found."
        );


        return;

    }


    /*
     * Part 2 may already have initialized the
     * standing wave. We simply make sure the
     * final controls and 60 s behaviour are active.
     */

    if (
        standingState.particles.length ===
        0
    ) {

        createStandingParticles();

    }


    resizeStandingCanvas();


    updateStandingSliderDisplays();


    setupStandingControlsFinal();


    drawStandingWave();

}


/* =========================================================
   147. INITIALIZE COMPLETE SIMULATION
   ========================================================= */

function initializeCompleteSimulation() {

    hideSimulationFinishedMessages();


    initializeProgressiveWaveFinal();


    initializeStandingWaveFinal();


    setupGlobalControls();


    setupSimulationTabs();


    setupTouchFriendlyRanges();


    setupCanvasTouchScrolling();


    updateLearningObjectives();


    updateComparisonCards();


    updateComparisonPanel();


    updatePhysicsRelationship();


    updatePlayPauseButtons();


    /*
     * Start information loops.
     */

    requestAnimationFrame(
        physicsInformationLoop
    );


    requestAnimationFrame(
        statusLoop
    );


    /*
     * Final resize after layout settles.
     */

    requestAnimationFrame(
        () => {

            resizeAllSimulations();

        }
    );

}


/* =========================================================
   148. DOM READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeCompleteSimulation,
        {
            once: true
        }
    );

} else {

    initializeCompleteSimulation();

}


/* =========================================================
   149. EXPORT STATE FOR OPTIONAL DEBUGGING
   ========================================================= */

/*
 * These are deliberately exposed under one namespace
 * so they do not clutter the global window object.
 */

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
        playStandingWaveWithLimit,

    pauseStanding:
        pauseStandingWaveWithUI,

    resetStanding:
        resetStandingWaveWithUI,

    resetAll:
        resetEntireSimulation

};


/* =========================================================
   150. FINAL CONSOLE INFORMATION
   ========================================================= */

console.log(
    "%cWave Simulation Ready",
    "font-weight:bold;font-size:14px;"
);


console.log(
    "Progressive wave: y = A sin(kx − ωt)"
);


console.log(
    "Standing wave: y = 2A cos(kx) sin(ωt)"
);


console.log(
    "Maximum simulation time: 60 seconds"
);


/* =========================================================
   END OF SCRIPT.JS — PART 3
   ========================================================= */
