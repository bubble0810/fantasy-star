/* Shared sprite-space collision primitives. One scene pixel sampling,
   contact-time refinement to 0.125 ms; transparent padding never collides. */
(function(root){
  'use strict';
  function mask(rgba,width,height,threshold=96){
    const data=new Uint8Array(width*height);let left=width,top=height,right=0,bottom=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(rgba[(y*width+x)*4+3]>=threshold){data[y*width+x]=1;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
    return {data,width,height,bounds:{left,top,right,bottom}};
  }
  function bounds(s){const b=s.mask.bounds;return {left:s.x+b.left/s.mask.width*s.w,top:s.y+b.top/s.mask.height*s.h,right:s.x+b.right/s.mask.width*s.w,bottom:s.y+b.bottom/s.mask.height*s.h};}
  function solid(s,x,y){const px=Math.floor((x-s.x)/s.w*s.mask.width),py=Math.floor((y-s.y)/s.h*s.mask.height);return px>=0&&py>=0&&px<s.mask.width&&py<s.mask.height&&s.mask.data[py*s.mask.width+px]===1;}
  function overlap(a,b,ellipse){
    const aa=bounds(a),bb=bounds(b),left=Math.max(aa.left,bb.left,ellipse?ellipse.x-ellipse.rx:-Infinity),right=Math.min(aa.right,bb.right,ellipse?ellipse.x+ellipse.rx:Infinity),top=Math.max(aa.top,bb.top,ellipse?ellipse.y-ellipse.ry:-Infinity),bottom=Math.min(aa.bottom,bb.bottom,ellipse?ellipse.y+ellipse.ry:Infinity);
    if(left>=right||top>=bottom)return null;
    for(let y=Math.floor(top)+.5;y<bottom;y++)for(let x=Math.floor(left)+.5;x<right;x++){
      if(x<left||y<top)continue;
      if(ellipse&&((x-ellipse.x)/ellipse.rx)**2+((y-ellipse.y)/ellipse.ry)**2>1)continue;
      if(solid(a,x,y)&&solid(b,x,y))return {x,y};
    }
    return null;
  }
  function firstContact(probe,from,to){
    let prior=from,point=probe(from);if(point)return {at:from,point};
    while(prior<to){const next=Math.min(to,prior+4);point=probe(next);if(point){let lo=prior,hi=next;while(hi-lo>.125){const mid=(lo+hi)/2;if(probe(mid))hi=mid;else lo=mid;}return {at:hi,point:probe(hi)||point};}prior=next;}
    return null;
  }
  function order(a,b){if(Math.abs(a.at-b.at)>.00001)return a.at-b.at;const priority={gold:0,normal:1,branch:2};return (priority[a.item.type]-priority[b.item.type])||((a.item.id||0)-(b.item.id||0));}
  function unpack(packed){const bytes=typeof atob==='function'?Uint8Array.from(atob(packed.bits),c=>c.charCodeAt(0)):Buffer.from(packed.bits,'base64'),data=new Uint8Array(packed.width*packed.height);for(let i=0;i<data.length;i++)data[i]=(bytes[i>>3]>>(i&7))&1;return {width:packed.width,height:packed.height,bounds:packed.bounds,data};}
  const api=Object.freeze({mask,unpack,bounds,solid,overlap,firstContact,order});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MoonCollision=api;
})(typeof window!=='undefined'?window:globalThis);
