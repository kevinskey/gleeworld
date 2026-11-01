import{j as e}from"./markdown-DhDeT_t5.js";import{r as m}from"./pdf-viewer-CZwrHNNw.js";import{ak as p,B as i,aI as h,bb as x,fu as u}from"./index-BkAbyT1F.js";import"./osmd-K0Ks1scK.js";import"./pdfjs-rTpe4PAn.js";import"./charts-C_bkZeXw.js";import"./pdf-tools-BvBK5V-z.js";import"./tone-CYbv91c3.js";import"./date-locale-UHVDO-p8.js";const C=()=>{const n=p();m.useEffect(()=>{document.title="Grand Staves | GleeWorld";const s="Grand Staves — Interactive music staves for theory class instruction and whiteboard use.";let t=document.querySelector('meta[name="description"]');t||(t=document.createElement("meta"),t.setAttribute("name","description"),document.head.appendChild(t)),t&&t.setAttribute("content",s);const a=`${window.location.origin}/grand-staves`;let r=document.querySelector('link[rel="canonical"]');r||(r=document.createElement("link"),r.setAttribute("rel","canonical"),document.head.appendChild(r)),r&&r.setAttribute("href",a)},[]);const o=()=>{window.print()},c=()=>{window.location.reload()},l=()=>{n(-1)},d=({className:s=""})=>e.jsxs("svg",{viewBox:"0 0 800 220",className:`w-full border border-border/10 bg-white ${s}`,style:{height:"220px"},children:[[0,1,2,3,4].map(t=>e.jsx("line",{x1:"20",y1:35+t*18,x2:"780",y2:35+t*18,stroke:"hsl(var(--foreground))",strokeWidth:"1.2"},`treble-${t}`)),[0,1,2,3,4].map(t=>e.jsx("line",{x1:"20",y1:140+t*18,x2:"780",y2:140+t*18,stroke:"hsl(var(--foreground))",strokeWidth:"1.2"},`bass-${t}`)),[160,320,480,640].map((t,a)=>e.jsx("line",{x1:t,y1:"30",x2:t,y2:"210",stroke:"hsl(var(--muted-foreground))",strokeWidth:"0.3",strokeDasharray:"1,3",opacity:"0.2"},`measure-${a}`))]});return e.jsxs("div",{className:"min-h-screen bg-white print:bg-white",children:[e.jsx("header",{className:"bg-background border-b border-border p-4 print:hidden",children:e.jsxs("div",{className:"max-w-7xl mx-auto flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs(i,{onClick:l,variant:"outline",size:"sm",children:[e.jsx(h,{className:"h-4 w-4 mr-2"}),"Back"]}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-foreground",children:"Staff Lines"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Clean staff lines for theory class"})]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(i,{onClick:c,variant:"outline",size:"sm",children:[e.jsx(x,{className:"h-4 w-4 mr-2"}),"Clear"]}),e.jsxs(i,{onClick:o,variant:"outline",size:"sm",children:[e.jsx(u,{className:"h-4 w-4 mr-2"}),"Print"]})]})]})}),e.jsx("main",{className:"p-4 print:p-2",children:e.jsx("div",{className:"max-w-7xl mx-auto space-y-8 print:space-y-6",children:Array.from({length:10},(s,t)=>e.jsx(d,{className:"print:mb-6"},t))})}),e.jsx("style",{children:`
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:p-2 {
            padding: 0.5rem !important;
          }
          
          .print\\:space-y-4 > * + * {
            margin-top: 1rem !important;
          }
          
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
        }
      `})]})};export{C as default};
