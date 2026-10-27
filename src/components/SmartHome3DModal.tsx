import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  X,
  Eye,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Power,
  Tv,
  Coffee,
  Lightbulb,
} from 'lucide-react';
import { Device, Language } from '../types';

interface SmartHome3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  totalWatts: number;
  lang: Language;
  onTogglePower: (id: string, nextState: boolean) => void;
  onRunQuickAction: (actionKey: string) => void;
}

export const SmartHome3DModal: React.FC<SmartHome3DModalProps> = ({
  isOpen,
  onClose,
  devices,
  totalWatts,
  lang,
  onTogglePower,
  onRunQuickAction,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [activeCameraView, setActiveCameraView] = useState<'iso' | 'living' | 'bedroom' | 'kitchen' | 'top'>('iso');
  const [isNightMode, setIsNightMode] = useState(true);
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);

  // References to keep mutable 3D objects accessible without React re-renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const deviceLightsRef = useRef<Map<string, { light: THREE.PointLight | THREE.SpotLight; mesh?: THREE.Mesh }>>(new Map());
  const clickableMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(12, 11, 13));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.5, 0));
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  // Keep devices in a ref for raycast callbacks
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  // Initialize Three.js Scene
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1017);
    scene.fog = new THREE.FogExp2(0x0c1017, 0.022);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(12, 11, 13);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. OrbitControls with smooth damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05; // Don't flip below ground
    controls.minDistance = 4;
    controls.maxDistance = 28;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // 6. Lighting Rig (Warm Key + Cool Hemisphere Fill)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, isNightMode ? 0.35 : 0.85);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xffecd2, isNightMode ? 0.4 : 1.6);
    sunLight.position.set(12, 18, 8);
    sunLight.castShadow = !isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 40;
      sunLight.shadow.camera.left = -9;
      sunLight.shadow.camera.right = 9;
      sunLight.shadow.camera.top = 9;
      sunLight.shadow.camera.bottom = -9;
      sunLight.shadow.bias = -0.0004;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Soft ground plane with contact shadow receiver
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090d13,
      roughness: 0.95,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);

    // 7. BUILD PROCEDURAL 3D SMART HOME (Multi-part Composite Models)
    buildSmartHome(scene, clickableMeshesRef.current, deviceLightsRef.current, isSoftwareGl);

    // 8. Raycasting for interactive clicks & hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const objects = Array.from(clickableMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(objects, true);

      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        let foundId: string | null = null;
        while (current) {
          if (current.userData && current.userData.deviceId) {
            foundId = current.userData.deviceId;
            break;
          }
          current = current.parent;
        }
        setHoveredDevice(foundId);
        container.style.cursor = foundId ? 'pointer' : 'default';
      } else {
        setHoveredDevice(null);
        container.style.cursor = 'default';
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const objects = Array.from(clickableMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(objects, true);

      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        let foundId: string | null = null;
        while (current) {
          if (current.userData && current.userData.deviceId) {
            foundId = current.userData.deviceId;
            break;
          }
          current = current.parent;
        }
        if (foundId) {
          const dev = devicesRef.current.find((d) => d.id === foundId);
          if (dev && !dev.essential && dev.online) {
            onTogglePower(dev.id, !dev.on);
          }
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    // 9. Animation Loop with Exponential Damping & Lossless 60fps
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Smooth camera transition if user selected a preset
      if (targetCamPosRef.current && camera.position.distanceTo(targetCamPosRef.current) > 0.05) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPosRef.current.x, 3.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPosRef.current.y, 3.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPosRef.current.z, 3.5, delta);
      }
      if (targetLookAtRef.current && controls.target.distanceTo(targetLookAtRef.current) > 0.05) {
        controls.target.x = THREE.MathUtils.damp(controls.target.x, targetLookAtRef.current.x, 3.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, targetLookAtRef.current.y, 3.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, targetLookAtRef.current.z, 3.5, delta);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);

      // Recursive disposal
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [isOpen]);

  // Update dynamic lights & emissive materials when devices change
  useEffect(() => {
    if (!sceneRef.current) return;
    const lightMap = deviceLightsRef.current;

    devices.forEach((dev) => {
      const entry = lightMap.get(dev.id);
      if (entry) {
        const { light, mesh } = entry;
        const isOn = dev.on;

        // Animate light intensity smoothly
        light.intensity = isOn ? 1.6 : 0.05;

        // If mesh is emissive (like lightbulb, TV screen, or coffee LED)
        if (mesh && (mesh.material as THREE.MeshStandardMaterial).emissive) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (dev.kind === 'light') {
            mat.emissive.set(isOn ? 0xfff3d6 : 0x111111);
            mat.emissiveIntensity = isOn ? 1.5 : 0.05;
          } else if (dev.kind === 'tv') {
            mat.emissive.set(isOn ? 0x60a5fa : 0x0a0f1d);
            mat.emissiveIntensity = isOn ? 1.4 : 0.1;
          } else if (dev.kind === 'coffee') {
            mat.emissive.set(isOn ? 0x10b981 : 0x222222);
            mat.emissiveIntensity = isOn ? 1.2 : 0.1;
          }
        }
      }
    });
  }, [devices]);

  // Handle Day/Night lighting mode toggle
  useEffect(() => {
    if (hemiLightRef.current && sunLightRef.current) {
      if (isNightMode) {
        hemiLightRef.current.intensity = 0.35;
        sunLightRef.current.intensity = 0.35;
        sunLightRef.current.color.setHex(0x93c5fd); // cool moonlight
      } else {
        hemiLightRef.current.intensity = 0.85;
        sunLightRef.current.intensity = 1.7;
        sunLightRef.current.color.setHex(0xffedd5); // warm sunlight
      }
    }
  }, [isNightMode]);

  // Camera presets
  const handleSetView = (view: 'iso' | 'living' | 'bedroom' | 'kitchen' | 'top') => {
    setActiveCameraView(view);
    if (view === 'iso') {
      targetCamPosRef.current = new THREE.Vector3(12, 11, 13);
      targetLookAtRef.current = new THREE.Vector3(0, 0.5, 0);
    } else if (view === 'living') {
      targetCamPosRef.current = new THREE.Vector3(-3.2, 5.5, 7.5);
      targetLookAtRef.current = new THREE.Vector3(-2.8, 1.2, 0);
    } else if (view === 'bedroom') {
      targetCamPosRef.current = new THREE.Vector3(3.2, 5.5, 4.5);
      targetLookAtRef.current = new THREE.Vector3(2.8, 1.2, -1.8);
    } else if (view === 'kitchen') {
      targetCamPosRef.current = new THREE.Vector3(3.5, 5.5, 8.5);
      targetLookAtRef.current = new THREE.Vector3(2.8, 1.2, 2.2);
    } else if (view === 'top') {
      targetCamPosRef.current = new THREE.Vector3(0, 19, 0.01);
      targetLookAtRef.current = new THREE.Vector3(0, 0, 0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0C1017] flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top Header Badge (HUD) */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex items-center justify-between">
        <div className="pointer-events-auto bg-[#121620]/90 border border-slate-800 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs">
            3D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                {lang === 'uz' ? 'SmartHome 3D Raqamli Dvigatel' : '3D Цифровой Двойник Дома'}
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono">
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {lang === 'uz' ? 'Jami yuklama:' : 'Нагрузка:'} <strong className="text-blue-400">{totalWatts} W</strong>
            </p>
          </div>
        </div>

        {/* Hovered Device Tooltip */}
        {hoveredDevice && (
          <div className="pointer-events-auto bg-blue-950/90 border border-blue-500/50 px-3.5 py-1.5 rounded-xl shadow-lg text-xs font-medium text-blue-200">
            {lang === 'uz' ? 'Bosish orqali yoqish/o\'chirish' : 'Нажмите для переключения'}: <span className="font-semibold text-white">{hoveredDevice}</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="pointer-events-auto p-2.5 bg-[#121620]/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-2xl shadow-xl transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Ergonomic Collapsible Bottom Control Dock (< 15% viewport footprint) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-[920px] pointer-events-none flex flex-col items-center">
        {/* Dock Collapse / Expand Tab */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="pointer-events-auto mb-2 px-3 py-1 rounded-full bg-[#161B26] border border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1.5 shadow-lg transition"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>{lang === 'uz' ? 'Boshqaruv panelini ko\'rsatish' : 'Показать панель'}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>{lang === 'uz' ? 'Paneli yashirish (Cinema Mode)' : 'Скрыть панель'}</span>
            </>
          )}
        </button>

        {/* Consolidated Horizontal Control Bar */}
        {!isDockCollapsed && (
          <div className="pointer-events-auto w-full bg-[#121620] border border-slate-800 rounded-2xl p-3 shadow-2xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Camera Views Pill */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] uppercase font-semibold text-slate-500 px-2 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-blue-400" />
                  {lang === 'uz' ? 'Kamera' : 'Вид'}:
                </span>
                <button
                  onClick={() => handleSetView('iso')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeCameraView === 'iso' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'uz' ? 'Izometriya' : 'Изометрия'}
                </button>
                <button
                  onClick={() => handleSetView('living')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeCameraView === 'living' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'uz' ? 'Mehmonxona' : 'Гостиная'}
                </button>
                <button
                  onClick={() => handleSetView('bedroom')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeCameraView === 'bedroom' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'uz' ? 'Yotoqxona' : 'Спальня'}
                </button>
                <button
                  onClick={() => handleSetView('kitchen')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeCameraView === 'kitchen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'uz' ? 'Oshxona' : 'Кухня'}
                </button>
                <button
                  onClick={() => handleSetView('top')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    activeCameraView === 'top' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'uz' ? 'Tepadan' : 'Сверху'}
                </button>
              </div>

              {/* Day / Night Environment Toggle */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setIsNightMode(false)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                    !isNightMode ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>{lang === 'uz' ? 'Kunduz' : 'День'}</span>
                </button>
                <button
                  onClick={() => setIsNightMode(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                    isNightMode ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>{lang === 'uz' ? 'Oqshom' : 'Ночь'}</span>
                </button>
              </div>
            </div>

            {/* Quick Actions Scene Row inside 3D dock */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs overflow-x-auto">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                {lang === 'uz' ? 'Bir tegish stsenariylari:' : 'Быстрые сценарии:'}
              </span>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => onRunQuickAction('all_off')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-200 text-xs font-medium transition"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{lang === 'uz' ? "Barchasi O'chiq" : 'Выключить всё'}</span>
                </button>

                <button
                  onClick={() => onRunQuickAction('evening')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/50 text-blue-200 text-xs font-medium transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'uz' ? 'Oqshom rejimi' : 'Вечерний режим'}</span>
                </button>

                <button
                  onClick={() => onRunQuickAction('good_night')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 text-indigo-200 text-xs font-medium transition"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>{lang === 'uz' ? 'Xayrli tun' : 'Спокойной ночи'}</span>
                </button>

                <button
                  onClick={() => onRunQuickAction('morning')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-200 text-xs font-medium transition"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>{lang === 'uz' ? 'Ertalab' : 'Утро'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// PROCEDURAL 3D SMART HOME GENERATION HELPER
// ==========================================
function buildSmartHome(
  scene: THREE.Scene,
  clickableMap: Map<string, THREE.Object3D>,
  lightMap: Map<string, { light: THREE.PointLight | THREE.SpotLight; mesh?: THREE.Mesh }>,
  isSoftwareGl: boolean
) {
  // Shared materials & procedural textures
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1e2638,
    roughness: 0.85,
    metalness: 0.1,
  });

  const wallTrimMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.4,
  });

  const woodFloorMat = new THREE.MeshStandardMaterial({
    color: 0x241d19,
    roughness: 0.6,
    metalness: 0.15,
  });

  const tileFloorMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.4,
    metalness: 0.3,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.8,
  });

  // Base Foundation Slab for the whole apartment
  const foundationGeo = new THREE.BoxGeometry(11.4, 0.4, 9.4);
  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0x111622,
    roughness: 0.9,
    metalness: 0.2,
  });
  const foundation = new THREE.Mesh(foundationGeo, foundationMat);
  foundation.position.set(0, 0.2, 0);
  foundation.receiveShadow = !isSoftwareGl;
  scene.add(foundation);

  // ------------------------------------------
  // ROOM 1: LIVING ROOM (Mehmonxona, -2.7, 0)
  // ------------------------------------------
  const livingGroup = new THREE.Group();
  livingGroup.position.set(-2.7, 0.4, 0);

  // Parquet Floor
  const livingFloorGeo = new THREE.BoxGeometry(5.4, 0.05, 8.8);
  const livingFloor = new THREE.Mesh(livingFloorGeo, woodFloorMat);
  livingFloor.position.set(0, 0.025, 0);
  livingFloor.receiveShadow = !isSoftwareGl;
  livingGroup.add(livingFloor);

  // Architectural Low Half-Walls with Beveled Trim (0.8m height)
  addWall(livingGroup, 5.4, 0.8, 0.2, 0, 0.4, -4.3, wallMat, wallTrimMat, isSoftwareGl); // back wall
  addWall(livingGroup, 0.2, 0.8, 8.8, -2.6, 0.4, 0, wallMat, wallTrimMat, isSoftwareGl); // left wall
  addWall(livingGroup, 5.4, 0.8, 0.2, 0, 0.4, 4.3, wallMat, wallTrimMat, isSoftwareGl); // front wall

  // Multi-part Sectional Sofa (Group with 6 parts)
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(-1.2, 0, 0.6);

  const sofaFabMat = new THREE.MeshStandardMaterial({ color: 0x2b384e, roughness: 0.8, metalness: 0.1 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7, metalness: 0.1 });

  // Main cushion base
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 1.2), sofaFabMat);
  sofaBase.position.set(0, 0.2, 0);
  sofaBase.castShadow = !isSoftwareGl;
  sofaGroup.add(sofaBase);

  // Backrest
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.3), sofaFabMat);
  sofaBack.position.set(0, 0.55, -0.45);
  sofaBack.castShadow = !isSoftwareGl;
  sofaGroup.add(sofaBack);

  // Armrests
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 1.2), sofaFabMat);
  armL.position.set(-1.05, 0.4, 0);
  sofaGroup.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 1.2), sofaFabMat);
  armR.position.set(1.05, 0.4, 0);
  sofaGroup.add(armR);

  // Pillows
  const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.15), cushionMat);
  pillow1.position.set(-0.6, 0.5, -0.3);
  pillow1.rotation.y = 0.1;
  sofaGroup.add(pillow1);
  const pillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.15), cushionMat);
  pillow2.position.set(0.6, 0.5, -0.3);
  pillow2.rotation.y = -0.1;
  sofaGroup.add(pillow2);

  livingGroup.add(sofaGroup);

  // Coffee Table
  const tableGroup = new THREE.Group();
  tableGroup.position.set(-1.2, 0, -0.7);
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.7), new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.3, metalness: 0.7 }));
  tableTop.position.set(0, 0.35, 0);
  tableTop.castShadow = !isSoftwareGl;
  tableGroup.add(tableTop);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
  [[-0.6, -0.28], [0.6, -0.28], [-0.6, 0.28], [0.6, 0.28]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35), legMat);
    leg.position.set(lx, 0.175, lz);
    tableGroup.add(leg);
  });
  livingGroup.add(tableGroup);

  // Living Room TV & Console Unit (`living-tv`)
  const tvUnitGroup = new THREE.Group();
  tvUnitGroup.position.set(-1.2, 0, -3.8);
  tvUnitGroup.userData = { deviceId: 'living-tv' };

  // Credenza cabinet
  const credenza = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: 0x1f293d, roughness: 0.7, metalness: 0.2 }));
  credenza.position.set(0, 0.25, 0);
  credenza.castShadow = !isSoftwareGl;
  tvUnitGroup.add(credenza);

  // TV Screen panel & frame
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 0.06), new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.2, metalness: 0.9 }));
  tvFrame.position.set(0, 1.2, 0);
  tvFrame.castShadow = !isSoftwareGl;
  tvUnitGroup.add(tvFrame);

  const tvScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.05),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x60a5fa, emissiveIntensity: 0.1, roughness: 0.2 })
  );
  tvScreen.position.set(0, 1.2, 0.035);
  tvUnitGroup.add(tvScreen);

  livingGroup.add(tvUnitGroup);
  clickableMap.set('living-tv', tvUnitGroup);

  // Living Room Floor Arc Lamp (`living-light`)
  const lampGroup = new THREE.Group();
  lampGroup.position.set(1.4, 0, -2.4);
  lampGroup.userData = { deviceId: 'living-light' };

  // Base
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 }));
  lampBase.position.set(0, 0.04, 0);
  lampGroup.add(lampBase);

  // Pole
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 12), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 }));
  lampPole.position.set(0, 1.1, 0);
  lampGroup.add(lampPole);

  // Shade
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 0.35, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4, side: THREE.DoubleSide }));
  lampShade.position.set(0, 2.1, 0);
  lampGroup.add(lampShade);

  // Lightbulb mesh
  const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d6, emissiveIntensity: 1.5 }));
  bulbMesh.position.set(0, 2.05, 0);
  lampGroup.add(bulbMesh);

  // Real Three.js PointLight
  const livingPointLight = new THREE.PointLight(0xffedd5, 1.6, 7.5, 1.8);
  livingPointLight.position.set(0, 2.0, 0);
  livingPointLight.castShadow = !isSoftwareGl;
  lampGroup.add(livingPointLight);

  livingGroup.add(lampGroup);
  clickableMap.set('living-light', lampGroup);
  lightMap.set('living-light', { light: livingPointLight, mesh: bulbMesh });
  lightMap.set('living-tv', { light: livingPointLight, mesh: tvScreen });

  scene.add(livingGroup);

  // ------------------------------------------
  // ROOM 2: BEDROOM (Yotoqxona, 2.7, -2.1)
  // ------------------------------------------
  const bedroomGroup = new THREE.Group();
  bedroomGroup.position.set(2.7, 0.4, -2.1);

  // Floor
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.05, 4.4), woodFloorMat);
  bedFloor.position.set(0, 0.025, 0);
  bedFloor.receiveShadow = !isSoftwareGl;
  bedroomGroup.add(bedFloor);

  // Perimeter walls
  addWall(bedroomGroup, 5.4, 0.8, 0.2, 0, 0.4, -2.1, wallMat, wallTrimMat, isSoftwareGl); // back
  addWall(bedroomGroup, 0.2, 0.8, 4.4, 2.6, 0.4, 0, wallMat, wallTrimMat, isSoftwareGl); // right
  addWall(bedroomGroup, 5.4, 0.8, 0.2, 0, 0.4, 2.1, wallMat, wallTrimMat, isSoftwareGl); // divider to kitchen

  // Double Bed composite model
  const bedGroup = new THREE.Group();
  bedGroup.position.set(0.3, 0, -0.4);

  // Wooden frame
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 2.3), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.2 }));
  bedFrame.position.set(0, 0.2, 0);
  bedFrame.castShadow = !isSoftwareGl;
  bedGroup.add(bedFrame);

  // Headboard
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.2), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 }));
  headboard.position.set(0, 0.6, -1.05);
  bedGroup.add(headboard);

  // Mattress & Duvet
  const duvet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 2.0), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));
  duvet.position.set(0, 0.4, 0.1);
  bedGroup.add(duvet);

  // Pillows
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.45), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 }));
  p1.position.set(-0.55, 0.55, -0.65);
  bedGroup.add(p1);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.45), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 }));
  p2.position.set(0.55, 0.55, -0.65);
  bedGroup.add(p2);

  bedroomGroup.add(bedGroup);

  // Nightstand & Bedside Lamp (`bedroom-light`)
  const nightstandGroup = new THREE.Group();
  nightstandGroup.position.set(-1.25, 0, -1.35);
  nightstandGroup.userData = { deviceId: 'bedroom-light' };

  // Table
  const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.48, 0.65), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
  nightstand.position.set(0, 0.24, 0);
  nightstand.castShadow = !isSoftwareGl;
  nightstandGroup.add(nightstand);

  // Night Lamp
  const nBulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef3c7, emissiveIntensity: 1.4 }));
  nBulb.position.set(0, 0.72, 0);
  nightstandGroup.add(nBulb);

  const nShade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.25, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xfef3c7, side: THREE.DoubleSide }));
  nShade.position.set(0, 0.72, 0);
  nightstandGroup.add(nShade);

  const bedroomPointLight = new THREE.PointLight(0xfef3c7, 1.4, 6.0, 1.8);
  bedroomPointLight.position.set(0, 0.75, 0);
  bedroomPointLight.castShadow = !isSoftwareGl;
  nightstandGroup.add(bedroomPointLight);

  bedroomGroup.add(nightstandGroup);
  clickableMap.set('bedroom-light', nightstandGroup);
  lightMap.set('bedroom-light', { light: bedroomPointLight, mesh: nBulb });

  scene.add(bedroomGroup);

  // ------------------------------------------
  // ROOM 3: KITCHEN (Oshxona, 2.7, 2.2)
  // ------------------------------------------
  const kitchenGroup = new THREE.Group();
  kitchenGroup.position.set(2.7, 0.4, 2.2);

  // Tiled Floor
  const kitchenFloor = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.05, 4.4), tileFloorMat);
  kitchenFloor.position.set(0, 0.025, 0);
  kitchenFloor.receiveShadow = !isSoftwareGl;
  kitchenGroup.add(kitchenFloor);

  // Walls
  addWall(kitchenGroup, 0.2, 0.8, 4.4, 2.6, 0.4, 0, wallMat, wallTrimMat, isSoftwareGl); // right
  addWall(kitchenGroup, 5.4, 0.8, 0.2, 0, 0.4, 2.1, wallMat, wallTrimMat, isSoftwareGl); // front

  // Kitchen Island Counter
  const islandGroup = new THREE.Group();
  islandGroup.position.set(0.1, 0, 0.2);

  const islandBody = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 1.2), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 }));
  islandBody.position.set(0, 0.425, 0);
  islandBody.castShadow = !isSoftwareGl;
  islandGroup.add(islandBody);

  const marbleTop = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 1.35), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.2 }));
  marbleTop.position.set(0, 0.88, 0);
  marbleTop.castShadow = !isSoftwareGl;
  islandGroup.add(marbleTop);

  // Coffee Machine on Counter (`kitchen-coffee`)
  const coffeeGroup = new THREE.Group();
  coffeeGroup.position.set(0.8, 0.92, -0.2);
  coffeeGroup.userData = { deviceId: 'kitchen-coffee' };

  const coffeeBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 }));
  coffeeBody.position.set(0, 0.2, 0);
  coffeeGroup.add(coffeeBody);

  const coffeeLED = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.2 }));
  coffeeLED.position.set(0, 0.35, 0.18);
  coffeeGroup.add(coffeeLED);

  islandGroup.add(coffeeGroup);
  clickableMap.set('kitchen-coffee', coffeeGroup);

  // Iron on Ironing station (`kitchen-iron`)
  const ironGroup = new THREE.Group();
  ironGroup.position.set(-0.8, 0.92, 0.1);
  ironGroup.userData = { deviceId: 'kitchen-iron' };

  const ironMesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 8), new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.6 }));
  ironMesh.rotation.z = Math.PI / 2;
  ironMesh.position.set(0, 0.08, 0);
  ironGroup.add(ironMesh);

  islandGroup.add(ironGroup);
  clickableMap.set('kitchen-iron', ironGroup);

  kitchenGroup.add(islandGroup);

  // Refrigerator (`kitchen-fridge`, essential appliance)
  const fridgeGroup = new THREE.Group();
  fridgeGroup.position.set(2.0, 0, -1.2);
  fridgeGroup.userData = { deviceId: 'kitchen-fridge' };

  const fridgeBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.9, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.85 })
  );
  fridgeBody.position.set(0, 0.95, 0);
  fridgeBody.castShadow = !isSoftwareGl;
  fridgeGroup.add(fridgeBody);

  // Fridge handles
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
  const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), handleMat);
  h1.position.set(-0.35, 1.1, 0.4);
  fridgeGroup.add(h1);
  const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), handleMat);
  h2.position.set(-0.35, 0.5, 0.4);
  fridgeGroup.add(h2);

  kitchenGroup.add(fridgeGroup);
  clickableMap.set('kitchen-fridge', fridgeGroup);

  // Kitchen Pendant Ceiling Lamp (`kitchen-light`)
  const kitchenLampGroup = new THREE.Group();
  kitchenLampGroup.position.set(0.1, 0, 0.2);
  kitchenLampGroup.userData = { deviceId: 'kitchen-light' };

  const kBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d6, emissiveIntensity: 1.5 }));
  kBulb.position.set(0, 2.3, 0);
  kitchenLampGroup.add(kBulb);

  const kShade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.35, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide }));
  kShade.position.set(0, 2.45, 0);
  kitchenLampGroup.add(kShade);

  const kitchenPointLight = new THREE.PointLight(0xffedd5, 1.6, 7.5, 1.8);
  kitchenPointLight.position.set(0, 2.2, 0);
  kitchenPointLight.castShadow = !isSoftwareGl;
  kitchenLampGroup.add(kitchenPointLight);

  kitchenGroup.add(kitchenLampGroup);
  clickableMap.set('kitchen-light', kitchenLampGroup);
  lightMap.set('kitchen-light', { light: kitchenPointLight, mesh: kBulb });
  lightMap.set('kitchen-coffee', { light: kitchenPointLight, mesh: coffeeLED });

  scene.add(kitchenGroup);
}

// Helper to add clean architectural walls with trim
function addWall(
  parent: THREE.Group,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  wallMat: THREE.Material,
  trimMat: THREE.Material,
  isSoftwareGl: boolean
) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  wall.position.set(x, y, z);
  wall.receiveShadow = !isSoftwareGl;
  wall.castShadow = !isSoftwareGl;
  parent.add(wall);

  // Top beveled trim
  const trim = new THREE.Mesh(new THREE.BoxGeometry(width * 1.01, 0.06, depth * 1.05), trimMat);
  trim.position.set(x, y + height / 2 + 0.03, z);
  parent.add(trim);
}
