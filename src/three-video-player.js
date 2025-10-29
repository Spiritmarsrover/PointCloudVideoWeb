import * as THREE from 'three';
import PlayButtonAlpha from './play_button_alpha.jpg';

let started = false;
let textureOut;
export class THREEVideoPlayer extends THREE.Mesh {
  constructor(options = {}) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    super(geometry, material);

    this.state = 'NOSOURCE';
    this.options = options;
    this.video = document.createElement('video');
    this.video.style.display = 'none';
    this.video.preload = 'auto';
    this.video.playsInline = true;
    this.video.muted = options.muted ?? false;
    this.video.autoplay = options.autoplay ?? false;
    this.video.loop = options.loop ?? false;
    if (options.volume !== undefined) this.setVolume(options.volume);
    document.body.appendChild(this.video);

    // Play button
    // this.playButton = new THREE.Mesh(
    //   new THREE.PlaneGeometry(0.6, 0.6),
    //   new THREE.MeshBasicMaterial({
    //     color: options.play_btn_color ?? 0xC1C1C0,
    //     alphaMap: new THREE.TextureLoader().load(PlayButtonAlpha),
    //     transparent: true,
    //     alphaTest: .3,

    //   })
    // );
    //this.playButton.position.z = 0.001;
    //this.playButton.visible = false;
    //this.add(this.playButton);

    // Event hooks
    //this.video.onpause = () => (this.playButton.visible = true);
    //this.video.onended = () => (this.playButton.visible = true);
    //this.video.onplay = () => (this.playButton.visible = false);
    this.video.oncanplay = () => this._onReady();
    //this.playButton.visible = false;
    // Set source if provided
    if (options.source) this.setSource(options.source);

    
  }

  _onReady() {
    this.geometry.dispose();
    const aspect = this.video.videoWidth / this.video.videoHeight || 1;
    this.geometry = new THREE.PlaneGeometry(aspect, 1);
    const texture = new THREE.VideoTexture(this.video);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.material.map = texture;
    this.material.needsUpdate = true;
    if(!started){
      //this.playButton.visible = true;
    }
    started = true;
    //this.playButton.visible = true;
    this.state = 'READY';
    //this.playButton.visible = false;
  }

  setSource(src) {
    if (typeof src !== 'string') throw new Error('Source must be a string.');
    this.clearSource();

    const sourceElem = document.createElement('source');
    sourceElem.src = src;
    sourceElem.type = 'video/mp4';
    this.video.appendChild(sourceElem);
    this.state = 'LOADING';
    this.video.load();
    started = false;
  }

  clearSource() {
    while (this.video.firstChild) {
      this.video.removeChild(this.video.firstChild);
    }
    this.material.map = null;
    this.material.needsUpdate = true;
    this.state = 'NOSOURCE';
  }

  play() {
    if (this.state === 'READY') this.video.play();
  }

  pause() {
    if (this.state === 'READY') this.video.pause();
  }

  canPlay() {
    return this.state === 'READY';
  }

  isPaused() {
    return this.video?.paused ?? true;
  }

  setMuted(v) {
    this.video.muted = Boolean(v);
  }

  isMuted() {
    return this.video.muted;
  }

  setAutoplay(v) {
    this.video.autoplay = Boolean(v);
  }

  isAutoplay() {
    return this.video.autoplay;
  }

  setLoop(v) {
    this.video.loop = Boolean(v);
  }

  isLoop() {
    return this.video.loop;
  }

  setVolume(v) {
    this.video.volume = Math.min(1, Math.max(0, v));
  }

  getVolume() {
    return this.video.volume;
  }

  setScrub(s){
    let PUASE = false;
    if(this.isPaused){
      PUASE = true;
    }else{
      PUASE= false;
    }
    this.video.currentTime = (s*this.video.duration);
    if(PUASE){
      this.pause;
    }else{
      this.play;
      //this.playButton.visible = false
    }
    //this.playButton.visible = false;
  }
  
  getTimeNorm(){
    return this.video.currentTime/this.video.duration;
  }

  getTexture(){
    return this.material.map;
  }
}
