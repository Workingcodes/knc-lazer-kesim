(function () {
  if (window.innerWidth < 768) return;

  var ACCENT       = 0xe05a00;
  var LASER_COLOR  = 0x00e5ff;
  var METAL_COLOR  = 0x1e3d6e;
  var SPARK_COLOR  = 0xffaa00;

  function init() {
    var THREE   = window.THREE;
    var section = document.getElementById('hero');
    if (!section || !THREE) return;

    // Canvas — absolute, above overlay, below content
    var canvas = document.createElement('canvas');
    canvas.id = 'hero-canvas';
    canvas.style.cssText =
      'position:absolute;inset:0;z-index:1;pointer-events:none;width:100%;height:100%;';
    var heroContent = section.querySelector('.hero-content');
    section.insertBefore(canvas, heroContent);

    var W = section.clientWidth;
    var H = section.clientHeight;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(-1.5, 0, 9);

    // ── Lights ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0d1f3c, 4));

    var sun = new THREE.DirectionalLight(0xffffff, 4);
    sun.position.set(4, 6, 5);
    scene.add(sun);

    var fill = new THREE.PointLight(ACCENT, 6, 14);
    fill.position.set(-4, 2, 4);
    scene.add(fill);

    var rim = new THREE.PointLight(0x4488ff, 3, 10);
    rim.position.set(6, -3, 2);
    scene.add(rim);

    // ── Gear shape ──────────────────────────────────────────────────────
    function makeGearShape(outerR, innerR, teeth) {
      var s    = new THREE.Shape();
      var step = (Math.PI * 2) / teeth;
      s.moveTo(innerR, 0);
      for (var i = 0; i < teeth; i++) {
        var a = i * step;
        s.lineTo(Math.cos(a) * innerR,            Math.sin(a) * innerR);
        s.lineTo(Math.cos(a + step * 0.18) * outerR, Math.sin(a + step * 0.18) * outerR);
        s.lineTo(Math.cos(a + step * 0.32) * outerR, Math.sin(a + step * 0.32) * outerR);
        s.lineTo(Math.cos(a + step * 0.5)  * innerR, Math.sin(a + step * 0.5)  * innerR);
      }
      s.closePath();
      var hole = new THREE.Path();
      hole.absarc(0, 0, 0.55, 0, Math.PI * 2, true);
      s.holes.push(hole);
      return s;
    }

    var shape = makeGearShape(2, 1.45, 12);
    var geo   = new THREE.ExtrudeGeometry(shape, {
      depth: 0.32, bevelEnabled: true,
      bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4,
    });
    geo.center();

    var mat = new THREE.MeshStandardMaterial({
      color: METAL_COLOR, metalness: 0.95, roughness: 0.15,
    });

    var gear = new THREE.Mesh(geo, mat);
    gear.position.set(3.8, -0.3, 0);
    scene.add(gear);

    // Decorative outer ring
    var ringGeo = new THREE.TorusGeometry(2.35, 0.018, 8, 128);
    var ringMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.35 });
    gear.add(new THREE.Mesh(ringGeo, ringMat));

    // Inner ring
    var ring2Geo = new THREE.TorusGeometry(0.7, 0.012, 8, 64);
    var ring2Mat = new THREE.MeshBasicMaterial({ color: LASER_COLOR, transparent: true, opacity: 0.25 });
    gear.add(new THREE.Mesh(ring2Geo, ring2Mat));

    // ── Laser trace ─────────────────────────────────────────────────────
    var outlinePoints = shape.getPoints(140);
    var lp3 = outlinePoints.map(function (p) {
      return new THREE.Vector3(p.x, p.y, 0.20);
    });

    // Glowing dot
    var dotGeo = new THREE.SphereGeometry(0.055, 12, 12);
    var dotMat = new THREE.MeshBasicMaterial({ color: LASER_COLOR });
    var dot    = new THREE.Mesh(dotGeo, dotMat);
    gear.add(dot);

    // Soft glow halo around dot
    var haloGeo = new THREE.SphereGeometry(0.22, 12, 12);
    var haloMat = new THREE.MeshBasicMaterial({ color: LASER_COLOR, transparent: true, opacity: 0.12 });
    var halo    = new THREE.Mesh(haloGeo, haloMat);
    gear.add(halo);

    // Trail
    var TRAIL     = 50;
    var trailBuf  = new Float32Array(TRAIL * 3);
    var trailGeo  = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailBuf, 3));
    var trailMat  = new THREE.LineBasicMaterial({
      color: LASER_COLOR, transparent: true, opacity: 0.65,
    });
    gear.add(new THREE.Line(trailGeo, trailMat));

    // ── Sparks ──────────────────────────────────────────────────────────
    var SPARKS      = 24;
    var sparkPos    = new Float32Array(SPARKS * 3);
    var sparkV      = [];
    for (var k = 0; k < SPARKS; k++) {
      sparkV.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
    }
    var sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    var sparkMat = new THREE.PointsMaterial({
      color: SPARK_COLOR, size: 0.07, transparent: true, opacity: 0.9,
    });
    gear.add(new THREE.Points(sparkGeo, sparkMat));

    // ── Background particles ─────────────────────────────────────────────
    var BGP    = 80;
    var bgPos  = new Float32Array(BGP * 3);
    for (var b = 0; b < BGP; b++) {
      bgPos[b * 3]     = (Math.random() - 0.5) * 16;
      bgPos[b * 3 + 1] = (Math.random() - 0.5) * 10;
      bgPos[b * 3 + 2] = (Math.random() - 0.5) * 4 - 2;
    }
    var bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    var bgMat = new THREE.PointsMaterial({
      color: 0x4488cc, size: 0.04, transparent: true, opacity: 0.4,
    });
    scene.add(new THREE.Points(bgGeo, bgMat));

    // ── Mouse parallax ──────────────────────────────────────────────────
    var mx = 0, my = 0;
    window.addEventListener('mousemove', function (e) {
      mx = (e.clientX / innerWidth  - 0.5);
      my = (e.clientY / innerHeight - 0.5);
    });

    // ── Animation loop ──────────────────────────────────────────────────
    var laserIdx = 0;
    var frame    = 0;

    function animate() {
      requestAnimationFrame(animate);
      frame++;

      // Gear slow rotation
      gear.rotation.z += 0.004;

      // Camera parallax
      camera.position.x += (mx * 1.5 - camera.position.x) * 0.04;
      camera.position.y += (-my * 1.0 - camera.position.y) * 0.04;
      camera.lookAt(3.8, -0.3, 0);

      // Advance laser along outline
      laserIdx = (laserIdx + 2) % lp3.length;
      var curr = lp3[laserIdx];
      dot.position.copy(curr);
      halo.position.copy(curr);

      // Shift trail buffer
      for (var i = TRAIL - 1; i > 0; i--) {
        trailBuf[i * 3]     = trailBuf[(i - 1) * 3];
        trailBuf[i * 3 + 1] = trailBuf[(i - 1) * 3 + 1];
        trailBuf[i * 3 + 2] = trailBuf[(i - 1) * 3 + 2];
      }
      trailBuf[0] = curr.x; trailBuf[1] = curr.y; trailBuf[2] = curr.z;
      trailGeo.attributes.position.needsUpdate = true;

      // Emit spark every 3 frames
      if (frame % 3 === 0) {
        var si = Math.floor(Math.random() * SPARKS);
        var sv = sparkV[si];
        sv.x = curr.x; sv.y = curr.y; sv.z = curr.z;
        sv.vx = (Math.random() - 0.5) * 0.07;
        sv.vy = Math.random() * 0.09 + 0.02;
        sv.vz = (Math.random() - 0.5) * 0.05;
        sv.life = 1.0;
      }
      for (var j = 0; j < SPARKS; j++) {
        var sp = sparkV[j];
        if (sp.life > 0) {
          sp.x  += sp.vx; sp.y += sp.vy; sp.z += sp.vz;
          sp.vy -= 0.003;
          sp.life -= 0.045;
        }
        sparkPos[j * 3]     = sp.life > 0 ? sp.x : 9999;
        sparkPos[j * 3 + 1] = sp.life > 0 ? sp.y : 9999;
        sparkPos[j * 3 + 2] = sp.life > 0 ? sp.z : 9999;
      }
      sparkGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }

    animate();

    // Resize
    window.addEventListener('resize', function () {
      if (window.innerWidth < 768) {
        canvas.style.display = 'none';
        return;
      }
      canvas.style.display = '';
      var w = section.clientWidth;
      var h = section.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
  }

  // Load Three.js locally then boot
  var s    = document.createElement('script');
  s.src    = 'three.min.js';
  s.onload = init;
  document.head.appendChild(s);
})();
