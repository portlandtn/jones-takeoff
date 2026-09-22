import {roofGeometry} from './engine.mjs';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

export function createViewer(container) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true }); }
  catch { container.textContent = '3D preview is unavailable in this browser. All takeoff calculations remain available.'; return {update(){},setRotate(){},reset(){}}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#142638');
  const camera = new THREE.PerspectiveCamera(35, 1, .01, 10000);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping = true; controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed = .65; controls.maxPolarAngle = Math.PI*.48;
  scene.add(new THREE.HemisphereLight(0xffffff,0x687b90,2.6));
  const light = new THREE.DirectionalLight(0xffffff,2.5); light.position.set(-80,140,100);scene.add(light);
  let model = new THREE.Group(); scene.add(model); let scale=100, center=12;
  const material = color => new THREE.MeshStandardMaterial({color,roughness:.72,metalness:.2,side:THREE.DoubleSide});
  const line = (points,color='#597a92') => {const obj=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));model.add(obj);return obj;};
  const face = (points,color) => {
    const geom=new THREE.BufferGeometry(); const vertices=[];
    for(let i=1;i<points.length-1;i++) vertices.push(...points[0],...points[i],...points[i+1]);
    geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom,material(color));model.add(mesh);return mesh;
  };
  function reset(){camera.position.set(scale*.9,center+scale*.7,scale*1.15);controls.target.set(0,center,0);controls.update();}
  function update(job, result={}) {
    scene.remove(model); model.traverse(o=>{o.geometry?.dispose();if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map?.dispose();m.dispose();});});model=new THREE.Group();scene.add(model);
    const l=job.length/12,w=job.width/12,h=job.height/12,s=job.slope/12;
    const g=job.shape==='gable',geo=roofGeometry(job),rise=geo.rise/12,ridge=geo.ridgeFromFront/12;
    const height=x=>!g||x<=ridge?h+x*s:geo.backHeight/12+(w-x)*geo.slopes[1]/12;
    const wallColor=job.wallColor||'#bfced8',roofColor=job.roofColor||'#365973';
    // Surface coordinates follow left-to-right as viewed from outside each wall.
    const map={left:(u,v)=>[u-w/2,v,l/2],right:(u,v)=>[w/2-u,v,-l/2],front:(u,v)=>[-w/2,v,u-l/2],back:(u,v)=>[w/2,v,l/2-u]};
    for(const wall of ['front','back','left','right']) {
      const width=(wall==='left'||wall==='right')?w:l;
      const top=u=>wall==='left'?height(u):wall==='right'?height(w-u):wall==='front'?h:height(w);
      const openings=(job.openings||[]).filter(o=>o.wall===wall).map(o=>({x:o.offset/12,y:o.sill/12,w:o.width/12,h:o.height/12,type:o.type}));
      const cuts=[0,width,...openings.flatMap(o=>[o.x,o.x+o.w])];if(g&&(wall==='left'||wall==='right'))cuts.push(wall==='right'?w-ridge:ridge);
      cuts.sort((a,b)=>a-b);
      for(let i=0;i<cuts.length-1;i++) {
        const a=cuts[i],b=cuts[i+1];if(b-a<.001)continue;
        const holes=openings.filter(o=>o.x<(a+b)/2&&o.x+o.w>(a+b)/2).sort((a,b)=>a.y-b.y);
        let bottom=0;
        for(const hole of holes){if(hole.y>bottom)face([map[wall](a,bottom),map[wall](b,bottom),map[wall](b,hole.y),map[wall](a,hole.y)],wallColor);bottom=hole.y+hole.h;}
        if(Math.min(top(a),top(b))>bottom)face([map[wall](a,bottom),map[wall](b,bottom),map[wall](b,top(b)),map[wall](a,top(a))],wallColor);
      }
      // Panel seams are clipped around every visible opening.
      const step=3; for(let u=step;u<width;u+=step){const holes=openings.filter(o=>u>o.x&&u<o.x+o.w).sort((a,b)=>a.y-b.y);let base=0;for(const hole of holes){if(hole.y>base)line([map[wall](u,base),map[wall](u,hole.y)],'#a0b3c1');base=hole.y+hole.h;}if(base<top(u))line([map[wall](u,base),map[wall](u,top(u))],'#a0b3c1');}
      for(const o of openings){const p=[map[wall](o.x,o.y),map[wall](o.x+o.w,o.y),map[wall](o.x+o.w,o.y+o.h),map[wall](o.x,o.y+o.h)];face(p,o.type==='window'?'#487b99':'#5b7386');line([...p,p[0]],'#e7b36a');if(o.type==='overhead')for(let y=o.y+2;y<o.y+o.h;y+=2)line([map[wall](o.x,y),map[wall](o.x+o.w,y)],'#8da4b6');}
    }
    const point=(x,z)=>[x-w/2,height(x),z];
    const roof= g?[[0,ridge],[ridge,w]]:[[0,w]];
    for(const [a,b] of roof){const f=face([point(a,-l/2),point(a,l/2),point(b,l/2),point(b,-l/2)],roofColor);if(job.showPurlins){f.material.transparent=true;f.material.opacity=.45;}line([point(a,-l/2),point(a,l/2),point(b,l/2),point(b,-l/2),point(a,-l/2)],'#244257');}
    const coverage=({r:36,ss360:24,loc:16,locSwaged:16}[job.roofPanel]||36)/12;
    for(let z=-l/2+coverage;z<l/2;z+=coverage)for(const [a,b] of roof)line([[a-w/2,height(a)+.025,z],[b-w/2,height(b)+.025,z]],'#7892a6');
    if(job.showPurlins&&result.purlins) result.purlins.forEach((rows,side)=>rows.forEach(d=>{const along=d/12;const run=along/Math.sqrt(1+(geo.slopes[side]/12)**2);const x=g?(side===0?ridge-run:ridge+run):w-run;line([[x-w/2,height(x)+.08,-l/2],[x-w/2,height(x)+.08,l/2]],'#efab47');}));
    const slab=new THREE.Mesh(new THREE.BoxGeometry(w+1,.3,l+1),material('#a5b6c3'));slab.position.y=-.16;model.add(slab);
    const grid=new THREE.GridHelper(Math.max(l,w)*2.5,25,0x38536b,0x233d52);grid.position.y=-.33;model.add(grid);
    for(const [text,x,z] of [['FRONT SIDE WALL',-w/2-5,0],['BACK SIDE WALL',w/2+5,0],['LEFT END WALL',0,l/2+5],['RIGHT END WALL',0,-l/2-5]]){
      const c=document.createElement('canvas');c.width=512;c.height=70;const ctx=c.getContext('2d');ctx.fillStyle='#13293dda';ctx.fillRect(0,0,512,70);ctx.fillStyle='#d3e7f5';ctx.font='500 27px system-ui';ctx.textAlign='center';ctx.fillText(text,256,45);
      const texture=new THREE.CanvasTexture(c);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));const size=Math.max(l,w)*.18;sprite.scale.set(size,size*70/512,1);sprite.position.set(x,.7,z);model.add(sprite);
    }
    const old=scale;scale=Math.max(l,w,h+rise)*1.4;center=(h+rise)*.4;
    controls.target.set(0,center,0); if(Math.abs(old-scale)>scale*.15||!update.initialized){reset();update.initialized=true;}
    container.setAttribute('aria-label',`${l} by ${w} foot ${g?'gable':'single slope'} building, ${h} foot low eave, ${job.slope}:12 roof. ${(job.openings||[]).length} openings.`);
  }
  new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();if(width&&height){renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}}).observe(container);
  let last=0;renderer.setAnimationLoop(t=>{const dt=Math.min((t-last)/1000,.05);last=t;controls.update(dt);renderer.render(scene,camera);});
  return { update, reset, setRotate(value){controls.autoRotate=value;} };
}
