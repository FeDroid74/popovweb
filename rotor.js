// Time-based inertia: the result is independent of display refresh rate.
export class InertialRotor {
  constructor(){this.angle=0;this.velocity=0;this.last=null;this.hovered=false;this.dragging=false;this.focused=false;this.pinned=false;this.reduced=false;this.resumeHovered=false;this.resumeAt=0;}
  enter(){this.hovered=true;this.resumeHovered=false;this.velocity=0;}
  leave(){this.hovered=false;}
  begin(){this.dragging=true;this.velocity=0;this.focused=false;}
  drag(delta,seconds){this.angle+=delta;this.velocity=Math.max(-14,Math.min(14,delta/Math.max(.008,seconds)));}
  release(now){this.dragging=false;this.resumeHovered=true;this.resumeAt=now+1200;if(this.reduced)this.velocity=0;}
  step(now){
    const dt=this.last===null?0:Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;
    if(this.dragging)return 'dragging';
    if(this.reduced||this.pinned||this.focused){this.velocity=0;return 'paused';}
    if(Math.abs(this.velocity)>.04){
      const decay=Math.exp(-3.2*dt);
      this.angle+=this.velocity*(1-decay)/3.2;
      this.velocity*=decay;
      if(Math.abs(this.velocity)<=.04){this.velocity=0;this.resumeAt=now+900;}
      return 'coasting';
    }
    if(this.hovered&&(!this.resumeHovered||now<this.resumeAt))return 'paused';
    this.angle+=.32*dt;
    return 'auto';
  }
}
