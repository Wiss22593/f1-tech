import { createServer, build } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { createViteRuntimeOptions } from '../../scripts/vite-runtime.mjs'
const runtime=createViteRuntimeOptions('lab')
const root=runtime.root
const config={...runtime,configFile:false,plugins:[react({exclude:/node_modules|vite-cache/}),{name:'isolated-mercedes-lab',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/three/ModelViewer.tsx'))return code.replace("from './car-loader.mjs'","from '/work/skin-lab/loader.mjs'").replace("if (active) setResult(value)", "if (active) { window.dispatchEvent(new CustomEvent('skin-lab-ready', {detail:{path:props.asset.path,at:performance.now()}})); setResult(value) }").replace("return <Canvas shadows", "return <Canvas onCreated={({gl})=>Reflect.set(window, '__skinLabRenderer', gl)} shadows").replace("isolation.current = controller", "isolation.current = controller; Reflect.set(window, '__skinLabModel', model)")},configureServer(s){s.middlewares.use((req,res,next)=>{const name=req.url?.split('?')[0];if(!name?.startsWith('/__skin-assets/'))return next();const file={'/__skin-assets/antonelli-body.png':'antonelli-body.png','/__skin-assets/antonelli.gltf':'antonelli.gltf'}[name];if(!file){res.statusCode=404;return res.end()}const target=path.join(root,'work/skin-lab/assets',file);res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'model/gltf+json');res.setHeader('Content-Length',fs.statSync(target).size);res.setHeader('Cache-Control','public, max-age=3600');fs.createReadStream(target).pipe(res)})}}],server:{...runtime.server,host:'127.0.0.1',port:5194,strictPort:true}}
if (process.argv.includes('--build')) await build({...config,define:{'import.meta.env.DEV':'true'},build:{outDir:path.join(root,'work/skin-lab/build'),emptyOutDir:false,copyPublicDir:false}}); else {const server=await createServer(config);await server.listen();server.printUrls()}










