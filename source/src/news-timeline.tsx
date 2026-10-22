import type {ReactNode} from 'react';

/** Keep the public homepage compact without hiding entries while editing. */
export function NewsTimeline({children,collapseOlder,label}:{children:ReactNode[],collapseOlder:boolean,label:string}) {
 if(!collapseOlder||children.length<=3)return <>{children}</>;
 return <>{children.slice(0,3)}<details className="news-archive"><summary>{label} <span aria-hidden="true">({children.length-3})</span></summary><div>{children.slice(3)}</div></details></>;
}
