import{r as vn,j as sl}from"./react-BSyyv8QX.js";/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const ks="184",al=0,ma=1,ol=2,Qi=1,ll=2,Si=3,wn=0,At=1,un=2,fn=0,si=1,_a=2,ga=3,xa=4,cl=5,Nn=100,ul=101,fl=102,hl=103,dl=104,pl=200,ml=201,_l=202,gl=203,Jr=204,Qr=205,xl=206,vl=207,Sl=208,Ml=209,El=210,Tl=211,bl=212,yl=213,Al=214,es=0,ts=1,ns=2,oi=3,is=4,rs=5,ss=6,as=7,mo=0,Rl=1,wl=2,Jt=0,_o=1,go=2,xo=3,vo=4,So=5,Mo=6,Eo=7,To=300,zn=301,li=302,vr=303,Sr=304,hr=306,os=1e3,Zt=1001,ls=1002,vt=1003,Cl=1004,Pi=1005,xt=1006,Mr=1007,On=1008,Dt=1009,bo=1010,yo=1011,Ti=1012,Ws=1013,en=1014,$t=1015,pn=1016,Xs=1017,qs=1018,bi=1020,Ao=35902,Ro=35899,wo=1021,Co=1022,Vt=1023,mn=1026,Bn=1027,Ys=1028,Ks=1029,Gn=1030,Zs=1031,$s=1033,er=33776,tr=33777,nr=33778,ir=33779,cs=35840,us=35841,fs=35842,hs=35843,ds=36196,ps=37492,ms=37496,_s=37488,gs=37489,sr=37490,xs=37491,vs=37808,Ss=37809,Ms=37810,Es=37811,Ts=37812,bs=37813,ys=37814,As=37815,Rs=37816,ws=37817,Cs=37818,Ps=37819,Ds=37820,Ls=37821,Us=36492,Is=36494,Ns=36495,Fs=36283,Os=36284,ar=36285,Bs=36286,Pl=3200,va=0,Dl=1,An="",Nt="srgb",or="srgb-linear",lr="linear",Xe="srgb",Xn=7680,Sa=519,Ll=512,Ul=513,Il=514,js=515,Nl=516,Fl=517,Js=518,Ol=519,Ma=35044,Ea="300 es",jt=2e3,cr=2001;function Bl(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function ur(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function zl(){const i=ur("canvas");return i.style.display="block",i}const Ta={};function ba(...i){const e="THREE."+i.shift();console.log(e,...i)}function Po(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ae(...i){i=Po(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function ke(...i){i=Po(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function zs(...i){const e=i.join(" ");e in Ta||(Ta[e]=!0,Ae(...i))}function Gl(i,e,t){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}const Vl={[es]:ts,[ns]:ss,[is]:as,[oi]:rs,[ts]:es,[ss]:ns,[as]:is,[rs]:oi};class Hn{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const r=n[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const Mt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Er=Math.PI/180,Gs=180/Math.PI;function yi(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Mt[i&255]+Mt[i>>8&255]+Mt[i>>16&255]+Mt[i>>24&255]+"-"+Mt[e&255]+Mt[e>>8&255]+"-"+Mt[e>>16&15|64]+Mt[e>>24&255]+"-"+Mt[t&63|128]+Mt[t>>8&255]+"-"+Mt[t>>16&255]+Mt[t>>24&255]+Mt[n&255]+Mt[n>>8&255]+Mt[n>>16&255]+Mt[n>>24&255]).toLowerCase()}function Ge(i,e,t){return Math.max(e,Math.min(t,i))}function Hl(i,e){return(i%e+e)%e}function Tr(i,e,t){return(1-t)*i+t*e}function di(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function yt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const na=class na{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ge(this.x,e.x,t.x),this.y=Ge(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ge(this.x,e,t),this.y=Ge(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ge(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ge(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*r+e.x,this.y=s*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};na.prototype.isVector2=!0;let qe=na;class fi{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,s,a,o){let c=n[r+0],l=n[r+1],h=n[r+2],p=n[r+3],u=s[a+0],_=s[a+1],v=s[a+2],E=s[a+3];if(p!==E||c!==u||l!==_||h!==v){let d=c*u+l*_+h*v+p*E;d<0&&(u=-u,_=-_,v=-v,E=-E,d=-d);let f=1-o;if(d<.9995){const M=Math.acos(d),y=Math.sin(M);f=Math.sin(f*M)/y,o=Math.sin(o*M)/y,c=c*f+u*o,l=l*f+_*o,h=h*f+v*o,p=p*f+E*o}else{c=c*f+u*o,l=l*f+_*o,h=h*f+v*o,p=p*f+E*o;const M=1/Math.sqrt(c*c+l*l+h*h+p*p);c*=M,l*=M,h*=M,p*=M}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=p}static multiplyQuaternionsFlat(e,t,n,r,s,a){const o=n[r],c=n[r+1],l=n[r+2],h=n[r+3],p=s[a],u=s[a+1],_=s[a+2],v=s[a+3];return e[t]=o*v+h*p+c*_-l*u,e[t+1]=c*v+h*u+l*p-o*_,e[t+2]=l*v+h*_+o*u-c*p,e[t+3]=h*v-o*p-c*u-l*_,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(r/2),p=o(s/2),u=c(n/2),_=c(r/2),v=c(s/2);switch(a){case"XYZ":this._x=u*h*p+l*_*v,this._y=l*_*p-u*h*v,this._z=l*h*v+u*_*p,this._w=l*h*p-u*_*v;break;case"YXZ":this._x=u*h*p+l*_*v,this._y=l*_*p-u*h*v,this._z=l*h*v-u*_*p,this._w=l*h*p+u*_*v;break;case"ZXY":this._x=u*h*p-l*_*v,this._y=l*_*p+u*h*v,this._z=l*h*v+u*_*p,this._w=l*h*p-u*_*v;break;case"ZYX":this._x=u*h*p-l*_*v,this._y=l*_*p+u*h*v,this._z=l*h*v-u*_*p,this._w=l*h*p+u*_*v;break;case"YZX":this._x=u*h*p+l*_*v,this._y=l*_*p+u*h*v,this._z=l*h*v-u*_*p,this._w=l*h*p-u*_*v;break;case"XZY":this._x=u*h*p-l*_*v,this._y=l*_*p-u*h*v,this._z=l*h*v+u*_*p,this._w=l*h*p+u*_*v;break;default:Ae("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],s=t[8],a=t[1],o=t[5],c=t[9],l=t[2],h=t[6],p=t[10],u=n+o+p;if(u>0){const _=.5/Math.sqrt(u+1);this._w=.25/_,this._x=(h-c)*_,this._y=(s-l)*_,this._z=(a-r)*_}else if(n>o&&n>p){const _=2*Math.sqrt(1+n-o-p);this._w=(h-c)/_,this._x=.25*_,this._y=(r+a)/_,this._z=(s+l)/_}else if(o>p){const _=2*Math.sqrt(1+o-n-p);this._w=(s-l)/_,this._x=(r+a)/_,this._y=.25*_,this._z=(c+h)/_}else{const _=2*Math.sqrt(1+p-n-o);this._w=(a-r)/_,this._x=(s+l)/_,this._y=(c+h)/_,this._z=.25*_}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ge(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,s=e._z,a=e._w,o=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+a*o+r*l-s*c,this._y=r*h+a*c+s*o-n*l,this._z=s*h+a*l+n*c-r*o,this._w=a*h-n*o-r*c-s*l,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,s=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,s=-s,a=-a,o=-o);let c=1-t;if(o<.9995){const l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,t=Math.sin(t*l)/h,this._x=this._x*c+n*t,this._y=this._y*c+r*t,this._z=this._z*c+s*t,this._w=this._w*c+a*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+r*t,this._z=this._z*c+s*t,this._w=this._w*c+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const ia=class ia{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ya.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ya.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*r,this.y=s[1]*t+s[4]*n+s[7]*r,this.z=s[2]*t+s[5]*n+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,s=e.x,a=e.y,o=e.z,c=e.w,l=2*(a*r-o*n),h=2*(o*t-s*r),p=2*(s*n-a*t);return this.x=t+c*l+a*p-o*h,this.y=n+c*h+o*l-s*p,this.z=r+c*p+s*h-a*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r,this.y=s[1]*t+s[5]*n+s[9]*r,this.z=s[2]*t+s[6]*n+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ge(this.x,e.x,t.x),this.y=Ge(this.y,e.y,t.y),this.z=Ge(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ge(this.x,e,t),this.y=Ge(this.y,e,t),this.z=Ge(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ge(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,s=e.z,a=t.x,o=t.y,c=t.z;return this.x=r*c-s*o,this.y=s*a-n*c,this.z=n*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return br.copy(this).projectOnVector(e),this.sub(br)}reflect(e){return this.sub(br.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ge(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};ia.prototype.isVector3=!0;let B=ia;const br=new B,ya=new fi,ra=class ra{constructor(e,t,n,r,s,a,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l)}set(e,t,n,r,s,a,o,c,l){const h=this.elements;return h[0]=e,h[1]=r,h[2]=o,h[3]=t,h[4]=s,h[5]=c,h[6]=n,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],h=n[4],p=n[7],u=n[2],_=n[5],v=n[8],E=r[0],d=r[3],f=r[6],M=r[1],y=r[4],b=r[7],P=r[2],T=r[5],D=r[8];return s[0]=a*E+o*M+c*P,s[3]=a*d+o*y+c*T,s[6]=a*f+o*b+c*D,s[1]=l*E+h*M+p*P,s[4]=l*d+h*y+p*T,s[7]=l*f+h*b+p*D,s[2]=u*E+_*M+v*P,s[5]=u*d+_*y+v*T,s[8]=u*f+_*b+v*D,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8];return t*a*h-t*o*l-n*s*h+n*o*c+r*s*l-r*a*c}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],p=h*a-o*l,u=o*c-h*s,_=l*s-a*c,v=t*p+n*u+r*_;if(v===0)return this.set(0,0,0,0,0,0,0,0,0);const E=1/v;return e[0]=p*E,e[1]=(r*l-h*n)*E,e[2]=(o*n-r*a)*E,e[3]=u*E,e[4]=(h*t-r*c)*E,e[5]=(r*s-o*t)*E,e[6]=_*E,e[7]=(n*c-l*t)*E,e[8]=(a*t-n*s)*E,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,s,a,o){const c=Math.cos(s),l=Math.sin(s);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-r*l,r*c,-r*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(yr.makeScale(e,t)),this}rotate(e){return this.premultiply(yr.makeRotation(-e)),this}translate(e,t){return this.premultiply(yr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};ra.prototype.isMatrix3=!0;let Ce=ra;const yr=new Ce,Aa=new Ce().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ra=new Ce().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function kl(){const i={enabled:!0,workingColorSpace:or,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===Xe&&(r.r=hn(r.r),r.g=hn(r.g),r.b=hn(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===Xe&&(r.r=ai(r.r),r.g=ai(r.g),r.b=ai(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===An?lr:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return zs("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return zs("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(r,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[or]:{primaries:e,whitePoint:n,transfer:lr,toXYZ:Aa,fromXYZ:Ra,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Nt},outputColorSpaceConfig:{drawingBufferColorSpace:Nt}},[Nt]:{primaries:e,whitePoint:n,transfer:Xe,toXYZ:Aa,fromXYZ:Ra,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Nt}}}),i}const ze=kl();function hn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function ai(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let qn;class Wl{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{qn===void 0&&(qn=ur("canvas")),qn.width=e.width,qn.height=e.height;const r=qn.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),n=qn}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ur("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=hn(s[a]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(hn(t[n]/255)*255):t[n]=hn(t[n]);return{data:t,width:e.width,height:e.height}}else return Ae("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Xl=0;class Qs{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Xl++}),this.uuid=yi(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(Ar(r[a].image)):s.push(Ar(r[a]))}else s=Ar(r);n.url=s}return t||(e.images[this.uuid]=n),n}}function Ar(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Wl.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ae("Texture: Unable to serialize Texture."),{})}let ql=0;const Rr=new B;class bt extends Hn{constructor(e=bt.DEFAULT_IMAGE,t=bt.DEFAULT_MAPPING,n=Zt,r=Zt,s=xt,a=On,o=Vt,c=Dt,l=bt.DEFAULT_ANISOTROPY,h=An){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:ql++}),this.uuid=yi(),this.name="",this.source=new Qs(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new qe(0,0),this.repeat=new qe(1,1),this.center=new qe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ce,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Rr).x}get height(){return this.source.getSize(Rr).y}get depth(){return this.source.getSize(Rr).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){Ae(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){Ae(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==To)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case os:e.x=e.x-Math.floor(e.x);break;case Zt:e.x=e.x<0?0:1;break;case ls:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case os:e.y=e.y-Math.floor(e.y);break;case Zt:e.y=e.y<0?0:1;break;case ls:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}bt.DEFAULT_IMAGE=null;bt.DEFAULT_MAPPING=To;bt.DEFAULT_ANISOTROPY=1;const sa=class sa{constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,s;const c=e.elements,l=c[0],h=c[4],p=c[8],u=c[1],_=c[5],v=c[9],E=c[2],d=c[6],f=c[10];if(Math.abs(h-u)<.01&&Math.abs(p-E)<.01&&Math.abs(v-d)<.01){if(Math.abs(h+u)<.1&&Math.abs(p+E)<.1&&Math.abs(v+d)<.1&&Math.abs(l+_+f-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const y=(l+1)/2,b=(_+1)/2,P=(f+1)/2,T=(h+u)/4,D=(p+E)/4,x=(v+d)/4;return y>b&&y>P?y<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(y),r=T/n,s=D/n):b>P?b<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(b),n=T/r,s=x/r):P<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(P),n=D/s,r=x/s),this.set(n,r,s,t),this}let M=Math.sqrt((d-v)*(d-v)+(p-E)*(p-E)+(u-h)*(u-h));return Math.abs(M)<.001&&(M=1),this.x=(d-v)/M,this.y=(p-E)/M,this.z=(u-h)/M,this.w=Math.acos((l+_+f-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ge(this.x,e.x,t.x),this.y=Ge(this.y,e.y,t.y),this.z=Ge(this.z,e.z,t.z),this.w=Ge(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ge(this.x,e,t),this.y=Ge(this.y,e,t),this.z=Ge(this.z,e,t),this.w=Ge(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ge(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};sa.prototype.isVector4=!0;let ut=sa;class Yl extends Hn{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:xt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new ut(0,0,e,t),this.scissorTest=!1,this.viewport=new ut(0,0,e,t),this.textures=[];const r={width:e,height:t,depth:n.depth},s=new bt(r),a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:xt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new Qs(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Qt extends Yl{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Do extends bt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=vt,this.minFilter=vt,this.wrapR=Zt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Kl extends bt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=vt,this.minFilter=vt,this.wrapR=Zt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const fr=class fr{constructor(e,t,n,r,s,a,o,c,l,h,p,u,_,v,E,d){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l,h,p,u,_,v,E,d)}set(e,t,n,r,s,a,o,c,l,h,p,u,_,v,E,d){const f=this.elements;return f[0]=e,f[4]=t,f[8]=n,f[12]=r,f[1]=s,f[5]=a,f[9]=o,f[13]=c,f[2]=l,f[6]=h,f[10]=p,f[14]=u,f[3]=_,f[7]=v,f[11]=E,f[15]=d,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new fr().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();const t=this.elements,n=e.elements,r=1/Yn.setFromMatrixColumn(e,0).length(),s=1/Yn.setFromMatrixColumn(e,1).length(),a=1/Yn.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(r),l=Math.sin(r),h=Math.cos(s),p=Math.sin(s);if(e.order==="XYZ"){const u=a*h,_=a*p,v=o*h,E=o*p;t[0]=c*h,t[4]=-c*p,t[8]=l,t[1]=_+v*l,t[5]=u-E*l,t[9]=-o*c,t[2]=E-u*l,t[6]=v+_*l,t[10]=a*c}else if(e.order==="YXZ"){const u=c*h,_=c*p,v=l*h,E=l*p;t[0]=u+E*o,t[4]=v*o-_,t[8]=a*l,t[1]=a*p,t[5]=a*h,t[9]=-o,t[2]=_*o-v,t[6]=E+u*o,t[10]=a*c}else if(e.order==="ZXY"){const u=c*h,_=c*p,v=l*h,E=l*p;t[0]=u-E*o,t[4]=-a*p,t[8]=v+_*o,t[1]=_+v*o,t[5]=a*h,t[9]=E-u*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){const u=a*h,_=a*p,v=o*h,E=o*p;t[0]=c*h,t[4]=v*l-_,t[8]=u*l+E,t[1]=c*p,t[5]=E*l+u,t[9]=_*l-v,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){const u=a*c,_=a*l,v=o*c,E=o*l;t[0]=c*h,t[4]=E-u*p,t[8]=v*p+_,t[1]=p,t[5]=a*h,t[9]=-o*h,t[2]=-l*h,t[6]=_*p+v,t[10]=u-E*p}else if(e.order==="XZY"){const u=a*c,_=a*l,v=o*c,E=o*l;t[0]=c*h,t[4]=-p,t[8]=l*h,t[1]=u*p+E,t[5]=a*h,t[9]=_*p-v,t[2]=v*p-_,t[6]=o*h,t[10]=E*p+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Zl,e,$l)}lookAt(e,t,n){const r=this.elements;return Ct.subVectors(e,t),Ct.lengthSq()===0&&(Ct.z=1),Ct.normalize(),Sn.crossVectors(n,Ct),Sn.lengthSq()===0&&(Math.abs(n.z)===1?Ct.x+=1e-4:Ct.z+=1e-4,Ct.normalize(),Sn.crossVectors(n,Ct)),Sn.normalize(),Di.crossVectors(Ct,Sn),r[0]=Sn.x,r[4]=Di.x,r[8]=Ct.x,r[1]=Sn.y,r[5]=Di.y,r[9]=Ct.y,r[2]=Sn.z,r[6]=Di.z,r[10]=Ct.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],h=n[1],p=n[5],u=n[9],_=n[13],v=n[2],E=n[6],d=n[10],f=n[14],M=n[3],y=n[7],b=n[11],P=n[15],T=r[0],D=r[4],x=r[8],A=r[12],I=r[1],R=r[5],z=r[9],W=r[13],X=r[2],U=r[6],G=r[10],V=r[14],$=r[3],Q=r[7],ce=r[11],xe=r[15];return s[0]=a*T+o*I+c*X+l*$,s[4]=a*D+o*R+c*U+l*Q,s[8]=a*x+o*z+c*G+l*ce,s[12]=a*A+o*W+c*V+l*xe,s[1]=h*T+p*I+u*X+_*$,s[5]=h*D+p*R+u*U+_*Q,s[9]=h*x+p*z+u*G+_*ce,s[13]=h*A+p*W+u*V+_*xe,s[2]=v*T+E*I+d*X+f*$,s[6]=v*D+E*R+d*U+f*Q,s[10]=v*x+E*z+d*G+f*ce,s[14]=v*A+E*W+d*V+f*xe,s[3]=M*T+y*I+b*X+P*$,s[7]=M*D+y*R+b*U+P*Q,s[11]=M*x+y*z+b*G+P*ce,s[15]=M*A+y*W+b*V+P*xe,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],s=e[12],a=e[1],o=e[5],c=e[9],l=e[13],h=e[2],p=e[6],u=e[10],_=e[14],v=e[3],E=e[7],d=e[11],f=e[15],M=c*_-l*u,y=o*_-l*p,b=o*u-c*p,P=a*_-l*h,T=a*u-c*h,D=a*p-o*h;return t*(E*M-d*y+f*b)-n*(v*M-d*P+f*T)+r*(v*y-E*P+f*D)-s*(v*b-E*T+d*D)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],p=e[9],u=e[10],_=e[11],v=e[12],E=e[13],d=e[14],f=e[15],M=t*o-n*a,y=t*c-r*a,b=t*l-s*a,P=n*c-r*o,T=n*l-s*o,D=r*l-s*c,x=h*E-p*v,A=h*d-u*v,I=h*f-_*v,R=p*d-u*E,z=p*f-_*E,W=u*f-_*d,X=M*W-y*z+b*R+P*I-T*A+D*x;if(X===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const U=1/X;return e[0]=(o*W-c*z+l*R)*U,e[1]=(r*z-n*W-s*R)*U,e[2]=(E*D-d*T+f*P)*U,e[3]=(u*T-p*D-_*P)*U,e[4]=(c*I-a*W-l*A)*U,e[5]=(t*W-r*I+s*A)*U,e[6]=(d*b-v*D-f*y)*U,e[7]=(h*D-u*b+_*y)*U,e[8]=(a*z-o*I+l*x)*U,e[9]=(n*I-t*z-s*x)*U,e[10]=(v*T-E*b+f*M)*U,e[11]=(p*b-h*T-_*M)*U,e[12]=(o*A-a*R-c*x)*U,e[13]=(t*R-n*A+r*x)*U,e[14]=(E*y-v*P-d*M)*U,e[15]=(h*P-p*y+u*M)*U,this}scale(e){const t=this.elements,n=e.x,r=e.y,s=e.z;return t[0]*=n,t[4]*=r,t[8]*=s,t[1]*=n,t[5]*=r,t[9]*=s,t[2]*=n,t[6]*=r,t[10]*=s,t[3]*=n,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),s=1-n,a=e.x,o=e.y,c=e.z,l=s*a,h=s*o;return this.set(l*a+n,l*o-r*c,l*c+r*o,0,l*o+r*c,h*o+n,h*c-r*a,0,l*c-r*o,h*c+r*a,s*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,s,a){return this.set(1,n,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,s=t._x,a=t._y,o=t._z,c=t._w,l=s+s,h=a+a,p=o+o,u=s*l,_=s*h,v=s*p,E=a*h,d=a*p,f=o*p,M=c*l,y=c*h,b=c*p,P=n.x,T=n.y,D=n.z;return r[0]=(1-(E+f))*P,r[1]=(_+b)*P,r[2]=(v-y)*P,r[3]=0,r[4]=(_-b)*T,r[5]=(1-(u+f))*T,r[6]=(d+M)*T,r[7]=0,r[8]=(v+y)*D,r[9]=(d-M)*D,r[10]=(1-(u+E))*D,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];const s=this.determinant();if(s===0)return n.set(1,1,1),t.identity(),this;let a=Yn.set(r[0],r[1],r[2]).length();const o=Yn.set(r[4],r[5],r[6]).length(),c=Yn.set(r[8],r[9],r[10]).length();s<0&&(a=-a),Ft.copy(this);const l=1/a,h=1/o,p=1/c;return Ft.elements[0]*=l,Ft.elements[1]*=l,Ft.elements[2]*=l,Ft.elements[4]*=h,Ft.elements[5]*=h,Ft.elements[6]*=h,Ft.elements[8]*=p,Ft.elements[9]*=p,Ft.elements[10]*=p,t.setFromRotationMatrix(Ft),n.x=a,n.y=o,n.z=c,this}makePerspective(e,t,n,r,s,a,o=jt,c=!1){const l=this.elements,h=2*s/(t-e),p=2*s/(n-r),u=(t+e)/(t-e),_=(n+r)/(n-r);let v,E;if(c)v=s/(a-s),E=a*s/(a-s);else if(o===jt)v=-(a+s)/(a-s),E=-2*a*s/(a-s);else if(o===cr)v=-a/(a-s),E=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=p,l[9]=_,l[13]=0,l[2]=0,l[6]=0,l[10]=v,l[14]=E,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,r,s,a,o=jt,c=!1){const l=this.elements,h=2/(t-e),p=2/(n-r),u=-(t+e)/(t-e),_=-(n+r)/(n-r);let v,E;if(c)v=1/(a-s),E=a/(a-s);else if(o===jt)v=-2/(a-s),E=-(a+s)/(a-s);else if(o===cr)v=-1/(a-s),E=-s/(a-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=u,l[1]=0,l[5]=p,l[9]=0,l[13]=_,l[2]=0,l[6]=0,l[10]=v,l[14]=E,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};fr.prototype.isMatrix4=!0;let pt=fr;const Yn=new B,Ft=new pt,Zl=new B(0,0,0),$l=new B(1,1,1),Sn=new B,Di=new B,Ct=new B,wa=new pt,Ca=new fi;class Vn{constructor(e=0,t=0,n=0,r=Vn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],c=r[1],l=r[5],h=r[9],p=r[2],u=r[6],_=r[10];switch(t){case"XYZ":this._y=Math.asin(Ge(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,_),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Ge(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,_),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-p,s),this._z=0);break;case"ZXY":this._x=Math.asin(Ge(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-p,_),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Ge(p,-1,1)),Math.abs(p)<.9999999?(this._x=Math.atan2(u,_),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Ge(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-p,s)):(this._x=0,this._y=Math.atan2(o,_));break;case"XZY":this._z=Math.asin(-Ge(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,_),this._y=0);break;default:Ae("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return wa.makeRotationFromQuaternion(e),this.setFromRotationMatrix(wa,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ca.setFromEuler(this),this.setFromQuaternion(Ca,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Vn.DEFAULT_ORDER="XYZ";class Lo{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let jl=0;const Pa=new B,Kn=new fi,sn=new pt,Li=new B,pi=new B,Jl=new B,Ql=new fi,Da=new B(1,0,0),La=new B(0,1,0),Ua=new B(0,0,1),Ia={type:"added"},ec={type:"removed"},Zn={type:"childadded",child:null},wr={type:"childremoved",child:null};class Lt extends Hn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:jl++}),this.uuid=yi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Lt.DEFAULT_UP.clone();const e=new B,t=new Vn,n=new fi,r=new B(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new pt},normalMatrix:{value:new Ce}}),this.matrix=new pt,this.matrixWorld=new pt,this.matrixAutoUpdate=Lt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Lt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Lo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Kn.setFromAxisAngle(e,t),this.quaternion.multiply(Kn),this}rotateOnWorldAxis(e,t){return Kn.setFromAxisAngle(e,t),this.quaternion.premultiply(Kn),this}rotateX(e){return this.rotateOnAxis(Da,e)}rotateY(e){return this.rotateOnAxis(La,e)}rotateZ(e){return this.rotateOnAxis(Ua,e)}translateOnAxis(e,t){return Pa.copy(e).applyQuaternion(this.quaternion),this.position.add(Pa.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Da,e)}translateY(e){return this.translateOnAxis(La,e)}translateZ(e){return this.translateOnAxis(Ua,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(sn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Li.copy(e):Li.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),pi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?sn.lookAt(pi,Li,this.up):sn.lookAt(Li,pi,this.up),this.quaternion.setFromRotationMatrix(sn),r&&(sn.extractRotation(r.matrixWorld),Kn.setFromRotationMatrix(sn),this.quaternion.premultiply(Kn.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(ke("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Ia),Zn.child=e,this.dispatchEvent(Zn),Zn.child=null):ke("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(ec),wr.child=e,this.dispatchEvent(wr),wr.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),sn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),sn.multiply(e.parent.matrixWorld)),e.applyMatrix4(sn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Ia),Zn.child=e,this.dispatchEvent(Zn),Zn.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pi,e,Jl),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pi,Ql,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,n=e.y,r=e.z,s=this.matrix.elements;s[12]+=t-s[0]*t-s[4]*n-s[8]*r,s[13]+=n-s[1]*t-s[5]*n-s[9]*r,s[14]+=r-s[2]*t-s[6]*n-s[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(o=>({...o})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const p=c[l];s(e.shapes,p)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(s(e.materials,this.material[c]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];r.animations.push(s(e.animations,c))}}if(t){const o=a(e.geometries),c=a(e.materials),l=a(e.textures),h=a(e.images),p=a(e.shapes),u=a(e.skeletons),_=a(e.animations),v=a(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),p.length>0&&(n.shapes=p),u.length>0&&(n.skeletons=u),_.length>0&&(n.animations=_),v.length>0&&(n.nodes=v)}return n.object=r,n;function a(o){const c=[];for(const l in o){const h=o[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}}Lt.DEFAULT_UP=new B(0,1,0);Lt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Lt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Ui extends Lt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const tc={type:"move"};class Cr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ui,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ui,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new B,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new B),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ui,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new B,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new B,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,s=null,a=null;const o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(const E of e.hand.values()){const d=t.getJointPose(E,n),f=this._getHandJoint(l,E);d!==null&&(f.matrix.fromArray(d.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=d.radius),f.visible=d!==null}const h=l.joints["index-finger-tip"],p=l.joints["thumb-tip"],u=h.position.distanceTo(p.position),_=.02,v=.005;l.inputState.pinching&&u>_+v?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&u<=_-v&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(tc)))}return o!==null&&(o.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Ui;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const Uo={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Mn={h:0,s:0,l:0},Ii={h:0,s:0,l:0};function Pr(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class je{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Nt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,ze.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=ze.workingColorSpace){return this.r=e,this.g=t,this.b=n,ze.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=ze.workingColorSpace){if(e=Hl(e,1),t=Ge(t,0,1),n=Ge(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,a=2*n-s;this.r=Pr(a,s,e+1/3),this.g=Pr(a,s,e),this.b=Pr(a,s,e-1/3)}return ze.colorSpaceToWorking(this,r),this}setStyle(e,t=Nt){function n(s){s!==void 0&&parseFloat(s)<1&&Ae("Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:Ae("Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);Ae("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Nt){const n=Uo[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Ae("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=hn(e.r),this.g=hn(e.g),this.b=hn(e.b),this}copyLinearToSRGB(e){return this.r=ai(e.r),this.g=ai(e.g),this.b=ai(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Nt){return ze.workingToColorSpace(Et.copy(this),e),Math.round(Ge(Et.r*255,0,255))*65536+Math.round(Ge(Et.g*255,0,255))*256+Math.round(Ge(Et.b*255,0,255))}getHexString(e=Nt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=ze.workingColorSpace){ze.workingToColorSpace(Et.copy(this),t);const n=Et.r,r=Et.g,s=Et.b,a=Math.max(n,r,s),o=Math.min(n,r,s);let c,l;const h=(o+a)/2;if(o===a)c=0,l=0;else{const p=a-o;switch(l=h<=.5?p/(a+o):p/(2-a-o),a){case n:c=(r-s)/p+(r<s?6:0);break;case r:c=(s-n)/p+2;break;case s:c=(n-r)/p+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=ze.workingColorSpace){return ze.workingToColorSpace(Et.copy(this),t),e.r=Et.r,e.g=Et.g,e.b=Et.b,e}getStyle(e=Nt){ze.workingToColorSpace(Et.copy(this),e);const t=Et.r,n=Et.g,r=Et.b;return e!==Nt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(Mn),this.setHSL(Mn.h+e,Mn.s+t,Mn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Mn),e.getHSL(Ii);const n=Tr(Mn.h,Ii.h,t),r=Tr(Mn.s,Ii.s,t),s=Tr(Mn.l,Ii.l,t);return this.setHSL(n,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*r,this.g=s[1]*t+s[4]*n+s[7]*r,this.b=s[2]*t+s[5]*n+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Et=new je;je.NAMES=Uo;class nc extends Lt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Vn,this.environmentIntensity=1,this.environmentRotation=new Vn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Ot=new B,an=new B,Dr=new B,on=new B,$n=new B,jn=new B,Na=new B,Lr=new B,Ur=new B,Ir=new B,Nr=new ut,Fr=new ut,Or=new ut;class Gt{constructor(e=new B,t=new B,n=new B){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Ot.subVectors(e,t),r.cross(Ot);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,n,r,s){Ot.subVectors(r,t),an.subVectors(n,t),Dr.subVectors(e,t);const a=Ot.dot(Ot),o=Ot.dot(an),c=Ot.dot(Dr),l=an.dot(an),h=an.dot(Dr),p=a*l-o*o;if(p===0)return s.set(0,0,0),null;const u=1/p,_=(l*c-o*h)*u,v=(a*h-o*c)*u;return s.set(1-_-v,v,_)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,on)===null?!1:on.x>=0&&on.y>=0&&on.x+on.y<=1}static getInterpolation(e,t,n,r,s,a,o,c){return this.getBarycoord(e,t,n,r,on)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,on.x),c.addScaledVector(a,on.y),c.addScaledVector(o,on.z),c)}static getInterpolatedAttribute(e,t,n,r,s,a){return Nr.setScalar(0),Fr.setScalar(0),Or.setScalar(0),Nr.fromBufferAttribute(e,t),Fr.fromBufferAttribute(e,n),Or.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Nr,s.x),a.addScaledVector(Fr,s.y),a.addScaledVector(Or,s.z),a}static isFrontFacing(e,t,n,r){return Ot.subVectors(n,t),an.subVectors(e,t),Ot.cross(an).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Ot.subVectors(this.c,this.b),an.subVectors(this.a,this.b),Ot.cross(an).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Gt.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Gt.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,s){return Gt.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}containsPoint(e){return Gt.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Gt.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,s=this.c;let a,o;$n.subVectors(r,n),jn.subVectors(s,n),Lr.subVectors(e,n);const c=$n.dot(Lr),l=jn.dot(Lr);if(c<=0&&l<=0)return t.copy(n);Ur.subVectors(e,r);const h=$n.dot(Ur),p=jn.dot(Ur);if(h>=0&&p<=h)return t.copy(r);const u=c*p-h*l;if(u<=0&&c>=0&&h<=0)return a=c/(c-h),t.copy(n).addScaledVector($n,a);Ir.subVectors(e,s);const _=$n.dot(Ir),v=jn.dot(Ir);if(v>=0&&_<=v)return t.copy(s);const E=_*l-c*v;if(E<=0&&l>=0&&v<=0)return o=l/(l-v),t.copy(n).addScaledVector(jn,o);const d=h*v-_*p;if(d<=0&&p-h>=0&&_-v>=0)return Na.subVectors(s,r),o=(p-h)/(p-h+(_-v)),t.copy(r).addScaledVector(Na,o);const f=1/(d+E+u);return a=E*f,o=u*f,t.copy(n).addScaledVector($n,a).addScaledVector(jn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Ai{constructor(e=new B(1/0,1/0,1/0),t=new B(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Bt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Bt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Bt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,Bt):Bt.fromBufferAttribute(s,a),Bt.applyMatrix4(e.matrixWorld),this.expandByPoint(Bt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ni.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ni.copy(n.boundingBox)),Ni.applyMatrix4(e.matrixWorld),this.union(Ni)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Bt),Bt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(mi),Fi.subVectors(this.max,mi),Jn.subVectors(e.a,mi),Qn.subVectors(e.b,mi),ei.subVectors(e.c,mi),En.subVectors(Qn,Jn),Tn.subVectors(ei,Qn),Pn.subVectors(Jn,ei);let t=[0,-En.z,En.y,0,-Tn.z,Tn.y,0,-Pn.z,Pn.y,En.z,0,-En.x,Tn.z,0,-Tn.x,Pn.z,0,-Pn.x,-En.y,En.x,0,-Tn.y,Tn.x,0,-Pn.y,Pn.x,0];return!Br(t,Jn,Qn,ei,Fi)||(t=[1,0,0,0,1,0,0,0,1],!Br(t,Jn,Qn,ei,Fi))?!1:(Oi.crossVectors(En,Tn),t=[Oi.x,Oi.y,Oi.z],Br(t,Jn,Qn,ei,Fi))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Bt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Bt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(ln[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),ln[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),ln[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),ln[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),ln[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),ln[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),ln[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),ln[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(ln),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const ln=[new B,new B,new B,new B,new B,new B,new B,new B],Bt=new B,Ni=new Ai,Jn=new B,Qn=new B,ei=new B,En=new B,Tn=new B,Pn=new B,mi=new B,Fi=new B,Oi=new B,Dn=new B;function Br(i,e,t,n,r){for(let s=0,a=i.length-3;s<=a;s+=3){Dn.fromArray(i,s);const o=r.x*Math.abs(Dn.x)+r.y*Math.abs(Dn.y)+r.z*Math.abs(Dn.z),c=e.dot(Dn),l=t.dot(Dn),h=n.dot(Dn);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}const ft=new B,Bi=new qe;let ic=0;class Ht extends Hn{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:ic++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Ma,this.updateRanges=[],this.gpuType=$t,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Bi.fromBufferAttribute(this,t),Bi.applyMatrix3(e),this.setXY(t,Bi.x,Bi.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)ft.fromBufferAttribute(this,t),ft.applyMatrix3(e),this.setXYZ(t,ft.x,ft.y,ft.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)ft.fromBufferAttribute(this,t),ft.applyMatrix4(e),this.setXYZ(t,ft.x,ft.y,ft.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)ft.fromBufferAttribute(this,t),ft.applyNormalMatrix(e),this.setXYZ(t,ft.x,ft.y,ft.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)ft.fromBufferAttribute(this,t),ft.transformDirection(e),this.setXYZ(t,ft.x,ft.y,ft.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=di(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=yt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=di(t,this.array)),t}setX(e,t){return this.normalized&&(t=yt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=di(t,this.array)),t}setY(e,t){return this.normalized&&(t=yt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=di(t,this.array)),t}setZ(e,t){return this.normalized&&(t=yt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=di(t,this.array)),t}setW(e,t){return this.normalized&&(t=yt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=yt(t,this.array),n=yt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=yt(t,this.array),n=yt(n,this.array),r=yt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e*=this.itemSize,this.normalized&&(t=yt(t,this.array),n=yt(n,this.array),r=yt(r,this.array),s=yt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Ma&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class Io extends Ht{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class No extends Ht{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class dn extends Ht{constructor(e,t,n){super(new Float32Array(e),t,n)}}const rc=new Ai,_i=new B,zr=new B;class ea{constructor(e=new B,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):rc.setFromPoints(e).getCenter(n);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;_i.subVectors(e,this.center);const t=_i.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector(_i,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(zr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(_i.copy(e.center).add(zr)),this.expandByPoint(_i.copy(e.center).sub(zr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let sc=0;const It=new pt,Gr=new Lt,ti=new B,Pt=new Ai,gi=new Ai,gt=new B;class nn extends Hn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:sc++}),this.uuid=yi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Bl(e)?No:Io)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Ce().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return It.makeRotationFromQuaternion(e),this.applyMatrix4(It),this}rotateX(e){return It.makeRotationX(e),this.applyMatrix4(It),this}rotateY(e){return It.makeRotationY(e),this.applyMatrix4(It),this}rotateZ(e){return It.makeRotationZ(e),this.applyMatrix4(It),this}translate(e,t,n){return It.makeTranslation(e,t,n),this.applyMatrix4(It),this}scale(e,t,n){return It.makeScale(e,t,n),this.applyMatrix4(It),this}lookAt(e){return Gr.lookAt(e),Gr.updateMatrix(),this.applyMatrix4(Gr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ti).negate(),this.translate(ti.x,ti.y,ti.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let r=0,s=e.length;r<s;r++){const a=e[r];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new dn(n,3))}else{const n=Math.min(e.length,t.count);for(let r=0;r<n;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&Ae("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ai);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){ke("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new B(-1/0,-1/0,-1/0),new B(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const s=t[n];Pt.setFromBufferAttribute(s),this.morphTargetsRelative?(gt.addVectors(this.boundingBox.min,Pt.min),this.boundingBox.expandByPoint(gt),gt.addVectors(this.boundingBox.max,Pt.max),this.boundingBox.expandByPoint(gt)):(this.boundingBox.expandByPoint(Pt.min),this.boundingBox.expandByPoint(Pt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&ke('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ea);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){ke("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new B,1/0);return}if(e){const n=this.boundingSphere.center;if(Pt.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];gi.setFromBufferAttribute(o),this.morphTargetsRelative?(gt.addVectors(Pt.min,gi.min),Pt.expandByPoint(gt),gt.addVectors(Pt.max,gi.max),Pt.expandByPoint(gt)):(Pt.expandByPoint(gi.min),Pt.expandByPoint(gi.max))}Pt.getCenter(n);let r=0;for(let s=0,a=e.count;s<a;s++)gt.fromBufferAttribute(e,s),r=Math.max(r,n.distanceToSquared(gt));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)gt.fromBufferAttribute(o,l),c&&(ti.fromBufferAttribute(e,l),gt.add(ti)),r=Math.max(r,n.distanceToSquared(gt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&ke('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){ke("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ht(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],c=[];for(let x=0;x<n.count;x++)o[x]=new B,c[x]=new B;const l=new B,h=new B,p=new B,u=new qe,_=new qe,v=new qe,E=new B,d=new B;function f(x,A,I){l.fromBufferAttribute(n,x),h.fromBufferAttribute(n,A),p.fromBufferAttribute(n,I),u.fromBufferAttribute(s,x),_.fromBufferAttribute(s,A),v.fromBufferAttribute(s,I),h.sub(l),p.sub(l),_.sub(u),v.sub(u);const R=1/(_.x*v.y-v.x*_.y);isFinite(R)&&(E.copy(h).multiplyScalar(v.y).addScaledVector(p,-_.y).multiplyScalar(R),d.copy(p).multiplyScalar(_.x).addScaledVector(h,-v.x).multiplyScalar(R),o[x].add(E),o[A].add(E),o[I].add(E),c[x].add(d),c[A].add(d),c[I].add(d))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let x=0,A=M.length;x<A;++x){const I=M[x],R=I.start,z=I.count;for(let W=R,X=R+z;W<X;W+=3)f(e.getX(W+0),e.getX(W+1),e.getX(W+2))}const y=new B,b=new B,P=new B,T=new B;function D(x){P.fromBufferAttribute(r,x),T.copy(P);const A=o[x];y.copy(A),y.sub(P.multiplyScalar(P.dot(A))).normalize(),b.crossVectors(T,A);const R=b.dot(c[x])<0?-1:1;a.setXYZW(x,y.x,y.y,y.z,R)}for(let x=0,A=M.length;x<A;++x){const I=M[x],R=I.start,z=I.count;for(let W=R,X=R+z;W<X;W+=3)D(e.getX(W+0)),D(e.getX(W+1)),D(e.getX(W+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ht(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,_=n.count;u<_;u++)n.setXYZ(u,0,0,0);const r=new B,s=new B,a=new B,o=new B,c=new B,l=new B,h=new B,p=new B;if(e)for(let u=0,_=e.count;u<_;u+=3){const v=e.getX(u+0),E=e.getX(u+1),d=e.getX(u+2);r.fromBufferAttribute(t,v),s.fromBufferAttribute(t,E),a.fromBufferAttribute(t,d),h.subVectors(a,s),p.subVectors(r,s),h.cross(p),o.fromBufferAttribute(n,v),c.fromBufferAttribute(n,E),l.fromBufferAttribute(n,d),o.add(h),c.add(h),l.add(h),n.setXYZ(v,o.x,o.y,o.z),n.setXYZ(E,c.x,c.y,c.z),n.setXYZ(d,l.x,l.y,l.z)}else for(let u=0,_=t.count;u<_;u+=3)r.fromBufferAttribute(t,u+0),s.fromBufferAttribute(t,u+1),a.fromBufferAttribute(t,u+2),h.subVectors(a,s),p.subVectors(r,s),h.cross(p),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)gt.fromBufferAttribute(e,t),gt.normalize(),e.setXYZ(t,gt.x,gt.y,gt.z)}toNonIndexed(){function e(o,c){const l=o.array,h=o.itemSize,p=o.normalized,u=new l.constructor(c.length*h);let _=0,v=0;for(let E=0,d=c.length;E<d;E++){o.isInterleavedBufferAttribute?_=c[E]*o.data.stride+o.offset:_=c[E]*h;for(let f=0;f<h;f++)u[v++]=l[_++]}return new Ht(u,h,p)}if(this.index===null)return Ae("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new nn,n=this.index.array,r=this.attributes;for(const o in r){const c=r[o],l=e(c,n);t.setAttribute(o,l)}const s=this.morphAttributes;for(const o in s){const c=[],l=s[o];for(let h=0,p=l.length;h<p;h++){const u=l[h],_=e(u,n);c.push(_)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,c=a.length;o<c;o++){const l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const r={};let s=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let p=0,u=l.length;p<u;p++){const _=l[p];h.push(_.toJSON(e.data))}h.length>0&&(r[c]=h,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const r=e.attributes;for(const l in r){const h=r[l];this.setAttribute(l,h.clone(t))}const s=e.morphAttributes;for(const l in s){const h=[],p=s[l];for(let u=0,_=p.length;u<_;u++)h.push(p[u].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let l=0,h=a.length;l<h;l++){const p=a[l];this.addGroup(p.start,p.count,p.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}let ac=0;class dr extends Hn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:ac++}),this.uuid=yi(),this.name="",this.type="Material",this.blending=si,this.side=wn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Jr,this.blendDst=Qr,this.blendEquation=Nn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new je(0,0,0),this.blendAlpha=0,this.depthFunc=oi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Sa,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Xn,this.stencilZFail=Xn,this.stencilZPass=Xn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){Ae(`Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){Ae(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==si&&(n.blending=this.blending),this.side!==wn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Jr&&(n.blendSrc=this.blendSrc),this.blendDst!==Qr&&(n.blendDst=this.blendDst),this.blendEquation!==Nn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==oi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Sa&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Xn&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Xn&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Xn&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const a=[];for(const o in s){const c=s[o];delete c.metadata,a.push(c)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const cn=new B,Vr=new B,zi=new B,bn=new B,Hr=new B,Gi=new B,kr=new B;class oc{constructor(e=new B,t=new B(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,cn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=cn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(cn.copy(this.origin).addScaledVector(this.direction,t),cn.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Vr.copy(e).add(t).multiplyScalar(.5),zi.copy(t).sub(e).normalize(),bn.copy(this.origin).sub(Vr);const s=e.distanceTo(t)*.5,a=-this.direction.dot(zi),o=bn.dot(this.direction),c=-bn.dot(zi),l=bn.lengthSq(),h=Math.abs(1-a*a);let p,u,_,v;if(h>0)if(p=a*c-o,u=a*o-c,v=s*h,p>=0)if(u>=-v)if(u<=v){const E=1/h;p*=E,u*=E,_=p*(p+a*u+2*o)+u*(a*p+u+2*c)+l}else u=s,p=Math.max(0,-(a*u+o)),_=-p*p+u*(u+2*c)+l;else u=-s,p=Math.max(0,-(a*u+o)),_=-p*p+u*(u+2*c)+l;else u<=-v?(p=Math.max(0,-(-a*s+o)),u=p>0?-s:Math.min(Math.max(-s,-c),s),_=-p*p+u*(u+2*c)+l):u<=v?(p=0,u=Math.min(Math.max(-s,-c),s),_=u*(u+2*c)+l):(p=Math.max(0,-(a*s+o)),u=p>0?s:Math.min(Math.max(-s,-c),s),_=-p*p+u*(u+2*c)+l);else u=a>0?-s:s,p=Math.max(0,-(a*u+o)),_=-p*p+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,p),r&&r.copy(Vr).addScaledVector(zi,u),_}intersectSphere(e,t){cn.subVectors(e.center,this.origin);const n=cn.dot(this.direction),r=cn.dot(cn)-n*n,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,s,a,o,c;const l=1/this.direction.x,h=1/this.direction.y,p=1/this.direction.z,u=this.origin;return l>=0?(n=(e.min.x-u.x)*l,r=(e.max.x-u.x)*l):(n=(e.max.x-u.x)*l,r=(e.min.x-u.x)*l),h>=0?(s=(e.min.y-u.y)*h,a=(e.max.y-u.y)*h):(s=(e.max.y-u.y)*h,a=(e.min.y-u.y)*h),n>a||s>r||((s>n||isNaN(n))&&(n=s),(a<r||isNaN(r))&&(r=a),p>=0?(o=(e.min.z-u.z)*p,c=(e.max.z-u.z)*p):(o=(e.max.z-u.z)*p,c=(e.min.z-u.z)*p),n>c||o>r)||((o>n||n!==n)&&(n=o),(c<r||r!==r)&&(r=c),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,cn)!==null}intersectTriangle(e,t,n,r,s){Hr.subVectors(t,e),Gi.subVectors(n,e),kr.crossVectors(Hr,Gi);let a=this.direction.dot(kr),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;bn.subVectors(this.origin,e);const c=o*this.direction.dot(Gi.crossVectors(bn,Gi));if(c<0)return null;const l=o*this.direction.dot(Hr.cross(bn));if(l<0||c+l>a)return null;const h=-o*bn.dot(kr);return h<0?null:this.at(h/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Fo extends dr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new je(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Vn,this.combine=mo,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Fa=new pt,Ln=new oc,Vi=new ea,Oa=new B,Hi=new B,ki=new B,Wi=new B,Wr=new B,Xi=new B,Ba=new B,qi=new B;class tn extends Lt{constructor(e=new nn,t=new Fo){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){Xi.set(0,0,0);for(let c=0,l=s.length;c<l;c++){const h=o[c],p=s[c];h!==0&&(Wr.fromBufferAttribute(p,e),a?Xi.addScaledVector(Wr,h):Xi.addScaledVector(Wr.sub(t),h))}t.add(Xi)}return t}raycast(e,t){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Vi.copy(n.boundingSphere),Vi.applyMatrix4(s),Ln.copy(e.ray).recast(e.near),!(Vi.containsPoint(Ln.origin)===!1&&(Ln.intersectSphere(Vi,Oa)===null||Ln.origin.distanceToSquared(Oa)>(e.far-e.near)**2))&&(Fa.copy(s).invert(),Ln.copy(e.ray).applyMatrix4(Fa),!(n.boundingBox!==null&&Ln.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Ln)))}_computeIntersections(e,t,n){let r;const s=this.geometry,a=this.material,o=s.index,c=s.attributes.position,l=s.attributes.uv,h=s.attributes.uv1,p=s.attributes.normal,u=s.groups,_=s.drawRange;if(o!==null)if(Array.isArray(a))for(let v=0,E=u.length;v<E;v++){const d=u[v],f=a[d.materialIndex],M=Math.max(d.start,_.start),y=Math.min(o.count,Math.min(d.start+d.count,_.start+_.count));for(let b=M,P=y;b<P;b+=3){const T=o.getX(b),D=o.getX(b+1),x=o.getX(b+2);r=Yi(this,f,e,n,l,h,p,T,D,x),r&&(r.faceIndex=Math.floor(b/3),r.face.materialIndex=d.materialIndex,t.push(r))}}else{const v=Math.max(0,_.start),E=Math.min(o.count,_.start+_.count);for(let d=v,f=E;d<f;d+=3){const M=o.getX(d),y=o.getX(d+1),b=o.getX(d+2);r=Yi(this,a,e,n,l,h,p,M,y,b),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}else if(c!==void 0)if(Array.isArray(a))for(let v=0,E=u.length;v<E;v++){const d=u[v],f=a[d.materialIndex],M=Math.max(d.start,_.start),y=Math.min(c.count,Math.min(d.start+d.count,_.start+_.count));for(let b=M,P=y;b<P;b+=3){const T=b,D=b+1,x=b+2;r=Yi(this,f,e,n,l,h,p,T,D,x),r&&(r.faceIndex=Math.floor(b/3),r.face.materialIndex=d.materialIndex,t.push(r))}}else{const v=Math.max(0,_.start),E=Math.min(c.count,_.start+_.count);for(let d=v,f=E;d<f;d+=3){const M=d,y=d+1,b=d+2;r=Yi(this,a,e,n,l,h,p,M,y,b),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}}function lc(i,e,t,n,r,s,a,o){let c;if(e.side===At?c=n.intersectTriangle(a,s,r,!0,o):c=n.intersectTriangle(r,s,a,e.side===wn,o),c===null)return null;qi.copy(o),qi.applyMatrix4(i.matrixWorld);const l=t.ray.origin.distanceTo(qi);return l<t.near||l>t.far?null:{distance:l,point:qi.clone(),object:i}}function Yi(i,e,t,n,r,s,a,o,c,l){i.getVertexPosition(o,Hi),i.getVertexPosition(c,ki),i.getVertexPosition(l,Wi);const h=lc(i,e,t,n,Hi,ki,Wi,Ba);if(h){const p=new B;Gt.getBarycoord(Ba,Hi,ki,Wi,p),r&&(h.uv=Gt.getInterpolatedAttribute(r,o,c,l,p,new qe)),s&&(h.uv1=Gt.getInterpolatedAttribute(s,o,c,l,p,new qe)),a&&(h.normal=Gt.getInterpolatedAttribute(a,o,c,l,p,new B),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a:o,b:c,c:l,normal:new B,materialIndex:0};Gt.getNormal(Hi,ki,Wi,u.normal),h.face=u,h.barycoord=p}return h}class Oo extends bt{constructor(e=null,t=1,n=1,r,s,a,o,c,l=vt,h=vt,p,u){super(null,a,o,c,l,h,r,s,p,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Xr=new B,cc=new B,uc=new Ce;class In{constructor(e=new B(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=Xr.subVectors(n,t).cross(cc.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){const r=e.delta(Xr),s=this.normal.dot(r);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const a=-(e.start.dot(this.normal)+this.constant)/s;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||uc.getNormalMatrix(e),r=this.coplanarPoint(Xr).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Un=new ea,fc=new qe(.5,.5),Ki=new B;class Bo{constructor(e=new In,t=new In,n=new In,r=new In,s=new In,a=new In){this.planes=[e,t,n,r,s,a]}set(e,t,n,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=jt,n=!1){const r=this.planes,s=e.elements,a=s[0],o=s[1],c=s[2],l=s[3],h=s[4],p=s[5],u=s[6],_=s[7],v=s[8],E=s[9],d=s[10],f=s[11],M=s[12],y=s[13],b=s[14],P=s[15];if(r[0].setComponents(l-a,_-h,f-v,P-M).normalize(),r[1].setComponents(l+a,_+h,f+v,P+M).normalize(),r[2].setComponents(l+o,_+p,f+E,P+y).normalize(),r[3].setComponents(l-o,_-p,f-E,P-y).normalize(),n)r[4].setComponents(c,u,d,b).normalize(),r[5].setComponents(l-c,_-u,f-d,P-b).normalize();else if(r[4].setComponents(l-c,_-u,f-d,P-b).normalize(),t===jt)r[5].setComponents(l+c,_+u,f+d,P+b).normalize();else if(t===cr)r[5].setComponents(c,u,d,b).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Un.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Un.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Un)}intersectsSprite(e){Un.center.set(0,0,0);const t=fc.distanceTo(e.center);return Un.radius=.7071067811865476+t,Un.applyMatrix4(e.matrixWorld),this.intersectsSphere(Un)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if(Ki.x=r.normal.x>0?e.max.x:e.min.x,Ki.y=r.normal.y>0?e.max.y:e.min.y,Ki.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Ki)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class zo extends bt{constructor(e=[],t=zn,n,r,s,a,o,c,l,h){super(e,t,n,r,s,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class ci extends bt{constructor(e,t,n=en,r,s,a,o=vt,c=vt,l,h=mn,p=1){if(h!==mn&&h!==Bn)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:e,height:t,depth:p};super(u,r,s,a,o,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Qs(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class hc extends ci{constructor(e,t=en,n=zn,r,s,a=vt,o=vt,c,l=mn){const h={width:e,height:e,depth:1},p=[h,h,h,h,h,h];super(e,e,t,n,r,s,a,o,c,l),this.image=p,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Go extends bt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Ri extends nn{constructor(e=1,t=1,n=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const c=[],l=[],h=[],p=[];let u=0,_=0;v("z","y","x",-1,-1,n,t,e,a,s,0),v("z","y","x",1,-1,n,t,-e,a,s,1),v("x","z","y",1,1,e,n,t,r,a,2),v("x","z","y",1,-1,e,n,-t,r,a,3),v("x","y","z",1,-1,e,t,n,r,s,4),v("x","y","z",-1,-1,e,t,-n,r,s,5),this.setIndex(c),this.setAttribute("position",new dn(l,3)),this.setAttribute("normal",new dn(h,3)),this.setAttribute("uv",new dn(p,2));function v(E,d,f,M,y,b,P,T,D,x,A){const I=b/D,R=P/x,z=b/2,W=P/2,X=T/2,U=D+1,G=x+1;let V=0,$=0;const Q=new B;for(let ce=0;ce<G;ce++){const xe=ce*R-W;for(let Ee=0;Ee<U;Ee++){const Ve=Ee*I-z;Q[E]=Ve*M,Q[d]=xe*y,Q[f]=X,l.push(Q.x,Q.y,Q.z),Q[E]=0,Q[d]=0,Q[f]=T>0?1:-1,h.push(Q.x,Q.y,Q.z),p.push(Ee/D),p.push(1-ce/x),V+=1}}for(let ce=0;ce<x;ce++)for(let xe=0;xe<D;xe++){const Ee=u+xe+U*ce,Ve=u+xe+U*(ce+1),Ye=u+(xe+1)+U*(ce+1),Le=u+(xe+1)+U*ce;c.push(Ee,Ve,Le),c.push(Ve,Ye,Le),$+=6}o.addGroup(_,$,A),_+=$,u+=V}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ri(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class pr extends nn{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(n),c=Math.floor(r),l=o+1,h=c+1,p=e/o,u=t/c,_=[],v=[],E=[],d=[];for(let f=0;f<h;f++){const M=f*u-a;for(let y=0;y<l;y++){const b=y*p-s;v.push(b,-M,0),E.push(0,0,1),d.push(y/o),d.push(1-f/c)}}for(let f=0;f<c;f++)for(let M=0;M<o;M++){const y=M+l*f,b=M+l*(f+1),P=M+1+l*(f+1),T=M+1+l*f;_.push(y,b,T),_.push(b,P,T)}this.setIndex(_),this.setAttribute("position",new dn(v,3)),this.setAttribute("normal",new dn(E,3)),this.setAttribute("uv",new dn(d,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new pr(e.width,e.height,e.widthSegments,e.heightSegments)}}function ui(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const r=i[t][n];if(za(r))r.isRenderTargetTexture?(Ae("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone();else if(Array.isArray(r))if(za(r[0])){const s=[];for(let a=0,o=r.length;a<o;a++)s[a]=r[a].clone();e[t][n]=s}else e[t][n]=r.slice();else e[t][n]=r}}return e}function Tt(i){const e={};for(let t=0;t<i.length;t++){const n=ui(i[t]);for(const r in n)e[r]=n[r]}return e}function za(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function dc(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Vo(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:ze.workingColorSpace}const pc={clone:ui,merge:Tt};var mc=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,_c=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class kt extends dr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=mc,this.fragmentShader=_c,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=ui(e.uniforms),this.uniformsGroups=dc(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class gc extends kt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class xc extends dr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Pl,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class vc extends dr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Zi=new B,$i=new fi,qt=new B;class Ho extends Lt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new pt,this.projectionMatrix=new pt,this.projectionMatrixInverse=new pt,this.coordinateSystem=jt,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Zi,$i,qt),qt.x===1&&qt.y===1&&qt.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Zi,$i,qt.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(Zi,$i,qt),qt.x===1&&qt.y===1&&qt.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Zi,$i,qt.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const yn=new B,Ga=new qe,Va=new qe;class zt extends Ho{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Gs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Er*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Gs*2*Math.atan(Math.tan(Er*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){yn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(yn.x,yn.y).multiplyScalar(-e/yn.z),yn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(yn.x,yn.y).multiplyScalar(-e/yn.z)}getViewSize(e,t){return this.getViewBounds(e,Ga,Va),t.subVectors(Va,Ga)}setViewOffset(e,t,n,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Er*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const c=a.fullWidth,l=a.fullHeight;s+=a.offsetX*r/c,t-=a.offsetY*n/l,r*=a.width/c,n*=a.height/l}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class ta extends Ho{constructor(e=-1,t=1,n=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-e,a=n+e,o=r+t,c=r-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,a=s+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const ni=-90,ii=1;class Sc extends Lt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new zt(ni,ii,e,t);r.layers=this.layers,this.add(r);const s=new zt(ni,ii,e,t);s.layers=this.layers,this.add(s);const a=new zt(ni,ii,e,t);a.layers=this.layers,this.add(a);const o=new zt(ni,ii,e,t);o.layers=this.layers,this.add(o);const c=new zt(ni,ii,e,t);c.layers=this.layers,this.add(c);const l=new zt(ni,ii,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,s,a,o,c]=t;for(const l of t)this.remove(l);if(e===jt)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===cr)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,c,l,h]=this.children,p=e.getRenderTarget(),u=e.getActiveCubeFace(),_=e.getActiveMipmapLevel(),v=e.xr.enabled;e.xr.enabled=!1;const E=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let d=!1;e.isWebGLRenderer===!0?d=e.state.buffers.depth.getReversed():d=e.reversedDepthBuffer,e.setRenderTarget(n,0,r),d&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,1,r),d&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),d&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),d&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(n,4,r),d&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),n.texture.generateMipmaps=E,e.setRenderTarget(n,5,r),d&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(p,u,_),e.xr.enabled=v,n.texture.needsPMREMUpdate=!0}}class Mc extends zt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}const aa=class aa{constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){const s=this.elements;return s[0]=e,s[2]=t,s[1]=n,s[3]=r,this}};aa.prototype.isMatrix2=!0;let Ha=aa;function ka(i,e,t,n){const r=Ec(n);switch(t){case wo:return i*e;case Ys:return i*e/r.components*r.byteLength;case Ks:return i*e/r.components*r.byteLength;case Gn:return i*e*2/r.components*r.byteLength;case Zs:return i*e*2/r.components*r.byteLength;case Co:return i*e*3/r.components*r.byteLength;case Vt:return i*e*4/r.components*r.byteLength;case $s:return i*e*4/r.components*r.byteLength;case er:case tr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case nr:case ir:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case us:case hs:return Math.max(i,16)*Math.max(e,8)/4;case cs:case fs:return Math.max(i,8)*Math.max(e,8)/2;case ds:case ps:case _s:case gs:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case ms:case sr:case xs:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case vs:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ss:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Ms:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Es:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Ts:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case bs:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case ys:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case As:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Rs:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case ws:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Cs:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Ps:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Ds:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Ls:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Us:case Is:case Ns:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Fs:case Os:return Math.ceil(i/4)*Math.ceil(e/4)*8;case ar:case Bs:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ec(i){switch(i){case Dt:case bo:return{byteLength:1,components:1};case Ti:case yo:case pn:return{byteLength:2,components:1};case Xs:case qs:return{byteLength:2,components:4};case en:case Ws:case $t:return{byteLength:4,components:1};case Ao:case Ro:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:ks}}));typeof window<"u"&&(window.__THREE__?Ae("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=ks);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function ko(){let i=null,e=!1,t=null,n=null;function r(s,a){t(s,a),n=i.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function Tc(i){const e=new WeakMap;function t(o,c){const l=o.array,h=o.usage,p=l.byteLength,u=i.createBuffer();i.bindBuffer(c,u),i.bufferData(c,l,h),o.onUploadCallback();let _;if(l instanceof Float32Array)_=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)_=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?_=i.HALF_FLOAT:_=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)_=i.SHORT;else if(l instanceof Uint32Array)_=i.UNSIGNED_INT;else if(l instanceof Int32Array)_=i.INT;else if(l instanceof Int8Array)_=i.BYTE;else if(l instanceof Uint8Array)_=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)_=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:_,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:p}}function n(o,c,l){const h=c.array,p=c.updateRanges;if(i.bindBuffer(l,o),p.length===0)i.bufferSubData(l,0,h);else{p.sort((_,v)=>_.start-v.start);let u=0;for(let _=1;_<p.length;_++){const v=p[u],E=p[_];E.start<=v.start+v.count+1?v.count=Math.max(v.count,E.start+E.count-v.start):(++u,p[u]=E)}p.length=u+1;for(let _=0,v=p.length;_<v;_++){const E=p[_];i.bufferSubData(l,E.start*h.BYTES_PER_ELEMENT,h,E.start,E.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:r,remove:s,update:a}}var bc=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,yc=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Ac=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Rc=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,wc=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Cc=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Pc=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Dc=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Lc=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Uc=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Ic=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Nc=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Fc=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Oc=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Bc=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,zc=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Gc=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Vc=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Hc=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,kc=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Wc=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Xc=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,qc=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Yc=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Kc=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Zc=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,$c=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,jc=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Jc=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Qc=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,eu="gl_FragColor = linearToOutputTexel( gl_FragColor );",tu=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,nu=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,iu=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,ru=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,su=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,au=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,ou=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,lu=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,cu=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,uu=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,fu=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,hu=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,du=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,pu=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,mu=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,_u=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,gu=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,xu=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,vu=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Su=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Mu=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Eu=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Tu=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = inverseTransformDirection( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,bu=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,yu=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Au=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,Ru=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,wu=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Cu=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Pu=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Du=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Lu=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Uu=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Iu=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Nu=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Fu=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Ou=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Bu=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,zu=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Gu=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Vu=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Hu=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,ku=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Wu=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Xu=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,qu=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Yu=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Ku=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Zu=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,$u=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,ju=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Ju=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Qu=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,ef=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,tf=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,nf=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,rf=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,sf=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,af=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,of=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,lf=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,cf=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,uf=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,ff=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,hf=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,df=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,pf=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,mf=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,_f=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,gf=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,xf=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,vf=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Sf=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Mf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ef=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Tf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,bf=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const yf=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Af=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Rf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,wf=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Cf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Pf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Df=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Lf=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Uf=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,If=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Nf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Ff=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Of=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Bf=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,zf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Gf=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Vf=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Hf=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kf=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Wf=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Xf=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,qf=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Yf=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Kf=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Zf=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,$f=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,jf=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Jf=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Qf=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,eh=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,th=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,nh=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,ih=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,rh=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ie={alphahash_fragment:bc,alphahash_pars_fragment:yc,alphamap_fragment:Ac,alphamap_pars_fragment:Rc,alphatest_fragment:wc,alphatest_pars_fragment:Cc,aomap_fragment:Pc,aomap_pars_fragment:Dc,batching_pars_vertex:Lc,batching_vertex:Uc,begin_vertex:Ic,beginnormal_vertex:Nc,bsdfs:Fc,iridescence_fragment:Oc,bumpmap_pars_fragment:Bc,clipping_planes_fragment:zc,clipping_planes_pars_fragment:Gc,clipping_planes_pars_vertex:Vc,clipping_planes_vertex:Hc,color_fragment:kc,color_pars_fragment:Wc,color_pars_vertex:Xc,color_vertex:qc,common:Yc,cube_uv_reflection_fragment:Kc,defaultnormal_vertex:Zc,displacementmap_pars_vertex:$c,displacementmap_vertex:jc,emissivemap_fragment:Jc,emissivemap_pars_fragment:Qc,colorspace_fragment:eu,colorspace_pars_fragment:tu,envmap_fragment:nu,envmap_common_pars_fragment:iu,envmap_pars_fragment:ru,envmap_pars_vertex:su,envmap_physical_pars_fragment:_u,envmap_vertex:au,fog_vertex:ou,fog_pars_vertex:lu,fog_fragment:cu,fog_pars_fragment:uu,gradientmap_pars_fragment:fu,lightmap_pars_fragment:hu,lights_lambert_fragment:du,lights_lambert_pars_fragment:pu,lights_pars_begin:mu,lights_toon_fragment:gu,lights_toon_pars_fragment:xu,lights_phong_fragment:vu,lights_phong_pars_fragment:Su,lights_physical_fragment:Mu,lights_physical_pars_fragment:Eu,lights_fragment_begin:Tu,lights_fragment_maps:bu,lights_fragment_end:yu,lightprobes_pars_fragment:Au,logdepthbuf_fragment:Ru,logdepthbuf_pars_fragment:wu,logdepthbuf_pars_vertex:Cu,logdepthbuf_vertex:Pu,map_fragment:Du,map_pars_fragment:Lu,map_particle_fragment:Uu,map_particle_pars_fragment:Iu,metalnessmap_fragment:Nu,metalnessmap_pars_fragment:Fu,morphinstance_vertex:Ou,morphcolor_vertex:Bu,morphnormal_vertex:zu,morphtarget_pars_vertex:Gu,morphtarget_vertex:Vu,normal_fragment_begin:Hu,normal_fragment_maps:ku,normal_pars_fragment:Wu,normal_pars_vertex:Xu,normal_vertex:qu,normalmap_pars_fragment:Yu,clearcoat_normal_fragment_begin:Ku,clearcoat_normal_fragment_maps:Zu,clearcoat_pars_fragment:$u,iridescence_pars_fragment:ju,opaque_fragment:Ju,packing:Qu,premultiplied_alpha_fragment:ef,project_vertex:tf,dithering_fragment:nf,dithering_pars_fragment:rf,roughnessmap_fragment:sf,roughnessmap_pars_fragment:af,shadowmap_pars_fragment:of,shadowmap_pars_vertex:lf,shadowmap_vertex:cf,shadowmask_pars_fragment:uf,skinbase_vertex:ff,skinning_pars_vertex:hf,skinning_vertex:df,skinnormal_vertex:pf,specularmap_fragment:mf,specularmap_pars_fragment:_f,tonemapping_fragment:gf,tonemapping_pars_fragment:xf,transmission_fragment:vf,transmission_pars_fragment:Sf,uv_pars_fragment:Mf,uv_pars_vertex:Ef,uv_vertex:Tf,worldpos_vertex:bf,background_vert:yf,background_frag:Af,backgroundCube_vert:Rf,backgroundCube_frag:wf,cube_vert:Cf,cube_frag:Pf,depth_vert:Df,depth_frag:Lf,distance_vert:Uf,distance_frag:If,equirect_vert:Nf,equirect_frag:Ff,linedashed_vert:Of,linedashed_frag:Bf,meshbasic_vert:zf,meshbasic_frag:Gf,meshlambert_vert:Vf,meshlambert_frag:Hf,meshmatcap_vert:kf,meshmatcap_frag:Wf,meshnormal_vert:Xf,meshnormal_frag:qf,meshphong_vert:Yf,meshphong_frag:Kf,meshphysical_vert:Zf,meshphysical_frag:$f,meshtoon_vert:jf,meshtoon_frag:Jf,points_vert:Qf,points_frag:eh,shadow_vert:th,shadow_frag:nh,sprite_vert:ih,sprite_frag:rh},le={common:{diffuse:{value:new je(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ce},alphaMap:{value:null},alphaMapTransform:{value:new Ce},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ce}},envmap:{envMap:{value:null},envMapRotation:{value:new Ce},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ce}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ce}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ce},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ce},normalScale:{value:new qe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ce},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ce}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ce}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ce}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new je(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new B},probesMax:{value:new B},probesResolution:{value:new B}},points:{diffuse:{value:new je(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ce},alphaTest:{value:0},uvTransform:{value:new Ce}},sprite:{diffuse:{value:new je(16777215)},opacity:{value:1},center:{value:new qe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ce},alphaMap:{value:null},alphaMapTransform:{value:new Ce},alphaTest:{value:0}}},Kt={basic:{uniforms:Tt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.fog]),vertexShader:Ie.meshbasic_vert,fragmentShader:Ie.meshbasic_frag},lambert:{uniforms:Tt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new je(0)},envMapIntensity:{value:1}}]),vertexShader:Ie.meshlambert_vert,fragmentShader:Ie.meshlambert_frag},phong:{uniforms:Tt([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new je(0)},specular:{value:new je(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Ie.meshphong_vert,fragmentShader:Ie.meshphong_frag},standard:{uniforms:Tt([le.common,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.roughnessmap,le.metalnessmap,le.fog,le.lights,{emissive:{value:new je(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ie.meshphysical_vert,fragmentShader:Ie.meshphysical_frag},toon:{uniforms:Tt([le.common,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.gradientmap,le.fog,le.lights,{emissive:{value:new je(0)}}]),vertexShader:Ie.meshtoon_vert,fragmentShader:Ie.meshtoon_frag},matcap:{uniforms:Tt([le.common,le.bumpmap,le.normalmap,le.displacementmap,le.fog,{matcap:{value:null}}]),vertexShader:Ie.meshmatcap_vert,fragmentShader:Ie.meshmatcap_frag},points:{uniforms:Tt([le.points,le.fog]),vertexShader:Ie.points_vert,fragmentShader:Ie.points_frag},dashed:{uniforms:Tt([le.common,le.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ie.linedashed_vert,fragmentShader:Ie.linedashed_frag},depth:{uniforms:Tt([le.common,le.displacementmap]),vertexShader:Ie.depth_vert,fragmentShader:Ie.depth_frag},normal:{uniforms:Tt([le.common,le.bumpmap,le.normalmap,le.displacementmap,{opacity:{value:1}}]),vertexShader:Ie.meshnormal_vert,fragmentShader:Ie.meshnormal_frag},sprite:{uniforms:Tt([le.sprite,le.fog]),vertexShader:Ie.sprite_vert,fragmentShader:Ie.sprite_frag},background:{uniforms:{uvTransform:{value:new Ce},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ie.background_vert,fragmentShader:Ie.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ce}},vertexShader:Ie.backgroundCube_vert,fragmentShader:Ie.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ie.cube_vert,fragmentShader:Ie.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ie.equirect_vert,fragmentShader:Ie.equirect_frag},distance:{uniforms:Tt([le.common,le.displacementmap,{referencePosition:{value:new B},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ie.distance_vert,fragmentShader:Ie.distance_frag},shadow:{uniforms:Tt([le.lights,le.fog,{color:{value:new je(0)},opacity:{value:1}}]),vertexShader:Ie.shadow_vert,fragmentShader:Ie.shadow_frag}};Kt.physical={uniforms:Tt([Kt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ce},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ce},clearcoatNormalScale:{value:new qe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ce},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ce},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ce},sheen:{value:0},sheenColor:{value:new je(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ce},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ce},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ce},transmissionSamplerSize:{value:new qe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ce},attenuationDistance:{value:0},attenuationColor:{value:new je(0)},specularColor:{value:new je(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ce},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ce},anisotropyVector:{value:new qe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ce}}]),vertexShader:Ie.meshphysical_vert,fragmentShader:Ie.meshphysical_frag};const ji={r:0,b:0,g:0},sh=new pt,Wo=new Ce;Wo.set(-1,0,0,0,1,0,0,0,1);function ah(i,e,t,n,r,s){const a=new je(0);let o=r===!0?0:1,c,l,h=null,p=0,u=null;function _(M){let y=M.isScene===!0?M.background:null;if(y&&y.isTexture){const b=M.backgroundBlurriness>0;y=e.get(y,b)}return y}function v(M){let y=!1;const b=_(M);b===null?d(a,o):b&&b.isColor&&(d(b,1),y=!0);const P=i.xr.getEnvironmentBlendMode();P==="additive"?t.buffers.color.setClear(0,0,0,1,s):P==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,s),(i.autoClear||y)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function E(M,y){const b=_(y);b&&(b.isCubeTexture||b.mapping===hr)?(l===void 0&&(l=new tn(new Ri(1,1,1),new kt({name:"BackgroundCubeMaterial",uniforms:ui(Kt.backgroundCube.uniforms),vertexShader:Kt.backgroundCube.vertexShader,fragmentShader:Kt.backgroundCube.fragmentShader,side:At,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(P,T,D){this.matrixWorld.copyPosition(D.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),l.material.uniforms.envMap.value=b,l.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(sh.makeRotationFromEuler(y.backgroundRotation)).transpose(),b.isCubeTexture&&b.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(Wo),l.material.toneMapped=ze.getTransfer(b.colorSpace)!==Xe,(h!==b||p!==b.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=b,p=b.version,u=i.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null)):b&&b.isTexture&&(c===void 0&&(c=new tn(new pr(2,2),new kt({name:"BackgroundMaterial",uniforms:ui(Kt.background.uniforms),vertexShader:Kt.background.vertexShader,fragmentShader:Kt.background.fragmentShader,side:wn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=b,c.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,c.material.toneMapped=ze.getTransfer(b.colorSpace)!==Xe,b.matrixAutoUpdate===!0&&b.updateMatrix(),c.material.uniforms.uvTransform.value.copy(b.matrix),(h!==b||p!==b.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=b,p=b.version,u=i.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null))}function d(M,y){M.getRGB(ji,Vo(i)),t.buffers.color.setClear(ji.r,ji.g,ji.b,y,s)}function f(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(M,y=1){a.set(M),o=y,d(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(M){o=M,d(a,o)},render:v,addToRenderList:E,dispose:f}}function oh(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=u(null);let s=r,a=!1;function o(R,z,W,X,U){let G=!1;const V=p(R,X,W,z);s!==V&&(s=V,l(s.object)),G=_(R,X,W,U),G&&v(R,X,W,U),U!==null&&e.update(U,i.ELEMENT_ARRAY_BUFFER),(G||a)&&(a=!1,b(R,z,W,X),U!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(U).buffer))}function c(){return i.createVertexArray()}function l(R){return i.bindVertexArray(R)}function h(R){return i.deleteVertexArray(R)}function p(R,z,W,X){const U=X.wireframe===!0;let G=n[z.id];G===void 0&&(G={},n[z.id]=G);const V=R.isInstancedMesh===!0?R.id:0;let $=G[V];$===void 0&&($={},G[V]=$);let Q=$[W.id];Q===void 0&&(Q={},$[W.id]=Q);let ce=Q[U];return ce===void 0&&(ce=u(c()),Q[U]=ce),ce}function u(R){const z=[],W=[],X=[];for(let U=0;U<t;U++)z[U]=0,W[U]=0,X[U]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:z,enabledAttributes:W,attributeDivisors:X,object:R,attributes:{},index:null}}function _(R,z,W,X){const U=s.attributes,G=z.attributes;let V=0;const $=W.getAttributes();for(const Q in $)if($[Q].location>=0){const xe=U[Q];let Ee=G[Q];if(Ee===void 0&&(Q==="instanceMatrix"&&R.instanceMatrix&&(Ee=R.instanceMatrix),Q==="instanceColor"&&R.instanceColor&&(Ee=R.instanceColor)),xe===void 0||xe.attribute!==Ee||Ee&&xe.data!==Ee.data)return!0;V++}return s.attributesNum!==V||s.index!==X}function v(R,z,W,X){const U={},G=z.attributes;let V=0;const $=W.getAttributes();for(const Q in $)if($[Q].location>=0){let xe=G[Q];xe===void 0&&(Q==="instanceMatrix"&&R.instanceMatrix&&(xe=R.instanceMatrix),Q==="instanceColor"&&R.instanceColor&&(xe=R.instanceColor));const Ee={};Ee.attribute=xe,xe&&xe.data&&(Ee.data=xe.data),U[Q]=Ee,V++}s.attributes=U,s.attributesNum=V,s.index=X}function E(){const R=s.newAttributes;for(let z=0,W=R.length;z<W;z++)R[z]=0}function d(R){f(R,0)}function f(R,z){const W=s.newAttributes,X=s.enabledAttributes,U=s.attributeDivisors;W[R]=1,X[R]===0&&(i.enableVertexAttribArray(R),X[R]=1),U[R]!==z&&(i.vertexAttribDivisor(R,z),U[R]=z)}function M(){const R=s.newAttributes,z=s.enabledAttributes;for(let W=0,X=z.length;W<X;W++)z[W]!==R[W]&&(i.disableVertexAttribArray(W),z[W]=0)}function y(R,z,W,X,U,G,V){V===!0?i.vertexAttribIPointer(R,z,W,U,G):i.vertexAttribPointer(R,z,W,X,U,G)}function b(R,z,W,X){E();const U=X.attributes,G=W.getAttributes(),V=z.defaultAttributeValues;for(const $ in G){const Q=G[$];if(Q.location>=0){let ce=U[$];if(ce===void 0&&($==="instanceMatrix"&&R.instanceMatrix&&(ce=R.instanceMatrix),$==="instanceColor"&&R.instanceColor&&(ce=R.instanceColor)),ce!==void 0){const xe=ce.normalized,Ee=ce.itemSize,Ve=e.get(ce);if(Ve===void 0)continue;const Ye=Ve.buffer,Le=Ve.type,Z=Ve.bytesPerElement,he=Le===i.INT||Le===i.UNSIGNED_INT||ce.gpuType===Ws;if(ce.isInterleavedBufferAttribute){const ie=ce.data,be=ie.stride,we=ce.offset;if(ie.isInstancedInterleavedBuffer){for(let ye=0;ye<Q.locationSize;ye++)f(Q.location+ye,ie.meshPerAttribute);R.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=ie.meshPerAttribute*ie.count)}else for(let ye=0;ye<Q.locationSize;ye++)d(Q.location+ye);i.bindBuffer(i.ARRAY_BUFFER,Ye);for(let ye=0;ye<Q.locationSize;ye++)y(Q.location+ye,Ee/Q.locationSize,Le,xe,be*Z,(we+Ee/Q.locationSize*ye)*Z,he)}else{if(ce.isInstancedBufferAttribute){for(let ie=0;ie<Q.locationSize;ie++)f(Q.location+ie,ce.meshPerAttribute);R.isInstancedMesh!==!0&&X._maxInstanceCount===void 0&&(X._maxInstanceCount=ce.meshPerAttribute*ce.count)}else for(let ie=0;ie<Q.locationSize;ie++)d(Q.location+ie);i.bindBuffer(i.ARRAY_BUFFER,Ye);for(let ie=0;ie<Q.locationSize;ie++)y(Q.location+ie,Ee/Q.locationSize,Le,xe,Ee*Z,Ee/Q.locationSize*ie*Z,he)}}else if(V!==void 0){const xe=V[$];if(xe!==void 0)switch(xe.length){case 2:i.vertexAttrib2fv(Q.location,xe);break;case 3:i.vertexAttrib3fv(Q.location,xe);break;case 4:i.vertexAttrib4fv(Q.location,xe);break;default:i.vertexAttrib1fv(Q.location,xe)}}}}M()}function P(){A();for(const R in n){const z=n[R];for(const W in z){const X=z[W];for(const U in X){const G=X[U];for(const V in G)h(G[V].object),delete G[V];delete X[U]}}delete n[R]}}function T(R){if(n[R.id]===void 0)return;const z=n[R.id];for(const W in z){const X=z[W];for(const U in X){const G=X[U];for(const V in G)h(G[V].object),delete G[V];delete X[U]}}delete n[R.id]}function D(R){for(const z in n){const W=n[z];for(const X in W){const U=W[X];if(U[R.id]===void 0)continue;const G=U[R.id];for(const V in G)h(G[V].object),delete G[V];delete U[R.id]}}}function x(R){for(const z in n){const W=n[z],X=R.isInstancedMesh===!0?R.id:0,U=W[X];if(U!==void 0){for(const G in U){const V=U[G];for(const $ in V)h(V[$].object),delete V[$];delete U[G]}delete W[X],Object.keys(W).length===0&&delete n[z]}}}function A(){I(),a=!0,s!==r&&(s=r,l(s.object))}function I(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:A,resetDefaultState:I,dispose:P,releaseStatesOfGeometry:T,releaseStatesOfObject:x,releaseStatesOfProgram:D,initAttributes:E,enableAttribute:d,disableUnusedAttributes:M}}function lh(i,e,t){let n;function r(c){n=c}function s(c,l){i.drawArrays(n,c,l),t.update(l,n,1)}function a(c,l,h){h!==0&&(i.drawArraysInstanced(n,c,l,h),t.update(l,n,h))}function o(c,l,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,l,0,h);let u=0;for(let _=0;_<h;_++)u+=l[_];t.update(u,n,1)}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o}function ch(i,e,t,n){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const D=e.get("EXT_texture_filter_anisotropic");r=i.getParameter(D.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(D){return!(D!==Vt&&n.convert(D)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(D){const x=D===pn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(D!==Dt&&n.convert(D)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&D!==$t&&!x)}function c(D){if(D==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";D="mediump"}return D==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const h=c(l);h!==l&&(Ae("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const p=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&u===!1&&Ae("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const _=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),v=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_TEXTURE_SIZE),d=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),f=i.getParameter(i.MAX_VERTEX_ATTRIBS),M=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),y=i.getParameter(i.MAX_VARYING_VECTORS),b=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),P=i.getParameter(i.MAX_SAMPLES),T=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:p,reversedDepthBuffer:u,maxTextures:_,maxVertexTextures:v,maxTextureSize:E,maxCubemapSize:d,maxAttributes:f,maxVertexUniforms:M,maxVaryings:y,maxFragmentUniforms:b,maxSamples:P,samples:T}}function uh(i){const e=this;let t=null,n=0,r=!1,s=!1;const a=new In,o=new Ce,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(p,u){const _=p.length!==0||u||n!==0||r;return r=u,n=p.length,_},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(p,u){t=h(p,u,0)},this.setState=function(p,u,_){const v=p.clippingPlanes,E=p.clipIntersection,d=p.clipShadows,f=i.get(p);if(!r||v===null||v.length===0||s&&!d)s?h(null):l();else{const M=s?0:n,y=M*4;let b=f.clippingState||null;c.value=b,b=h(v,u,y,_);for(let P=0;P!==y;++P)b[P]=t[P];f.clippingState=b,this.numIntersection=E?this.numPlanes:0,this.numPlanes+=M}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(p,u,_,v){const E=p!==null?p.length:0;let d=null;if(E!==0){if(d=c.value,v!==!0||d===null){const f=_+E*4,M=u.matrixWorldInverse;o.getNormalMatrix(M),(d===null||d.length<f)&&(d=new Float32Array(f));for(let y=0,b=_;y!==E;++y,b+=4)a.copy(p[y]).applyMatrix4(M,o),a.normal.toArray(d,b),d[b+3]=a.constant}c.value=d,c.needsUpdate=!0}return e.numPlanes=E,e.numIntersection=0,d}}const Rn=4,Wa=[.125,.215,.35,.446,.526,.582],Fn=20,fh=256,xi=new ta,Xa=new je;let qr=null,Yr=0,Kr=0,Zr=!1;const hh=new B;class qa{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,s={}){const{size:a=256,position:o=hh}=s;qr=this._renderer.getRenderTarget(),Yr=this._renderer.getActiveCubeFace(),Kr=this._renderer.getActiveMipmapLevel(),Zr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,r,c,o),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Za(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ka(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(qr,Yr,Kr),this._renderer.xr.enabled=Zr,e.scissorTest=!1,ri(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===zn||e.mapping===li?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),qr=this._renderer.getRenderTarget(),Yr=this._renderer.getActiveCubeFace(),Kr=this._renderer.getActiveMipmapLevel(),Zr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:xt,minFilter:xt,generateMipmaps:!1,type:pn,format:Vt,colorSpace:or,depthBuffer:!1},r=Ya(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ya(e,t,n);const{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=dh(s)),this._blurMaterial=mh(s,e,t),this._ggxMaterial=ph(s,e,t)}return r}_compileMaterial(e){const t=new tn(new nn,e);this._renderer.compile(t,xi)}_sceneToCubeUV(e,t,n,r,s){const c=new zt(90,1,t,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],p=this._renderer,u=p.autoClear,_=p.toneMapping;p.getClearColor(Xa),p.toneMapping=Jt,p.autoClear=!1,p.state.buffers.depth.getReversed()&&(p.setRenderTarget(r),p.clearDepth(),p.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new tn(new Ri,new Fo({name:"PMREM.Background",side:At,depthWrite:!1,depthTest:!1})));const E=this._backgroundBox,d=E.material;let f=!1;const M=e.background;M?M.isColor&&(d.color.copy(M),e.background=null,f=!0):(d.color.copy(Xa),f=!0);for(let y=0;y<6;y++){const b=y%3;b===0?(c.up.set(0,l[y],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x+h[y],s.y,s.z)):b===1?(c.up.set(0,0,l[y]),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y+h[y],s.z)):(c.up.set(0,l[y],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y,s.z+h[y]));const P=this._cubeSize;ri(r,b*P,y>2?P:0,P,P),p.setRenderTarget(r),f&&p.render(E,c),p.render(e,c)}p.toneMapping=_,p.autoClear=u,e.background=M}_textureToCubeUV(e,t){const n=this._renderer,r=e.mapping===zn||e.mapping===li;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Za()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ka());const s=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=s;const o=s.uniforms;o.envMap.value=e;const c=this._cubeSize;ri(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(a,xi)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const r=this._lodMeshes.length;for(let s=1;s<r;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=n}_applyGGXFilter(e,t,n){const r=this._renderer,s=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;const c=a.uniforms,l=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),p=Math.sqrt(l*l-h*h),u=0+l*1.25,_=p*u,{_lodMax:v}=this,E=this._sizeLods[n],d=3*E*(n>v-Rn?n-v+Rn:0),f=4*(this._cubeSize-E);c.envMap.value=e.texture,c.roughness.value=_,c.mipInt.value=v-t,ri(s,d,f,3*E,2*E),r.setRenderTarget(s),r.render(o,xi),c.envMap.value=s.texture,c.roughness.value=0,c.mipInt.value=v-n,ri(e,d,f,3*E,2*E),r.setRenderTarget(e),r.render(o,xi)}_blur(e,t,n,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,"latitudinal",s),this._halfBlur(a,e,n,n,r,"longitudinal",s)}_halfBlur(e,t,n,r,s,a,o){const c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&ke("blur direction must be either latitudinal or longitudinal!");const h=3,p=this._lodMeshes[r];p.material=l;const u=l.uniforms,_=this._sizeLods[n]-1,v=isFinite(s)?Math.PI/(2*_):2*Math.PI/(2*Fn-1),E=s/v,d=isFinite(s)?1+Math.floor(h*E):Fn;d>Fn&&Ae(`sigmaRadians, ${s}, is too large and will clip, as it requested ${d} samples when the maximum is set to ${Fn}`);const f=[];let M=0;for(let D=0;D<Fn;++D){const x=D/E,A=Math.exp(-x*x/2);f.push(A),D===0?M+=A:D<d&&(M+=2*A)}for(let D=0;D<f.length;D++)f[D]=f[D]/M;u.envMap.value=e.texture,u.samples.value=d,u.weights.value=f,u.latitudinal.value=a==="latitudinal",o&&(u.poleAxis.value=o);const{_lodMax:y}=this;u.dTheta.value=v,u.mipInt.value=y-n;const b=this._sizeLods[r],P=3*b*(r>y-Rn?r-y+Rn:0),T=4*(this._cubeSize-b);ri(t,P,T,3*b,2*b),c.setRenderTarget(t),c.render(p,xi)}}function dh(i){const e=[],t=[],n=[];let r=i;const s=i-Rn+1+Wa.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);e.push(o);let c=1/o;a>i-Rn?c=Wa[a-i+Rn-1]:a===0&&(c=0),t.push(c);const l=1/(o-2),h=-l,p=1+l,u=[h,h,p,h,p,p,h,h,p,p,h,p],_=6,v=6,E=3,d=2,f=1,M=new Float32Array(E*v*_),y=new Float32Array(d*v*_),b=new Float32Array(f*v*_);for(let T=0;T<_;T++){const D=T%3*2/3-1,x=T>2?0:-1,A=[D,x,0,D+2/3,x,0,D+2/3,x+1,0,D,x,0,D+2/3,x+1,0,D,x+1,0];M.set(A,E*v*T),y.set(u,d*v*T);const I=[T,T,T,T,T,T];b.set(I,f*v*T)}const P=new nn;P.setAttribute("position",new Ht(M,E)),P.setAttribute("uv",new Ht(y,d)),P.setAttribute("faceIndex",new Ht(b,f)),n.push(new tn(P,null)),r>Rn&&r--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function Ya(i,e,t){const n=new Qt(i,e,t);return n.texture.mapping=hr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function ri(i,e,t,n,r){i.viewport.set(e,t,n,r),i.scissor.set(e,t,n,r)}function ph(i,e,t){return new kt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:fh,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:mr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:fn,depthTest:!1,depthWrite:!1})}function mh(i,e,t){const n=new Float32Array(Fn),r=new B(0,1,0);return new kt({name:"SphericalGaussianBlur",defines:{n:Fn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:mr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:fn,depthTest:!1,depthWrite:!1})}function Ka(){return new kt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:mr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:fn,depthTest:!1,depthWrite:!1})}function Za(){return new kt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:mr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:fn,depthTest:!1,depthWrite:!1})}function mr(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class Xo extends Qt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new zo(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Ri(5,5,5),s=new kt({name:"CubemapFromEquirect",uniforms:ui(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:At,blending:fn});s.uniforms.tEquirect.value=t;const a=new tn(r,s),o=t.minFilter;return t.minFilter===On&&(t.minFilter=xt),new Sc(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,r);e.setRenderTarget(s)}}function _h(i){let e=new WeakMap,t=new WeakMap,n=null;function r(u,_=!1){return u==null?null:_?a(u):s(u)}function s(u){if(u&&u.isTexture){const _=u.mapping;if(_===vr||_===Sr)if(e.has(u)){const v=e.get(u).texture;return o(v,u.mapping)}else{const v=u.image;if(v&&v.height>0){const E=new Xo(v.height);return E.fromEquirectangularTexture(i,u),e.set(u,E),u.addEventListener("dispose",l),o(E.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){const _=u.mapping,v=_===vr||_===Sr,E=_===zn||_===li;if(v||E){let d=t.get(u);const f=d!==void 0?d.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==f)return n===null&&(n=new qa(i)),d=v?n.fromEquirectangular(u,d):n.fromCubemap(u,d),d.texture.pmremVersion=u.pmremVersion,t.set(u,d),d.texture;if(d!==void 0)return d.texture;{const M=u.image;return v&&M&&M.height>0||E&&M&&c(M)?(n===null&&(n=new qa(i)),d=v?n.fromEquirectangular(u):n.fromCubemap(u),d.texture.pmremVersion=u.pmremVersion,t.set(u,d),u.addEventListener("dispose",h),d.texture):null}}}return u}function o(u,_){return _===vr?u.mapping=zn:_===Sr&&(u.mapping=li),u}function c(u){let _=0;const v=6;for(let E=0;E<v;E++)u[E]!==void 0&&_++;return _===v}function l(u){const _=u.target;_.removeEventListener("dispose",l);const v=e.get(_);v!==void 0&&(e.delete(_),v.dispose())}function h(u){const _=u.target;_.removeEventListener("dispose",h);const v=t.get(_);v!==void 0&&(t.delete(_),v.dispose())}function p(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:r,dispose:p}}function gh(i){const e={};function t(n){if(e[n]!==void 0)return e[n];const r=i.getExtension(n);return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const r=t(n);return r===null&&zs("WebGLRenderer: "+n+" extension not supported."),r}}}function xh(i,e,t,n){const r={},s=new WeakMap;function a(p){const u=p.target;u.index!==null&&e.remove(u.index);for(const v in u.attributes)e.remove(u.attributes[v]);u.removeEventListener("dispose",a),delete r[u.id];const _=s.get(u);_&&(e.remove(_),s.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function o(p,u){return r[u.id]===!0||(u.addEventListener("dispose",a),r[u.id]=!0,t.memory.geometries++),u}function c(p){const u=p.attributes;for(const _ in u)e.update(u[_],i.ARRAY_BUFFER)}function l(p){const u=[],_=p.index,v=p.attributes.position;let E=0;if(v===void 0)return;if(_!==null){const M=_.array;E=_.version;for(let y=0,b=M.length;y<b;y+=3){const P=M[y+0],T=M[y+1],D=M[y+2];u.push(P,T,T,D,D,P)}}else{const M=v.array;E=v.version;for(let y=0,b=M.length/3-1;y<b;y+=3){const P=y+0,T=y+1,D=y+2;u.push(P,T,T,D,D,P)}}const d=new(v.count>=65535?No:Io)(u,1);d.version=E;const f=s.get(p);f&&e.remove(f),s.set(p,d)}function h(p){const u=s.get(p);if(u){const _=p.index;_!==null&&u.version<_.version&&l(p)}else l(p);return s.get(p)}return{get:o,update:c,getWireframeAttribute:h}}function vh(i,e,t){let n;function r(p){n=p}let s,a;function o(p){s=p.type,a=p.bytesPerElement}function c(p,u){i.drawElements(n,u,s,p*a),t.update(u,n,1)}function l(p,u,_){_!==0&&(i.drawElementsInstanced(n,u,s,p*a,_),t.update(u,n,_))}function h(p,u,_){if(_===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,s,p,0,_);let E=0;for(let d=0;d<_;d++)E+=u[d];t.update(E,n,1)}this.setMode=r,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h}function Sh(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(s/3);break;case i.LINES:t.lines+=o*(s/2);break;case i.LINE_STRIP:t.lines+=o*(s-1);break;case i.LINE_LOOP:t.lines+=o*s;break;case i.POINTS:t.points+=o*s;break;default:ke("WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function Mh(i,e,t){const n=new WeakMap,r=new ut;function s(a,o,c){const l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,p=h!==void 0?h.length:0;let u=n.get(o);if(u===void 0||u.count!==p){let A=function(){D.dispose(),n.delete(o),o.removeEventListener("dispose",A)};u!==void 0&&u.texture.dispose();const _=o.morphAttributes.position!==void 0,v=o.morphAttributes.normal!==void 0,E=o.morphAttributes.color!==void 0,d=o.morphAttributes.position||[],f=o.morphAttributes.normal||[],M=o.morphAttributes.color||[];let y=0;_===!0&&(y=1),v===!0&&(y=2),E===!0&&(y=3);let b=o.attributes.position.count*y,P=1;b>e.maxTextureSize&&(P=Math.ceil(b/e.maxTextureSize),b=e.maxTextureSize);const T=new Float32Array(b*P*4*p),D=new Do(T,b,P,p);D.type=$t,D.needsUpdate=!0;const x=y*4;for(let I=0;I<p;I++){const R=d[I],z=f[I],W=M[I],X=b*P*4*I;for(let U=0;U<R.count;U++){const G=U*x;_===!0&&(r.fromBufferAttribute(R,U),T[X+G+0]=r.x,T[X+G+1]=r.y,T[X+G+2]=r.z,T[X+G+3]=0),v===!0&&(r.fromBufferAttribute(z,U),T[X+G+4]=r.x,T[X+G+5]=r.y,T[X+G+6]=r.z,T[X+G+7]=0),E===!0&&(r.fromBufferAttribute(W,U),T[X+G+8]=r.x,T[X+G+9]=r.y,T[X+G+10]=r.z,T[X+G+11]=W.itemSize===4?r.w:1)}}u={count:p,texture:D,size:new qe(b,P)},n.set(o,u),o.addEventListener("dispose",A)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let _=0;for(let E=0;E<l.length;E++)_+=l[E];const v=o.morphTargetsRelative?1:1-_;c.getUniforms().setValue(i,"morphTargetBaseInfluence",v),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",u.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:s}}function Eh(i,e,t,n,r){let s=new WeakMap;function a(l){const h=r.render.frame,p=l.geometry,u=e.get(l,p);if(s.get(u)!==h&&(e.update(u),s.set(u,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),s.get(l)!==h&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),s.set(l,h))),l.isSkinnedMesh){const _=l.skeleton;s.get(_)!==h&&(_.update(),s.set(_,h))}return u}function o(){s=new WeakMap}function c(l){const h=l.target;h.removeEventListener("dispose",c),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:a,dispose:o}}const Th={[_o]:"LINEAR_TONE_MAPPING",[go]:"REINHARD_TONE_MAPPING",[xo]:"CINEON_TONE_MAPPING",[vo]:"ACES_FILMIC_TONE_MAPPING",[Mo]:"AGX_TONE_MAPPING",[Eo]:"NEUTRAL_TONE_MAPPING",[So]:"CUSTOM_TONE_MAPPING"};function bh(i,e,t,n,r){const s=new Qt(e,t,{type:i,depthBuffer:n,stencilBuffer:r,depthTexture:n?new ci(e,t):void 0}),a=new Qt(e,t,{type:pn,depthBuffer:!1,stencilBuffer:!1}),o=new nn;o.setAttribute("position",new dn([-1,3,0,-1,-1,0,3,-1,0],3)),o.setAttribute("uv",new dn([0,2,0,0,2,0],2));const c=new gc({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),l=new tn(o,c),h=new ta(-1,1,1,-1,0,1);let p=null,u=null,_=!1,v,E=null,d=[],f=!1;this.setSize=function(M,y){s.setSize(M,y),a.setSize(M,y);for(let b=0;b<d.length;b++){const P=d[b];P.setSize&&P.setSize(M,y)}},this.setEffects=function(M){d=M,f=d.length>0&&d[0].isRenderPass===!0;const y=s.width,b=s.height;for(let P=0;P<d.length;P++){const T=d[P];T.setSize&&T.setSize(y,b)}},this.begin=function(M,y){if(_||M.toneMapping===Jt&&d.length===0)return!1;if(E=y,y!==null){const b=y.width,P=y.height;(s.width!==b||s.height!==P)&&this.setSize(b,P)}return f===!1&&M.setRenderTarget(s),v=M.toneMapping,M.toneMapping=Jt,!0},this.hasRenderPass=function(){return f},this.end=function(M,y){M.toneMapping=v,_=!0;let b=s,P=a;for(let T=0;T<d.length;T++){const D=d[T];if(D.enabled!==!1&&(D.render(M,P,b,y),D.needsSwap!==!1)){const x=b;b=P,P=x}}if(p!==M.outputColorSpace||u!==M.toneMapping){p=M.outputColorSpace,u=M.toneMapping,c.defines={},ze.getTransfer(p)===Xe&&(c.defines.SRGB_TRANSFER="");const T=Th[u];T&&(c.defines[T]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=b.texture,M.setRenderTarget(E),M.render(l,h),E=null,_=!1},this.isCompositing=function(){return _},this.dispose=function(){s.depthTexture&&s.depthTexture.dispose(),s.dispose(),a.dispose(),o.dispose(),c.dispose()}}const qo=new bt,Vs=new ci(1,1),Yo=new Do,Ko=new Kl,Zo=new zo,$a=[],ja=[],Ja=new Float32Array(16),Qa=new Float32Array(9),eo=new Float32Array(4);function hi(i,e,t){const n=i[0];if(n<=0||n>0)return i;const r=e*t;let s=$a[r];if(s===void 0&&(s=new Float32Array(r),$a[r]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(s,o)}return s}function mt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function _t(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function _r(i,e){let t=ja[e];t===void 0&&(t=new Int32Array(e),ja[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function yh(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Ah(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(mt(t,e))return;i.uniform2fv(this.addr,e),_t(t,e)}}function Rh(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(mt(t,e))return;i.uniform3fv(this.addr,e),_t(t,e)}}function wh(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(mt(t,e))return;i.uniform4fv(this.addr,e),_t(t,e)}}function Ch(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(mt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),_t(t,e)}else{if(mt(t,n))return;eo.set(n),i.uniformMatrix2fv(this.addr,!1,eo),_t(t,n)}}function Ph(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(mt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),_t(t,e)}else{if(mt(t,n))return;Qa.set(n),i.uniformMatrix3fv(this.addr,!1,Qa),_t(t,n)}}function Dh(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(mt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),_t(t,e)}else{if(mt(t,n))return;Ja.set(n),i.uniformMatrix4fv(this.addr,!1,Ja),_t(t,n)}}function Lh(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function Uh(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(mt(t,e))return;i.uniform2iv(this.addr,e),_t(t,e)}}function Ih(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(mt(t,e))return;i.uniform3iv(this.addr,e),_t(t,e)}}function Nh(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(mt(t,e))return;i.uniform4iv(this.addr,e),_t(t,e)}}function Fh(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function Oh(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(mt(t,e))return;i.uniform2uiv(this.addr,e),_t(t,e)}}function Bh(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(mt(t,e))return;i.uniform3uiv(this.addr,e),_t(t,e)}}function zh(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(mt(t,e))return;i.uniform4uiv(this.addr,e),_t(t,e)}}function Gh(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?(Vs.compareFunction=t.isReversedDepthBuffer()?Js:js,s=Vs):s=qo,t.setTexture2D(e||s,r)}function Vh(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||Ko,r)}function Hh(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||Zo,r)}function kh(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||Yo,r)}function Wh(i){switch(i){case 5126:return yh;case 35664:return Ah;case 35665:return Rh;case 35666:return wh;case 35674:return Ch;case 35675:return Ph;case 35676:return Dh;case 5124:case 35670:return Lh;case 35667:case 35671:return Uh;case 35668:case 35672:return Ih;case 35669:case 35673:return Nh;case 5125:return Fh;case 36294:return Oh;case 36295:return Bh;case 36296:return zh;case 35678:case 36198:case 36298:case 36306:case 35682:return Gh;case 35679:case 36299:case 36307:return Vh;case 35680:case 36300:case 36308:case 36293:return Hh;case 36289:case 36303:case 36311:case 36292:return kh}}function Xh(i,e){i.uniform1fv(this.addr,e)}function qh(i,e){const t=hi(e,this.size,2);i.uniform2fv(this.addr,t)}function Yh(i,e){const t=hi(e,this.size,3);i.uniform3fv(this.addr,t)}function Kh(i,e){const t=hi(e,this.size,4);i.uniform4fv(this.addr,t)}function Zh(i,e){const t=hi(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function $h(i,e){const t=hi(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function jh(i,e){const t=hi(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Jh(i,e){i.uniform1iv(this.addr,e)}function Qh(i,e){i.uniform2iv(this.addr,e)}function ed(i,e){i.uniform3iv(this.addr,e)}function td(i,e){i.uniform4iv(this.addr,e)}function nd(i,e){i.uniform1uiv(this.addr,e)}function id(i,e){i.uniform2uiv(this.addr,e)}function rd(i,e){i.uniform3uiv(this.addr,e)}function sd(i,e){i.uniform4uiv(this.addr,e)}function ad(i,e,t){const n=this.cache,r=e.length,s=_r(t,r);mt(n,s)||(i.uniform1iv(this.addr,s),_t(n,s));let a;this.type===i.SAMPLER_2D_SHADOW?a=Vs:a=qo;for(let o=0;o!==r;++o)t.setTexture2D(e[o]||a,s[o])}function od(i,e,t){const n=this.cache,r=e.length,s=_r(t,r);mt(n,s)||(i.uniform1iv(this.addr,s),_t(n,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||Ko,s[a])}function ld(i,e,t){const n=this.cache,r=e.length,s=_r(t,r);mt(n,s)||(i.uniform1iv(this.addr,s),_t(n,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||Zo,s[a])}function cd(i,e,t){const n=this.cache,r=e.length,s=_r(t,r);mt(n,s)||(i.uniform1iv(this.addr,s),_t(n,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||Yo,s[a])}function ud(i){switch(i){case 5126:return Xh;case 35664:return qh;case 35665:return Yh;case 35666:return Kh;case 35674:return Zh;case 35675:return $h;case 35676:return jh;case 5124:case 35670:return Jh;case 35667:case 35671:return Qh;case 35668:case 35672:return ed;case 35669:case 35673:return td;case 5125:return nd;case 36294:return id;case 36295:return rd;case 36296:return sd;case 35678:case 36198:case 36298:case 36306:case 35682:return ad;case 35679:case 36299:case 36307:return od;case 35680:case 36300:case 36308:case 36293:return ld;case 36289:case 36303:case 36311:case 36292:return cd}}class fd{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Wh(t.type)}}class hd{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=ud(t.type)}}class dd{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],n)}}}const $r=/(\w+)(\])?(\[|\.)?/g;function to(i,e){i.seq.push(e),i.map[e.id]=e}function pd(i,e,t){const n=i.name,r=n.length;for($r.lastIndex=0;;){const s=$r.exec(n),a=$r.lastIndex;let o=s[1];const c=s[2]==="]",l=s[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===r){to(t,l===void 0?new fd(o,i,e):new hd(o,i,e));break}else{let p=t.map[o];p===void 0&&(p=new dd(o),to(t,p)),t=p}}}class rr{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){const o=e.getActiveUniform(t,a),c=e.getUniformLocation(t,o.name);pd(o,c,this)}const r=[],s=[];for(const a of this.seq)a.type===e.SAMPLER_2D_SHADOW||a.type===e.SAMPLER_CUBE_SHADOW||a.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(a):s.push(a);r.length>0&&(this.seq=r.concat(s))}setValue(e,t,n,r){const s=this.map[t];s!==void 0&&s.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&n.push(a)}return n}}function no(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const md=37297;let _d=0;function gd(i,e){const t=i.split(`
`),n=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}const io=new Ce;function xd(i){ze._getMatrix(io,ze.workingColorSpace,i);const e=`mat3( ${io.elements.map(t=>t.toFixed(4))} )`;switch(ze.getTransfer(i)){case lr:return[e,"LinearTransferOETF"];case Xe:return[e,"sRGBTransferOETF"];default:return Ae("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function ro(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),s=(i.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";const a=/ERROR: 0:(\d+)/.exec(s);if(a){const o=parseInt(a[1]);return t.toUpperCase()+`

`+s+`

`+gd(i.getShaderSource(e),o)}else return s}function vd(i,e){const t=xd(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const Sd={[_o]:"Linear",[go]:"Reinhard",[xo]:"Cineon",[vo]:"ACESFilmic",[Mo]:"AgX",[Eo]:"Neutral",[So]:"Custom"};function Md(i,e){const t=Sd[e];return t===void 0?(Ae("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Ji=new B;function Ed(){ze.getLuminanceCoefficients(Ji);const i=Ji.x.toFixed(4),e=Ji.y.toFixed(4),t=Ji.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Td(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Mi).join(`
`)}function bd(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function yd(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(e,r),a=s.name;let o=1;s.type===i.FLOAT_MAT2&&(o=2),s.type===i.FLOAT_MAT3&&(o=3),s.type===i.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Mi(i){return i!==""}function so(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function ao(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Ad=/^[ \t]*#include +<([\w\d./]+)>/gm;function Hs(i){return i.replace(Ad,wd)}const Rd=new Map;function wd(i,e){let t=Ie[e];if(t===void 0){const n=Rd.get(e);if(n!==void 0)t=Ie[n],Ae('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Hs(t)}const Cd=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function oo(i){return i.replace(Cd,Pd)}function Pd(i,e,t,n){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function lo(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const Dd={[Qi]:"SHADOWMAP_TYPE_PCF",[Si]:"SHADOWMAP_TYPE_VSM"};function Ld(i){return Dd[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const Ud={[zn]:"ENVMAP_TYPE_CUBE",[li]:"ENVMAP_TYPE_CUBE",[hr]:"ENVMAP_TYPE_CUBE_UV"};function Id(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Ud[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const Nd={[li]:"ENVMAP_MODE_REFRACTION"};function Fd(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Nd[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const Od={[mo]:"ENVMAP_BLENDING_MULTIPLY",[Rl]:"ENVMAP_BLENDING_MIX",[wl]:"ENVMAP_BLENDING_ADD"};function Bd(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Od[i.combine]||"ENVMAP_BLENDING_NONE"}function zd(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function Gd(i,e,t,n){const r=i.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const c=Ld(t),l=Id(t),h=Fd(t),p=Bd(t),u=zd(t),_=Td(t),v=bd(s),E=r.createProgram();let d,f,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(d=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(Mi).join(`
`),d.length>0&&(d+=`
`),f=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(Mi).join(`
`),f.length>0&&(f+=`
`)):(d=[lo(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Mi).join(`
`),f=[lo(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+p:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Jt?"#define TONE_MAPPING":"",t.toneMapping!==Jt?Ie.tonemapping_pars_fragment:"",t.toneMapping!==Jt?Md("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ie.colorspace_pars_fragment,vd("linearToOutputTexel",t.outputColorSpace),Ed(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Mi).join(`
`)),a=Hs(a),a=so(a,t),a=ao(a,t),o=Hs(o),o=so(o,t),o=ao(o,t),a=oo(a),o=oo(o),t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,d=[_,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+d,f=["#define varying in",t.glslVersion===Ea?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Ea?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);const y=M+d+a,b=M+f+o,P=no(r,r.VERTEX_SHADER,y),T=no(r,r.FRAGMENT_SHADER,b);r.attachShader(E,P),r.attachShader(E,T),t.index0AttributeName!==void 0?r.bindAttribLocation(E,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(E,0,"position"),r.linkProgram(E);function D(R){if(i.debug.checkShaderErrors){const z=r.getProgramInfoLog(E)||"",W=r.getShaderInfoLog(P)||"",X=r.getShaderInfoLog(T)||"",U=z.trim(),G=W.trim(),V=X.trim();let $=!0,Q=!0;if(r.getProgramParameter(E,r.LINK_STATUS)===!1)if($=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,E,P,T);else{const ce=ro(r,P,"vertex"),xe=ro(r,T,"fragment");ke("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(E,r.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+U+`
`+ce+`
`+xe)}else U!==""?Ae("WebGLProgram: Program Info Log:",U):(G===""||V==="")&&(Q=!1);Q&&(R.diagnostics={runnable:$,programLog:U,vertexShader:{log:G,prefix:d},fragmentShader:{log:V,prefix:f}})}r.deleteShader(P),r.deleteShader(T),x=new rr(r,E),A=yd(r,E)}let x;this.getUniforms=function(){return x===void 0&&D(this),x};let A;this.getAttributes=function(){return A===void 0&&D(this),A};let I=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return I===!1&&(I=r.getProgramParameter(E,md)),I},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(E),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=_d++,this.cacheKey=e,this.usedTimes=1,this.program=E,this.vertexShader=P,this.fragmentShader=T,this}let Vd=0;class Hd{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new kd(e),t.set(e,n)),n}}class kd{constructor(e){this.id=Vd++,this.code=e,this.usedTimes=0}}function Wd(i){return i===Gn||i===sr||i===ar}function Xd(i,e,t,n,r,s){const a=new Lo,o=new Hd,c=new Set,l=[],h=new Map,p=n.logarithmicDepthBuffer;let u=n.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(x){return c.add(x),x===0?"uv":`uv${x}`}function E(x,A,I,R,z,W){const X=R.fog,U=z.geometry,G=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?R.environment:null,V=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,$=e.get(x.envMap||G,V),Q=$&&$.mapping===hr?$.image.height:null,ce=_[x.type];x.precision!==null&&(u=n.getMaxPrecision(x.precision),u!==x.precision&&Ae("WebGLProgram.getParameters:",x.precision,"not supported, using",u,"instead."));const xe=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,Ee=xe!==void 0?xe.length:0;let Ve=0;U.morphAttributes.position!==void 0&&(Ve=1),U.morphAttributes.normal!==void 0&&(Ve=2),U.morphAttributes.color!==void 0&&(Ve=3);let Ye,Le,Z,he;if(ce){const Pe=Kt[ce];Ye=Pe.vertexShader,Le=Pe.fragmentShader}else Ye=x.vertexShader,Le=x.fragmentShader,o.update(x),Z=o.getVertexShaderID(x),he=o.getFragmentShaderID(x);const ie=i.getRenderTarget(),be=i.state.buffers.depth.getReversed(),we=z.isInstancedMesh===!0,ye=z.isBatchedMesh===!0,it=!!x.map,Oe=!!x.matcap,Ke=!!$,nt=!!x.aoMap,Fe=!!x.lightMap,ht=!!x.bumpMap,rt=!!x.normalMap,Rt=!!x.displacementMap,C=!!x.emissiveMap,dt=!!x.metalnessMap,Be=!!x.roughnessMap,et=x.anisotropy>0,oe=x.clearcoat>0,st=x.dispersion>0,S=x.iridescence>0,m=x.sheen>0,N=x.transmission>0,Y=et&&!!x.anisotropyMap,J=oe&&!!x.clearcoatMap,ee=oe&&!!x.clearcoatNormalMap,ae=oe&&!!x.clearcoatRoughnessMap,k=S&&!!x.iridescenceMap,K=S&&!!x.iridescenceThicknessMap,de=m&&!!x.sheenColorMap,_e=m&&!!x.sheenRoughnessMap,re=!!x.specularMap,te=!!x.specularColorMap,Re=!!x.specularIntensityMap,Ue=N&&!!x.transmissionMap,We=N&&!!x.thicknessMap,w=!!x.gradientMap,ne=!!x.alphaMap,q=x.alphaTest>0,pe=!!x.alphaHash,se=!!x.extensions;let j=Jt;x.toneMapped&&(ie===null||ie.isXRRenderTarget===!0)&&(j=i.toneMapping);const Se={shaderID:ce,shaderType:x.type,shaderName:x.name,vertexShader:Ye,fragmentShader:Le,defines:x.defines,customVertexShaderID:Z,customFragmentShaderID:he,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:u,batching:ye,batchingColor:ye&&z._colorsTexture!==null,instancing:we,instancingColor:we&&z.instanceColor!==null,instancingMorph:we&&z.morphTexture!==null,outputColorSpace:ie===null?i.outputColorSpace:ie.isXRRenderTarget===!0?ie.texture.colorSpace:ze.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:it,matcap:Oe,envMap:Ke,envMapMode:Ke&&$.mapping,envMapCubeUVHeight:Q,aoMap:nt,lightMap:Fe,bumpMap:ht,normalMap:rt,displacementMap:Rt,emissiveMap:C,normalMapObjectSpace:rt&&x.normalMapType===Dl,normalMapTangentSpace:rt&&x.normalMapType===va,packedNormalMap:rt&&x.normalMapType===va&&Wd(x.normalMap.format),metalnessMap:dt,roughnessMap:Be,anisotropy:et,anisotropyMap:Y,clearcoat:oe,clearcoatMap:J,clearcoatNormalMap:ee,clearcoatRoughnessMap:ae,dispersion:st,iridescence:S,iridescenceMap:k,iridescenceThicknessMap:K,sheen:m,sheenColorMap:de,sheenRoughnessMap:_e,specularMap:re,specularColorMap:te,specularIntensityMap:Re,transmission:N,transmissionMap:Ue,thicknessMap:We,gradientMap:w,opaque:x.transparent===!1&&x.blending===si&&x.alphaToCoverage===!1,alphaMap:ne,alphaTest:q,alphaHash:pe,combine:x.combine,mapUv:it&&v(x.map.channel),aoMapUv:nt&&v(x.aoMap.channel),lightMapUv:Fe&&v(x.lightMap.channel),bumpMapUv:ht&&v(x.bumpMap.channel),normalMapUv:rt&&v(x.normalMap.channel),displacementMapUv:Rt&&v(x.displacementMap.channel),emissiveMapUv:C&&v(x.emissiveMap.channel),metalnessMapUv:dt&&v(x.metalnessMap.channel),roughnessMapUv:Be&&v(x.roughnessMap.channel),anisotropyMapUv:Y&&v(x.anisotropyMap.channel),clearcoatMapUv:J&&v(x.clearcoatMap.channel),clearcoatNormalMapUv:ee&&v(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ae&&v(x.clearcoatRoughnessMap.channel),iridescenceMapUv:k&&v(x.iridescenceMap.channel),iridescenceThicknessMapUv:K&&v(x.iridescenceThicknessMap.channel),sheenColorMapUv:de&&v(x.sheenColorMap.channel),sheenRoughnessMapUv:_e&&v(x.sheenRoughnessMap.channel),specularMapUv:re&&v(x.specularMap.channel),specularColorMapUv:te&&v(x.specularColorMap.channel),specularIntensityMapUv:Re&&v(x.specularIntensityMap.channel),transmissionMapUv:Ue&&v(x.transmissionMap.channel),thicknessMapUv:We&&v(x.thicknessMap.channel),alphaMapUv:ne&&v(x.alphaMap.channel),vertexTangents:!!U.attributes.tangent&&(rt||et),vertexNormals:!!U.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,pointsUvs:z.isPoints===!0&&!!U.attributes.uv&&(it||ne),fog:!!X,useFog:x.fog===!0,fogExp2:!!X&&X.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||U.attributes.normal===void 0&&rt===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:p,reversedDepthBuffer:be,skinning:z.isSkinnedMesh===!0,morphTargets:U.morphAttributes.position!==void 0,morphNormals:U.morphAttributes.normal!==void 0,morphColors:U.morphAttributes.color!==void 0,morphTargetsCount:Ee,morphTextureStride:Ve,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numLightProbeGrids:W.length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&I.length>0,shadowMapType:i.shadowMap.type,toneMapping:j,decodeVideoTexture:it&&x.map.isVideoTexture===!0&&ze.getTransfer(x.map.colorSpace)===Xe,decodeVideoTextureEmissive:C&&x.emissiveMap.isVideoTexture===!0&&ze.getTransfer(x.emissiveMap.colorSpace)===Xe,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===un,flipSided:x.side===At,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:se&&x.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(se&&x.extensions.multiDraw===!0||ye)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return Se.vertexUv1s=c.has(1),Se.vertexUv2s=c.has(2),Se.vertexUv3s=c.has(3),c.clear(),Se}function d(x){const A=[];if(x.shaderID?A.push(x.shaderID):(A.push(x.customVertexShaderID),A.push(x.customFragmentShaderID)),x.defines!==void 0)for(const I in x.defines)A.push(I),A.push(x.defines[I]);return x.isRawShaderMaterial===!1&&(f(A,x),M(A,x),A.push(i.outputColorSpace)),A.push(x.customProgramCacheKey),A.join()}function f(x,A){x.push(A.precision),x.push(A.outputColorSpace),x.push(A.envMapMode),x.push(A.envMapCubeUVHeight),x.push(A.mapUv),x.push(A.alphaMapUv),x.push(A.lightMapUv),x.push(A.aoMapUv),x.push(A.bumpMapUv),x.push(A.normalMapUv),x.push(A.displacementMapUv),x.push(A.emissiveMapUv),x.push(A.metalnessMapUv),x.push(A.roughnessMapUv),x.push(A.anisotropyMapUv),x.push(A.clearcoatMapUv),x.push(A.clearcoatNormalMapUv),x.push(A.clearcoatRoughnessMapUv),x.push(A.iridescenceMapUv),x.push(A.iridescenceThicknessMapUv),x.push(A.sheenColorMapUv),x.push(A.sheenRoughnessMapUv),x.push(A.specularMapUv),x.push(A.specularColorMapUv),x.push(A.specularIntensityMapUv),x.push(A.transmissionMapUv),x.push(A.thicknessMapUv),x.push(A.combine),x.push(A.fogExp2),x.push(A.sizeAttenuation),x.push(A.morphTargetsCount),x.push(A.morphAttributeCount),x.push(A.numDirLights),x.push(A.numPointLights),x.push(A.numSpotLights),x.push(A.numSpotLightMaps),x.push(A.numHemiLights),x.push(A.numRectAreaLights),x.push(A.numDirLightShadows),x.push(A.numPointLightShadows),x.push(A.numSpotLightShadows),x.push(A.numSpotLightShadowsWithMaps),x.push(A.numLightProbes),x.push(A.shadowMapType),x.push(A.toneMapping),x.push(A.numClippingPlanes),x.push(A.numClipIntersection),x.push(A.depthPacking)}function M(x,A){a.disableAll(),A.instancing&&a.enable(0),A.instancingColor&&a.enable(1),A.instancingMorph&&a.enable(2),A.matcap&&a.enable(3),A.envMap&&a.enable(4),A.normalMapObjectSpace&&a.enable(5),A.normalMapTangentSpace&&a.enable(6),A.clearcoat&&a.enable(7),A.iridescence&&a.enable(8),A.alphaTest&&a.enable(9),A.vertexColors&&a.enable(10),A.vertexAlphas&&a.enable(11),A.vertexUv1s&&a.enable(12),A.vertexUv2s&&a.enable(13),A.vertexUv3s&&a.enable(14),A.vertexTangents&&a.enable(15),A.anisotropy&&a.enable(16),A.alphaHash&&a.enable(17),A.batching&&a.enable(18),A.dispersion&&a.enable(19),A.batchingColor&&a.enable(20),A.gradientMap&&a.enable(21),A.packedNormalMap&&a.enable(22),A.vertexNormals&&a.enable(23),x.push(a.mask),a.disableAll(),A.fog&&a.enable(0),A.useFog&&a.enable(1),A.flatShading&&a.enable(2),A.logarithmicDepthBuffer&&a.enable(3),A.reversedDepthBuffer&&a.enable(4),A.skinning&&a.enable(5),A.morphTargets&&a.enable(6),A.morphNormals&&a.enable(7),A.morphColors&&a.enable(8),A.premultipliedAlpha&&a.enable(9),A.shadowMapEnabled&&a.enable(10),A.doubleSided&&a.enable(11),A.flipSided&&a.enable(12),A.useDepthPacking&&a.enable(13),A.dithering&&a.enable(14),A.transmission&&a.enable(15),A.sheen&&a.enable(16),A.opaque&&a.enable(17),A.pointsUvs&&a.enable(18),A.decodeVideoTexture&&a.enable(19),A.decodeVideoTextureEmissive&&a.enable(20),A.alphaToCoverage&&a.enable(21),A.numLightProbeGrids>0&&a.enable(22),x.push(a.mask)}function y(x){const A=_[x.type];let I;if(A){const R=Kt[A];I=pc.clone(R.uniforms)}else I=x.uniforms;return I}function b(x,A){let I=h.get(A);return I!==void 0?++I.usedTimes:(I=new Gd(i,A,x,r),l.push(I),h.set(A,I)),I}function P(x){if(--x.usedTimes===0){const A=l.indexOf(x);l[A]=l[l.length-1],l.pop(),h.delete(x.cacheKey),x.destroy()}}function T(x){o.remove(x)}function D(){o.dispose()}return{getParameters:E,getProgramCacheKey:d,getUniforms:y,acquireProgram:b,releaseProgram:P,releaseShaderCache:T,programs:l,dispose:D}}function qd(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function r(a,o,c){i.get(a)[o]=c}function s(){i=new WeakMap}return{has:e,get:t,remove:n,update:r,dispose:s}}function Yd(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function co(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function uo(){const i=[];let e=0;const t=[],n=[],r=[];function s(){e=0,t.length=0,n.length=0,r.length=0}function a(u){let _=0;return u.isInstancedMesh&&(_+=2),u.isSkinnedMesh&&(_+=1),_}function o(u,_,v,E,d,f){let M=i[e];return M===void 0?(M={id:u.id,object:u,geometry:_,material:v,materialVariant:a(u),groupOrder:E,renderOrder:u.renderOrder,z:d,group:f},i[e]=M):(M.id=u.id,M.object=u,M.geometry=_,M.material=v,M.materialVariant=a(u),M.groupOrder=E,M.renderOrder=u.renderOrder,M.z=d,M.group=f),e++,M}function c(u,_,v,E,d,f){const M=o(u,_,v,E,d,f);v.transmission>0?n.push(M):v.transparent===!0?r.push(M):t.push(M)}function l(u,_,v,E,d,f){const M=o(u,_,v,E,d,f);v.transmission>0?n.unshift(M):v.transparent===!0?r.unshift(M):t.unshift(M)}function h(u,_){t.length>1&&t.sort(u||Yd),n.length>1&&n.sort(_||co),r.length>1&&r.sort(_||co)}function p(){for(let u=e,_=i.length;u<_;u++){const v=i[u];if(v.id===null)break;v.id=null,v.object=null,v.geometry=null,v.material=null,v.group=null}}return{opaque:t,transmissive:n,transparent:r,init:s,push:c,unshift:l,finish:p,sort:h}}function Kd(){let i=new WeakMap;function e(n,r){const s=i.get(n);let a;return s===void 0?(a=new uo,i.set(n,[a])):r>=s.length?(a=new uo,s.push(a)):a=s[r],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function Zd(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new B,color:new je};break;case"SpotLight":t={position:new B,direction:new B,color:new je,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new B,color:new je,distance:0,decay:0};break;case"HemisphereLight":t={direction:new B,skyColor:new je,groundColor:new je};break;case"RectAreaLight":t={color:new je,position:new B,halfWidth:new B,halfHeight:new B};break}return i[e.id]=t,t}}}function $d(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new qe};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new qe};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new qe,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let jd=0;function Jd(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Qd(i){const e=new Zd,t=$d(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new B);const r=new B,s=new pt,a=new pt;function o(l){let h=0,p=0,u=0;for(let A=0;A<9;A++)n.probe[A].set(0,0,0);let _=0,v=0,E=0,d=0,f=0,M=0,y=0,b=0,P=0,T=0,D=0;l.sort(Jd);for(let A=0,I=l.length;A<I;A++){const R=l[A],z=R.color,W=R.intensity,X=R.distance;let U=null;if(R.shadow&&R.shadow.map&&(R.shadow.map.texture.format===Gn?U=R.shadow.map.texture:U=R.shadow.map.depthTexture||R.shadow.map.texture),R.isAmbientLight)h+=z.r*W,p+=z.g*W,u+=z.b*W;else if(R.isLightProbe){for(let G=0;G<9;G++)n.probe[G].addScaledVector(R.sh.coefficients[G],W);D++}else if(R.isDirectionalLight){const G=e.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const V=R.shadow,$=t.get(R);$.shadowIntensity=V.intensity,$.shadowBias=V.bias,$.shadowNormalBias=V.normalBias,$.shadowRadius=V.radius,$.shadowMapSize=V.mapSize,n.directionalShadow[_]=$,n.directionalShadowMap[_]=U,n.directionalShadowMatrix[_]=R.shadow.matrix,M++}n.directional[_]=G,_++}else if(R.isSpotLight){const G=e.get(R);G.position.setFromMatrixPosition(R.matrixWorld),G.color.copy(z).multiplyScalar(W),G.distance=X,G.coneCos=Math.cos(R.angle),G.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),G.decay=R.decay,n.spot[E]=G;const V=R.shadow;if(R.map&&(n.spotLightMap[P]=R.map,P++,V.updateMatrices(R),R.castShadow&&T++),n.spotLightMatrix[E]=V.matrix,R.castShadow){const $=t.get(R);$.shadowIntensity=V.intensity,$.shadowBias=V.bias,$.shadowNormalBias=V.normalBias,$.shadowRadius=V.radius,$.shadowMapSize=V.mapSize,n.spotShadow[E]=$,n.spotShadowMap[E]=U,b++}E++}else if(R.isRectAreaLight){const G=e.get(R);G.color.copy(z).multiplyScalar(W),G.halfWidth.set(R.width*.5,0,0),G.halfHeight.set(0,R.height*.5,0),n.rectArea[d]=G,d++}else if(R.isPointLight){const G=e.get(R);if(G.color.copy(R.color).multiplyScalar(R.intensity),G.distance=R.distance,G.decay=R.decay,R.castShadow){const V=R.shadow,$=t.get(R);$.shadowIntensity=V.intensity,$.shadowBias=V.bias,$.shadowNormalBias=V.normalBias,$.shadowRadius=V.radius,$.shadowMapSize=V.mapSize,$.shadowCameraNear=V.camera.near,$.shadowCameraFar=V.camera.far,n.pointShadow[v]=$,n.pointShadowMap[v]=U,n.pointShadowMatrix[v]=R.shadow.matrix,y++}n.point[v]=G,v++}else if(R.isHemisphereLight){const G=e.get(R);G.skyColor.copy(R.color).multiplyScalar(W),G.groundColor.copy(R.groundColor).multiplyScalar(W),n.hemi[f]=G,f++}}d>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=le.LTC_FLOAT_1,n.rectAreaLTC2=le.LTC_FLOAT_2):(n.rectAreaLTC1=le.LTC_HALF_1,n.rectAreaLTC2=le.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=p,n.ambient[2]=u;const x=n.hash;(x.directionalLength!==_||x.pointLength!==v||x.spotLength!==E||x.rectAreaLength!==d||x.hemiLength!==f||x.numDirectionalShadows!==M||x.numPointShadows!==y||x.numSpotShadows!==b||x.numSpotMaps!==P||x.numLightProbes!==D)&&(n.directional.length=_,n.spot.length=E,n.rectArea.length=d,n.point.length=v,n.hemi.length=f,n.directionalShadow.length=M,n.directionalShadowMap.length=M,n.pointShadow.length=y,n.pointShadowMap.length=y,n.spotShadow.length=b,n.spotShadowMap.length=b,n.directionalShadowMatrix.length=M,n.pointShadowMatrix.length=y,n.spotLightMatrix.length=b+P-T,n.spotLightMap.length=P,n.numSpotLightShadowsWithMaps=T,n.numLightProbes=D,x.directionalLength=_,x.pointLength=v,x.spotLength=E,x.rectAreaLength=d,x.hemiLength=f,x.numDirectionalShadows=M,x.numPointShadows=y,x.numSpotShadows=b,x.numSpotMaps=P,x.numLightProbes=D,n.version=jd++)}function c(l,h){let p=0,u=0,_=0,v=0,E=0;const d=h.matrixWorldInverse;for(let f=0,M=l.length;f<M;f++){const y=l[f];if(y.isDirectionalLight){const b=n.directional[p];b.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(r),b.direction.transformDirection(d),p++}else if(y.isSpotLight){const b=n.spot[_];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(d),b.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(r),b.direction.transformDirection(d),_++}else if(y.isRectAreaLight){const b=n.rectArea[v];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(d),a.identity(),s.copy(y.matrixWorld),s.premultiply(d),a.extractRotation(s),b.halfWidth.set(y.width*.5,0,0),b.halfHeight.set(0,y.height*.5,0),b.halfWidth.applyMatrix4(a),b.halfHeight.applyMatrix4(a),v++}else if(y.isPointLight){const b=n.point[u];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(d),u++}else if(y.isHemisphereLight){const b=n.hemi[E];b.direction.setFromMatrixPosition(y.matrixWorld),b.direction.transformDirection(d),E++}}}return{setup:o,setupView:c,state:n}}function fo(i){const e=new Qd(i),t=[],n=[],r=[];function s(u){p.camera=u,t.length=0,n.length=0,r.length=0}function a(u){t.push(u)}function o(u){n.push(u)}function c(u){r.push(u)}function l(){e.setup(t)}function h(u){e.setupView(t,u)}const p={lightsArray:t,shadowsArray:n,lightProbeGridArray:r,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:s,state:p,setupLights:l,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:c}}function ep(i){let e=new WeakMap;function t(r,s=0){const a=e.get(r);let o;return a===void 0?(o=new fo(i),e.set(r,[o])):s>=a.length?(o=new fo(i),a.push(o)):o=a[s],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const tp=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,np=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,ip=[new B(1,0,0),new B(-1,0,0),new B(0,1,0),new B(0,-1,0),new B(0,0,1),new B(0,0,-1)],rp=[new B(0,-1,0),new B(0,-1,0),new B(0,0,1),new B(0,0,-1),new B(0,-1,0),new B(0,-1,0)],ho=new pt,vi=new B,jr=new B;function sp(i,e,t){let n=new Bo;const r=new qe,s=new qe,a=new ut,o=new xc,c=new vc,l={},h=t.maxTextureSize,p={[wn]:At,[At]:wn,[un]:un},u=new kt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new qe},radius:{value:4}},vertexShader:tp,fragmentShader:np}),_=u.clone();_.defines.HORIZONTAL_PASS=1;const v=new nn;v.setAttribute("position",new Ht(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const E=new tn(v,u),d=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Qi;let f=this.type;this.render=function(T,D,x){if(d.enabled===!1||d.autoUpdate===!1&&d.needsUpdate===!1||T.length===0)return;this.type===ll&&(Ae("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Qi);const A=i.getRenderTarget(),I=i.getActiveCubeFace(),R=i.getActiveMipmapLevel(),z=i.state;z.setBlending(fn),z.buffers.depth.getReversed()===!0?z.buffers.color.setClear(0,0,0,0):z.buffers.color.setClear(1,1,1,1),z.buffers.depth.setTest(!0),z.setScissorTest(!1);const W=f!==this.type;W&&D.traverse(function(X){X.material&&(Array.isArray(X.material)?X.material.forEach(U=>U.needsUpdate=!0):X.material.needsUpdate=!0)});for(let X=0,U=T.length;X<U;X++){const G=T[X],V=G.shadow;if(V===void 0){Ae("WebGLShadowMap:",G,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;r.copy(V.mapSize);const $=V.getFrameExtents();r.multiply($),s.copy(V.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/$.x),r.x=s.x*$.x,V.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/$.y),r.y=s.y*$.y,V.mapSize.y=s.y));const Q=i.state.buffers.depth.getReversed();if(V.camera._reversedDepth=Q,V.map===null||W===!0){if(V.map!==null&&(V.map.depthTexture!==null&&(V.map.depthTexture.dispose(),V.map.depthTexture=null),V.map.dispose()),this.type===Si){if(G.isPointLight){Ae("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}V.map=new Qt(r.x,r.y,{format:Gn,type:pn,minFilter:xt,magFilter:xt,generateMipmaps:!1}),V.map.texture.name=G.name+".shadowMap",V.map.depthTexture=new ci(r.x,r.y,$t),V.map.depthTexture.name=G.name+".shadowMapDepth",V.map.depthTexture.format=mn,V.map.depthTexture.compareFunction=null,V.map.depthTexture.minFilter=vt,V.map.depthTexture.magFilter=vt}else G.isPointLight?(V.map=new Xo(r.x),V.map.depthTexture=new hc(r.x,en)):(V.map=new Qt(r.x,r.y),V.map.depthTexture=new ci(r.x,r.y,en)),V.map.depthTexture.name=G.name+".shadowMap",V.map.depthTexture.format=mn,this.type===Qi?(V.map.depthTexture.compareFunction=Q?Js:js,V.map.depthTexture.minFilter=xt,V.map.depthTexture.magFilter=xt):(V.map.depthTexture.compareFunction=null,V.map.depthTexture.minFilter=vt,V.map.depthTexture.magFilter=vt);V.camera.updateProjectionMatrix()}const ce=V.map.isWebGLCubeRenderTarget?6:1;for(let xe=0;xe<ce;xe++){if(V.map.isWebGLCubeRenderTarget)i.setRenderTarget(V.map,xe),i.clear();else{xe===0&&(i.setRenderTarget(V.map),i.clear());const Ee=V.getViewport(xe);a.set(s.x*Ee.x,s.y*Ee.y,s.x*Ee.z,s.y*Ee.w),z.viewport(a)}if(G.isPointLight){const Ee=V.camera,Ve=V.matrix,Ye=G.distance||Ee.far;Ye!==Ee.far&&(Ee.far=Ye,Ee.updateProjectionMatrix()),vi.setFromMatrixPosition(G.matrixWorld),Ee.position.copy(vi),jr.copy(Ee.position),jr.add(ip[xe]),Ee.up.copy(rp[xe]),Ee.lookAt(jr),Ee.updateMatrixWorld(),Ve.makeTranslation(-vi.x,-vi.y,-vi.z),ho.multiplyMatrices(Ee.projectionMatrix,Ee.matrixWorldInverse),V._frustum.setFromProjectionMatrix(ho,Ee.coordinateSystem,Ee.reversedDepth)}else V.updateMatrices(G);n=V.getFrustum(),b(D,x,V.camera,G,this.type)}V.isPointLightShadow!==!0&&this.type===Si&&M(V,x),V.needsUpdate=!1}f=this.type,d.needsUpdate=!1,i.setRenderTarget(A,I,R)};function M(T,D){const x=e.update(E);u.defines.VSM_SAMPLES!==T.blurSamples&&(u.defines.VSM_SAMPLES=T.blurSamples,_.defines.VSM_SAMPLES=T.blurSamples,u.needsUpdate=!0,_.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new Qt(r.x,r.y,{format:Gn,type:pn})),u.uniforms.shadow_pass.value=T.map.depthTexture,u.uniforms.resolution.value=T.mapSize,u.uniforms.radius.value=T.radius,i.setRenderTarget(T.mapPass),i.clear(),i.renderBufferDirect(D,null,x,u,E,null),_.uniforms.shadow_pass.value=T.mapPass.texture,_.uniforms.resolution.value=T.mapSize,_.uniforms.radius.value=T.radius,i.setRenderTarget(T.map),i.clear(),i.renderBufferDirect(D,null,x,_,E,null)}function y(T,D,x,A){let I=null;const R=x.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(R!==void 0)I=R;else if(I=x.isPointLight===!0?c:o,i.localClippingEnabled&&D.clipShadows===!0&&Array.isArray(D.clippingPlanes)&&D.clippingPlanes.length!==0||D.displacementMap&&D.displacementScale!==0||D.alphaMap&&D.alphaTest>0||D.map&&D.alphaTest>0||D.alphaToCoverage===!0){const z=I.uuid,W=D.uuid;let X=l[z];X===void 0&&(X={},l[z]=X);let U=X[W];U===void 0&&(U=I.clone(),X[W]=U,D.addEventListener("dispose",P)),I=U}if(I.visible=D.visible,I.wireframe=D.wireframe,A===Si?I.side=D.shadowSide!==null?D.shadowSide:D.side:I.side=D.shadowSide!==null?D.shadowSide:p[D.side],I.alphaMap=D.alphaMap,I.alphaTest=D.alphaToCoverage===!0?.5:D.alphaTest,I.map=D.map,I.clipShadows=D.clipShadows,I.clippingPlanes=D.clippingPlanes,I.clipIntersection=D.clipIntersection,I.displacementMap=D.displacementMap,I.displacementScale=D.displacementScale,I.displacementBias=D.displacementBias,I.wireframeLinewidth=D.wireframeLinewidth,I.linewidth=D.linewidth,x.isPointLight===!0&&I.isMeshDistanceMaterial===!0){const z=i.properties.get(I);z.light=x}return I}function b(T,D,x,A,I){if(T.visible===!1)return;if(T.layers.test(D.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&I===Si)&&(!T.frustumCulled||n.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,T.matrixWorld);const W=e.update(T),X=T.material;if(Array.isArray(X)){const U=W.groups;for(let G=0,V=U.length;G<V;G++){const $=U[G],Q=X[$.materialIndex];if(Q&&Q.visible){const ce=y(T,Q,A,I);T.onBeforeShadow(i,T,D,x,W,ce,$),i.renderBufferDirect(x,null,W,ce,T,$),T.onAfterShadow(i,T,D,x,W,ce,$)}}}else if(X.visible){const U=y(T,X,A,I);T.onBeforeShadow(i,T,D,x,W,U,null),i.renderBufferDirect(x,null,W,U,T,null),T.onAfterShadow(i,T,D,x,W,U,null)}}const z=T.children;for(let W=0,X=z.length;W<X;W++)b(z[W],D,x,A,I)}function P(T){T.target.removeEventListener("dispose",P);for(const x in l){const A=l[x],I=T.target.uuid;I in A&&(A[I].dispose(),delete A[I])}}}function ap(i,e){function t(){let w=!1;const ne=new ut;let q=null;const pe=new ut(0,0,0,0);return{setMask:function(se){q!==se&&!w&&(i.colorMask(se,se,se,se),q=se)},setLocked:function(se){w=se},setClear:function(se,j,Se,Pe,ot){ot===!0&&(se*=Pe,j*=Pe,Se*=Pe),ne.set(se,j,Se,Pe),pe.equals(ne)===!1&&(i.clearColor(se,j,Se,Pe),pe.copy(ne))},reset:function(){w=!1,q=null,pe.set(-1,0,0,0)}}}function n(){let w=!1,ne=!1,q=null,pe=null,se=null;return{setReversed:function(j){if(ne!==j){const Se=e.get("EXT_clip_control");j?Se.clipControlEXT(Se.LOWER_LEFT_EXT,Se.ZERO_TO_ONE_EXT):Se.clipControlEXT(Se.LOWER_LEFT_EXT,Se.NEGATIVE_ONE_TO_ONE_EXT),ne=j;const Pe=se;se=null,this.setClear(Pe)}},getReversed:function(){return ne},setTest:function(j){j?ie(i.DEPTH_TEST):be(i.DEPTH_TEST)},setMask:function(j){q!==j&&!w&&(i.depthMask(j),q=j)},setFunc:function(j){if(ne&&(j=Vl[j]),pe!==j){switch(j){case es:i.depthFunc(i.NEVER);break;case ts:i.depthFunc(i.ALWAYS);break;case ns:i.depthFunc(i.LESS);break;case oi:i.depthFunc(i.LEQUAL);break;case is:i.depthFunc(i.EQUAL);break;case rs:i.depthFunc(i.GEQUAL);break;case ss:i.depthFunc(i.GREATER);break;case as:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}pe=j}},setLocked:function(j){w=j},setClear:function(j){se!==j&&(se=j,ne&&(j=1-j),i.clearDepth(j))},reset:function(){w=!1,q=null,pe=null,se=null,ne=!1}}}function r(){let w=!1,ne=null,q=null,pe=null,se=null,j=null,Se=null,Pe=null,ot=null;return{setTest:function(Ze){w||(Ze?ie(i.STENCIL_TEST):be(i.STENCIL_TEST))},setMask:function(Ze){ne!==Ze&&!w&&(i.stencilMask(Ze),ne=Ze)},setFunc:function(Ze,rn,Wt){(q!==Ze||pe!==rn||se!==Wt)&&(i.stencilFunc(Ze,rn,Wt),q=Ze,pe=rn,se=Wt)},setOp:function(Ze,rn,Wt){(j!==Ze||Se!==rn||Pe!==Wt)&&(i.stencilOp(Ze,rn,Wt),j=Ze,Se=rn,Pe=Wt)},setLocked:function(Ze){w=Ze},setClear:function(Ze){ot!==Ze&&(i.clearStencil(Ze),ot=Ze)},reset:function(){w=!1,ne=null,q=null,pe=null,se=null,j=null,Se=null,Pe=null,ot=null}}}const s=new t,a=new n,o=new r,c=new WeakMap,l=new WeakMap;let h={},p={},u={},_=new WeakMap,v=[],E=null,d=!1,f=null,M=null,y=null,b=null,P=null,T=null,D=null,x=new je(0,0,0),A=0,I=!1,R=null,z=null,W=null,X=null,U=null;const G=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let V=!1,$=0;const Q=i.getParameter(i.VERSION);Q.indexOf("WebGL")!==-1?($=parseFloat(/^WebGL (\d)/.exec(Q)[1]),V=$>=1):Q.indexOf("OpenGL ES")!==-1&&($=parseFloat(/^OpenGL ES (\d)/.exec(Q)[1]),V=$>=2);let ce=null,xe={};const Ee=i.getParameter(i.SCISSOR_BOX),Ve=i.getParameter(i.VIEWPORT),Ye=new ut().fromArray(Ee),Le=new ut().fromArray(Ve);function Z(w,ne,q,pe){const se=new Uint8Array(4),j=i.createTexture();i.bindTexture(w,j),i.texParameteri(w,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(w,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Se=0;Se<q;Se++)w===i.TEXTURE_3D||w===i.TEXTURE_2D_ARRAY?i.texImage3D(ne,0,i.RGBA,1,1,pe,0,i.RGBA,i.UNSIGNED_BYTE,se):i.texImage2D(ne+Se,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,se);return j}const he={};he[i.TEXTURE_2D]=Z(i.TEXTURE_2D,i.TEXTURE_2D,1),he[i.TEXTURE_CUBE_MAP]=Z(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),he[i.TEXTURE_2D_ARRAY]=Z(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),he[i.TEXTURE_3D]=Z(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ie(i.DEPTH_TEST),a.setFunc(oi),ht(!1),rt(ma),ie(i.CULL_FACE),nt(fn);function ie(w){h[w]!==!0&&(i.enable(w),h[w]=!0)}function be(w){h[w]!==!1&&(i.disable(w),h[w]=!1)}function we(w,ne){return u[w]!==ne?(i.bindFramebuffer(w,ne),u[w]=ne,w===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=ne),w===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=ne),!0):!1}function ye(w,ne){let q=v,pe=!1;if(w){q=_.get(ne),q===void 0&&(q=[],_.set(ne,q));const se=w.textures;if(q.length!==se.length||q[0]!==i.COLOR_ATTACHMENT0){for(let j=0,Se=se.length;j<Se;j++)q[j]=i.COLOR_ATTACHMENT0+j;q.length=se.length,pe=!0}}else q[0]!==i.BACK&&(q[0]=i.BACK,pe=!0);pe&&i.drawBuffers(q)}function it(w){return E!==w?(i.useProgram(w),E=w,!0):!1}const Oe={[Nn]:i.FUNC_ADD,[ul]:i.FUNC_SUBTRACT,[fl]:i.FUNC_REVERSE_SUBTRACT};Oe[hl]=i.MIN,Oe[dl]=i.MAX;const Ke={[pl]:i.ZERO,[ml]:i.ONE,[_l]:i.SRC_COLOR,[Jr]:i.SRC_ALPHA,[El]:i.SRC_ALPHA_SATURATE,[Sl]:i.DST_COLOR,[xl]:i.DST_ALPHA,[gl]:i.ONE_MINUS_SRC_COLOR,[Qr]:i.ONE_MINUS_SRC_ALPHA,[Ml]:i.ONE_MINUS_DST_COLOR,[vl]:i.ONE_MINUS_DST_ALPHA,[Tl]:i.CONSTANT_COLOR,[bl]:i.ONE_MINUS_CONSTANT_COLOR,[yl]:i.CONSTANT_ALPHA,[Al]:i.ONE_MINUS_CONSTANT_ALPHA};function nt(w,ne,q,pe,se,j,Se,Pe,ot,Ze){if(w===fn){d===!0&&(be(i.BLEND),d=!1);return}if(d===!1&&(ie(i.BLEND),d=!0),w!==cl){if(w!==f||Ze!==I){if((M!==Nn||P!==Nn)&&(i.blendEquation(i.FUNC_ADD),M=Nn,P=Nn),Ze)switch(w){case si:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case _a:i.blendFunc(i.ONE,i.ONE);break;case ga:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case xa:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:ke("WebGLState: Invalid blending: ",w);break}else switch(w){case si:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case _a:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case ga:ke("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case xa:ke("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:ke("WebGLState: Invalid blending: ",w);break}y=null,b=null,T=null,D=null,x.set(0,0,0),A=0,f=w,I=Ze}return}se=se||ne,j=j||q,Se=Se||pe,(ne!==M||se!==P)&&(i.blendEquationSeparate(Oe[ne],Oe[se]),M=ne,P=se),(q!==y||pe!==b||j!==T||Se!==D)&&(i.blendFuncSeparate(Ke[q],Ke[pe],Ke[j],Ke[Se]),y=q,b=pe,T=j,D=Se),(Pe.equals(x)===!1||ot!==A)&&(i.blendColor(Pe.r,Pe.g,Pe.b,ot),x.copy(Pe),A=ot),f=w,I=!1}function Fe(w,ne){w.side===un?be(i.CULL_FACE):ie(i.CULL_FACE);let q=w.side===At;ne&&(q=!q),ht(q),w.blending===si&&w.transparent===!1?nt(fn):nt(w.blending,w.blendEquation,w.blendSrc,w.blendDst,w.blendEquationAlpha,w.blendSrcAlpha,w.blendDstAlpha,w.blendColor,w.blendAlpha,w.premultipliedAlpha),a.setFunc(w.depthFunc),a.setTest(w.depthTest),a.setMask(w.depthWrite),s.setMask(w.colorWrite);const pe=w.stencilWrite;o.setTest(pe),pe&&(o.setMask(w.stencilWriteMask),o.setFunc(w.stencilFunc,w.stencilRef,w.stencilFuncMask),o.setOp(w.stencilFail,w.stencilZFail,w.stencilZPass)),C(w.polygonOffset,w.polygonOffsetFactor,w.polygonOffsetUnits),w.alphaToCoverage===!0?ie(i.SAMPLE_ALPHA_TO_COVERAGE):be(i.SAMPLE_ALPHA_TO_COVERAGE)}function ht(w){R!==w&&(w?i.frontFace(i.CW):i.frontFace(i.CCW),R=w)}function rt(w){w!==al?(ie(i.CULL_FACE),w!==z&&(w===ma?i.cullFace(i.BACK):w===ol?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):be(i.CULL_FACE),z=w}function Rt(w){w!==W&&(V&&i.lineWidth(w),W=w)}function C(w,ne,q){w?(ie(i.POLYGON_OFFSET_FILL),(X!==ne||U!==q)&&(X=ne,U=q,a.getReversed()&&(ne=-ne),i.polygonOffset(ne,q))):be(i.POLYGON_OFFSET_FILL)}function dt(w){w?ie(i.SCISSOR_TEST):be(i.SCISSOR_TEST)}function Be(w){w===void 0&&(w=i.TEXTURE0+G-1),ce!==w&&(i.activeTexture(w),ce=w)}function et(w,ne,q){q===void 0&&(ce===null?q=i.TEXTURE0+G-1:q=ce);let pe=xe[q];pe===void 0&&(pe={type:void 0,texture:void 0},xe[q]=pe),(pe.type!==w||pe.texture!==ne)&&(ce!==q&&(i.activeTexture(q),ce=q),i.bindTexture(w,ne||he[w]),pe.type=w,pe.texture=ne)}function oe(){const w=xe[ce];w!==void 0&&w.type!==void 0&&(i.bindTexture(w.type,null),w.type=void 0,w.texture=void 0)}function st(){try{i.compressedTexImage2D(...arguments)}catch(w){ke("WebGLState:",w)}}function S(){try{i.compressedTexImage3D(...arguments)}catch(w){ke("WebGLState:",w)}}function m(){try{i.texSubImage2D(...arguments)}catch(w){ke("WebGLState:",w)}}function N(){try{i.texSubImage3D(...arguments)}catch(w){ke("WebGLState:",w)}}function Y(){try{i.compressedTexSubImage2D(...arguments)}catch(w){ke("WebGLState:",w)}}function J(){try{i.compressedTexSubImage3D(...arguments)}catch(w){ke("WebGLState:",w)}}function ee(){try{i.texStorage2D(...arguments)}catch(w){ke("WebGLState:",w)}}function ae(){try{i.texStorage3D(...arguments)}catch(w){ke("WebGLState:",w)}}function k(){try{i.texImage2D(...arguments)}catch(w){ke("WebGLState:",w)}}function K(){try{i.texImage3D(...arguments)}catch(w){ke("WebGLState:",w)}}function de(w){return p[w]!==void 0?p[w]:i.getParameter(w)}function _e(w,ne){p[w]!==ne&&(i.pixelStorei(w,ne),p[w]=ne)}function re(w){Ye.equals(w)===!1&&(i.scissor(w.x,w.y,w.z,w.w),Ye.copy(w))}function te(w){Le.equals(w)===!1&&(i.viewport(w.x,w.y,w.z,w.w),Le.copy(w))}function Re(w,ne){let q=l.get(ne);q===void 0&&(q=new WeakMap,l.set(ne,q));let pe=q.get(w);pe===void 0&&(pe=i.getUniformBlockIndex(ne,w.name),q.set(w,pe))}function Ue(w,ne){const pe=l.get(ne).get(w);c.get(ne)!==pe&&(i.uniformBlockBinding(ne,pe,w.__bindingPointIndex),c.set(ne,pe))}function We(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},p={},ce=null,xe={},u={},_=new WeakMap,v=[],E=null,d=!1,f=null,M=null,y=null,b=null,P=null,T=null,D=null,x=new je(0,0,0),A=0,I=!1,R=null,z=null,W=null,X=null,U=null,Ye.set(0,0,i.canvas.width,i.canvas.height),Le.set(0,0,i.canvas.width,i.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:ie,disable:be,bindFramebuffer:we,drawBuffers:ye,useProgram:it,setBlending:nt,setMaterial:Fe,setFlipSided:ht,setCullFace:rt,setLineWidth:Rt,setPolygonOffset:C,setScissorTest:dt,activeTexture:Be,bindTexture:et,unbindTexture:oe,compressedTexImage2D:st,compressedTexImage3D:S,texImage2D:k,texImage3D:K,pixelStorei:_e,getParameter:de,updateUBOMapping:Re,uniformBlockBinding:Ue,texStorage2D:ee,texStorage3D:ae,texSubImage2D:m,texSubImage3D:N,compressedTexSubImage2D:Y,compressedTexSubImage3D:J,scissor:re,viewport:te,reset:We}}function op(i,e,t,n,r,s,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new qe,h=new WeakMap,p=new Set;let u;const _=new WeakMap;let v=!1;try{v=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function E(S,m){return v?new OffscreenCanvas(S,m):ur("canvas")}function d(S,m,N){let Y=1;const J=st(S);if((J.width>N||J.height>N)&&(Y=N/Math.max(J.width,J.height)),Y<1)if(typeof HTMLImageElement<"u"&&S instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&S instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&S instanceof ImageBitmap||typeof VideoFrame<"u"&&S instanceof VideoFrame){const ee=Math.floor(Y*J.width),ae=Math.floor(Y*J.height);u===void 0&&(u=E(ee,ae));const k=m?E(ee,ae):u;return k.width=ee,k.height=ae,k.getContext("2d").drawImage(S,0,0,ee,ae),Ae("WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+ee+"x"+ae+")."),k}else return"data"in S&&Ae("WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),S;return S}function f(S){return S.generateMipmaps}function M(S){i.generateMipmap(S)}function y(S){return S.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:S.isWebGL3DRenderTarget?i.TEXTURE_3D:S.isWebGLArrayRenderTarget||S.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(S,m,N,Y,J,ee=!1){if(S!==null){if(i[S]!==void 0)return i[S];Ae("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+S+"'")}let ae;Y&&(ae=e.get("EXT_texture_norm16"),ae||Ae("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let k=m;if(m===i.RED&&(N===i.FLOAT&&(k=i.R32F),N===i.HALF_FLOAT&&(k=i.R16F),N===i.UNSIGNED_BYTE&&(k=i.R8),N===i.UNSIGNED_SHORT&&ae&&(k=ae.R16_EXT),N===i.SHORT&&ae&&(k=ae.R16_SNORM_EXT)),m===i.RED_INTEGER&&(N===i.UNSIGNED_BYTE&&(k=i.R8UI),N===i.UNSIGNED_SHORT&&(k=i.R16UI),N===i.UNSIGNED_INT&&(k=i.R32UI),N===i.BYTE&&(k=i.R8I),N===i.SHORT&&(k=i.R16I),N===i.INT&&(k=i.R32I)),m===i.RG&&(N===i.FLOAT&&(k=i.RG32F),N===i.HALF_FLOAT&&(k=i.RG16F),N===i.UNSIGNED_BYTE&&(k=i.RG8),N===i.UNSIGNED_SHORT&&ae&&(k=ae.RG16_EXT),N===i.SHORT&&ae&&(k=ae.RG16_SNORM_EXT)),m===i.RG_INTEGER&&(N===i.UNSIGNED_BYTE&&(k=i.RG8UI),N===i.UNSIGNED_SHORT&&(k=i.RG16UI),N===i.UNSIGNED_INT&&(k=i.RG32UI),N===i.BYTE&&(k=i.RG8I),N===i.SHORT&&(k=i.RG16I),N===i.INT&&(k=i.RG32I)),m===i.RGB_INTEGER&&(N===i.UNSIGNED_BYTE&&(k=i.RGB8UI),N===i.UNSIGNED_SHORT&&(k=i.RGB16UI),N===i.UNSIGNED_INT&&(k=i.RGB32UI),N===i.BYTE&&(k=i.RGB8I),N===i.SHORT&&(k=i.RGB16I),N===i.INT&&(k=i.RGB32I)),m===i.RGBA_INTEGER&&(N===i.UNSIGNED_BYTE&&(k=i.RGBA8UI),N===i.UNSIGNED_SHORT&&(k=i.RGBA16UI),N===i.UNSIGNED_INT&&(k=i.RGBA32UI),N===i.BYTE&&(k=i.RGBA8I),N===i.SHORT&&(k=i.RGBA16I),N===i.INT&&(k=i.RGBA32I)),m===i.RGB&&(N===i.UNSIGNED_SHORT&&ae&&(k=ae.RGB16_EXT),N===i.SHORT&&ae&&(k=ae.RGB16_SNORM_EXT),N===i.UNSIGNED_INT_5_9_9_9_REV&&(k=i.RGB9_E5),N===i.UNSIGNED_INT_10F_11F_11F_REV&&(k=i.R11F_G11F_B10F)),m===i.RGBA){const K=ee?lr:ze.getTransfer(J);N===i.FLOAT&&(k=i.RGBA32F),N===i.HALF_FLOAT&&(k=i.RGBA16F),N===i.UNSIGNED_BYTE&&(k=K===Xe?i.SRGB8_ALPHA8:i.RGBA8),N===i.UNSIGNED_SHORT&&ae&&(k=ae.RGBA16_EXT),N===i.SHORT&&ae&&(k=ae.RGBA16_SNORM_EXT),N===i.UNSIGNED_SHORT_4_4_4_4&&(k=i.RGBA4),N===i.UNSIGNED_SHORT_5_5_5_1&&(k=i.RGB5_A1)}return(k===i.R16F||k===i.R32F||k===i.RG16F||k===i.RG32F||k===i.RGBA16F||k===i.RGBA32F)&&e.get("EXT_color_buffer_float"),k}function P(S,m){let N;return S?m===null||m===en||m===bi?N=i.DEPTH24_STENCIL8:m===$t?N=i.DEPTH32F_STENCIL8:m===Ti&&(N=i.DEPTH24_STENCIL8,Ae("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):m===null||m===en||m===bi?N=i.DEPTH_COMPONENT24:m===$t?N=i.DEPTH_COMPONENT32F:m===Ti&&(N=i.DEPTH_COMPONENT16),N}function T(S,m){return f(S)===!0||S.isFramebufferTexture&&S.minFilter!==vt&&S.minFilter!==xt?Math.log2(Math.max(m.width,m.height))+1:S.mipmaps!==void 0&&S.mipmaps.length>0?S.mipmaps.length:S.isCompressedTexture&&Array.isArray(S.image)?m.mipmaps.length:1}function D(S){const m=S.target;m.removeEventListener("dispose",D),A(m),m.isVideoTexture&&h.delete(m),m.isHTMLTexture&&p.delete(m)}function x(S){const m=S.target;m.removeEventListener("dispose",x),R(m)}function A(S){const m=n.get(S);if(m.__webglInit===void 0)return;const N=S.source,Y=_.get(N);if(Y){const J=Y[m.__cacheKey];J.usedTimes--,J.usedTimes===0&&I(S),Object.keys(Y).length===0&&_.delete(N)}n.remove(S)}function I(S){const m=n.get(S);i.deleteTexture(m.__webglTexture);const N=S.source,Y=_.get(N);delete Y[m.__cacheKey],a.memory.textures--}function R(S){const m=n.get(S);if(S.depthTexture&&(S.depthTexture.dispose(),n.remove(S.depthTexture)),S.isWebGLCubeRenderTarget)for(let Y=0;Y<6;Y++){if(Array.isArray(m.__webglFramebuffer[Y]))for(let J=0;J<m.__webglFramebuffer[Y].length;J++)i.deleteFramebuffer(m.__webglFramebuffer[Y][J]);else i.deleteFramebuffer(m.__webglFramebuffer[Y]);m.__webglDepthbuffer&&i.deleteRenderbuffer(m.__webglDepthbuffer[Y])}else{if(Array.isArray(m.__webglFramebuffer))for(let Y=0;Y<m.__webglFramebuffer.length;Y++)i.deleteFramebuffer(m.__webglFramebuffer[Y]);else i.deleteFramebuffer(m.__webglFramebuffer);if(m.__webglDepthbuffer&&i.deleteRenderbuffer(m.__webglDepthbuffer),m.__webglMultisampledFramebuffer&&i.deleteFramebuffer(m.__webglMultisampledFramebuffer),m.__webglColorRenderbuffer)for(let Y=0;Y<m.__webglColorRenderbuffer.length;Y++)m.__webglColorRenderbuffer[Y]&&i.deleteRenderbuffer(m.__webglColorRenderbuffer[Y]);m.__webglDepthRenderbuffer&&i.deleteRenderbuffer(m.__webglDepthRenderbuffer)}const N=S.textures;for(let Y=0,J=N.length;Y<J;Y++){const ee=n.get(N[Y]);ee.__webglTexture&&(i.deleteTexture(ee.__webglTexture),a.memory.textures--),n.remove(N[Y])}n.remove(S)}let z=0;function W(){z=0}function X(){return z}function U(S){z=S}function G(){const S=z;return S>=r.maxTextures&&Ae("WebGLTextures: Trying to use "+S+" texture units while this GPU supports only "+r.maxTextures),z+=1,S}function V(S){const m=[];return m.push(S.wrapS),m.push(S.wrapT),m.push(S.wrapR||0),m.push(S.magFilter),m.push(S.minFilter),m.push(S.anisotropy),m.push(S.internalFormat),m.push(S.format),m.push(S.type),m.push(S.generateMipmaps),m.push(S.premultiplyAlpha),m.push(S.flipY),m.push(S.unpackAlignment),m.push(S.colorSpace),m.join()}function $(S,m){const N=n.get(S);if(S.isVideoTexture&&et(S),S.isRenderTargetTexture===!1&&S.isExternalTexture!==!0&&S.version>0&&N.__version!==S.version){const Y=S.image;if(Y===null)Ae("WebGLRenderer: Texture marked for update but no image data found.");else if(Y.complete===!1)Ae("WebGLRenderer: Texture marked for update but image is incomplete");else{be(N,S,m);return}}else S.isExternalTexture&&(N.__webglTexture=S.sourceTexture?S.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,N.__webglTexture,i.TEXTURE0+m)}function Q(S,m){const N=n.get(S);if(S.isRenderTargetTexture===!1&&S.version>0&&N.__version!==S.version){be(N,S,m);return}else S.isExternalTexture&&(N.__webglTexture=S.sourceTexture?S.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,N.__webglTexture,i.TEXTURE0+m)}function ce(S,m){const N=n.get(S);if(S.isRenderTargetTexture===!1&&S.version>0&&N.__version!==S.version){be(N,S,m);return}t.bindTexture(i.TEXTURE_3D,N.__webglTexture,i.TEXTURE0+m)}function xe(S,m){const N=n.get(S);if(S.isCubeDepthTexture!==!0&&S.version>0&&N.__version!==S.version){we(N,S,m);return}t.bindTexture(i.TEXTURE_CUBE_MAP,N.__webglTexture,i.TEXTURE0+m)}const Ee={[os]:i.REPEAT,[Zt]:i.CLAMP_TO_EDGE,[ls]:i.MIRRORED_REPEAT},Ve={[vt]:i.NEAREST,[Cl]:i.NEAREST_MIPMAP_NEAREST,[Pi]:i.NEAREST_MIPMAP_LINEAR,[xt]:i.LINEAR,[Mr]:i.LINEAR_MIPMAP_NEAREST,[On]:i.LINEAR_MIPMAP_LINEAR},Ye={[Ll]:i.NEVER,[Ol]:i.ALWAYS,[Ul]:i.LESS,[js]:i.LEQUAL,[Il]:i.EQUAL,[Js]:i.GEQUAL,[Nl]:i.GREATER,[Fl]:i.NOTEQUAL};function Le(S,m){if(m.type===$t&&e.has("OES_texture_float_linear")===!1&&(m.magFilter===xt||m.magFilter===Mr||m.magFilter===Pi||m.magFilter===On||m.minFilter===xt||m.minFilter===Mr||m.minFilter===Pi||m.minFilter===On)&&Ae("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(S,i.TEXTURE_WRAP_S,Ee[m.wrapS]),i.texParameteri(S,i.TEXTURE_WRAP_T,Ee[m.wrapT]),(S===i.TEXTURE_3D||S===i.TEXTURE_2D_ARRAY)&&i.texParameteri(S,i.TEXTURE_WRAP_R,Ee[m.wrapR]),i.texParameteri(S,i.TEXTURE_MAG_FILTER,Ve[m.magFilter]),i.texParameteri(S,i.TEXTURE_MIN_FILTER,Ve[m.minFilter]),m.compareFunction&&(i.texParameteri(S,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(S,i.TEXTURE_COMPARE_FUNC,Ye[m.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(m.magFilter===vt||m.minFilter!==Pi&&m.minFilter!==On||m.type===$t&&e.has("OES_texture_float_linear")===!1)return;if(m.anisotropy>1||n.get(m).__currentAnisotropy){const N=e.get("EXT_texture_filter_anisotropic");i.texParameterf(S,N.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(m.anisotropy,r.getMaxAnisotropy())),n.get(m).__currentAnisotropy=m.anisotropy}}}function Z(S,m){let N=!1;S.__webglInit===void 0&&(S.__webglInit=!0,m.addEventListener("dispose",D));const Y=m.source;let J=_.get(Y);J===void 0&&(J={},_.set(Y,J));const ee=V(m);if(ee!==S.__cacheKey){J[ee]===void 0&&(J[ee]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,N=!0),J[ee].usedTimes++;const ae=J[S.__cacheKey];ae!==void 0&&(J[S.__cacheKey].usedTimes--,ae.usedTimes===0&&I(m)),S.__cacheKey=ee,S.__webglTexture=J[ee].texture}return N}function he(S,m,N){return Math.floor(Math.floor(S/N)/m)}function ie(S,m,N,Y){const ee=S.updateRanges;if(ee.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,m.width,m.height,N,Y,m.data);else{ee.sort((_e,re)=>_e.start-re.start);let ae=0;for(let _e=1;_e<ee.length;_e++){const re=ee[ae],te=ee[_e],Re=re.start+re.count,Ue=he(te.start,m.width,4),We=he(re.start,m.width,4);te.start<=Re+1&&Ue===We&&he(te.start+te.count-1,m.width,4)===Ue?re.count=Math.max(re.count,te.start+te.count-re.start):(++ae,ee[ae]=te)}ee.length=ae+1;const k=t.getParameter(i.UNPACK_ROW_LENGTH),K=t.getParameter(i.UNPACK_SKIP_PIXELS),de=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,m.width);for(let _e=0,re=ee.length;_e<re;_e++){const te=ee[_e],Re=Math.floor(te.start/4),Ue=Math.ceil(te.count/4),We=Re%m.width,w=Math.floor(Re/m.width),ne=Ue,q=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,We),t.pixelStorei(i.UNPACK_SKIP_ROWS,w),t.texSubImage2D(i.TEXTURE_2D,0,We,w,ne,q,N,Y,m.data)}S.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,k),t.pixelStorei(i.UNPACK_SKIP_PIXELS,K),t.pixelStorei(i.UNPACK_SKIP_ROWS,de)}}function be(S,m,N){let Y=i.TEXTURE_2D;(m.isDataArrayTexture||m.isCompressedArrayTexture)&&(Y=i.TEXTURE_2D_ARRAY),m.isData3DTexture&&(Y=i.TEXTURE_3D);const J=Z(S,m),ee=m.source;t.bindTexture(Y,S.__webglTexture,i.TEXTURE0+N);const ae=n.get(ee);if(ee.version!==ae.__version||J===!0){if(t.activeTexture(i.TEXTURE0+N),(typeof ImageBitmap<"u"&&m.image instanceof ImageBitmap)===!1){const q=ze.getPrimaries(ze.workingColorSpace),pe=m.colorSpace===An?null:ze.getPrimaries(m.colorSpace),se=m.colorSpace===An||q===pe?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,m.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,m.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,se)}t.pixelStorei(i.UNPACK_ALIGNMENT,m.unpackAlignment);let K=d(m.image,!1,r.maxTextureSize);K=oe(m,K);const de=s.convert(m.format,m.colorSpace),_e=s.convert(m.type);let re=b(m.internalFormat,de,_e,m.normalized,m.colorSpace,m.isVideoTexture);Le(Y,m);let te;const Re=m.mipmaps,Ue=m.isVideoTexture!==!0,We=ae.__version===void 0||J===!0,w=ee.dataReady,ne=T(m,K);if(m.isDepthTexture)re=P(m.format===Bn,m.type),We&&(Ue?t.texStorage2D(i.TEXTURE_2D,1,re,K.width,K.height):t.texImage2D(i.TEXTURE_2D,0,re,K.width,K.height,0,de,_e,null));else if(m.isDataTexture)if(Re.length>0){Ue&&We&&t.texStorage2D(i.TEXTURE_2D,ne,re,Re[0].width,Re[0].height);for(let q=0,pe=Re.length;q<pe;q++)te=Re[q],Ue?w&&t.texSubImage2D(i.TEXTURE_2D,q,0,0,te.width,te.height,de,_e,te.data):t.texImage2D(i.TEXTURE_2D,q,re,te.width,te.height,0,de,_e,te.data);m.generateMipmaps=!1}else Ue?(We&&t.texStorage2D(i.TEXTURE_2D,ne,re,K.width,K.height),w&&ie(m,K,de,_e)):t.texImage2D(i.TEXTURE_2D,0,re,K.width,K.height,0,de,_e,K.data);else if(m.isCompressedTexture)if(m.isCompressedArrayTexture){Ue&&We&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ne,re,Re[0].width,Re[0].height,K.depth);for(let q=0,pe=Re.length;q<pe;q++)if(te=Re[q],m.format!==Vt)if(de!==null)if(Ue){if(w)if(m.layerUpdates.size>0){const se=ka(te.width,te.height,m.format,m.type);for(const j of m.layerUpdates){const Se=te.data.subarray(j*se/te.data.BYTES_PER_ELEMENT,(j+1)*se/te.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,q,0,0,j,te.width,te.height,1,de,Se)}m.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,q,0,0,0,te.width,te.height,K.depth,de,te.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,q,re,te.width,te.height,K.depth,0,te.data,0,0);else Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ue?w&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,q,0,0,0,te.width,te.height,K.depth,de,_e,te.data):t.texImage3D(i.TEXTURE_2D_ARRAY,q,re,te.width,te.height,K.depth,0,de,_e,te.data)}else{Ue&&We&&t.texStorage2D(i.TEXTURE_2D,ne,re,Re[0].width,Re[0].height);for(let q=0,pe=Re.length;q<pe;q++)te=Re[q],m.format!==Vt?de!==null?Ue?w&&t.compressedTexSubImage2D(i.TEXTURE_2D,q,0,0,te.width,te.height,de,te.data):t.compressedTexImage2D(i.TEXTURE_2D,q,re,te.width,te.height,0,te.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ue?w&&t.texSubImage2D(i.TEXTURE_2D,q,0,0,te.width,te.height,de,_e,te.data):t.texImage2D(i.TEXTURE_2D,q,re,te.width,te.height,0,de,_e,te.data)}else if(m.isDataArrayTexture)if(Ue){if(We&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ne,re,K.width,K.height,K.depth),w)if(m.layerUpdates.size>0){const q=ka(K.width,K.height,m.format,m.type);for(const pe of m.layerUpdates){const se=K.data.subarray(pe*q/K.data.BYTES_PER_ELEMENT,(pe+1)*q/K.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,pe,K.width,K.height,1,de,_e,se)}m.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,K.width,K.height,K.depth,de,_e,K.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,re,K.width,K.height,K.depth,0,de,_e,K.data);else if(m.isData3DTexture)Ue?(We&&t.texStorage3D(i.TEXTURE_3D,ne,re,K.width,K.height,K.depth),w&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,K.width,K.height,K.depth,de,_e,K.data)):t.texImage3D(i.TEXTURE_3D,0,re,K.width,K.height,K.depth,0,de,_e,K.data);else if(m.isFramebufferTexture){if(We)if(Ue)t.texStorage2D(i.TEXTURE_2D,ne,re,K.width,K.height);else{let q=K.width,pe=K.height;for(let se=0;se<ne;se++)t.texImage2D(i.TEXTURE_2D,se,re,q,pe,0,de,_e,null),q>>=1,pe>>=1}}else if(m.isHTMLTexture){if("texElementImage2D"in i){const q=i.canvas;if(q.hasAttribute("layoutsubtree")||q.setAttribute("layoutsubtree","true"),K.parentNode!==q){q.appendChild(K),p.add(m),q.onpaint=Pe=>{const ot=Pe.changedElements;for(const Ze of p)ot.includes(Ze.image)&&(Ze.needsUpdate=!0)},q.requestPaint();return}const pe=0,se=i.RGBA,j=i.RGBA,Se=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,pe,se,j,Se,K),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Re.length>0){if(Ue&&We){const q=st(Re[0]);t.texStorage2D(i.TEXTURE_2D,ne,re,q.width,q.height)}for(let q=0,pe=Re.length;q<pe;q++)te=Re[q],Ue?w&&t.texSubImage2D(i.TEXTURE_2D,q,0,0,de,_e,te):t.texImage2D(i.TEXTURE_2D,q,re,de,_e,te);m.generateMipmaps=!1}else if(Ue){if(We){const q=st(K);t.texStorage2D(i.TEXTURE_2D,ne,re,q.width,q.height)}w&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,de,_e,K)}else t.texImage2D(i.TEXTURE_2D,0,re,de,_e,K);f(m)&&M(Y),ae.__version=ee.version,m.onUpdate&&m.onUpdate(m)}S.__version=m.version}function we(S,m,N){if(m.image.length!==6)return;const Y=Z(S,m),J=m.source;t.bindTexture(i.TEXTURE_CUBE_MAP,S.__webglTexture,i.TEXTURE0+N);const ee=n.get(J);if(J.version!==ee.__version||Y===!0){t.activeTexture(i.TEXTURE0+N);const ae=ze.getPrimaries(ze.workingColorSpace),k=m.colorSpace===An?null:ze.getPrimaries(m.colorSpace),K=m.colorSpace===An||ae===k?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,m.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,m.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,m.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,K);const de=m.isCompressedTexture||m.image[0].isCompressedTexture,_e=m.image[0]&&m.image[0].isDataTexture,re=[];for(let j=0;j<6;j++)!de&&!_e?re[j]=d(m.image[j],!0,r.maxCubemapSize):re[j]=_e?m.image[j].image:m.image[j],re[j]=oe(m,re[j]);const te=re[0],Re=s.convert(m.format,m.colorSpace),Ue=s.convert(m.type),We=b(m.internalFormat,Re,Ue,m.normalized,m.colorSpace),w=m.isVideoTexture!==!0,ne=ee.__version===void 0||Y===!0,q=J.dataReady;let pe=T(m,te);Le(i.TEXTURE_CUBE_MAP,m);let se;if(de){w&&ne&&t.texStorage2D(i.TEXTURE_CUBE_MAP,pe,We,te.width,te.height);for(let j=0;j<6;j++){se=re[j].mipmaps;for(let Se=0;Se<se.length;Se++){const Pe=se[Se];m.format!==Vt?Re!==null?w?q&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,Se,0,0,Pe.width,Pe.height,Re,Pe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,Se,We,Pe.width,Pe.height,0,Pe.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):w?q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,Se,0,0,Pe.width,Pe.height,Re,Ue,Pe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,Se,We,Pe.width,Pe.height,0,Re,Ue,Pe.data)}}}else{if(se=m.mipmaps,w&&ne){se.length>0&&pe++;const j=st(re[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,pe,We,j.width,j.height)}for(let j=0;j<6;j++)if(_e){w?q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,0,0,0,re[j].width,re[j].height,Re,Ue,re[j].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,0,We,re[j].width,re[j].height,0,Re,Ue,re[j].data);for(let Se=0;Se<se.length;Se++){const ot=se[Se].image[j].image;w?q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,Se+1,0,0,ot.width,ot.height,Re,Ue,ot.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,Se+1,We,ot.width,ot.height,0,Re,Ue,ot.data)}}else{w?q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,0,0,0,Re,Ue,re[j]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,0,We,Re,Ue,re[j]);for(let Se=0;Se<se.length;Se++){const Pe=se[Se];w?q&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,Se+1,0,0,Re,Ue,Pe.image[j]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+j,Se+1,We,Re,Ue,Pe.image[j])}}}f(m)&&M(i.TEXTURE_CUBE_MAP),ee.__version=J.version,m.onUpdate&&m.onUpdate(m)}S.__version=m.version}function ye(S,m,N,Y,J,ee){const ae=s.convert(N.format,N.colorSpace),k=s.convert(N.type),K=b(N.internalFormat,ae,k,N.normalized,N.colorSpace),de=n.get(m),_e=n.get(N);if(_e.__renderTarget=m,!de.__hasExternalTextures){const re=Math.max(1,m.width>>ee),te=Math.max(1,m.height>>ee);J===i.TEXTURE_3D||J===i.TEXTURE_2D_ARRAY?t.texImage3D(J,ee,K,re,te,m.depth,0,ae,k,null):t.texImage2D(J,ee,K,re,te,0,ae,k,null)}t.bindFramebuffer(i.FRAMEBUFFER,S),Be(m)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Y,J,_e.__webglTexture,0,dt(m)):(J===i.TEXTURE_2D||J>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Y,J,_e.__webglTexture,ee),t.bindFramebuffer(i.FRAMEBUFFER,null)}function it(S,m,N){if(i.bindRenderbuffer(i.RENDERBUFFER,S),m.depthBuffer){const Y=m.depthTexture,J=Y&&Y.isDepthTexture?Y.type:null,ee=P(m.stencilBuffer,J),ae=m.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Be(m)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,dt(m),ee,m.width,m.height):N?i.renderbufferStorageMultisample(i.RENDERBUFFER,dt(m),ee,m.width,m.height):i.renderbufferStorage(i.RENDERBUFFER,ee,m.width,m.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,ae,i.RENDERBUFFER,S)}else{const Y=m.textures;for(let J=0;J<Y.length;J++){const ee=Y[J],ae=s.convert(ee.format,ee.colorSpace),k=s.convert(ee.type),K=b(ee.internalFormat,ae,k,ee.normalized,ee.colorSpace);Be(m)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,dt(m),K,m.width,m.height):N?i.renderbufferStorageMultisample(i.RENDERBUFFER,dt(m),K,m.width,m.height):i.renderbufferStorage(i.RENDERBUFFER,K,m.width,m.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Oe(S,m,N){const Y=m.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,S),!(m.depthTexture&&m.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const J=n.get(m.depthTexture);if(J.__renderTarget=m,(!J.__webglTexture||m.depthTexture.image.width!==m.width||m.depthTexture.image.height!==m.height)&&(m.depthTexture.image.width=m.width,m.depthTexture.image.height=m.height,m.depthTexture.needsUpdate=!0),Y){if(J.__webglInit===void 0&&(J.__webglInit=!0,m.depthTexture.addEventListener("dispose",D)),J.__webglTexture===void 0){J.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,J.__webglTexture),Le(i.TEXTURE_CUBE_MAP,m.depthTexture);const de=s.convert(m.depthTexture.format),_e=s.convert(m.depthTexture.type);let re;m.depthTexture.format===mn?re=i.DEPTH_COMPONENT24:m.depthTexture.format===Bn&&(re=i.DEPTH24_STENCIL8);for(let te=0;te<6;te++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,re,m.width,m.height,0,de,_e,null)}}else $(m.depthTexture,0);const ee=J.__webglTexture,ae=dt(m),k=Y?i.TEXTURE_CUBE_MAP_POSITIVE_X+N:i.TEXTURE_2D,K=m.depthTexture.format===Bn?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(m.depthTexture.format===mn)Be(m)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,k,ee,0,ae):i.framebufferTexture2D(i.FRAMEBUFFER,K,k,ee,0);else if(m.depthTexture.format===Bn)Be(m)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,K,k,ee,0,ae):i.framebufferTexture2D(i.FRAMEBUFFER,K,k,ee,0);else throw new Error("Unknown depthTexture format")}function Ke(S){const m=n.get(S),N=S.isWebGLCubeRenderTarget===!0;if(m.__boundDepthTexture!==S.depthTexture){const Y=S.depthTexture;if(m.__depthDisposeCallback&&m.__depthDisposeCallback(),Y){const J=()=>{delete m.__boundDepthTexture,delete m.__depthDisposeCallback,Y.removeEventListener("dispose",J)};Y.addEventListener("dispose",J),m.__depthDisposeCallback=J}m.__boundDepthTexture=Y}if(S.depthTexture&&!m.__autoAllocateDepthBuffer)if(N)for(let Y=0;Y<6;Y++)Oe(m.__webglFramebuffer[Y],S,Y);else{const Y=S.texture.mipmaps;Y&&Y.length>0?Oe(m.__webglFramebuffer[0],S,0):Oe(m.__webglFramebuffer,S,0)}else if(N){m.__webglDepthbuffer=[];for(let Y=0;Y<6;Y++)if(t.bindFramebuffer(i.FRAMEBUFFER,m.__webglFramebuffer[Y]),m.__webglDepthbuffer[Y]===void 0)m.__webglDepthbuffer[Y]=i.createRenderbuffer(),it(m.__webglDepthbuffer[Y],S,!1);else{const J=S.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ee=m.__webglDepthbuffer[Y];i.bindRenderbuffer(i.RENDERBUFFER,ee),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,ee)}}else{const Y=S.texture.mipmaps;if(Y&&Y.length>0?t.bindFramebuffer(i.FRAMEBUFFER,m.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,m.__webglFramebuffer),m.__webglDepthbuffer===void 0)m.__webglDepthbuffer=i.createRenderbuffer(),it(m.__webglDepthbuffer,S,!1);else{const J=S.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ee=m.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ee),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,ee)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function nt(S,m,N){const Y=n.get(S);m!==void 0&&ye(Y.__webglFramebuffer,S,S.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),N!==void 0&&Ke(S)}function Fe(S){const m=S.texture,N=n.get(S),Y=n.get(m);S.addEventListener("dispose",x);const J=S.textures,ee=S.isWebGLCubeRenderTarget===!0,ae=J.length>1;if(ae||(Y.__webglTexture===void 0&&(Y.__webglTexture=i.createTexture()),Y.__version=m.version,a.memory.textures++),ee){N.__webglFramebuffer=[];for(let k=0;k<6;k++)if(m.mipmaps&&m.mipmaps.length>0){N.__webglFramebuffer[k]=[];for(let K=0;K<m.mipmaps.length;K++)N.__webglFramebuffer[k][K]=i.createFramebuffer()}else N.__webglFramebuffer[k]=i.createFramebuffer()}else{if(m.mipmaps&&m.mipmaps.length>0){N.__webglFramebuffer=[];for(let k=0;k<m.mipmaps.length;k++)N.__webglFramebuffer[k]=i.createFramebuffer()}else N.__webglFramebuffer=i.createFramebuffer();if(ae)for(let k=0,K=J.length;k<K;k++){const de=n.get(J[k]);de.__webglTexture===void 0&&(de.__webglTexture=i.createTexture(),a.memory.textures++)}if(S.samples>0&&Be(S)===!1){N.__webglMultisampledFramebuffer=i.createFramebuffer(),N.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,N.__webglMultisampledFramebuffer);for(let k=0;k<J.length;k++){const K=J[k];N.__webglColorRenderbuffer[k]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,N.__webglColorRenderbuffer[k]);const de=s.convert(K.format,K.colorSpace),_e=s.convert(K.type),re=b(K.internalFormat,de,_e,K.normalized,K.colorSpace,S.isXRRenderTarget===!0),te=dt(S);i.renderbufferStorageMultisample(i.RENDERBUFFER,te,re,S.width,S.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+k,i.RENDERBUFFER,N.__webglColorRenderbuffer[k])}i.bindRenderbuffer(i.RENDERBUFFER,null),S.depthBuffer&&(N.__webglDepthRenderbuffer=i.createRenderbuffer(),it(N.__webglDepthRenderbuffer,S,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ee){t.bindTexture(i.TEXTURE_CUBE_MAP,Y.__webglTexture),Le(i.TEXTURE_CUBE_MAP,m);for(let k=0;k<6;k++)if(m.mipmaps&&m.mipmaps.length>0)for(let K=0;K<m.mipmaps.length;K++)ye(N.__webglFramebuffer[k][K],S,m,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+k,K);else ye(N.__webglFramebuffer[k],S,m,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+k,0);f(m)&&M(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ae){for(let k=0,K=J.length;k<K;k++){const de=J[k],_e=n.get(de);let re=i.TEXTURE_2D;(S.isWebGL3DRenderTarget||S.isWebGLArrayRenderTarget)&&(re=S.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(re,_e.__webglTexture),Le(re,de),ye(N.__webglFramebuffer,S,de,i.COLOR_ATTACHMENT0+k,re,0),f(de)&&M(re)}t.unbindTexture()}else{let k=i.TEXTURE_2D;if((S.isWebGL3DRenderTarget||S.isWebGLArrayRenderTarget)&&(k=S.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(k,Y.__webglTexture),Le(k,m),m.mipmaps&&m.mipmaps.length>0)for(let K=0;K<m.mipmaps.length;K++)ye(N.__webglFramebuffer[K],S,m,i.COLOR_ATTACHMENT0,k,K);else ye(N.__webglFramebuffer,S,m,i.COLOR_ATTACHMENT0,k,0);f(m)&&M(k),t.unbindTexture()}S.depthBuffer&&Ke(S)}function ht(S){const m=S.textures;for(let N=0,Y=m.length;N<Y;N++){const J=m[N];if(f(J)){const ee=y(S),ae=n.get(J).__webglTexture;t.bindTexture(ee,ae),M(ee),t.unbindTexture()}}}const rt=[],Rt=[];function C(S){if(S.samples>0){if(Be(S)===!1){const m=S.textures,N=S.width,Y=S.height;let J=i.COLOR_BUFFER_BIT;const ee=S.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ae=n.get(S),k=m.length>1;if(k)for(let de=0;de<m.length;de++)t.bindFramebuffer(i.FRAMEBUFFER,ae.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+de,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,ae.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+de,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,ae.__webglMultisampledFramebuffer);const K=S.texture.mipmaps;K&&K.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ae.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ae.__webglFramebuffer);for(let de=0;de<m.length;de++){if(S.resolveDepthBuffer&&(S.depthBuffer&&(J|=i.DEPTH_BUFFER_BIT),S.stencilBuffer&&S.resolveStencilBuffer&&(J|=i.STENCIL_BUFFER_BIT)),k){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,ae.__webglColorRenderbuffer[de]);const _e=n.get(m[de]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,_e,0)}i.blitFramebuffer(0,0,N,Y,0,0,N,Y,J,i.NEAREST),c===!0&&(rt.length=0,Rt.length=0,rt.push(i.COLOR_ATTACHMENT0+de),S.depthBuffer&&S.resolveDepthBuffer===!1&&(rt.push(ee),Rt.push(ee),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Rt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,rt))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),k)for(let de=0;de<m.length;de++){t.bindFramebuffer(i.FRAMEBUFFER,ae.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+de,i.RENDERBUFFER,ae.__webglColorRenderbuffer[de]);const _e=n.get(m[de]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,ae.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+de,i.TEXTURE_2D,_e,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,ae.__webglMultisampledFramebuffer)}else if(S.depthBuffer&&S.resolveDepthBuffer===!1&&c){const m=S.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[m])}}}function dt(S){return Math.min(r.maxSamples,S.samples)}function Be(S){const m=n.get(S);return S.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&m.__useRenderToTexture!==!1}function et(S){const m=a.render.frame;h.get(S)!==m&&(h.set(S,m),S.update())}function oe(S,m){const N=S.colorSpace,Y=S.format,J=S.type;return S.isCompressedTexture===!0||S.isVideoTexture===!0||N!==or&&N!==An&&(ze.getTransfer(N)===Xe?(Y!==Vt||J!==Dt)&&Ae("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):ke("WebGLTextures: Unsupported texture color space:",N)),m}function st(S){return typeof HTMLImageElement<"u"&&S instanceof HTMLImageElement?(l.width=S.naturalWidth||S.width,l.height=S.naturalHeight||S.height):typeof VideoFrame<"u"&&S instanceof VideoFrame?(l.width=S.displayWidth,l.height=S.displayHeight):(l.width=S.width,l.height=S.height),l}this.allocateTextureUnit=G,this.resetTextureUnits=W,this.getTextureUnits=X,this.setTextureUnits=U,this.setTexture2D=$,this.setTexture2DArray=Q,this.setTexture3D=ce,this.setTextureCube=xe,this.rebindTextures=nt,this.setupRenderTarget=Fe,this.updateRenderTargetMipmap=ht,this.updateMultisampleRenderTarget=C,this.setupDepthRenderbuffer=Ke,this.setupFrameBufferTexture=ye,this.useMultisampledRTT=Be,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function lp(i,e){function t(n,r=An){let s;const a=ze.getTransfer(r);if(n===Dt)return i.UNSIGNED_BYTE;if(n===Xs)return i.UNSIGNED_SHORT_4_4_4_4;if(n===qs)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Ao)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Ro)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===bo)return i.BYTE;if(n===yo)return i.SHORT;if(n===Ti)return i.UNSIGNED_SHORT;if(n===Ws)return i.INT;if(n===en)return i.UNSIGNED_INT;if(n===$t)return i.FLOAT;if(n===pn)return i.HALF_FLOAT;if(n===wo)return i.ALPHA;if(n===Co)return i.RGB;if(n===Vt)return i.RGBA;if(n===mn)return i.DEPTH_COMPONENT;if(n===Bn)return i.DEPTH_STENCIL;if(n===Ys)return i.RED;if(n===Ks)return i.RED_INTEGER;if(n===Gn)return i.RG;if(n===Zs)return i.RG_INTEGER;if(n===$s)return i.RGBA_INTEGER;if(n===er||n===tr||n===nr||n===ir)if(a===Xe)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===er)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===tr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===nr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ir)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===er)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===tr)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===nr)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ir)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===cs||n===us||n===fs||n===hs)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===cs)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===us)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===fs)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===hs)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===ds||n===ps||n===ms||n===_s||n===gs||n===sr||n===xs)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===ds||n===ps)return a===Xe?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===ms)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC;if(n===_s)return s.COMPRESSED_R11_EAC;if(n===gs)return s.COMPRESSED_SIGNED_R11_EAC;if(n===sr)return s.COMPRESSED_RG11_EAC;if(n===xs)return s.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===vs||n===Ss||n===Ms||n===Es||n===Ts||n===bs||n===ys||n===As||n===Rs||n===ws||n===Cs||n===Ps||n===Ds||n===Ls)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===vs)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Ss)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Ms)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Es)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Ts)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===bs)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===ys)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===As)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Rs)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===ws)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Cs)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Ps)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Ds)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ls)return a===Xe?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Us||n===Is||n===Ns)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===Us)return a===Xe?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Is)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Ns)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Fs||n===Os||n===ar||n===Bs)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===Fs)return s.COMPRESSED_RED_RGTC1_EXT;if(n===Os)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===ar)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Bs)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===bi?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const cp=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,up=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class fp{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Go(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new kt({vertexShader:cp,fragmentShader:up,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new tn(new pr(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class hp extends Hn{constructor(e,t){super();const n=this;let r=null,s=1,a=null,o="local-floor",c=1,l=null,h=null,p=null,u=null,_=null,v=null;const E=typeof XRWebGLBinding<"u",d=new fp,f={},M=t.getContextAttributes();let y=null,b=null;const P=[],T=[],D=new qe;let x=null;const A=new zt;A.viewport=new ut;const I=new zt;I.viewport=new ut;const R=[A,I],z=new Mc;let W=null,X=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Z){let he=P[Z];return he===void 0&&(he=new Cr,P[Z]=he),he.getTargetRaySpace()},this.getControllerGrip=function(Z){let he=P[Z];return he===void 0&&(he=new Cr,P[Z]=he),he.getGripSpace()},this.getHand=function(Z){let he=P[Z];return he===void 0&&(he=new Cr,P[Z]=he),he.getHandSpace()};function U(Z){const he=T.indexOf(Z.inputSource);if(he===-1)return;const ie=P[he];ie!==void 0&&(ie.update(Z.inputSource,Z.frame,l||a),ie.dispatchEvent({type:Z.type,data:Z.inputSource}))}function G(){r.removeEventListener("select",U),r.removeEventListener("selectstart",U),r.removeEventListener("selectend",U),r.removeEventListener("squeeze",U),r.removeEventListener("squeezestart",U),r.removeEventListener("squeezeend",U),r.removeEventListener("end",G),r.removeEventListener("inputsourceschange",V);for(let Z=0;Z<P.length;Z++){const he=T[Z];he!==null&&(T[Z]=null,P[Z].disconnect(he))}W=null,X=null,d.reset();for(const Z in f)delete f[Z];e.setRenderTarget(y),_=null,u=null,p=null,r=null,b=null,Le.stop(),n.isPresenting=!1,e.setPixelRatio(x),e.setSize(D.width,D.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Z){s=Z,n.isPresenting===!0&&Ae("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Z){o=Z,n.isPresenting===!0&&Ae("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(Z){l=Z},this.getBaseLayer=function(){return u!==null?u:_},this.getBinding=function(){return p===null&&E&&(p=new XRWebGLBinding(r,t)),p},this.getFrame=function(){return v},this.getSession=function(){return r},this.setSession=async function(Z){if(r=Z,r!==null){if(y=e.getRenderTarget(),r.addEventListener("select",U),r.addEventListener("selectstart",U),r.addEventListener("selectend",U),r.addEventListener("squeeze",U),r.addEventListener("squeezestart",U),r.addEventListener("squeezeend",U),r.addEventListener("end",G),r.addEventListener("inputsourceschange",V),M.xrCompatible!==!0&&await t.makeXRCompatible(),x=e.getPixelRatio(),e.getSize(D),E&&"createProjectionLayer"in XRWebGLBinding.prototype){let ie=null,be=null,we=null;M.depth&&(we=M.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ie=M.stencil?Bn:mn,be=M.stencil?bi:en);const ye={colorFormat:t.RGBA8,depthFormat:we,scaleFactor:s};p=this.getBinding(),u=p.createProjectionLayer(ye),r.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),b=new Qt(u.textureWidth,u.textureHeight,{format:Vt,type:Dt,depthTexture:new ci(u.textureWidth,u.textureHeight,be,void 0,void 0,void 0,void 0,void 0,void 0,ie),stencilBuffer:M.stencil,colorSpace:e.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{const ie={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:s};_=new XRWebGLLayer(r,t,ie),r.updateRenderState({baseLayer:_}),e.setPixelRatio(1),e.setSize(_.framebufferWidth,_.framebufferHeight,!1),b=new Qt(_.framebufferWidth,_.framebufferHeight,{format:Vt,type:Dt,colorSpace:e.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:_.ignoreDepthValues===!1,resolveStencilBuffer:_.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await r.requestReferenceSpace(o),Le.setContext(r),Le.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return d.getDepthTexture()};function V(Z){for(let he=0;he<Z.removed.length;he++){const ie=Z.removed[he],be=T.indexOf(ie);be>=0&&(T[be]=null,P[be].disconnect(ie))}for(let he=0;he<Z.added.length;he++){const ie=Z.added[he];let be=T.indexOf(ie);if(be===-1){for(let ye=0;ye<P.length;ye++)if(ye>=T.length){T.push(ie),be=ye;break}else if(T[ye]===null){T[ye]=ie,be=ye;break}if(be===-1)break}const we=P[be];we&&we.connect(ie)}}const $=new B,Q=new B;function ce(Z,he,ie){$.setFromMatrixPosition(he.matrixWorld),Q.setFromMatrixPosition(ie.matrixWorld);const be=$.distanceTo(Q),we=he.projectionMatrix.elements,ye=ie.projectionMatrix.elements,it=we[14]/(we[10]-1),Oe=we[14]/(we[10]+1),Ke=(we[9]+1)/we[5],nt=(we[9]-1)/we[5],Fe=(we[8]-1)/we[0],ht=(ye[8]+1)/ye[0],rt=it*Fe,Rt=it*ht,C=be/(-Fe+ht),dt=C*-Fe;if(he.matrixWorld.decompose(Z.position,Z.quaternion,Z.scale),Z.translateX(dt),Z.translateZ(C),Z.matrixWorld.compose(Z.position,Z.quaternion,Z.scale),Z.matrixWorldInverse.copy(Z.matrixWorld).invert(),we[10]===-1)Z.projectionMatrix.copy(he.projectionMatrix),Z.projectionMatrixInverse.copy(he.projectionMatrixInverse);else{const Be=it+C,et=Oe+C,oe=rt-dt,st=Rt+(be-dt),S=Ke*Oe/et*Be,m=nt*Oe/et*Be;Z.projectionMatrix.makePerspective(oe,st,S,m,Be,et),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert()}}function xe(Z,he){he===null?Z.matrixWorld.copy(Z.matrix):Z.matrixWorld.multiplyMatrices(he.matrixWorld,Z.matrix),Z.matrixWorldInverse.copy(Z.matrixWorld).invert()}this.updateCamera=function(Z){if(r===null)return;let he=Z.near,ie=Z.far;d.texture!==null&&(d.depthNear>0&&(he=d.depthNear),d.depthFar>0&&(ie=d.depthFar)),z.near=I.near=A.near=he,z.far=I.far=A.far=ie,(W!==z.near||X!==z.far)&&(r.updateRenderState({depthNear:z.near,depthFar:z.far}),W=z.near,X=z.far),z.layers.mask=Z.layers.mask|6,A.layers.mask=z.layers.mask&-5,I.layers.mask=z.layers.mask&-3;const be=Z.parent,we=z.cameras;xe(z,be);for(let ye=0;ye<we.length;ye++)xe(we[ye],be);we.length===2?ce(z,A,I):z.projectionMatrix.copy(A.projectionMatrix),Ee(Z,z,be)};function Ee(Z,he,ie){ie===null?Z.matrix.copy(he.matrixWorld):(Z.matrix.copy(ie.matrixWorld),Z.matrix.invert(),Z.matrix.multiply(he.matrixWorld)),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.updateMatrixWorld(!0),Z.projectionMatrix.copy(he.projectionMatrix),Z.projectionMatrixInverse.copy(he.projectionMatrixInverse),Z.isPerspectiveCamera&&(Z.fov=Gs*2*Math.atan(1/Z.projectionMatrix.elements[5]),Z.zoom=1)}this.getCamera=function(){return z},this.getFoveation=function(){if(!(u===null&&_===null))return c},this.setFoveation=function(Z){c=Z,u!==null&&(u.fixedFoveation=Z),_!==null&&_.fixedFoveation!==void 0&&(_.fixedFoveation=Z)},this.hasDepthSensing=function(){return d.texture!==null},this.getDepthSensingMesh=function(){return d.getMesh(z)},this.getCameraTexture=function(Z){return f[Z]};let Ve=null;function Ye(Z,he){if(h=he.getViewerPose(l||a),v=he,h!==null){const ie=h.views;_!==null&&(e.setRenderTargetFramebuffer(b,_.framebuffer),e.setRenderTarget(b));let be=!1;ie.length!==z.cameras.length&&(z.cameras.length=0,be=!0);for(let Oe=0;Oe<ie.length;Oe++){const Ke=ie[Oe];let nt=null;if(_!==null)nt=_.getViewport(Ke);else{const ht=p.getViewSubImage(u,Ke);nt=ht.viewport,Oe===0&&(e.setRenderTargetTextures(b,ht.colorTexture,ht.depthStencilTexture),e.setRenderTarget(b))}let Fe=R[Oe];Fe===void 0&&(Fe=new zt,Fe.layers.enable(Oe),Fe.viewport=new ut,R[Oe]=Fe),Fe.matrix.fromArray(Ke.transform.matrix),Fe.matrix.decompose(Fe.position,Fe.quaternion,Fe.scale),Fe.projectionMatrix.fromArray(Ke.projectionMatrix),Fe.projectionMatrixInverse.copy(Fe.projectionMatrix).invert(),Fe.viewport.set(nt.x,nt.y,nt.width,nt.height),Oe===0&&(z.matrix.copy(Fe.matrix),z.matrix.decompose(z.position,z.quaternion,z.scale)),be===!0&&z.cameras.push(Fe)}const we=r.enabledFeatures;if(we&&we.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&E){p=n.getBinding();const Oe=p.getDepthInformation(ie[0]);Oe&&Oe.isValid&&Oe.texture&&d.init(Oe,r.renderState)}if(we&&we.includes("camera-access")&&E){e.state.unbindTexture(),p=n.getBinding();for(let Oe=0;Oe<ie.length;Oe++){const Ke=ie[Oe].camera;if(Ke){let nt=f[Ke];nt||(nt=new Go,f[Ke]=nt);const Fe=p.getCameraImage(Ke);nt.sourceTexture=Fe}}}}for(let ie=0;ie<P.length;ie++){const be=T[ie],we=P[ie];be!==null&&we!==void 0&&we.update(be,he,l||a)}Ve&&Ve(Z,he),he.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:he}),v=null}const Le=new ko;Le.setAnimationLoop(Ye),this.setAnimationLoop=function(Z){Ve=Z},this.dispose=function(){}}}const dp=new pt,$o=new Ce;$o.set(-1,0,0,0,1,0,0,0,1);function pp(i,e){function t(d,f){d.matrixAutoUpdate===!0&&d.updateMatrix(),f.value.copy(d.matrix)}function n(d,f){f.color.getRGB(d.fogColor.value,Vo(i)),f.isFog?(d.fogNear.value=f.near,d.fogFar.value=f.far):f.isFogExp2&&(d.fogDensity.value=f.density)}function r(d,f,M,y,b){f.isNodeMaterial?f.uniformsNeedUpdate=!1:f.isMeshBasicMaterial?s(d,f):f.isMeshLambertMaterial?(s(d,f),f.envMap&&(d.envMapIntensity.value=f.envMapIntensity)):f.isMeshToonMaterial?(s(d,f),p(d,f)):f.isMeshPhongMaterial?(s(d,f),h(d,f),f.envMap&&(d.envMapIntensity.value=f.envMapIntensity)):f.isMeshStandardMaterial?(s(d,f),u(d,f),f.isMeshPhysicalMaterial&&_(d,f,b)):f.isMeshMatcapMaterial?(s(d,f),v(d,f)):f.isMeshDepthMaterial?s(d,f):f.isMeshDistanceMaterial?(s(d,f),E(d,f)):f.isMeshNormalMaterial?s(d,f):f.isLineBasicMaterial?(a(d,f),f.isLineDashedMaterial&&o(d,f)):f.isPointsMaterial?c(d,f,M,y):f.isSpriteMaterial?l(d,f):f.isShadowMaterial?(d.color.value.copy(f.color),d.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function s(d,f){d.opacity.value=f.opacity,f.color&&d.diffuse.value.copy(f.color),f.emissive&&d.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(d.map.value=f.map,t(f.map,d.mapTransform)),f.alphaMap&&(d.alphaMap.value=f.alphaMap,t(f.alphaMap,d.alphaMapTransform)),f.bumpMap&&(d.bumpMap.value=f.bumpMap,t(f.bumpMap,d.bumpMapTransform),d.bumpScale.value=f.bumpScale,f.side===At&&(d.bumpScale.value*=-1)),f.normalMap&&(d.normalMap.value=f.normalMap,t(f.normalMap,d.normalMapTransform),d.normalScale.value.copy(f.normalScale),f.side===At&&d.normalScale.value.negate()),f.displacementMap&&(d.displacementMap.value=f.displacementMap,t(f.displacementMap,d.displacementMapTransform),d.displacementScale.value=f.displacementScale,d.displacementBias.value=f.displacementBias),f.emissiveMap&&(d.emissiveMap.value=f.emissiveMap,t(f.emissiveMap,d.emissiveMapTransform)),f.specularMap&&(d.specularMap.value=f.specularMap,t(f.specularMap,d.specularMapTransform)),f.alphaTest>0&&(d.alphaTest.value=f.alphaTest);const M=e.get(f),y=M.envMap,b=M.envMapRotation;y&&(d.envMap.value=y,d.envMapRotation.value.setFromMatrix4(dp.makeRotationFromEuler(b)).transpose(),y.isCubeTexture&&y.isRenderTargetTexture===!1&&d.envMapRotation.value.premultiply($o),d.reflectivity.value=f.reflectivity,d.ior.value=f.ior,d.refractionRatio.value=f.refractionRatio),f.lightMap&&(d.lightMap.value=f.lightMap,d.lightMapIntensity.value=f.lightMapIntensity,t(f.lightMap,d.lightMapTransform)),f.aoMap&&(d.aoMap.value=f.aoMap,d.aoMapIntensity.value=f.aoMapIntensity,t(f.aoMap,d.aoMapTransform))}function a(d,f){d.diffuse.value.copy(f.color),d.opacity.value=f.opacity,f.map&&(d.map.value=f.map,t(f.map,d.mapTransform))}function o(d,f){d.dashSize.value=f.dashSize,d.totalSize.value=f.dashSize+f.gapSize,d.scale.value=f.scale}function c(d,f,M,y){d.diffuse.value.copy(f.color),d.opacity.value=f.opacity,d.size.value=f.size*M,d.scale.value=y*.5,f.map&&(d.map.value=f.map,t(f.map,d.uvTransform)),f.alphaMap&&(d.alphaMap.value=f.alphaMap,t(f.alphaMap,d.alphaMapTransform)),f.alphaTest>0&&(d.alphaTest.value=f.alphaTest)}function l(d,f){d.diffuse.value.copy(f.color),d.opacity.value=f.opacity,d.rotation.value=f.rotation,f.map&&(d.map.value=f.map,t(f.map,d.mapTransform)),f.alphaMap&&(d.alphaMap.value=f.alphaMap,t(f.alphaMap,d.alphaMapTransform)),f.alphaTest>0&&(d.alphaTest.value=f.alphaTest)}function h(d,f){d.specular.value.copy(f.specular),d.shininess.value=Math.max(f.shininess,1e-4)}function p(d,f){f.gradientMap&&(d.gradientMap.value=f.gradientMap)}function u(d,f){d.metalness.value=f.metalness,f.metalnessMap&&(d.metalnessMap.value=f.metalnessMap,t(f.metalnessMap,d.metalnessMapTransform)),d.roughness.value=f.roughness,f.roughnessMap&&(d.roughnessMap.value=f.roughnessMap,t(f.roughnessMap,d.roughnessMapTransform)),f.envMap&&(d.envMapIntensity.value=f.envMapIntensity)}function _(d,f,M){d.ior.value=f.ior,f.sheen>0&&(d.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),d.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(d.sheenColorMap.value=f.sheenColorMap,t(f.sheenColorMap,d.sheenColorMapTransform)),f.sheenRoughnessMap&&(d.sheenRoughnessMap.value=f.sheenRoughnessMap,t(f.sheenRoughnessMap,d.sheenRoughnessMapTransform))),f.clearcoat>0&&(d.clearcoat.value=f.clearcoat,d.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(d.clearcoatMap.value=f.clearcoatMap,t(f.clearcoatMap,d.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(d.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,t(f.clearcoatRoughnessMap,d.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(d.clearcoatNormalMap.value=f.clearcoatNormalMap,t(f.clearcoatNormalMap,d.clearcoatNormalMapTransform),d.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===At&&d.clearcoatNormalScale.value.negate())),f.dispersion>0&&(d.dispersion.value=f.dispersion),f.iridescence>0&&(d.iridescence.value=f.iridescence,d.iridescenceIOR.value=f.iridescenceIOR,d.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],d.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(d.iridescenceMap.value=f.iridescenceMap,t(f.iridescenceMap,d.iridescenceMapTransform)),f.iridescenceThicknessMap&&(d.iridescenceThicknessMap.value=f.iridescenceThicknessMap,t(f.iridescenceThicknessMap,d.iridescenceThicknessMapTransform))),f.transmission>0&&(d.transmission.value=f.transmission,d.transmissionSamplerMap.value=M.texture,d.transmissionSamplerSize.value.set(M.width,M.height),f.transmissionMap&&(d.transmissionMap.value=f.transmissionMap,t(f.transmissionMap,d.transmissionMapTransform)),d.thickness.value=f.thickness,f.thicknessMap&&(d.thicknessMap.value=f.thicknessMap,t(f.thicknessMap,d.thicknessMapTransform)),d.attenuationDistance.value=f.attenuationDistance,d.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(d.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(d.anisotropyMap.value=f.anisotropyMap,t(f.anisotropyMap,d.anisotropyMapTransform))),d.specularIntensity.value=f.specularIntensity,d.specularColor.value.copy(f.specularColor),f.specularColorMap&&(d.specularColorMap.value=f.specularColorMap,t(f.specularColorMap,d.specularColorMapTransform)),f.specularIntensityMap&&(d.specularIntensityMap.value=f.specularIntensityMap,t(f.specularIntensityMap,d.specularIntensityMapTransform))}function v(d,f){f.matcap&&(d.matcap.value=f.matcap)}function E(d,f){const M=e.get(f).light;d.referencePosition.value.setFromMatrixPosition(M.matrixWorld),d.nearDistance.value=M.shadow.camera.near,d.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function mp(i,e,t,n){let r={},s={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(M,y){const b=y.program;n.uniformBlockBinding(M,b)}function l(M,y){let b=r[M.id];b===void 0&&(v(M),b=h(M),r[M.id]=b,M.addEventListener("dispose",d));const P=y.program;n.updateUBOMapping(M,P);const T=e.render.frame;s[M.id]!==T&&(u(M),s[M.id]=T)}function h(M){const y=p();M.__bindingPointIndex=y;const b=i.createBuffer(),P=M.__size,T=M.usage;return i.bindBuffer(i.UNIFORM_BUFFER,b),i.bufferData(i.UNIFORM_BUFFER,P,T),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,y,b),b}function p(){for(let M=0;M<o;M++)if(a.indexOf(M)===-1)return a.push(M),M;return ke("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(M){const y=r[M.id],b=M.uniforms,P=M.__cache;i.bindBuffer(i.UNIFORM_BUFFER,y);for(let T=0,D=b.length;T<D;T++){const x=Array.isArray(b[T])?b[T]:[b[T]];for(let A=0,I=x.length;A<I;A++){const R=x[A];if(_(R,T,A,P)===!0){const z=R.__offset,W=Array.isArray(R.value)?R.value:[R.value];let X=0;for(let U=0;U<W.length;U++){const G=W[U],V=E(G);typeof G=="number"||typeof G=="boolean"?(R.__data[0]=G,i.bufferSubData(i.UNIFORM_BUFFER,z+X,R.__data)):G.isMatrix3?(R.__data[0]=G.elements[0],R.__data[1]=G.elements[1],R.__data[2]=G.elements[2],R.__data[3]=0,R.__data[4]=G.elements[3],R.__data[5]=G.elements[4],R.__data[6]=G.elements[5],R.__data[7]=0,R.__data[8]=G.elements[6],R.__data[9]=G.elements[7],R.__data[10]=G.elements[8],R.__data[11]=0):ArrayBuffer.isView(G)?R.__data.set(new G.constructor(G.buffer,G.byteOffset,R.__data.length)):(G.toArray(R.__data,X),X+=V.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,z,R.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function _(M,y,b,P){const T=M.value,D=y+"_"+b;if(P[D]===void 0)return typeof T=="number"||typeof T=="boolean"?P[D]=T:ArrayBuffer.isView(T)?P[D]=T.slice():P[D]=T.clone(),!0;{const x=P[D];if(typeof T=="number"||typeof T=="boolean"){if(x!==T)return P[D]=T,!0}else{if(ArrayBuffer.isView(T))return!0;if(x.equals(T)===!1)return x.copy(T),!0}}return!1}function v(M){const y=M.uniforms;let b=0;const P=16;for(let D=0,x=y.length;D<x;D++){const A=Array.isArray(y[D])?y[D]:[y[D]];for(let I=0,R=A.length;I<R;I++){const z=A[I],W=Array.isArray(z.value)?z.value:[z.value];for(let X=0,U=W.length;X<U;X++){const G=W[X],V=E(G),$=b%P,Q=$%V.boundary,ce=$+Q;b+=Q,ce!==0&&P-ce<V.storage&&(b+=P-ce),z.__data=new Float32Array(V.storage/Float32Array.BYTES_PER_ELEMENT),z.__offset=b,b+=V.storage}}}const T=b%P;return T>0&&(b+=P-T),M.__size=b,M.__cache={},this}function E(M){const y={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(y.boundary=4,y.storage=4):M.isVector2?(y.boundary=8,y.storage=8):M.isVector3||M.isColor?(y.boundary=16,y.storage=12):M.isVector4?(y.boundary=16,y.storage=16):M.isMatrix3?(y.boundary=48,y.storage=48):M.isMatrix4?(y.boundary=64,y.storage=64):M.isTexture?Ae("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(M)?(y.boundary=16,y.storage=M.byteLength):Ae("WebGLRenderer: Unsupported uniform value type.",M),y}function d(M){const y=M.target;y.removeEventListener("dispose",d);const b=a.indexOf(y.__bindingPointIndex);a.splice(b,1),i.deleteBuffer(r[y.id]),delete r[y.id],delete s[y.id]}function f(){for(const M in r)i.deleteBuffer(r[M]);a=[],r={},s={}}return{bind:c,update:l,dispose:f}}const _p=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Yt=null;function gp(){return Yt===null&&(Yt=new Oo(_p,16,16,Gn,pn),Yt.name="DFG_LUT",Yt.minFilter=xt,Yt.magFilter=xt,Yt.wrapS=Zt,Yt.wrapT=Zt,Yt.generateMipmaps=!1,Yt.needsUpdate=!0),Yt}class xp{constructor(e={}){const{canvas:t=zl(),context:n=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:u=!1,outputBufferType:_=Dt}=e;this.isWebGLRenderer=!0;let v;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");v=n.getContextAttributes().alpha}else v=a;const E=_,d=new Set([$s,Zs,Ks]),f=new Set([Dt,en,Ti,bi,Xs,qs]),M=new Uint32Array(4),y=new Int32Array(4),b=new B;let P=null,T=null;const D=[],x=[];let A=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Jt,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const I=this;let R=!1,z=null;this._outputColorSpace=Nt;let W=0,X=0,U=null,G=-1,V=null;const $=new ut,Q=new ut;let ce=null;const xe=new je(0);let Ee=0,Ve=t.width,Ye=t.height,Le=1,Z=null,he=null;const ie=new ut(0,0,Ve,Ye),be=new ut(0,0,Ve,Ye);let we=!1;const ye=new Bo;let it=!1,Oe=!1;const Ke=new pt,nt=new B,Fe=new ut,ht={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let rt=!1;function Rt(){return U===null?Le:1}let C=n;function dt(g,L){return t.getContext(g,L)}try{const g={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:p};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${ks}`),t.addEventListener("webglcontextlost",j,!1),t.addEventListener("webglcontextrestored",Se,!1),t.addEventListener("webglcontextcreationerror",Pe,!1),C===null){const L="webgl2";if(C=dt(L,g),C===null)throw dt(L)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(g){throw ke("WebGLRenderer: "+g.message),g}let Be,et,oe,st,S,m,N,Y,J,ee,ae,k,K,de,_e,re,te,Re,Ue,We,w,ne,q;function pe(){Be=new gh(C),Be.init(),w=new lp(C,Be),et=new ch(C,Be,e,w),oe=new ap(C,Be),et.reversedDepthBuffer&&u&&oe.buffers.depth.setReversed(!0),st=new Sh(C),S=new qd,m=new op(C,Be,oe,S,et,w,st),N=new _h(I),Y=new Tc(C),ne=new oh(C,Y),J=new xh(C,Y,st,ne),ee=new Eh(C,J,Y,ne,st),Re=new Mh(C,et,m),_e=new uh(S),ae=new Xd(I,N,Be,et,ne,_e),k=new pp(I,S),K=new Kd,de=new ep(Be),te=new ah(I,N,oe,ee,v,c),re=new sp(I,ee,et),q=new mp(C,st,et,oe),Ue=new lh(C,Be,st),We=new vh(C,Be,st),st.programs=ae.programs,I.capabilities=et,I.extensions=Be,I.properties=S,I.renderLists=K,I.shadowMap=re,I.state=oe,I.info=st}pe(),E!==Dt&&(A=new bh(E,t.width,t.height,r,s));const se=new hp(I,C);this.xr=se,this.getContext=function(){return C},this.getContextAttributes=function(){return C.getContextAttributes()},this.forceContextLoss=function(){const g=Be.get("WEBGL_lose_context");g&&g.loseContext()},this.forceContextRestore=function(){const g=Be.get("WEBGL_lose_context");g&&g.restoreContext()},this.getPixelRatio=function(){return Le},this.setPixelRatio=function(g){g!==void 0&&(Le=g,this.setSize(Ve,Ye,!1))},this.getSize=function(g){return g.set(Ve,Ye)},this.setSize=function(g,L,H=!0){if(se.isPresenting){Ae("WebGLRenderer: Can't change size while VR device is presenting.");return}Ve=g,Ye=L,t.width=Math.floor(g*Le),t.height=Math.floor(L*Le),H===!0&&(t.style.width=g+"px",t.style.height=L+"px"),A!==null&&A.setSize(t.width,t.height),this.setViewport(0,0,g,L)},this.getDrawingBufferSize=function(g){return g.set(Ve*Le,Ye*Le).floor()},this.setDrawingBufferSize=function(g,L,H){Ve=g,Ye=L,Le=H,t.width=Math.floor(g*H),t.height=Math.floor(L*H),this.setViewport(0,0,g,L)},this.setEffects=function(g){if(E===Dt){ke("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(g){for(let L=0;L<g.length;L++)if(g[L].isOutputPass===!0){Ae("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}A.setEffects(g||[])},this.getCurrentViewport=function(g){return g.copy($)},this.getViewport=function(g){return g.copy(ie)},this.setViewport=function(g,L,H,F){g.isVector4?ie.set(g.x,g.y,g.z,g.w):ie.set(g,L,H,F),oe.viewport($.copy(ie).multiplyScalar(Le).round())},this.getScissor=function(g){return g.copy(be)},this.setScissor=function(g,L,H,F){g.isVector4?be.set(g.x,g.y,g.z,g.w):be.set(g,L,H,F),oe.scissor(Q.copy(be).multiplyScalar(Le).round())},this.getScissorTest=function(){return we},this.setScissorTest=function(g){oe.setScissorTest(we=g)},this.setOpaqueSort=function(g){Z=g},this.setTransparentSort=function(g){he=g},this.getClearColor=function(g){return g.copy(te.getClearColor())},this.setClearColor=function(){te.setClearColor(...arguments)},this.getClearAlpha=function(){return te.getClearAlpha()},this.setClearAlpha=function(){te.setClearAlpha(...arguments)},this.clear=function(g=!0,L=!0,H=!0){let F=0;if(g){let O=!1;if(U!==null){const fe=U.texture.format;O=d.has(fe)}if(O){const fe=U.texture.type,ge=f.has(fe),ue=te.getClearColor(),ve=te.getClearAlpha(),Me=ue.r,De=ue.g,Ne=ue.b;ge?(M[0]=Me,M[1]=De,M[2]=Ne,M[3]=ve,C.clearBufferuiv(C.COLOR,0,M)):(y[0]=Me,y[1]=De,y[2]=Ne,y[3]=ve,C.clearBufferiv(C.COLOR,0,y))}else F|=C.COLOR_BUFFER_BIT}L&&(F|=C.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),H&&(F|=C.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),F!==0&&C.clear(F)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(g){g.setRenderer(this),z=g},this.dispose=function(){t.removeEventListener("webglcontextlost",j,!1),t.removeEventListener("webglcontextrestored",Se,!1),t.removeEventListener("webglcontextcreationerror",Pe,!1),te.dispose(),K.dispose(),de.dispose(),S.dispose(),N.dispose(),ee.dispose(),ne.dispose(),q.dispose(),ae.dispose(),se.dispose(),se.removeEventListener("sessionstart",oa),se.removeEventListener("sessionend",la),Cn.stop()};function j(g){g.preventDefault(),ba("WebGLRenderer: Context Lost."),R=!0}function Se(){ba("WebGLRenderer: Context Restored."),R=!1;const g=st.autoReset,L=re.enabled,H=re.autoUpdate,F=re.needsUpdate,O=re.type;pe(),st.autoReset=g,re.enabled=L,re.autoUpdate=H,re.needsUpdate=F,re.type=O}function Pe(g){ke("WebGLRenderer: A WebGL context could not be created. Reason: ",g.statusMessage)}function ot(g){const L=g.target;L.removeEventListener("dispose",ot),Ze(L)}function Ze(g){rn(g),S.remove(g)}function rn(g){const L=S.get(g).programs;L!==void 0&&(L.forEach(function(H){ae.releaseProgram(H)}),g.isShaderMaterial&&ae.releaseShaderCache(g))}this.renderBufferDirect=function(g,L,H,F,O,fe){L===null&&(L=ht);const ge=O.isMesh&&O.matrixWorld.determinant()<0,ue=Qo(g,L,H,F,O);oe.setMaterial(F,ge);let ve=H.index,Me=1;if(F.wireframe===!0){if(ve=J.getWireframeAttribute(H),ve===void 0)return;Me=2}const De=H.drawRange,Ne=H.attributes.position;let Te=De.start*Me,$e=(De.start+De.count)*Me;fe!==null&&(Te=Math.max(Te,fe.start*Me),$e=Math.min($e,(fe.start+fe.count)*Me)),ve!==null?(Te=Math.max(Te,0),$e=Math.min($e,ve.count)):Ne!=null&&(Te=Math.max(Te,0),$e=Math.min($e,Ne.count));const lt=$e-Te;if(lt<0||lt===1/0)return;ne.setup(O,F,ue,H,ve);let at,Je=Ue;if(ve!==null&&(at=Y.get(ve),Je=We,Je.setIndex(at)),O.isMesh)F.wireframe===!0?(oe.setLineWidth(F.wireframeLinewidth*Rt()),Je.setMode(C.LINES)):Je.setMode(C.TRIANGLES);else if(O.isLine){let St=F.linewidth;St===void 0&&(St=1),oe.setLineWidth(St*Rt()),O.isLineSegments?Je.setMode(C.LINES):O.isLineLoop?Je.setMode(C.LINE_LOOP):Je.setMode(C.LINE_STRIP)}else O.isPoints?Je.setMode(C.POINTS):O.isSprite&&Je.setMode(C.TRIANGLES);if(O.isBatchedMesh)if(Be.get("WEBGL_multi_draw"))Je.renderMultiDraw(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount);else{const St=O._multiDrawStarts,me=O._multiDrawCounts,wt=O._multiDrawCount,He=ve?Y.get(ve).bytesPerElement:1,Ut=S.get(F).currentProgram.getUniforms();for(let Xt=0;Xt<wt;Xt++)Ut.setValue(C,"_gl_DrawID",Xt),Je.render(St[Xt]/He,me[Xt])}else if(O.isInstancedMesh)Je.renderInstances(Te,lt,O.count);else if(H.isInstancedBufferGeometry){const St=H._maxInstanceCount!==void 0?H._maxInstanceCount:1/0,me=Math.min(H.instanceCount,St);Je.renderInstances(Te,lt,me)}else Je.render(Te,lt)};function Wt(g,L,H){g.transparent===!0&&g.side===un&&g.forceSinglePass===!1?(g.side=At,g.needsUpdate=!0,Ci(g,L,H),g.side=wn,g.needsUpdate=!0,Ci(g,L,H),g.side=un):Ci(g,L,H)}this.compile=function(g,L,H=null){H===null&&(H=g),T=de.get(H),T.init(L),x.push(T),H.traverseVisible(function(O){O.isLight&&O.layers.test(L.layers)&&(T.pushLight(O),O.castShadow&&T.pushShadow(O))}),g!==H&&g.traverseVisible(function(O){O.isLight&&O.layers.test(L.layers)&&(T.pushLight(O),O.castShadow&&T.pushShadow(O))}),T.setupLights();const F=new Set;return g.traverse(function(O){if(!(O.isMesh||O.isPoints||O.isLine||O.isSprite))return;const fe=O.material;if(fe)if(Array.isArray(fe))for(let ge=0;ge<fe.length;ge++){const ue=fe[ge];Wt(ue,H,O),F.add(ue)}else Wt(fe,H,O),F.add(fe)}),T=x.pop(),F},this.compileAsync=function(g,L,H=null){const F=this.compile(g,L,H);return new Promise(O=>{function fe(){if(F.forEach(function(ge){S.get(ge).currentProgram.isReady()&&F.delete(ge)}),F.size===0){O(g);return}setTimeout(fe,10)}Be.get("KHR_parallel_shader_compile")!==null?fe():setTimeout(fe,10)})};let gr=null;function jo(g){gr&&gr(g)}function oa(){Cn.stop()}function la(){Cn.start()}const Cn=new ko;Cn.setAnimationLoop(jo),typeof self<"u"&&Cn.setContext(self),this.setAnimationLoop=function(g){gr=g,se.setAnimationLoop(g),g===null?Cn.stop():Cn.start()},se.addEventListener("sessionstart",oa),se.addEventListener("sessionend",la),this.render=function(g,L){if(L!==void 0&&L.isCamera!==!0){ke("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;z!==null&&z.renderStart(g,L);const H=se.enabled===!0&&se.isPresenting===!0,F=A!==null&&(U===null||H)&&A.begin(I,U);if(g.matrixWorldAutoUpdate===!0&&g.updateMatrixWorld(),L.parent===null&&L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),se.enabled===!0&&se.isPresenting===!0&&(A===null||A.isCompositing()===!1)&&(se.cameraAutoUpdate===!0&&se.updateCamera(L),L=se.getCamera()),g.isScene===!0&&g.onBeforeRender(I,g,L,U),T=de.get(g,x.length),T.init(L),T.state.textureUnits=m.getTextureUnits(),x.push(T),Ke.multiplyMatrices(L.projectionMatrix,L.matrixWorldInverse),ye.setFromProjectionMatrix(Ke,jt,L.reversedDepth),Oe=this.localClippingEnabled,it=_e.init(this.clippingPlanes,Oe),P=K.get(g,D.length),P.init(),D.push(P),se.enabled===!0&&se.isPresenting===!0){const ge=I.xr.getDepthSensingMesh();ge!==null&&xr(ge,L,-1/0,I.sortObjects)}xr(g,L,0,I.sortObjects),P.finish(),I.sortObjects===!0&&P.sort(Z,he),rt=se.enabled===!1||se.isPresenting===!1||se.hasDepthSensing()===!1,rt&&te.addToRenderList(P,g),this.info.render.frame++,it===!0&&_e.beginShadows();const O=T.state.shadowsArray;if(re.render(O,g,L),it===!0&&_e.endShadows(),this.info.autoReset===!0&&this.info.reset(),(F&&A.hasRenderPass())===!1){const ge=P.opaque,ue=P.transmissive;if(T.setupLights(),L.isArrayCamera){const ve=L.cameras;if(ue.length>0)for(let Me=0,De=ve.length;Me<De;Me++){const Ne=ve[Me];ua(ge,ue,g,Ne)}rt&&te.render(g);for(let Me=0,De=ve.length;Me<De;Me++){const Ne=ve[Me];ca(P,g,Ne,Ne.viewport)}}else ue.length>0&&ua(ge,ue,g,L),rt&&te.render(g),ca(P,g,L)}U!==null&&X===0&&(m.updateMultisampleRenderTarget(U),m.updateRenderTargetMipmap(U)),F&&A.end(I),g.isScene===!0&&g.onAfterRender(I,g,L),ne.resetDefaultState(),G=-1,V=null,x.pop(),x.length>0?(T=x[x.length-1],m.setTextureUnits(T.state.textureUnits),it===!0&&_e.setGlobalState(I.clippingPlanes,T.state.camera)):T=null,D.pop(),D.length>0?P=D[D.length-1]:P=null,z!==null&&z.renderEnd()};function xr(g,L,H,F){if(g.visible===!1)return;if(g.layers.test(L.layers)){if(g.isGroup)H=g.renderOrder;else if(g.isLOD)g.autoUpdate===!0&&g.update(L);else if(g.isLightProbeGrid)T.pushLightProbeGrid(g);else if(g.isLight)T.pushLight(g),g.castShadow&&T.pushShadow(g);else if(g.isSprite){if(!g.frustumCulled||ye.intersectsSprite(g)){F&&Fe.setFromMatrixPosition(g.matrixWorld).applyMatrix4(Ke);const ge=ee.update(g),ue=g.material;ue.visible&&P.push(g,ge,ue,H,Fe.z,null)}}else if((g.isMesh||g.isLine||g.isPoints)&&(!g.frustumCulled||ye.intersectsObject(g))){const ge=ee.update(g),ue=g.material;if(F&&(g.boundingSphere!==void 0?(g.boundingSphere===null&&g.computeBoundingSphere(),Fe.copy(g.boundingSphere.center)):(ge.boundingSphere===null&&ge.computeBoundingSphere(),Fe.copy(ge.boundingSphere.center)),Fe.applyMatrix4(g.matrixWorld).applyMatrix4(Ke)),Array.isArray(ue)){const ve=ge.groups;for(let Me=0,De=ve.length;Me<De;Me++){const Ne=ve[Me],Te=ue[Ne.materialIndex];Te&&Te.visible&&P.push(g,ge,Te,H,Fe.z,Ne)}}else ue.visible&&P.push(g,ge,ue,H,Fe.z,null)}}const fe=g.children;for(let ge=0,ue=fe.length;ge<ue;ge++)xr(fe[ge],L,H,F)}function ca(g,L,H,F){const{opaque:O,transmissive:fe,transparent:ge}=g;T.setupLightsView(H),it===!0&&_e.setGlobalState(I.clippingPlanes,H),F&&oe.viewport($.copy(F)),O.length>0&&wi(O,L,H),fe.length>0&&wi(fe,L,H),ge.length>0&&wi(ge,L,H),oe.buffers.depth.setTest(!0),oe.buffers.depth.setMask(!0),oe.buffers.color.setMask(!0),oe.setPolygonOffset(!1)}function ua(g,L,H,F){if((H.isScene===!0?H.overrideMaterial:null)!==null)return;if(T.state.transmissionRenderTarget[F.id]===void 0){const Te=Be.has("EXT_color_buffer_half_float")||Be.has("EXT_color_buffer_float");T.state.transmissionRenderTarget[F.id]=new Qt(1,1,{generateMipmaps:!0,type:Te?pn:Dt,minFilter:On,samples:Math.max(4,et.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ze.workingColorSpace})}const fe=T.state.transmissionRenderTarget[F.id],ge=F.viewport||$;fe.setSize(ge.z*I.transmissionResolutionScale,ge.w*I.transmissionResolutionScale);const ue=I.getRenderTarget(),ve=I.getActiveCubeFace(),Me=I.getActiveMipmapLevel();I.setRenderTarget(fe),I.getClearColor(xe),Ee=I.getClearAlpha(),Ee<1&&I.setClearColor(16777215,.5),I.clear(),rt&&te.render(H);const De=I.toneMapping;I.toneMapping=Jt;const Ne=F.viewport;if(F.viewport!==void 0&&(F.viewport=void 0),T.setupLightsView(F),it===!0&&_e.setGlobalState(I.clippingPlanes,F),wi(g,H,F),m.updateMultisampleRenderTarget(fe),m.updateRenderTargetMipmap(fe),Be.has("WEBGL_multisampled_render_to_texture")===!1){let Te=!1;for(let $e=0,lt=L.length;$e<lt;$e++){const at=L[$e],{object:Je,geometry:St,material:me,group:wt}=at;if(me.side===un&&Je.layers.test(F.layers)){const He=me.side;me.side=At,me.needsUpdate=!0,fa(Je,H,F,St,me,wt),me.side=He,me.needsUpdate=!0,Te=!0}}Te===!0&&(m.updateMultisampleRenderTarget(fe),m.updateRenderTargetMipmap(fe))}I.setRenderTarget(ue,ve,Me),I.setClearColor(xe,Ee),Ne!==void 0&&(F.viewport=Ne),I.toneMapping=De}function wi(g,L,H){const F=L.isScene===!0?L.overrideMaterial:null;for(let O=0,fe=g.length;O<fe;O++){const ge=g[O],{object:ue,geometry:ve,group:Me}=ge;let De=ge.material;De.allowOverride===!0&&F!==null&&(De=F),ue.layers.test(H.layers)&&fa(ue,L,H,ve,De,Me)}}function fa(g,L,H,F,O,fe){g.onBeforeRender(I,L,H,F,O,fe),g.modelViewMatrix.multiplyMatrices(H.matrixWorldInverse,g.matrixWorld),g.normalMatrix.getNormalMatrix(g.modelViewMatrix),O.onBeforeRender(I,L,H,F,g,fe),O.transparent===!0&&O.side===un&&O.forceSinglePass===!1?(O.side=At,O.needsUpdate=!0,I.renderBufferDirect(H,L,F,O,g,fe),O.side=wn,O.needsUpdate=!0,I.renderBufferDirect(H,L,F,O,g,fe),O.side=un):I.renderBufferDirect(H,L,F,O,g,fe),g.onAfterRender(I,L,H,F,O,fe)}function Ci(g,L,H){L.isScene!==!0&&(L=ht);const F=S.get(g),O=T.state.lights,fe=T.state.shadowsArray,ge=O.state.version,ue=ae.getParameters(g,O.state,fe,L,H,T.state.lightProbeGridArray),ve=ae.getProgramCacheKey(ue);let Me=F.programs;F.environment=g.isMeshStandardMaterial||g.isMeshLambertMaterial||g.isMeshPhongMaterial?L.environment:null,F.fog=L.fog;const De=g.isMeshStandardMaterial||g.isMeshLambertMaterial&&!g.envMap||g.isMeshPhongMaterial&&!g.envMap;F.envMap=N.get(g.envMap||F.environment,De),F.envMapRotation=F.environment!==null&&g.envMap===null?L.environmentRotation:g.envMapRotation,Me===void 0&&(g.addEventListener("dispose",ot),Me=new Map,F.programs=Me);let Ne=Me.get(ve);if(Ne!==void 0){if(F.currentProgram===Ne&&F.lightsStateVersion===ge)return da(g,ue),Ne}else ue.uniforms=ae.getUniforms(g),z!==null&&g.isNodeMaterial&&z.build(g,H,ue),g.onBeforeCompile(ue,I),Ne=ae.acquireProgram(ue,ve),Me.set(ve,Ne),F.uniforms=ue.uniforms;const Te=F.uniforms;return(!g.isShaderMaterial&&!g.isRawShaderMaterial||g.clipping===!0)&&(Te.clippingPlanes=_e.uniform),da(g,ue),F.needsLights=tl(g),F.lightsStateVersion=ge,F.needsLights&&(Te.ambientLightColor.value=O.state.ambient,Te.lightProbe.value=O.state.probe,Te.directionalLights.value=O.state.directional,Te.directionalLightShadows.value=O.state.directionalShadow,Te.spotLights.value=O.state.spot,Te.spotLightShadows.value=O.state.spotShadow,Te.rectAreaLights.value=O.state.rectArea,Te.ltc_1.value=O.state.rectAreaLTC1,Te.ltc_2.value=O.state.rectAreaLTC2,Te.pointLights.value=O.state.point,Te.pointLightShadows.value=O.state.pointShadow,Te.hemisphereLights.value=O.state.hemi,Te.directionalShadowMatrix.value=O.state.directionalShadowMatrix,Te.spotLightMatrix.value=O.state.spotLightMatrix,Te.spotLightMap.value=O.state.spotLightMap,Te.pointShadowMatrix.value=O.state.pointShadowMatrix),F.lightProbeGrid=T.state.lightProbeGridArray.length>0,F.currentProgram=Ne,F.uniformsList=null,Ne}function ha(g){if(g.uniformsList===null){const L=g.currentProgram.getUniforms();g.uniformsList=rr.seqWithValue(L.seq,g.uniforms)}return g.uniformsList}function da(g,L){const H=S.get(g);H.outputColorSpace=L.outputColorSpace,H.batching=L.batching,H.batchingColor=L.batchingColor,H.instancing=L.instancing,H.instancingColor=L.instancingColor,H.instancingMorph=L.instancingMorph,H.skinning=L.skinning,H.morphTargets=L.morphTargets,H.morphNormals=L.morphNormals,H.morphColors=L.morphColors,H.morphTargetsCount=L.morphTargetsCount,H.numClippingPlanes=L.numClippingPlanes,H.numIntersection=L.numClipIntersection,H.vertexAlphas=L.vertexAlphas,H.vertexTangents=L.vertexTangents,H.toneMapping=L.toneMapping}function Jo(g,L){if(g.length===0)return null;if(g.length===1)return g[0].texture!==null?g[0]:null;b.setFromMatrixPosition(L.matrixWorld);for(let H=0,F=g.length;H<F;H++){const O=g[H];if(O.texture!==null&&O.boundingBox.containsPoint(b))return O}return null}function Qo(g,L,H,F,O){L.isScene!==!0&&(L=ht),m.resetTextureUnits();const fe=L.fog,ge=F.isMeshStandardMaterial||F.isMeshLambertMaterial||F.isMeshPhongMaterial?L.environment:null,ue=U===null?I.outputColorSpace:U.isXRRenderTarget===!0?U.texture.colorSpace:ze.workingColorSpace,ve=F.isMeshStandardMaterial||F.isMeshLambertMaterial&&!F.envMap||F.isMeshPhongMaterial&&!F.envMap,Me=N.get(F.envMap||ge,ve),De=F.vertexColors===!0&&!!H.attributes.color&&H.attributes.color.itemSize===4,Ne=!!H.attributes.tangent&&(!!F.normalMap||F.anisotropy>0),Te=!!H.morphAttributes.position,$e=!!H.morphAttributes.normal,lt=!!H.morphAttributes.color;let at=Jt;F.toneMapped&&(U===null||U.isXRRenderTarget===!0)&&(at=I.toneMapping);const Je=H.morphAttributes.position||H.morphAttributes.normal||H.morphAttributes.color,St=Je!==void 0?Je.length:0,me=S.get(F),wt=T.state.lights;if(it===!0&&(Oe===!0||g!==V)){const tt=g===V&&F.id===G;_e.setState(F,g,tt)}let He=!1;F.version===me.__version?(me.needsLights&&me.lightsStateVersion!==wt.state.version||me.outputColorSpace!==ue||O.isBatchedMesh&&me.batching===!1||!O.isBatchedMesh&&me.batching===!0||O.isBatchedMesh&&me.batchingColor===!0&&O.colorTexture===null||O.isBatchedMesh&&me.batchingColor===!1&&O.colorTexture!==null||O.isInstancedMesh&&me.instancing===!1||!O.isInstancedMesh&&me.instancing===!0||O.isSkinnedMesh&&me.skinning===!1||!O.isSkinnedMesh&&me.skinning===!0||O.isInstancedMesh&&me.instancingColor===!0&&O.instanceColor===null||O.isInstancedMesh&&me.instancingColor===!1&&O.instanceColor!==null||O.isInstancedMesh&&me.instancingMorph===!0&&O.morphTexture===null||O.isInstancedMesh&&me.instancingMorph===!1&&O.morphTexture!==null||me.envMap!==Me||F.fog===!0&&me.fog!==fe||me.numClippingPlanes!==void 0&&(me.numClippingPlanes!==_e.numPlanes||me.numIntersection!==_e.numIntersection)||me.vertexAlphas!==De||me.vertexTangents!==Ne||me.morphTargets!==Te||me.morphNormals!==$e||me.morphColors!==lt||me.toneMapping!==at||me.morphTargetsCount!==St||!!me.lightProbeGrid!=T.state.lightProbeGridArray.length>0)&&(He=!0):(He=!0,me.__version=F.version);let Ut=me.currentProgram;He===!0&&(Ut=Ci(F,L,O),z&&F.isNodeMaterial&&z.onUpdateProgram(F,Ut,me));let Xt=!1,_n=!1,kn=!1;const Qe=Ut.getUniforms(),ct=me.uniforms;if(oe.useProgram(Ut.program)&&(Xt=!0,_n=!0,kn=!0),F.id!==G&&(G=F.id,_n=!0),me.needsLights){const tt=Jo(T.state.lightProbeGridArray,O);me.lightProbeGrid!==tt&&(me.lightProbeGrid=tt,_n=!0)}if(Xt||V!==g){oe.buffers.depth.getReversed()&&g.reversedDepth!==!0&&(g._reversedDepth=!0,g.updateProjectionMatrix()),Qe.setValue(C,"projectionMatrix",g.projectionMatrix),Qe.setValue(C,"viewMatrix",g.matrixWorldInverse);const xn=Qe.map.cameraPosition;xn!==void 0&&xn.setValue(C,nt.setFromMatrixPosition(g.matrixWorld)),et.logarithmicDepthBuffer&&Qe.setValue(C,"logDepthBufFC",2/(Math.log(g.far+1)/Math.LN2)),(F.isMeshPhongMaterial||F.isMeshToonMaterial||F.isMeshLambertMaterial||F.isMeshBasicMaterial||F.isMeshStandardMaterial||F.isShaderMaterial)&&Qe.setValue(C,"isOrthographic",g.isOrthographicCamera===!0),V!==g&&(V=g,_n=!0,kn=!0)}if(me.needsLights&&(wt.state.directionalShadowMap.length>0&&Qe.setValue(C,"directionalShadowMap",wt.state.directionalShadowMap,m),wt.state.spotShadowMap.length>0&&Qe.setValue(C,"spotShadowMap",wt.state.spotShadowMap,m),wt.state.pointShadowMap.length>0&&Qe.setValue(C,"pointShadowMap",wt.state.pointShadowMap,m)),O.isSkinnedMesh){Qe.setOptional(C,O,"bindMatrix"),Qe.setOptional(C,O,"bindMatrixInverse");const tt=O.skeleton;tt&&(tt.boneTexture===null&&tt.computeBoneTexture(),Qe.setValue(C,"boneTexture",tt.boneTexture,m))}O.isBatchedMesh&&(Qe.setOptional(C,O,"batchingTexture"),Qe.setValue(C,"batchingTexture",O._matricesTexture,m),Qe.setOptional(C,O,"batchingIdTexture"),Qe.setValue(C,"batchingIdTexture",O._indirectTexture,m),Qe.setOptional(C,O,"batchingColorTexture"),O._colorsTexture!==null&&Qe.setValue(C,"batchingColorTexture",O._colorsTexture,m));const gn=H.morphAttributes;if((gn.position!==void 0||gn.normal!==void 0||gn.color!==void 0)&&Re.update(O,H,Ut),(_n||me.receiveShadow!==O.receiveShadow)&&(me.receiveShadow=O.receiveShadow,Qe.setValue(C,"receiveShadow",O.receiveShadow)),(F.isMeshStandardMaterial||F.isMeshLambertMaterial||F.isMeshPhongMaterial)&&F.envMap===null&&L.environment!==null&&(ct.envMapIntensity.value=L.environmentIntensity),ct.dfgLUT!==void 0&&(ct.dfgLUT.value=gp()),_n){if(Qe.setValue(C,"toneMappingExposure",I.toneMappingExposure),me.needsLights&&el(ct,kn),fe&&F.fog===!0&&k.refreshFogUniforms(ct,fe),k.refreshMaterialUniforms(ct,F,Le,Ye,T.state.transmissionRenderTarget[g.id]),me.needsLights&&me.lightProbeGrid){const tt=me.lightProbeGrid;ct.probesSH.value=tt.texture,ct.probesMin.value.copy(tt.boundingBox.min),ct.probesMax.value.copy(tt.boundingBox.max),ct.probesResolution.value.copy(tt.resolution)}rr.upload(C,ha(me),ct,m)}if(F.isShaderMaterial&&F.uniformsNeedUpdate===!0&&(rr.upload(C,ha(me),ct,m),F.uniformsNeedUpdate=!1),F.isSpriteMaterial&&Qe.setValue(C,"center",O.center),Qe.setValue(C,"modelViewMatrix",O.modelViewMatrix),Qe.setValue(C,"normalMatrix",O.normalMatrix),Qe.setValue(C,"modelMatrix",O.matrixWorld),F.uniformsGroups!==void 0){const tt=F.uniformsGroups;for(let xn=0,Wn=tt.length;xn<Wn;xn++){const pa=tt[xn];q.update(pa,Ut),q.bind(pa,Ut)}}return Ut}function el(g,L){g.ambientLightColor.needsUpdate=L,g.lightProbe.needsUpdate=L,g.directionalLights.needsUpdate=L,g.directionalLightShadows.needsUpdate=L,g.pointLights.needsUpdate=L,g.pointLightShadows.needsUpdate=L,g.spotLights.needsUpdate=L,g.spotLightShadows.needsUpdate=L,g.rectAreaLights.needsUpdate=L,g.hemisphereLights.needsUpdate=L}function tl(g){return g.isMeshLambertMaterial||g.isMeshToonMaterial||g.isMeshPhongMaterial||g.isMeshStandardMaterial||g.isShadowMaterial||g.isShaderMaterial&&g.lights===!0}this.getActiveCubeFace=function(){return W},this.getActiveMipmapLevel=function(){return X},this.getRenderTarget=function(){return U},this.setRenderTargetTextures=function(g,L,H){const F=S.get(g);F.__autoAllocateDepthBuffer=g.resolveDepthBuffer===!1,F.__autoAllocateDepthBuffer===!1&&(F.__useRenderToTexture=!1),S.get(g.texture).__webglTexture=L,S.get(g.depthTexture).__webglTexture=F.__autoAllocateDepthBuffer?void 0:H,F.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(g,L){const H=S.get(g);H.__webglFramebuffer=L,H.__useDefaultFramebuffer=L===void 0};const nl=C.createFramebuffer();this.setRenderTarget=function(g,L=0,H=0){U=g,W=L,X=H;let F=null,O=!1,fe=!1;if(g){const ue=S.get(g);if(ue.__useDefaultFramebuffer!==void 0){oe.bindFramebuffer(C.FRAMEBUFFER,ue.__webglFramebuffer),$.copy(g.viewport),Q.copy(g.scissor),ce=g.scissorTest,oe.viewport($),oe.scissor(Q),oe.setScissorTest(ce),G=-1;return}else if(ue.__webglFramebuffer===void 0)m.setupRenderTarget(g);else if(ue.__hasExternalTextures)m.rebindTextures(g,S.get(g.texture).__webglTexture,S.get(g.depthTexture).__webglTexture);else if(g.depthBuffer){const De=g.depthTexture;if(ue.__boundDepthTexture!==De){if(De!==null&&S.has(De)&&(g.width!==De.image.width||g.height!==De.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");m.setupDepthRenderbuffer(g)}}const ve=g.texture;(ve.isData3DTexture||ve.isDataArrayTexture||ve.isCompressedArrayTexture)&&(fe=!0);const Me=S.get(g).__webglFramebuffer;g.isWebGLCubeRenderTarget?(Array.isArray(Me[L])?F=Me[L][H]:F=Me[L],O=!0):g.samples>0&&m.useMultisampledRTT(g)===!1?F=S.get(g).__webglMultisampledFramebuffer:Array.isArray(Me)?F=Me[H]:F=Me,$.copy(g.viewport),Q.copy(g.scissor),ce=g.scissorTest}else $.copy(ie).multiplyScalar(Le).floor(),Q.copy(be).multiplyScalar(Le).floor(),ce=we;if(H!==0&&(F=nl),oe.bindFramebuffer(C.FRAMEBUFFER,F)&&oe.drawBuffers(g,F),oe.viewport($),oe.scissor(Q),oe.setScissorTest(ce),O){const ue=S.get(g.texture);C.framebufferTexture2D(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_CUBE_MAP_POSITIVE_X+L,ue.__webglTexture,H)}else if(fe){const ue=L;for(let ve=0;ve<g.textures.length;ve++){const Me=S.get(g.textures[ve]);C.framebufferTextureLayer(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0+ve,Me.__webglTexture,H,ue)}}else if(g!==null&&H!==0){const ue=S.get(g.texture);C.framebufferTexture2D(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,ue.__webglTexture,H)}G=-1},this.readRenderTargetPixels=function(g,L,H,F,O,fe,ge,ue=0){if(!(g&&g.isWebGLRenderTarget)){ke("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ve=S.get(g).__webglFramebuffer;if(g.isWebGLCubeRenderTarget&&ge!==void 0&&(ve=ve[ge]),ve){oe.bindFramebuffer(C.FRAMEBUFFER,ve);try{const Me=g.textures[ue],De=Me.format,Ne=Me.type;if(g.textures.length>1&&C.readBuffer(C.COLOR_ATTACHMENT0+ue),!et.textureFormatReadable(De)){ke("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!et.textureTypeReadable(Ne)){ke("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}L>=0&&L<=g.width-F&&H>=0&&H<=g.height-O&&C.readPixels(L,H,F,O,w.convert(De),w.convert(Ne),fe)}finally{const Me=U!==null?S.get(U).__webglFramebuffer:null;oe.bindFramebuffer(C.FRAMEBUFFER,Me)}}},this.readRenderTargetPixelsAsync=async function(g,L,H,F,O,fe,ge,ue=0){if(!(g&&g.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ve=S.get(g).__webglFramebuffer;if(g.isWebGLCubeRenderTarget&&ge!==void 0&&(ve=ve[ge]),ve)if(L>=0&&L<=g.width-F&&H>=0&&H<=g.height-O){oe.bindFramebuffer(C.FRAMEBUFFER,ve);const Me=g.textures[ue],De=Me.format,Ne=Me.type;if(g.textures.length>1&&C.readBuffer(C.COLOR_ATTACHMENT0+ue),!et.textureFormatReadable(De))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!et.textureTypeReadable(Ne))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Te=C.createBuffer();C.bindBuffer(C.PIXEL_PACK_BUFFER,Te),C.bufferData(C.PIXEL_PACK_BUFFER,fe.byteLength,C.STREAM_READ),C.readPixels(L,H,F,O,w.convert(De),w.convert(Ne),0);const $e=U!==null?S.get(U).__webglFramebuffer:null;oe.bindFramebuffer(C.FRAMEBUFFER,$e);const lt=C.fenceSync(C.SYNC_GPU_COMMANDS_COMPLETE,0);return C.flush(),await Gl(C,lt,4),C.bindBuffer(C.PIXEL_PACK_BUFFER,Te),C.getBufferSubData(C.PIXEL_PACK_BUFFER,0,fe),C.deleteBuffer(Te),C.deleteSync(lt),fe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(g,L=null,H=0){const F=Math.pow(2,-H),O=Math.floor(g.image.width*F),fe=Math.floor(g.image.height*F),ge=L!==null?L.x:0,ue=L!==null?L.y:0;m.setTexture2D(g,0),C.copyTexSubImage2D(C.TEXTURE_2D,H,0,0,ge,ue,O,fe),oe.unbindTexture()};const il=C.createFramebuffer(),rl=C.createFramebuffer();this.copyTextureToTexture=function(g,L,H=null,F=null,O=0,fe=0){let ge,ue,ve,Me,De,Ne,Te,$e,lt;const at=g.isCompressedTexture?g.mipmaps[fe]:g.image;if(H!==null)ge=H.max.x-H.min.x,ue=H.max.y-H.min.y,ve=H.isBox3?H.max.z-H.min.z:1,Me=H.min.x,De=H.min.y,Ne=H.isBox3?H.min.z:0;else{const ct=Math.pow(2,-O);ge=Math.floor(at.width*ct),ue=Math.floor(at.height*ct),g.isDataArrayTexture?ve=at.depth:g.isData3DTexture?ve=Math.floor(at.depth*ct):ve=1,Me=0,De=0,Ne=0}F!==null?(Te=F.x,$e=F.y,lt=F.z):(Te=0,$e=0,lt=0);const Je=w.convert(L.format),St=w.convert(L.type);let me;L.isData3DTexture?(m.setTexture3D(L,0),me=C.TEXTURE_3D):L.isDataArrayTexture||L.isCompressedArrayTexture?(m.setTexture2DArray(L,0),me=C.TEXTURE_2D_ARRAY):(m.setTexture2D(L,0),me=C.TEXTURE_2D),oe.activeTexture(C.TEXTURE0),oe.pixelStorei(C.UNPACK_FLIP_Y_WEBGL,L.flipY),oe.pixelStorei(C.UNPACK_PREMULTIPLY_ALPHA_WEBGL,L.premultiplyAlpha),oe.pixelStorei(C.UNPACK_ALIGNMENT,L.unpackAlignment);const wt=oe.getParameter(C.UNPACK_ROW_LENGTH),He=oe.getParameter(C.UNPACK_IMAGE_HEIGHT),Ut=oe.getParameter(C.UNPACK_SKIP_PIXELS),Xt=oe.getParameter(C.UNPACK_SKIP_ROWS),_n=oe.getParameter(C.UNPACK_SKIP_IMAGES);oe.pixelStorei(C.UNPACK_ROW_LENGTH,at.width),oe.pixelStorei(C.UNPACK_IMAGE_HEIGHT,at.height),oe.pixelStorei(C.UNPACK_SKIP_PIXELS,Me),oe.pixelStorei(C.UNPACK_SKIP_ROWS,De),oe.pixelStorei(C.UNPACK_SKIP_IMAGES,Ne);const kn=g.isDataArrayTexture||g.isData3DTexture,Qe=L.isDataArrayTexture||L.isData3DTexture;if(g.isDepthTexture){const ct=S.get(g),gn=S.get(L),tt=S.get(ct.__renderTarget),xn=S.get(gn.__renderTarget);oe.bindFramebuffer(C.READ_FRAMEBUFFER,tt.__webglFramebuffer),oe.bindFramebuffer(C.DRAW_FRAMEBUFFER,xn.__webglFramebuffer);for(let Wn=0;Wn<ve;Wn++)kn&&(C.framebufferTextureLayer(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,S.get(g).__webglTexture,O,Ne+Wn),C.framebufferTextureLayer(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,S.get(L).__webglTexture,fe,lt+Wn)),C.blitFramebuffer(Me,De,ge,ue,Te,$e,ge,ue,C.DEPTH_BUFFER_BIT,C.NEAREST);oe.bindFramebuffer(C.READ_FRAMEBUFFER,null),oe.bindFramebuffer(C.DRAW_FRAMEBUFFER,null)}else if(O!==0||g.isRenderTargetTexture||S.has(g)){const ct=S.get(g),gn=S.get(L);oe.bindFramebuffer(C.READ_FRAMEBUFFER,il),oe.bindFramebuffer(C.DRAW_FRAMEBUFFER,rl);for(let tt=0;tt<ve;tt++)kn?C.framebufferTextureLayer(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,ct.__webglTexture,O,Ne+tt):C.framebufferTexture2D(C.READ_FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,ct.__webglTexture,O),Qe?C.framebufferTextureLayer(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,gn.__webglTexture,fe,lt+tt):C.framebufferTexture2D(C.DRAW_FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_2D,gn.__webglTexture,fe),O!==0?C.blitFramebuffer(Me,De,ge,ue,Te,$e,ge,ue,C.COLOR_BUFFER_BIT,C.NEAREST):Qe?C.copyTexSubImage3D(me,fe,Te,$e,lt+tt,Me,De,ge,ue):C.copyTexSubImage2D(me,fe,Te,$e,Me,De,ge,ue);oe.bindFramebuffer(C.READ_FRAMEBUFFER,null),oe.bindFramebuffer(C.DRAW_FRAMEBUFFER,null)}else Qe?g.isDataTexture||g.isData3DTexture?C.texSubImage3D(me,fe,Te,$e,lt,ge,ue,ve,Je,St,at.data):L.isCompressedArrayTexture?C.compressedTexSubImage3D(me,fe,Te,$e,lt,ge,ue,ve,Je,at.data):C.texSubImage3D(me,fe,Te,$e,lt,ge,ue,ve,Je,St,at):g.isDataTexture?C.texSubImage2D(C.TEXTURE_2D,fe,Te,$e,ge,ue,Je,St,at.data):g.isCompressedTexture?C.compressedTexSubImage2D(C.TEXTURE_2D,fe,Te,$e,at.width,at.height,Je,at.data):C.texSubImage2D(C.TEXTURE_2D,fe,Te,$e,ge,ue,Je,St,at);oe.pixelStorei(C.UNPACK_ROW_LENGTH,wt),oe.pixelStorei(C.UNPACK_IMAGE_HEIGHT,He),oe.pixelStorei(C.UNPACK_SKIP_PIXELS,Ut),oe.pixelStorei(C.UNPACK_SKIP_ROWS,Xt),oe.pixelStorei(C.UNPACK_SKIP_IMAGES,_n),fe===0&&L.generateMipmaps&&C.generateMipmap(me),oe.unbindTexture()},this.initRenderTarget=function(g){S.get(g).__webglFramebuffer===void 0&&m.setupRenderTarget(g)},this.initTexture=function(g){g.isCubeTexture?m.setTextureCube(g,0):g.isData3DTexture?m.setTexture3D(g,0):g.isDataArrayTexture||g.isCompressedArrayTexture?m.setTexture2DArray(g,0):m.setTexture2D(g,0),oe.unbindTexture()},this.resetState=function(){W=0,X=0,U=null,oe.reset(),ne.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return jt}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=ze._getDrawingBufferColorSpace(e),t.unpackColorSpace=ze._getUnpackColorSpace()}}const vp=(()=>{try{return localStorage.getItem("slaice.liveSea")==="force"}catch{return!1}})(),Sp=1.5,Mp=[[[-20,500],[220,460],[440,555],[740,510]],[[740,510],[1040,465],[1200,450],[1620,510]]],Ep=([i,e,t,n],r)=>{const s=1-r,a=[s*s*s,3*s*s*r,3*s*r*r,r*r*r];return[a[0]*i[0]+a[1]*e[0]+a[2]*t[0]+a[3]*n[0],a[0]*i[1]+a[1]*e[1]+a[2]*t[1]+a[3]*n[1]]};function Tp(){const i=[];Mp.forEach(a=>{for(let o=0;o<=48;o++)i.push(Ep(a,o/48))});const e=64,t=[];for(let a=0;a<e;a++){const o=a/(e-1)*1600;let c=0;for(;c<i.length-2&&i[c+1][0]<o;)c++;const[l,h]=i[c],[p,u]=i[c+1];t.push(p===l?h:h+(u-h)*(o-l)/(p-l))}const n=Math.min(...t),r=Math.max(1,Math.max(...t)-n),s=new Uint8Array(e);return t.forEach((a,o)=>{s[o]=Math.round((a-n)/r*255)}),{data:s,off:n,scale:r}}const Ei=i=>{const e=parseInt(i.slice(1),16);return[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255]},bp=i=>{if(i.startsWith("#"))return[...Ei(i),1];const e=i.match(/rgba?\(([^)]+)\)/);if(!e)return[1,1,1,.85];const[t=255,n=255,r=255,s=1]=e[1].split(",").map(a=>parseFloat(a));return[t/255,n/255,r/255,s]};function po(i,e){i.uSea0.value.set(...Ei(e.sea[0])),i.uSea1.value.set(...Ei(e.sea[1])),i.uSea2.value.set(...Ei(e.sea[2])),i.uSea3.value.set(...Ei(e.sea[3]));const[t,n,r,s]=bp(e.foam);i.uFoamCol.value.set(t,n,r),i.uFoamA.value=s,i.uGlint.value=e.glint?1:0,i.uWaves.value=e.waves}const yp=`
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`,Ap=`
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uDy;
uniform float uWind;   // 0 calm … 1 windy: agitates swell, shimmer, crests, surf
uniform float uGlintW; // demo-weather glint visibility (overcast kills the sheen)
uniform float uDusk;   // golden-hour factor: warms the water + the sun trail
uniform float uNight;  // dusk-to-night factor: deepens and cools the water
uniform vec3  uSea0; uniform vec3 uSea1; uniform vec3 uSea2; uniform vec3 uSea3;
uniform float uGlint;
uniform float uWaves;
uniform vec3  uFoamCol;
uniform float uFoamA;
uniform sampler2D uShore;
uniform float uShoreOff;
uniform float uShoreScale;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i),                 hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int k = 0; k < 3; k++) { v += a * vnoise(p); p = p * 2.03 + 19.19; a *= 0.5; }
  return v;
}

void main() {
  // Cover-fit the 1600x900 scene box (preserveAspectRatio="xMidYMid slice"),
  // then work in scene units so features align with the SVG layers above.
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float s = max(uRes.x / 1600.0, uRes.y / 900.0);
  vec2 p = (frag - 0.5 * uRes) / s + vec2(800.0, 450.0);
  float t = uTime;

  // The preset's 4-stop vertical gradient — exact parity with the SVG sea.
  float g = clamp(p.y / 900.0, 0.0, 1.0);
  vec3 col = g < 0.35 ? mix(uSea0, uSea1, g / 0.35)
           : g < 0.70 ? mix(uSea1, uSea2, (g - 0.35) / 0.35)
           :            mix(uSea2, uSea3, (g - 0.70) / 0.30);

  // Where the water meets the sand at this x (plus the wizard's shoreline shift).
  float yShore = texture2D(uShore, vec2(clamp(p.x / 1600.0, 0.0, 1.0), 0.5)).r
               * uShoreScale + uShoreOff + uDy;
  float dShore = yShore - p.y; // >0 while still in the water

  // Slow, large swell — the whole surface breathes (harder when windy; the
  // wind also speeds the water clock itself, accumulated JS-side).
  float swell = fbm(p * 0.003 + vec2(t * 0.024, t * 0.014));
  col *= 1.0 + (swell - 0.5) * (0.05 + 0.13 * uWind);

  // Sun-glint sheen (the SVG's radial wash from top-centre), plus twinkle.
  // uGlintW fades the whole sheen out as the demo weather clouds over; at
  // golden hour the trail warms to amber and drifts west with the low sun.
  float glint = 0.0;
  vec3 glintCol = mix(vec3(1.0), vec3(1.0, 0.72, 0.42), uDusk);
  if (uGlint > 0.5) {
    float gx = mix(800.0, 1080.0, uDusk);
    glint = (1.0 - smoothstep(0.0, 780.0, distance(p, vec2(gx, 0.0)))) * uGlintW;
    col += glintCol * 0.40 * (1.0 + 0.35 * uDusk) * glint * glint;
    float s1 = vnoise(p * 0.55 + vec2(t * 0.45, -t * 0.27));
    float s2 = vnoise(p * 0.55 + 37.7 - vec2(t * 0.36, t * 0.22));
    col += glintCol * smoothstep(0.62, 0.92, s1 * s2) * glint * 0.55;
  }

  // Shimmer filaments — warped-noise ridges standing in for the static wavelet
  // marks. Anisotropic coords (y squashed ~3×) stretch the cells horizontally so
  // they read as ripple glints, not blobs; calm at the horizon and off the sand.
  vec2 q = p * vec2(0.016, 0.050);
  q += 0.35 * vec2(vnoise(q * 0.9 + t * 0.05), vnoise(q * 0.9 - t * 0.04));
  float n1 = vnoise(q + vec2(t * 0.10, -t * 0.06));
  float ridge = smoothstep(0.55, 0.66, n1) * (1.0 - smoothstep(0.66, 0.80, n1));
  float n2 = vnoise(p * vec2(0.040, 0.110) - vec2(t * 0.14, t * 0.05));
  float ridge2 = smoothstep(0.62, 0.71, n2) * (1.0 - smoothstep(0.71, 0.82, n2));
  float band = smoothstep(40.0, 200.0, p.y) * smoothstep(15.0, 130.0, dShore);
  col += vec3(1.0) * (ridge * 0.07 + ridge2 * 0.045) * (0.85 + 0.7 * uWind) * band * (0.7 + 0.5 * glint);

  // Whitecaps — wind shears the ridge tops into broken white flecks. Almost
  // absent on a calm day, unmistakable chop when it blows.
  float caps = smoothstep(0.78 - 0.25 * uWind, 0.95, n1) * uWind;
  col = mix(col, vec3(1.0), caps * 0.6 * band);

  // Crest lines — the SVG's white wave bands, undulating much harder in wind
  // (and presets with fewer bands gain extra ones as it picks up).
  float amp = 0.8 + 1.1 * uWind;
  for (int i = 0; i < 4; i++) {
    if (float(i) < uWaves + 2.0 * uWind) {
      float fi = float(i);
      float yC = 180.0 + 60.0 * fi
               + 7.0 * amp * sin(p.x * 0.0060 + t * 0.22 + fi * 2.1)
               + 5.0 * amp * sin(p.x * 0.0023 - t * 0.13 + fi * 0.8);
      float a = 1.0 - smoothstep(0.0, 2.2, abs(p.y - yC));
      float op = fi < 1.0 ? 1.0 : fi < 2.0 ? 0.7 : 0.5;
      col = mix(col, vec3(1.0), a * op * 0.35 * (0.7 + 1.3 * uWind) * (0.8 + 0.2 * sin(t * 0.5 + fi * 1.9)));
    }
  }

  // Shallow water lightens toward the sand; two noisy foam edges breathe on it
  // (the surf reaches further and breaks whiter as the wind picks up).
  float sh = 1.0 - smoothstep(0.0, 150.0, max(dShore, 0.0));
  col = mix(col, mix(uSea3, vec3(1.0), 0.22), sh * 0.30);
  float e1 = yShore - 9.0 - 11.0 * amp * vnoise(vec2(p.x * 0.016, t * 0.21)) - 5.0 * amp * sin(t * 0.50 + p.x * 0.012);
  float f1 = (1.0 - smoothstep(0.0, 7.0, abs(p.y - e1))) * (0.42 + 0.28 * uWind + 0.22 * vnoise(vec2(p.x * 0.05, t * 0.33)));
  float e2 = yShore - 30.0 - 15.0 * amp * vnoise(vec2(p.x * 0.012 + 7.3, t * 0.15));
  float f2 = (1.0 - smoothstep(0.0, 5.0, abs(p.y - e2))) * (0.16 + 0.1 * uWind);
  col = mix(col, uFoamCol, clamp(f1 + f2, 0.0, 1.0) * uFoamA * step(0.0, dShore + 8.0));

  // Time-of-day grade on the water itself (the page-wide overlays handle the
  // rest of the scene): golden hour warms the surface, nightfall deepens it.
  col = mix(col, col * vec3(1.10, 0.85, 0.66) + vec3(0.04, 0.0, 0.02), uDusk * 0.5);
  col = mix(col, col * vec3(0.45, 0.52, 0.72), uNight * 0.55);

  gl_FragColor = vec4(col, 1.0);
}
`,Rp={wind:.22,glint:1,dusk:0,night:0};function Cp({preset:i,dy:e,env:t=Rp,onFail:n}){const r=vn.useRef(null),s=vn.useRef(null),a=vn.useRef(e);a.current=e;const o=vn.useRef(t);o.current=t;const c=vn.useRef(i);c.current=i;const l=vn.useRef(n);return l.current=n,vn.useEffect(()=>{const h=r.current;if(!h)return;let p;try{p=new xp({antialias:!1,depth:!1,stencil:!1,alpha:!1,powerPreference:"low-power",failIfMajorPerformanceCaveat:!vp})}catch{l.current();return}const u=Math.min(window.devicePixelRatio||1,Sp);p.setPixelRatio(u);const _=Tp(),v=new Oo(_.data,64,1,Ys,Dt);v.magFilter=xt,v.minFilter=xt,v.wrapS=Zt,v.needsUpdate=!0;const E={uTime:{value:0},uRes:{value:new qe(1,1)},uDy:{value:a.current},uWind:{value:o.current.wind},uGlintW:{value:o.current.glint},uDusk:{value:o.current.dusk},uNight:{value:o.current.night},uSea0:{value:new B},uSea1:{value:new B},uSea2:{value:new B},uSea3:{value:new B},uGlint:{value:0},uWaves:{value:0},uFoamCol:{value:new B(1,1,1)},uFoamA:{value:.85},uShore:{value:v},uShoreOff:{value:_.off},uShoreScale:{value:_.scale}};po(E,c.current);const d=new kt({vertexShader:yp,fragmentShader:Ap,uniforms:E,depthTest:!1,depthWrite:!1});s.current=d;const f=new nn;f.setAttribute("position",new Ht(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));const M=new tn(f,d);M.frustumCulled=!1;const y=new nc;y.add(M);const b=new ta,P=p.domElement;P.className="absolute inset-0 w-full h-full",P.style.opacity="0",P.style.transition="opacity 900ms ease",h.appendChild(P);const T=()=>{const U=h.getBoundingClientRect(),G=Math.max(1,Math.round(U.width)),V=Math.max(1,Math.round(U.height));p.setSize(G,V,!1),E.uRes.value.set(G*u,V*u)};T();const D=new ResizeObserver(T);D.observe(h);let x=0,A=!1,I=-1,R=0;const z=U=>{x=requestAnimationFrame(z);const G=I<0?.016:Math.min(.1,(U-I)/1e3);I=U;const V=o.current,$=Math.min(1,G*2.2);E.uWind.value+=(V.wind-E.uWind.value)*$,E.uGlintW.value+=(V.glint-E.uGlintW.value)*$,E.uDusk.value+=(V.dusk-E.uDusk.value)*$,E.uNight.value+=(V.night-E.uNight.value)*$,R+=G*(.85+.7*E.uWind.value),E.uTime.value=R,E.uDy.value=a.current,p.render(y,b),A||(A=!0,P.style.opacity="1")};x=requestAnimationFrame(z);const W=()=>{cancelAnimationFrame(x),I=-1,document.hidden||(x=requestAnimationFrame(z))};document.addEventListener("visibilitychange",W);const X=U=>{U.preventDefault(),l.current()};return P.addEventListener("webglcontextlost",X),()=>{cancelAnimationFrame(x),document.removeEventListener("visibilitychange",W),P.removeEventListener("webglcontextlost",X),D.disconnect(),f.dispose(),d.dispose(),v.dispose(),p.dispose(),P.remove(),s.current=null}},[]),vn.useEffect(()=>{s.current&&po(s.current.uniforms,i)},[i]),sl.jsx("div",{ref:r,"aria-hidden":"true",className:"absolute inset-0"})}export{Rp as DEFAULT_SEA_ENV,Cp as default};
