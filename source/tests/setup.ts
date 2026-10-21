import {Blob as NodeBlob,File as NodeFile} from 'node:buffer';
import 'fake-indexeddb/auto';
import {vi} from 'vitest';
Object.defineProperty(window,'matchMedia',{writable:true,value:vi.fn().mockImplementation(query=>({matches:true,media:query,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}))});
class Observer {observe(){}unobserve(){}disconnect(){}}
vi.stubGlobal('IntersectionObserver',Observer);
vi.stubGlobal('ResizeObserver',Observer);
Object.defineProperty(window,'scrollTo',{value:vi.fn(),writable:true});
Element.prototype.scrollIntoView=vi.fn();
Element.prototype.hasPointerCapture=()=>false;
Element.prototype.setPointerCapture=vi.fn();
Element.prototype.releasePointerCapture=vi.fn();
URL.createObjectURL=vi.fn(()=> 'blob:local-test-pdf');
URL.revokeObjectURL=vi.fn();

vi.stubGlobal('Blob',NodeBlob);vi.stubGlobal('File',NodeFile);
