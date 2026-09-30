import assert from 'node:assert/strict';
import { InertialRotor } from '../rotor.js';

const rotor=new InertialRotor();
rotor.step(0);rotor.step(30);assert(rotor.angle>0,'Idle globe should rotate');
rotor.enter();const hoveredAngle=rotor.angle;
assert.equal(rotor.step(60),'paused');assert.equal(rotor.angle,hoveredAngle,'Hover should immediately freeze the globe');
rotor.begin();rotor.drag(.4,.02);assert(rotor.angle>hoveredAngle,'Dragging moves the globe directly');
rotor.release(80);assert.equal(rotor.step(90),'coasting');
let state;
for(let t=100;t<=4000;t+=20)state=rotor.step(t);
assert.equal(state,'auto','A flick should decay then resume while the pointer stays still over the globe');
rotor.begin();rotor.drag(.4,.02);rotor.release(4020);rotor.leave();rotor.enter();
assert.equal(rotor.step(4040),'paused','Entering during a coast stops inertia');
rotor.reduced=true;rotor.leave();const still=rotor.angle;
rotor.step(4060);assert.equal(rotor.angle,still,'Reduced motion disables automatic rotation');
rotor.begin();rotor.drag(.2,.1);rotor.release(4100);
assert.equal(rotor.velocity,0,'Reduced motion disables momentum, while allowing manual positioning');
function simulate(step){const r=new InertialRotor();r.velocity=4;r.step(0);for(let t=step;t<=1000+.001;t+=step)r.step(t);return r.angle;}
assert(Math.abs(simulate(1000/60)-simulate(1000/120))<.01,'Coast should be refresh-rate independent');
console.log('Rotor: idle, hover stop, drag, coast, idle resume, reduced motion, and refresh-rate independence passed.');
