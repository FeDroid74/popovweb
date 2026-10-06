"""Local Real-ESRGAN 4x inference; unchanged layout and content, tiled for bounded memory."""
import sys, time
from pathlib import Path
import numpy as np
from PIL import Image
import onnxruntime as ort

opt=ort.SessionOptions();opt.intra_op_num_threads=4;opt.inter_op_num_threads=1
session=ort.InferenceSession('design/case-restoration/realesrgan-x4.onnx',sess_options=opt,providers=['CPUExecutionProvider'])
name=session.get_inputs()[0].name
for source,destination in zip(sys.argv[1::2],sys.argv[2::2]):
    start=time.time();im=np.asarray(Image.open(source).convert('RGB'),dtype=np.float32)/255
    h,w=im.shape[:2];pad=12;core=40
    padded=np.pad(im,((pad,pad+core),(pad,pad+core),(0,0)),mode='edge')
    out=np.empty((h*4,w*4,3),dtype=np.uint8)
    for y in range(0,h,core):
        for x in range(0,w,core):
            tile=padded[y:y+64,x:x+64].transpose(2,0,1)[None]
            result=session.run(None,{name:tile})[0][0].transpose(1,2,0)
            hh,ww=min(core,h-y),min(core,w-x)
            out[y*4:(y+hh)*4,x*4:(x+ww)*4]=np.clip(result[pad*4:(pad+hh)*4,pad*4:(pad+ww)*4]*255,0,255).round().astype(np.uint8)
        if y%400==0:print(source,y,h,round(time.time()-start,1),flush=True)
    Image.fromarray(out).save(destination,quality=94,method=6)
    print('Saved',destination,out.shape,round(time.time()-start,1),flush=True)
