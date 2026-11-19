/* =========================================================
   Hero section - isometric scene (Three.js, UMD build)
   Falls back to the CSS illustration when WebGL is missing.
   ========================================================= */
(function () {
  "use strict";

  var container = document.getElementById("hero3d");
  if (!container) return;

  var THREE = window.THREE;
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------- Gear menu (works with or without WebGL) ---------------- */

  function menuAnchorFromElement(element) {
    var rect = container.getBoundingClientRect();
    var box = element.getBoundingClientRect();
    return {
      x: box.left + box.width / 2 - rect.left,
      y: box.top - rect.top,
    };
  }

  function placeMenu(menuEl, point) {
    var width = container.clientWidth;
    var height = container.clientHeight;
    var panelWidth = menuEl.offsetWidth || 208;
    var panelHeight = menuEl.offsetHeight || 170;
    var half = panelWidth / 2;
    var x = Math.min(Math.max(point.x, half + 10), width - half - 10);

    var gap = 26;
    var margin = 8;
    var aboveTop = point.y - gap;
    var belowTop = point.y + gap;
    var fitsAbove = aboveTop - panelHeight >= margin;
    var fitsBelow = belowTop + panelHeight <= height - margin;
    var below = !fitsAbove && fitsBelow;
    var tight = !fitsAbove && !fitsBelow;
    var top;

    if (below) {
      top = belowTop;
    } else if (fitsAbove) {
      top = aboveTop;
    } else {
      top = Math.min(
        Math.max(aboveTop, margin + panelHeight),
        height - margin,
      );
    }

    menuEl.classList.toggle("gear-menu--below", below);
    menuEl.classList.toggle("gear-menu--tight", tight);
    menuEl.style.left = x + "px";
    menuEl.style.top = top + "px";

    var notch = Math.min(Math.max(point.x - (x - half), 16), panelWidth - 16);
    menuEl.style.setProperty("--notch-x", notch + "px");
  }

  function createMenuController(anchorFn, isCanvasGear) {
    var menuEl = document.getElementById("gearMenu");
    var toggles = Array.prototype.slice.call(
      document.querySelectorAll("[data-hero-menu-toggle]"),
    );
    var isOpen = false;
    var lastTrigger = null;

    function place(point) {
      if (!menuEl) return;
      if (!container.clientWidth || !container.clientHeight) return;
      placeMenu(menuEl, point || anchorFn());
    }

    function setOpen(open, trigger) {
      if (!menuEl) return;
      isOpen = open;
      menuEl.classList.toggle("is-open", open);

      if (open) {
        menuEl.removeAttribute("inert");
        lastTrigger = trigger || null;
        place();
        window.requestAnimationFrame(function () {
          if (!isOpen) return;
          var firstItem = menuEl.querySelector("a");
          if (firstItem) firstItem.focus({ preventScroll: true });
        });
      } else {
        var focusInside = menuEl.contains(document.activeElement);
        menuEl.setAttribute("inert", "");
        if (
          focusInside &&
          lastTrigger &&
          typeof lastTrigger.focus === "function"
        ) {
          lastTrigger.focus({ preventScroll: true });
        }
        lastTrigger = null;
      }

      toggles.forEach(function (toggle) {
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    function toggle(trigger) {
      setOpen(!isOpen, trigger);
    }

    toggles.forEach(function (toggleEl) {
      toggleEl.addEventListener("click", function (event) {
        event.preventDefault();
        toggle(toggleEl);
      });
    });

    document.addEventListener("pointerdown", function (event) {
      if (!isOpen) return;
      if (menuEl && menuEl.contains(event.target)) return;
      if (
        event.target.closest &&
        event.target.closest("[data-hero-menu-toggle]")
      ) {
        return;
      }
      if (isCanvasGear && isCanvasGear(event)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !isOpen) return;
      event.preventDefault();
      setOpen(false);
    });

    if (menuEl) {
      menuEl.addEventListener("click", function (event) {
        if (event.target.closest("a")) setOpen(false);
      });
    }

    return {
      place: place,
      toggle: toggle,
      setOpen: setOpen,
      isOpen: function () {
        return isOpen;
      },
    };
  }

  function wireFallbackMenu() {
    var fallbackButton = container.querySelector(".gear-fallback");
    if (!fallbackButton) return;
    var fallbackMenu = createMenuController(function () {
      return menuAnchorFromElement(fallbackButton);
    });
    window.addEventListener("resize", function () {
      if (fallbackMenu.isOpen()) fallbackMenu.place();
    });
  }

  if (!THREE) {
    wireFallbackMenu();
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    wireFallbackMenu();
    return;
  }

  if (!renderer || !renderer.getContext()) {
    wireFallbackMenu();
    return;
  }

  /* ---------------- Scene & camera ---------------- */

  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
  var cameraBase = new THREE.Vector3(13, 11, 13);
  var lookAtTarget = new THREE.Vector3(0, 1.5, 0);

  camera.position.copy(cameraBase);
  camera.lookAt(lookAtTarget);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);
  container.classList.add("is-ready");

  /* ---------------- Palette & helpers ---------------- */

  var COLORS = {
    emerald: 0x22d3ee,
    emeraldLight: 0x67e8f9,
    sky: 0x3b82f6,
    skyLight: 0x93c5fd,
    amber: 0xf59e0b,
    violet: 0x8b5cf6,
    ink: 0x050b1d,
    slate: 0x64748b,
    white: 0xe9f1ff,
    deck: 0x15264a,
    stage: 0x0d1936,
  };

  function material(color, extra) {
    var options = { color: color, roughness: 0.55, metalness: 0.04, flatShading: true };
    if (extra) {
      for (var key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) options[key] = extra[key];
      }
    }
    return new THREE.MeshStandardMaterial(options);
  }

  function box(w, h, d, color, extra) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, extra));
  }

  /* ---------------- Lights ---------------- */

  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1e3a8a, 1.1));
  scene.add(new THREE.AmbientLight(0x93b4ff, 0.28));

  var keyLight = new THREE.DirectionalLight(0xdbeafe, 1.45);
  keyLight.position.set(8, 14, 9);
  scene.add(keyLight);

  var fillLight = new THREE.DirectionalLight(0x60a5fa, 0.75);
  fillLight.position.set(-10, 6, -8);
  scene.add(fillLight);

  /* ---------------- Floating objects bookkeeping ---------------- */

  var world = new THREE.Group();
  scene.add(world);

  var floating = [];

  function addFloating(object, amplitude, speed, phase) {
    floating.push({
      object: object,
      baseY: object.position.y,
      amplitude: amplitude,
      speed: speed,
      phase: phase || 0,
      spin: 0,
    });
    return object;
  }

  /* ---------------- Soft ground shadow ---------------- */

  function createShadowTexture() {
    var canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    var ctx = canvas.getContext("2d");
    var gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.45)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.18)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    var texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  var shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.75;
  world.add(shadow);

  /* ---------------- Isometric stage ---------------- */

  var GROUND = 0.06;

  var stage = new THREE.Group();
  world.add(stage);

  var plate = new THREE.Mesh(
    new THREE.CylinderGeometry(4.55, 4.3, 0.55, 6),
    material(COLORS.stage, { roughness: 0.7 }),
  );
  plate.position.y = -0.275;
  stage.add(plate);

  var deck = new THREE.Mesh(
    new THREE.CylinderGeometry(3.95, 3.95, 0.06, 6),
    material(COLORS.deck, { roughness: 0.75 }),
  );
  deck.position.y = 0.03;
  stage.add(deck);

  // Thin accent rim around the deck
  var rim = new THREE.Mesh(
    new THREE.CylinderGeometry(4.06, 4.06, 0.04, 6),
    material(COLORS.emeraldLight, { roughness: 0.6 }),
  );
  rim.position.y = 0.01;
  stage.add(rim);

  /* ---------------- Laptop with dashboard ---------------- */

  var laptop = new THREE.Group();
  laptop.position.set(0.55, GROUND, 0.85);
  stage.add(laptop);

  var shell = box(3.8, 0.14, 2.5, 0x24365c, { roughness: 0.45, metalness: 0.15 });
  shell.position.y = 0.07;
  laptop.add(shell);

  var well = box(3.4, 0.02, 2.15, 0x16233f, { roughness: 0.6 });
  well.position.set(0, 0.15, -0.05);
  laptop.add(well);

  var trackpad = box(0.95, 0.015, 0.6, 0x2c426b);
  trackpad.position.set(0, 0.165, 0.72);
  laptop.add(trackpad);

  var screenPivot = new THREE.Group();
  screenPivot.position.set(0, 0.16, -1.2);
  screenPivot.rotation.x = -0.26;
  laptop.add(screenPivot);

  var lid = box(3.8, 2.4, 0.12, 0x1e2f52, { roughness: 0.45, metalness: 0.12 });
  lid.position.set(0, 1.2, 0);
  screenPivot.add(lid);

  var display = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 2.12),
    material(COLORS.ink, { roughness: 0.85, metalness: 0 }),
  );
  display.position.set(0, 1.2, 0.065);
  screenPivot.add(display);

  // Dashboard bars
  var barSpecs = [
    { x: -1.15, height: 0.62, color: 0x60a5fa },
    { x: -0.55, height: 0.95, color: COLORS.skyLight },
    { x: 0.05, height: 0.76, color: 0xfcd34d },
    { x: 0.65, height: 1.18, color: COLORS.emerald },
  ];

  barSpecs.forEach(function (spec) {
    var bar = box(0.4, spec.height, 0.1, spec.color, { roughness: 0.4 });
    bar.position.set(spec.x, 0.4 + spec.height / 2, 0.1);
    screenPivot.add(bar);
  });

  var baseline = box(2.25, 0.03, 0.12, COLORS.slate);
  baseline.position.set(-0.25, 0.38, 0.1);
  screenPivot.add(baseline);

  // Dashboard donut ring
  var donut = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.08, 10, 28),
    material(COLORS.emeraldLight, { roughness: 0.4 }),
  );
  donut.position.set(1.05, 1.55, 0.1);
  screenPivot.add(donut);

  // Dashboard title lines
  var titleBar = box(1.1, 0.07, 0.04, 0x64748b);
  titleBar.position.set(-1.05, 1.86, 0.09);
  screenPivot.add(titleBar);

  var subtitleBar = box(0.7, 0.05, 0.04, COLORS.slate);
  subtitleBar.position.set(-1.25, 1.7, 0.09);
  screenPivot.add(subtitleBar);

  /* ---------------- Books ---------------- */

  var bookColors = [COLORS.emerald, COLORS.sky, COLORS.amber];
  var bookTilts = [0.16, -0.2, 0.08];

  bookColors.forEach(function (color, index) {
    var book = box(1.5, 0.24, 1.1, color, { roughness: 0.6 });
    book.position.set(-2.75, GROUND + 0.12 + index * 0.25, 0.9);
    book.rotation.y = bookTilts[index];
    stage.add(book);
  });

  /* ---------------- Graduation cap ---------------- */

  var cap = new THREE.Group();
  cap.position.set(2.9, GROUND, 1.5);
  cap.rotation.y = 0.25;
  stage.add(cap);

  var crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.5, 0.34, 8),
    material(0x122144, { roughness: 0.5 }),
  );
  crown.position.y = 0.17;
  cap.add(crown);

  var board = box(1.3, 0.08, 1.3, 0x1b2f57);
  board.position.y = 0.38;
  cap.add(board);

  var button = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12),
    material(0xfbbf24),
  );
  button.position.y = 0.44;
  cap.add(button);

  var cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6),
    material(0xfbbf24),
  );
  cord.position.set(0.55, 0.16, 0.55);
  cap.add(cord);

  var tassel = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.18, 8),
    material(0xfbbf24),
  );
  tassel.position.set(0.55, -0.12, 0.55);
  cap.add(tassel);

  addFloating(cap, 0.06, 1.1, 1.4).spin = 0.15;

  /* ---------------- Gear navigation button ---------------- */

  var gearRoot = new THREE.Group();
  gearRoot.position.set(1.25, 0.8, 0.85);
  laptop.add(gearRoot);
  addFloating(gearRoot, 0.05, 1.25, 0.6);

  var gearTilt = new THREE.Group();
  gearTilt.rotation.set(-0.14, Math.PI / 4, 0);
  gearRoot.add(gearTilt);

  function createGearGeometry(teeth, outerRadius, rootRadius, holeRadius, depth) {
    var shape = new THREE.Shape();
    var step = (Math.PI * 2) / teeth;
    var profile = [
      [0, rootRadius],
      [0.1, rootRadius],
      [0.18, outerRadius],
      [0.42, outerRadius],
      [0.5, rootRadius],
      [0.82, rootRadius],
    ];
    var started = false;

    for (var i = 0; i < teeth; i++) {
      for (var j = 0; j < profile.length; j++) {
        var angle = (i + profile[j][0]) * step;
        var radius = profile[j][1];
        var px = Math.cos(angle) * radius;
        var py = Math.sin(angle) * radius;
        if (!started) {
          shape.moveTo(px, py);
          started = true;
        } else {
          shape.lineTo(px, py);
        }
      }
    }
    shape.closePath();

    var hole = new THREE.Path();
    hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    var geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 16,
    });
    geometry.center();
    return geometry;
  }

  var gearMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.32,
    metalness: 0.45,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.45,
  });

  var gearMesh = new THREE.Mesh(
    createGearGeometry(10, 0.55, 0.43, 0.19, 0.16),
    gearMaterial,
  );
  gearTilt.add(gearMesh);

  var gearHub = new THREE.Mesh(
    new THREE.CircleGeometry(0.21, 24),
    material(0x0b1a3d, { roughness: 0.5, metalness: 0.2 }),
  );
  gearHub.position.z = 0.101;
  gearTilt.add(gearHub);

  var pulseRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.74, 0.012, 6, 64),
    new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  pulseRing.position.z = 0.02;
  gearTilt.add(pulseRing);

  var gearShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  gearShadow.rotation.x = -Math.PI / 2;
  gearShadow.position.set(1.25, 0.17, 0.85);
  laptop.add(gearShadow);

  var gearHovering = false;
  var gearScaleTarget = 1;
  var gearGlowTarget = 0.45;
  var gearSpinBoost = 0;

  /* ---------------- Floating cubes ---------------- */

  var cubeSpecs = [
    { position: [-3.4, 2.4, -0.3], size: 0.34, color: 0x67e8f9, tilt: 0.6 },
    { position: [3.15, 3.0, 0.65], size: 0.42, color: 0x93c5fd, tilt: 0.4 },
    { position: [-2.5, 3.5, 1.7], size: 0.36, color: 0xc4b5fd, tilt: 0.2 },
    { position: [0.9, 4.0, -1.4], size: 0.3, color: 0x7dd3fc, tilt: 0.7 },
  ];

  cubeSpecs.forEach(function (spec, index) {
    var cube = box(spec.size, spec.size, spec.size, spec.color, { roughness: 0.45 });
    cube.position.set(spec.position[0], spec.position[1], spec.position[2]);
    cube.rotation.set(spec.tilt, spec.tilt * 0.7, spec.tilt * 0.3);
    world.add(cube);
    addFloating(cube, 0.16 + (index % 3) * 0.05, 0.6 + index * 0.09, index * 1.3).spin =
      0.22 + index * 0.05;
  });

  /* ---------------- Camera framing ---------------- */

  function resize() {
    var width = container.clientWidth;
    var height = container.clientHeight;
    if (!width || !height) return;

    var aspect = width / height;
    var viewSize = Math.max(10.2, 10.4 / aspect);

    camera.left = (-viewSize * aspect) / 2;
    camera.right = (viewSize * aspect) / 2;
    camera.top = viewSize / 2;
    camera.bottom = -viewSize / 2;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
  }

  /* ---------------- Animation loop ---------------- */

  var clock = new THREE.Clock();
  var frameId = 0;
  var running = false;
  var inView = true;

  var pointer = { x: 0, y: 0 };
  var pointerTarget = { x: 0, y: 0 };

  function draw() {
    renderer.render(scene, camera);
  }

  function tick() {
    frameId = window.requestAnimationFrame(tick);

    var time = clock.getElapsedTime();

    floating.forEach(function (item) {
      item.object.position.y =
        item.baseY + Math.sin(time * item.speed + item.phase) * item.amplitude;
      if (item.spin) {
        item.object.rotation.y += item.spin * 0.01;
      }
    });

    pointer.x += (pointerTarget.x - pointer.x) * 0.05;
    pointer.y += (pointerTarget.y - pointer.y) * 0.05;

    gearMesh.rotation.z += 0.004 + gearSpinBoost;
    gearSpinBoost *= 0.9;

    var gearScale =
      gearRoot.scale.x + (gearScaleTarget - gearRoot.scale.x) * 0.18;
    gearRoot.scale.setScalar(gearScale);
    gearMaterial.emissiveIntensity +=
      (gearGlowTarget - gearMaterial.emissiveIntensity) * 0.18;
    pulseRing.material.opacity = 0.28 + Math.sin(time * 1.7) * 0.12;
    pulseRing.scale.setScalar(1 + Math.sin(time * 1.7) * 0.03);

    camera.position.set(
      cameraBase.x + pointer.x * 0.9,
      cameraBase.y + pointer.y * 0.55,
      cameraBase.z - pointer.x * 0.9,
    );
    camera.lookAt(lookAtTarget);
    camera.updateMatrixWorld();

    world.position.y = Math.sin(time * 0.6) * 0.06;

    positionOverlay();
    draw();
  }

  function shouldRun() {
    return inView && !document.hidden && !prefersReduced.matches;
  }

  function syncMotion() {
    if (shouldRun()) {
      if (running) return;
      running = true;
      clock.start();
      tick();
    } else {
      running = false;
      window.cancelAnimationFrame(frameId);
      draw();
    }
  }

  /* ---------------- Gear interaction & menu ---------------- */

  var gearHitButton = container.querySelector(".gear-hit");
  var raycaster = new THREE.Raycaster();
  var pointerNdc = new THREE.Vector2();
  var gearWorld = new THREE.Vector3();

  function projectGear() {
    gearRoot.getWorldPosition(gearWorld);
    gearWorld.project(camera);
    return {
      x: (gearWorld.x * 0.5 + 0.5) * container.clientWidth,
      y: (-gearWorld.y * 0.5 + 0.5) * container.clientHeight,
    };
  }

  function positionOverlay() {
    if (!container.clientWidth || !container.clientHeight) return;

    var point = projectGear();

    if (gearHitButton) {
      gearHitButton.style.left = point.x + "px";
      gearHitButton.style.top = point.y + "px";
    }

    if (menu.isOpen()) menu.place(point);
  }

  function isGearHit(clientX, clientY) {
    var rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    return raycaster.intersectObject(gearRoot, true).length > 0;
  }

  function updateGearHover(hit) {
    if (hit === gearHovering) return;
    gearHovering = hit;
    gearScaleTarget = hit ? 1.12 : 1;
    gearGlowTarget = hit ? 1.05 : 0.45;
    renderer.domElement.style.cursor = hit ? "pointer" : "";

    if (prefersReduced.matches) {
      gearRoot.scale.setScalar(hit ? 1.12 : 1);
      gearMaterial.emissiveIntensity = hit ? 1.05 : 0.45;
      draw();
    }
  }

  var menu = createMenuController(projectGear, function (event) {
    return (
      event.target === renderer.domElement &&
      isGearHit(event.clientX, event.clientY)
    );
  });

  renderer.domElement.addEventListener("pointermove", function (event) {
    updateGearHover(isGearHit(event.clientX, event.clientY));
  });

  renderer.domElement.addEventListener("pointerleave", function () {
    updateGearHover(false);
  });

  if (gearHitButton) {
    gearHitButton.addEventListener("pointerenter", function () {
      updateGearHover(true);
    });
    gearHitButton.addEventListener("pointerleave", function () {
      updateGearHover(false);
    });
    gearHitButton.addEventListener("click", function () {
      gearSpinBoost += 0.2;
    });
  }

  renderer.domElement.addEventListener("click", function (event) {
    if (!isGearHit(event.clientX, event.clientY)) return;
    gearSpinBoost += 0.2;
    menu.toggle(gearHitButton);
  });

  /* ---------------- Events ---------------- */

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      resize();
      positionOverlay();
      if (!running) draw();
    }).observe(container);
  }

  window.addEventListener("resize", function () {
    resize();
    positionOverlay();
    if (!running) draw();
  });

  container.addEventListener("pointermove", function (event) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    var rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerTarget.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerTarget.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  });

  container.addEventListener("pointerleave", function () {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  });

  document.addEventListener("visibilitychange", syncMotion);

  if (typeof prefersReduced.addEventListener === "function") {
    prefersReduced.addEventListener("change", syncMotion);
  }

  if (window.IntersectionObserver) {
    new IntersectionObserver(
      function (entries) {
        inView = entries[0].isIntersecting;
        syncMotion();
      },
      { threshold: 0.05 },
    ).observe(container);
  }

  /* ---------------- Boot ---------------- */

  resize();
  draw();
  positionOverlay();
  syncMotion();
})();
