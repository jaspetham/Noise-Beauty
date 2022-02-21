import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import vertex from './shaders/vertex.glsl'
import fragment from './shaders/fragment.glsl'
import vertex1 from './shaders/vertex1.glsl'
import fragment1 from './shaders/fragment1.glsl'
import * as dat from 'dat.gui';
// import gsap from 'gsap';

import {DotScreenShader} from './CustomShaders.js'
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'


export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();

    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xeeeeee, 1); 
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );

    // var frustumSize = 10;
    // var aspect = window.innerWidth / window.innerHeight;
    // this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
    this.camera.position.set(0, 0, 1.3);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = 0;

    this.isPlaying = true;
    
    this.addObjects();
    this.initPost();
    this.resize();
    this.render();
    this.setupResize();
    // this.settings();
  }

  initPost(){
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene,this.camera));

    const effect1 = new ShaderPass(DotScreenShader);
    effect1.uniforms['scale'].value = 4;
    this.composer.addPass(effect1);
  }

  settings() {
    let that = this;
    this.settings = {
      progress: 0,
      mRefractionRatio: 0.6,
      mFresnelBias: 0.84,
      mFresnelScale: 1.75,
      mFresnelPower: 0.77,
    };
    this.gui = new dat.GUI();
    // this.gui.add(this.settings, "progress", 0, 1, 0.01);
    this.gui.add(this.settings, "mRefractionRatio", 0, 3, 0.01).onChange(() =>{
      this.mat.uniforms.mRefractionRatio.value = this.settings.mRefractionRatio
    });
    this.gui.add(this.settings, "mFresnelBias", 0, 3, 0.01).onChange(() =>{
      this.mat.uniforms.mFresnelBias.value = this.settings.mFresnelBias
    });
    this.gui.add(this.settings, "mFresnelScale", 0, 3, 0.01).onChange(() =>{
      this.mat.uniforms.mFresnelScale.value = this.settings.mFresnelScale
    });
    this.gui.add(this.settings, "mFresnelPower", 0, 3, 0.01).onChange(() =>{
      this.mat.uniforms.mFresnelPower.value = this.settings.mFresnelPower
    });
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    
    this.camera.updateProjectionMatrix();
  }

  addObjects() {
    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256,{
      format:THREE.RGBAFormat,
      generateMipmaps:true,
      minFilter: THREE.LinearMipMapLinearFilter,
      encoding:THREE.sRGBEncoding
    })

    this.cubeCamera = new THREE.CubeCamera(.1,10,this.cubeRenderTarget)

    let that = this;
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: "f", value: 0 },
        resolution: { type: "v4", value: new THREE.Vector4() },
        uvRate1: {
          value: new THREE.Vector2(1, 1)
        }
      },
      vertexShader: vertex,
      fragmentShader: fragment
    });
    
    this.geometry = new THREE.SphereBufferGeometry(1.5, 32,32);

    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.plane);

    let geo = new THREE.SphereBufferGeometry(0.4,32,32)
    this.mat = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: "f", value: 0 },
        tCube: {value:0},
        mRefractionRatio: {value: 1.2},
        mFresnelBias: {value: 0.1},
        mFresnelScale: {value: 4.0},
        mFresnelPower: {value: 2.},
      },
      vertexShader: vertex1,
      fragmentShader: fragment1
    });
    this.smallSphere = new THREE.Mesh(geo,this.mat);
    this.smallSphere.position.set(0.3,0.2,0.7);
    this.scene.add(this.smallSphere)
  }

  stop() {
    this.isPlaying = false;
  }

  play() {
    if(!this.isPlaying){
      this.render()
      this.isPlaying = true;
    }
  }

  render() {
    if (!this.isPlaying) return;
    this.time += 0.01;
    this.smallSphere.visible = false;
    this.cubeCamera.update(this.renderer,this.scene);
    this.smallSphere.visible = true;
    this.mat.uniforms.tCube.value = this.cubeRenderTarget.texture;

    this.material.uniforms.time.value = this.time;
    requestAnimationFrame(this.render.bind(this));
    // this.renderer.render(this.scene, this.camera);
    this.composer.render(this.scene, this.camera);
  }
}

new Sketch({
  dom: document.getElementById("container")
});

