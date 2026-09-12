import { z } from 'zod';
export const safeUrl = (s: string) => !s || /^https:\/\/[^\s]+$/i.test(s) || /^media\/[a-zA-Z0-9.-]+$/.test(s) || /^mailto:[^\s@]+@[^\s@]+$/.test(s);
const url = z.string().max(2000).refine(safeUrl);
export const linkSchema = z.object({label:z.string().max(80),url});
export const itemSchema = z.object({id:z.string().min(1).max(100),title:z.string().max(400),text:z.string().max(6000),authors:z.string().max(2000),meta:z.string().max(300),demo:z.enum(['coil','curve','lights','none']),mediaType:z.enum(['image','video']),media:url,caption:z.string().max(600),links:z.array(linkSchema).max(10),layout:z.enum(['left','right','wide'])});
export const sectionSchema = z.object({id:z.string().min(1).max(100),title:z.string().max(200),intro:z.string().max(3000),items:z.array(itemSchema).max(50)});
export const siteSchema = z.object({name:z.string().min(1).max(120),field:z.string().max(200),affiliation:z.string().max(400),bio:z.string().max(6000),portrait:url,links:z.array(linkSchema).max(10),sections:z.array(sectionSchema).max(20)}).superRefine((s,ctx)=>{const ids=s.sections.flatMap(x=>[x.id,...x.items.map(i=>i.id)]);if(new Set(ids).size!==ids.length)ctx.addIssue({code:z.ZodIssueCode.custom,message:'Section and item IDs must be unique.'});});
export type SiteContent = z.infer<typeof siteSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Section = z.infer<typeof sectionSchema>;
export const blankItem = ():Item => ({id:crypto.randomUUID(),title:'New research entry',text:'',authors:'',meta:'',demo:'none',mediaType:'image',media:'',caption:'',links:[],layout:'left'});
const common = {authors:'',meta:'Research in progress',mediaType:'image' as const,media:'',caption:'',links:[],layout:'left' as const};
export const initialContent:SiteContent = {
 name:'Liuyang Cheng',field:'Mechanics · Soft robotics · Material actuators',affiliation:'University of Illinois Urbana-Champaign',
 bio:'I study how the mechanics of soft materials can be used to create motion. My research focuses on twisted and coiled polymer actuators, nonlinear elasticity, and the design and control of artificial muscles.\n\nI combine mechanical modeling with experiments to understand these materials and explore their use in soft robotic systems.',
 portrait:'',links:[{label:'GitHub',url:'https://github.com/LiuyangMechSE'},{label:'Google Scholar',url:'https://scholar.google.com/citations?user=MMkH8L0AAAAJ&hl=en'}],
 sections:[
 {id:'research',title:'Research & demos',intro:'Interactive sketches of the ideas behind my research. These are illustrations, not experimental measurements.',items:[
 {...common,id:'coil',title:'From fiber geometry to muscle-like motion',text:'Twisting and coiling turn a polymer fiber into a contractile actuator. I am interested in how geometry, stored energy, and material response work together to produce useful motion.',demo:'coil',meta:'Twisted and coiled polymer actuators',links:[{label:'Related paper',url:'https://doi.org/10.1016/j.ijmecsci.2024.109440'}]},
 {...common,id:'curve',title:'Designing with nonlinear elasticity',text:'A tensile J-curve combines a compliant response at small deformation with increasing stiffness at larger deformation. My work explores how these properties can be used in antagonistic arrangements.',demo:'curve',meta:'Nonlinear mechanics'},
 {...common,id:'lights',title:'Artificial muscles in a moving light array',text:'An ongoing exploration of coordinated TCPA motion for an art lighting system, including cycle stability, motion tracking, and control across a 32-actuator array.',demo:'lights',meta:'Art lighting · Work in progress'},
 ]},
 {id:'publications',title:'Selected publications',intro:'',items:[
 {...common,id:'p2026',title:'Characterization and Selection of Contractile Actuators for Soft Robotics Operating in the Quasistatic Regime',text:'',authors:'Qiong Wang, Liuyang Cheng, Jeongmin Kim, Samuel Tsai, Devin Roach, Sameh Tawfick',meta:'Advanced Intelligent Systems · 2026',demo:'none',links:[{label:'Paper',url:'https://doi.org/10.1002/aisy.70490'}]},
 {...common,id:'p2024',title:'The mechanics and physics of twisted and coiled polymer actuators',text:'',authors:'Qiong Wang, Anan Ghrayeb, SeongHyeon Kim, Liuyang Cheng, Sameh Tawfick',meta:'International Journal of Mechanical Sciences · 280, 109440 · 2024',demo:'none',links:[{label:'Paper',url:'https://doi.org/10.1016/j.ijmecsci.2024.109440'},{label:'arXiv',url:'https://arxiv.org/abs/2404.00802'}]},
 ]},
 ],
};
