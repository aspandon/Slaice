import{r as N,j as nt}from"./react-BSyyv8QX.js";import{J as at}from"./index-BgwzB7Jv.js";import"./icons-DnMcxnvQ.js";import"./radix-CS6Aj44R.js";import"./vendor-C9Z-7UvD.js";const it=(()=>{try{return localStorage.getItem("slaice.liveSea")==="force"||localStorage.getItem("slaice.rainGlass")==="force"}catch{return!1}})(),v={desktop:{fps:30,ratio:.75,maxRatio:1.25,budget:15e5,drops:220,dropDensity:170,mist:320,mistDensity:250,film:360,trail:110,rate:16,size:1},mobile:{fps:24,ratio:.6,maxRatio:1.1,budget:48e4,drops:70,dropDensity:210,mist:110,mistDensity:330,film:140,trail:40,rate:14,size:.85}},st=350,lt=12,ct=24,ft=1e3,j=8,He=6,dt=3.1,C=1/Math.SQRT1_2,Ye=2,Te=0,O=1,ye=2,je=`#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aBox;   // centre x, y, half width, half height (CSS px)
layout(location = 2) in vec4 aInfo;  // film?, weight, radius (CSS px), -
uniform vec2 uView;
out vec2 vQ;
out vec3 vInfo;
void main() {
  vec2 p = aBox.xy + aCorner * aBox.zw;
  vQ = aCorner;
  vInfo = aInfo.xyz;
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}`,ut=`#version 300 es
precision mediump float;
in vec2 vQ;
in vec3 vInfo;
out vec4 o;
void main() {
  float q2 = dot(vQ, vQ);
  if (q2 >= 1.0) discard;
  float k = 1.0 - q2;
  k *= k;
  if (vInfo.x > 0.5) o = vec4(0.0, k * vInfo.y, 0.0, 0.0);
  else o = vec4(k * vInfo.y, 0.0, k * vInfo.y * vInfo.z / 16.0, 0.0);
}`,ht=`#version 300 es
precision highp float;
uniform sampler2D uField;
uniform vec2 uTexel;     // one field texel in uv (the field matches the canvas)
uniform float uCss;      // CSS px per field texel
uniform float uNight;    // 0 day … 1 night
out vec4 o;

const float T = 0.25;    // the drop's outline in the field
float height(float f) { return sqrt(max(f - T, 0.0) / (1.0 - T)); }
// Premultiplied "over": a layer of colour c at opacity a on top of acc.
vec4 over(vec4 acc, vec3 c, float a) { return vec4(c * a + acc.rgb * (1.0 - a), a + acc.a * (1.0 - a)); }

void main() {
  vec2 vUv = gl_FragCoord.xy * uTexel;
  vec4 F = texture(uField, vUv);
  float f = F.r;
  if (f < T * 0.55 && F.g < 0.02) { o = vec4(0.0); return; }

  vec4 acc = vec4(0.0);
  // The wet film a runner leaves: a faint streak, slightly darker, catching a little light.
  float film = smoothstep(0.04, 0.55, F.g) * (1.0 - smoothstep(T * 0.6, T, f));
  acc = over(acc, vec3(0.1, 0.16, 0.22), film * 0.06);

  if (f > T * 0.55) {
    float aa = max(fwidth(f), 1e-3) * 0.75;
    float m = smoothstep(T - aa, T + aa, f);
    float size = clamp(F.b / max(F.r, 1e-3) * 16.0, 0.6, 16.0);
    float hx = height(texture(uField, vUv + vec2(uTexel.x, 0.0)).r) - height(texture(uField, vUv - vec2(uTexel.x, 0.0)).r);
    float hy = height(texture(uField, vUv + vec2(0.0, uTexel.y)).r) - height(texture(uField, vUv - vec2(0.0, uTexel.y)).r);
    // Slope in drop radii (shape-invariant: a small bead is as round as a big one).
    vec2 g = vec2(hx, hy) / (2.0 * uCss) * size * 2.3;
    vec3 n = normalize(vec3(-g, 1.0));
    float edge = 1.0 - n.z;                 // 0 at the centre, → 1 at the rim
    float lower = smoothstep(0.02, 0.75, -n.y);
    float upper = smoothstep(-0.1, 0.7, n.y);

    vec3 sky = mix(vec3(0.88, 0.94, 1.0), vec3(0.5, 0.58, 0.72), uNight);
    vec3 shade = mix(vec3(0.03, 0.07, 0.12), vec3(0.01, 0.02, 0.05), uNight);
    vec3 hl = mix(vec3(1.0), vec3(1.0, 0.88, 0.7), uNight * 0.7);
    float light = 1.0 - 0.45 * uNight;

    vec4 d = vec4(0.0);
    // The lens flips the world: the dark ground shows in its upper half, the bright
    // sky in its lower half — a soft vertical grade through the body.
    float v = clamp(-n.y * 2.4, -1.0, 1.0);
    d = over(d, sky, 0.1 + 0.05 * edge);
    d = over(d, shade, max(-v, 0.0) * 0.16);
    d = over(d, sky, max(v, 0.0) * 0.32 * light);
    // The sky's glow gathered in a bright crescent just inside the lower rim.
    float glow = lower * smoothstep(0.08, 0.35, edge) * (1.0 - smoothstep(0.55, 0.85, edge));
    d = over(d, sky, glow * 0.65 * light);
    // The dark refracting rim, heavier on top where the lens shows the dark ground.
    float rim = smoothstep(0.38, 0.8, edge) * (0.5 + 0.5 * upper);
    d = over(d, shade, rim * 0.72);
    // A darker band just under the top highlight: the depth of the lens.
    d = over(d, shade, upper * smoothstep(0.15, 0.5, edge) * (1.0 - rim) * 0.16);
    // Highlights from a light up and to the left: a broad sheen and a sharp glint.
    vec3 L = normalize(vec3(-0.38, 0.62, 0.72));
    float ndh = max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0);
    float sheen = pow(ndh, 18.0) * 0.45;
    float glint = smoothstep(0.935, 0.985, ndh);
    d = over(d, hl, clamp((sheen + glint) * light, 0.0, 1.0));

    acc = d * m + acc * (1.0 - d.a * m);
  }
  o = acc;
}`;function We(s,g,k){const w=s.createShader(s.VERTEX_SHADER),_=s.createShader(s.FRAGMENT_SHADER),p=s.createProgram();return!w||!_||!p?null:(s.shaderSource(w,g),s.compileShader(w),s.shaderSource(_,k),s.compileShader(_),s.attachShader(p,w),s.attachShader(p,_),s.linkProgram(p),{prog:p,vs:w,fs:_})}function Qe(s,g){const k=!!s.getProgramParameter(g.prog,s.LINK_STATUS);return s.deleteShader(g.vs),s.deleteShader(g.fs),k}const h=Math.random,V=s=>s*s*s,Re=s=>Math.cbrt(Math.max(0,s));function Et({visible:s,night:g,tier:k,onFail:w}){const _=N.useRef(null),p=N.useRef({visible:s,night:g,tier:k});p.current={visible:s,night:g,tier:k};const Ae=N.useRef(w);Ae.current=w;const re=N.useRef(()=>{});return N.useEffect(()=>{const M=_.current;if(!M)return;const f=document.createElement("canvas");f.className="absolute inset-0 w-full h-full",M.appendChild(f);let W=!1;const oe=()=>{W||Ae.current()},e=f.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1,powerPreference:"low-power",failIfMajorPerformanceCaveat:!it}),ne=e==null?void 0:e.getExtension("KHR_parallel_shader_compile"),ae=e&&We(e,je,ut),ie=e&&We(e,je,ht);if(!e||!ae||!ie){f.remove(),oe();return}const Q=ae.prog,L=ie.prog,se=e.createVertexArray();e.bindVertexArray(se);const Fe=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,Fe),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);const be=v.desktop.drops*2+v.desktop.mist+v.desktop.trail+v.desktop.film,E=new Float32Array(be*j),le=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,le),e.bufferData(e.ARRAY_BUFFER,E.byteLength,e.DYNAMIC_DRAW),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,4,e.FLOAT,!1,j*4,0),e.vertexAttribDivisor(1,1),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,4,e.FLOAT,!1,j*4,16),e.vertexAttribDivisor(2,1),e.bindVertexArray(null);const Ke=!!e.getExtension("EXT_color_buffer_float"),K=e.createTexture(),ce=e.createFramebuffer(),Je=(r,i)=>{e.bindTexture(e.TEXTURE_2D,K),Ke?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,r,i,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,r,i,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,ce),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,K,0),e.bindFramebuffer(e.FRAMEBUFFER,null)};let we=!1,_e=null,Me=null,Le=null,De=null,Se=null,ke=null;const $e=()=>ne&&(!e.getProgramParameter(Q,ne.COMPLETION_STATUS_KHR)||!e.getProgramParameter(L,ne.COMPLETION_STATUS_KHR))?!1:!Qe(e,ae)||!Qe(e,ie)?"fail":(_e=e.getUniformLocation(Q,"uView"),Me=e.getUniformLocation(L,"uView"),Le=e.getUniformLocation(L,"uField"),De=e.getUniformLocation(L,"uTexel"),Se=e.getUniformLocation(L,"uCss"),ke=e.getUniformLocation(L,"uNight"),!0),Ze=at();let T=p.current.tier,y=1,R=1,fe=1,X=1,Ie=!1,I=!0,D=0,z=-1,U=-1e9,Ue=0,G=0,de=1/0,q=0,H=0,ue=0,Pe=0,he=!1,J=!1,P=0,me=0,ve=0,$=p.current.night;const u=[],S=new Float32Array(v.desktop.film*4);let Y=0,Z=0;const et=()=>{const r=v[T],i=y*R/1e6;return{drops:Math.round(Math.min(r.drops,r.dropDensity*i)*X),mist:Math.round(Math.min(r.mist,r.mistDensity*i)*X)}},pe=()=>{const r=M.getBoundingClientRect();y=Math.max(1,r.width),R=Math.max(1,r.height);const i=v[T],a=Math.min((window.devicePixelRatio||1)*i.ratio,i.maxRatio)*fe;let o=Math.max(1,Math.round(y*a)),n=Math.max(1,Math.round(R*a));const l=o*n/i.budget;l>1&&(o=Math.max(1,Math.round(o/Math.sqrt(l))),n=Math.max(1,Math.round(n/Math.sqrt(l)))),(f.width!==o||f.height!==n)&&(f.width=o,f.height=n,Je(o,n)),I=!1},Be=r=>{const i=u.pop();i&&r<u.length&&(u[r]=i)},tt=(r,i,a)=>{const o=v[T].film,n=Y*4;S[n]=r,S[n+1]=i,S[n+2]=a,S[n+3]=P,Y=(Y+1)%o,Z=Math.min(o,Z+1)},Ne=(r,i)=>{const a={x:h()*y,y:h()*R,r:i,vx:0,vy:0,born:P,kind:r,slide:!1,stall:0,travel:0,gap:0,film:0,dead:!1};if(r===Te)for(let o=u.length-1;o>=0;o--){const n=u[o],l=n.x-a.x,c=n.y-a.y,m=a.r+n.r;if(l*l+c*c>m*m)continue;if(n.kind===O){Be(o);continue}const F=V(a.r),x=V(n.r);a.x=(a.x*F+n.x*x)/(F+x),a.y=(a.y*F+n.y*x)/(F+x),a.r=Re(F+x),a.born=Math.min(a.born,n.born+.2),Be(o)}u.push(a)},Ce=(r,i)=>{P+=r;const a=v[T],o=et();let n=0,l=0,c=0;for(const d of u)d.kind===O?l++:d.kind===ye?c++:n++;const m=Math.round(a.trail*X);for(me+=r*a.rate*(y*R/1e6);me>=1;)me-=1,n<o.drops&&(Ne(Te,a.size*(2.1+6.4*Math.pow(h(),2.6))),n++);for(ve+=r*60*(y*R/1e6);ve>=1;)ve-=1,l<o.mist&&(Ne(O,.9+1.1*h()),l++);const F=u.length;for(let d=0;d<F;d++){const t=u[d];if(t.dead)continue;if(t.kind===ye&&(t.r-=r*.11,t.r<.7)){t.dead=!0;continue}if(!t.slide){!i&&t.kind!==O&&t.r>He&&h()<r*(t.r-He)*.12&&(t.slide=!0,t.vy=0,t.kind=Te,t.travel=0,t.gap=t.r*(2+h()*3));continue}if(t.stall>0){t.stall-=r;continue}const ot=340*Math.min(1.25,Math.max(.18,(t.r-2.6)/7));t.vy=Math.min(t.vy+ot*r,55+t.r*26),h()<r*1.1*Math.max(.15,1-t.r/13)&&(t.stall=.06+h()*.3,t.vy*=.25),h()<r*2.2&&(t.vx=(h()-.5)*34),t.vx*=1-r*.8;const ge=t.vy*r;if(t.y+=ge,t.x+=t.vx*r,t.travel+=ge,t.film+=ge,t.film>Math.max(2.5,t.r*.55)&&(t.film=0,tt(t.x,t.y-t.r*.5,t.r*.72)),t.travel>t.gap&&c<m){c++,t.travel=0,t.gap=t.r*(1.6+h()*4.5);const B=t.r*(.14+.24*Math.pow(h(),1.5));t.r=Re(V(t.r)-V(B)),u.push({x:t.x+(h()-.5)*t.r*.9,y:t.y-t.r*1.1,r:B,vx:0,vy:0,born:P-1,kind:ye,slide:!1,stall:0,travel:0,gap:0,film:0,dead:!1})}for(let B=0;B<u.length;B++){const b=u[B];if(b===t||b.dead)continue;const Ge=b.x-t.x,Ee=b.y-t.y,qe=b.kind===O?t.r*1.25:(t.r+b.r)*.82;Ge*Ge+Ee*Ee>qe*qe||Ee<-t.r*.6||(b.kind!==O&&(t.r=Re(V(t.r)+V(b.r)),t.vy+=12),b.dead=!0)}if(t.y-t.r*2>R){t.dead=!0;continue}t.r<dt&&(t.slide=!1)}let x=0;he=!1;for(const d of u)d.dead||(u[x++]=d,d.slide&&(he=!0));u.length=x},Oe=()=>{let r=0;const i=(o,n,l,c,m,F,x)=>{if(r>=be)return;const d=r*j;E[d]=o,E[d+1]=n,E[d+2]=l,E[d+3]=c,E[d+4]=m,E[d+5]=F,E[d+6]=x,r++},a=v[T].film;for(let o=0;o<Z;o++){const n=(Y-1-o+a)%a*4,l=P-S[n+3];if(l>Ye)continue;const c=S[n+2]*1.1;i(S[n],S[n+1],c,c*1.6,1,(1-l/Ye)*.5,c)}for(const o of u){const n=Math.min(1,(P-o.born)/.14),l=o.r*(.45+.55*(1-(1-n)*(1-n)));if(o.slide){const c=o.stall>0?.15:Math.min(1,o.vy/200),m=l*(.5+.12*c);i(o.x,o.y,l*C,l*(1+.08*c)*C,0,1,l),i(o.x-o.vx*.02,o.y-l*(.75+.75*c),m*C,m*(1.3+.9*c)*C,0,.9,l)}else i(o.x,o.y,l*C,l*C,0,1,l)}return e.bindFramebuffer(e.FRAMEBUFFER,ce),e.viewport(0,0,f.width,f.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),r&&(e.useProgram(Q),e.uniform2f(_e,y,R),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE),e.bindVertexArray(se),e.bindBuffer(e.ARRAY_BUFFER,le),e.bufferSubData(e.ARRAY_BUFFER,0,E,0,r*j),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,r),e.disable(e.BLEND)),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,f.width,f.height),e.clear(e.COLOR_BUFFER_BIT),r&&(e.useProgram(L),e.uniform2f(Me,y,R),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,K),e.uniform1i(Le,0),e.uniform2f(De,1/f.width,1/f.height),e.uniform1f(Se,y/f.width),e.uniform1f(ke,$),e.enable(e.BLEND),e.blendEquation(e.MAX),e.blendFunc(e.ONE,e.ONE),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,r),e.blendEquation(e.FUNC_ADD),e.disable(e.BLEND)),e.bindVertexArray(null),r},xe=()=>{M.style.opacity=p.current.visible?"1":"0"},A=()=>{!D&&!W&&!document.hidden&&(D=requestAnimationFrame(rt))},ee=Ze,rt=r=>{if(D=0,W||e.isContextLost())return;if(!we){const m=$e();if(m==="fail")return oe();if(!m)return A();we=!0,U=r-1e3}const i=z<0?0:r-z;z=r;const a=p.current;if(a.tier!==T&&(T=a.tier,I=!0,Y=0,Z=0),$+=(a.night-$)*.1,ee||Ie){I&&pe(),Oe(),J||(J=!0,xe()),Math.abs(a.night-$)>.005&&A();return}if(r<Ue)return z=-1,U=Math.max(U,r-1e3/v[T].fps),A();i>0&&(de=Math.min(de,i),G=G?G*.92+i*.08:i,q=G>Math.max(ct,de*1.6)?q+1:Math.max(0,q-2),q>45&&(q=0,G=0,H++,H===1?X=.6:H===2?(X=.4,fe=.7,I=!0):H===3?(fe=.5,I=!0):Ie=!0,M.dataset.level=String(H)));const o=1e3/(he?v[T].fps:lt);if(r-U<o-2)return A();const n=Math.min(.1,(r-U)/1e3);U=r,I&&pe();const l=performance.now();Ce(n,!1);const c=Oe();ue=ue*.95+(performance.now()-l)*.05,r-Pe>1e3&&(Pe=r,M.dataset.cpuMs=ue.toFixed(3),M.dataset.quads=String(c)),J||(J=!0,xe()),A()};pe();for(let r=0;r<(ee?360:240);r++)Ce(1/30,ee);if(ee)for(const r of u)r.born=P-1;re.current=()=>{xe(),A()};const Ve=new ResizeObserver(()=>{I=!0,A()});Ve.observe(M);const te=()=>{Ue=performance.now()+st};window.addEventListener("pointerdown",te,{capture:!0,passive:!0}),window.addEventListener("keydown",te,{capture:!0,passive:!0});const Xe=()=>{cancelAnimationFrame(D),D=0,z=-1,document.hidden||(U=performance.now(),A())};document.addEventListener("visibilitychange",Xe);const ze=r=>{r.preventDefault(),cancelAnimationFrame(D),D=0,oe()};return f.addEventListener("webglcontextlost",ze),A(),()=>{var r;W=!0,cancelAnimationFrame(D),re.current=()=>{},Ve.disconnect(),window.removeEventListener("pointerdown",te,{capture:!0}),window.removeEventListener("keydown",te,{capture:!0}),document.removeEventListener("visibilitychange",Xe),f.removeEventListener("webglcontextlost",ze),e.deleteProgram(Q),e.deleteProgram(L),e.deleteBuffer(Fe),e.deleteBuffer(le),e.deleteTexture(K),e.deleteFramebuffer(ce),e.deleteVertexArray(se),(r=e.getExtension("WEBGL_lose_context"))==null||r.loseContext(),f.remove()}},[]),N.useEffect(()=>{re.current()},[s,g,k]),nt.jsx("div",{ref:_,"aria-hidden":"true","data-rain-glass":"",className:"pointer-events-none fixed inset-0 z-[26] select-none",style:{opacity:0,transition:`opacity ${ft}ms ease`}})}export{Et as default};
